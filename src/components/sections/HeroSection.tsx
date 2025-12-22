import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Heart, Wallet } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-40">
        <img
          src={heroBg}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />

      <div className="container relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
          >
            <Shield className="h-4 w-4" />
            UK's First Digital Child Maintenance Platform
          </motion.div>

          {/* Headline */}
          <h1 className="mb-6 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Child Maintenance,{" "}
            <span className="text-gradient-primary">Simplified</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A modern, low-cost platform helping separated parents manage payments, 
            track expenses, and focus on what matters most — your children's wellbeing.
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button variant="hero" size="xl">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              See How It Works
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              <span>Child-Centered Design</span>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span>Save vs 24% CMS Fees</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          className="absolute left-10 top-1/4 h-20 w-20 rounded-2xl bg-primary/10 blur-2xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-10 top-1/3 h-32 w-32 rounded-full bg-accent/10 blur-3xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
};

export default HeroSection;
