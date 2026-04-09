import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import GuideLayout from "@/components/guide/GuideLayout";
import ArticleNav from "@/components/guide/ArticleNav";

const WhoPaysChildMaintenance = () => (
  <GuideLayout breadcrumb="Who pays, and how much?">
    <Helmet>
      <title>Who pays child maintenance, and how much? | Collabor8 Guide</title>
      <meta name="description" content="Find out who pays child maintenance in the UK, how the amount is calculated, and three simple ways to arrive at a fair figure - including the standard UK formula and Collabor8's built-in calculator." />
      <meta name="keywords" content="who pays child maintenance uk, paying parent receiving parent, child maintenance calculator uk, how much child maintenance, child maintenance formula" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide/who-pays" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "Article",
        "headline": "Who pays, and how much?",
        "publisher": { "@type": "Organization", "name": "Collabor8" },
        "isPartOf": { "@type": "CollectionPage", "url": "https://collabor8.lovable.app/resources/child-maintenance-guide" }
      })}</script>
    </Helmet>

    <div className="mx-auto mt-6 max-w-[800px] px-8">
      <img src="https://images.unsplash.com/photo-1554224155-8d04421f81f0?w=1400&q=80&auto=format&fit=crop&crop=center" alt="Calculator and financial paperwork on a desk" className="block h-[400px] w-full rounded-2xl object-cover max-sm:h-[240px]" loading="eager" />
    </div>

    <main className="mx-auto max-w-[700px] px-8 pb-20 pt-12 max-sm:px-5 max-sm:pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#E8F5F2] px-3 py-1 text-xs font-medium tracking-wider text-[#134840]">Article 02 of 05</span>
        <span className="text-sm text-[#AEADA5]">5 min read</span>
      </div>

      <h1 className="mb-5 text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>
        Who pays, and how much?
      </h1>

      <p className="mb-10 border-b border-[#E4E2DA] pb-8 text-lg font-light leading-relaxed text-[#3D3D38]">
        Once you understand what child maintenance is, two questions usually follow quickly: who actually pays? And how do you work out a fair amount? Let's tackle both.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Who pays who?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        In most arrangements, the parent who spends less time with the child (the 'paying parent') makes regular payments to the parent who cares for the child day-to-day (the 'receiving parent'). The logic is straightforward: the resident parent is already covering everyday costs directly - food, heating, school runs - so the non-resident parent contributes financially to balance things out.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if care is shared equally?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        When children split their time roughly equally between both parents, it's worth having an honest conversation about whether payments are needed at all, and if so, whether a smaller contribution makes sense. There's no rigid rule - the goal is something fair that works for your family. Collabor8 lets you set whatever schedule and amount suits your situation, and adjust it easily as things change.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>How to work out a fair amount</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        The standard formula used across the UK is based on the paying parent's gross weekly income - that's before tax and National Insurance. The percentages are:
      </p>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {["1 child \u2192 12% of gross weekly income", "2 children \u2192 16% of gross weekly income", "3 or more children \u2192 19% of gross weekly income"].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        So if the paying parent earns &pound;500 gross per week and there's one child, the starting figure would be &pound;60 per week - around &pound;260 per month.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Three ways to get to a number</h2>
      <div className="my-5 space-y-3">
        {[
          { num: "1", title: "Use the government calculator", desc: "The Child Maintenance Service calculator at gov.uk applies the standard formula based on your income and circumstances." },
          { num: "2", title: "Use Collabor8's built-in calculator", desc: "Same formula, right inside the app - no need to go anywhere else. Takes about 60 seconds." },
          { num: "3", title: "Agree an amount yourselves", desc: "If you're both happy with a figure that feels fair for your family, that's completely valid - with or without the formula." },
        ].map((p) => (
          <div key={p.num} className="flex gap-4 rounded-lg border border-[#E4E2DA] bg-white p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E6B5E] text-sm font-medium text-white">{p.num}</div>
            <div>
              <strong className="block text-[0.95rem] font-medium text-[#1A1A18]">{p.title}</strong>
              <span className="text-sm leading-relaxed text-[#6B6B64]">{p.desc}</span>
            </div>
          </div>
        ))}
        <p className="pt-3 text-center text-[1.05rem] italic text-[#1E6B5E]" style={{ fontFamily: "'Georgia', serif" }}>
          Whichever way you get there - manage it all in Collabor8.
        </p>
      </div>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What adjusts the amount?</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {[
          "<strong>Overnight stays:</strong> the more nights the child spends with the paying parent, the lower the contribution",
          "<strong>Other children:</strong> if the paying parent supports other children, this can reduce the assessable amount",
          "<strong>Very low income:</strong> a smaller flat rate applies if earnings fall below a certain threshold",
        ].map((item, i) => (
          <li key={i} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0" dangerouslySetInnerHTML={{ __html: `<span class="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:#1E6B5E;"></span>${item}` }} />
        ))}
      </ul>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if income changes?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        Life doesn't stay still. Jobs change, hours vary, new children arrive. If the paying parent's income shifts significantly, it makes sense to revisit the amount. Collabor8 makes it easy to update your payment schedule and keep both parents informed - no difficult conversations needed, just a quick update in the app.
      </p>

      <div className="my-8 rounded-r-lg border-l-[3px] border-[#1E6B5E] bg-[#E8F5F2] px-5 py-4 text-[0.97rem] italic leading-relaxed text-[#134840]">
        <strong className="not-italic font-medium">Collabor8 tip:</strong> However you arrive at a fair amount, the important thing is managing it clearly. Collabor8's built-in calculator gives you a starting point, and the app handles everything after that.
      </div>

      <ArticleNav
        prev={{ label: "\u2190 Previous", title: "What is child maintenance?", to: "/resources/child-maintenance-guide/what-is-child-maintenance" }}
        next={{ label: "Next \u2192", title: "How to set up payments", to: "/resources/child-maintenance-guide/how-to-set-up-payments" }}
      />
    </main>
  </GuideLayout>
);

export default WhoPaysChildMaintenance;
