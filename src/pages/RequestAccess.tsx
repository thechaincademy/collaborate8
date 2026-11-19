import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Mail, MailCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useIsInApp } from "@/hooks/useIsInApp";
import { REQUEST_NAME_MAX, REQUEST_NOTE_MAX } from "@/lib/accessWall";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const errorText = async (error: unknown, fallback: string) => {
  try {
    const b = await (error as { context?: Response })?.context?.json();
    if (b?.error) return String(b.error);
  } catch { /* keep fallback */ }
  return fallback;
};

/** Website only: ask to join. Rafa and Jade review each request and email a sign-up link. */
const RequestAccess = () => {
  const navigate = useNavigate();
  const inApp = useIsInApp();
  const [params] = useSearchParams();
  const linkProblem = params.get("link") === "expired";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [sent, setSent] = useState(false);

  // The app is never gated: send it straight to the normal sign-up.
  useEffect(() => {
    if (inApp) navigate("/signup", { replace: true });
  }, [inApp, navigate]);

  const valid = name.trim().length > 0 && name.trim().length <= REQUEST_NAME_MAX && emailRegex.test(email.trim()) && note.length <= REQUEST_NOTE_MAX;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("request-access", {
      body: { action: "submit", name: name.trim(), email: email.trim(), note: note.trim() || undefined },
    });
    setBusy(false);
    if (err || !data?.ok) {
      let field: string | undefined;
      try { field = (await (err as { context?: Response })?.context?.clone().json())?.field; } catch { /* none */ }
      setError({ field, text: await errorText(err, "Something went wrong. Please try again in a moment.") });
      return;
    }
    setSent(true);
  };

  return (
    <>
      <Helmet>
        <title>Request access - Collabor8</title>
        <meta name="description" content="Ask to join Collabor8. We're welcoming new families gradually and will email you when your place is ready." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://collaborate8.com/request-access" />
      </Helmet>
      <main id="main" tabIndex={-1} className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 focus:outline-none md:max-w-xl">
        <div className="pt-6">
          <button type="button" aria-label="Go back" onClick={() => navigate("/")} className="mb-6 flex h-11 w-11 items-center justify-center">
            <ArrowLeft className="h-6 w-6 text-foreground" aria-hidden="true" />
          </button>
        </div>

        {sent ? (
          <section aria-live="polite" className="flex flex-1 flex-col">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay/10">
              <MailCheck className="h-7 w-7 text-clay" aria-hidden="true" />
            </div>
            <h1 className="mb-3 text-3xl font-bold text-foreground">Thanks, we've got your request</h1>
            <p className="mb-4 text-muted-foreground">
              Rafa or Jade from Collabor8 will look at it personally. If we can welcome you now, we'll email you a link to create your account.
            </p>
            <p className="mb-8 text-muted-foreground">
              Already have an account? You can <Link to="/login" className="font-semibold text-foreground underline">log in</Link> as normal. If your co-parent uses Collabor8, ask them for their invite code and <Link to="/signup/invited" className="font-semibold text-foreground underline">join with it</Link> straight away.
            </p>
            <div className="flex-1" />
            <div className="pb-8">
              <Button className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" onClick={() => navigate("/")}>Back to Collabor8</Button>
            </div>
          </section>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Request access</h1>
            <p className="mb-4 text-muted-foreground">
              We're welcoming new families to Collabor8 gradually, so we can look after everyone well. Tell us a little about you and we'll be in touch by email.
            </p>
            {linkProblem && (
              <p role="status" className="mb-4 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                That sign-up link has already been used or has expired. Send a new request below, or log in if you already made your account.
              </p>
            )}
            <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Has your co-parent invited you? <Link to="/signup/invited" className="font-semibold text-foreground underline">Use their invite code</Link> to join now.
              {" "}Already a member? <Link to="/login" className="font-semibold text-foreground underline">Log in</Link>.
            </div>

            <label htmlFor="ra-name" className="mb-2 block text-sm font-medium text-foreground">Your name</label>
            <div className="relative mb-4">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="ra-name" type="text" autoComplete="name" maxLength={REQUEST_NAME_MAX} value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                aria-invalid={error?.field === "name"} aria-describedby={error?.field === "name" ? "ra-error" : undefined}
                className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground focus:border-clay"
              />
            </div>

            <label htmlFor="ra-email" className="mb-2 block text-sm font-medium text-foreground">Email address</label>
            <div className="relative mb-4">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="ra-email" type="email" inputMode="email" autoComplete="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                aria-invalid={error?.field === "email"} aria-describedby={error?.field === "email" ? "ra-error" : undefined}
                className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground focus:border-clay"
              />
            </div>

            <label htmlFor="ra-note" className="mb-2 block text-sm font-medium text-foreground">
              Anything you'd like us to know? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="ra-note" rows={3} maxLength={REQUEST_NOTE_MAX} value={note}
              onChange={(e) => { setNote(e.target.value); setError(null); }}
              aria-describedby="ra-note-hint"
              className="rounded-2xl border-border bg-card text-foreground focus:border-clay"
            />
            <p id="ra-note-hint" className="mt-1 text-xs text-muted-foreground">
              For example, how you heard about us. Please don't include anything sensitive. {note.length}/{REQUEST_NOTE_MAX}
            </p>

            {error && (
              <p id="ra-error" role="alert" className="mt-4 text-sm text-destructive">{error.text}</p>
            )}

            <div className="flex-1" />
            <div className="pb-8 pt-6">
              <Button type="submit" className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!valid || busy}>
                {busy ? "Sending..." : "Request access"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                We only use these details to reply to your request. See our <Link to="/privacy" className="underline">privacy policy</Link>.
              </p>
            </div>
          </form>
        )}
      </main>
    </>
  );
};

export default RequestAccess;
