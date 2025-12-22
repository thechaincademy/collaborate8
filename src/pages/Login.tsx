import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login - replace with actual auth
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Welcome back!");
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-12"
      >
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex h-10 w-10 items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Log in to Medi8
        </h1>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleLogin}
        className="flex flex-col gap-4"
      >
        {/* Email Input */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Forgot Password */}
        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="self-start text-sm font-semibold text-foreground"
        >
          Forgot password?
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Login Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-background p-6">
          <div className="mx-auto max-w-md">
            <Button
              type="submit"
              className="mb-4 w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log In"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              By proceeding, you accept to our{" "}
              <button className="font-semibold text-foreground">Privacy Policy</button>
              {" "}and{" "}
              <button className="font-semibold text-foreground">Terms of Services</button>.
            </p>
          </div>
        </div>
      </motion.form>
    </div>
  );
};

export default Login;
