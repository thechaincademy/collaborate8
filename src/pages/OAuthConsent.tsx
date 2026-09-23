import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type ConsentClient = { name?: string | null } | null;
type ConsentDetails = {
  client?: ConsentClient;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: ConsentDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: ConsentDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: ConsentDetails | null; error: { message: string } | null }>;
};

const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const api = oauthApi();
    const { data, error: decisionError } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "this app";

  return (
    <main className="mx-auto flex min-h-screen max-w-md md:max-w-lg flex-col justify-center gap-6 bg-background px-6 py-12">
      {error ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-2 text-xl font-bold text-foreground">We could not load this request</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : !details ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Connect {clientName} to your Collabor8 account
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This lets {clientName} read and update your Collabor8 finances as you. You can remove
            access at any time.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
              size="lg"
              disabled={busy}
              onClick={() => decide(true)}
            >
              {busy ? "Please wait…" : "Approve"}
            </Button>
            <Button variant="outline" className="w-full" size="lg" disabled={busy} onClick={() => decide(false)}>
              Deny
            </Button>
          </div>
        </div>
      )}
    </main>
  );
};

export default OAuthConsent;
