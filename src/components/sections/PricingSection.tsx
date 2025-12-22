import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const features = [
  "Unlimited payment scheduling",
  "Child maintenance calculator",
  "Expense tracking & approval",
  "Shared financial dashboard",
  "Payment reminders",
  "Access to partner rewards",
  "Secure bank-to-bank transfers",
  "In-app support & guidance"
];

const PricingSection = () => {
  return (
    <section className="relative overflow-hidden bg-secondary py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            Simple Pricing
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            One Plan. Everything Included.
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
            No hidden fees. No percentage cuts. Just a simple annual subscription 
            that costs a fraction of what you'd pay with traditional services.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-lg"
        >
          <div className="relative overflow-hidden rounded-3xl bg-card shadow-elevated">
            {/* Header */}
            <div className="bg-gradient-primary p-8 text-center text-primary-foreground">
              <h3 className="mb-2 font-serif text-2xl font-bold">Medi8 Annual</h3>
              <p className="mb-6 text-primary-foreground/80">Everything you need to manage child maintenance</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">£49</span>
                <span className="text-lg text-primary-foreground/80">/year</span>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/70">
                That's just £4.08/month
              </p>
            </div>

            {/* Features */}
            <div className="p-8">
              <ul className="mb-8 space-y-4">
                {features.map((feature, index) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <Button variant="hero" size="xl" className="w-full">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                14-day free trial. No credit card required.
              </p>
            </div>

            {/* Comparison */}
            <div className="border-t border-border bg-muted/50 p-6">
              <p className="text-center text-sm text-muted-foreground">
                <strong className="text-foreground">Compare:</strong> CMS Collect & Pay charges 24% in fees. 
                On £400/month maintenance, that's <span className="text-destructive font-semibold">£1,152/year</span> in fees.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
