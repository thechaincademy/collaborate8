import { Link } from "react-router-dom";

interface NavLink {
  label: string;
  title: string;
  to: string;
}

interface ArticleNavProps {
  prev?: NavLink;
  next?: NavLink;
}

const ArticleNav = ({ prev, next }: ArticleNavProps) => (
  <nav className="mt-14 flex flex-wrap justify-between gap-4 border-t border-[#E4E2DA] pt-8" aria-label="Article navigation">
    {prev && (
      <Link to={prev.to} className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-lg border border-[#E4E2DA] bg-background p-4 no-underline transition-all hover:border-[#1E6B5E] hover:shadow-[0_4px_16px_rgba(30,107,94,0.08)]">
        <span className="text-xs font-medium uppercase tracking-wider text-[#AEADA5]">{prev.label}</span>
        <span className="text-base text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>{prev.title}</span>
      </Link>
    )}
    {next && (
      <Link to={next.to} className="flex min-w-[200px] flex-1 flex-col items-end gap-1 rounded-lg border border-[#E4E2DA] bg-background p-4 text-right no-underline transition-all hover:border-[#1E6B5E] hover:shadow-[0_4px_16px_rgba(30,107,94,0.08)]">
        <span className="text-xs font-medium uppercase tracking-wider text-[#AEADA5]">{next.label}</span>
        <span className="text-base text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>{next.title}</span>
      </Link>
    )}
  </nav>
);

export default ArticleNav;
