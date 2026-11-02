import { describe, expect, test } from "bun:test";
import { validateSignupEmail, EMAIL_NOT_REAL, EMAIL_DISPOSABLE } from "../src/lib/emailValidation";

const dns = (body: unknown) => (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
const mx = dns({ Status: 0, Answer: [{ type: 15, data: "10 mx.example." }] });

describe("sign-up email validation", () => {
  test("blocks example.com", async () => expect(await validateSignupEmail("a@example.com", mx)).toBe(EMAIL_NOT_REAL));
  test("blocks .test domains", async () => expect(await validateSignupEmail("a@foo.test", mx)).toBe(EMAIL_NOT_REAL));
  test("blocks mailinator", async () => expect(await validateSignupEmail("a@mailinator.com", mx)).toBe(EMAIL_DISPOSABLE));
  test("blocks domain with no MX", async () => expect(await validateSignupEmail("a@nomx.co.uk", dns({ Status: 3 }))).toBe(EMAIL_NOT_REAL));
  test("allows when DNS fails", async () => {
    const broken = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await validateSignupEmail("a@gmail.com", broken)).toBeNull();
  });
  test("allows real domain with MX", async () => expect(await validateSignupEmail("a@gmail.com", mx)).toBeNull());
});

describe("known mailbox providers skip the MX lookup", () => {
  test("gmail.com does not call DNS", async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response("{}"); }) as unknown as typeof fetch;
    expect(await validateSignupEmail("a@gmail.com", spy)).toBeNull();
    expect(called).toBe(false);
  });
  test("hotmail.co.uk does not call DNS even if DNS would say no MX", async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response(JSON.stringify({ Status: 3 })); }) as unknown as typeof fetch;
    expect(await validateSignupEmail("a@hotmail.co.uk", spy)).toBeNull();
    expect(called).toBe(false);
  });
  test("unknown domain still calls DNS", async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15 }] })); }) as unknown as typeof fetch;
    expect(await validateSignupEmail("a@somefirm-unique.co.uk", spy)).toBeNull();
    expect(called).toBe(true);
  });
});
