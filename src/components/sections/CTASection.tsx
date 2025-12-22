import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart } from "lucide-react";

const CTASection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-primary py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-primary-foreground"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20"
          >
            <Heart className="h-8 w-8" />
          </motion.div>

          <h2 className="mb-6 font-serif text-3xl font-bold sm:text-4xl md:text-5xl">
            Ready to Put Your Children First?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-primary-foreground/80">
            Join thousands of parents who are simplifying child maintenance and reducing conflict. 
            Start your free trial today — no credit card required.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="secondary" size="xl">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline-light" size="lg">
              Contact Us
            </Button>
          </div>

          <p className="mt-8 text-sm text-primary-foreground/60">
            Questions? Email us at hello@medi8.co.uk
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
