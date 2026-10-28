import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import TopBanner from "@/components/TopBanner";
import FooterContact from "@/components/FooterContact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Delete your Collabor8 account";
const DESC = "How to delete your Collabor8 account and data, what is deleted and what stays with your co-parent.";

type ConfirmState = "idle" | "working" | "deleted" | "failed";

const DeleteAccount = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>("idle");
  const started = useRef(false);

  const confirmDeletion = async () => {
    if (!token || started.current) return;
    started.current = true;
    setConfirm("working");
    const { data, error } = await supabase.functions.invoke("request-account-deletion", { body: { token } });
    if (!error && (data as { status?: string })?.status === "deleted") {
      setConfirm("deleted");
      await supabase.auth.signOut().catch(() => undefined);
    } else {
      setConfirm("failed");
    }
  };

  useEffect(() => { started.current = false; setConfirm("idle"); }, [token]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return;
    setSending(true);
    await supabase.functions.invoke("request-account-deletion", { body: { email: email.trim() } }).catch(() => undefined);
    setSending(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href="https://collaborate8.com/delete-account" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content="https://collaborate8.com/delete-account" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <TopBanner />

      <main className="mx-auto max-w-md px-6 py-12 md:max-w-2xl md:py-16">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">Delete your Collabor8 account</h1>
        <p className="mt-3 text-muted-foreground">
          This page explains how to delete your account in Collabor8 (app ID com.collaborate8.app) and what happens to your data.
        </p>

        {token && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-5">
            {confirm === "deleted" ? (
              <>
                <h2 className="text-lg font-semibold text-foreground">Your account has been deleted</h2>
                <p className="mt-2 text-sm text-muted-foreground">Your Collabor8 account and personal data have been removed. Thank you for using Collabor8.</p>
              </>
            ) : confirm === "failed" ? (
              <>
                <h2 className="text-lg font-semibold text-foreground">This link didn't work</h2>
                <p className="mt-2 text-sm text-muted-foreground">It may have expired or already been used. Request a new link below, or email rafa@collaborate8.com.</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground">Confirm account deletion</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  This can't be undone. If you want a copy of your data, sign in and download it from Settings first.
                </p>
                <Button onClick={confirmDeletion} disabled={confirm === "working"} className="mt-4 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90" size="lg">
                  {confirm === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete my account"}
                </Button>
              </>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">Before you start: download your data</h2>
          <p className="mt-2 text-sm text-foreground/90">
            Deleting is permanent. To keep a copy, sign in and go to{" "}
            <Link to="/settings#privacy" className="font-medium underline">Settings, Download my data</Link>.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground">How to delete your account</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground/90">
            <li><span className="font-medium">In the app:</span> open Settings, then Delete my account.</li>
            <li><span className="font-medium">On the web:</span> <Link to="/login?next=/settings%23account" className="underline">sign in</Link> and choose Delete my account in Settings, or enter your email below to get a confirmation link.</li>
            <li><span className="font-medium">By email:</span> write to <a href="mailto:rafa@collaborate8.com" className="underline">rafa@collaborate8.com</a> from the address on your account.</li>
          </ol>

          {sent ? (
            <p className="mt-5 rounded-xl bg-muted p-4 text-sm text-foreground">
              If an account exists for that email, we've sent a confirmation link. It works once and expires in 24 hours.
            </p>
          ) : (
            <form onSubmit={requestLink} className="mt-5 flex flex-col gap-3">
              <Input type="email" required placeholder="Your account email" aria-label="Your account email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
              <Button type="submit" disabled={sending} size="lg">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Email me a confirmation link"}
              </Button>
            </form>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">What is deleted and what stays</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/90">
            <li>We only keep your data while you have an account. When you confirm the deletion, your account is deleted straight away, along with records only you were part of.</li>
            <li>Payments you shared with your co-parent stay in their payment history, shown as from "Deleted user".</li>
            <li>Messages your co-parent received from you stay in their account, shown as from "Deleted user".</li>
            <li>Your Stripe subscriptions are cancelled automatically, so you won't be charged again.</li>
          </ul>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          Read more in our <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </main>
      <div className="mx-auto max-w-md px-6 pb-10 md:max-w-2xl"><FooterContact /></div>
    </div>
  );
};

export default DeleteAccount;
