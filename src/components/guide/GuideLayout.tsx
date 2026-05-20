import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface GuideLayoutProps {
  children: React.ReactNode;
  breadcrumb?: string;
}

const GuideLayout = ({ children, breadcrumb }: GuideLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-[#1A1A18]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <nav className="sticky top-0 z-50 flex h-[62px] items-center justify-between border-b border-[#E4E2DA] bg-background px-8 backdrop-blur-[14px]">
        <Link to="/" className="text-xl font-semibold tracking-tight text-[#1E6B5E]" style={{ fontFamily: "'Georgia', serif" }}>
          Collabor8
        </Link>
        <Link to="/signup" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary">
          Get started free
        </Link>
      </nav>

      {breadcrumb && (
        <div className="mx-auto max-w-[800px] px-8 pt-5 text-sm text-[#AEADA5]">
          <Link to="/resources/child-maintenance-guide" className="text-[#AEADA5] no-underline hover:text-[#1E6B5E]">
            Child Maintenance Guide
          </Link>
          <span className="mx-1.5 opacity-50">&rsaquo;</span>
          <span>{breadcrumb}</span>
        </div>
      )}

      {children}

      <section className="bg-primary px-8 py-[4.5rem] text-center text-white">
        <h2 className="mx-auto mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-light leading-tight tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
          Ready to make things simpler?
        </h2>
        <p className="mx-auto mb-8 max-w-[480px] text-[1.05rem] font-light text-white/70">
          Join thousands of co-parents managing maintenance clearly, fairly, and without the stress.
        </p>
        <Link to="/signup" className="inline-block rounded-full bg-background px-9 py-3.5 text-[0.95rem] font-medium text-[#134840] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          Get started with Collabor8 - it's free
        </Link>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
          {["Track payments automatically", "Log shared expenses with receipts", "Earn rewards for staying on top", "No fees. No middlemen."].map((f) => (
            <span key={f} className="flex items-center gap-2 text-sm text-white/65">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {f}
            </span>
          ))}
        </div>
      </section>

      <footer className="bg-foreground px-8 py-8 text-center text-[0.82rem] leading-8 text-white/45">
        <p>
          <Link to="/" className="text-white/55 no-underline hover:text-white">Collabor8</Link>
          {" \u00B7 "}
          <Link to="/privacy" className="text-white/55 no-underline hover:text-white">Privacy</Link>
          {" \u00B7 "}
          <Link to="/cookies" className="text-white/55 no-underline hover:text-white">Terms</Link>
        </p>
        <p className="mt-1 text-xs">This guide is for informational purposes only and does not constitute legal advice. &copy; 2025 Collabor8.</p>
      </footer>
    </div>
  );
};

export default GuideLayout;
