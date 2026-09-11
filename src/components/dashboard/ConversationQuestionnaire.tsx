import { useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type QuestionType = "single" | "multi";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options: string[];
  /** Only show when the referenced question has one of these answers */
  showIf?: { id: string; values: string[] };
}

interface Section {
  title: string;
  description?: string;
  questions: Question[];
}

const commonSections = (isPayer: boolean): Section[] => [
  {
    title: "Section 1 of 6 - What brings you here today",
    description:
      "Both parents want to feel this process is relevant to their specific situation, whatever stage they are at.",
    questions: [
      {
        id: "purpose",
        label: "What would you like to use this tool to discuss?",
        type: "single",
        options: [
          "Putting an arrangement in place for the first time",
          "Reviewing an existing arrangement",
          "Discussing shared expenses",
          "Raising a specific financial issue",
          "All of the above",
          "I am not sure yet - I want to get the conversation started",
        ],
      },
      {
        id: "existing_arrangement",
        label: "Do you currently have any financial arrangement in place with your co-parent?",
        type: "single",
        options: [
          "Yes, a private agreement between us",
          "Yes, through the Child Maintenance Service",
          "We had one but it has broken down",
          "No arrangement in place",
        ],
      },
      {
        id: "communication",
        label:
          "How would you describe communication with your co-parent about finances right now?",
        type: "single",
        options: [
          "We do not communicate about finances at all",
          "We communicate but it tends to lead to conflict",
          "We communicate occasionally but avoid the topic",
          "We communicate but cannot reach agreement",
          "We communicate but would benefit from more structure",
        ],
      },
    ],
  },
  {
    title: "Section 2 of 6 - What you would like to achieve",
    questions: [
      {
        id: "outcome",
        label: "What is the most important outcome for you from this process?",
        type: "single",
        options: [
          "Agreeing a maintenance amount",
          "Reviewing an amount that no longer reflects current circumstances",
          "Agreeing how to split a specific expense",
          "Creating a shared record of what we have agreed",
          "Getting the conversation started in a structured way",
          "Understanding what I am entitled to or responsible for",
        ],
      },
      {
        id: "timeframe",
        label: "How soon would you like to make progress?",
        type: "single",
        options: [
          "As soon as possible",
          "Within the next month",
          "Within the next three months",
          "No specific timeframe - I want to start when we are both ready",
        ],
      },
    ],
  },
  {
    title: "Section 3 of 6 - The financial picture",
    questions: isPayer
      ? [
          {
            id: "cms_formula",
            label:
              "Are you willing to use the CMS statutory formula as the basis for a maintenance calculation?",
            type: "single",
            options: ["Yes", "I would prefer we agree a different amount", "I am not sure yet"],
          },
          {
            id: "share_income",
            label:
              "Are you willing to share your approximate gross annual income to generate a suggested figure?",
            type: "single",
            options: ["Yes", "No, I would prefer to discuss this directly"],
            showIf: { id: "cms_formula", values: ["Yes"] },
          },
          {
            id: "income_band",
            label: "Approximate gross annual income:",
            type: "single",
            options: [
              "Under £20,000",
              "£20,001 to £30,000",
              "£30,001 to £40,000",
              "£40,001 to £60,000",
              "£60,001 to £80,000",
              "Over £80,000",
            ],
            showIf: { id: "share_income", values: ["Yes"] },
          },
        ]
      : [
          {
            id: "cms_formula",
            label:
              "Are you willing to use the CMS statutory formula as the basis for a maintenance calculation?",
            type: "single",
            options: [
              "Yes",
              "I would prefer we agree a different amount",
              "I am not sure yet - I would like to discuss this",
            ],
          },
        ],
  },
  {
    title: "Section 4 of 6 - Shared expenses",
    questions: [
      {
        id: "shared_expenses",
        label: "Are there shared expenses you would like to discuss?",
        type: "single",
        options: ["Yes", "No", "Not right now but possibly in future"],
      },
      {
        id: "expense_areas",
        label: "Which areas would you like to discuss?",
        type: "multi",
        options: [
          "School fees or trips",
          "Uniforms or clothing",
          "Medical or dental costs",
          "Sports clubs or activities",
          "Childcare",
          "Holidays",
          "Special occasions",
          "Other",
        ],
        showIf: { id: "shared_expenses", values: ["Yes"] },
      },
      {
        id: "expense_goal",
        label: "For the areas you selected, what would you like to achieve?",
        type: "multi",
        options: [
          "Agree how to split the cost",
          "Agree a process for raising these costs in future",
          "Understand what each parent currently contributes",
          "Create a shared record of contributions",
        ],
        showIf: { id: "shared_expenses", values: ["Yes"] },
      },
    ],
  },
  {
    title: "Section 5 of 6 - What you can agree on",
    questions: [
      {
        id: "agreements",
        label: "Select everything you feel you could agree on at this stage:",
        type: "multi",
        options: [
          "Both parents want what is best for our child",
          "A regular maintenance payment should be in place",
          "Shared expenses should be discussed and agreed in advance",
          "A written record of our agreements would be helpful",
          "A structured space for financial conversations would help us both",
          "We may benefit from additional support to reach agreement",
        ],
      },
      {
        id: "support",
        label: "What would make this process easier for you?",
        type: "multi",
        options: [
          "More information about how the CMS calculates maintenance",
          "A suggested starting figure based on the statutory formula",
          "A written summary of what we have discussed",
          "Access to professional mediation",
          "Legal advice",
          "Nothing - I am ready to begin",
        ],
      },
    ],
  },
];

const NOTE_MAX = 150;

const ConversationQuestionnaire = ({
  isPayer,
  recipientEmail,
  onClose,
}: {
  isPayer: boolean;
  recipientEmail?: string;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const sections = useMemo(() => commonSections(isPayer), [isPayer]);
  const totalSteps = sections.length + 1; // + optional section 6

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const visible = (q: Question) => {
    if (!q.showIf) return true;
    const dep = answers[q.showIf.id];
    return typeof dep === "string" && q.showIf.values.includes(dep);
  };

  const currentSection = sections[step];
  const currentQuestions = currentSection ? currentSection.questions.filter(visible) : [];
  const sectionComplete = currentQuestions.every((q) => {
    const a = answers[q.id];
    return q.type === "multi" ? Array.isArray(a) && a.length > 0 : Boolean(a);
  });

  const progress = Math.round((step / totalSteps) * 100);

  const select = (q: Question, option: string) => {
    setAnswers((prev) => {
      if (q.type === "single") return { ...prev, [q.id]: option };
      const current = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
      return {
        ...prev,
        [q.id]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
  };

  const isSelected = (q: Question, option: string) => {
    const a = answers[q.id];
    return q.type === "multi" ? Array.isArray(a) && a.includes(option) : a === option;
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("conversation_tool_responses").insert({
      user_id: user.id,
      answers: answers as never,
      note: note.trim() || null,
      completed_at: new Date().toISOString(),
    });
    if (error) {
      setSaving(false);
      toast.error("We couldn't save your answers. Please try again.");
      return;
    }

    // If the co-parent has already completed their questions, the shared
    // summary email goes out to both parents now.
    try {
      const { data } = await supabase.functions.invoke("conversation-summary");
      if (data?.ready) setSummaryReady(true);
    } catch {
      // Summary can be generated later - never block the confirmation screen.
    }

    // Send the invitation email to Parent B if an email was provided.
    if (recipientEmail) {
      try {
        await supabase.functions.invoke("send-conversation-invite", {
          body: { recipientEmail },
        });
        setInviteSent(true);
      } catch {
        // The invitation can be re-sent later - never block the confirmation screen.
      }
    }

    setSaving(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col justify-center rounded-2xl bg-navy p-6 text-navy-foreground">
        <p className="text-sm leading-relaxed">
          {summaryReady
            ? "Your answers have been saved. Your co-parent has also completed their questions, so your shared summary has been emailed to you both. Your financial chat is ready."
            : "Your answers have been saved. An email has been sent to your co-parent inviting them to participate. You will be notified when they have completed the process and your shared summary is ready. This may take up to 14 days."}
        </p>
        <Button
          className="mt-6 w-full bg-gold text-gold-foreground hover:bg-gold/90"
          onClick={onClose}
        >
          Return to Collabor8
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>

      {currentSection ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="mt-1 text-xs text-muted-foreground">{currentSection.description}</p>
            )}
          </div>

          {currentQuestions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">{q.label}</p>
              <div className="grid gap-2">
                {q.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => select(q, option)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      isSelected(q, option)
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <span>{option}</span>
                    {isSelected(q, option) && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button
            className="w-full"
            disabled={!sectionComplete}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold">Section 6 of 6 - Optional</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              This is optional. Whatever you write here will be shared with your co-parent as part
              of the summary.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Is there anything you would like your co-parent to know before you begin your
              financial conversation?
            </p>
            <Textarea
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Optional"
              rows={4}
            />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/{NOTE_MAX}
            </p>
          </div>

          <Button className="w-full" onClick={finish} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finish
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConversationQuestionnaire;
