import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  ArrowRight,
  Calculator,
  CreditCard,
  MessageSquare,
  Gift,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import financePhone from "@/assets/finance-phone.jpg";
import appScreenshot1 from "@/assets/app-screenshot-1.png";
import appScreenshot2 from "@/assets/app-screenshot-2.png";
import appScreenshot3 from "@/assets/app-screenshot-3.png";

const Landing = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const waitlistRef = useRef<HTMLDivElement>(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("waitlist").insert({ email: email.trim().toLowerCase() });
    setIsSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.info("You're already on the waitlist!");
        setIsSignedUp(true);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } else {
      toast.success("You're on the list! 🎉");
      setIsSignedUp(true);
    }
  };

  const features = [
    {
      icon: CreditCard,
      title: "Payment Tracking",
      description: "Set up and track recurring child maintenance payments with automatic reminders.",
    },
    {
      icon: Calculator,
      title: "Expense Splitting",
      description: "Log shared expenses, attach receipts, and request reimbursement — all in one place.",
    },
    {
      icon: MessageSquare,
      title: "In-App Messaging",
      description: "Keep communication focused and civil with a dedicated co-parenting chat.",
    },
    {
      icon: Gift,
      title: "Rewards",
      description: "Earn rewards for consistent, on time payments.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <span className="text-sm font-bold text-background">M8</span>
          </div>
          <span className="text-lg font-bold text-foreground">medi8</span>
        </div>
        <Button variant="default" size="sm" onClick={scrollToWaitlist}>
          Join the Waiting List
        </Button>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Launching Soon
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-5xl md:leading-tight">
            Co-parenting finances,{" "}
            <span className="text-muted-foreground">made simple.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            medi8 helps separated parents manage child maintenance payments, split expenses fairly, and keep everything transparent — without the stress.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={scrollToWaitlist} className="gap-2">
              Join the Waiting List <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex justify-center"
        >
          <ChevronDown className="h-5 w-5 animate-bounce text-muted-foreground" />
        </motion.div>
      </section>

      {/* App Screenshots */}
      <section className="overflow-hidden border-t border-border bg-card py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              See it in action
            </h2>
            <p className="mt-3 text-muted-foreground">
              A clean, simple interface designed for stress-free co-parenting.
            </p>
          </motion.div>

          <div className="flex items-center justify-center gap-6 md:gap-10">
            {[
              { src: appScreenshot1, alt: "Payment tracking screen", label: "Track Payments" },
              { src: appScreenshot2, alt: "Expense management screen", label: "Manage Expenses" },
              { src: appScreenshot3, alt: "Co-parent messaging screen", label: "Stay Connected" },
            ].map((screenshot, i) => (
              <motion.div
                key={screenshot.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center"
              >
                <img
                  src={screenshot.src}
                  alt={screenshot.alt}
                  className="h-48 w-auto rounded-2xl object-contain shadow-elevated md:h-80"
                />
                <p className="mt-4 text-sm font-medium text-muted-foreground">{screenshot.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-muted-foreground">
              One app to manage all co-parenting finances.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                  <feature.icon className="h-5 w-5 text-background" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              How it works
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "1", title: "Set up your arrangement", desc: "Enter your payment amount, frequency, and schedule in seconds." },
              { step: "2", title: "Track & manage", desc: "Monitor payments, log shared expenses, and keep receipts organised." },
              { step: "3", title: "Stay aligned", desc: "Both parents see the same information — no more disputes or confusion." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-lg font-bold text-background">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Finance phone image + CTA */}
      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 md:order-1"
            >
              <h2 className="mb-4 text-3xl font-bold text-foreground">
                Your finances, at your fingertips
              </h2>
              <p className="mb-6 text-muted-foreground">
                Track every payment, log every expense, and keep a complete record — all from your phone. medi8 gives you the clarity and control you need.
              </p>
              <Button size="lg" onClick={scrollToWaitlist} className="gap-2">
                Get Early Access <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 md:order-2"
            >
              <img
                src={financePhone}
                alt="Parent managing finances on phone"
                className="w-full rounded-3xl object-cover shadow-elevated"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section ref={waitlistRef} className="py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Ready to simplify co-parenting?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join the waitlist and be the first to know when we launch.
            </p>
            {!isSignedUp ? (
              <form onSubmit={handleWaitlistSignup} className="mx-auto mt-8 flex max-w-md gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 flex-1 rounded-full border-border bg-card px-5"
                  required
                />
                <Button type="submit" size="default" disabled={isSubmitting}>
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </Button>
              </form>
            ) : (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">You're on the waitlist!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Want to explore the app now? Try our interactive prototype.
                </p>
                <Button onClick={() => navigate("/splash")} size="lg" className="gap-2">
                  Try the Prototype <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              No spam. We'll only email you when we're ready to launch.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                <span className="text-xs font-bold text-background">M8</span>
              </div>
              <span className="text-sm font-semibold text-foreground">medi8</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
              <span>© 2025 medi8</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
