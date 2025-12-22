import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Image } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-6"
          >
            {/* Header */}
            <div className="pt-12">
              <button
                onClick={() => navigate(-1)}
                className="mb-8 flex h-10 w-10 items-center justify-center"
              >
                <ArrowLeft className="h-6 w-6 text-foreground" />
              </button>

              <h1 className="mb-2 text-3xl font-bold text-foreground">
                Reset your password
              </h1>
              <p className="mb-8 text-muted-foreground">
                What's your email address or username?
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Reset Button - Fixed at bottom */}
              <div className="fixed bottom-0 left-0 right-0 bg-background p-6">
                <div className="mx-auto max-w-md">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? "Sending..." : "Reset Password"}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex min-h-screen flex-col"
          >
            {/* Success Illustration */}
            <div className="flex flex-1 items-center justify-center bg-secondary">
              <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-card">
                <Image className="h-16 w-16 text-muted-foreground/50" />
              </div>
            </div>

            {/* Success Content */}
            <div className="rounded-t-3xl bg-background px-6 py-10">
              <h1 className="mb-4 text-3xl font-bold text-foreground">
                Check your inbox
              </h1>
              <p className="mb-8 text-muted-foreground">
                We have sent a password recover instructions to your email.
              </p>

              <Button
                onClick={() => navigate("/login")}
                className="mb-6 w-full"
                size="lg"
              >
                Done
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the email? Check your spam filter or{" "}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="font-semibold text-foreground"
                >
                  try another email address
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForgotPassword;
