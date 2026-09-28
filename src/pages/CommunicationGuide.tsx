import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const topics = [
  {
    title: "How to make a request without it sounding like a demand",
    points: [
      "Start with what you need, not what they did wrong: \"Could we look at...\" rather than \"You need to...\".",
      "Give a reason and a clear amount or date so it's easy to say yes.",
      "Offer a choice where you can, for example two dates that work for you.",
      "End with a question: \"Does that work for you?\"",
    ],
  },
  {
    title: "How to respond to a message that feels aggressive",
    points: [
      "Wait before replying - an hour or a night often helps.",
      "Reply only to the practical part of the message and leave the rest.",
      "Keep it short. Two or three sentences is usually enough.",
      "If it turns personal, say \"I'd like to keep this to the arrangement\" and stop there.",
    ],
  },
  {
    title: "How to raise a change in circumstances",
    points: [
      "Tell them early, before it affects a payment.",
      "Say what has changed and when - a new job, reduced hours, a move.",
      "Explain what it means for the arrangement in plain numbers.",
      "Suggest a time to talk it through rather than deciding alone.",
    ],
  },
  {
    title: "How to follow up on a missed payment without escalating",
    points: [
      "Assume a mistake first: \"I haven't seen this month's payment come through yet.\"",
      "Give the amount and the date it was due.",
      "Ask when you can expect it, rather than why it's late.",
      "If it keeps happening, keep a record here and consider the Child Maintenance Service.",
    ],
  },
  {
    title: "How to propose a review of the current arrangement",
    points: [
      "Pick a calm moment, not straight after a disagreement.",
      "Explain why a review makes sense now - costs, ages, time spent with each parent.",
      "Use the child maintenance calculator so you both start from the same figures.",
      "Agree a date to decide, so it doesn't drift.",
    ],
  },
];

export const CommunicationGuideContent = () => (
  <Accordion type="single" collapsible className="space-y-3">
    {topics.map((t) => (
      <AccordionItem key={t.title} value={t.title} className="overflow-hidden rounded-2xl border border-border bg-card">
        <AccordionTrigger className="gap-3 bg-primary/10 px-4 py-4 text-left text-sm font-semibold text-foreground hover:no-underline">
          <span className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
            {t.title}
          </span>
        </AccordionTrigger>
        <AccordionContent className="bg-card px-4 pb-4 pt-3">
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
            {t.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const CommunicationGuide = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-6 pb-24 pt-12 md:max-w-2xl">
      <Helmet>
        <title>Communication guide - Collabor8</title>
        <meta name="description" content="Practical words for difficult money conversations between co-parents." />
      </Helmet>
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-foreground">Communication guide</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Short, practical tips for difficult conversations.</p>

      <Accordion type="single" collapsible className="space-y-3">
        {topics.map((t) => (
          <AccordionItem key={t.title} value={t.title} className="overflow-hidden rounded-2xl border border-border bg-card">
            <AccordionTrigger className="gap-3 bg-primary/10 px-4 py-4 text-left text-sm font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                {t.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-card px-4 pb-4 pt-3">
              <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
                {t.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default CommunicationGuide;
