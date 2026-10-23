import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { mergeChatMessages, pendingMessageDelivery } from "../src/lib/chatMessages";

describe("Invite message chronology and synchronization", () => {
  it("keeps 12:03 original send time rather than 12:12 join time", () => {
    const original = "2026-10-23T12:03:00Z";
    const payload = pendingMessageDelivery("sender", "recipient", { body: "Hello", created_at: original });
    expect(payload).toEqual({ sender_id: "sender", recipient_id: "recipient", body: "Hello", created_at: original });
    expect(payload.created_at).not.toBe("2026-10-23T12:12:00Z");
  });
  it("does not erase an incoming realtime message when an older empty fetch completes", () => {
    const incoming = { id: "first", created_at: "2026-10-23T12:03:00Z" };
    expect(mergeChatMessages([incoming], [])).toEqual([incoming]);
  });
  it("deduplicates fetch and realtime rows and keeps original chronological order", () => {
    const first = { id: "first", created_at: "2026-10-23T12:03:00Z" };
    const next = { id: "next", created_at: "2026-10-23T12:12:00Z" };
    expect(mergeChatMessages([next, first], [first])).toEqual([first, next]);
  });
});

describe("Chat read status follows page visibility", () => {
  // Exercise the actual effect with isolated browser and persistence dependencies.
  const source = readFileSync(new URL("../src/components/dashboard/ChatTab.tsx", import.meta.url), "utf8");
  const effect = source.split("// Mark incoming messages as read while the chat is open")[1]?.split("\n  useEffect(() => {\n    scrollRef")[0];
  if (!effect) throw new Error("Chat read-status effect not found");
  const runEffect = new Function("useEffect", "document", "user", "coparentId", "activeSection", "messages", "setMessages", "supabase", "markMessageNotificationsRead", effect);

  function mount(visibilityState: string, activeSection = "chat") {
    const document = Object.assign(new EventTarget(), { visibilityState });
    let messages = [
      { id: "incoming", recipient_id: "me", read_at: null as string | null },
      { id: "already-read", recipient_id: "me", read_at: "2026-10-23T12:00:00Z" },
      { id: "outgoing", recipient_id: "coparent", read_at: null as string | null },
    ];
    const updates: string[][] = [];
    let cleanup: (() => void) | undefined;
    const supabase = { from: () => ({ update: () => ({ in: (_key: string, ids: string[]) => {
      updates.push(ids);
      return Promise.resolve({ error: null });
    } }) }) };
    runEffect((callback: () => (() => void) | undefined) => { cleanup = callback(); }, document,
      { id: "me" }, "coparent", activeSection, messages,
      (update: (current: typeof messages) => typeof messages) => { messages = update(messages); }, supabase, () => Promise.resolve());
    return { document, updates, getMessages: () => messages, cleanup: () => cleanup?.() };
  }

  it("does not mark incoming messages read while hidden", () => {
    const chat = mount("hidden");
    expect(chat.updates).toEqual([]);
    expect(chat.getMessages()[0]?.read_at).toBeNull();
    chat.cleanup();
  });

  it("marks unread incoming messages read when a hidden chat becomes visible", () => {
    const chat = mount("hidden");
    chat.document.visibilityState = "visible";
    chat.document.dispatchEvent(new Event("visibilitychange"));
    expect(chat.updates).toEqual([["incoming"]]);
    expect(chat.getMessages()[0]?.read_at).toEqual(expect.any(String));
    chat.cleanup();
  });

  it("marks visible arrivals read without updating already-read or outgoing messages", () => {
    const chat = mount("visible");
    expect(chat.updates).toEqual([["incoming"]]);
    expect(chat.getMessages()[1]?.read_at).toBe("2026-10-23T12:00:00Z");
    expect(chat.getMessages()[2]?.read_at).toBeNull();
    chat.cleanup();
  });

  it("removes the visibility listener on unmount", () => {
    const chat = mount("hidden");
    chat.cleanup();
    chat.document.visibilityState = "visible";
    chat.document.dispatchEvent(new Event("visibilitychange"));
    expect(chat.updates).toEqual([]);
  });

  it("does not mark messages read in the Documents section", () => {
    const chat = mount("visible", "documents");
    chat.document.dispatchEvent(new Event("visibilitychange"));
    expect(chat.updates).toEqual([]);
    chat.cleanup();
  });
});

describe("Only chat message notifications are read in visible Chat", () => {
  const source = readFileSync(new URL("../src/components/dashboard/ChatTab.tsx", import.meta.url), "utf8");
  const notificationCode = source.split("  const markMessageNotificationsRead =")[1]?.split("  // Mark incoming messages as read while the chat is open")[0];
  if (!notificationCode) throw new Error("Chat notification read handling not found");
  const run = new Function("useCallback", "useEffect", "document", "user", "coparentId", "activeSection", "supabase",
    `const markMessageNotificationsRead = ${notificationCode}; return markMessageNotificationsRead;`);

  function mount(visibilityState = "visible", activeSection = "chat") {
    const document = { visibilityState };
    const updates: { table: string; filters: unknown[][] }[] = [];
    let insert: ((payload: { new: { type: string; read_at: string | null } }) => void) | undefined;
    let subscribed: ((status: string) => void) | undefined;
    let cleanup: (() => void) | undefined;
    let removed = false;
    const channel = {
      on: (_event: string, filter: object, callback: typeof insert) => {
        expect(filter).toEqual({ event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq.me" });
        insert = callback;
        return channel;
      },
      subscribe: (callback: typeof subscribed) => { subscribed = callback; return channel; },
    };
    const supabase = {
      from: (table: string) => ({ update: (values: { read_at: string }) => {
        expect(Number.isNaN(Date.parse(values.read_at))).toBe(false);
        const filters: unknown[][] = [];
        updates.push({ table, filters });
        const query = {
          eq: (key: string, value: string) => { filters.push([key, value]); return query; },
          is: (key: string, value: null) => { filters.push([key, value]); return Promise.resolve({ error: null }); },
        };
        return query;
      } }),
      channel: () => channel,
      removeChannel: () => { removed = true; },
    };
    const mark = run((callback: unknown) => callback,
      (callback: () => (() => void) | undefined) => { cleanup = callback(); },
      document, { id: "me" }, "coparent", activeSection, supabase);
    return { document, updates, mark, insert: (type: string, read_at: string | null = null) => insert?.({ new: { type, read_at } }),
      ready: () => subscribed?.("SUBSCRIBED"), cleanup: () => cleanup?.(), removed: () => removed };
  }

  it("updates only the current user's unread message notifications", async () => {
    const chat = mount();
    await chat.mark();
    expect(chat.updates).toEqual([{ table: "notifications", filters: [["user_id", "me"], ["type", "message"], ["read_at", null]] }]);
  });

  it("does not update notifications while hidden or in Documents", async () => {
    for (const chat of [mount("hidden"), mount("visible", "documents")]) {
      await chat.mark();
      chat.insert("message");
      chat.ready();
      expect(chat.updates).toEqual([]);
    }
  });

  it("catches a delayed message notification and the subscription-ready gap", () => {
    const chat = mount();
    chat.ready();
    chat.insert("message");
    expect(chat.updates).toHaveLength(2);
  });

  it("never changes non-message types or already-read notifications", () => {
    const chat = mount();
    for (const type of ["expense", "maintenance", "thread_message", "thread_confirm", "due"]) chat.insert(type);
    chat.insert("message", "2026-10-23T12:00:00Z");
    expect(chat.updates).toEqual([]);
  });

  it("checks current visibility for delayed notifications and removes its channel", () => {
    const chat = mount();
    chat.document.visibilityState = "hidden";
    chat.insert("message");
    expect(chat.updates).toEqual([]);
    chat.document.visibilityState = "visible";
    chat.insert("message");
    expect(chat.updates).toHaveLength(1);
    chat.cleanup();
    expect(chat.removed()).toBe(true);
  });
});