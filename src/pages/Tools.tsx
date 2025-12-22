import { motion } from "framer-motion";
import { Calculator, Receipt, MessageSquare, BookOpen, Settings } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";

const tools = [
  {
    icon: Calculator,
    title: "Maintenance Calculator",
    description: "Calculate recommended maintenance amounts",
    color: "bg-blue-100",
  },
  {
    icon: Receipt,
    title: "Expense Tracker",
    description: "Log and track child-related expenses",
    color: "bg-green-100",
  },
  {
    icon: MessageSquare,
    title: "Communication Log",
    description: "Keep records of important conversations",
    color: "bg-purple-100",
  },
  {
    icon: BookOpen,
    title: "Co-Parenting Guide",
    description: "Tips and resources for effective co-parenting",
    color: "bg-orange-100",
  },
  {
    icon: Settings,
    title: "Payment Settings",
    description: "Manage your payment preferences",
    color: "bg-gray-100",
  },
];

const Tools = () => {
  return (
    <MobileLayout>
      <div className="px-6 pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-foreground">Tools</h1>
          <p className="mb-8 text-muted-foreground">
            Helpful features to manage child maintenance
          </p>
        </motion.div>

        <div className="space-y-4">
          {tools.map((tool, index) => (
            <motion.button
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left shadow-card transition-all hover:shadow-elevated"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.color}`}>
                <tool.icon className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{tool.title}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Tools;
