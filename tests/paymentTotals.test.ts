import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { sumCompletedPayments, sumPendingPayments } from "../src/lib/paymentTotals";

const rows = [
  { amount: 0.5, status: "completed", created_at: "2026-11-20T11:14:21.559Z" },
  { amount: 3.21, status: "pending", created_at: "2026-11-18T13:14:40.333Z" },
  { amount: 3.21, status: "pending", created_at: "2026-11-18T14:02:50.842Z" },
  { amount: 1.0, status: "failed", created_at: "2026-11-19T10:00:00.000Z" },
  { amount: 2.0, status: "completed", created_at: "2026-09-01T10:00:00.000Z" },
];

describe("Payment summaries count completed payments only", () => {
  it("Home's monthly total includes only completed payments in the window (uk1/uk2 £6.92 case)", () => {
    const since = new Date("2026-10-20T00:00:00.000Z");
    expect(sumCompletedPayments(rows, since)).toBe(0.5);
    expect(sumPendingPayments(rows, since)).toBeCloseTo(6.42);
  });

  it("a statement total over all rows still excludes pending and failed", () => {
    expect(sumCompletedPayments(rows)).toBe(2.5);
    expect(sumPendingPayments(rows)).toBeCloseTo(6.42);
  });

  it("an empty list is £0, and pending-only lists do not inflate the total", () => {
    expect(sumCompletedPayments([])).toBe(0);
    expect(sumCompletedPayments(rows.filter((r) => r.status === "pending"))).toBe(0);
  });

  it("Home and the monthly payments statement use the shared helpers", () => {
    const home = readFileSync(new URL("../src/components/dashboard/HomeTab.tsx", import.meta.url), "utf8");
    expect(home).toContain("sumCompletedPayments(payments, oneMonthAgo)");
    expect(home).toContain("sumPendingPayments(payments, oneMonthAgo)");
    expect(home).toContain("pending");
    const statement = readFileSync(new URL("../src/pages/Statement.tsx", import.meta.url), "utf8");
    expect(statement).toContain("sumCompletedPayments(filtered)");
    expect(statement).toContain("sumPendingPayments(filtered)");
    expect(statement).toContain("pending not included");
    expect(statement).toContain('{filtered.length} {filtered.length === 1 ? "entry" : "entries"}');
    expect(statement).not.toMatch(/const total = filtered\.reduce/);
  });
});
