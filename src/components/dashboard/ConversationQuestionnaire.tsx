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

const INVITED_OPTION = "I am here because I was invited by my co-parent";

const commonSections = (isPayer: boolean): Section[] => [
  {
    title: "Section 1 of 7 - What brings you here today",
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
          "Raising a specific financial issue",
          "All of the above",
          "I am not sure yet - I want to get the conversation started",
          INVITED_OPTION,
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
          INVITED_OPTION,
        ],
      },
      {
        id: "communication",
        label:
          "How would you describe communication with your co-parent about finances right now?",
        type: "single",
        options: [
          "We do not communicate about finances at all",
          "We communicate but cannot reach agreement",
          "We communicate but would benefit from more structure",
          INVITED_OPTION,
        ],
      },
    ],
  },
  {
    title: "Section 2 of 7 - What you would like to achieve",
    questions: [
      {
        id: "outcome",
        label: "What is the most important outcome for you from this process?",
        type: "single",
        options: [
          "Agreeing a maintenance amount",
          "Reviewing an amount that no longer reflects current circumstances",
          "Agreeing how to split a specific expense",
          "Getting the conversation started in a structured way",
          INVITED_OPTION,
        ],
      },
      {
        id: "timeframe",
        label: "How soon would you like to make progress?",
        type: "single",
        options: [
          "As soon as possible",
          "No specific timeframe - I want to start when we are both ready",
          INVITED_OPTION,
        ],
      },
    ],
  },
  {
    title: "Section 3 of 7 - The financial picture",
    questions: isPayer
      ? [
          {
            id: "cms_formula",
            label:
              "Are you willing to use the CMS statutory formula as the basis for a maintenance calculation?",
            type: "single",
            options: ["Yes", "I would prefer we agree a different amount", "I am not sure yet", INVITED_OPTION],
          },
          {
            id: "share_income",
            label:
              "Are you willing to share your approximate gross annual income to generate a suggested figure?",
            type: "single",
            options: ["Yes", "No, I would prefer to discuss this directly", INVITED_OPTION],
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
              INVITED_OPTION,
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
              INVITED_OPTION,
            ],
          },
        ],
  },
  {
    title: "Section 4 of 7 - Shared expenses",
    questions: [
      {
        id: "shared_expenses",
        label: "Are there shared expenses you would like to discuss?",
        type: "single",
        options: ["Yes", "No", "Not right now but possibly in future", INVITED_OPTION],
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
          INVITED_OPTION,
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
          INVITED_OPTION,
        ],
        showIf: { id: "shared_expenses", values: ["Yes"] },
      },
    ],
  },
  {
    title: "Section 5 of 7 - What you can agree on",
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
          INVITED_OPTION,
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
          INVITED_OPTION,
        ],
      },
    ],
  },
];

const NOTE_MAX = 150;

interface CostEntry {
  amount: string;
  period: "weekly" | "monthly";
}

const COST_CATEGORIES: { id: string; label: string; hint: string }[] = [
  { id: "housing", label: "Housing", hint: "Rent, mortgage or housing costs related to the child" },
  { id: "transportation", label: "Transportation", hint: "Travel costs related to the child" },
  { id: "education", label: "Education", hint: "School fees, trips, uniforms, stationery" },
  { id: "childcare", label: "Childcare", hint: "" },
  { id: "health", label: "Health", hint: "Medical, dental or optical costs" },
  { id: "activities", label: "Activities", hint: "Clubs, sports, hobbies or leisure" },
];

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
  const totalSteps = sections.length + 2; // + costs (6) + optional note (7)
  const costsStep = sections.length;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [costs, setCosts] = useState<Record<string, CostEntry>>({});
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

  const updateCost = (id: string, patch: Partial<CostEntry>) => {
    setCosts((prev) => ({
      ...prev,
      [id]: { amount: "", period: "monthly", ...prev[id], ...patch },
    }));
  };

  const enteredCosts = COST_CATEGORIES.filter((c) => {
    const v = parseFloat(costs[c.id]?.amount ?? "");
    return !Number.isNaN(v) && v > 0;
  });

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const payload: Record<string, unknown> = { ...answers };
    if (enteredCosts.length > 0) {
      const cleaned: Record<string, CostEntry> = {};
      for (const c of enteredCosts) cleaned[c.id] = costs[c.id];
      payload.shared_costs = cleaned;
    }
    const { error } = await supabase.from("conversation_tool_responses").insert({
      user_id: user.id,
      answers: payload as never,
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
            : inviteSent
              ? "Your answers have been saved. An email has been sent to your co-parent inviting them to participate. You will be notified when they have completed the process and your shared summary is ready. This may take up to 14 days."
              : "Your answers have been saved. You will be notified when your co-parent has completed the process and your shared summary is ready. This may take up to 14 days."}
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

  const stepLabel =
    step < sections.length ? `Step ${step + 1} of ${totalSteps}` : `Step ${step + 1} of ${totalSteps}`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-navy p-4 text-navy-foreground">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-foreground/15 text-navy-foreground transition-colors hover:bg-navy-foreground/25"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-foreground/70">
              {stepLabel}
            </p>
            <Progress
              value={progress}
              className="mt-1.5 h-2 bg-navy-foreground/20 [&>div]:bg-gold"
            />
          </div>
          <span className="text-xs font-semibold text-navy-foreground/80">{progress}%</span>
        </div>
      </div>

      {currentSection ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-teal p-4 text-teal-foreground">
            <h2 className="text-base font-semibold">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="mt-1 text-xs text-teal-foreground/80">{currentSection.description}</p>
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
                        ? "border-gold bg-gold/20 font-medium"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <span>{option}</span>
                    {isSelected(q, option) && (
                      <Check className="h-4 w-4 shrink-0 text-teal" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button
            className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
            disabled={!sectionComplete}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        </div>
      ) : step === costsStep ? (
        <div className="space-y-5">
          <div className="rounded-2xl bg-teal p-4 text-teal-foreground">
            <h2 className="text-base font-semibold">
              Section 6 of 7 - Provide further details on your costs (optional)
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            This section is completely optional. If you choose to complete it, the information you
            enter here will be shared with your co-parent as part of the summary. Your questionnaire
            answers will remain private and will not be shared. If you do not want this information
            shared with your co-parent, leave this section blank and click Continue.
          </p>

          <div className="space-y-3">
            {COST_CATEGORIES.map((c) => {
              const entry = costs[c.id] ?? { amount: "", period: "monthly" as const };
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-sm font-medium">{c.label}</p>
                  {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        £
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={entry.amount}
                        onChange={(e) => updateCost(c.id, { amount: e.target.value })}
                      />
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-border text-xs">
                      {(["weekly", "monthly"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateCost(c.id, { period: p })}
                          className={
                            entry.period === p
                              ? "bg-teal px-3 py-2 font-medium text-teal-foreground"
                              : "bg-background px-3 py-2 text-muted-foreground"
                          }
                        >
                          {p === "weekly" ? "Weekly" : "Monthly"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Only complete the categories that are relevant to your situation. You do not need to
            complete all of them.
          </p>

          {enteredCosts.length > 0 ? (
            <p className="text-xs text-teal">
              The costs you have entered will be shared with your co-parent. Your questionnaire
              answers will not be shared.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              You have not entered any costs. Nothing from this section will be shared with your
              co-parent.
            </p>
          )}

          <Button
            className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-teal p-4 text-teal-foreground">
            <h2 className="text-base font-semibold">Section 7 of 7 - Comments (optional)</h2>
            <p className="mt-1 text-xs text-teal-foreground/80">
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

          <Button
            className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
            onClick={finish}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finish
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConversationQuestionnaire;
