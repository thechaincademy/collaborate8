import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  sentryReplayOnErrorSampleRate,
  sentryReplaySessionSampleRate,
  sentrySendDefaultPii,
} from "../src/lib/sentryScrub";

describe("Sentry scrubber", () => {
  it("keeps personal data out of events and breadcrumbs", () => {
    const event = scrubSentryEvent({
      message: "Failed for parent@example.com",
      transaction: "/safeguarding/report?note=private",
      request: {
        url: "https://collaborate8.com/safeguarding/report?q1=no&note=hello",
        query_string: "q1=no&note=hello",
        data: { body: "chat text", q1: "no" },
        cookies: { session: "secret" },
        headers: { Authorization: "Bearer secret", "X-Request-Id": "abc" },
      },
      user: { email: "parent@example.com", username: "Alex", ip_address: "203.0.113.4", id: "user-1" },
      extra: {
        q1: "no",
        note: "a private concern",
        body: "message text",
        first_name: "Alex",
        sort_code: "12-34-56",
        account_number: "12345678",
        iban: "GB29NWBK60161331926819",
        phone: "+44 7700 900123",
        step: "save",
      },
      exception: {
        values: [{
          type: "Error",
          value: "parent@example.com sort 12-34-56 account 12345678 GB29NWBK60161331926819 +44 7700 900123",
        }],
      },
    });

    expect(event.request?.url).toBe("https://collaborate8.com/safeguarding/report");
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers?.Authorization).toBeUndefined();
    expect(event.transaction).toBe("/safeguarding/report");
    expect(event.user?.email).toBeUndefined();
    expect(event.user?.id).toBe("user-1");
    expect(event.extra?.q1).toBeUndefined();
    expect(event.extra?.note).toBeUndefined();
    expect(event.extra?.body).toBeUndefined();
    expect(event.extra?.first_name).toBeUndefined();
    expect(event.extra?.sort_code).toBeUndefined();
    expect(event.extra?.step).toBe("save");
    expect(event.message).not.toContain("parent@example.com");
    const detail = event.exception?.values?.[0]?.value ?? "";
    expect(detail).not.toContain("parent@example.com");
    expect(detail).not.toContain("12-34-56");
    expect(detail).not.toContain("12345678");
    expect(detail).not.toContain("GB29NWBK60161331926819");
    expect(detail).not.toContain("7700");
    expect(detail).toContain("[redacted]");
  });

  it("scrubs breadcrumb urls and drops message and concern text", () => {
    const crumb = scrubSentryBreadcrumb({
      category: "fetch",
      message: "POST parent@example.com",
      data: {
        url: "https://collaborate8.com/api?note=secret&q1=yes",
        body: "hello from chat",
        note: "concern note",
        status_code: 500,
      },
    });
    expect(crumb.data?.url).toBe("https://collaborate8.com/api");
    expect(crumb.data?.body).toBeUndefined();
    expect(crumb.data?.note).toBeUndefined();
    expect(crumb.data?.status_code).toBe(500);
    expect(crumb.message).not.toContain("@");
  });

  it("turns personal data off and does not enable session replay", () => {
    expect(sentrySendDefaultPii).toBe(false);
    expect(sentryReplaySessionSampleRate).toBe(0);
    expect(sentryReplayOnErrorSampleRate).toBe(0);
    const web = readFileSync(new URL("../src/lib/errorReporting.ts", import.meta.url), "utf8");
    const edge = readFileSync(new URL("../supabase/functions/_shared/sentry.ts", import.meta.url), "utf8");
    const webScrub = readFileSync(new URL("../src/lib/sentryScrub.ts", import.meta.url), "utf8");
    const edgeScrub = readFileSync(new URL("../supabase/functions/_shared/sentry-scrub.ts", import.meta.url), "utf8");
    expect(webScrub).toBe(edgeScrub);
    expect(edge.includes("../../../src")).toBe(false);
    expect(edge.includes("SENTRY_DSN")).toBe(true);
    expect(edge.includes("await import(\"npm:@sentry/deno@8.47.0\")")).toBe(true);
    expect(web.includes("sendDefaultPii: sentrySendDefaultPii")).toBe(true);
    expect(web.includes("beforeSend")).toBe(true);
    expect(web.includes("beforeBreadcrumb")).toBe(true);
    expect(web.includes("replaysSessionSampleRate")).toBe(true);
    expect(web.includes("replayIntegration")).toBe(false);
    expect(web.includes('integration.name !== "Replay"')).toBe(true);
    expect(edge.includes("sendDefaultPii: sentrySendDefaultPii")).toBe(true);
    expect(edge.includes("beforeSend")).toBe(true);
    expect(edge.includes("beforeBreadcrumb")).toBe(true);
    expect(edge.includes("replayIntegration")).toBe(false);
  });
});
