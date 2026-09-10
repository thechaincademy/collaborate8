import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MessageCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Topic = {
  id: string;
  title: string;
  intro: string;
  prompts: { parentA: string; parentB: string }[];
};

const TOPICS: Topic[] = [
  {
    id: "expenses",
    title: "Shared expenses",
    intro: "If you're a family that shares certain expenses, use this tool to decide how you'll split one-off costs.",
    prompts: [
      {
        parentA: "Which categories of expenses should be shared 50/50?",
        parentB: "Which categories of expenses should be shared 50/50?",
      },
      {
        parentA: "What's your limit before we should discuss a purchase first?",
        parentB: "What's your limit before we should discuss a purchase first?",
      },
    ],
  },
  {
    id: "schooling",
    title: "Schooling & activities",
    intro: "Talk through education choices and extracurriculars.",
    prompts: [
      {
        parentA: "Which activities do you think are most important to fund?",
        parentB: "Which activities do you think are most important to fund?",
      },
      {
        parentA: "How should we handle school trip requests?",
        parentB: "How should we handle school trip requests?",
      },
    ],
  },
  {
    id: "holidays",
    title: "Holidays & birthdays",
    intro: "Plan how gifts, holidays and special occasions are shared.",
    prompts: [
      {
        parentA: "What's a comfortable budget for birthday gifts?",
        parentB: "What's a comfortable budget for birthday gifts?",
      },
      {
        parentA: "How would you like to split holiday costs?",
        parentB: "How would you like to split holiday costs?",
      },
    ],
  },
  {
    id: "communication",
    title: "How we communicate",
    intro: "Set expectations for how and when you'll talk about money.",
    prompts: [
      {
        parentA: "How often should we review our arrangement?",
        parentB: "How often should we review our arrangement?",
      },
      {
        parentA: "What's the best way to raise a disagreement calmly?",
        parentB: "What's the best way to raise a disagreement calmly?",
      },
    ],
  },
];

const LetsChatTool = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Topic | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { a: string; b: string }>>({});
  const [done, setDone] = useState(false);

  const key = (topicId: string, i: number) => `${topicId}-${i}`;

  const currentAnswer = selected ? answers[key(selected.id, step)] ?? { a: "", b: "" } : { a: "", b: "" };

  const updateAnswer = (who: "a" | "b", value: string) => {
    if (!selected) return;
    setAnswers((prev) => ({
      ...prev,
      [key(selected.id, step)]: { ...currentAnswer, [who]: value },
    }));
  };

  const goBack = () => {
    if (done) {
      setDone(false);
      return;
    }
    if (!selected) {
      navigate(-1);
      return;
    }
    if (step === 0) {
      setSelected(null);
      return;
    }
    setStep(step - 1);
  };

  const next = () => {
    if (!selected) return;
    if (step < selected.prompts.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Let's chat tool - Collabor8</title>
        <meta name="description" content="An interactive guide for co-parents to discuss and reach agreement on key financial and parenting issues together." />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <div className="px-6 pt-4">
          <button onClick={goBack} aria-label="Go back" className="mb-4 flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-6 pb-8">
          {!selected && !done && (
            <>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft">
                <MessageCircle className="h-7 w-7 text-clay" />
              </div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Let's chat tool</h1>
              <p className="mb-8 text-muted-foreground">
                An interactive guide for both parents to work through together. Pick a topic, take turns answering the prompts, and use your answers to reach agreement.
              </p>
              <div className="flex flex-col gap-3">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelected(t); setStep(0); }}
                    className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-clay"
                  >
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.intro}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {selected && !done && (
            <>
              <p className="mb-1 text-sm font-medium text-clay">{selected.title}</p>
              <p className="mb-6 text-sm text-muted-foreground">
                Question {step + 1} of {selected.prompts.length}
              </p>

              <div className="mb-4 rounded-2xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent A</p>
                <p className="mb-3 text-foreground">{selected.prompts[step].parentA}</p>
                <Textarea
                  value={currentAnswer.a}
                  onChange={(e) => updateAnswer("a", e.target.value)}
                  placeholder="Parent A's answer..."
                  className="min-h-[90px] rounded-xl border-border bg-background"
                />
              </div>

              <div className="mb-6 rounded-2xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent B</p>
                <p className="mb-3 text-foreground">{selected.prompts[step].parentB}</p>
                <Textarea
                  value={currentAnswer.b}
                  onChange={(e) => updateAnswer("b", e.target.value)}
                  placeholder="Parent B's answer..."
                  className="min-h-[90px] rounded-xl border-border bg-background"
                />
              </div>

              <div className="flex-1" />

              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={goBack} className="flex-1">
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button size="lg" onClick={next} className="flex-1 bg-clay text-clay-foreground hover:bg-clay/90">
                  {step < selected.prompts.length - 1 ? (<>Next <ChevronRight className="ml-1 h-4 w-4" /></>) : "Finish"}
                </Button>
              </div>
            </>
          )}

          {done && selected && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-clay-soft">
                <Check className="h-8 w-8 text-clay" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Great conversation</h2>
              <p className="mb-8 text-muted-foreground">
                You've worked through the {selected.title.toLowerCase()} prompts together. Talk through where your answers align and where you'd like to keep discussing.
              </p>
              <div className="flex w-full flex-col gap-3">
                <Button size="lg" onClick={() => { setSelected(null); setStep(0); setDone(false); }} className="bg-clay text-clay-foreground hover:bg-clay/90">
                  Choose another topic
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate(-1)}>
                  Back to resources
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LetsChatTool;
