import { motion } from "framer-motion";
import DashboardHeader from "./DashboardHeader";
import amazonLogo from "@/assets/amazon-logo.png";
import amexLogo from "@/assets/amex-logo.png";

const benefits = [
  {
    logo: amazonLogo,
    title: "£5 Amazon Voucher",
    description: "After 6 months of consistent payments",
    badge: "6 months",
  },
  {
    logo: amexLogo,
    title: "Earn Credit Card Points",
    description: "Pay one of your biggest monthly expenses, earn points",
    badge: "Amex",
  },
];

const BenefitsTab = () => {
  return (
    <div className="px-6 pt-12">
      <DashboardHeader title="Benefits" />

      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Rewards for consistent payments
        </h2>
        <p className="text-muted-foreground">
          As a Collabor8 subscriber, you unlock perks that make co-parenting payments even more rewarding.
        </p>
      </motion.div>

      {/* Benefits Grid */}
      <div className="space-y-4">
        {benefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
              <img
                src={benefit.logo}
                alt={benefit.title}
                className="h-10 w-10 object-contain"
                loading="lazy"
                width={40}
                height={40}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground truncate">{benefit.title}</p>
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {benefit.badge}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* More Coming */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 rounded-2xl border border-dashed border-border bg-background p-6 text-center"
      >
        <p className="font-medium text-foreground">More benefits coming soon</p>
        <p className="text-sm text-muted-foreground">
          We're always adding new rewards for subscribers
        </p>
      </motion.div>
    </div>
  );
};

export default BenefitsTab;
