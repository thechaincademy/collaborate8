import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { StripePayoutProvider } from "../_shared/stripe-adapter.ts";

const payoutProvider = new StripePayoutProvider();
const DEFAULT_ORIGIN = "https://collaborate8.com";

function allowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (origin === "https://collaborate8.com" || origin === "https://www.collaborate8.com") return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return DEFAULT_ORIGIN;
}

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
      // Check if already exists
      const { data: existing } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .maybeSingle();

      let accountId: string;

      if (existing) {
        const existingAccount = await payoutProvider.getAccount(existing.provider_account_id);
        const needsReplacement =
          (!existingAccount.details_submitted && existingAccount.business_type !== "individual") ||
          (!existingAccount.charges_enabled && !existingAccount.payouts_enabled);

        if (needsReplacement) {
          accountId = await payoutProvider.createConnectedAccount(user.email!, { collabor8_user_id: user.id });

          await supabase
            .from("connected_accounts")
            .update({
              provider_account_id: accountId,
              onboarding_status: "pending",
              payouts_enabled: false,
              charges_enabled: false,
            })
            .eq("id", existing.id);

          logStep("Replaced incomplete account with new individual account", {
            previousAccountId: existing.provider_account_id,
            accountId,
            reason: {
              detailsSubmitted: existingAccount.details_submitted,
              chargesEnabled: existingAccount.charges_enabled,
              payoutsEnabled: existingAccount.payouts_enabled,
            },
          });
        } else {
          accountId = existing.provider_account_id;
          logStep("Existing connected account found", { accountId });
        }
      } else {
        accountId = await payoutProvider.createConnectedAccount(user.email!, { collabor8_user_id: user.id });
        logStep("Created connected account", { accountId });

        await supabase.from("connected_accounts").insert({
          user_id: user.id,
          provider: "stripe",
          provider_account_id: accountId,
          onboarding_status: "pending",
        });
      }

      // Generate onboarding link
      const origin = allowedOrigin(req);
      const onboardingUrl = await payoutProvider.createOnboardingLink(
        accountId,
        `${origin}/profile?stripe-refresh=true`,
        `${origin}/profile?stripe-return=true`,
      );

      logStep("Onboarding link created", { accountId });

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

      // Only mark as "complete" when transfers capability is actually active
      const capabilitiesActive = status.chargesEnabled || status.payoutsEnabled;
      const newStatus =
        status.onboardingComplete && capabilitiesActive
          ? "complete"
          : status.onboardingComplete
            ? "pending_capabilities"
            : "pending";

      await supabase
        .from("connected_accounts")
        .update({
          onboarding_status: newStatus,
          payouts_enabled: status.payoutsEnabled,
          charges_enabled: status.chargesEnabled,
        })
        .eq("id", connected.id);

      return new Response(
        JSON.stringify({
          status: newStatus,
          payoutsEnabled: status.payoutsEnabled,
          chargesEnabled: status.chargesEnabled,
          accountId: connected.provider_account_id,
          detailsSubmitted: status.onboardingComplete,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Full Stripe detail stays in the server log only. Emails are masked and the raw
    // response is not logged. The client gets a generic error with no Stripe text.
    const { extractStripeError } = await import("../_shared/stripe-errors.ts");
    const d = extractStripeError(error);
    const mask = (v: unknown) => (v == null ? v : String(v).replace(/[^\s@]+@[^\s@]+/g, "[email]").slice(0, 500));
    console.error("[STRIPE-CONNECT] ERROR at \"handler\"", JSON.stringify({
      message: mask(d.message), type: d.type, code: d.code, param: d.param,
      statusCode: d.statusCode, requestId: d.requestId, doc_url: d.doc_url,
    }));
    return new Response(
      JSON.stringify({ error: "Request failed. Please try again later.", code: "stripe_connect_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
