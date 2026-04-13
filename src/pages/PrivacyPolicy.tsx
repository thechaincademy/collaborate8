import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const sections = [
  { id: "s1", num: "01", label: "Who we are" },
  { id: "s2", num: "02", label: "What we collect" },
  { id: "s3", num: "03", label: "How we use it" },
  { id: "s4", num: "04", label: "Who we share with" },
  { id: "s5", num: "05", label: "International transfers" },
  { id: "s6", num: "06", label: "How long we keep it" },
  { id: "s7", num: "07", label: "Security" },
  { id: "s8", num: "08", label: "Your rights" },
  { id: "s9", num: "09", label: "Cookies" },
  { id: "s10", num: "10", label: "Third-party links" },
  { id: "s11", num: "11", label: "Policy changes" },
  { id: "s12", num: "12", label: "Contact us" },
];

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState("s1");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div className="min-h-screen bg-[#f8fafb]" style={{ fontFamily: "'Figtree', sans-serif" }}>
      <Helmet>
        <title>Privacy Policy - Collabor8</title>
        <meta name="description" content="Collabor8 Privacy Policy. Learn how Collaborate Technologies Ltd collects, uses, shares and protects your personal data. UK GDPR compliant." />
        <link rel="canonical" href="https://collabor8.lovable.app/privacy" />
      </Helmet>

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#e0eaed] bg-white/95 px-[5vw] py-4 backdrop-blur-md">
        <span className="text-[1.4rem] font-normal text-[#2a7c6f]" style={{ fontFamily: "'Fraunces', serif" }}>Collabor8</span>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[0.85rem] font-medium text-[#6b8494] transition-colors hover:text-[#2a7c6f]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </button>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden bg-[#1a2e3b] px-[5vw] pb-16 pt-20">
        <div className="pointer-events-none absolute -top-[40%] right-[-10%] h-full w-[50vw] bg-[radial-gradient(ellipse_at_center,rgba(42,124,111,0.25)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-[30%] -left-[5%] h-[80%] w-[40vw] bg-[radial-gradient(ellipse_at_center,rgba(58,158,142,0.12)_0%,transparent_65%)]" />
        <div className="relative z-10 max-w-[760px]">
          <div className="mb-5 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[#3a9e8e]">
            <span className="inline-block h-[1.5px] w-6 bg-[#3a9e8e]" />
            Legal
          </div>
          <h1 className="mb-5 text-[clamp(2.4rem,5vw,3.6rem)] font-light leading-[1.1] tracking-tight text-white" style={{ fontFamily: "'Fraunces', serif" }}>
            Your privacy,<br /><em className="italic text-[#3a9e8e]">taken seriously.</em>
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-[0.85rem] text-white/50">
            <span>Last updated: April 2026</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Version 1.1</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>UK GDPR compliant</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>ICO Reg: C1906893</span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto grid max-w-[1100px] gap-16 px-[5vw] pb-24 pt-12 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="md:sticky md:top-[90px] md:self-start">
          <div className="mb-4 border-b border-[#e0eaed] pb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#6b8494]">Contents</div>
          <nav className="flex flex-wrap gap-1 md:flex-col md:gap-0">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-2 border-l-2 py-1.5 pl-3 text-[0.83rem] leading-snug transition-colors md:ml-[-0.75rem] ${
                  activeId === s.id
                    ? "border-[#2a7c6f] text-[#2a7c6f]"
                    : "border-transparent text-[#6b8494] hover:text-[#2a7c6f]"
                } max-md:ml-0 max-md:rounded-full max-md:border max-md:border-[#e0eaed] max-md:bg-white max-md:px-3 max-md:py-1.5 max-md:text-[0.78rem] ${
                  activeId === s.id ? "max-md:border-[#c6e9e4] max-md:bg-[#eaf5f3]" : ""
                }`}
              >
                <span className="text-[0.7rem] font-semibold text-[#c6e9e4]">{s.num}</span>
                {s.label}
              </a>
            ))}
          </nav>
          <div className="mt-8 rounded-xl border border-[#c6e9e4] bg-[#eaf5f3] p-4">
            <p className="mb-2 text-[0.8rem] leading-snug text-[#2d4a5e]">Questions about your data?</p>
            <a href="mailto:privacy@collaborate8.com" className="break-all text-[0.82rem] font-semibold text-[#2a7c6f] hover:underline">privacy@collaborate8.com</a>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          {/* About box */}
          <div className="mb-8 rounded-xl border border-[#c6e9e4] border-l-[3px] border-l-[#2a7c6f] bg-[#eaf5f3] p-4">
            <div className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[#2a7c6f]">About this policy</div>
            <p className="text-[0.88rem] leading-relaxed text-[#2d4a5e]">
              This Privacy Policy explains how Collaborate Technologies Ltd ("Collabor8", "we", "us", "our") collects, uses, shares and protects personal data when you use our website and app. We are committed to handling your data lawfully and transparently in accordance with the UK GDPR and the Data Protection Act 2018.
            </p>
          </div>

          {/* 1. Who we are */}
          <section ref={setRef("s1")} id="s1" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">01</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Who we are</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">Collaborate Technologies Ltd is the data controller for all personal data processed through the Service.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: "Company name", val: "Collaborate Technologies Ltd" },
                { label: "Registered in", val: "England & Wales" },
                { label: "ICO Registration No.", val: "C1906893" },
                { label: "Data Protection contact", val: "privacy@collaborate8.com", isLink: true },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#e0eaed] bg-white p-3.5">
                  <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#6b8494]">{item.label}</div>
                  <div className="text-[0.9rem] font-medium text-[#1a2e3b]">
                    {item.isLink ? <a href={`mailto:${item.val}`} className="text-[#2a7c6f] hover:underline">{item.val}</a> : item.val}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-[#e0eaed] bg-white p-3.5 sm:col-span-2">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#6b8494]">Postal address</div>
                <div className="text-[0.9rem] font-medium text-[#1a2e3b]">86-90 Paul Street, London, EC2A 4NE</div>
              </div>
            </div>
          </section>

          {/* 2. What we collect */}
          <section ref={setRef("s2")} id="s2" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">02</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>What personal data we collect</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">We collect only the data necessary to provide the Service.</p>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Data you give us directly</h3>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                "Full name and email address (account registration)",
                "Password - stored as a one-way bcrypt hash, never in plain text",
                "Financial information you enter (income figures, expense amounts, payment records)",
                "Number of dependants and custody arrangement - used solely for maintenance calculations. No names, dates of birth, or any other personal details relating to dependants are collected or stored.",
                "Communications you send us via email or in-app support",
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  {t}
                </li>
              ))}
            </ul>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Data we collect automatically</h3>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                "Device identifiers and IP address",
                "Browser type, operating system and app version",
                "Pages viewed, features used and session duration (aggregated analytics)",
                "Crash reports and error logs",
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  {t}
                </li>
              ))}
            </ul>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Data from third parties</h3>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                "Payment status from Stripe - we do not store full card numbers, which are handled by Stripe as a PCI-DSS Level 1 provider",
                "Sign-in tokens if you use Google or Apple Sign-In",
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-[#c6e9e4] border-l-[3px] border-l-[#2a7c6f] bg-[#eaf5f3] p-4">
              <div className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[#2a7c6f]">What we do not collect</div>
              <p className="text-[0.88rem] leading-relaxed text-[#2d4a5e]">We do not collect personal data about dependants. Collabor8 is a tool for adults only. All data we hold relates solely to the adults who register and use the Service.</p>
            </div>
          </section>

          {/* 3. How we use it */}
          <section ref={setRef("s3")} id="s3" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">03</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>How and why we use your data</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">The table below sets out every purpose for which we process personal data and the lawful basis under UK GDPR Article 6 that we rely on.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.86rem]">
                <thead>
                  <tr className="bg-[#2a7c6f]">
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Purpose</th>
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Data used</th>
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Lawful basis</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Create and manage your account", "Name, email, password hash", "Contract (Art. 6(1)(b))"],
                    ["Provide maintenance calculations", "Income, custody arrangement, number of dependants", "Contract (Art. 6(1)(b))"],
                    ["Track and split shared expenses", "Expense records, payment history", "Contract (Art. 6(1)(b))"],
                    ["Process subscription payments", "Email, billing name (Stripe handles card data)", "Contract (Art. 6(1)(b))"],
                    ["Send transactional notifications", "Email address, notification preferences", "Contract (Art. 6(1)(b))"],
                    ["Improve and debug the Service", "Usage analytics, crash logs (anonymised where possible)", "Legitimate interests (Art. 6(1)(f))"],
                    ["Prevent fraud and abuse", "IP address, device ID, usage patterns", "Legitimate interests (Art. 6(1)(f))"],
                    ["Comply with legal obligations", "Any data required by applicable law", "Legal obligation (Art. 6(1)(c))"],
                    ["Send marketing (with consent)", "Email address", "Consent (Art. 6(1)(a)) - withdraw at any time"],
                  ].map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-[#eaf5f3]"} hover:bg-[#dff0ed]`}>
                      <td className="border-b border-[#e0eaed] px-4 py-3 font-medium text-[#1a2e3b]">{row[0]}</td>
                      <td className="border-b border-[#e0eaed] px-4 py-3 text-[#2d4a5e]">{row[1]}</td>
                      <td className="border-b border-[#e0eaed] px-4 py-3 text-[#2d4a5e]">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[0.85rem] text-[#6b8494]">We do not use your personal data for automated decision-making or profiling that produces legal or similarly significant effects.</p>
          </section>

          {/* 4. Who we share with */}
          <section ref={setRef("s4")} id="s4" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">04</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Who we share your data with</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">We do not sell your personal data. We share it only as set out below.</p>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Service providers (processors)</h3>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                { bold: "Stripe", rest: " - payment processing (US/EU, SCCs in place)" },
                { bold: "Amazon Web Services (AWS)", rest: " - cloud hosting (UK/EU regions)" },
                { bold: "SendGrid / Postmark", rest: " - transactional email delivery" },
                { bold: "Sentry", rest: " - error monitoring (PII scrubbed before transmission)" },
                { bold: "Google Analytics / Mixpanel", rest: " - anonymised usage analytics (IP anonymisation enabled)" },
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  <strong className="font-semibold text-[#1a2e3b]">{t.bold}</strong>{t.rest}
                </li>
              ))}
            </ul>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Co-parent sharing - what is and is not shared</h3>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">Collabor8 allows two parents to work within a shared workspace. It is important to understand exactly what each party can and cannot see:</p>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                { bold: "Each parent has their own independent account", rest: ", protected by their own login credentials. Neither parent can access, view or modify the other's account settings, profile or personal details." },
                { bold: "Payment information and card details are never visible to a co-parent", rest: " under any circumstances. Financial data entered for billing purposes is held exclusively between you and Stripe. Your co-parent has no access to this data whatsoever." },
                { bold: "Income figures stay private.", rest: " They are used only to generate a calculation result. The underlying figures you entered are not displayed to your co-parent - only the resulting output is shared." },
                { bold: "Only explicitly shared content is visible to both parties", rest: " - expense records, payment notes, and calculation results that have been submitted to the shared workspace." },
                { bold: "You are always in control of your own account.", rest: " You may leave a shared workspace, request deletion of your account, or withdraw access at any time without affecting the other parent's account." },
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  <strong className="font-semibold text-[#1a2e3b]">{t.bold}</strong>{t.rest}
                </li>
              ))}
            </ul>

            <div className="my-6 rounded-xl bg-[#1a2e3b] p-6">
              <p className="text-[0.9rem] leading-[1.7] text-white/85">
                <strong className="text-white">Your financial data is yours alone.</strong> We will never expose your payment details, card information, subscription status or personal income figures to another user - including your co-parent. These are held in strict confidence between you and Collaborate Technologies Ltd.
              </p>
            </div>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Legal and regulatory disclosure</h3>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">We may disclose data where required by law, court order or regulatory authority, or where necessary to protect the rights, property or safety of Collabor8, our users or others.</p>

            <h3 className="mb-2.5 mt-6 text-[0.95rem] font-semibold text-[#1a2e3b]">Business transfers</h3>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">If Collaborate Technologies Ltd is involved in a merger, acquisition or asset sale, personal data may be transferred. We will notify you by email before any such transfer occurs and before data becomes subject to a different privacy policy.</p>
          </section>

          {/* 5. International transfers */}
          <section ref={setRef("s5")} id="s5" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">05</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>International data transfers</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">Our primary infrastructure is located in the UK and EU (AWS eu-west-2). Some third-party processors are based in the United States. Where we transfer data outside the UK, we ensure appropriate safeguards are in place, including:</p>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                "UK International Data Transfer Agreements (IDTAs), or",
                "Standard Contractual Clauses (SCCs) approved by the European Commission, or",
                "Adequacy decisions under UK GDPR",
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[0.95rem] leading-[1.75] text-[#2d4a5e]">You may request a copy of the relevant transfer mechanism by contacting <a href="mailto:privacy@collaborate8.com" className="text-[#2a7c6f] hover:underline">privacy@collaborate8.com</a>.</p>
          </section>

          {/* 6. Retention */}
          <section ref={setRef("s6")} id="s6" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">06</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>How long we keep your data</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.86rem]">
                <thead>
                  <tr className="bg-[#2a7c6f]">
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Data type</th>
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Retention period</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Account data", "Duration of account + 30 days after deletion request"],
                    ["Financial records & calculations", "6 years from creation (Companies Act / HMRC requirement)"],
                    ["Payment records", "7 years (financial record-keeping obligation)"],
                    ["Support communications", "3 years from last interaction"],
                    ["Analytics data", "13 months (rolling), then aggregated / anonymised"],
                    ["Crash logs & error data", "90 days"],
                    ["Backups", "Deleted within 35 days of the live data deletion"],
                  ].map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-[#eaf5f3]"} hover:bg-[#dff0ed]`}>
                      <td className="border-b border-[#e0eaed] px-4 py-3 font-medium text-[#1a2e3b]">{row[0]}</td>
                      <td className="border-b border-[#e0eaed] px-4 py-3 text-[#2d4a5e]">{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">After applicable retention periods, data is securely deleted or anonymised so it can no longer be linked to you.</p>
          </section>

          {/* 7. Security */}
          <section ref={setRef("s7")} id="s7" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">07</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Security</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">We implement appropriate technical and organisational measures to protect your personal data. These include:</p>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                "AES-256 encryption at rest; TLS 1.2+ in transit",
                "Passwords stored using bcrypt with a per-user salt",
                "Role-based access controls - staff see only the minimum data needed",
                "Regular penetration testing and vulnerability assessments",
                "SOC 2-aligned processes for our cloud infrastructure",
                "Data breach response procedure - we will notify the ICO within 72 hours and affected users without undue delay where required",
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[0.95rem] leading-[1.75] text-[#2d4a5e]">If you discover a vulnerability, please report it responsibly to <a href="mailto:security@collaborate8.com" className="text-[#2a7c6f] hover:underline">security@collaborate8.com</a>.</p>
          </section>

          {/* 8. Your rights */}
          <section ref={setRef("s8")} id="s8" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">08</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Your rights under UK GDPR</h2>
            <p className="mb-4 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">You have the following rights in relation to your personal data. Contact us at <a href="mailto:privacy@collaborate8.com" className="text-[#2a7c6f] hover:underline">privacy@collaborate8.com</a> to exercise any of them. We will respond within one calendar month.</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { title: "Right of access", desc: "Request a copy of the personal data we hold about you (Subject Access Request)." },
                { title: "Right to rectification", desc: "Ask us to correct inaccurate or incomplete data." },
                { title: "Right to erasure", desc: "Request deletion of your data where there is no longer a lawful basis for processing." },
                { title: "Right to restriction", desc: "Ask us to pause processing while a dispute is resolved." },
                { title: "Right to portability", desc: "Receive your data in a structured, machine-readable format (JSON / CSV)." },
                { title: "Right to object", desc: "Object to processing based on legitimate interests or for direct marketing." },
                { title: "Withdraw consent", desc: "Where processing is based on consent, withdraw it at any time without affecting prior lawful processing." },
                { title: "Automated decisions", desc: "Not to be subject to solely automated decisions that produce significant effects." },
              ].map((r) => (
                <div key={r.title} className="rounded-xl border border-[#e0eaed] bg-white p-4 transition-all hover:border-[#c6e9e4] hover:shadow-md">
                  <div className="mb-1 text-[0.88rem] font-semibold text-[#1a2e3b]">{r.title}</div>
                  <div className="text-[0.8rem] leading-snug text-[#6b8494]">{r.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[#c6e9e4] border-l-[3px] border-l-[#2a7c6f] bg-[#eaf5f3] p-4">
              <div className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[#2a7c6f]">Right to complain</div>
              <p className="text-[0.88rem] leading-relaxed text-[#2d4a5e]">
                You have the right to lodge a complaint with the Information Commissioner's Office (ICO) at{" "}
                <a href="https://ico.org.uk" target="_blank" rel="noopener" className="text-[#2a7c6f] hover:underline">ico.org.uk</a>{" "}
                or by calling 0303 123 1113. We would appreciate the chance to address your concerns before you contact the ICO.
              </p>
            </div>
          </section>

          {/* 9. Cookies */}
          <section ref={setRef("s9")} id="s9" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">09</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Cookies & tracking technologies</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">We use cookies and similar technologies on collaborate8.com. You can manage your preferences via the cookie banner on your first visit or at any time in your account settings.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.86rem]">
                <thead>
                  <tr className="bg-[#2a7c6f]">
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Category</th>
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Examples</th>
                    <th className="px-4 py-3 text-left text-[0.8rem] font-semibold tracking-wide text-white">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Strictly necessary", "Session cookie, CSRF token", "Required for login and security - cannot be disabled"],
                    ["Functional", "Language preference", "Remember your settings"],
                    ["Analytics", "Google Analytics _ga", "Understand how users navigate the Service (IP anonymised)"],
                    ["Marketing", "Meta Pixel (if enabled)", "Measure ad campaign performance - only with your consent"],
                  ].map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-[#eaf5f3]"} hover:bg-[#dff0ed]`}>
                      <td className="border-b border-[#e0eaed] px-4 py-3 font-medium text-[#1a2e3b]">{row[0]}</td>
                      <td className="border-b border-[#e0eaed] px-4 py-3 text-[#2d4a5e]">{row[1]}</td>
                      <td className="border-b border-[#e0eaed] px-4 py-3 text-[#2d4a5e]">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 10. Third-party links */}
          <section ref={setRef("s10")} id="s10" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">10</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Third-party links</h2>
            <p className="text-[0.95rem] leading-[1.75] text-[#2d4a5e]">The Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to read their privacy policies before providing any personal data.</p>
          </section>

          {/* 11. Changes */}
          <section ref={setRef("s11")} id="s11" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">11</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Changes to this policy</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">We may update this Privacy Policy from time to time. When we make material changes we will:</p>
            <ul className="mb-4 flex flex-col gap-2">
              {[
                'Update the "Last updated" date at the top of this page',
                "Notify you by email at least 14 days before the change takes effect",
                "Where required, seek fresh consent",
              ].map((t, i) => (
                <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                  <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[0.95rem] leading-[1.75] text-[#2d4a5e]">Your continued use of the Service after the effective date constitutes acceptance of the updated policy.</p>
          </section>

          {/* 12. Contact us */}
          <section ref={setRef("s12")} id="s12" className="mb-14 scroll-mt-[90px]">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#2a7c6f]">12</div>
            <h2 className="mb-5 border-b border-[#e0eaed] pb-3 text-[1.65rem] font-normal leading-tight text-[#1a2e3b]" style={{ fontFamily: "'Fraunces', serif" }}>Contact us</h2>
            <p className="mb-3 text-[0.95rem] leading-[1.75] text-[#2d4a5e]">For any questions about this policy, to exercise your rights, or to raise a data concern:</p>
            <ul className="mb-4 flex flex-col gap-2">
              <li className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                <strong className="font-semibold text-[#1a2e3b]">Email:</strong>{" "}
                <a href="mailto:privacy@collaborate8.com" className="text-[#2a7c6f] hover:underline">privacy@collaborate8.com</a>
              </li>
              <li className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                <strong className="font-semibold text-[#1a2e3b]">Post:</strong> Data Protection, Collaborate Technologies Ltd, 86-90 Paul Street, London, EC2A 4NE
              </li>
              <li className="relative pl-5 text-[0.92rem] leading-relaxed text-[#2d4a5e]">
                <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-[#3a9e8e]" />
                <strong className="font-semibold text-[#1a2e3b]">Response time:</strong> We aim to acknowledge all requests within 5 business days
              </li>
            </ul>
            <div className="mt-6 rounded-xl border border-[#c6e9e4] border-l-[3px] border-l-[#2a7c6f] bg-[#eaf5f3] p-4">
              <div className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[#2a7c6f]">ICO Registration</div>
              <p className="text-[0.88rem] leading-relaxed text-[#2d4a5e]">
                Collaborate Technologies Ltd is registered with the Information Commissioner's Office (ICO) under registration number <strong className="font-semibold text-[#1a2e3b]">C1906893</strong>. You can verify this at{" "}
                <a href="https://ico.org.uk/about-the-ico/what-we-do/register-of-fee-payers/" target="_blank" rel="noopener" className="text-[#2a7c6f] hover:underline">ico.org.uk/register-of-fee-payers</a>.
              </p>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 bg-[#1a2e3b] px-[5vw] py-10">
        <div>
          <span className="text-[1.1rem] text-white/70" style={{ fontFamily: "'Fraunces', serif" }}>Collabor8</span>
          <p className="mt-1 text-[0.8rem] text-white/35">&copy; 2026 Collaborate Technologies Ltd. All rights reserved.</p>
        </div>
        <div className="text-right text-[0.8rem] text-white/35">
          <a href="/terms" className="text-white/50 hover:text-white/80">Terms of Service</a>
          {" · "}
          <a href="/privacy" className="text-white/50 hover:text-white/80">Privacy Policy</a>
          <span className="mt-1 block">86-90 Paul Street, London EC2A 4NE</span>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
