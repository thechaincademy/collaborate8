import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import splashFamily from "@/assets/splash-family-hd.jpg";

const Splash = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to log in");
      return;
    }

    toast.success("Welcome back!");
    navigate("/dashboard");
  };

  const renderAccountActions = () => (
    <div className="space-y-3">
      <Button
        onClick={() => navigate("/signup")}
        className={`w-full ${showLogin ? "opacity-60" : ""}`}
        size="lg"
      >
        Create account
      </Button>
      <Button
        onClick={() => setShowLogin(true)}
        variant={showLogin ? "default" : "outline"}
        className="w-full"
        size="lg"
        aria-expanded={showLogin}
        aria-controls="inline-login-form"
      >
        Log in
      </Button>

      <AnimatePresence initial={false}>
        {showLogin && (
          <motion.form
            id="inline-login-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleLogin}
            className="space-y-3 overflow-hidden pt-1"
          >
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                aria-label="Email address"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Get Started - Collabor8</title>
        <meta name="description" content="Create your account or log in to Collabor8. The app helping co-parents manage child maintenance payments with ease." />
        <link rel="canonical" href="https://collaborate8.com/splash" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md md:max-w-4xl lg:max-w-5xl flex-col bg-background px-6 md:px-10">
        <div className="flex flex-1 flex-col items-center justify-center pt-10 md:grid md:grid-cols-2 md:items-center md:gap-12 md:pt-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center md:items-start"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-foreground md:h-24 md:w-24">
              <span className="text-2xl font-bold text-background md:text-3xl">C8</span>
            </div>
            <h1 className="text-center text-2xl font-bold text-foreground md:text-left md:text-4xl">Collabor8</h1>
            <p className="mt-1 text-center text-muted-foreground md:text-left md:text-lg">Co-parenting made simple</p>
            <p className="mt-4 hidden max-w-sm text-left text-muted-foreground md:block">
              A dedicated space for separated parents to discuss money and manage child maintenance - away from everything else.
            </p>

            <div className="mt-6 w-full overflow-hidden rounded-3xl border border-border bg-card md:hidden">
              <img
                src={splashFamily}
                alt="A parent and child sharing a warm moment together"
                width={1920}
                height={1920}
                className="h-52 w-full object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="hidden w-full md:block"
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={splashFamily}
                alt="A parent and child sharing a warm moment together"
                width={1920}
                height={1920}
                className="h-72 w-full object-cover lg:h-96"
              />
            </div>
            <div className="mt-8">{renderAccountActions()}</div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pb-8 pt-8 md:hidden"
        >
          {renderAccountActions()}
        </motion.div>
      </div>
    </>
  );
};

export default Splash;
