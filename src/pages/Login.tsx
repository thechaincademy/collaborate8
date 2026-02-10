import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
const Login = () => {
  const navigate = useNavigate();
  const {
    signIn
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error(error.message || "Failed to log in");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
  };
  return <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6">
      {/* Header */}
      <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="pt-12">
        <button onClick={() => navigate(-1)} className="mb-8 flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <h1 className="mb-8 text-3xl font-bold text-foreground">Log in to Collabor8
 </h1>
      </motion.div>

      {/* Form */}
      <motion.form initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.1
    }} onSubmit={handleLogin} className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
          </div>

          {/* Forgot Password */}
          <button type="button" onClick={() => navigate("/forgot-password")} className="self-start text-sm font-semibold text-foreground">
            Forgot password?
          </button>
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Login Button & Terms */}
        <div className="pb-8 pt-6">
          <Button type="submit" className="mb-4 w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            By proceeding, you accept to our{" "}
            <button type="button" className="font-semibold text-foreground">Privacy Policy</button>
            {" "}and{" "}
            <button type="button" className="font-semibold text-foreground">Terms of Services</button>.
          </p>
        </div>
      </motion.form>
    </div>;
};
export default Login;