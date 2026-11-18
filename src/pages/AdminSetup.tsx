import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useSystemHealth } from "@/components/admin/useSystemHealth";
import AnalyticsConnections from "@/components/admin/AnalyticsConnections";

// Plain-English steps for each integration. Values are never shown, only whether each name is set.
const STEPS: Record<string, string> = {
  "Google login client (needed for Connect Google)": "One-off platform setup. In Google Cloud, APIs and services, Credentials, create an OAuth client ID (Web application) with this authorised redirect URI: https://byrwtxdalhsmvktuzoya.supabase.co/functions/v1/google-oauth-callback. Turn on the Google Analytics Data, Search Console, Business Profile and YouTube Data APIs. Once the client ID and secret are saved on the server, press Connect Google above.",
  "Buffer fallback secret (optional, use Connect above)": "Not needed if Buffer is connected above. A token connected above is used first.",
  "YouTube fallback key (optional, Connect Google covers YouTube)": "Not needed once Google is connected with YouTube access.",
  "Clarity fallback secret (optional, use Connect above)": "Not needed if Clarity is connected above. A token connected above is used first.",
  Stripe: "In Stripe, Developers, API keys: copy the secret key into STRIPE_SECRET_KEY. Then Developers, Webhooks: add an endpoint for https://byrwtxdalhsmvktuzoya.supabase.co/functions/v1/stripe-webhooks and copy its signing secret into STRIPE_WEBHOOK_SECRET_PLATFORM (and STRIPE_WEBHOOK_SECRET for connected accounts).",
  "Email (Resend, EU)": "The sending domain notify.collaborate8.com is in Resend's EU (Ireland) region. It starts working once its DNS records are added and verified.",
  "Alert recipients": "Optional. DSL_ALERT_EMAIL lists who gets live alerts. Test alerts only go to the QA inbox.",
  "Calm check AI (Vertex, London)": "Already set. Uses the London region only.",
  "Push notifications": "Web push needs a VAPID key pair. App push needs the Firebase service account JSON from the Firebase console.",
  "App store purchases": "Only needed for in-app purchases in the iPhone and Android apps.",
  "Error reporting (Sentry)": "Optional. Copy the project DSN from Sentry.",
};

const AdminSetup = () => {
  const { user, loading: authLoading } = useAuth();
  const { data, error, loading, load } = useSystemHealth(Boolean(user));

  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (error && !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">Setup is restricted to Collabor8 admins.</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Setup - Collabor8</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Setup</h1>
            <p className="text-sm text-muted-foreground">Connect analytics services, and see which server keys are set. Values are never shown here.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>
        </div>
        <AnalyticsConnections />
        <h2 className="pt-2 text-base font-semibold">Server keys</h2>
        {(data?.setup ?? []).map((g) => {
          const allSet = g.secrets.every((s) => s.set);
          return (
            <Card key={g.group}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{g.group}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${allSet ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{allSet ? "Set" : "Missing"}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0 text-sm">
                <ul className="flex flex-wrap gap-2">
                  {g.secrets.map((s) => (
                    <li key={s.name} className={`rounded border px-2 py-0.5 font-mono text-xs ${s.set ? "" : "border-amber-300 text-amber-900"}`}>{s.name}: {s.set ? "set" : "missing"}</li>
                  ))}
                </ul>
                {STEPS[g.group] && <p className="text-muted-foreground">{STEPS[g.group]}</p>}
              </CardContent>
            </Card>
          );
        })}
        {!data && loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminSetup;
