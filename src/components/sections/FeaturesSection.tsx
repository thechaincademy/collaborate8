import { motion } from "framer-motion";
import { 
  CreditCard, 
  Calculator, 
  Receipt, 
  MessageSquare, 
  Gift, 
  Bell,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: CreditCard,
    title: "Direct Bank Payments",
    description: "Secure parent-to-parent transfers via Plaid. We never hold your funds — payments go directly between accounts.",
    highlight: true
  },
  {
    icon: Calculator,
    title: "Maintenance Calculator",
    description: "Calculate the correct child maintenance amount based on government guidelines, without the guesswork."
  },
  {
    icon: Receipt,
    title: "Expense Management",
    description: "Request, approve, or decline expenses in two clicks. Track school fees, activities, clothing, and more."
  },
  {
    icon: MessageSquare,
    title: "Financial Communication",
    description: "Shared dashboards for transparency. Keep conversations about money clear and documented."
  },
  {
    icon: Bell,
    title: "Payment Reminders",
    description: "In-app prompts and notifications to encourage timely payments and reduce missed payments."
  },
  {
    icon: Gift,
    title: "Family Rewards",
    description: "Exclusive discounts from partners like Merlin and Go Ape. Rewards for consistent payment engagement."
  }
];

const FeaturesSection = () => {
  return (
    <section className="relative overflow-hidden bg-background py-24">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Features
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Everything You Need,{" "}
            <span className="text-gradient-primary">Nothing You Don't</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
            Medi8 simplifies child maintenance with smart tools designed for real families. 
            No hidden fees. No complexity. Just clarity.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`group relative rounded-2xl p-8 transition-all duration-300 ${
                feature.highlight 
                  ? "bg-gradient-primary text-primary-foreground shadow-glow" 
                  : "bg-card shadow-soft hover:shadow-elevated"
              }`}
            >
              <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                feature.highlight 
                  ? "bg-primary-foreground/20" 
                  : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
              }`}>
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className={`mb-3 font-serif text-xl font-semibold ${
                feature.highlight ? "text-primary-foreground" : "text-foreground"
              }`}>
                {feature.title}
              </h3>
              <p className={`text-sm leading-relaxed ${
                feature.highlight ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <Button variant="hero" size="lg">
            Explore All Features
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
