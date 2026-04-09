import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ChildMaintenanceGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Child Maintenance Made Simple</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            A friendly guide to understanding your responsibilities, your options, and how Collabor8 makes it easier, fairer, and even rewarding.
          </p>
        </motion.div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. What Is Child Maintenance?</h2>
            <p className="mb-3">
              Child maintenance is money one parent provides to help cover a child's everyday living costs when parents live apart. Both parents are legally responsible for financially supporting their child (Child Support Act 1991), even if they don't live together. Maintenance helps cover:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Housing and utilities</li>
              <li>Food and clothing</li>
              <li>School and childcare costs</li>
              <li>Day-to-day living expenses</li>
            </ul>
            <p className="mt-3">Think of it as keeping life running smoothly for your child, alongside parenting time and other responsibilities.</p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Who Pays Child Maintenance?</h2>
            <p className="mb-3">
              Usually, the parent who doesn't live with the child most of the time (the "paying parent") provides maintenance to the parent who cares for the child day-to-day (the "receiving parent"). How much depends on:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Gross weekly income</li>
              <li>Number of children</li>
              <li>Nights spent with each parent</li>
              <li>Support for other children</li>
            </ul>
            <p className="mt-3">Collabor8 makes it easy to calculate, track, and schedule payments, so both parents can stay clear and stress-free.</p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. How Maintenance Can Be Calculated</h2>
            <p className="mb-3">
              The government's Child Maintenance Service (CMS) uses a formula based on income and number of children:
            </p>
            <div className="rounded-2xl bg-card p-4 space-y-2">
              <p className="font-medium text-foreground">Standard Rates</p>
              <ul className="ml-5 list-disc space-y-1">
                <li>1 child → 12% of gross weekly income</li>
                <li>2 children → 16%</li>
                <li>3+ children → 19%</li>
              </ul>
              <p className="text-xs mt-2">Adjustments are made for overnight stays or other children.</p>
            </div>
            <p className="mt-3">With Collabor8, you get your own in-app calculator to see what works for your family, no need to go anywhere else.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. How You Can Arrange Payments</h2>
            <p className="mb-3">Parents can choose what works best:</p>

            <div className="space-y-4">
              <div className="rounded-2xl bg-card p-4">
                <h3 className="mb-1 font-semibold text-foreground">Family-Based Arrangement</h3>
                <ul className="ml-5 list-disc space-y-1">
                  <li>Decide together on amounts and schedule</li>
                  <li>Payments flow directly between parents</li>
                  <li>Collabor8 tracks every payment automatically</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-card p-4">
                <h3 className="mb-1 font-semibold text-foreground">Direct Pay (Collabor8 Managed)</h3>
                <ul className="ml-5 list-disc space-y-1">
                  <li>Use our app to handle payments directly</li>
                  <li>See every payment, every receipt, every shared expense</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-card p-4">
                <h3 className="mb-1 font-semibold text-foreground">Collect and Pay (Optional)</h3>
                <ul className="ml-5 list-disc space-y-1">
                  <li>Traditionally managed by CMS</li>
                  <li>Collabor8 lets you skip the middleman while keeping everything transparent</li>
                </ul>
              </div>
            </div>

            <p className="mt-3">Collabor8 isn't just about paying and tracking. It's about making co-parenting simpler and fairer, with built-in reminders, receipts, and rewards for staying on top of payments.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Shared and Additional Expenses</h2>
            <p className="mb-3">Maintenance covers daily costs, but parents often agree to extra costs like:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>School trips and uniforms</li>
              <li>Clubs, activities, or hobbies</li>
              <li>Medical or dental expenses</li>
            </ul>
            <p className="mt-3">With Collabor8, you can log these, attach receipts, and request payments, all in one place. You can even earn rewards for keeping everything organised and timely!</p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Your Rights and Responsibilities</h2>
            <p>Both parents are legally responsible for supporting their child financially.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Setting Up and Paying</h2>
            <p className="mb-3">With Collabor8:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Set up payments and recurring schedules in-app</li>
              <li>Track shared expenses with receipts attached</li>
              <li>Send and receive payments safely</li>
              <li>Earn rewards and incentives for managing everything responsibly</li>
            </ul>
            <p className="mt-3 text-xs">
              Note: Collabor8 helps you manage, track, and remind, but it does not enforce payments like a government service. The difference? Everything is faster, easier, and built around your family, and the rewards make it worth staying on top of.
            </p>
          </section>

          {/* Why Collabor8 */}
          <section className="rounded-2xl bg-card p-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Why Collabor8?</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Skip spreadsheets and confusing direct debits</li>
              <li>See every payment and shared expense clearly</li>
              <li>Earn rewards for timely payments</li>
              <li>Keep everything in one place, your co-parenting hub</li>
            </ul>
            <p className="mt-3 font-medium text-foreground">With Collabor8, managing child maintenance becomes a tool for collaboration, not stress.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChildMaintenanceGuide;
