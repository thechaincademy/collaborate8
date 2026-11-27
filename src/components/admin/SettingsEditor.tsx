import { useCallback, useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Platform settings editor. Values go straight to the admin-config edge function, which
// checks the format and keeps secrets in Supabase Vault. Secret values never come back.

type Item = {
  name: string; label: string; secret: boolean; multiline: boolean; note: string | null;
  set: boolean; source: "admin" | "secret" | null; value: string | null;
  updated_at: string | null; updated_by_email: string | null;
};
type Status = { store_ready: boolean; groups: { group: string; items: Item[] }[] };

const errorText = async (error: unknown, fallback: string) => {
  try {
    const b = await (error as { context?: Response })?.context?.json();
    if (b?.error) return String(b.error);
  } catch { /* keep fallback */ }
  return fallback;
};

const ukDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UK" : "";

export const SettingsEditor = ({ steps }: { steps: Record<string, string> }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ name: string; ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("admin-config", { body: { action: "status" } });
    if (error) setLoadError(await errorText(error, "Could not load settings."));
    else { setLoadError(null); setStatus(data as Status); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (item: Item) => {
    setBusy(item.name);
    const { data, error } = await supabase.functions.invoke("admin-config", { body: { action: "set", name: item.name, value } });
    setBusy(null);
    if (error || !data?.ok) {
      setMessage({ name: item.name, ok: false, text: await errorText(error, "Could not save. Try again later.") });
      return;
    }
    setValue("");
    setEditing(null);
    setMessage({ name: item.name, ok: true, text: "Saved. It applies within about a minute." });
    await load();
  };

  const remove = async (item: Item) => {
    setBusy(item.name);
    const { data, error } = await supabase.functions.invoke("admin-config", { body: { action: "remove", name: item.name } });
    setBusy(null);
    if (error || !data?.ok) {
      setMessage({ name: item.name, ok: false, text: await errorText(error, "Could not remove. Try again later.") });
      return;
    }
    setMessage({ name: item.name, ok: true, text: data.falls_back_to_secret ? "Removed. The Supabase secret is used again." : "Removed." });
    await load();
  };

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (!status) return <p className="text-sm text-muted-foreground">Loading settings...</p>;

  return (
    <div className="space-y-4">
      {!status.store_ready && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Changing settings here is switched on once a pending database update is approved. Until then this shows what is set on the server.
        </p>
      )}
      {status.groups.map((g) => {
        const allSet = g.items.every((i) => i.set);
        return (
          <Card key={g.group}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{g.group}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${allSet ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{allSet ? "Set" : "Missing"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm">
              {steps[g.group] && <p className="text-muted-foreground">{steps[g.group]}</p>}
              <ul className="divide-y">
                {g.items.map((i) => (
                  <li key={i.name} className="space-y-2 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{i.label} <span className="font-mono text-xs text-muted-foreground">{i.name}</span></p>
                        {!i.secret && i.value && <p className="break-all font-mono text-xs">{i.value}</p>}
                        <p className="text-xs text-muted-foreground">
                          {i.source === "admin" ? `Set here${i.updated_by_email ? ` by ${i.updated_by_email}` : ""}${i.updated_at ? `, ${ukDate(i.updated_at)}` : ""}` : i.source === "secret" ? "Set as a Supabase secret" : "Not set"}
                        </p>
                        {i.note && <p className="text-xs text-muted-foreground">{i.note}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={!status.store_ready || busy === i.name}
                          onClick={() => { setEditing(editing === i.name ? null : i.name); setValue(!i.secret && i.value ? i.value : ""); setMessage(null); }}>
                          {i.set ? "Change" : "Set"}
                        </Button>
                        {i.source === "admin" && (
                          <Button size="sm" variant="outline" disabled={busy === i.name} onClick={() => void remove(i)}>Remove</Button>
                        )}
                      </div>
                    </div>
                    {editing === i.name && (
                      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void save(i); }}>
                        {i.multiline ? (
                          <Textarea rows={5} autoComplete="off" spellCheck={false} value={value} onChange={(e) => setValue(e.target.value)} aria-label={i.label} placeholder={i.secret ? "Paste the value. It won't be shown again." : ""} className="font-mono text-xs" />
                        ) : (
                          <Input type={i.secret ? "password" : "text"} autoComplete="off" spellCheck={false} value={value} onChange={(e) => setValue(e.target.value)} aria-label={i.label} placeholder={i.secret ? "Paste the value. It won't be shown again." : ""} />
                        )}
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={busy === i.name || !value.trim()}>{busy === i.name ? "Saving..." : "Save"}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setValue(""); }}>Cancel</Button>
                        </div>
                      </form>
                    )}
                    {message?.name === i.name && <p className={`text-xs ${message.ok ? "text-emerald-700" : "text-destructive"}`} role="status">{message.text}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SettingsEditor;
