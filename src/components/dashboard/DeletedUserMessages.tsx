import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string; body: string; sender_id: string | null; created_at: string };

/** Earlier chat with a co-parent who deleted their account. Their side is shown as "Deleted user". */
const DeletedUserMessages = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("messages").select("id, body, sender_id, created_at")
      .or(`and(sender_id.is.null,recipient_id.eq.${user.id}),and(sender_id.eq.${user.id},recipient_id.is.null)`)
      .order("created_at", { ascending: true }).limit(200)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [user]);

  if (!rows.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Earlier messages with Deleted user</h2>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {rows.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={mine ? "self-end text-right" : "self-start"}>
              {!mine && <p className="mb-0.5 text-xs text-muted-foreground">Deleted user</p>}
              <p className={mine ? "rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-sm text-background" : "rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground"}>{m.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeletedUserMessages;
