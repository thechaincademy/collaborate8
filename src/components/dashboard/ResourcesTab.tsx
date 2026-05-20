import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calculator, ChevronRight } from "lucide-react";
import DashboardHeader from "./DashboardHeader";

const resources = [
  {
    icon: Calculator,
    title: "Child Maintenance Calculator",
    description: "Work out a fair amount using the UK standard formula",
    category: "Tool",
    link: "/child-maintenance-calculator"
  },
  {
    icon: BookOpen,
    title: "Child Maintenance Guide",
    description: "Everything separated parents need to know",
    category: "Guide",
    link: "/resources/child-maintenance-guide-app"
  },
];

const quickLinks = [
  "Child Maintenance Calculator",
  "Benefits & Tax Credits",
  "Legal Aid Eligibility",
  "Mediation Services",
];

const ResourcesTab = () => {
  const navigate = useNavigate();
  return (
    <div className="px-6 pt-12">
      <DashboardHeader title="Resources" />

      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Helpful information
        </h2>
        <p className="text-muted-foreground">
          Guides, tips, and resources for managing finances as separated parents.
        </p>
      </motion.div>

      {/* Resources List */}
      <div className="mb-8 space-y-3">
        {resources.map((resource, index) => (
          <motion.button
            key={resource.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            onClick={() => resource.link && navigate(resource.link)}
            className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <resource.icon className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{resource.title}</p>
              <p className="text-sm text-muted-foreground">{resource.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Links</h3>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <button
              key={link}
              className="rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground"
            >
              {link}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ResourcesTab;
