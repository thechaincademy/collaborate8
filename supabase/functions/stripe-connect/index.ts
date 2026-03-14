import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import {
  StripePayoutProvider,
} from "../_shared/stripe-adapter.ts";

const payoutProvider = new StripePayoutProvider();

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-CONNECT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseAdmin();

    logStep("Action received", { action, userId: user.id });

    // ── Create connected account for receiver ──
    if (action === "create-account") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Check if already exists
      const { data: existing } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .maybeSingle();

      let accountId: string;

      if (existing) {
        accountId = existing.provider_account_id;
        logStep("Existing connected account found", { accountId });
      } else {
        accountId = await payoutProvider.createConnectedAccount(
          user.email!,
          { collabor8_user_id: user.id }
        );
        logStep("Created connected account", { accountId });

        await supabase.from("connected_accounts").insert({
          user_id: user.id,
          provider: "stripe",
          provider_account_id: accountId,
          onboarding_status: "pending",
        });
      }

      // Generate onboarding link
      const origin = req.headers.get("origin") || "https://collabor8.lovable.app";
      const onboardingUrl = await payoutProvider.createOnboardingLink(
        accountId,
        `${origin}/profile?stripe-refresh=true`,
        `${origin}/profile?stripe-return=true`
      );

      logStep("Onboarding link created");

      return new Response(JSON.stringify({ url: onboardingUrl, accountId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check account status ──
    if (action === "check-status") {
      const { data: connected } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .maybeSingle();

      if (!connected) {
        return new Response(JSON.stringify({ status: "not_created" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const status = await payoutProvider.getAccountStatus(connected.provider_account_id);
      logStep("Account status checked", status);

      // Update local record
      const newStatus = status.onboardingComplete ? "complete" : "pending";
      await supabase
        .from("connected_accounts")
        .update({
          onboarding_status: newStatus,
          payouts_enabled: status.payoutsEnabled,
          charges_enabled: status.chargesEnabled,
        })
        .eq("id", connected.id);

      return new Response(JSON.stringify({
        status: newStatus,
        payoutsEnabled: status.payoutsEnabled,
        chargesEnabled: status.chargesEnabled,
        accountId: connected.provider_account_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
