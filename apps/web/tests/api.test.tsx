import assert from "node:assert/strict";
import { test } from "node:test";
import { apiClient, decode } from "../src/api/client";
import { ApiError, toUiError } from "../src/api/error";
import { AuthResponseSchema } from "@dance/schemas";
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } });

test("API client preserves semantic errors and handles network/non-JSON/multipart/204 responses", async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ code: "FORBIDDEN", reason: "stageLocked", params: {}, issues: [], error: "PRIVATE" }), { status: 403 });
  await assert.rejects(apiClient.get("/test"), error => error instanceof ApiError && error.reason === "stageLocked" && error.code === "FORBIDDEN" && !error.message.includes("PRIVATE"));
  globalThis.fetch = async () => new Response("PRIVATE proxy error", { status: 502 });
  await assert.rejects(apiClient.get("/test"), error => error instanceof ApiError && toUiError(error).reason === "unexpected");
  globalThis.fetch = async () => { throw new TypeError("PRIVATE network"); };
  await assert.rejects(apiClient.get("/test"), error => error instanceof ApiError && error.reason === "network");
  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(apiClient.get("/test"), error => error instanceof ApiError && error.reason === "invalidResponse");
  globalThis.fetch = async (_url, options) => { assert.ok(!new Headers(options?.headers).has("Content-Type")); assert.ok(options?.body instanceof FormData); return new Response(JSON.stringify({ success: true })); };
  await apiClient.upload("/images/events/e", new FormData());
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await apiClient.delete("/test"), undefined);
  assert.throws(() => decode(AuthResponseSchema, { token: "not-a-session" }), error => error instanceof ApiError && error.reason === "invalidResponse");
});
