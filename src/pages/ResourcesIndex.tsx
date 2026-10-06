import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import GuideLayout from "@/components/guide/GuideLayout";
import QueryRedirect from "@/components/QueryRedirect";
import { useAuth } from "@/hooks/useAuth";

const TITLE = "Child Maintenance Resources for UK Parents | Collabor8";
const DESC = "Free guides for separated parents in the UK: what child maintenance covers, written agreements, how long it lasts, fair amounts and calm money talks.";
const URL = "https://collaborate8.com/resources";

const cards = [
  { title: "Child maintenance guide", to: "/resources/child-maintenance-guide", desc: "Five short articles on what child maintenance is, who pays, setting up payments, shared expenses and your rights." },
  { title: "Financial co-parenting tips", to: "/resources/financial-coparenting-tips", desc: "Practical tips for managing money with your child's other parent." },
  { title: "What does child maintenance cover?", to: "/resources/what-does-child-maintenance-cover", desc: "What child maintenance is for, and simple ways to split extras like uniform, trips and clubs." },
  { title: "How to write a child maintenance agreement", to: "/resources/child-maintenance-agreement", desc: "What to include in a family-based arrangement, and whether it's legally binding." },
  { title: "How long do you pay child maintenance?", to: "/resources/how-long-do-you-pay-child-maintenance", desc: "When child maintenance usually stops, and what happens when circumstances change." },
  { title: "Finances after separation", to: "/resources/finances-after-separation", desc: "A simple checklist for getting your money sorted after you separate." },
  { title: "Is my child maintenance fair?", to: "/resources/is-my-child-maintenance-fair", desc: "How the standard figure is worked out, and what to do if you think it's wrong." },
  { title: "Parental conflict and children", to: "/resources/parental-conflict-and-children", desc: "What research says about frequent, unresolved conflict, and how to keep money talks calm." },
  { title: "Talking to your ex about money", to: "/resources/talking-to-your-ex-about-money", desc: "A step-by-step plan for talking about child maintenance, with example phrases." },
];

const crumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://collaborate8.com/" },
    { "@type": "ListItem", position: 2, name: "Resources", item: URL },
  ],
};

const ResourcesIndex = () => {
  const { user, loading } = useAuth();
  if (!loading && user) return <QueryRedirect to="/dashboard?tab=resources" />;

  return (
    <GuideLayout crumbs={[{ label: "Home", to: "/" }, { label: "Resources" }]}>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <script type="application/ld+json">{JSON.stringify(crumbLd)}</script>
      </Helmet>
      <main className="mx-auto max-w-[740px] px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <h1 className="mb-4 text-[clamp(2rem,6vw,3.2rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Resources for separated parents
        </h1>
        <p className="mb-8 text-[1.1rem] leading-[1.7] text-[#3D3D38]">
          Free, plain-English guides to child maintenance and co-parenting finances in the UK.
        </p>
        <ul className="space-y-3">
          {cards.map((c) => (
            <li key={c.to}>
              <Link to={c.to} className="flex items-center gap-4 rounded-2xl border border-[#E4E2DA] bg-card p-5 transition-colors hover:border-primary">
                <div className="flex-1">
                  <h2 className="mb-1 text-[1.15rem] font-normal leading-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{c.title}</h2>
                  <p className="text-[0.95rem] leading-[1.6] text-[#3D3D38]">{c.desc}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </GuideLayout>
  );
};

export default ResourcesIndex;
