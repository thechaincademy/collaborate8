import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: February 2025</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly, including your name, email address, and co-parenting financial data such as payment amounts, expense records, and receipts. We also collect usage data through analytics tools to improve our service.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the medi8 service, process payments and expenses, send important notifications about your account, and analyse usage patterns to enhance user experience.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Analytics & Cookies</h2>
            <p>We use Hotjar to understand how users interact with our app. Hotjar uses cookies and other technologies to collect data on user behaviour, including pages visited, clicks, and scrolling. This data helps us improve the user experience. You can opt out of Hotjar tracking by visiting <a href="https://www.hotjar.com/legal/policies/do-not-track/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Hotjar's opt-out page</a>.</p>
            <p className="mt-2">We also use essential cookies to keep you logged in and maintain your session. These are necessary for the app to function properly.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p>Your financial data is shared only with your linked co-parent within the app. We do not sell your personal data to third parties. We may share anonymised, aggregated data with analytics providers to improve our service.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Data Security</h2>
            <p>We use industry-standard encryption and security measures to protect your data. All data is transmitted over HTTPS and stored securely with row-level security policies ensuring you can only access your own data.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can request a copy of your data or ask for account deletion by contacting us. Under GDPR/UK GDPR, you also have the right to data portability and to withdraw consent for analytics tracking.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Contact Us</h2>
            <p>If you have any questions about this privacy policy, please contact us at <span className="text-foreground font-medium">privacy@medi8.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
