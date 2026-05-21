import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValid = emailRegex.test(email);

  const sendReset = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast.error(error.message || "Could not send reset email");
      return;
    }
    setIsSubmitted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    sendReset();
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - Collabor8</title>
        <meta name="description" content="Reset your Collabor8 password. Enter your email to receive a secure password reset link." />
        <link rel="canonical" href="https://collaborate8.com/forgot-password" />
      </Helmet>
      <div className="mx-auto min-h-screen max-w-md bg-background">
      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex min-h-screen flex-col px-6"
          >
            <div className="pt-12">
              <button
                onClick={() => navigate(-1)}
                className="mb-8 flex h-10 w-10 items-center justify-center"
              >
                <ArrowLeft className="h-6 w-6 text-foreground" />
              </button>

              <h1 className="mb-2 text-3xl font-bold text-foreground">Reset your password</h1>
              <p className="mb-8 text-muted-foreground">
                Enter your email address and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
                />
              </div>

              <div className="flex-1" />

              <div className="pb-8 pt-6">
                <Button
                  type="submit"
                  className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
                  size="lg"
                  disabled={isLoading || !isValid}
                >
                  {isLoading ? "Sending..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex min-h-screen flex-col px-6"
          >
            <div className="pt-12">
              <button
                onClick={() => navigate("/login")}
                className="mb-8 flex h-10 w-10 items-center justify-center"
              >
                <ArrowLeft className="h-6 w-6 text-foreground" />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-clay-soft">
                <MailCheck className="h-10 w-10 text-clay" />
              </div>
              <h1 className="mb-4 text-3xl font-bold text-foreground">Check your inbox</h1>
              <p className="mb-2 text-muted-foreground">We sent a reset link to</p>
              <p className="mb-8 font-semibold text-foreground">{email}</p>
              <p className="text-base text-foreground">
                Click the link in that email to reset your password.
              </p>
            </div>

            <div className="pb-8">
              <Button
                onClick={() => navigate("/login")}
                className="mb-3 w-full bg-clay text-clay-foreground hover:bg-clay/90"
                size="lg"
              >
                Back to log in
              </Button>
              <button
                onClick={sendReset}
                disabled={isLoading}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {isLoading ? "Resending..." : "Didn't receive it? Resend email"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default ForgotPassword;
