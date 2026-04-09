import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import GuideLayout from "@/components/guide/GuideLayout";

const articles = [
  {
    num: "01",
    time: "4 min read",
    title: "What is child maintenance?",
    desc: "The basics explained clearly - what it covers, who it applies to, and why it exists.",
    img: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=700&q=80&auto=format&fit=crop&crop=center",
    alt: "Parent and child at home together",
    to: "/resources/child-maintenance-guide/what-is-child-maintenance",
    span: true,
  },
  {
    num: "02",
    time: "5 min read",
    title: "Who pays, and how much?",
    desc: "Three simple ways to work out a fair amount - including the standard UK formula.",
    img: "https://images.unsplash.com/photo-1554224155-8d04421f81f0?w=700&q=80&auto=format&fit=crop&crop=center",
    alt: "Calculator and financial paperwork",
    to: "/resources/child-maintenance-guide/who-pays",
  },
  {
    num: "03",
    time: "5 min read",
    title: "How to set up child maintenance payments",
    desc: "The simplest way to arrange child maintenance - and keep it running smoothly without a third party.",
    img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=700&q=80&auto=format&fit=crop&crop=center",
    alt: "Organised desk with notebook and phone",
    to: "/resources/child-maintenance-guide/how-to-set-up-payments",
  },
  {
    num: "04",
    time: "4 min read",
    title: "Shared and additional expenses",
    desc: "School trips, clubs, uniforms - how to handle the extras fairly and without friction.",
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=700&q=80&auto=format&fit=crop&crop=center",
    alt: "Child doing homework at a desk",
    to: "/resources/child-maintenance-guide/shared-expenses",
  },
  {
    num: "05",
    time: "5 min read",
    title: "Your rights and legal responsibilities",
    desc: "What the law says, what you're entitled to, and what to do if things go wrong.",
    img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=700&q=80&auto=format&fit=crop&crop=center",
    alt: "Legal document and pen on a desk",
    to: "/resources/child-maintenance-guide/rights-and-responsibilities",
  },
];

const ChildMaintenanceGuide = () => (
  <GuideLayout>
    <Helmet>
      <title>Child Maintenance Made Simple - A Complete Guide | Collabor8</title>
      <meta name="description" content="Everything separated parents need to know about child maintenance in the UK. Five clear guides covering what it is, how to calculate it, how to set up payments, and your legal rights." />
      <meta name="keywords" content="child maintenance guide uk, child support uk, co-parenting finances, child maintenance calculator, family arrangement, child maintenance service, child maintenance login" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide" />
      <meta property="og:title" content="Child Maintenance Made Simple | Collabor8" />
      <meta property="og:description" content="A friendly, practical guide to child maintenance in the UK - your responsibilities, your options, and how to manage everything in one place." />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://images.unsplash.com/photo-1591019479261-1a103585c559?w=1200&q=80" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "headline": "Child Maintenance Made Simple",
        "description": "A complete guide to child maintenance in the UK for separated parents",
        "publisher": { "@type": "Organization", "name": "Collabor8", "url": "https://collabor8.lovable.app" },
        "hasPart": articles.map(a => ({
          "@type": "Article",
          "headline": a.title,
          "url": `https://collabor8.lovable.app${a.to}`
        }))
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "What is child maintenance?", "acceptedAnswer": { "@type": "Answer", "text": "Child maintenance is money that one parent pays to the other to help cover the everyday costs of raising their child - food, clothing, housing, and general living expenses. Both parents are legally responsible under the Child Support Act 1991." }},
          { "@type": "Question", "name": "How is child maintenance calculated in the UK?", "acceptedAnswer": { "@type": "Answer", "text": "The standard formula is based on the paying parent's gross weekly income: 12% for 1 child, 16% for 2 children, and 19% for 3 or more. This can be adjusted for overnight stays and other children." }},
          { "@type": "Question", "name": "Do I need to use the Child Maintenance Service?", "acceptedAnswer": { "@type": "Answer", "text": "No. Most parents handle child maintenance privately in a family-based arrangement. Collabor8 lets you manage payments, track expenses, and keep records without any government involvement." }},
          { "@type": "Question", "name": "Who pays child maintenance?", "acceptedAnswer": { "@type": "Answer", "text": "Usually the parent who spends less time with the child makes payments to the parent who provides day-to-day care." }}
        ]
      })}</script>
    </Helmet>

    <header className="relative overflow-hidden bg-[#134840] pb-0 pt-[5.5rem] text-center text-white">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 65% 0%, rgba(45,138,122,0.45) 0%, transparent 65%)" }} />
      <div className="relative z-10 mx-auto max-w-[680px] px-8">
        <span className="mb-6 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/80">
          Complete guide &middot; UK parents
        </span>
        <h1 className="mb-5 text-[clamp(2.6rem,6vw,4.2rem)] font-light leading-[1.12] tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
          Child maintenance<br /><em className="text-[#7dd3c8]">made simple</em>
        </h1>
        <p className="mx-auto mb-12 max-w-[500px] text-lg font-light leading-relaxed text-white/65">
          Everything you need to know - what it is, how to calculate it, how to set it up, and what your rights are.
        </p>
      </div>
      <div className="mx-auto max-w-[860px] overflow-hidden rounded-t-[18px]">
        <img
          src="https://images.unsplash.com/photo-1591019479261-1a103585c559?w=1400&q=80&auto=format&fit=crop&crop=center"
          alt="Parent spending time with child"
          className="block h-[360px] w-full object-cover"
          style={{ objectPosition: "center 35%" }}
          loading="eager"
        />
      </div>
    </header>

    <div className="bg-[#FDFCFA] px-8 pt-16 text-center">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#1E6B5E]">Five articles in this guide</p>
      <h2 className="mb-3 text-[clamp(1.6rem,3.5vw,2.2rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>
        Everything separated parents need to know
      </h2>
      <p className="mx-auto max-w-[560px] text-base font-light text-[#6B6B64]">
        From the basics to the legal details - clear, practical, and jargon-free.
      </p>
    </div>

    <section className="bg-[#FDFCFA] px-8 pb-20 pt-10" aria-label="Guide articles">
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-5 md:grid-cols-3">
        {articles.map((a, i) => (
          <Link
            key={a.num}
            to={a.to}
            className={`group flex flex-col overflow-hidden rounded-2xl border border-[#E4E2DA] bg-white no-underline transition-all hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(30,107,94,0.12)] ${i === 0 ? "md:col-span-2" : ""}`}
          >
            <img
              src={a.img}
              alt={a.alt}
              className={`block w-full object-cover ${i === 0 ? "h-[260px]" : "h-[200px]"}`}
              loading={i < 2 ? "eager" : "lazy"}
            />
            <div className="flex flex-1 flex-col p-5 pb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-full bg-[#1E6B5E] px-2.5 py-0.5 text-[0.72rem] font-medium tracking-wider text-white">{a.num}</span>
                <span className="text-[0.78rem] text-[#AEADA5]">{a.time}</span>
              </div>
              <h3 className="mb-2 text-lg font-normal leading-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>{a.title}</h3>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-[#6B6B64]">{a.desc}</p>
              <span className="text-sm font-medium text-[#1E6B5E] transition-colors group-hover:text-[#134840]">Read article &rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  </GuideLayout>
);

export default ChildMaintenanceGuide;
