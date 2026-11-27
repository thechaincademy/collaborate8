import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Requests to join from the website. Rafa and Jade only: the request-access edge function
// runs the same admin check as the Setup page and returns 403 for anyone else.
// Approve emails the person a single-use sign-up link; Reject can send a polite no.
// While request-access emails are switched off (ACCESS_REQUEST_EMAILS_ENABLED), nothing is
// emailed: Approve and "New link" show the link here for the admin to copy and send themselves.

type Req = {
  id: string; email: string; name: string; note: string | null;
  status: "pending" | "approved" | "rejected";
  decided_at: string | null; decided_by_name: string | null; created_at: string;
  token_expires_at: string | null; token_used_at: string | null;
};
type Filter = "pending" | "approved" | "rejected" | "all";
type Pending = { req: Req; action: "approve" | "reject" } | null;

const ukDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UK" : "";

const errorText = async (error: unknown, fallback: string) => {
  try {
    const b = await (error as { context?: Response })?.context?.json();
    if (b?.error) return String(b.error);
  } catch { /* keep fallback */ }
  return fallback;
};

const statusLabel: Record<Req["status"], string> = { pending: "Waiting", approved: "Approved", rejected: "Not approved" };

const AdminAccessRequests = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Req[] | null>(null);
  const [ready, setReady] = useState(true);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [confirm, setConfirm] = useState<Pending>(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; ok: boolean; text: string; link?: string } | null>(null);
  const [emailsOn, setEmailsOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const handledLink = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("request-access", { body: { action: "list" } });
    if (error) {
      const status = (error as { context?: Response })?.context?.status;
      if (status === 401 || status === 403) { setDenied(true); return; }
      setLoadError(await errorText(error, "Could not load requests."));
      return;
    }
    setDenied(false);
    setLoadError(null);
    setReady(data?.ready !== false);
    setEmailsOn(data?.emailsEnabled === true);
    setRows((data?.requests ?? []) as Req[]);
  }, []);

  useEffect(() => {
    setDenied(false);
    setLoadError(null);
    setRows(null);
    if (user) void load();
  }, [user?.id, load]);

  // Links from the reviewer email (?id=...&action=approve|reject) open the confirm step only.
  useEffect(() => {
    if (!rows || handledLink.current) return;
    const id = params.get("id");
    const action = params.get("action");
    if (!id) return;
    handledLink.current = true;
    const req = rows.find((r) => r.id === id);
    if (!req) { setMessage({ id: "", ok: false, text: "That request wasn't found." }); return; }
    setFilter(req.status === "pending" ? "pending" : "all");
    if (req.status === "pending" && (action === "approve" || action === "reject")) {
      setNotify(true);
      setConfirm({ req, action });
    } else if (req.status !== "pending") {
      setMessage({ id: req.id, ok: true, text: `This request was already ${req.status === "approved" ? "approved" : "turned down"}${req.decided_by_name ? ` by ${req.decided_by_name}` : ""}.` });
    }
    window.setTimeout(() => document.getElementById(`req-${id}`)?.scrollIntoView({ block: "center" }), 50);
  }, [rows, params]);

  const clearLink = () => {
    if (params.get("id")) { params.delete("id"); params.delete("action"); setParams(params, { replace: true }); }
  };

  const decide = async () => {
    if (!confirm) return;
    const { req, action } = confirm;
    setBusy(req.id);
    setConfirm(null);
    const { data, error } = await supabase.functions.invoke("request-access", {
      body: { action: "decide", id: req.id, decision: action, notify: action === "reject" ? notify : undefined },
    });
    setBusy(null);
    clearLink();
    if (error || !data?.ok) {
      setMessage({ id: req.id, ok: false, text: await errorText(error, "That didn't work. Please try again.") });
    } else if (action === "approve" && typeof data.link === "string") {
      setCopied(false);
      setMessage({ id: req.id, ok: true, text: `Approved. Emails are switched off, so copy this sign-up link and send it to ${req.name} yourself. It works once and lasts 14 days.`, link: data.link });
    } else if (action === "approve") {
      setMessage({ id: req.id, ok: true, text: data.emailed ? `Approved. ${req.name} has been emailed a sign-up link.` : "Approved, but the email didn't send. Use Send a new link to try again." });
    } else {
      setMessage({ id: req.id, ok: true, text: data.emailed ? "Turned down, and a polite email was sent." : "Turned down. No email was sent." });
    }
    await load();
  };

  const resend = async (req: Req) => {
    setBusy(req.id);
    const { data, error } = await supabase.functions.invoke("request-access", { body: { action: "resend", id: req.id } });
    setBusy(null);
    setCopied(false);
    setMessage(error || !data?.ok
      ? { id: req.id, ok: false, text: await errorText(error, "Could not send a new link.") }
      : typeof data.link === "string"
      ? { id: req.id, ok: true, text: "A new sign-up link was made. Emails are switched off, so copy it and send it yourself. The old one no longer works.", link: data.link }
      : { id: req.id, ok: true, text: data.emailed ? "A new sign-up link has been emailed. The old one no longer works." : "A new link was made, but the email didn't send." });
    await load();
  };

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: rows?.length ?? 0 };
    for (const r of rows ?? []) c[r.status]++;
    return c;
  }, [rows]);
  const shown = (rows ?? []).filter((r) => filter === "all" || r.status === filter);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to={`/admin/login?next=${encodeURIComponent(`/admin/access-requests${window.location.search}`)}`} replace />;
  const signInAsAdmin = async () => {
    await signOut();
    const next = `/admin/access-requests${window.location.search}`;
    window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
  };

  if (denied) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Sign in as an admin</h1>
        <p className="text-sm text-muted-foreground">
          You're signed in to Collabor8, but requests to join are only visible to admins. Sign in with your founder email to review them.
        </p>
        <Button onClick={() => void signInAsAdmin()}>Sign in with founder email</Button>
      </div>
    );
  }

  const tab = (f: Filter, label: string) => (
    <button
      key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
      className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
    >
      {label} ({counts[f]})
    </button>
  );

  return (
    <AdminLayout>
      <Helmet>
        <title>Requests to join - Collabor8</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Requests to join</h1>
            <p className="text-sm text-muted-foreground">People who asked to join on the website. The phone apps and invited co-parents don't need approval.</p>
          </div>
          <Button variant="outline" onClick={() => void load()}>Refresh</Button>
        </div>

        {!ready && (
          <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm">The database update for requests is waiting for approval, so there's nothing to show yet.</p>
        )}
        {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}
        {message && !message.id && <p role="status" className="text-sm text-destructive">{message.text}</p>}

        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Show requests">
          {tab("pending", "Waiting")}{tab("approved", "Approved")}{tab("rejected", "Not approved")}{tab("all", "All")}
        </div>

        {rows === null && !loadError && <p className="text-sm text-muted-foreground">Loading...</p>}
        {rows !== null && shown.length === 0 && <p className="text-sm text-muted-foreground">No requests here.</p>}

        <ul className="space-y-3">
          {shown.map((r) => {
            const linkUsed = !!r.token_used_at;
            const linkExpired = !linkUsed && !!r.token_expires_at && new Date(r.token_expires_at).getTime() < Date.now();
            return (
              <li key={r.id} id={`req-${r.id}`}>
                <Card className={params.get("id") === r.id ? "ring-2 ring-primary" : undefined}>
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{r.name}</p>
                        <p className="break-all text-sm text-muted-foreground">{r.email}</p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{statusLabel[r.status]}</span>
                    </div>
                    {r.note ? <p className="whitespace-pre-wrap break-words text-sm">{r.note}</p> : <p className="text-sm italic text-muted-foreground">No note</p>}
                    <p className="text-xs text-muted-foreground">
                      Asked {ukDate(r.created_at)}
                      {r.decided_at ? ` · ${r.status === "approved" ? "Approved" : "Turned down"} ${ukDate(r.decided_at)}${r.decided_by_name ? ` by ${r.decided_by_name}` : ""}` : ""}
                      {r.status === "approved" ? (linkUsed ? ` · Account created ${ukDate(r.token_used_at)}` : linkExpired ? " · Link expired" : " · Link not used yet") : ""}
                    </p>
                    {message?.id === r.id && (
                      <div className="space-y-2">
                        <p role="status" className={`text-sm ${message.ok ? "text-foreground" : "text-destructive"}`}>{message.text}</p>
                        {message.link && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input readOnly aria-label="Sign-up link" value={message.link} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm" />
                            <Button className="min-h-11" variant="outline" onClick={() => { void navigator.clipboard?.writeText(message.link!).then(() => setCopied(true), () => setCopied(false)); }}>{copied ? "Copied" : "Copy link"}</Button>
                          </div>
                        )}
                      </div>
                    )}
                    {r.status === "pending" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button className="min-h-11" disabled={busy === r.id} onClick={() => { setNotify(true); setConfirm({ req: r, action: "approve" }); }}>Approve</Button>
                        <Button className="min-h-11" variant="outline" disabled={busy === r.id} onClick={() => { setNotify(true); setConfirm({ req: r, action: "reject" }); }}>Reject</Button>
                      </div>
                    )}
                    {r.status === "approved" && !linkUsed && (
                      <Button className="min-h-11" variant="outline" disabled={busy === r.id} onClick={() => void resend(r)}>{emailsOn ? "Send a new link" : "Make a new link"}</Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); clearLink(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.action === "approve" ? `Approve ${confirm?.req.name}?` : `Turn down ${confirm?.req.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "approve"
                ? (emailsOn
                  ? `We'll email ${confirm?.req.email} a link to create their account. It works once and lasts 14 days.`
                  : `Emails are switched off, so nothing is sent. You'll get a link to copy and send to ${confirm?.req.email} yourself. It works once and lasts 14 days.`)
                : `${confirm?.req.email} won't be able to create an account on the website. They can still join through a co-parent's invite.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.action === "reject" && emailsOn && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
              Send them a short, polite email to let them know
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide()}>{confirm?.action === "approve" ? (emailsOn ? "Approve and email link" : "Approve and get link") : "Turn down"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAccessRequests;
