import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackBeforeRedirect } from "@/lib/analytics";
import {
  CONVERSATION_TOOL_MONTHLY,
  CONVERSATION_TOOL_PRICE,
  openConversationToolPortal,
  useConversationToolAccess,
} from "@/components/dashboard/ConversationToolPromo";
import { PREMIUM_FEATURE_LINE, useIsInApp } from "@/hooks/useIsInApp";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const FEATURES = [
  "Rewrite calmly, to help you say things clearly and kindly",
  "AI prompts to help you start a conversation",
  "Share files and documents in chat",
  "The self-guided financial conversation tool",
];

const Premium = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, expiredAt, access, loading, refresh } = useConversationToolAccess();
  const [paying, setPaying] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const inApp = useIsInApp();

  const isSubscription = hasAccess && access?.source === "subscription" && !!access?.stripe_customer_id;
  const endDate = access?.current_period_end ?? null;

  const startCheckout = async () => {
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("conversation-tool-access", {
      body: { action: "create-checkout" },
    });
    setPaying(false);
    if (error || data?.error) {
      toast.error("We could not start the payment. Please try again.");
      return;
    }
    if (data?.hasAccess) {
      await refresh();
      return;
    }
    if (data?.url) {
      await trackBeforeRedirect("payment_started", { product: "conversation_tool" });
      window.location.href = data.url as string;
    }
  };

  const manage = async () => {
    setPortalLoading(true);
    await openConversationToolPortal();
    setPortalLoading(false);
  };

  const busy = authLoading || (!!user && loading);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Collabor8 Premium - Collabor8</title>
        <meta
          name="description"
          content="Collabor8 Premium: extra tools for calmer co-parenting conversations about money."
        />
        <link rel="canonical" href="https://collaborate8.com/premium" />
      </Helmet>
      <main className="mx-auto max-w-md space-y-6 px-5 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Collabor8 Premium</h1>
          <p className="text-muted-foreground">
            Extra tools to help you and your co-parent talk about money calmly.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold text-foreground">What you get</h2>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {inApp ? (
            <p className="mt-4 text-sm text-foreground">{PREMIUM_FEATURE_LINE}</p>
          ) : (
          <p className="mt-4 text-sm text-foreground">
            {CONVERSATION_TOOL_MONTHLY} a month, billed as {CONVERSATION_TOOL_PRICE} a year. Renews
            automatically each year. Cancel any time, and you keep Premium until the end of the year
            you paid for.
          </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Premium is for your account only. Your co-parent can still use Collabor8 for free.
          </p>
        </section>

        <section className="space-y-3">
          {busy ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
            </div>
          ) : !user ? (
            <>
              <Button asChild className="w-full" size="lg">
                <Link to="/login?next=/premium">Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to="/signup">Create a free account</Link>
              </Button>
            </>
          ) : hasAccess ? (
            <>
              <p className="font-semibold text-foreground">You have Collabor8 Premium.</p>
              {!inApp && isSubscription && endDate && (
                <p className="text-sm text-muted-foreground">
                  {access?.cancel_at_period_end
                    ? `Your subscription is cancelled. You keep Premium until ${formatDate(endDate)}.`
                    : `Your subscription renews on ${formatDate(endDate)}.`}
                </p>
              )}
              {!isSubscription && endDate && (
                <p className="text-sm text-muted-foreground">Your Premium ends on {formatDate(endDate)}.</p>
              )}
              {!inApp && isSubscription && (
                <Button variant="outline" className="w-full" size="lg" onClick={manage} disabled={portalLoading}>
                  {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Manage subscription
                </Button>
              )}
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">Go to Collabor8</Link>
              </Button>
            </>
          ) : (
            <>
              {expiredAt && (
                <p className="text-sm text-muted-foreground">Your Premium ended on {formatDate(expiredAt)}.</p>
              )}
              {inApp ? (
                <p className="text-sm text-muted-foreground">{PREMIUM_FEATURE_LINE}</p>
              ) : (
              <Button className="w-full" size="lg" onClick={startCheckout} disabled={paying}>
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Subscribe for {CONVERSATION_TOOL_PRICE} a year
              </Button>
              )}
            </>
          )}
        </section>

        {!inApp && <p className="text-xs text-muted-foreground">
          Payments are handled securely by Stripe. Already bought Premium on the website? Sign in to
          the Collabor8 app with the same account and Premium unlocks automatically.
        </p>}
      </main>
    </div>
  );
};

export default Premium;
