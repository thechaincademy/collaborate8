import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../drizzle/migrations/0007_create_device_push_tokens.sql", import.meta.url), "utf8");

describe("Device push token schema protections", () => {
  test("tokens are unique for token-based upserts", () => {
    expect(sql).toMatch(/token text NOT NULL UNIQUE/);
  });
  test("only supported platforms are allowed", () => {
    expect(sql).toMatch(/platform IN \('ios', 'android', 'web'\)/);
  });
  test("all four operations are scoped to the authenticated owner", () => {
    for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      const policy = sql.split(";").find((statement) => statement.includes(`FOR ${operation} TO authenticated`));
      expect(policy).toContain("user_id = auth.uid()");
    }
  });
  test("updates prevent transferring token ownership", () => {
    expect(sql).toMatch(/FOR UPDATE TO authenticated USING \(user_id = auth.uid\(\)\) WITH CHECK \(user_id = auth.uid\(\)\)/);
  });
  test("authenticated upserts and service role have explicit grants", () => {
    expect(sql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated");
    expect(sql).toContain("GRANT ALL ON public.device_push_tokens TO service_role");
  });
  test("updates refresh the timestamp automatically", () => {
    expect(sql).toContain("BEFORE UPDATE ON public.device_push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()");
  });
});