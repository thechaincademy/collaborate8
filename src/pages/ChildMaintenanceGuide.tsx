import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";

const articles = [
  {
    num: "01",
    id: "article-1",
    title: "What is child maintenance?",
    desc: "The basics explained clearly, what it covers, who it applies to, and why it matters.",
    img: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1200&q=80&auto=format&fit=crop",
    alt: "A parent and child at home together",
    keywords: "child maintenance definition uk, what is child maintenance, child support act 1991",
  },
  {
    num: "02",
    id: "article-2",
    title: "Who pays, and how much?",
    desc: "Three simple ways to work out a fair amount, including the standard UK formula.",
    img: "/guide-calc.jpg",
    alt: "Working out finances on a calculator",
    keywords: "who pays child maintenance uk, paying parent receiving parent, child maintenance calculator uk",
  },
  {
    num: "03",
    id: "article-3",
    title: "How to set up payments",
    desc: "The simplest way to arrange child maintenance, and keep it running smoothly.",
    img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop",
    alt: "Organised desk with phone and notebook",
    keywords: "how to arrange child maintenance payments, family arrangement child maintenance, child maintenance service",
  },
  {
    num: "04",
    id: "article-4",
    title: "Shared and additional expenses",
    desc: "School trips, clubs, uniforms, how to handle the extras fairly and without friction.",
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop",
    alt: "Child doing homework at a desk",
    keywords: "shared expenses co-parenting uk, extra child costs beyond maintenance, school trips child maintenance",
  },
  {
    num: "05",
    id: "article-5",
    title: "Your rights and responsibilities",
    desc: "What the law says, what you're entitled to, and what happens if things go wrong.",
    img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80&auto=format&fit=crop",
    alt: "Legal document and pen",
    keywords: "child maintenance rights uk, legal responsibility child support, child support act 1991",
  },
];

const Callout = ({ children }: { children: React.ReactNode }) => (
  <div className="my-7 rounded-r-[10px] border-l-[3px] border-[#1A1A18] bg-[#F0E4D6] px-5 py-4 text-[0.95rem] italic leading-[1.65] text-[#1A1A18]">
    {children}
  </div>
);

const ArticleH3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 mt-9 text-[1.3rem] font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-[1.1rem] text-base leading-[1.75] text-[#3D3D38]">{children}</p>
);

const BList = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="my-2 mb-[1.2rem] list-none p-0">
    {items.map((it, i) => (
      <li key={i} className="relative border-b border-[#E4E2DA] py-[0.45rem] pl-6 text-base text-[#3D3D38] last:border-b-0">
        <span className="absolute left-0 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-[#1A1A18]" />
        {it}
      </li>
    ))}
  </ul>
);

const ChildMaintenanceGuide = () => {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = refs.current.findIndex((r) => r === entry.target);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { threshold: 0.3 }
    );
    refs.current.forEach((r) => r && observer.observe(r));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (i: number) => {
    refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2DFCF] via-[#F7E9D8] to-[#FBF1E4] text-[#1A1A18] bg-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, lineHeight: 1.75 }}>
      <Helmet>
        <title>Child Maintenance Made Simple - Complete UK Guide | Collabor8</title>
        <meta name="description" content="Everything separated parents need to know about child maintenance in the UK - what it is, who pays, how to calculate it, and how to manage it simply with Collabor8." />
        <meta name="keywords" content="child maintenance, child support UK, child maintenance calculator, child maintenance service, CMS, paying parent, receiving parent, co-parenting, family arrangement, child maintenance login" />
        <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide" />
        <meta property="og:title" content="Child Maintenance Made Simple | Collabor8" />
        <meta property="og:description" content="A friendly, practical guide to child maintenance in the UK - your responsibilities, your options, and how to manage everything in one place." />
        <meta property="og:type" content="article" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1591019479261-1a103585c559?w=1200&q=80" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Child Maintenance Made Simple",
          "description": "A complete guide to child maintenance in the UK for separated parents",
          "publisher": { "@type": "Organization", "name": "Collabor8", "url": "https://collabor8.lovable.app" },
          "hasPart": articles.map(a => ({ "@type": "WebPageElement", "name": a.title, "url": `#${a.id}` }))
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "What is child maintenance?", "acceptedAnswer": { "@type": "Answer", "text": "Child maintenance is money one parent pays to the other to help cover the everyday costs of raising their child - food, clothing, housing, and general living expenses. Both parents are legally responsible under the Child Support Act 1991." }},
            { "@type": "Question", "name": "How is child maintenance calculated in the UK?", "acceptedAnswer": { "@type": "Answer", "text": "The standard formula is based on the paying parent's gross weekly income: 12% for 1 child, 16% for 2 children, and 19% for 3 or more children." }},
            { "@type": "Question", "name": "Do I need to use the Child Maintenance Service?", "acceptedAnswer": { "@type": "Answer", "text": "Not necessarily. Many parents prefer a private family-based arrangement. Collabor8 works with any arrangement, helping you track payments and log expenses." }},
            { "@type": "Question", "name": "Who pays child maintenance?", "acceptedAnswer": { "@type": "Answer", "text": "Usually the parent who spends less time with the child makes payments to the parent who provides day-to-day care." }}
          ]
        })}</script>
      </Helmet>

      <TopBanner />

      {/* SIDE DOTS */}
      <div className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-[10px] md:flex" aria-hidden="true">
        {articles.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`h-2 w-2 rounded-full border-0 p-0 transition-all ${active === i ? "scale-[1.4] bg-[#1A1A18]" : "bg-[#E4E2DA]"}`}
            title={`Article ${i + 1}`}
          />
        ))}
      </div>

      {/* HERO */}
      <header className="relative overflow-hidden px-8 pb-0 pt-20 text-center text-white bg-yellow-500">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 mx-auto max-w-[720px]">
          <span className="mb-6 inline-block rounded-full border border-white/20 bg-white/[0.12] px-[0.9rem] py-[0.35rem] text-xs font-medium uppercase tracking-[0.1em] text-white/85">
            Complete guide &middot; UK parents
          </span>
          <h1 className="mb-5 text-[clamp(2.4rem,6vw,4rem)] font-light leading-[1.15] tracking-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Child maintenance <em className="italic text-[#D9D9D5]">made simple</em>
          </h1>
          <p className="mx-auto mb-10 max-w-[520px] text-[1.1rem] font-light text-white/70">
            Everything you need to know about your responsibilities, your options, and how to manage it all without the stress.
          </p>
        </div>
        <img
          src="/guide-hero.jpg"
          alt="Parent and child spending time together"
          className="mx-auto block h-[320px] w-full max-w-[780px] rounded-t-2xl object-cover"
          style={{ objectPosition: "center 30%" }}
          loading="eager"
        />
      </header>

      {/* INDEX */}
      <section className="border-b border-[#E4E2DA] px-8 py-16 bg-[#f9f5f1]">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#1A1A18]">In this guide</p>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Five things every separated parent should know
          </h2>
        </div>
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <button
              key={a.id}
              onClick={() => scrollTo(i)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#E4E2DA] bg-white text-left transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
            >
              <img src={a.img} alt={a.alt} className="block h-[180px] w-full object-cover" loading={i < 2 ? "eager" : "lazy"} />
              <div className="flex flex-1 flex-col p-[1.25rem] pb-[1.4rem]">
                <p className="mb-[0.4rem] text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#1A1A18]">Article {a.num}</p>
                <h3 className="mb-[0.6rem] text-[1.15rem] font-normal leading-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{a.title}</h3>
                <p className="flex-1 text-[0.88rem] leading-[1.6] text-[#6B6B64]">{a.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[0.85rem] font-medium text-[#1A1A18]">Read article &rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ARTICLES */}
      <main className="mx-auto max-w-[740px] px-8 bg-white">
        {/* Article 1 */}
        <article ref={(el) => (refs.current[0] = el)} id="article-1" className="border-b border-[#E4E2DA] py-20 bg-inherit">
          <header className="mb-10">
            <span className="mb-4 inline-block rounded-full bg-[#F0E4D6] px-3 py-[0.3rem] text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[#1A1A18]">Article 01</span>
            <h2 className="text-[clamp(1.8rem,4vw,2.4rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>What is child maintenance?</h2>
          </header>
          <img src={articles[0].img} alt={articles[0].alt} className="mb-10 block h-[340px] w-full rounded-2xl object-cover" />
          <P>If you've recently separated from your child's other parent, you've probably heard the term 'child maintenance' thrown around. But what does it actually mean, and does it apply to you? Let's break it down, simply and without the jargon.</P>
          <ArticleH3>The short version</ArticleH3>
          <P>Child maintenance is money that one parent pays to the other to help cover the everyday costs of raising their child. Things like food, clothes, school supplies, and a roof over their head. It's not about punishing anyone or keeping score, it's purely about making sure your child has what they need, regardless of what's going on between the adults.</P>
          <ArticleH3>Both parents are responsible</ArticleH3>
          <P>Here's something worth knowing: both parents are legally responsible for financially supporting their child. This is set out in the Child Support Act 1991, and it applies whether you were married, in a long-term relationship, or never lived together at all. The law doesn't take sides. It simply says: your child deserves financial support, and both of you share that responsibility.</P>
          <ArticleH3>What does it actually cover?</ArticleH3>
          <BList items={["Housing and household bills", "Food, clothing, and toiletries", "School supplies and childcare costs", "General day-to-day living expenses"]} />
          <P>It doesn't automatically cover one-off extras like school trips, sports clubs, or dental bills, those are usually agreed separately. (More on that in Article 4.)</P>
          <ArticleH3>Is it the same as child support?</ArticleH3>
          <P>Yes, 'child maintenance' and 'child support' mean the same thing in the UK. You might hear either term, along with 'maintenance payments' or just 'maintenance'. They all refer to the same financial arrangement.</P>
          <ArticleH3>What are your options for arranging maintenance?</ArticleH3>
          <P>Most parents prefer a family-based arrangement, where you agree an amount between yourselves, manage payments directly, and keep everything private. It's the simplest route, and Collabor8 is built for exactly this. No waiting, no fees, and both parents have full visibility of every payment.</P>
          <P>Some families use the Child Maintenance Service (CMS), a government service that can calculate, and in some cases collect, payments on your behalf. If that's the arrangement you're working with, Collabor8 sits alongside it, helping you track what's been paid, log shared expenses, and keep a clear record whatever the source of the payment.</P>
          <Callout><strong className="not-italic font-medium">Collabor8 tip:</strong> Family-based arrangement or CMS, it doesn't matter. Collabor8 works with any arrangement, giving both parents a clear, shared record and removing the day-to-day stress of managing it manually.</Callout>
          <ArticleH3>What if there's already a court order?</ArticleH3>
          <P>If a court has set the maintenance amount, that figure is your starting point. Collabor8 works alongside court orders too, set up the ordered amount as a recurring payment, and the app handles the tracking, reminders, and receipts from there.</P>
        </article>

        {/* Article 2 */}
        <article ref={(el) => (refs.current[1] = el)} id="article-2" className="border-b border-[#E4E2DA] py-20 bg-inherit">
          <header className="mb-10">
            <span className="mb-4 inline-block rounded-full bg-[#F0E4D6] px-3 py-[0.3rem] text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[#1A1A18]">Article 02</span>
            <h2 className="text-[clamp(1.8rem,4vw,2.4rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Who pays, and how much?</h2>
          </header>
          <img src={articles[1].img} alt={articles[1].alt} className="mb-10 block h-[340px] w-full rounded-2xl object-cover" />
          <P>Once you understand what child maintenance is, two questions usually follow quickly: who actually pays? And how do you work out a fair amount? Let's tackle both.</P>
          <ArticleH3>Who pays who?</ArticleH3>
          <P>In most arrangements, the parent who spends less time with the child (the 'paying parent') makes regular payments to the parent who cares for the child day-to-day (the 'receiving parent'). The logic is straightforward: the resident parent is already covering everyday costs directly, food, heating, school runs, so the non-resident parent contributes financially to balance things out.</P>
          <ArticleH3>What if care is shared equally?</ArticleH3>
          <P>When children split their time roughly equally between both parents, it's worth having an honest conversation about whether payments are needed at all, and if so, whether a smaller contribution makes more sense. There's no rigid rule, the goal is something fair that works for your family. Collabor8 lets you set whatever schedule and amount suits your situation, and adjust it easily as things change.</P>
          <ArticleH3>How to work out a fair amount</ArticleH3>
          <P>The standard formula used across the UK is based on the paying parent's gross weekly income, that's before tax and National Insurance. The percentages are:</P>
          <BList items={["1 child → 12% of gross weekly income", "2 children → 16% of gross weekly income", "3 or more children → 19% of gross weekly income"]} />
          <P>So if the paying parent earns £500 gross per week and there's one child, the starting figure would be £60 per week, around £260 per month.</P>
          <ArticleH3>Three ways to get to a number</ArticleH3>
          <div className="my-6 mb-8 grid gap-4">
            {[
              { n: 1, t: "Use Collabor8's built-in calculator", d: "Uses the same standard formula, takes about 60 seconds, and you can set up payments straight away without leaving the app." },
              { n: 2, t: "Use the government's CMS calculator", d: "The Child Maintenance Service calculator at gov.uk uses the same formula. If you've already used it to get a figure, bring that number into Collabor8 to manage payments from there." },
              { n: 3, t: "Agree an amount yourselves", d: "If you're both happy with a figure that feels fair for your family, that's completely valid, with or without the formula." },
            ].map((p) => (
              <div key={p.n} className="flex items-start gap-4 rounded-[10px] border border-[#E4E2DA] bg-white px-5 py-4">
                <div className="mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1A1A18] text-[0.8rem] font-medium text-white">{p.n}</div>
                <div>
                  <strong className="mb-1 block text-[0.95rem] font-medium text-[#1A1A18]">{p.t}</strong>
                  <span className="text-[0.88rem] leading-[1.5] text-[#6B6B64]">{p.d}</span>
                </div>
              </div>
            ))}
            <p className="py-2 text-center text-[1.05rem] italic text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Whichever way you get there, manage it all in Collabor8.</p>
          </div>
          <ArticleH3>What adjusts the amount?</ArticleH3>
          <BList items={[<><strong>Overnight stays:</strong> the more nights the child spends with the paying parent, the lower the contribution</>, <><strong>Other children:</strong> if the paying parent supports other children, this can reduce the assessable amount</>, <><strong>Very low income:</strong> a smaller flat rate applies if earnings fall below a certain threshold</>]} />
          <ArticleH3>What if income changes?</ArticleH3>
          <P>Life doesn't stay still. Jobs change, hours vary, new children arrive. If the paying parent's income shifts significantly, it makes sense to revisit the amount. Collabor8 makes it easy to update your payment schedule and keep both parents informed, no difficult conversations needed, just a quick update in the app.</P>
          <Callout><strong className="not-italic font-medium">Collabor8 tip:</strong> However you land on your number, calculator, formula, or a conversation over a cup of tea, Collabor8 is where you manage it from. Set it up once, and the app takes care of the rest.</Callout>
        </article>

        {/* Article 3 */}
        <article ref={(el) => (refs.current[2] = el)} id="article-3" className="border-b border-[#E4E2DA] py-20 bg-inherit">
          <header className="mb-10">
            <span className="mb-4 inline-block rounded-full bg-[#F0E4D6] px-3 py-[0.3rem] text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[#1A1A18]">Article 03</span>
            <h2 className="text-[clamp(1.8rem,4vw,2.4rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>How to set up child maintenance payments</h2>
          </header>
          <img src={articles[2].img} alt={articles[2].alt} className="mb-10 block h-[340px] w-full rounded-2xl object-cover" />
          <P>Working out a fair amount is the first step. Setting up a reliable, clear payment arrangement is where it all comes to life. Here's what you need to know, and why keeping it between yourselves is usually the best option.</P>
          <ArticleH3>Family-based arrangement, the simplest route</ArticleH3>
          <P>The most common approach is a private family arrangement. You and the other parent agree on an amount, decide on a payment schedule, and manage it directly. No waiting for assessments, no bureaucracy, no fees. For most parents who are on reasonable terms, this works well, and Collabor8 is built to make it even easier.</P>
          <ArticleH3>If you're using the Child Maintenance Service</ArticleH3>
          <P>The Child Maintenance Service (CMS) is a government service that can calculate the amount, and in some cases collect and pass on payments. Some families use it, particularly when communication is difficult or an independent calculation provides reassurance. If that's your situation, Collabor8 works alongside it. Set up the CMS-calculated amount in the app, and Collabor8 handles the tracking, reminders, and receipts from there. You still get a clear shared record, and both parents can see exactly where things stand.</P>
          <ArticleH3>What if there's already a court order?</ArticleH3>
          <P>If a court has set the maintenance amount, as part of a divorce settlement or a separate order, that figure is legally binding. Collabor8 works alongside court orders too: set up the ordered amount as your recurring payment, and the app handles the rest. If payments are ever disputed, you have a clear, timestamped record to refer to.</P>
          <ArticleH3>What does a good arrangement look like?</ArticleH3>
          <BList items={["A clear, agreed amount, ideally based on the standard formula so both parties feel it's fair", "A regular schedule, monthly is most common, though fortnightly works for some families", "A record, so neither parent is ever in doubt about what's been paid and what's outstanding"]} />
          <P>Collabor8 handles all three. Once you've set up your arrangement in the app, payments are tracked automatically, reminders go out before each due date, and both parents can see the full history at any time.</P>
          <ArticleH3>What about missed payments?</ArticleH3>
          <P>The honest answer: missed payments are far less likely when both parents have full visibility. Collabor8 sends automatic reminders before payments are due and flags anything overdue. Most of the time, that's enough. In serious cases where payments are persistently withheld and communication has completely broken down, formal enforcement routes remain an option, but for the vast majority of families, a clear and transparent arrangement is all you need.</P>
          <Callout><strong className="not-italic font-medium">Collabor8 tip:</strong> Set up your recurring payment once, and Collabor8 handles the rest, reminders, receipts, and records, all automatic. It takes about two minutes to get started.</Callout>
        </article>

        {/* Article 4 */}
        <article ref={(el) => (refs.current[3] = el)} id="article-4" className="border-b border-[#E4E2DA] py-20 bg-inherit">
          <header className="mb-10">
            <span className="mb-4 inline-block rounded-full bg-[#F0E4D6] px-3 py-[0.3rem] text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[#1A1A18]">Article 04</span>
            <h2 className="text-[clamp(1.8rem,4vw,2.4rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Shared and additional expenses</h2>
          </header>
          <img src={articles[3].img} alt={articles[3].alt} className="mb-10 block h-[340px] w-full rounded-2xl object-cover" />
          <P>Regular maintenance payments cover the day-to-day basics. But children are expensive in ways that don't fit neatly into a monthly transfer. What about the school ski trip? The new football boots? The dentist? Here's how to handle the extras without it becoming a source of friction.</P>
          <ArticleH3>What maintenance covers, and what it doesn't</ArticleH3>
          <P>Standard maintenance is designed for ongoing, everyday costs: food, clothing, housing, utilities, and general care. It's the baseline, a regular contribution to keep life running smoothly. What it doesn't automatically cover are one-off or irregular costs. These need to be agreed separately, and having a system for logging and requesting them makes all the difference.</P>
          <ArticleH3>The kinds of extras that come up</ArticleH3>
          <BList items={["School trips, residentials, and activity days", "Uniform, PE kit, and school shoes", "After-school clubs, sports, music lessons", "Medical or dental costs not covered by the NHS", "Technology, laptops and tablets for schoolwork", "Childcare and holiday club costs"]} />
          <ArticleH3>How to split extras fairly</ArticleH3>
          <BList items={["50/50 for anything above an agreed threshold, say, anything over £20", "Proportional to income if one parent earns significantly more", "One parent leads, the other reimburses, works well for regular childcare costs"]} />
          <P>The most important thing is agreeing the approach in advance, not debating it when the invoice arrives. A quick conversation now saves a lot of stress later.</P>
          <ArticleH3>The receipt problem, and how to solve it</ArticleH3>
          <P>Without a system, shared expenses quietly become one of the biggest sources of friction in co-parenting. "I texted you about that trip weeks ago." "I never agreed to pay for that." Sound familiar?</P>
          <P>Collabor8 makes this clean and simple. Log any additional expense in the app, attach a photo of the receipt, and send a payment request to the other parent. They can see exactly what it was for, approve it, and pay, all in the same place you manage regular maintenance. No lost messages, no disputed amounts, no awkward conversations.</P>
          <Callout><strong className="not-italic font-medium">Collabor8 tip:</strong> You can earn rewards for logging and responding to expense requests promptly. Good co-parenting admin has its perks.</Callout>
          <ArticleH3>What if you disagree on an expense?</ArticleH3>
          <P>Sometimes one parent wants to fund something the other thinks is unnecessary. A sensible rule of thumb: the parent who wants the extra covers it. For genuinely essential costs, medical expenses, compulsory school items, these should always be shared. If disagreements become a pattern, a simple co-parenting agreement or a session with a family mediator can help you reach a workable approach.</P>
        </article>

        {/* Article 5 */}
        <article ref={(el) => (refs.current[4] = el)} id="article-5" className="py-20">
          <header className="mb-10">
            <span className="mb-4 inline-block rounded-full bg-[#F0E4D6] px-3 py-[0.3rem] text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[#1A1A18]">Article 05</span>
            <h2 className="text-[clamp(1.8rem,4vw,2.4rem)] font-light leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Your rights and legal responsibilities</h2>
          </header>
          <img src={articles[4].img} alt={articles[4].alt} className="mb-10 block h-[340px] w-full rounded-2xl object-cover" />
          <P>Child maintenance can feel murky when it comes to the legal side. What are you actually obliged to do? What rights do you have if things go wrong? Here's a clear overview of what every separated parent in the UK should know.</P>
          <ArticleH3>Both parents have a legal duty to support their child</ArticleH3>
          <P>Under the Child Support Act 1991, both parents, regardless of relationship status, whether they were ever married, or how the separation happened, are legally required to financially support their child. This duty continues until your child turns 16, or until they reach 20 if they're still in full-time education such as A-levels or equivalent.</P>
          <ArticleH3>The receiving parent's rights</ArticleH3>
          <BList items={["To receive financial support from the other parent", "To revisit the arrangement if the other parent's income changes significantly", "To seek formal enforcement if private arrangements break down completely", "To apply for additional support through the courts if the paying parent is a high earner"]} />
          <P>In practice, most of this never comes into play, because a clear, transparent arrangement with proper records removes most of the tension before it starts. That's the Collabor8 approach.</P>
          <ArticleH3>The paying parent's rights</ArticleH3>
          <BList items={["To have the amount based fairly on your actual income", "To have overnight stays taken into account", "To request a review if circumstances change, job loss, significant income drop", "To have clarity on the arrangement, maintenance is for your child's benefit, not a penalty"]} />
          <ArticleH3>What if payments stop?</ArticleH3>
          <P>If payments stop without explanation, the first step is always a direct conversation. Most of the time, missed payments come down to forgetfulness or a change in circumstances rather than deliberate avoidance, and a quick message resolves it. Collabor8 reduces the chance of this significantly: automatic reminders, a shared payment history, and clear visibility for both parents mean there's rarely any room for confusion. If payments are persistently withheld and all attempts to resolve it directly have failed, formal legal routes do exist, but they're a last resort, not a first step.</P>
          <ArticleH3>Can the arrangement be changed?</ArticleH3>
          <P>Yes, and it should be reviewed whenever circumstances shift meaningfully, a new job, a change in how much time the child spends with each parent, or a significant life event. With Collabor8, updating the arrangement is simple: both parents can see the proposed change, agree to it, and the new schedule takes effect. No formal letters, no waiting.</P>
          <ArticleH3>Financial responsibility vs parental responsibility</ArticleH3>
          <P>It's worth being clear: financial responsibility and parental responsibility are two separate things. Making, or not making, maintenance payments has no bearing on your legal rights as a parent when it comes to decisions about your child's upbringing, education, or welfare. The two are legally distinct.</P>
          <ArticleH3>When to get professional advice</ArticleH3>
          <P>For most families, a clear private arrangement managed through Collabor8 is all you need. But if your situation is genuinely complex, a high-earning paying parent, international elements, significant assets, or a very difficult separation, it's worth speaking to a family law solicitor. Many offer a free initial consultation and can help you understand your options clearly.</P>
          <Callout><strong className="not-italic font-medium">Collabor8 tip:</strong> Collabor8 doesn't enforce payments, that's not what it's for. What it does is make non-payment far less likely, by giving both parents complete visibility and removing every excuse for confusion.</Callout>
        </article>
      </main>

      {/* CTA */}
      <section id="get-started" className="bg-[#1A1A18] px-8 py-16 text-center text-white">
        <h2 className="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-light leading-tight tracking-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Ready to make things simpler?
        </h2>
        <p className="mx-auto mb-8 max-w-[480px] text-[1.05rem] font-light text-white/75">
          Join thousands of co-parents managing maintenance clearly, fairly, and without the stress.
        </p>
        <Link to="/signup" className="inline-block rounded-full bg-white px-8 py-[0.85rem] text-[0.95rem] font-medium text-[#1A1A18] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          Get started with Collabor8, it's free
        </Link>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
          {["Track payments automatically", "Log shared expenses with receipts", "Earn rewards for staying on top", "No fees. No middlemen."].map((f) => (
            <span key={f} className="flex items-center gap-2 text-[0.88rem] text-white/70">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D9D5]" />
              {f}
            </span>
          ))}
        </div>
      </section>

      <footer className="bg-[#1A1A18] px-8 py-8 text-center text-[0.85rem] text-white/50">
        <p>
          <Link to="/" className="text-white/60 no-underline hover:text-white">Collabor8</Link>
          {" \u00B7 "}
          <Link to="/resources/support-and-guidance" className="text-white/60 no-underline hover:text-white">Support &amp; Guidance</Link>
          {" \u00B7 "}
          <Link to="/privacy" className="text-white/60 no-underline hover:text-white">Privacy</Link>
          {" \u00B7 "}
          <Link to="/cookies" className="text-white/60 no-underline hover:text-white">Terms</Link>
        </p>
        <p className="mt-2 text-xs">&copy; 2025 Collabor8. This guide is for informational purposes only and does not constitute legal advice.</p>
      </footer>
    </div>
  );
};

export default ChildMaintenanceGuide;
