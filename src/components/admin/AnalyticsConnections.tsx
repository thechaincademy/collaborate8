import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Connect analytics services from the admin. Tokens go straight to the admin-connections
// edge function, which checks them with the provider and keeps them on the server.
// Nothing here ever receives a token back.

type Pasted = { connected: boolean; source: "admin" | "secret" | null; account_label: string | null; connected_at: string | null };
type Status = {
  store_ready: boolean;
  google: { client_set_up: boolean; connected: boolean; account_email: string | null; connected_at: string | null; youtube: boolean; youtube_key_fallback: boolean };
  buffer: Pasted;
  clarity: Pasted;
};

const errorText = async (error: unknown, fallback: string) => {
  try {
    const b = await (error as { context?: Response })?.context?.json();
    if (b?.error) return String(b.error);
  } catch { /* keep fallback */ }
  return fallback;
};

const ukDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UK" : "";

const Pill = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{children}</span>
);

const PASTED: { key: "buffer" | "clarity"; name: string; covers: string; help: string }[] = [
  { key: "buffer", name: "Buffer", covers: "Instagram, LinkedIn and TikTok", help: "In Buffer, open Settings, then API, and create an access token for the Collabor8 organisation. Paste it here." },
  { key: "clarity", name: "Microsoft Clarity", covers: "Website behaviour", help: "In Clarity, open the Collabor8 project, then Settings, Data Export, Generate new API token. Paste it here. Checking a token uses 1 of Clarity's 10 daily data requests." },
];

export const AnalyticsConnections = ({ compact = false, onChanged }: { compact?: boolean; onChanged?: () => void }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("admin-connections", { body: { action: "status" } });
    if (error) setLoadError(await errorText(error, "Could not load connections."));
    else { setLoadError(null); setStatus(data as Status); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Result of the Google sign-in round trip.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("google");
    if (!g) return;
    if (g === "connected") setBanner({ ok: true, text: "Google connected." });
    else setBanner({ ok: false, text: `Google connection failed (${p.get("reason") ?? "unknown"}).` });
    p.delete("google"); p.delete("reason");
    const qs = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
  }, []);

  const connectGoogle = async () => {
    setBusy("google");
    const { data, error } = await supabase.functions.invoke("google-oauth-start", {
      body: { return_origin: window.location.origin, return_path: window.location.pathname },
    });
    if (error || !data?.url) {
      setBanner({ ok: false, text: await errorText(error, "Could not start Google connection.") });
      setBusy(null);
      return;
    }
    window.location.href = data.url;
  };

  const savePasted = async (provider: "buffer" | "clarity") => {
    setBusy(provider);
    const { data, error } = await supabase.functions.invoke("admin-connections", { body: { action: "connect", provider, token: token.trim() } });
    setToken("");
    setBusy(null);
    if (error || !data?.ok) {
      setBanner({ ok: false, text: await errorText(error, "Could not connect. Try again later.") });
      return;
    }
    setOpen(null);
    setBanner({ ok: true, text: `${provider === "buffer" ? "Buffer" : "Clarity"} connected.` });
    await load();
    onChanged?.();
  };

  const disconnect = async (provider: "buffer" | "clarity") => {
    setBusy(provider);
    const { data, error } = await supabase.functions.invoke("admin-connections", { body: { action: "disconnect", provider } });
    setBusy(null);
    if (error || !data?.ok) {
      setBanner({ ok: false, text: await errorText(error, "Could not disconnect. Try again later.") });
      return;
    }
    setBanner({ ok: true, text: `${provider === "buffer" ? "Buffer" : "Clarity"} disconnected.` });
    await load();
    onChanged?.();
  };

  const g = status?.google;

  return (
    <div className={`space-y-3 rounded-lg border p-4 ${compact ? "mb-3" : ""}`}>
      <div>
        <h2 className="text-base font-semibold">Connections</h2>
        {!compact && <p className="text-sm text-muted-foreground">Connect each service once. Tokens are kept on the server and never shown again.</p>}
      </div>
      {banner && <p className={`rounded-md border p-2 text-sm ${banner.ok ? "" : "text-destructive"}`} role="status">{banner.text}</p>}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {!status && !loadError && <p className="text-sm text-muted-foreground">Loading...</p>}

      {status && g && (
        <ul className="divide-y text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="font-medium">Google</p>
              <p className="text-muted-foreground">GA4, Search Console, Business Profile and YouTube</p>
              {g.connected && <p className="break-all text-muted-foreground">Signed in as {g.account_email ?? "unknown account"}{g.connected_at ? `, ${ukDate(g.connected_at)}` : ""}</p>}
              {g.connected && !g.youtube && <p className="text-amber-900">Reconnect Google to add YouTube.</p>}
              {!g.client_set_up && <p className="text-amber-900">Google login client not set up yet.</p>}
            </div>
            <div className="flex items-center gap-2">
              <Pill ok={g.connected && g.client_set_up}>{g.connected ? "Connected" : "Not connected"}</Pill>
              <Button size="sm" variant="outline" onClick={() => void connectGoogle()} disabled={!g.client_set_up || busy === "google"}>
                {busy === "google" ? "Opening Google..." : g.connected ? "Reconnect Google" : "Connect Google"}
              </Button>
            </div>
          </li>

          {PASTED.map((p) => {
            const s = status[p.key];
            const fromAdmin = s.source === "admin";
            return (
              <li key={p.key} className="space-y-2 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-muted-foreground">{p.covers}</p>
                    {fromAdmin && <p className="text-muted-foreground">{s.account_label ?? "Connected"}{s.connected_at ? `, ${ukDate(s.connected_at)}` : ""}</p>}
                    {s.source === "secret" && <p className="text-muted-foreground">Using the server secret.</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill ok={s.connected}>{s.connected ? "Connected" : "Not connected"}</Pill>
                    {fromAdmin ? (
                      <Button size="sm" variant="outline" onClick={() => void disconnect(p.key)} disabled={busy === p.key}>Disconnect</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setOpen(open === p.key ? null : p.key); setToken(""); }} disabled={!status.store_ready}>
                        {s.connected ? "Replace" : "Connect"}
                      </Button>
                    )}
                  </div>
                </div>
                {!status.store_ready && !fromAdmin && <p className="text-xs text-muted-foreground">Connecting here is switched on once a pending database update is approved.</p>}
                {open === p.key && (
                  <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void savePasted(p.key); }}>
                    <p className="text-muted-foreground">{p.help}</p>
                    <div className="flex gap-2">
                      <Input type="password" autoComplete="off" spellCheck={false} placeholder={`${p.name} token`} value={token} onChange={(e) => setToken(e.target.value)} aria-label={`${p.name} token`} />
                      <Button type="submit" size="sm" disabled={busy === p.key || token.trim().length < 10}>{busy === p.key ? "Checking..." : "Save"}</Button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AnalyticsConnections;
