import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Cookie Policy - Collabor8</title>
        <meta name="description" content="Learn how Collabor8 uses cookies to improve your experience. Manage your preferences for essential and analytics cookies." />
        <link rel="canonical" href="https://collaborate8.com/cookies" />
      </Helmet>
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      <TopBanner />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Cookie Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: 28 October 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you use the service.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Strictly necessary</h2>
            <p>These keep you signed in, keep the Service secure and remember your cookie choice. They cannot be disabled.</p>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-foreground">
                <span>Name</span><span>Purpose</span><span>Duration</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>sb-*-auth-token</span><span>Sign-in session (Supabase)</span><span>Session</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>medi8-cookie-consent</span><span>Your cookie choice</span><span>Until you clear it</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Analytics</h2>
            <p>These help us understand how visitors use the website so we can improve it. They are only set after you click "Accept All".</p>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-foreground">
                <span>Name</span><span>Purpose</span><span>Duration</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_ga</span><span>Google Analytics 4 (G-2YB8M4ZYEG) visitor id</span><span>2 years</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_ga_*</span><span>Google Analytics 4 session</span><span>2 years</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_clck</span><span>Microsoft Clarity (yszafltuee) visitor id</span><span>1 year</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_clsk</span><span>Microsoft Clarity session</span><span>1 day</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>_hj*</span><span>Hotjar (6645141) analytics</span><span>1 year</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span>c8_anon_id</span><span>Collabor8 usage events</span><span>Until you clear it</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Advertising</h2>
            <p>The Google tag (Google Ads, AW-18435476721) helps us measure how well our ads work. Advertising cookies are only set after you click "Accept All".</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Sign-up source</h2>
            <p>c8_attribution is stored in your browser (localStorage) to remember how you found Collabor8, so we can save it when you sign up. It is only saved after you click "Accept All".</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Google Consent Mode</h2>
            <p>The Google tag (Google Analytics 4 and Google Ads) loads before you make a choice, in Google Consent Mode, with analytics and advertising storage set to denied. This means no analytics or advertising cookies are set, but Google may receive limited signals without cookies, such as that a page was viewed. Cookies are only set if you click "Accept All". Microsoft Clarity and Hotjar only load after you click "Accept All". If you choose "Essential Only", none of these cookies are set.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">In the Collabor8 app</h2>
            <p>In the app, we use Google Firebase: Firebase Analytics to understand how the app is used, including approximate location, and Firebase Cloud Messaging for push notifications if you allow them. The app does not use your device's advertising ID.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Managing Cookies</h2>
            <p>You can manage your cookie preferences through the cookie consent banner that appears when you first visit our site. You can also manage cookies through your browser settings. Note that disabling essential cookies may prevent the app from functioning properly.</p>
            <p className="mt-2">To opt out of Hotjar tracking specifically, visit <a href="https://www.hotjar.com/legal/policies/do-not-track/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Hotjar's opt-out page</a>. For Microsoft Clarity, see the <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Microsoft Privacy Statement</a>.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
            <p>For questions about our use of cookies, contact us at <span className="text-foreground font-medium">privacy@collaborate8.com</span>.</p>
          </section>
        </div>
      </div>
    </div>
    </>
  );
};

export default CookiePolicy;
