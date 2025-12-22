import { motion } from "framer-motion";
import { AlertTriangle, X, Phone, FileText, PoundSterling } from "lucide-react";

const problems = [
  {
    icon: Phone,
    title: "Outdated Communication",
    description: "Heavy reliance on letters and phone calls with no modern digital tools"
  },
  {
    icon: FileText,
    title: "No Payment Tracking",
    description: "No tools for budgeting, tracking payments, or joint financial planning"
  },
  {
    icon: PoundSterling,
    title: "Expensive Fees",
    description: "CMS charges up to 24% combined fees through their Collect & Pay service"
  },
  {
    icon: AlertTriangle,
    title: "£3 Billion Unpaid",
    description: "A growing backlog of unpaid maintenance affecting children's wellbeing"
  }
];

const ProblemSection = () => {
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
          <span className="mb-4 inline-block rounded-full bg-destructive/10 px-4 py-1.5 text-sm font-medium text-destructive">
            The Problem
          </span>
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            A System That's Failing Families
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
            With 3.2 million single-parent families in the UK, the current Child Maintenance Service 
            is struggling to keep up — and families are paying the price.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative rounded-2xl bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-elevated"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-colors group-hover:bg-destructive group-hover:text-destructive-foreground">
                <problem.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-semibold text-foreground">
                {problem.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
