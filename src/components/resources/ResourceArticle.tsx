import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import GuideLayout from "@/components/guide/GuideLayout";

const SITE = "https://collaborate8.com";
const serif = { fontFamily: "'Fraunces', Georgia, serif" };

/* Guide-style content helpers */
export const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-[1.1rem] text-base leading-[1.75] text-[#3D3D38]">{children}</p>
);

export const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-4 mt-10 text-[clamp(1.5rem,4vw,2rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={serif}>
    {children}
  </h2>
);

export const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 mt-9 text-[1.3rem] font-normal tracking-tight text-[#1A1A18]" style={serif}>
    {children}
  </h3>
);

export const BList = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="my-2 mb-[1.2rem] list-none p-0">
    {items.map((it, i) => (
      <li key={i} className="relative border-b border-[#E4E2DA] py-[0.45rem] pl-6 text-base leading-[1.7] text-[#3D3D38] last:border-b-0">
        <span className="absolute left-0 top-[1.05rem] h-[6px] w-[6px] rounded-full bg-foreground" />
        {it}
      </li>
    ))}
  </ul>
);

export const OList = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="my-2 mb-[1.2rem] list-none p-0">
    {items.map((it, i) => (
      <li key={i} className="relative border-b border-[#E4E2DA] py-[0.45rem] pl-8 text-base leading-[1.7] text-[#3D3D38] last:border-b-0">
        <span className="absolute left-0 top-[0.45rem] font-semibold text-[#1A1A18]">{i + 1}.</span>
        {it}
      </li>
    ))}
  </ol>
);

export const Callout = ({ children }: { children: React.ReactNode }) => (
  <div className="my-7 rounded-r-[10px] border-l-[3px] border-[#1A1A18] bg-secondary px-5 py-4 text-[0.95rem] italic leading-[1.65] text-[#1A1A18]">
    {children}
  </div>
);

export const Table = ({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) => (
  <div className="my-6 overflow-x-auto rounded-xl border border-[#E4E2DA]">
    <table className="w-full min-w-[480px] border-collapse text-left text-[0.95rem] text-[#3D3D38]">
      <thead className="bg-secondary text-[#1A1A18]">
        <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-[#E4E2DA]">
            {r.map((c, j) => <td key={j} className="px-4 py-3 align-top">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const linkCls = "font-medium text-[#1A1A18] underline decoration-primary decoration-2 underline-offset-2 hover:text-primary";

export const L = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className={linkCls}>{children}</Link>
);

export const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={linkCls}>{children}</a>
);

export interface FaqItem { q: string; a: string }
export interface SourceItem { label: string; url: string }

interface ResourceArticleProps {
  route: string; // e.g. "/resources/what-does-child-maintenance-cover"
  seoTitle: string;
  description: string;
  h1: string;
  crumbLabel: string;
  lead: React.ReactNode;
  children: React.ReactNode;
  faq: FaqItem[];
  cta: {
    heading: string;
    text: React.ReactNode;
    button: { label: string; to: string };
    link?: { label: string; to: string };
  };
  ctaSmallPrint?: React.ReactNode;
  smallPrint?: React.ReactNode;
  sources: SourceItem[];
}

const ResourceArticle = ({
  route, seoTitle, description, h1, crumbLabel, lead, children, faq, cta, ctaSmallPrint, smallPrint, sources,
}: ResourceArticleProps) => {
  const url = `${SITE}${route}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const crumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Resources", item: `${SITE}/resources` },
      { "@type": "ListItem", position: 3, name: crumbLabel, item: url },
    ],
  };

  return (
    <GuideLayout crumbs={[{ label: "Home", to: "/" }, { label: "Resources", to: "/resources" }, { label: crumbLabel }]}>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        <script type="application/ld+json">{JSON.stringify(crumbLd)}</script>
      </Helmet>

      <article className="mx-auto max-w-[740px] px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <h1 className="mb-5 text-[clamp(2rem,6vw,3.2rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={serif}>
          {h1}
        </h1>
        <p className="mb-8 text-[1.1rem] leading-[1.7] text-[#3D3D38]">{lead}</p>

        {children}

        <H2>Frequently asked questions</H2>
        <div className="space-y-5">
          {faq.map((f) => (
            <div key={f.q}>
              <H3>{f.q}</H3>
              <P>{f.a}</P>
            </div>
          ))}
        </div>

        <aside className="mt-12 rounded-2xl border border-primary/40 bg-secondary px-5 py-6 sm:px-7">
          <p className="mb-2 text-[1.35rem] font-normal leading-tight text-[#1A1A18]" style={serif}>{cta.heading}</p>
          <p className="mb-5 text-base leading-[1.7] text-[#3D3D38]">{cta.text}</p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link to={cta.button.to} className="inline-block rounded-full bg-primary px-6 py-3 text-[0.95rem] font-medium text-primary-foreground transition-all hover:-translate-y-0.5">
              {cta.button.label}
            </Link>
            {cta.link && <L to={cta.link.to}>{cta.link.label}</L>}
          </div>
        </aside>
        {ctaSmallPrint && <p className="mt-3 text-xs leading-[1.6] text-[#6B6B64]">{ctaSmallPrint}</p>}

        {smallPrint && <p className="mt-8 text-sm leading-[1.6] text-[#6B6B64]">{smallPrint}</p>}

        <section className="mt-8">
          <h2 className="mb-3 text-[1.2rem] font-normal text-[#1A1A18]" style={serif}>Sources</h2>
          <ul className="space-y-2 text-sm leading-[1.6] text-[#3D3D38]">
            {sources.map((s) => (
              <li key={s.url} className="break-words">
                {s.label}: <A href={s.url}>{s.url}</A>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </GuideLayout>
  );
};

export default ResourceArticle;
