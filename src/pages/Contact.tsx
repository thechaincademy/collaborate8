import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import TopBanner from "@/components/TopBanner";
import FooterResources from "@/components/FooterResources";
import FooterContact from "@/components/FooterContact";

const Contact = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Contact Collabor8</title>
      <meta name="description" content="Contact Collabor8 by phone on 020 3488 1055 or by email at jade@collaborate8.com." />
      <link rel="canonical" href="https://collaborate8.com/contact" />
      <meta property="og:title" content="Contact Collabor8" />
      <meta property="og:description" content="Contact Collabor8 by phone on 020 3488 1055 or by email at jade@collaborate8.com." />
      <meta property="og:url" content="https://collaborate8.com/contact" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Contact Collabor8" />
      <meta name="twitter:description" content="Contact Collabor8 by phone on 020 3488 1055 or by email at jade@collaborate8.com." />
    </Helmet>
    <TopBanner />

    <main className="bg-background px-6 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 inline-block rounded-full border border-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
          Get in touch
        </div>
        <h1 className="text-5xl font-extrabold italic leading-[0.9] tracking-tighter text-foreground md:text-6xl">
          Contact
          <br />
          <span className="not-italic text-primary">Collabor8.</span>
        </h1>
        <div className="mt-6 flex items-center gap-4">
          <div className="h-px w-8 shrink-0 bg-primary" />
          <p className="text-lg font-medium leading-tight text-foreground/90 md:text-xl">
            We are happy to help.
          </p>
        </div>

        <div className="mt-10 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          <p>
            Phone:{" "}
            <a href="tel:+442034881055" className="font-medium text-foreground underline hover:text-primary">
              020 3488 1055
            </a>
          </p>
          <p>
            Email:{" "}
            <a href="mailto:jade@collaborate8.com" className="font-medium text-foreground underline hover:text-primary">
              jade@collaborate8.com
            </a>
          </p>
          <p>
            Looking for answers straight away? Try the{" "}
            <Link to="/faq" className="font-medium text-foreground underline hover:text-primary">
              FAQ
            </Link>{" "}
            or our{" "}
            <Link to="/resources" className="font-medium text-foreground underline hover:text-primary">
              resources
            </Link>
            .
          </p>
        </div>
      </div>
    </main>

    <footer className="border-t border-border bg-background py-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
              <span className="text-xs font-bold text-background">C8</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Collabor8</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/child-maintenance-calculator" className="hover:text-foreground">
              Child Maintenance Calculator
            </Link>
            <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">
              Maintenance Guide
            </Link>
            <Link to="/faq" className="hover:text-foreground">
              FAQ
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span>© {new Date().getFullYear()} Collabor8</span>
          </div>
        </div>
        <FooterResources />
        <FooterContact />
      </div>
    </footer>
  </div>
);

export default Contact;
