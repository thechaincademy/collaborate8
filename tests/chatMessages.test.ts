import { describe, expect, it } from "bun:test";
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