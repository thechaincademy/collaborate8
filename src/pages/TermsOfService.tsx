import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import TopBanner from "@/components/TopBanner";
import FooterContact from "@/components/FooterContact";

const sections = [
  { id: "s1", num: "01", label: "Who we are" },
  { id: "s2", num: "02", label: "Who can use Collabor8" },
  { id: "s3", num: "03", label: "Your account and security" },
  { id: "s4", num: "04", label: "What Collabor8 is, and what it is not" },
  { id: "s5", num: "05", label: "Linking with your co-parent" },
  { id: "s6", num: "06", label: "How you must behave" },
  { id: "s7", num: "07", label: "Payments" },
  { id: "s8", num: "08", label: "Premium" },
  { id: "s9", num: "09", label: "Your rights to cancel and refunds" },
  { id: "s10", num: "10", label: "Your content" },
  { id: "s11", num: "11", label: "Our intellectual property" },
  { id: "s12", num: "12", label: "Deleting your account" },
  { id: "s13", num: "13", label: "Availability and changes to the Service" },
  { id: "s14", num: "14", label: "Our responsibility to you" },
  { id: "s15", num: "15", label: "Suspending or ending your account" },
  { id: "s16", num: "16", label: "Changes to these terms" },
  { id: "s17", num: "17", label: "Law and disputes" },
  { id: "s18", num: "18", label: "Contact us" },
];

const P = ({ children, last }: { children: ReactNode; last?: boolean }) => (
  <p className={`${last ? "" : "mb-3"} text-[0.95rem] leading-[1.75] text-[#3D3D38]`}>{children}</p>
);

const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="mb-4 flex flex-col gap-2">
    {items.map((t, i) => (
      <li key={i} className="relative pl-5 text-[0.92rem] leading-relaxed text-[#3D3D38]">
        <span className="absolute left-0 top-[0.6em] h-[5px] w-[5px] rounded-full bg-foreground" />
        {t}
      </li>
    ))}
  </ul>
);

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="text-[#1A1A18] hover:underline">{children}</a>
);

const L = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-[#1A1A18] underline">{children}</Link>
);

const TermsOfService = () => {
  const [activeId, setActiveId] = useState("s1");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
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

  const Section = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => {
    const s = sections[n - 1];
    return (
      <section ref={(el) => { sectionRefs.current[s.id] = el; }} id={s.id} className="mb-14 scroll-mt-[90px]">
        <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#1A1A18]">{s.num}</div>
        <h2 className="mb-5 border-b border-[#E4E2DA] pb-3 text-[1.65rem] font-normal leading-tight text-[#1A1A18]" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h2>
        {children}
      </section>
    );
  };

  const details = [
    { label: "Company name", val: "Collaborate Technologies Ltd" },
    { label: "Registered in", val: "England and Wales" },
    { label: "Email", val: "jade@collaborate8.com", href: "mailto:jade@collaborate8.com" },
    { label: "Phone", val: "020 3488 1055", href: "tel:+442034881055" },
    { label: "Privacy questions", val: "privacy@collaborate8.com", href: "mailto:privacy@collaborate8.com" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background" style={{ fontFamily: "'Figtree', sans-serif" }}>
      <Helmet>
        <title>Terms of Service - Collabor8</title>
        <meta name="description" content="Collabor8 Terms of Service in plain English. The agreement between you and Collaborate Technologies Ltd for using the Collabor8 website and app." />
        <link rel="canonical" href="https://collaborate8.com/terms" />
        <meta property="og:url" content="https://collaborate8.com/terms" />
      </Helmet>

      <TopBanner />

      {/* Hero */}
      <div className="relative overflow-hidden bg-foreground px-[5vw] pb-16 pt-20">
        <div className="pointer-events-none absolute -top-[40%] right-[-10%] h-full w-[50vw] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-[30%] -left-[5%] h-[80%] w-[40vw] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_65%)]" />
        <div className="relative z-10 max-w-[760px]">
          <div className="mb-5 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[#1A1A18]">
            <span className="inline-block h-[1.5px] w-6 bg-foreground" />
            Legal
          </div>
          <h1 className="mb-5 text-[clamp(2.4rem,5vw,3.6rem)] font-light leading-[1.1] tracking-tight text-white" style={{ fontFamily: "'Fraunces', serif" }}>
            Terms of Service,<br /><em className="italic text-[#1A1A18]">in plain English.</em>
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-[0.85rem] text-white/50">
            <span>Last updated: 26 October 2026</span>
            <span className="h-1 w-1 rounded-full bg-background/20" />
            <span>Version 1.0</span>
            <span className="h-1 w-1 rounded-full bg-background/20" />
            <span>England and Wales law</span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1100px] gap-16 px-[5vw] pb-24 pt-12 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="md:sticky md:top-[90px] md:self-start">
          <div className="mb-4 border-b border-[#E4E2DA] pb-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#6B6B64]">Contents</div>
          <nav className="flex flex-wrap gap-1 md:flex-col md:gap-0">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-2 border-l-2 py-1.5 pl-3 text-[0.83rem] leading-snug transition-colors md:ml-[-0.75rem] ${
                  activeId === s.id
                    ? "border-[#1A1A18] text-[#1A1A18]"
                    : "border-transparent text-[#6B6B64] hover:text-[#1A1A18]"
                } max-md:ml-0 max-md:rounded-full max-md:border max-md:border-[#E4E2DA] max-md:bg-background max-md:px-3 max-md:py-1.5 max-md:text-[0.78rem] ${
                  activeId === s.id ? "max-md:border-[#E4D8C6] max-md:bg-secondary" : ""
                }`}
              >
                <span className="text-[0.7rem] font-semibold text-[#E4D8C6]">{s.num}</span>
                {s.label}
              </a>
            ))}
          </nav>
          <div className="mt-8 rounded-xl border border-[#E4D8C6] bg-secondary p-4">
            <p className="mb-2 text-[0.8rem] leading-snug text-[#3D3D38]">Questions about these terms?</p>
            <a href="mailto:jade@collaborate8.com" className="break-all text-[0.82rem] font-semibold text-[#1A1A18] hover:underline">jade@collaborate8.com</a>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-8 rounded-xl border border-[#E4D8C6] border-l-[3px] border-l-[#1A1A18] bg-secondary p-4">
            <div className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[#1A1A18]">About these terms</div>
            <p className="text-[0.88rem] leading-relaxed text-[#3D3D38]">
              These terms are the agreement between you and Collaborate Technologies Ltd ("Collabor8", "we", "us", "our") for using the Collabor8 website and app (the "Service"). Please read them with our <L to="/privacy">Privacy Policy</L> and <L to="/cookies">Cookie Policy</L>.
            </p>
          </div>

          <Section n={1} title="Who we are">
            <P>Collabor8 is run by Collaborate Technologies Ltd, registered in England and Wales.</P>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {details.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#E4E2DA] bg-background p-3.5">
                  <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#6B6B64]">{item.label}</div>
                  <div className="break-all text-[0.9rem] font-medium text-[#1A1A18]">
                    {item.href ? <A href={item.href}>{item.val}</A> : item.val}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-[#E4E2DA] bg-background p-3.5 sm:col-span-2">
                <div className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#6B6B64]">Postal address</div>
                <div className="text-[0.9rem] font-medium text-[#1A1A18]">86-90 Paul Street, London, EC2A 4NE</div>
              </div>
            </div>
            <P last>By creating an account or using the Service, you agree to these terms. If you do not agree, please do not use the Service.</P>
          </Section>

          <Section n={2} title="Who can use Collabor8">
            <P last>You must be 18 or over and live in the United Kingdom to create an account. Collabor8 is for parents and carers who share the costs of raising a child. You can only have one account, and it is for you alone.</P>
          </Section>

          <Section n={3} title="Your account and security">
            <List items={[
              "Give us accurate details and keep them up to date.",
              "Keep your password private. You are responsible for what happens in your account unless someone gets in because of something we did wrong.",
              <>Tell us straight away at <A href="mailto:privacy@collaborate8.com">privacy@collaborate8.com</A> if you think someone else has used your account.</>,
              "When you set up payouts, Stripe may ask you to verify your identity. This check is done by Stripe, not by us.",
            ]} />
          </Section>

          <Section n={4} title="What Collabor8 is, and what it is not">
            <P>Collabor8 helps separated parents organise child maintenance, shared expenses, payments, documents and conversations in one place.</P>
            <div className="my-6 rounded-xl border border-[#E4D8C6] border-l-[3px] border-l-[#1A1A18] bg-secondary p-4">
              <div className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[#1A1A18]">Please note</div>
              <p className="text-[0.88rem] leading-relaxed text-[#3D3D38]">Collabor8 is not a law firm, a financial adviser or the Child Maintenance Service, and is not connected to the government. We do not give legal or financial advice. Calculators, guides and statements are for information only and are not an official assessment. For advice about your situation, speak to a qualified solicitor or adviser, or contact the Child Maintenance Service.</p>
            </div>
            <P last>Our AI writing tool suggests calmer ways to word a message. Its suggestions are for information only, can be wrong, and are not legal advice or mediation by a person. You decide what you send, and you are responsible for it.</P>
          </Section>

          <Section n={5} title="Linking with your co-parent">
            <List items={[
              "You can invite your co-parent to link their account with yours. Once linked, you can both see the arrangements, expenses, payments, messages and documents you share. Each of you keeps your own login and private settings.",
              "Only invite the other parent or carer of your child, and only with an email address you are allowed to use.",
              "Either of you can unlink at any time.",
            ]} />
          </Section>

          <Section n={6} title="How you must behave">
            <P>Collabor8 is built for calm, child-focused communication. When you use it, you must not:</P>
            <List items={[
              "harass, threaten, abuse or intimidate anyone",
              "send messages or files that are hateful, sexual, misleading or unlawful",
              "pretend to be someone else, or use someone else's account",
              "upload false receipts or records",
              "try to break, overload or get around the security of the Service",
              "use the Service for anything unlawful.",
            ]} />
            <P last>We may remove content or suspend accounts that break these rules (see section 15). If you are worried about your safety, contact the emergency services on 999.</P>
          </Section>

          <Section n={7} title="Payments">
            <List items={[
              "Payments between co-parents, including recurring payments, are processed by Stripe. Stripe's terms apply to those payments, including the Stripe Connected Account Agreement for the parent receiving money.",
              "Money goes from the paying parent to the receiving parent's Stripe account. Collabor8 does not hold your money.",
              "Card details are handled by Stripe. We never see or store your full card number.",
              "We are not responsible for delays or failures caused by Stripe, your bank or your card provider, but we will help you sort them out where we can.",
              "Recording a payment in Collabor8 does not change any legal agreement or court order.",
            ]} />
          </Section>

          <Section n={8} title="Premium">
            <List items={[
              "Premium unlocks extra features, such as the AI writing tool. It costs £4.99 a month, billed yearly as £59.88, paid through Stripe.",
              "Your Premium renews automatically each year at the price shown to you, unless you cancel before the renewal date. We email you a reminder before each renewal.",
              "You can cancel at any time before your renewal date in the app under Chat, Manage subscription. You keep Premium until the end of the year you have paid for.",
              "Premium benefits apply only to the parent who pays for it, not to their linked co-parent.",
              "If we change the Premium price, we will tell you before your next renewal, and you can cancel before it applies.",
            ]} />
          </Section>

          <Section n={9} title="Your rights to cancel and refunds">
            <P last>If you buy Premium online, UK consumer law usually gives you 14 days from purchase to cancel and get a refund. If you start using Premium within those 14 days, we may take off an amount for the time you have used it. To cancel within 14 days, email <A href="mailto:jade@collaborate8.com">jade@collaborate8.com</A>. This does not affect your other legal rights as a consumer.</P>
          </Section>

          <Section n={10} title="Your content">
            <List items={[
              "You own the messages, receipts, documents and other content you add.",
              "You give us permission to store, process and show it so we can run the Service, for example showing your messages and records to your linked co-parent.",
              "You must have the right to share anything you upload.",
              "Keep your own copies of important documents. You can download your data from Settings.",
            ]} />
          </Section>

          <Section n={11} title="Our intellectual property">
            <P last>The Collabor8 name, logo, app, website, guides and design belong to Collaborate Technologies Ltd. You may use them only to use the Service for yourself, and you must not copy, sell or reuse them without our written permission.</P>
          </Section>

          <Section n={12} title="Deleting your account">
            <P>You can delete your account at any time in the app (Settings, Delete my account), on our <L to="/delete-account">Delete account page</L>, or by emailing <A href="mailto:rafa@collaborate8.com">rafa@collaborate8.com</A>. Download your data first if you want a copy.</P>
            <P>When you delete your account:</P>
            <List items={[
              "Any Collabor8 subscriptions you pay for through Stripe are cancelled automatically, so you will not be charged again.",
              'Payments you shared with your co-parent stay in their payment history, shown as from "Deleted user", so they still have a record of what was paid.',
              'Messages your co-parent received from you stay in their account, shown as from "Deleted user".',
              "Records only you were part of are deleted.",
              "All your other personal data is deleted within 30 days.",
            ]} />
            <P last>Deleting your account cannot be undone.</P>
          </Section>

          <Section n={13} title="Availability and changes to the Service">
            <P last>We work hard to keep Collabor8 running, but we cannot promise it will always be available or free of errors. We may need to pause it for maintenance or updates. We may change, add or remove features. If a change makes a paid feature you rely on noticeably worse, we will tell you and you can cancel.</P>
          </Section>

          <Section n={14} title="Our responsibility to you">
            <List items={[
              "If we break these terms or fail to use reasonable care and skill, we are responsible for loss you suffer that was a foreseeable result. We are not responsible for loss that was not foreseeable.",
              "We only provide the Service for personal use. We are not responsible for business losses.",
              "We are not responsible for decisions you make based on calculators, guides or AI suggestions, or for what other users say or do.",
              "Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit. Nothing here affects your legal rights as a consumer.",
            ]} />
          </Section>

          <Section n={15} title="Suspending or ending your account">
            <P last>We may suspend or close your account if you seriously or repeatedly break these terms, if the law requires it, or to protect other users. Where it is reasonable, we will warn you first and explain why. If we close your account without you being at fault, we will refund any Premium you have paid for and not yet used. You can stop using Collabor8 and delete your account at any time.</P>
          </Section>

          <Section n={16} title="Changes to these terms">
            <P last>We may update these terms. If a change is important, we will tell you by email or in the app before it takes effect. If you keep using Collabor8 after that, the new terms apply. If you do not agree, you can delete your account.</P>
          </Section>

          <Section n={17} title="Law and disputes">
            <P last>These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland, you can also bring a claim in your local courts. Please contact us first so we can try to sort out any problem.</P>
          </Section>

          <Section n={18} title="Contact us">
            <List items={[
              <><strong className="font-semibold text-[#1A1A18]">Post:</strong> Collaborate Technologies Ltd, 86-90 Paul Street, London, EC2A 4NE</>,
              <><strong className="font-semibold text-[#1A1A18]">Email:</strong> <A href="mailto:jade@collaborate8.com">jade@collaborate8.com</A></>,
              <><strong className="font-semibold text-[#1A1A18]">Phone:</strong> <A href="tel:+442034881055">020 3488 1055</A></>,
              <><strong className="font-semibold text-[#1A1A18]">Privacy questions:</strong> <A href="mailto:privacy@collaborate8.com">privacy@collaborate8.com</A></>,
            ]} />
          </Section>
        </main>
      </div>

      <footer className="bg-foreground px-[5vw] py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[1.1rem] text-white/70" style={{ fontFamily: "'Fraunces', serif" }}>Collabor8</span>
            <p className="mt-1 text-[0.8rem] text-white/35">&copy; {new Date().getFullYear()} Collaborate Technologies Ltd. All rights reserved.</p>
          </div>
          <div className="text-right text-[0.8rem] text-white/35">
            <Link to="/terms" className="text-white/50 hover:text-white/80">Terms of Service</Link>
            {" · "}
            <Link to="/privacy" className="text-white/50 hover:text-white/80">Privacy Policy</Link>
          </div>
        </div>
        <FooterContact onDark />
      </footer>
    </div>
  );
};

export default TermsOfService;
