import { motion } from "framer-motion";
import { User, Bell, Ticket, Gift, Percent, Star } from "lucide-react";

const benefits = [
  {
    icon: Ticket,
    title: "Cinema Tickets",
    description: "Up to 40% off at selected cinemas",
    discount: "40% off"
  },
  {
    icon: Gift,
    title: "Days Out",
    description: "Family discounts at theme parks & attractions",
    discount: "25% off"
  },
  {
    icon: Percent,
    title: "Grocery Savings",
    description: "Exclusive deals at major supermarkets",
    discount: "10% off"
  },
  {
    icon: Star,
    title: "Kids Activities",
    description: "Sports clubs, classes & hobbies",
    discount: "20% off"
  },
];

const BenefitsTab = () => {
  return (
    <div className="px-6 pt-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex items-center justify-between"
      >
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <User className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Benefits</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <Bell className="h-5 w-5 text-foreground" />
        </button>
      </motion.div>

      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Exclusive offers for families
        </h2>
        <p className="text-muted-foreground">
          As a Medi8 member, you get access to discounts and deals to help your family save.
        </p>
      </motion.div>

      {/* Benefits Grid */}
      <div className="space-y-4">
        {benefits.map((benefit, index) => (
          <motion.button
            key={benefit.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <benefit.icon className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{benefit.title}</p>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
            <div className="rounded-full bg-muted px-3 py-1">
              <p className="text-xs font-medium text-foreground">{benefit.discount}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 rounded-2xl border border-dashed border-border bg-background p-6 text-center"
      >
        <p className="font-medium text-foreground">More benefits coming soon</p>
        <p className="text-sm text-muted-foreground">
          We're always adding new offers for families
        </p>
      </motion.div>
    </div>
  );
};

export default BenefitsTab;
