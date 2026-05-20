import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";

const orgs = [
  {
    name: "MoneyHelper",
    tag: "Free guidance",
    desc: "MoneyHelper is a free, government-backed service offering clear and impartial guidance on money. If you need help making sense of your budget, understanding your pension, or getting a clearer picture of your finances after separation, it's a solid starting point.",
    helps: [
      "Free and impartial, no products to sell you",
      "Budgeting tools and practical money guides",
      "Guidance on benefits, pensions, and financial planning",
      "Available online, by phone, and via webchat",
    ],
    href: "https://www.moneyhelper.org.uk",
    cta: "Visit MoneyHelper",
  },
  {
    name: "Turn2us",
    tag: "Benefits & grants",
    desc: "Turn2us helps people find financial support they didn't know they were entitled to. After separation, your circumstances may have changed in ways that open up new benefits or grants. Their free tools make it easy to check what you might be eligible for, no sign-up needed.",
    helps: [
      "Free benefits calculator, takes around 10 minutes",
      "Grants search covering thousands of charitable funds",
      "Clear guidance on support available after life changes",
      "No sign-up required to check eligibility",
    ],
    href: "https://www.turn2us.org.uk",
    cta: "Visit Turn2us",
  },
];

const SupportAndGuidance = () => (
  <div className="min-h-screen bg-gradient-to-b from-background via-background to-background text-[#1A1A18] bg-background" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, lineHeight: 1.75 }}>
    <Helmet>
      <title>Support & Financial Guidance After Separation | Collabor8</title>
      <meta name="description" content="Free support for separated parents in the UK. Find financial guidance and benefits eligibility checks from organisations that can help, plus tools to manage child maintenance simply." />
      <meta name="keywords" content="financial support after separation uk, benefits for separated parents, money help after divorce uk, child maintenance calculator, MoneyHelper, Turn2us" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/support-and-guidance" />
      <meta property="og:title" content="Support & Financial Guidance After Separation | Collabor8" />
      <meta property="og:description" content="Find financial guidance and benefits support after separation, plus Collabor8's tools to help you manage child maintenance simply." />
      <meta property="og:type" content="website" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Support & Financial Guidance After Separation",
        "description": "A signposting page for separated parents, linking to financial guidance and benefits support.",
        "publisher": { "@type": "Organization", "name": "Collabor8", "url": "https://collabor8.lovable.app" }
      })}</script>
    </Helmet>

    <TopBanner />

    <header className="mx-auto max-w-[680px] px-8 pb-16 pt-20 text-center bg-background">
      <span className="mb-5 inline-block text-[0.78rem] font-medium uppercase tracking-[0.12em] text-[#1A1A18]">Resources for separated parents</span>
      <h1 className="mb-5 text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Support &amp; financial guidance<br /><em className="italic text-[#1A1A18]">after separation</em>
      </h1>
      <p className="mx-auto mb-6 max-w-[560px] text-[1.05rem] font-light leading-[1.8] text-[#6B6B64]">
        Financial situations often change significantly after separation. Many parents aren't aware of all the support and benefits they may be entitled to. This page points you towards free resources that can help, and to Collabor8's own tools for managing child maintenance.
      </p>
      <span className="inline-block max-w-[520px] rounded-[10px] bg-secondary px-5 py-[0.65rem] text-[0.9rem] italic leading-[1.6] text-[#6B6B64]">
        You may wish to explore whether you are eligible for additional financial support or benefits you haven't yet claimed.
      </span>
    </header>

    <section className="mx-auto max-w-[720px] px-8 pb-12 pt-4" aria-label="Support and guidance resources">
      <span className="mb-8 block text-[0.78rem] font-medium uppercase tracking-[0.12em] text-[#AEADA5]">Free resources</span>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-foreground px-10 py-9 text-white max-sm:flex-col max-sm:items-start max-sm:px-6 max-sm:py-6">
        <div>
          <h2 className="mb-2 text-[1.3rem] font-normal leading-[1.25] tracking-tight text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Work out child maintenance in minutes</h2>
          <p className="max-w-[400px] text-[0.93rem] leading-[1.65] text-white/70">Collabor8's built-in calculator uses the standard UK formula to give you a fair, instant figure, then helps you set up and manage payments straight away, all in one place.</p>
        </div>
        <Link to="/child-maintenance-calculator" className="inline-block flex-shrink-0 whitespace-nowrap rounded-full bg-background px-[1.6rem] py-[0.7rem] text-[0.9rem] font-medium text-[#1A1A18] no-underline transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]">
          Use the calculator &rarr;
        </Link>
      </div>

      {orgs.map((o) => (
        <div key={o.name} className="mb-5 rounded-2xl border border-[#E4E2DA] bg-background px-9 py-8 transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] max-sm:px-6 max-sm:py-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <h2 className="text-[1.3rem] font-normal leading-[1.2] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{o.name}</h2>
            <span className="mt-[3px] flex-shrink-0 self-start whitespace-nowrap rounded-full bg-secondary px-[0.7rem] py-1 text-[0.73rem] font-medium uppercase tracking-[0.06em] text-[#1A1A18]">{o.tag}</span>
          </div>
          <p className="mb-[1.1rem] text-[0.98rem] leading-[1.75] text-[#3D3D38]">{o.desc}</p>
          <ul className="mb-6 flex list-none flex-col gap-[0.35rem] p-0">
            {o.helps.map((h) => (
              <li key={h} className="relative pl-[1.3rem] text-[0.9rem] leading-[1.5] text-[#6B6B64]">
                <span className="absolute left-0 top-[0.55em] h-[5px] w-[5px] rounded-full bg-foreground" />
                {h}
              </li>
            ))}
          </ul>
          <a href={o.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[0.4rem] rounded-full border border-[#1A1A18] px-[1.1rem] py-2 text-[0.88rem] font-medium text-[#1A1A18] no-underline transition-all hover:bg-foreground hover:text-white">
            {o.cta} &#8599;
          </a>
        </div>
      ))}
    </section>

    <div className="mx-auto max-w-[720px] px-8 pb-8">
      <p className="border-t border-[#E4E2DA] pt-6 text-[0.83rem] italic leading-[1.65] text-[#AEADA5]">
        This page is for signposting purposes only. Collabor8 is not a financial adviser or legal service. The organisations listed above are independent and not affiliated with Collabor8. Always seek advice directly from qualified professionals for your specific situation.
      </p>
    </div>

    <div className="border-t border-[#E4E2DA] bg-background px-8 py-12">
      <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-8">
        <div>
          <h2 className="mb-[0.4rem] text-[1.25rem] font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Managing shared finances with Collabor8</h2>
          <p className="max-w-[440px] text-[0.92rem] leading-[1.65] text-[#6B6B64]">Collabor8 helps separated parents track payments, log shared expenses, and stay on top of financial responsibilities together, simply, clearly, and without the stress.</p>
        </div>
        <Link to="/signup" className="inline-block flex-shrink-0 whitespace-nowrap rounded-full bg-foreground px-7 py-3 text-[0.9rem] font-medium text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-foreground">
          Try Collabor8 free
        </Link>
      </div>
    </div>

    <footer className="bg-foreground px-8 py-8 text-center text-[0.82rem] leading-[2] text-white/50">
      <p>
        <Link to="/" className="text-white/55 no-underline hover:text-white">Collabor8</Link>
        {" \u00B7 "}
        <Link to="/resources/child-maintenance-guide" className="text-white/55 no-underline hover:text-white">Child Maintenance Guide</Link>
        {" \u00B7 "}
        <Link to="/privacy" className="text-white/55 no-underline hover:text-white">Privacy</Link>
        {" \u00B7 "}
        <Link to="/cookies" className="text-white/55 no-underline hover:text-white">Terms</Link>
      </p>
      <p className="mt-1 text-xs">This page is for informational purposes only. &copy; 2025 Collabor8.</p>
    </footer>
  </div>
);

export default SupportAndGuidance;
