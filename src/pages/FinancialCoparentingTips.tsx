import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";

const FinancialCoparentingTips = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      <TopBanner />
      <Helmet>
        <title>Co-parenting Finance Tips UK | Collabor8</title>
        <meta name="description" content="Practical financial co-parenting tips for separated parents in the UK. Manage child maintenance payments, shared expenses, and communication with Collabor8." />
        <meta name="keywords" content="co-parenting tips uk, financial co-parenting, child maintenance tips, separated parents finances uk, co-parenting communication" />
        <link rel="canonical" href="https://collaborate8.com/resources/financial-coparenting-tips" />
        <meta property="og:title" content="Financial Co-parenting Tips | Collabor8" />
        <meta property="og:description" content="Practical financial co-parenting tips for separated parents in the UK." />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Financial Co-parenting Tips for Separated Parents",
          "description": "Practical financial co-parenting tips for separated parents in the UK.",
          "publisher": { "@type": "Organization", "name": "Collabor8", "url": "https://collaborate8.com" },
          "mainEntityOfPage": "https://collaborate8.com/resources/financial-coparenting-tips"
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Financial Co-parenting Tips</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Co-parenting works best when communication is calm, clear, and focused on your kids. Collabor8 helps by keeping payments, shared expenses, and reminders all in one place, so you can spend less time stressing and more time supporting your child.
          </p>
        </motion.div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Keep Your Focus on the Kids</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Talk about what's best for your children, not the past.</li>
              <li>Collabor8 shows shared expenses clearly, so conversations stay fair and fact-based.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Be Clear and Simple</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Use straightforward messages about amounts and dates.</li>
              <li>Attach receipts and send reminders in-app so everyone knows what's expected.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Write It Down</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Notes, messages, or app logs create a clear record.</li>
              <li>Collabor8 logs all payments and expenses, so everyone can check what's happened.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Set Simple Boundaries</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Agree on when and how you'll communicate.</li>
              <li>Push notifications in Collabor8 mean you don't need to chase updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Stick to the Plan</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Keep up with schedules and payments.</li>
              <li>Recurring payments and reminders in the app help you stay consistent effortlessly.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Use the Tools</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Track expenses, attach receipts, and send reminders all in one place.</li>
              <li>Collabor8 is designed for this, making co-parenting smoother and less stressful.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Stay Calm</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Pause if a discussion gets tense and focus on solutions.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-card p-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Why Collabor8?</h2>
            <p>Collabor8 keeps payments, shared expenses, and reminders all in one place, so you can spend less time stressing and more time supporting your child.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/child-maintenance-calculator" className="text-sm font-medium text-primary hover:underline">Try the calculator</Link>
              <Link to="/resources/child-maintenance-guide" className="text-sm font-medium text-primary hover:underline">Read the full guide</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FinancialCoparentingTips;
