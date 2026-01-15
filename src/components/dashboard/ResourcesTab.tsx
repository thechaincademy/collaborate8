import { motion } from "framer-motion";
import { User, Bell, BookOpen, Scale, Heart, FileText, ChevronRight } from "lucide-react";

const resources = [
  {
    icon: Scale,
    title: "Understanding Child Maintenance",
    description: "Learn about your rights and responsibilities",
    category: "Legal"
  },
  {
    icon: FileText,
    title: "Child Maintenance Service Guide",
    description: "How the CMS works and when to use it",
    category: "Guide"
  },
  {
    icon: Heart,
    title: "Managing Co-parenting Finances",
    description: "Tips for healthy financial communication",
    category: "Wellbeing"
  },
  {
    icon: BookOpen,
    title: "Budgeting for Two Homes",
    description: "Practical advice for separated parents",
    category: "Finance"
  },
];

const quickLinks = [
  "Child Maintenance Calculator",
  "Benefits & Tax Credits",
  "Legal Aid Eligibility",
  "Mediation Services",
];

const ResourcesTab = () => {
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
        <h1 className="text-lg font-semibold text-foreground">Resources</h1>
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
