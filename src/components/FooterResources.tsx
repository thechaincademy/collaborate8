import { Link } from "react-router-dom";

const links = [
  { label: "All resources", to: "/resources" },
  { label: "What it covers", to: "/resources/what-does-child-maintenance-cover" },
  { label: "Writing an agreement", to: "/resources/child-maintenance-agreement" },
  { label: "How long you pay", to: "/resources/how-long-do-you-pay-child-maintenance" },
  { label: "After separation", to: "/resources/finances-after-separation" },
  { label: "Is it fair?", to: "/resources/is-my-child-maintenance-fair" },
  { label: "Parental conflict", to: "/resources/parental-conflict-and-children" },
  { label: "Talking about money", to: "/resources/talking-to-your-ex-about-money" },
];

const FooterResources = ({ onDark = false }: { onDark?: boolean }) => (
  <nav aria-label="Resources" className="mx-auto mt-6 max-w-5xl px-6 text-left text-xs leading-relaxed">
    <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${onDark ? "text-background/80" : "text-foreground"}`}>Resources</h2>
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 md:grid-cols-4">
      {links.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className={`no-underline ${onDark ? "text-background/70 hover:text-background" : "text-muted-foreground hover:text-foreground"}`}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

export default FooterResources;
