import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const CONVERSATION_TOOL_PRICE = "£29.99";

export const ConversationToolModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => (
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

      <div className="space-y-2 border-t border-border p-5 pt-3">
        <Button
          className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
          onClick={() =>
            toast.info("Payment for this tool isn't switched on yet - we'll let you know as soon as it is.")
          }
        >
          Start now - {CONVERSATION_TOOL_PRICE}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          If your co-parent does not respond within 14 days, you will hear from us about next steps.
        </p>
      </div>
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
