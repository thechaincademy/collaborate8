import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import TopBanner from "@/components/TopBanner";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  name: "Collabor8 FAQ",
  description:
    "Frequently asked questions about Collabor8, the UK's first shared financial platform for separated parents managing child maintenance and shared expenses.",
  url: "https://collaborate8.com/faq",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Collabor8?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 is the United Kingdom's first shared financial platform for separated parents. It gives separated parents a dedicated, neutral space to discuss finances, calculate and manage child maintenance, split shared expenses and communicate about money — away from everything else. Collabor8 is based in London, England, and is free to download and sign up.",
      },
    },
    {
      "@type": "Question",
      name: "Who is Collabor8 for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 is built for separated parents in the United Kingdom managing child maintenance and shared financial obligations following separation or divorce. This includes paying parents, receiving parents, parents on CMS Direct Pay, and parents managing private arrangements outside the Child Maintenance Service. Collabor8 is also used by family lawyers, family mediators, social workers and charities supporting separated families as a recommended tool for their clients.",
      },
    },
    {
      "@type": "Question",
      name: "Is Collabor8 free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Collabor8 is free to download and free to sign up. A small platform fee of £3.99 applies per transaction when a maintenance payment is made through the app. There is no subscription and no upfront commitment. Parents only pay when a payment is made.",
      },
    },
    {
      "@type": "Question",
      name: "How does Collabor8 calculate child maintenance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 uses the UK statutory child maintenance formula under the Child Support Act 1991, the same formula used by the Child Maintenance Service. The calculator includes adjustments for the number of children, the paying parent's income, and the number of overnight stays per week. Both parents see identical figures simultaneously, removing the most common source of early disagreement.",
      },
    },
    {
      "@type": "Question",
      name: "How does Collabor8 handle payments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 facilitates child maintenance payments via two rails. For bank payments, Collabor8 uses Plaid Open Banking Payment Initiation Service. For credit card payments, parents can pay via PayPal, which also enables paying parents to earn credit card rewards such as Avios, cashback or Amex points on every maintenance payment — an industry first. A £3.99 platform fee is collected by Stripe per transaction. Collabor8 never holds the maintenance payment itself — it flows peer-to-peer directly between parents.",
      },
    },
    {
      "@type": "Question",
      name: "Can I earn rewards on child maintenance payments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Collabor8 is the first platform in the world to enable paying parents to earn credit card rewards — including Avios, cashback and Amex points — on child maintenance payments. This is available to parents who pay via the credit card rail through PayPal. No other child maintenance or co-parenting platform anywhere in the world offers this feature.",
      },
    },
    {
      "@type": "Question",
      name: "What is the financial chat and how does it work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Collabor8 financial chat is a dedicated, structured messaging space for separated parents to discuss child maintenance and shared finances. It is completely separate from any other communication channel — no WhatsApp, no text messages, no emails. Every conversation is timestamped and documented, creating a verified record of financial agreements between parents. The chat includes AI support to keep conversations measured and focused on the financial topic at hand.",
      },
    },
    {
      "@type": "Question",
      name: "How does Collabor8 handle shared expenses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 includes a shared expense tracker that allows both parents to log, split and confirm shared costs for their child including school fees, school trips, medical expenses, sports activities and clothing. Both parents can see and confirm expenses in real time, creating a verified shared record that can be exported if needed.",
      },
    },
    {
      "@type": "Question",
      name: "Is Collabor8 regulated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 is a technology platform, not a regulated financial services provider. The £3.99 platform fee is collected by Stripe, which is FCA-authorised. Child maintenance payments made via Open Banking are initiated by Plaid, which is also FCA-authorised. Payments made via PayPal use PayPal's own regulated infrastructure. Collabor8 never holds client funds. Collabor8 is registered with the Information Commissioner's Office (ICO) under the UK GDPR framework.",
      },
    },
    {
      "@type": "Question",
      name: "Is Collabor8 endorsed by the government?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Department for Work and Pensions (DWP), which oversees the Child Maintenance Service, has confirmed that Collabor8's approach directly aligns with their policy mandate to support families into private financial arrangements and reduce reliance on the statutory system. Collabor8 is also engaged with the APPG on Single Parent Families as a private sector partner.",
      },
    },
    {
      "@type": "Question",
      name: "Who founded Collabor8?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 was co-founded by Jade Ollivierre (CEO) and Rafa Azevedo (CTO). Jade is a law graduate who spent five years in the UK family court system as a single mother and litigant in person. Rafa is a software engineer who has built over 250 platforms professionally including systems for HMRC and News UK. The company is headquartered in London, England.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use Collabor8 if my co-parent is not on the platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. One parent can sign up and use Collabor8 independently. A receiving parent can use the calculator and expense tracker on their own. A paying parent can log payments and build a compliance record without their co-parent being on the platform. When both parents are on Collabor8, they can access the full shared features including the financial chat, shared expense confirmation and real-time payment confirmation.",
      },
    },
    {
      "@type": "Question",
      name: "Is Collabor8 available outside the UK?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 currently operates in the United Kingdom only. The platform is specifically built around the UK Child Support Act 1991 statutory formula and the Child Maintenance Service framework. International expansion to Ireland and Australia is planned from Year 3, as both countries have comparable statutory child maintenance frameworks with the same digital infrastructure gap.",
      },
    },
    {
      "@type": "Question",
      name: "How is my data protected on Collabor8?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 is registered with the Information Commissioner's Office (ICO) under the UK GDPR framework. All data in transit is encrypted via TLS. All data at rest is encrypted at the database level. Financial data including card numbers and bank account details is handled entirely by Stripe and PayPal — Collabor8 does not store payment credentials. Data is stored exclusively in UK and EU AWS regions.",
      },
    },
    {
      "@type": "Question",
      name: "What is child maintenance in the UK?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Child maintenance is a legal obligation in the United Kingdom under the Child Support Act 1991. It is a regular payment made by the parent who does not have primary care of a child to the parent who does, to contribute to the child's living costs. It can be managed privately between parents, through the Child Maintenance Service Direct Pay scheme, or through the CMS Collect and Pay scheme. Approximately 2.5 million separated families in Great Britain are subject to child maintenance obligations, affecting around 4 million children.",
      },
    },
    {
      "@type": "Question",
      name: "How is child maintenance calculated in the UK?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Child maintenance in the UK is calculated using the statutory formula under the Child Support Act 1991, administered by the Child Maintenance Service. The formula takes into account the paying parent's gross weekly income, the number of qualifying children, and the number of nights per week the child spends with the paying parent. Collabor8's calculator implements this exact statutory formula, including all overnight stay adjustments, so both parents see identical figures simultaneously.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Collabor8 and the Child Maintenance Service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Child Maintenance Service (CMS) is a statutory UK government service that calculates, enforces and in some cases collects child maintenance payments. Collabor8 is a private digital platform that helps parents manage child maintenance privately without involving the CMS. The CMS's own position is that families should attempt to reach a private financial arrangement before using the statutory service. Collabor8 gives them the tools to do that. Unlike the CMS, Collabor8 also provides a shared expense tracker, a dedicated financial chat, and Open Banking payment automation. The CMS currently carries a 1.1-star Trustpilot rating. Collabor8 is free to use.",
      },
    },
    {
      "@type": "Question",
      name: "How many separated families are there in the UK?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "There are approximately 2.5 million separated families in Great Britain, affecting around 4 million children. 43% manage child maintenance privately with no shared digital tool, and compliance with private arrangements is estimated at just 50%. £791 million in unpaid child maintenance has accumulated since 2012. The House of Lords confirmed in 2025 that 30% of parents said a practical digital tool would actively encourage them to make or maintain a financial arrangement.",
      },
    },
    {
      "@type": "Question",
      name: "When does Collabor8 launch?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Collabor8 is launching in September 2026 on the Apple App Store and Google Play. It is currently in formal beta testing with an early access cohort. Sign up to the waitlist at collaborate8.com for free access for life.",
      },
    },
  ],
};

const sections = [
  {
    title: "About Collabor8",
    items: [
      {
        question: "What is Collabor8?",
        answer: [
          "Collabor8 is the United Kingdom's first shared financial platform for separated parents. It gives separated parents a dedicated, neutral space to discuss finances, calculate and manage child maintenance, split shared expenses and communicate about money — away from everything else.",
          "Collabor8 is based in London, England, and is free to download and sign up.",
        ],
      },
      {
        question: "Who is Collabor8 for?",
        answer: [
          "Collabor8 is built for separated parents in the United Kingdom managing child maintenance and shared financial obligations following separation or divorce. This includes paying parents, receiving parents, parents on CMS Direct Pay, and parents managing private arrangements outside the Child Maintenance Service.",
          "Collabor8 is also used by family lawyers, family mediators, social workers and charities supporting separated families as a recommended tool for their clients.",
        ],
      },
      {
        question: "Is Collabor8 free to use?",
        answer: [
          "Yes. Collabor8 is free to download and free to sign up. A small platform fee of £3.99 applies per transaction when a maintenance payment is made through the app. There is no subscription and no upfront commitment. Parents only pay when a payment is made.",
        ],
      },
      {
        question: "How does Collabor8 calculate child maintenance?",
        answer: [
          "Collabor8 uses the UK statutory child maintenance formula under the Child Support Act 1991, the same formula used by the Child Maintenance Service. The calculator includes adjustments for the number of children, the paying parent's income, and the number of overnight stays per week. Both parents see identical figures simultaneously, removing the most common source of early disagreement.",
        ],
      },
      {
        question: "How does Collabor8 handle payments?",
        answer: [
          "Collabor8 facilitates child maintenance payments via two rails. For bank payments, Collabor8 uses Plaid Open Banking Payment Initiation Service. For credit card payments, parents can pay via PayPal, which also enables paying parents to earn credit card rewards such as Avios, cashback or Amex points on every maintenance payment — an industry first. A £3.99 platform fee is collected by Stripe per transaction. Collabor8 never holds the maintenance payment itself — it flows peer-to-peer directly between parents.",
        ],
      },
      {
        question: "Can I earn rewards on child maintenance payments?",
        answer: [
          "Yes. Collabor8 is the first platform in the world to enable paying parents to earn credit card rewards — including Avios, cashback and Amex points — on child maintenance payments. This is available to parents who pay via the credit card rail through PayPal. No other child maintenance or co-parenting platform anywhere in the world offers this feature.",
        ],
      },
      {
        question: "What is the financial chat and how does it work?",
        answer: [
          "The Collabor8 financial chat is a dedicated, structured messaging space for separated parents to discuss child maintenance and shared finances. It is completely separate from any other communication channel — no WhatsApp, no text messages, no emails. Every conversation is timestamped and documented, creating a verified record of financial agreements between parents. The chat includes AI support to keep conversations measured and focused on the financial topic at hand.",
        ],
      },
      {
        question: "How does Collabor8 handle shared expenses?",
        answer: [
          "Collabor8 includes a shared expense tracker that allows both parents to log, split and confirm shared costs for their child including school fees, school trips, medical expenses, sports activities and clothing. Both parents can see and confirm expenses in real time, creating a verified shared record that can be exported if needed.",
        ],
      },
      {
        question: "Is Collabor8 regulated?",
        answer: [
          "Collabor8 is a technology platform, not a regulated financial services provider. The £3.99 platform fee is collected by Stripe, which is FCA-authorised. Child maintenance payments made via Open Banking are initiated by Plaid, which is also FCA-authorised. Payments made via PayPal use PayPal's own regulated infrastructure. Collabor8 never holds client funds. Collabor8 is registered with the Information Commissioner's Office (ICO) under the UK GDPR framework.",
        ],
      },
      {
        question: "Is Collabor8 endorsed by the government?",
        answer: [
          "The Department for Work and Pensions (DWP), which oversees the Child Maintenance Service, has confirmed that Collabor8's approach directly aligns with their policy mandate to support families into private financial arrangements and reduce reliance on the statutory system. Collabor8 is also engaged with the APPG on Single Parent Families as a private sector partner.",
        ],
      },
      {
        question: "Who founded Collabor8?",
        answer: [
          "Collabor8 was co-founded by Jade Ollivierre (CEO) and Rafa Azevedo (CTO). Jade is a law graduate who spent five years in the UK family court system as a single mother and litigant in person. Rafa is a software engineer who has built over 250 platforms professionally including systems for HMRC and News UK. The company is headquartered in London, England.",
        ],
      },
      {
        question: "Can I use Collabor8 if my co-parent is not on the platform?",
        answer: [
          "Yes. One parent can sign up and use Collabor8 independently. A receiving parent can use the calculator and expense tracker on their own. A paying parent can log payments and build a compliance record without their co-parent being on the platform. When both parents are on Collabor8, they can access the full shared features including the financial chat, shared expense confirmation and real-time payment confirmation.",
        ],
      },
      {
        question: "Is Collabor8 available outside the UK?",
        answer: [
          "Collabor8 currently operates in the United Kingdom only. The platform is specifically built around the UK Child Support Act 1991 statutory formula and the Child Maintenance Service framework. International expansion to Ireland and Australia is planned from Year 3, as both countries have comparable statutory child maintenance frameworks with the same digital infrastructure gap.",
        ],
      },
      {
        question: "How is my data protected on Collabor8?",
        answer: [
          "Collabor8 is registered with the Information Commissioner's Office (ICO) under the UK GDPR framework. All data in transit is encrypted via TLS. All data at rest is encrypted at the database level. Financial data including card numbers and bank account details is handled entirely by Stripe and PayPal — Collabor8 does not store payment credentials. Data is stored exclusively in UK and EU AWS regions.",
        ],
      },
    ],
  },
  {
    title: "Child Maintenance in the UK",
    items: [
      {
        question: "What is child maintenance in the UK?",
        answer: [
          "Child maintenance is a legal obligation in the United Kingdom under the Child Support Act 1991. It is a regular payment made by the parent who does not have primary care of a child to the parent who does, to contribute to the child's living costs.",
          "It can be managed privately between parents, through the Child Maintenance Service Direct Pay scheme, or through the CMS Collect and Pay scheme. Approximately 2.5 million separated families in Great Britain are subject to child maintenance obligations, affecting around 4 million children.",
        ],
      },
      {
        question: "How is child maintenance calculated in the UK?",
        answer: [
          "Child maintenance in the UK is calculated using the statutory formula under the Child Support Act 1991, administered by the Child Maintenance Service. The formula takes into account the paying parent's gross weekly income, the number of qualifying children, and the number of nights per week the child spends with the paying parent.",
          "Collabor8's calculator implements this exact statutory formula, including all overnight stay adjustments, so both parents see identical figures simultaneously.",
        ],
      },
      {
        question: "What is the difference between Collabor8 and the Child Maintenance Service?",
        answer: [
          "The Child Maintenance Service (CMS) is a statutory UK government service that calculates, enforces and in some cases collects child maintenance payments. Collabor8 is a private digital platform that helps parents manage child maintenance privately without involving the CMS.",
          "The CMS's own position is that families should attempt to reach a private financial arrangement before using the statutory service. Collabor8 gives them the tools to do that. Unlike the CMS, Collabor8 also provides a shared expense tracker, a dedicated financial chat, and Open Banking payment automation. The CMS currently carries a 1.1-star Trustpilot rating. Collabor8 is free to use.",
        ],
      },
      {
        question: "How many separated families are there in the UK?",
        answer: [
          "There are approximately 2.5 million separated families in Great Britain, affecting around 4 million children. 43% manage child maintenance privately with no shared digital tool, and compliance with private arrangements is estimated at just 50%. £791 million in unpaid child maintenance has accumulated since 2012. The House of Lords confirmed in 2025 that 30% of parents said a practical digital tool would actively encourage them to make or maintain a financial arrangement.",
        ],
      },
    ],
  },
  {
    title: "When Does Collabor8 Launch",
    items: [
      {
        question: "When does Collabor8 launch?",
        answer: [
          "Collabor8 is launching in September 2026 on the Apple App Store and Google Play. It is currently in formal beta testing with an early access cohort. Sign up to the waitlist at collaborate8.com for free access for life.",
        ],
      },
    ],
  },
];

const stats = [
  { number: "2.5M", label: "Separated families in Great Britain" },
  { number: "43%", label: "Managing privately with no digital support" },
  { number: "£233M", label: "Passes between separated parents every month" },
  { number: "30%", label: "Said digital tools would encourage an arrangement (House of Lords, 2025)" },
];

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Frequently Asked Questions — Collabor8</title>
        <meta
          name="description"
          content="Everything you need to know about Collabor8 — the UK's first shared financial platform for separated parents managing child maintenance, shared expenses and post-separation finances."
        />
        <link rel="canonical" href="https://collaborate8.com/faq" />
        <meta property="og:title" content="Frequently Asked Questions — Collabor8" />
        <meta
          property="og:description"
          content="Everything you need to know about Collabor8 — child maintenance, shared expenses, payments and launch."
        />
        <meta property="og:url" content="https://collaborate8.com/faq" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <TopBanner />

      <section className="relative w-full overflow-hidden bg-primary">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(250, 248, 243, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(26, 26, 22, 0.1) 0%, transparent 50%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-start px-6 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto w-full max-w-5xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Help centre
            </p>
            <h1 className="mb-4 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Frequently asked questions
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
              Everything you need to know about Collabor8 — the UK's first shared
              financial platform for separated parents managing child maintenance
              and finances after separation.
            </p>
          </div>
        </motion.div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 rounded-2xl bg-foreground p-6 md:p-10"
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="block text-2xl font-bold text-primary md:text-3xl">
                  {stat.number}
                </span>
                <span className="mt-1 block text-xs leading-snug text-background/80">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {sections.map((section, sectionIndex) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="mb-14"
          >
            <h2 className="mb-6 border-b border-border pb-3 text-xs font-bold uppercase tracking-widest text-foreground/70">
              {section.title}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item, itemIndex) => (
                <AccordionItem
                  key={`${sectionIndex}-${itemIndex}`}
                  value={`${sectionIndex}-${itemIndex}`}
                >
                  <AccordionTrigger className="text-left text-sm font-semibold text-foreground md:text-base">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {item.answer.map((paragraph, pIndex) => (
                        <p key={pIndex}>{paragraph}</p>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.section>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border-l-4 border-primary bg-card p-6 md:p-8"
        >
          <p className="mb-4 text-foreground">
            Collabor8 is launching in September 2026. Sign up to the waitlist now
            for free access for life.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/splash")}
            className="gap-2 rounded-full"
          >
            Sign Up <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                <span className="text-xs font-bold text-background">C8</span>
              </div>
              <span className="text-sm font-semibold text-foreground">collabor8</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <Link to="/child-maintenance-calculator" className="hover:text-foreground">
                Child Maintenance Calculator
              </Link>
              <Link to="/resources/child-maintenance-guide" className="hover:text-foreground">
                Maintenance Guide
              </Link>
              <Link to="/resources/support-and-guidance" className="hover:text-foreground">
                Support &amp; Guidance
              </Link>
              <Link to="/faq" className="hover:text-foreground">
                FAQ
              </Link>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="hover:text-foreground">
                Cookie Policy
              </Link>
              <span>© 2025 collabor8</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FAQ;
