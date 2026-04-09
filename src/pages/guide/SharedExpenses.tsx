import { Helmet } from "react-helmet-async";
import GuideLayout from "@/components/guide/GuideLayout";
import ArticleNav from "@/components/guide/ArticleNav";

const SharedExpenses = () => (
  <GuideLayout breadcrumb="Shared and additional expenses">
    <Helmet>
      <title>Shared and additional child expenses | Collabor8 Guide</title>
      <meta name="description" content="How to handle extra child costs beyond regular maintenance - school trips, clubs, uniforms, medical expenses. Practical approaches to splitting costs fairly as co-parents." />
      <meta name="keywords" content="shared expenses co-parenting uk, extra child costs beyond maintenance, school trips child maintenance, co-parenting expenses uk" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide/shared-expenses" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "Article",
        "headline": "Shared and additional expenses",
        "publisher": { "@type": "Organization", "name": "Collabor8" },
        "isPartOf": { "@type": "CollectionPage", "url": "https://collabor8.lovable.app/resources/child-maintenance-guide" }
      })}</script>
    </Helmet>

    <div className="mx-auto mt-6 max-w-[800px] px-8">
      <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1400&q=80&auto=format&fit=crop&crop=center" alt="Child doing homework at a desk" className="block h-[400px] w-full rounded-2xl object-cover max-sm:h-[240px]" loading="eager" />
    </div>

    <main className="mx-auto max-w-[700px] px-8 pb-20 pt-12 max-sm:px-5 max-sm:pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#E8F5F2] px-3 py-1 text-xs font-medium tracking-wider text-[#134840]">Article 04 of 05</span>
        <span className="text-sm text-[#AEADA5]">4 min read</span>
      </div>

      <h1 className="mb-5 text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>
        Shared and additional expenses
      </h1>

      <p className="mb-10 border-b border-[#E4E2DA] pb-8 text-lg font-light leading-relaxed text-[#3D3D38]">
        Regular maintenance payments cover the day-to-day basics. But children are expensive in ways that don't fit neatly into a monthly transfer. What about the school ski trip? The new football boots? The dentist? Here's how to handle the extras without it becoming a source of friction.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What maintenance covers - and what it doesn't</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Standard maintenance is designed for ongoing, everyday costs: food, clothing, housing, utilities, and general care. It's the baseline - a regular contribution to keep life running smoothly. What it doesn't automatically cover are one-off or irregular costs. These need to be agreed separately, and having a system for logging and requesting them makes all the difference.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>The kinds of extras that come up</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {["School trips, residentials, and activity days", "Uniform, PE kit, and school shoes", "After-school clubs, sports, music lessons", "Medical or dental costs not covered by the NHS", "Technology - laptops and tablets for schoolwork", "Childcare and holiday club costs"].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>How to split extras fairly</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {["50/50 for anything above an agreed threshold - say, anything over \u00A320", "Proportional to income if one parent earns significantly more", "One parent leads, the other reimburses - works well for regular childcare costs"].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">The most important thing is agreeing the approach in advance, not debating it when the invoice arrives. A quick conversation now saves a lot of stress later.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>The receipt problem - and how to solve it</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Without a system, shared expenses quietly become one of the biggest sources of friction in co-parenting. "I texted you about that trip weeks ago." "I never agreed to pay for that." Sound familiar?</p>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Collabor8 makes this clean and simple. Log any additional expense in the app, attach a photo of the receipt, and send a payment request to the other parent. They can see exactly what it was for, approve it, and pay - all in the same place you manage regular maintenance. No lost messages, no disputed amounts, no awkward conversations.</p>

      <div className="my-8 rounded-r-lg border-l-[3px] border-[#1E6B5E] bg-[#E8F5F2] px-5 py-4 text-[0.97rem] italic leading-relaxed text-[#134840]">
        <strong className="not-italic font-medium">Collabor8 tip:</strong> You can earn rewards for logging and responding to expense requests promptly. Good co-parenting admin has its perks.
      </div>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if you disagree on an expense?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Sometimes one parent wants to fund something the other thinks is unnecessary. A sensible rule of thumb: the parent who wants the extra covers it. For genuinely essential costs - medical expenses, compulsory school items - these should always be shared. If disagreements become a pattern, a simple co-parenting agreement or a session with a family mediator can help you reach a workable approach.</p>

      <ArticleNav
        prev={{ label: "\u2190 Previous", title: "How to set up payments", to: "/resources/child-maintenance-guide/how-to-set-up-payments" }}
        next={{ label: "Next \u2192", title: "Your rights and responsibilities", to: "/resources/child-maintenance-guide/rights-and-responsibilities" }}
      />
    </main>
  </GuideLayout>
);

export default SharedExpenses;
