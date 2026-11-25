import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest, createSupabaseAdmin } from "../_shared/supabase.ts";
import { StripePayoutProvider } from "../_shared/stripe-adapter.ts";
import {
  NOT_CREATED_REPLY,
  checkStatusReply,
  createAccountReply,
  existingAccountAction,
  isLegacyV1Account,
  onboardingStatus,
  storedCheckStatusReply,
  type V1AccountView,
} from "../_shared/stripe-connect-rules.ts";
import { isMissingStripeAccountError } from "../_shared/stripe-errors.ts";
import { startTimer } from "../_shared/timing.ts";

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
    const tm = startTimer("STRIPE-CONNECT");
    const user = await tm.time("auth_get_user", () => getUserFromRequest(req));
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseAdmin();

    logStep("Action received", { action, userId: user.id });

    // ── Create connected account for receiver ──
    // Reply contract (mobile builds 31 to 34): { url, accountId }.
    if (action === "create-account") {
      const { data: existing } = await tm.time("db_connected_account", async () => await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .maybeSingle());

      let accountId: string;
      let legacyV1 = false;
      // A database write that can run while the onboarding link is created.
      let pendingWrite: Promise<unknown> = Promise.resolve();
      const origin = allowedOrigin(req);
      const refreshUrl = `${origin}/profile?stripe-refresh=true`;
      const returnUrl = `${origin}/profile?stripe-return=true`;
      // Most returning parents have a current Accounts v2 account: ask for its link while
      // the account lookup runs. The link is used only if the lookup says "reuse" and the
      // account is not a legacy v1 one. Any other outcome ignores it (links are not charged
      // or stored), so the decision rules are unchanged.
      let speculativeLink: Promise<string | null> | null = null;

      if (existing) {
        speculativeLink = tm.time("stripe_onboarding_link_early", () => payoutProvider.createOnboardingLink(existing.provider_account_id, refreshUrl, returnUrl, false)).catch(() => null);
        const existingAccount = await tm.time("stripe_account_retrieve", () => payoutProvider.getAccountOrNull(existing.provider_account_id));
        const decision = existingAccountAction(existingAccount as unknown as V1AccountView | null);

        if (decision === "reuse") {
          accountId = existing.provider_account_id;
          legacyV1 = isLegacyV1Account(existingAccount as unknown as V1AccountView);
          logStep("Existing connected account found", { accountId, legacyV1 });
        } else {
          accountId = await tm.time("stripe_account_create", () => payoutProvider.createConnectedAccount(user.email!, { collabor8_user_id: user.id }));

          speculativeLink = null;
          pendingWrite = tm.time("db_account_replace", async () => {
            const { error } = await supabase
              .from("connected_accounts")
              .update({
                provider_account_id: accountId,
                onboarding_status: "pending",
                payouts_enabled: false,
                charges_enabled: false,
              })
              .eq("id", existing.id);
            void error; // as before, a failed write does not stop the parent reaching Stripe
          });

          logStep("Replaced account with a new Accounts v2 recipient account", {
            previousAccountId: existing.provider_account_id,
            accountId,
            reason: decision,
          });
        }
      } else {
        accountId = await tm.time("stripe_account_create", () => payoutProvider.createConnectedAccount(user.email!, { collabor8_user_id: user.id }));
        logStep("Created Accounts v2 recipient account", { accountId });

        pendingWrite = tm.time("db_account_insert", async () => {
          const { error } = await supabase.from("connected_accounts").insert({
            user_id: user.id,
            provider: "stripe",
            provider_account_id: accountId,
            onboarding_status: "pending",
          });
          void error; // as before, a failed write does not stop the parent reaching Stripe
        });
      }

      // Stripe-hosted onboarding: Stripe collects identity and bank details, we never see them.
      // The row write and the link do not depend on each other, so they run together.
      const earlyLink = !legacyV1 && speculativeLink ? await speculativeLink : null;
      const [onboardingUrl] = await Promise.all([
        earlyLink ?? tm.time("stripe_onboarding_link", () => payoutProvider.createOnboardingLink(accountId, refreshUrl, returnUrl, legacyV1)),
        pendingWrite,
      ]);

      logStep("Onboarding link created", { accountId });
      tm.done("create-account", "ok");

      return new Response(JSON.stringify(createAccountReply(onboardingUrl, accountId)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check account status ──
    // Reply contract: { status: "not_created" } or
    // { status, payoutsEnabled, chargesEnabled, accountId, detailsSubmitted }.
    if (action === "check-status") {
      const { data: connected } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .maybeSingle();

      if (!connected) {
        return new Response(JSON.stringify(NOT_CREATED_REPLY), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Works for Accounts v1 and v2 (both read through /v1/accounts).
      try {
        const status = await payoutProvider.getAccountStatus(connected.provider_account_id);
        logStep("Account status checked", { payoutsEnabled: status.payoutsEnabled, chargesEnabled: status.chargesEnabled, onboardingComplete: status.onboardingComplete });

        const newStatus = onboardingStatus(status);

        await supabase
          .from("connected_accounts")
          .update({
            onboarding_status: newStatus,
            payouts_enabled: status.payoutsEnabled,
            charges_enabled: status.chargesEnabled,
          })
          .eq("id", connected.id);

        return new Response(JSON.stringify(checkStatusReply(newStatus, status)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (statusError) {
        if (isMissingStripeAccountError(statusError)) {
          // Do not rewrite the stored row. The live key cannot see this account
          // (sandbox id after a live switch, or a deleted account).
          logStep("Account status lookup failed, using stored status", {
            onboarding_status: connected.onboarding_status,
          });
          return new Response(JSON.stringify(storedCheckStatusReply(connected)), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw statusError;
      }
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
