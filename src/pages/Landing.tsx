import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
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
  ChevronDown,
  Trophy,
  Star,
  BookOpen,
  Infinity
} from "lucide-react";
import financePhone from "@/assets/finance-phone.jpg";
import appScreenshot1 from "@/assets/app-screenshot-1.png";
import appScreenshot2 from "@/assets/app-screenshot-2.png";
import appScreenshot3 from "@/assets/app-screenshot-3.png";
import TopBanner from "@/components/TopBanner";

const Landing = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const formLoadedAt = useRef(Date.now());

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot check - bots fill hidden fields
    if (honeypot) return;

    // Timing check - bots submit too fast (under 2 seconds)
    if (Date.now() - formLoadedAt.current < 2000) {
      toast.error("Please wait a moment before submitting.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
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
      description: "Log shared expenses, attach receipts, and request reimbursement, all in one place.",
    },
    {
      icon: MessageSquare,
      title: "In-App Messaging",
      description: "Keep communication focused and civil with a dedicated co-parenting chat.",
    },
    {
      icon: Gift,
      title: "Rewards",
      description: "Earn rewards and points for consistent payments. Unlock milestones, climb leaderboards, and save hundreds of pounds a year.",
    },
  ];

  return (
    <div className="min-h-screen bg-background bg-yellow-500">
      <Helmet>
        <title>Collabor8 - Child Maintenance Service & Calculator for UK Parents</title>
        <meta name="description" content="Collabor8 helps separated parents manage child maintenance payments, track expenses, and earn rewards. Free child maintenance calculator based on the official CMS formula." />
        <link rel="canonical" href="https://collabor8.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Collabor8",
          "url": "https://collabor8.lovable.app",
          "description": "UK child maintenance service for separated parents. Payment tracking, expense management, and rewards.",
          "sameAs": []
        })}</script>
      </Helmet>
      {/* Nav */}
      <TopBanner />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center md:pt-24 rounded-3xl mt-4 mx-6 bg-yellow-500">
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
            Helping separated parents handle payments and expenses with clarity.
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
      <section className="overflow-hidden border-t border-border bg-card py-20 bg-background">
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
              Handle payments and expenses, in a few simple clicks
            </p>
          </motion.div>

          <div className="flex items-center justify-center gap-6 md:gap-10">
            {[
              { src: appScreenshot1, alt: "Payment tracking screen", label: "Track Payments" },
              { src: appScreenshot2, alt: "Expense management screen", label: "Manage Expenses" },
              { src: appScreenshot3, alt: "Rewards screen", label: "Claim Rewards" },
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
      <section className="py-20 bg-slate-50">
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

      {/* Subscription Value Section */}
      <section className="border-t border-border py-20 bg-yellow-500">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Your subscription, packed with value
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to stay on top of co-parenting finances, and then some.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Infinity,
                title: "Unlimited expenses & payments",
                description: "Track every payment and expense with no limits. Log as many as you need, whenever you need.",
              },
              {
                icon: BookOpen,
                title: "Micro-courses & budgeting tools",
                description: "Access co-parenting mini-courses and downloadable budgeting templates to keep your finances healthy.",
              },
              {
                icon: Trophy,
                title: "Hundreds of pounds in rewards",
                description: "Earn rewards and points for consistent payments, far exceeding the cost of your subscription.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
                  <item.icon className="h-6 w-6 text-background" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 text-center"
          >
            <p className="mb-6 font-medium text-foreground">
              <Star className="mr-1 inline h-4 w-4" />
              Stay consistent, earn points, and watch your rewards grow.
            </p>
            <Button size="lg" onClick={scrollToWaitlist} className="gap-2">
              Join the Waiting List <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
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
                Manage payments with ease. Get rewarded along the way. Collabor8 gives families the clarity they need to stay on track.
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
      <section id="waitlist" ref={waitlistRef} className="py-20 bg-slate-50">
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
                {/* Honeypot - hidden from real users, bots will fill it */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute opacity-0 pointer-events-none h-0 w-0"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
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
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">You're on the waitlist!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll be in touch soon!
                </p>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              No spam. We'll only email you when we're ready to launch.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                <span className="text-xs font-bold text-background">C8</span>
              </div>
              <span className="text-sm font-semibold text-foreground">collabor8</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <Link to="/child-maintenance-calculator" className="hover:text-foreground">Child Maintenance Calculator</Link>
              <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">Maintenance Guide</Link>
              <Link to="/resources/support-and-guidance" className="hover:text-foreground">Support &amp; Guidance</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
              <span>© 2025 collabor8</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
