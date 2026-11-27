import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminAuth as useAuth } from "@/hooks/useAdminAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLoading from "@/components/admin/AdminLoading";
import { useSystemHealth } from "@/components/admin/useSystemHealth";
import AnalyticsConnections from "@/components/admin/AnalyticsConnections";
import SettingsEditor from "@/components/admin/SettingsEditor";

// Plain-English steps for each integration. Values are never shown, only whether each name is set.
const STEPS: Record<string, string> = {
  "Google login client (needed for Connect Google)": "One-off platform setup. In Google Cloud, APIs and services, Credentials, create an OAuth client ID (Web application) with this authorised redirect URI: https://byrwtxdalhsmvktuzoya.supabase.co/functions/v1/google-oauth-callback. Turn on the Google Analytics Data, Search Console, Business Profile and YouTube Data APIs. Once the client ID and secret are saved on the server, press Connect Google above.",
  "Buffer fallback secret (optional, use Connect above)": "Not needed if Buffer is connected above. A token connected above is used first.",
  "YouTube fallback key (optional, Connect Google covers YouTube)": "Not needed once Google is connected with YouTube access.",
  "Clarity fallback secret (optional, use Connect above)": "Not needed if Clarity is connected above. A token connected above is used first.",
  Stripe: "In Stripe, Developers, API keys: paste the secret key below. Then Developers, Webhooks: add an endpoint for https://byrwtxdalhsmvktuzoya.supabase.co/functions/v1/stripe-webhooks and paste its signing secret below (one for Collabor8 payments, one for payout accounts).",
  "Email (Resend, EU)": "The sending domain notify.collaborate8.com is in Resend's EU (Ireland) region. It starts working once its DNS records are added and verified.",
  "Alert recipients": "Who gets live alerts, who reviews requests to join from the website, and the QA inbox that gets test alerts.",
  "Calm check AI (Vertex, London)": "Uses UK or EU regions only (London by default). The global endpoint is never used.",
  "Push notifications": "Web push needs a VAPID key pair. App push needs the Firebase service account JSON from the Firebase console.",
  "App store purchases": "Only needed for in-app purchases in the iPhone and Android apps.",
  "Error reporting (Sentry)": "Optional. Create a project in Sentry's EU region and paste its DSN. Private details are removed from error reports before they are sent.",
};

const AdminSetup = () => {
  const { user, loading: authLoading } = useAuth();
  const { data, error, loading, load } = useSystemHealth(Boolean(user));

  if (authLoading) return <AdminLoading />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (error && !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">Setup is restricted to Collabor8 admins. Sign in with your founder email.</p>
        <a href="/admin/login?next=/admin/setup" className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">Sign in to admin</a>
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
            <p className="text-sm text-muted-foreground">Connect services and change platform settings. Secret values are never shown after they are saved.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>
        </div>
        <AnalyticsConnections />
        <h2 className="pt-2 text-base font-semibold">Platform settings</h2>
        <SettingsEditor steps={STEPS} />
        {!data && loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminSetup;
