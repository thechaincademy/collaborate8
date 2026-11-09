import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import FooterResources from "@/components/FooterResources";
import FooterContact from "@/components/FooterContact";
import { useAppCtaHref } from "@/hooks/useAppCta";

export interface Crumb {
  label: string;
  to?: string;
}

interface GuideLayoutProps {
  children: React.ReactNode;
  breadcrumb?: string;
  crumbs?: Crumb[];
}

const GuideLayout = ({ children, breadcrumb, crumbs }: GuideLayoutProps) => {
  const navigate = useNavigate();
  const ctaHref = useAppCtaHref("/signup");

  return (
    <div className="min-h-screen bg-background text-[#1A1A18]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <nav aria-label="Main" className="sticky top-0 z-50 flex h-[62px] items-center justify-between border-b border-[#E4E2DA] bg-background px-8 backdrop-blur-[14px]">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-primary-ink">Skip to main content</a>
        <Link to="/" className="text-xl font-semibold tracking-tight text-[#1E6B5E]" style={{ fontFamily: "'Georgia', serif" }}>
          Collabor8
        </Link>
        <Link to={ctaHref} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/90">
          Get started free
        </Link>
      </nav>

      {breadcrumb && (
        <div className="mx-auto max-w-[800px] px-8 pt-5 text-sm text-[#6B6B64]">
          <Link to="/resources/child-maintenance-guide" className="text-[#6B6B64] no-underline hover:text-[#1E6B5E]">
            Child Maintenance Guide
          </Link>
          <span className="mx-1.5 opacity-50">&rsaquo;</span>
          <span>{breadcrumb}</span>
        </div>
      )}

      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[800px] px-5 pt-5 text-sm text-[#6B6B64] sm:px-8">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`}>
                {i > 0 && <span className="mx-1.5 opacity-50">&rsaquo;</span>}
                {!last && c.to ? (
                  <Link to={c.to} className="text-[#6B6B64] no-underline hover:text-[#1E6B5E]">{c.label}</Link>
                ) : (
                  <span aria-current={last ? "page" : undefined}>{c.label}</span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>

      <section className="bg-primary px-8 py-[4.5rem] text-center text-foreground">
        <h2 className="mx-auto mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-light leading-tight tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
          Ready to make things simpler?
        </h2>
        <p className="mx-auto mb-8 max-w-[480px] text-[1.05rem] font-light text-foreground/85">
          Join thousands of co-parents managing maintenance clearly, fairly, and without the stress.
        </p>
        <Link to={ctaHref} className="inline-block rounded-full bg-background px-9 py-3.5 text-[0.95rem] font-medium text-[#134840] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          Get started with Collabor8 - it's free
        </Link>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
          {["Track payments automatically", "Log shared expenses with receipts", "Earn rewards for staying on top", "Free to use. £2.99 per transaction."].map((f) => (
            <span key={f} className="flex items-center gap-2 text-sm text-foreground/85">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              {f}
            </span>
          ))}
        </div>
      </section>

      <footer className="bg-foreground px-8 py-8 text-center text-[0.82rem] leading-8 text-white/60">
        <p>
          <Link to="/" className="text-white/60 no-underline hover:text-white">Collabor8</Link>
          {" \u00B7 "}
          <Link to="/privacy" className="text-white/60 no-underline hover:text-white">Privacy</Link>
        </p>
        <p className="mt-1 text-xs">This guide is for informational purposes only and does not constitute legal advice. &copy; {new Date().getFullYear()} Collabor8.</p>
        <FooterResources onDark />
        <FooterContact onDark />
      </footer>
    </div>
  );
};

export default GuideLayout;
