import { ArrowLeft, Calculator } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const articles = [
  {
    id: "what-is",
    num: "01",
    title: "What is child maintenance?",
    summary: "The basics, what it covers, and why it matters.",
    body: (
      <>
        <p>
          Child maintenance is money that one parent pays to the other to help
          cover the everyday costs of raising their child - food, clothes,
          school supplies, and a roof over their head. It's not about keeping
          score, it's about making sure your child has what they need.
        </p>
        <p>
          Both parents are legally responsible for financially supporting their
          child under the Child Support Act 1991, whether you were married, in
          a long-term relationship, or never lived together.
        </p>
        <p className="font-medium text-foreground">What it covers:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Housing and household bills</li>
          <li>Food, clothing, and toiletries</li>
          <li>School supplies and childcare costs</li>
          <li>General day-to-day living expenses</li>
        </ul>
        <p>
          One-off extras like school trips, sports clubs, or dental bills are
          usually agreed separately.
        </p>
      </>
    ),
  },
  {
    id: "who-pays",
    num: "02",
    title: "Who pays, and how much?",
    summary: "Work out a fair amount using the standard UK formula.",
    body: (
      <>
        <p>
          Usually the parent who spends less time with the child (the paying
          parent) makes regular payments to the parent who provides day-to-day
          care (the receiving parent).
        </p>
        <p className="font-medium text-foreground">The standard UK formula</p>
        <p>Based on the paying parent's gross weekly income:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>1 child - 12% of gross weekly income</li>
          <li>2 children - 16% of gross weekly income</li>
          <li>3 or more children - 19% of gross weekly income</li>
        </ul>
        <p>
          So if the paying parent earns £500 gross per week with one child, the
          starting figure is around £60 per week, or about £260 per month.
        </p>
        <p className="font-medium text-foreground">What adjusts the amount</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Overnight stays with the paying parent reduce the figure</li>
          <li>Supporting other children reduces the assessable amount</li>
          <li>A smaller flat rate applies for very low incomes</li>
        </ul>
      </>
    ),
  },
  {
    id: "set-up",
    num: "03",
    title: "How to set up payments",
    summary: "The simplest way to arrange and run child maintenance.",
    body: (
      <>
        <p className="font-medium text-foreground">Family-based arrangement</p>
        <p>
          The simplest route: you and the other parent agree an amount, pick a
          schedule, and manage it directly. No waiting, no bureaucracy, no
          fees. Collabor8 is built for exactly this.
        </p>
        <p className="font-medium text-foreground">Child Maintenance Service</p>
        <p>
          The CMS is a government service that can calculate, and in some
          cases collect, payments. If you're using it, set the CMS amount up in
          Collabor8 and the app handles tracking, reminders, and receipts.
        </p>
        <p className="font-medium text-foreground">Court orders</p>
        <p>
          If a court has set the amount, that's your starting point. Add it as
          a recurring payment in Collabor8 and run everything from there.
        </p>
      </>
    ),
  },
  {
    id: "shared",
    num: "04",
    title: "Shared and additional expenses",
    summary: "School trips, clubs, uniforms - the extras.",
    body: (
      <>
        <p>
          Regular maintenance covers everyday costs, but kids come with extras:
          school trips, club fees, uniforms, birthday parties, dental bills.
          These are usually agreed separately and split fairly between both
          parents.
        </p>
        <p>
          The clearest approach is to log each extra cost as it happens, attach
          a receipt, and agree how it's split. Collabor8's expenses feature
          does this for you - both parents see the same record, so there's no
          back-and-forth.
        </p>
        <p className="font-medium text-foreground">A few ground rules help</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Agree in advance for anything significant</li>
          <li>Keep receipts so it's never about trust</li>
          <li>Default to 50/50 unless your situation needs otherwise</li>
        </ul>
      </>
    ),
  },
  {
    id: "rights",
    num: "05",
    title: "Your rights and responsibilities",
    summary: "What the law says and what happens if things go wrong.",
    body: (
      <>
        <p>
          Both parents share legal responsibility for supporting their child
          under the Child Support Act 1991. That doesn't change with
          separation, distance, or new relationships.
        </p>
        <p className="font-medium text-foreground">If payments stop</p>
        <p>
          Start by talking. Circumstances change - job loss, illness, new
          children - and a quick conversation often resolves things. If it
          doesn't, the CMS can step in to calculate, collect, and enforce
          payments.
        </p>
        <p className="font-medium text-foreground">Keeping a clear record</p>
        <p>
          A shared record protects both of you. It shows what's been paid,
          when, and what's been agreed on extras - so disagreements rarely
          escalate. That's what Collabor8 is for.
        </p>
        <p className="italic text-muted-foreground">
          This guide is for information only and isn't legal advice. For your
          specific situation, speak to a qualified professional.
        </p>
      </>
    ),
  },
];

const ChildMaintenanceGuideApp = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-12">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Guide</h1>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-6 mt-6 rounded-3xl bg-primary p-6 text-primary-foreground"
      >
        <span className="mb-3 inline-block rounded-full bg-background/20 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wider">
          UK guide
        </span>
        <h2 className="mb-2 text-2xl font-bold leading-tight">
          Child maintenance made simple
        </h2>
        <p className="text-sm text-primary-foreground/80">
          Everything you need to know about your responsibilities, your
          options, and how to manage it without the stress.
        </p>
      </motion.div>

      {/* Calculator CTA */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onClick={() => navigate("/child-maintenance-calculator")}
        className="mx-6 mt-4 flex w-[calc(100%-3rem)] items-center gap-4 rounded-2xl bg-card p-4 text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Calculator className="h-6 w-6 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Work out a figure</p>
          <p className="text-sm text-muted-foreground">
            Use the calculator with the UK standard formula
          </p>
        </div>
      </motion.button>

      {/* Articles */}
      <div className="px-6 pt-8">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          In this guide
        </h3>
        <Accordion type="single" collapsible className="space-y-3">
          {articles.map((a) => (
            <AccordionItem
              key={a.id}
              value={a.id}
              className="overflow-hidden rounded-2xl border border-border bg-card px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-start gap-3 text-left">
                  <span className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {a.num}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                      {a.summary}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-5 text-sm leading-relaxed text-muted-foreground">
                {a.body}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Footer link */}
      <div className="mt-8 px-6 text-center">
        <Link
          to="/resources/child-maintenance-guide"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Read the full web guide
        </Link>
      </div>
    </div>
  );
};

export default ChildMaintenanceGuideApp;
