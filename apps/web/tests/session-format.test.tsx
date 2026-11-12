import assert from "node:assert/strict";
import { test } from "node:test";
import { safeReturnPath, ReturnPathSchema } from "@dance/schemas";
import { formatCalendarDate, formatInstant, formatNumber } from "../src/i18n/format";
import { apiClient, clearLegacyToken, sessionEvents } from "../src/api/client";
import { ApiError } from "../src/api/error";

test("return destinations accept only implemented paths without credentials or encoded redirects", () => {
  for (const value of ["/", "/events", "/events/demo-2026", "/events/demo/edit", "/events/new", "/judge", "/auth/profile", "/admin/events/demo-2026/staff", "/applications", "/events/demo/register", "/events/demo/studio", "/studios/demo"]) assert.equal(safeReturnPath(value), value);
  for (const value of [undefined, {}, "https://foreign.invalid", "//foreign.invalid", "/\\foreign.invalid", "/%2f%2fforeign", "/events/a?token=secret", "/events/a#secret", "/events/a/register/unsupported", "/judge/unsupported", "/auth/login", "/events/../admin", "/events/a%252fadmin", "/events\n"]) {
    assert.equal(ReturnPathSchema.safeParse(value).success, false); assert.equal(safeReturnPath(value), "/");
  }
});
test("locale formatting preserves calendar days and documents UTC instant boundaries", () => {
  assert.equal(formatCalendarDate("2024-02-29", "en"), "February 29, 2024");
  assert.equal(formatInstant("2026-01-01T00:30:00+14:00", "en"), "December 31, 2025");
  for (const locale of ["et", "en", "ru"] as const) {
    assert.ok(formatCalendarDate("2026-01-01", locale).includes("2026"));
    assert.equal(formatCalendarDate("2026-02-30", locale), "\u2014");
    assert.equal(formatInstant("invalid", locale), "\u2014");
    assert.equal(formatNumber(Number.NaN, locale), "\u2014");
  }
  assert.equal(formatNumber(12345.5, "en"), "12,345.5");
  assert.equal(formatNumber(12345.5, "et").includes(",5"), true);
});
test("browser transport never stores credentials and reports expiry without navigation or mutation retry", async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let removed = false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { removeItem: (key: string) => { assert.equal(key,"auth_token"); removed = true; }, getItem: () => { throw new Error("Credential reads are forbidden"); }, setItem: () => { throw new Error("Credential writes are forbidden"); } } });
  clearLegacyToken(); assert.equal(removed,true);
  let attempts = 0; let expired = 0; const onExpired = () => { expired++; };
  sessionEvents.addEventListener("expired", onExpired); t.after(() => sessionEvents.removeEventListener("expired", onExpired));
  globalThis.fetch = async (_url, options) => {
    attempts++; assert.equal(options?.credentials,"include");
    assert.equal(new Headers(options?.headers).get("Authorization"),null);
    assert.equal(new Headers(options?.headers).get("X-CSRF-Protection"),"1");
    assert.equal(new Headers(options?.headers).get("X-Session-Transport"),"cookie");
    return new Response("{}",{status:401});
  };
  await assert.rejects(apiClient.post("/auth/login", { email:"synthetic@example.invalid", password:"wrong" }), error => error instanceof ApiError && error.statusCode === 401);
  assert.equal(expired,1); assert.equal(attempts,1);
});
