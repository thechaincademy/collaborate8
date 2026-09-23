import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const clean = email.trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(clean)) {
      toast.error("This email does not have admin access.");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Magic link sent - check your inbox.");
  };

  return (
    <>
      <Helmet>
        <title>Admin access - Collabor8</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md md:max-w-lg flex-col justify-center px-6">
        <h1 className="mb-2 text-2xl font-semibold">Admin access</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your founder email and we'll send you a secure sign-in link.
        </p>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {sent ? (
              <p className="text-sm">
                We've emailed a sign-in link to <strong>{email}</strong>. Open it on this device to
                reach the dashboard.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@collaborate8.com"
                  />
                </div>
                <Button className="w-full" onClick={handleSend} disabled={sending || !email}>
                  {sending ? "Sending..." : "Send magic link"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminLogin;
