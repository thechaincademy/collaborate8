import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const CONVERSATION_TOOL_PRICE = "£29.99";

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const PRIVACY_TEXT =
  "An automated invitation will be sent to your co-parent on your behalf. A single automated reminder will follow if they have not responded within seven days. A final automated notice will be sent at fourteen days if there is still no response. After this point no further contact will be made. We will not store your co-parent's email address on our system beyond this process. It will be deleted within thirty days if no engagement occurs.";

/**
 * Shown immediately after payment is confirmed and before the questionnaire begins.
 * Confirms the saved co-parent email address, or asks for one if none is stored.
 */
export const ConversationEmailStep = ({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (email: string) => void;
}) => {
  const { user } = useAuth();
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"confirm" | "input">("input");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setLoading(true);

    (async () => {
      let found: string | null = null;
      if (user) {
        const { data } = await supabase
          .from("invitations")
          .select("invitee_email, created_at")
          .eq("inviter_id", user.id)
          .not("invitee_email", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        found = (data?.invitee_email as string | null) ?? null;
      }
      setSavedEmail(found);
      setMode(found ? "confirm" : "input");
      setLoading(false);
    })();
  }, [open, user]);

  const submitTyped = () => {
    const value = email.trim();
    if (!isValidEmail(value)) {
      toast.error("Please enter your co-parent's email address");
      return;
    }
    onOpenChange(false);
    onConfirm(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <div className="rounded-t-lg bg-navy p-5 text-navy-foreground">
          <h2 className="text-lg font-semibold leading-snug">
            Your co-parent&apos;s invitation
          </h2>
        </div>

        <div className="space-y-4 p-5 text-sm text-foreground">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : mode === "confirm" && savedEmail ? (
            <>
              <p>We will send your co-parent&apos;s invitation to the following email address:</p>
              <p className="break-all rounded-xl border border-border bg-card p-3 font-medium">
                {savedEmail}
              </p>
              <p>Is this correct?</p>
              <p className="text-xs text-muted-foreground">{PRIVACY_TEXT}</p>
              <div className="space-y-2">
                <Button
                  className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                  onClick={() => {
                    onOpenChange(false);
                    onConfirm(savedEmail);
                  }}
                >
                  Yes, send to this address
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode("input");
                    setEmail("");
                  }}
                >
                  No, use a different address
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="conversation-coparent-email" className="text-sm font-medium">
                  {savedEmail
                    ? "Enter your co-parent's email address"
                    : "Where should we send your co-parent's invitation?"}
                </label>
                <Input
                  id="conversation-coparent-email"
                  type="email"
                  inputMode="email"
                  placeholder="co-parent@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {!savedEmail && (
                  <p className="text-sm text-muted-foreground">
                    Please enter the email address your co-parent uses regularly. The invitation
                    will be sent here on your behalf once you have completed your questions.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{PRIVACY_TEXT}</p>
              </div>
              <div className="space-y-2">
                <Button
                  className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                  onClick={submitTyped}
                >
                  Continue
                </Button>
                {savedEmail && (
                  <Button variant="ghost" className="w-full" onClick={() => setMode("confirm")}>
                    Back
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export interface CostEntry {
  amount: string;
  period: "weekly" | "monthly";
}

export type SharedCosts = Record<string, CostEntry>;

const COST_CATEGORIES: { id: string; label: string; hint: string }[] = [
  { id: "housing", label: "Housing", hint: "Rent, mortgage or housing costs related to the child" },
  { id: "transportation", label: "Transportation", hint: "Travel costs related to the child" },
  { id: "education", label: "Education", hint: "School fees, trips, uniforms, stationery" },
  { id: "childcare", label: "Childcare", hint: "" },
  { id: "health", label: "Health", hint: "Medical, dental or optical costs" },
  { id: "activities", label: "Activities", hint: "Clubs, sports, hobbies or leisure" },
];

/**
 * Optional costs step shown after the co-parent email is confirmed and
 * before the questionnaire begins. Anything entered is shared with the
 * co-parent as part of the summary; questionnaire answers stay private.
 */
export const ConversationCostsStep = ({
  open,
  onOpenChange,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onContinue: (costs: SharedCosts) => void;
}) => {
  const [costs, setCosts] = useState<SharedCosts>({});

  useEffect(() => {
    if (open) setCosts({});
  }, [open]);

  const update = (id: string, patch: Partial<CostEntry>) => {
    setCosts((prev) => ({
      ...prev,
      [id]: { amount: "", period: "monthly", ...prev[id], ...patch },
    }));
  };

  const entered = COST_CATEGORIES.filter((c) => {
    const v = parseFloat(costs[c.id]?.amount ?? "");
    return !Number.isNaN(v) && v > 0;
  });
  const hasCosts = entered.length > 0;

  const submit = () => {
    const cleaned: SharedCosts = {};
    for (const c of entered) cleaned[c.id] = costs[c.id];
    onOpenChange(false);
    onContinue(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <div className="rounded-t-lg bg-navy p-5 text-navy-foreground">
          <h2 className="text-lg font-semibold leading-snug">
            Provide further details on your costs (optional)
          </h2>
        </div>

        <div className="space-y-4 p-5 text-sm text-foreground">
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
                        onChange={(e) => update(c.id, { amount: e.target.value })}
                      />
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-border text-xs">
                      {(["weekly", "monthly"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => update(c.id, { period: p })}
                          className={
                            entry.period === p
                              ? "bg-primary px-3 py-2 font-medium text-primary-foreground"
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

          {hasCosts ? (
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
            onClick={submit}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useConversationToolAccess = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return false;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("conversation-tool-access", {
      body: { action: "status" },
    });
    setLoading(false);
    if (error) return false;
    const granted = !!data?.hasAccess;
    setHasAccess(granted);
    return granted;
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { hasAccess, loading, refresh, setHasAccess };
};

export const ConversationToolModal = ({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStart?: () => void;
}) => {
  const { hasAccess, loading, refresh } = useConversationToolAccess();
  const [promo, setPromo] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleStart = () => {
    onOpenChange(false);
    onStart?.();
  };

  const startCheckout = async () => {
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("conversation-tool-access", {
      body: { action: "create-checkout" },
    });
    setPaying(false);

    if (error || data?.error) {
      toast.error("We could not start the payment. Please try again.");
      return;
    }
    if (data?.hasAccess) {
      await refresh();
      handleStart();
      return;
    }
    if (data?.url) window.location.href = data.url as string;
  };

  const redeem = async () => {
    const code = promo.trim();
    if (!code) {
      toast.error("Please enter your promotional code");
      return;
    }
    setRedeeming(true);
    const { data, error } = await supabase.functions.invoke("conversation-tool-access", {
      body: { action: "redeem-promo", code },
    });
    setRedeeming(false);

    if (error || data?.error) {
      toast.error((data?.error as string) || "That promotional code is not valid");
      return;
    }
    await refresh();
    toast.success("Promotional code applied - you have free access");
    handleStart();
  };




  return (

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <div className="rounded-t-lg bg-navy p-5 text-navy-foreground">
          <h2 className="text-lg font-semibold leading-snug">
            Start the financial conversation.
          </h2>
        </div>

        <div className="space-y-4 p-5 text-sm text-foreground">
          <p>
            Sometimes the most difficult part is knowing where to begin. This tool gives both parents a private, structured way to set out what they would like to discuss - before any direct conversation takes place.
          </p>

          <p>
            Once you complete a short set of questions, an email is sent to your co-parent inviting them to do the same. Neither of you will see the other&apos;s answers. Once both parents have completed the process, a shared summary is generated showing where you agree and where further discussion may help - giving you both a neutral starting point for your financial chat.
          </p>

          <div>
            <p className="mb-2 font-medium">This tool is for parents who:</p>
            <ul className="list-disc space-y-1 pl-5 text-foreground/90">
              <li>Want to put a financial arrangement in place for the first time</li>
              <li>Have an existing arrangement but want to discuss shared expenses or a specific financial issue</li>
              <li>Have an existing arrangement that needs to be reviewed</li>
              <li>Want to open a financial conversation but are not sure how to start</li>
              <li>Would benefit from a structured, documented starting point before speaking directly</li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-medium">What happens:</p>
            <ul className="list-disc space-y-1 pl-5 text-foreground/90">
              <li>You complete a short set of questions privately - takes around five minutes</li>
              <li>An email is sent to your co-parent on your behalf inviting them to participate</li>
              <li>Your co-parent has 14 days to complete their own questions - there is no cost to them</li>
              <li>Once both are done, a shared summary is sent to each of you by email</li>
              <li>Your financial chat opens with that summary as your starting point</li>
            </ul>
          </div>

          <p className="text-foreground/90">
            This is a self-guided financial conversation tool. It is not a professional mediation service and does not replace professional family mediation.
          </p>

          <p className="font-semibold">
            {CONVERSATION_TOOL_PRICE} - one-off payment. Only one parent pays. Your co-parent participates for free.
          </p>

        </div>


        <div className="space-y-3 border-t border-border p-5 pt-3">
          {hasAccess ? (
            <Button
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
              onClick={handleStart}
              disabled={loading}
            >
              Start now
            </Button>
          ) : (
            <>
              <Button
                className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                onClick={startCheckout}
                disabled={loading || paying}
              >
                {paying ? "Opening payment..." : `Pay ${CONVERSATION_TOOL_PRICE} and start`}
              </Button>

            </>
          )}


          <p className="text-center text-xs text-muted-foreground">
            If your co-parent does not respond within 14 days, you will hear from us about next steps.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ConversationToolBanner = ({ onOpen }: { onOpen: () => void }) => (
  <div className="mb-3 rounded-2xl bg-teal p-4 text-teal-foreground">
    <p className="text-xs leading-relaxed">
      Sometimes the hardest part of managing finances after separation is knowing where to begin.
      Unlock the Self-Guided Financial Conversation Tool - both parents answer questions privately,
      and a shared summary shows where you agree and where further conversation is needed.
    </p>
    <Button
      size="sm"
      onClick={onOpen}
      className="mt-3 bg-gold text-gold-foreground hover:bg-gold/90"
    >
      Find out more
    </Button>
  </div>
);

export const ConversationToolSuggestionCard = ({ onOpen }: { onOpen: () => void }) => (
  <div className="mt-4 rounded-2xl bg-navy p-4 text-navy-foreground">
    <p className="text-xs leading-relaxed">
      Not getting a response? The Self-Guided Financial Conversation Tool lets both parents answer
      questions privately - before any direct conversation takes place. An email is sent to your
      co-parent on your behalf inviting them to participate. Once both have completed the process, a
      shared summary is generated showing where you agree and where further discussion may be needed.
    </p>
    <Button
      size="sm"
      onClick={onOpen}
      className="mt-3 bg-gold text-gold-foreground hover:bg-gold/90"
    >
      Unlock for {CONVERSATION_TOOL_PRICE}
    </Button>
  </div>
);

export const useConversationToolModal = () => {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
};
