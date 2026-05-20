import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopBanner from "@/components/TopBanner";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      <TopBanner />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Cookie Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: February 2025</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you use the service.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Essential Cookies</h2>
            <p>These cookies are necessary for the app to function. They handle authentication, session management, and security. You cannot opt out of essential cookies as they are required for the service to work.</p>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-foreground">
                <span>Cookie</span><span>Purpose</span><span>Duration</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <span>sb-*-auth-token</span><span>Authentication</span><span>Session</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Analytics Cookies</h2>
            <p>We use Hotjar for behavioural analytics. These cookies help us understand how users interact with our app so we can improve the experience.</p>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-foreground">
                <span>Cookie</span><span>Purpose</span><span>Duration</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_hj*</span><span>Hotjar analytics</span><span>1 year</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_hjSession*</span><span>Session tracking</span><span>30 min</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Managing Cookies</h2>
            <p>You can manage your cookie preferences through the cookie consent banner that appears when you first visit our site. You can also manage cookies through your browser settings. Note that disabling essential cookies may prevent the app from functioning properly.</p>
            <p className="mt-2">To opt out of Hotjar tracking specifically, visit <a href="https://www.hotjar.com/legal/policies/do-not-track/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Hotjar's opt-out page</a>.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
            <p>For questions about our use of cookies, contact us at <span className="text-foreground font-medium">privacy@medi8.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
