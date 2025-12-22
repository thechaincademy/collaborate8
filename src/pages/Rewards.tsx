import { motion } from "framer-motion";
import { Gift, Star, Ticket, Trophy } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";

const rewards = [
  {
    partner: "Go Ape",
    discount: "20% off",
    description: "Adventure activities for families",
    icon: "🦍",
  },
  {
    partner: "Merlin Attractions",
    discount: "15% off",
    description: "Theme parks and attractions",
    icon: "🎢",
  },
  {
    partner: "Pizza Express",
    discount: "Buy 1 Get 1 Free",
    description: "Kids eat free on weekends",
    icon: "🍕",
  },
];

const stats = [
  { label: "Points Earned", value: "1,250", icon: Star },
  { label: "Rewards Claimed", value: "5", icon: Gift },
  { label: "Current Streak", value: "12 months", icon: Trophy },
];

const Rewards = () => {
  return (
    <MobileLayout>
      <div className="px-6 pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-foreground">Rewards</h1>
          <p className="mb-8 text-muted-foreground">
            Earn rewards for consistent payments
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-3 gap-3"
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl bg-card p-4 text-center shadow-card"
            >
              <stat.icon className="mb-2 h-6 w-6 text-foreground" />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Available Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Available Rewards
          </h2>

          <div className="space-y-4">
            {rewards.map((reward, index) => (
              <motion.div
                key={reward.partner}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
                  {reward.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{reward.partner}</h3>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      {reward.discount}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                </div>
                <Ticket className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default Rewards;
