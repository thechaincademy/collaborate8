import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import GuideLayout from "@/components/guide/GuideLayout";
import ArticleNav from "@/components/guide/ArticleNav";

const WhatIsChildMaintenance = () => (
  <GuideLayout breadcrumb="What is child maintenance?">
    <Helmet>
      <title>What is child maintenance? | Collabor8 Child Maintenance Guide</title>
      <meta name="description" content="Child maintenance explained clearly for UK parents. What it covers, who it applies to, whether you need to involve the government, and how Collabor8 makes it simple." />
      <meta name="keywords" content="child maintenance definition uk, what is child maintenance, child support act 1991, child maintenance uk" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide/what-is-child-maintenance" />
      <meta property="og:title" content="What is child maintenance? | Collabor8" />
      <meta property="og:description" content="Child maintenance explained clearly for UK parents. What it covers, who it applies to, whether you need to involve the government, and how Collabor8 makes it simple." />
      <meta property="og:type" content="article" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "Article",
        "headline": "What is child maintenance?",
        "description": "Child maintenance explained clearly for UK parents.",
        "publisher": { "@type": "Organization", "name": "Collabor8", "url": "https://collabor8.lovable.app" },
        "isPartOf": { "@type": "CollectionPage", "url": "https://collabor8.lovable.app/resources/child-maintenance-guide", "name": "Child Maintenance Made Simple" }
      })}</script>
    </Helmet>

    <div className="mx-auto mt-6 max-w-[800px] px-8">
      <img src="https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1400&q=80&auto=format&fit=crop&crop=center" alt="A parent and child spending time at home together" className="block h-[400px] w-full rounded-2xl object-cover max-sm:h-[240px]" loading="eager" />
    </div>

    <main className="mx-auto max-w-[700px] px-8 pb-20 pt-12 max-sm:px-5 max-sm:pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#E8F5F2] px-3 py-1 text-xs font-medium tracking-wider text-[#134840]">Article 01 of 05</span>
        <span className="text-sm text-[#AEADA5]">4 min read</span>
      </div>

      <h1 className="mb-5 text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>
        What is child maintenance?
      </h1>

      <p className="mb-10 border-b border-[#E4E2DA] pb-8 text-lg font-light leading-relaxed text-[#3D3D38]">
        If you've recently separated from your child's other parent, you've probably heard the term 'child maintenance' thrown around. But what does it actually mean - and does it apply to you? Let's break it down, simply and without the jargon.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>The short version</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        Child maintenance is money that one parent pays to the other to help cover the everyday costs of raising their child. Things like food, clothes, school supplies, and a roof over their head. It's not about punishing anyone or keeping score - it's purely about making sure your child has what they need, regardless of what's going on between the adults.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Both parents are responsible</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        Here's something worth knowing: both parents are legally responsible for financially supporting their child. This is set out in the Child Support Act 1991, and it applies whether you were married, in a long-term relationship, or never lived together at all. The law doesn't take sides. It simply says: your child deserves financial support, and both of you share that responsibility.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What does it actually cover?</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {["Housing and household bills", "Food, clothing, and toiletries", "School supplies and childcare costs", "General day-to-day living expenses"].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        It doesn't automatically cover one-off extras like school trips, sports clubs, or dental bills - those are usually agreed separately. (More on that in{" "}
        <Link to="/resources/child-maintenance-guide/shared-expenses" className="text-[#1E6B5E] hover:underline">Article 4</Link>.)
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Is it the same as child support?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        'Child maintenance' and 'child support' mean the same thing in the UK. You might hear either term, along with 'maintenance payments' or simply 'maintenance'. They all refer to the same financial arrangement.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Do you need to involve the government?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        Not at all. The vast majority of separated parents sort out child maintenance between themselves - agreeing on an amount, setting up payments, and managing everything privately. This is called a family-based arrangement, and it's often the quickest, simplest, and most flexible route.
      </p>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        Collabor8 is built for exactly this. It gives both parents a shared space to set up payments, track what's been paid, log extra expenses, and stay on the same page - without anyone else getting involved.
      </p>

      <div className="my-8 rounded-r-lg border-l-[3px] border-[#1E6B5E] bg-[#E8F5F2] px-5 py-4 text-[0.97rem] italic leading-relaxed text-[#134840]">
        <strong className="not-italic font-medium">Collabor8 tip:</strong> Whether you're starting fresh or already have an arrangement in place, Collabor8 gives you everything you need to manage it clearly and confidently. No middlemen, no fees, no stress.
      </div>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if there's already a court order?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">
        If a court has set the maintenance amount, that figure is your starting point. Collabor8 works with whatever amount has been agreed or ordered - helping you schedule payments, track them, and keep a clear record that both parents can see. Having the right tools makes following through on any arrangement much easier, and much less likely to cause friction.
      </p>

      <ArticleNav
        prev={{ label: "\u2190 Back to guide", title: "Child Maintenance Made Simple", to: "/resources/child-maintenance-guide" }}
        next={{ label: "Next \u2192", title: "Who pays, and how much?", to: "/resources/child-maintenance-guide/who-pays" }}
      />
    </main>
  </GuideLayout>
);

export default WhatIsChildMaintenance;
