import { useState } from "react";
import { Check, Lock, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const CONVERSATION_TOOL_PRICE = "£29.99";

const steps = [
  "Both parents answer the same set of financial questions privately, in their own time.",
  "We email your co-parent on your behalf inviting them to take part.",
  "Once both have finished, a shared summary shows where you agree and where more discussion is needed.",
];

export const ConversationToolModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
      <DialogHeader>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-teal text-teal-foreground">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <DialogTitle className="text-left text-lg">
          Self-Guided Financial Conversation Tool
        </DialogTitle>
        <DialogDescription className="text-left">
          A structured way to start the money conversation - without needing to agree on anything
          first.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            <p className="text-sm text-foreground/80">{s}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-2xl border border-border bg-secondary p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-foreground">One-off payment</span>
          <span className="text-xl font-bold text-foreground">{CONVERSATION_TOOL_PRICE}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Covers both parents. No subscription, no renewal.
        </p>
      </div>

      <Button
        className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
        onClick={() =>
          toast.info("Payment for this tool isn't switched on yet - we'll let you know as soon as it is.")
        }
      >
        <Lock className="h-4 w-4" /> Unlock for {CONVERSATION_TOOL_PRICE}
      </Button>
    </DialogContent>
  </Dialog>
);

export const ConversationToolBanner = ({ onOpen }: { onOpen: () => void }) => (
  <div className="mb-3 rounded-2xl bg-teal p-4 text-teal-foreground">
    <p className="text-xs leading-relaxed">
      Want a structured way to start your financial conversation? Unlock the Self-Guided Financial
      Conversation Tool - both parents answer questions privately, and a shared summary shows where
      you agree.
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
