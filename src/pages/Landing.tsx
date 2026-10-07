import FooterResources from "@/components/FooterResources";
import FooterContact from "@/components/FooterContact";
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
  ArrowRight,
  ChevronDown,
  Trophy,
  BookOpen,
  Infinity
} from "lucide-react";

import appScreenshot1 from "@/assets/app-real-1.jpg";
import appScreenshot2 from "@/assets/app-real-2.jpg";
import appScreenshot3 from "@/assets/app-real-3.jpg";
import TopBanner from "@/components/TopBanner";
import InstallAppButtons from "@/components/InstallAppButtons";
import { useAppCtaHref } from "@/hooks/useAppCta";

const Landing = () => {
  const navigate = useNavigate();
  const ctaHref = useAppCtaHref("/splash");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const formLoadedAt = useRef(Date.now());

  const scrollToWaitlist = () => {
    navigate(ctaHref);
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Collabor8 - Child Maintenance App for UK Parents</title>
        <meta name="description" content="Collabor8 helps separated parents manage child maintenance payments, track expenses, and earn rewards. Free CMS calculator based on the official UK formula." />
        <link rel="canonical" href="https://collaborate8.com/" />
        <meta property="og:title" content="Collabor8 - Child Maintenance App for UK Parents" />
        <meta property="og:description" content="Collabor8 helps separated parents manage child maintenance payments, track expenses, and earn rewards. Free CMS calculator based on the official UK formula." />
        <meta property="og:url" content="https://collaborate8.com/" />
        <meta name="twitter:title" content="Collabor8 - Child Maintenance App for UK Parents" />
        <meta name="twitter:description" content="Collabor8 helps separated parents manage child maintenance payments, track expenses, and earn rewards. Free CMS calculator based on the official UK formula." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Collabor8",
          "url": "https://collaborate8.com",
          "description": "UK child maintenance service for separated parents. Payment tracking, expense management, and rewards.",
          "sameAs": []
        })}</script>
      </Helmet>
      {/* Nav */}
      <TopBanner />

      {/* Hero */}
      <div>
        <section className="relative w-full overflow-hidden bg-primary">
          {/* Texture & Depth Overlays */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(250, 248, 243, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(26, 26, 22, 0.1) 0%, transparent 50%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col items-center px-6 py-20 text-center md:px-8 md:py-28"
          >

            <h1 className="mb-6 max-w-2xl text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:leading-[1.1]">
              Let's talk finances.
            </h1>

            <p className="mb-10 max-w-lg text-lg leading-relaxed text-foreground/80 md:text-xl">
              Collabor8 gives separated parents a dedicated space to discuss money and manage child maintenance - away from everything else.
            </p>

            <div className="flex w-full max-w-md flex-col items-center">
              <button
                onClick={scrollToWaitlist}
                className="w-full rounded-xl bg-teal-700 px-6 py-4 text-lg font-bold text-white shadow-elevated transition-all hover:scale-[1.02] hover:bg-teal-800 active:scale-95"
              >
                Sign up here →
              </button>

              <div className="mt-4 flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-foreground/20" />
                <span className="text-xs font-medium text-foreground/70">or</span>
                <span className="h-px flex-1 bg-foreground/20" />
              </div>

              <div className="mt-4">
                <InstallAppButtons />
              </div>

            </div>
          </motion.div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex justify-center"
        >
          <ChevronDown className="h-5 w-5 animate-bounce text-muted-foreground" />
        </motion.div>
      </div>

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

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                src: appScreenshot1,
                alt: "Financial chat screen",
                title: "Talking about money can be tough. Get the conversation started",
                description: "A dedicated space to discuss finances with your co-parent - separate from everything else.",
              },
              {
                src: appScreenshot2,
                alt: "Child maintenance and expense management screen",
                title: "Manage child maintenance payments or other expenses",
                description: "Set up recurring payments, log shared costs, and keep everything in one place.",
              },
              {
                src: appScreenshot3,
                alt: "Payment flexibility and rewards screen",
                title: "Payment flexibility - pay by credit card and earn points",
                description: "Choose how you pay and unlock rewards with every maintenance payment.",
              },
            ].map((screenshot, i) => (
              <motion.div
                key={screenshot.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <img
                  src={screenshot.src}
                  alt={screenshot.alt}
                  className="h-48 w-auto rounded-2xl object-contain shadow-elevated md:h-64"
                />
                <h3 className="mt-6 max-w-xs text-lg font-bold leading-snug text-foreground">
                  {screenshot.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {screenshot.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Section */}
      <section className="border-t border-border py-20 bg-yellow-500">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Everything you get, in one app
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to stay on top of co-parenting finances, and then some.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Infinity,
                title: "Your data stays yours",
                description: "Your personal information, profile and account details are never visible to your co-parent. Only what you choose to share in the financial chat is seen by both of you.",
              },
              {
                icon: BookOpen,
                title: "Access support",
                description: "Access support. Use guided self mediation tools to kick-start conversations.",
              },
              {
                icon: Trophy,
                title: "Get started",
                description: "Get started. Sign up here.",
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
            <Button size="lg" onClick={scrollToWaitlist} className="gap-2">
              Sign Up <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>


      {/* Sign up CTA */}
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
              Create your account and get started in minutes.
            </p>
            <div className="mt-8">
              <Button size="lg" onClick={() => navigate(ctaHref)} className="gap-2">
                Sign Up <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
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
              <span className="text-sm font-semibold text-foreground">Collabor8</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <Link to="/child-maintenance-calculator" className="hover:text-foreground">Child Maintenance Calculator</Link>
              <Link to="/podcast" className="hover:text-foreground">The Blog</Link>
              <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">Maintenance Guide</Link>
              <Link to="/resources/child-maintenance-guide#money-help" className="hover:text-foreground">Money Help</Link>
              <Link to="/faq" className="hover:text-foreground">FAQ</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <span>© {new Date().getFullYear()} Collabor8</span>
            </div>
          </div>
        </div>
      <FooterResources />
        <FooterContact />
      </footer>
    </div>
  );
};

export default Landing;
