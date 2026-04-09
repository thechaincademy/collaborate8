import { Helmet } from "react-helmet-async";
import GuideLayout from "@/components/guide/GuideLayout";
import ArticleNav from "@/components/guide/ArticleNav";

const RightsAndResponsibilities = () => (
  <GuideLayout breadcrumb="Your rights and legal responsibilities">
    <Helmet>
      <title>Child maintenance rights and legal responsibilities UK | Collabor8</title>
      <meta name="description" content="A clear guide to child maintenance rights and legal responsibilities for UK parents. What both parents are entitled to, what happens if payments stop, and when to seek professional advice." />
      <meta name="keywords" content="child maintenance rights uk, legal responsibility child support, both parents obligation, child support act 1991, child maintenance law uk" />
      <link rel="canonical" href="https://collabor8.lovable.app/resources/child-maintenance-guide/rights-and-responsibilities" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "Article",
        "headline": "Your rights and legal responsibilities",
        "publisher": { "@type": "Organization", "name": "Collabor8" },
        "isPartOf": { "@type": "CollectionPage", "url": "https://collabor8.lovable.app/resources/child-maintenance-guide" }
      })}</script>
    </Helmet>

    <div className="mx-auto mt-6 max-w-[800px] px-8">
      <img src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1400&q=80&auto=format&fit=crop&crop=center" alt="Legal document and pen on a desk" className="block h-[400px] w-full rounded-2xl object-cover max-sm:h-[240px]" loading="eager" />
    </div>

    <main className="mx-auto max-w-[700px] px-8 pb-20 pt-12 max-sm:px-5 max-sm:pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-[#E8F5F2] px-3 py-1 text-xs font-medium tracking-wider text-[#134840]">Article 05 of 05</span>
        <span className="text-sm text-[#AEADA5]">5 min read</span>
      </div>

      <h1 className="mb-5 text-[clamp(2rem,5vw,3rem)] font-light leading-[1.15] tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>
        Your rights and legal responsibilities
      </h1>

      <p className="mb-10 border-b border-[#E4E2DA] pb-8 text-lg font-light leading-relaxed text-[#3D3D38]">
        Child maintenance can feel murky when it comes to the legal side. What are you actually obliged to do? What rights do you have if things go wrong? Here's a clear overview of what every separated parent in the UK should know.
      </p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Both parents have a legal duty to support their child</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Under the Child Support Act 1991, both parents - regardless of relationship status, whether they were ever married, or how the separation happened - are legally required to financially support their child. This duty continues until your child turns 16, or until they reach 20 if they're still in full-time education such as A-levels or equivalent.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>The receiving parent's rights</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {["To receive financial support from the other parent", "To revisit the arrangement if the other parent's income changes significantly", "To seek formal enforcement if private arrangements break down completely", "To apply for additional support through the courts if the paying parent is a high earner"].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">In practice, most of this never comes into play - because a clear, transparent arrangement with proper records removes most of the tension before it starts. That's the Collabor8 approach.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>The paying parent's rights</h2>
      <ul className="mb-6 mt-1 overflow-hidden rounded-lg border border-[#E4E2DA]">
        {["To have the amount based fairly on your actual income", "To have overnight stays taken into account", "To request a review if circumstances change - job loss, significant income drop", "To have clarity on the arrangement - maintenance is for your child's benefit, not a penalty"].map((item) => (
          <li key={item} className="relative border-b border-[#E4E2DA] bg-white py-3 pl-10 pr-4 text-[0.97rem] leading-relaxed text-[#3D3D38] last:border-b-0">
            <span className="absolute left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1E6B5E]" />
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>What if payments stop?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">If payments stop without explanation, the first step is always a direct conversation. Most missed payments come down to forgetfulness or a change in circumstances rather than deliberate avoidance - and a quick message usually resolves it. Collabor8 reduces the chance of this significantly: automatic reminders, a shared payment history, and clear visibility for both parents mean there's rarely any room for confusion.</p>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">If payments are persistently withheld and all attempts to resolve things directly have failed, formal legal routes do exist. But they're a last resort, not a first step.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Can the arrangement be changed?</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">Yes, and it should be reviewed whenever circumstances shift meaningfully - a new job, a change in how much time the child spends with each parent, or a significant life event. With Collabor8, updating the arrangement is simple: both parents can see the proposed change, agree to it, and the new schedule takes effect. No formal letters, no waiting.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>Financial responsibility vs parental responsibility</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">It's worth being clear: financial responsibility and parental responsibility are two separate things. Making - or not making - maintenance payments has no bearing on your legal rights as a parent when it comes to decisions about your child's upbringing, education, or welfare. The two are legally distinct.</p>

      <h2 className="mb-3 mt-10 text-2xl font-normal tracking-tight text-[#1A1A18]" style={{ fontFamily: "'Georgia', serif" }}>When to get professional advice</h2>
      <p className="mb-4 leading-relaxed text-[#3D3D38]">For most families, a clear private arrangement managed through Collabor8 is all you need. But if your situation is genuinely complex - a high-earning paying parent, international elements, significant assets, or a very difficult separation - it's worth speaking to a family law solicitor. Many offer a free initial consultation and can help you understand your options clearly.</p>

      <div className="my-8 rounded-r-lg border-l-[3px] border-[#1E6B5E] bg-[#E8F5F2] px-5 py-4 text-[0.97rem] italic leading-relaxed text-[#134840]">
        <strong className="not-italic font-medium">Collabor8 tip:</strong> Collabor8 doesn't enforce payments - that's not what it's for. What it does is make non-payment far less likely, by giving both parents complete visibility and removing every excuse for confusion.
      </div>

      <ArticleNav
        prev={{ label: "\u2190 Previous", title: "Shared and additional expenses", to: "/resources/child-maintenance-guide/shared-expenses" }}
        next={{ label: "Back to guide \u2192", title: "All five articles", to: "/resources/child-maintenance-guide" }}
      />
    </main>
  </GuideLayout>
);

export default RightsAndResponsibilities;
