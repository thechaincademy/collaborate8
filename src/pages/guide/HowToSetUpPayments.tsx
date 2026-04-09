import { Helmet } from "react-helmet-async";
import GuideLayout from "@/components/guide/GuideLayout";
import ArticleNav from "@/components/guide/ArticleNav";

const HowToSetUpPayments = () => (
  <GuideLayout breadcrumb="How to set up payments">
    <Helmet>
      <title>How to set up child maintenance payments | Collabor8 Guide</title>
      <meta name="description" content="How to arrange child maintenance payments in the UK without a third party. Family-based arrangements, court orders, and how Collabor8 handles the scheduling, reminders, and records automatically." />
      <meta name="keywords" content="how to arrange child maintenance payments, family arrangement child maintenance, child maintenance without CMS, set up child maintenance uk" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide/how-to-set-up-payments" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "Article",
        "headline": "How to set up child maintenance payments",
        "publisher": { "@type": "Organization", "name": "Collabor8" },
        "isPartOf": { "@type": "CollectionPage", "url": "https://collabor8.lovable.app/resources/child-maintenance-guide" }
      })}</script>
    </Helmet>

    <div className="mx-auto mt-6 max-w-[800px] px-8">
      <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1400&q=80&auto=format&fit=crop&crop=center" alt="Organised desk with notebook and phone" className="block h-[400px] w-full rounded-2xl object-cover max-sm:h-[240px]" loading="eager" />
    </div>

    <main className="mx-auto max-w-[700px] px-8 pb-20 pt-12 max-sm:px-5 max-sm:pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#E8F5F2] px-3 py-1 text-xs font-medium tracking-wider text-[#134840]">Article 03 of 05</span>
        <span className="text-sm text-[#AEADA5]">5 min read</span>
      </div>

      <h1 className="mb-5 text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>
        How to set up child maintenance payments
      </h1>

      <p className="mb-10 border-b border-[#E4E2DA] pb-8 text-lg font-light leading-relaxed text-[#3D3D38]">
        Working out a fair amount is the first step. Setting up a reliable, clear payment arrangement is where it all comes to life. Here's what you need to know - and why keeping it between yourselves is usually the best option.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>You don't need a third party</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">The most common - and often the most sensible - approach is a private family arrangement. You and the other parent agree on an amount, decide on a payment schedule, and manage it directly. No waiting for assessments, no bureaucracy, no fees.</p>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">For most separated parents who are on reasonable terms, this works well. The key is having a clear record of what's been agreed and what's been paid - and that's exactly the gap Collabor8 fills.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What does a good arrangement look like?</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {[
          "A clear, agreed amount - ideally based on the standard formula so both parties feel it's fair",
          "A regular schedule - monthly is most common, though fortnightly works for some families",
          "A record - so neither parent is ever in doubt about what's been paid and what's outstanding",
        ].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Collabor8 handles all three. Once you've set up your arrangement in the app, payments are tracked automatically, reminders go out before each due date, and both parents can see the full history at any time.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if there's already a court order?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">If a court has set the maintenance amount - as part of a divorce settlement or a separate maintenance order - that figure is legally binding. You still need to manage the actual payments, and that's where things often get messy without the right tools. Collabor8 works alongside any court order: set up the ordered amount as your recurring payment, and the app handles tracking, reminders, and receipts. If payments are ever disputed, you have a clear, timestamped record to refer to.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if you want to move away from a formal arrangement?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Some parents find themselves in a formally managed arrangement - perhaps set up during a difficult period - and want to simplify things now that communication has improved. Provided both parents agree, you can move to a private arrangement at any time. Collabor8 makes the transition straightforward: agree the amount, set it up in the app, and take back control. No fees, no waiting, everything in one place.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What about missed payments?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">The honest answer: missed payments are far less likely when both parents have full visibility. Collabor8 sends automatic reminders before payments are due and flags anything overdue. Most of the time, that's enough. In serious cases where payments are persistently withheld and communication has completely broken down, formal enforcement routes remain an option - but for the vast majority of families, a clear and transparent arrangement is all you need.</p>

      <div className="my-8 rounded-r-lg border-l-[3px] border-[#1E6B5E] bg-[#E8F5F2] px-5 py-4 text-[0.97rem] italic leading-relaxed text-[#134840]">
        <strong className="not-italic font-medium">Collabor8 tip:</strong> Set up your recurring payment once, and Collabor8 handles the rest - reminders, receipts, and records, all automatic. It takes about two minutes to get started.
      </div>

      <ArticleNav
        prev={{ label: "\u2190 Previous", title: "Who pays, and how much?", to: "/resources/child-maintenance-guide/who-pays" }}
        next={{ label: "Next \u2192", title: "Shared and additional expenses", to: "/resources/child-maintenance-guide/shared-expenses" }}
      />
    </main>
  </GuideLayout>
);

export default HowToSetUpPayments;
