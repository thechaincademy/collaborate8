import { useEffect, useState } from "react";
import { Clock, MessageCircle } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  isLinked: boolean;
  hasInvite: boolean;
  inviteEmail?: string | null;
}

/** Subtle relative-activity indicator shown beneath the co-parent status. */
const CoparentStatus = ({ isLinked, hasInvite, inviteEmail }: Props) => {
  const [lastActive, setLastActive] = useState<Date | null | undefined>(undefined);

  useEffect(() => {
    if (!isLinked) return;
    (supabase.rpc as any)("get_coparent_last_active").then(({ data }: { data: string | null }) =>
      setLastActive(data ? new Date(data) : null),
    );
  }, [isLinked]);

  if (!isLinked) {
    if (inviteEmail) {
      return (
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Invitation sent to <span className="font-semibold">{inviteEmail}</span></span>
        </span>
      );
    }
    if (hasInvite) {
      return (
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Clock className="h-3.5 w-3.5" /> Invitation not yet accepted
        </span>
      );
    }
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" /> Waiting for response
      </span>
    );
  }

  if (lastActive === undefined) return null;
  if (lastActive === null) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" /> Waiting for response
      </span>
    );
  }

  const days = differenceInCalendarDays(new Date(), lastActive);
  if (days <= 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Connected and active
      </span>
    );
  }
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
      Last active {days === 1 ? "yesterday" : `${days} days ago`}
    </span>
  );
};

export default CoparentStatus;
