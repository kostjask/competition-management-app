import assert from "node:assert/strict";
import React from "react";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { UserProfile } from "@dance/schemas";
import { roleAccess } from "../src/auth/access";
import { RoleGate } from "../src/auth/RoleGate";
import { AuthContext, type AuthContextValue } from "../src/auth/context";

function profile(key: string, eventId: string | null, name = "Unrelated label"): UserProfile {
  return { id: "u", name: "Synthetic", email: "synthetic@example.invalid", createdAt: "2026-01-01T00:00:00.000Z", isAdmin: false,
    roles: [{ id: "assignment", eventId, role: { id: "role", key, name }, event: eventId ? { id: eventId, name: "Synthetic event" } : null }],
    permissions: [{ eventId, keys: ["stage.manage"] }] };
}
export function context(user: UserProfile | null, loading = false): AuthContextValue {
  return { user, loading, sessionExpired: false, error: null, login: async () => {}, register: async () => {}, logout: async () => {}, refreshUser: async () => {}, clearError: () => {} };
}
test("exact stable keys and supported scope select roles independently of labels", () => {
  const access = roleAccess(profile("judge", "a", "Renamed Judge"));
  assert.equal(access.hasRole("judge"), true); assert.equal(access.hasRole("judge", "a"), true);
  assert.equal(access.hasRole("judge", "b"), false); assert.equal(access.hasRole("Renamed Judge"), false);
  for (const key of ["chief-judge", "custom", "admin"]) assert.equal(roleAccess(profile(key, "a", "Judge Administrator")).hasRole("judge"), false);
  for (const key of ["judge", "moderator"]) assert.equal(roleAccess(profile(key, null)).hasRole(key), false);
  assert.equal(roleAccess(profile("admin", "a", "Administrator")).hasRole("admin"), false);
  assert.equal(roleAccess(profile("admin", null)).hasRole("admin"), false, "Only server-resolved isAdmin grants bypass");
  assert.equal(roleAccess(profile("representative", null)).hasRole("representative", "b"), true);
  const multi = profile("judge", "a"); multi.roles.push(...profile("moderator", "b").roles);
  assert.equal(roleAccess(multi).hasAnyRole(["judge", "moderator"], "b"), true);
  assert.equal(roleAccess(multi).hasRole("judge", "b"), false);
});
test("permission gates require exact operation and global or matching event authority", () => {
  const access = roleAccess(profile("moderator", "a"));
  assert.equal(access.hasPermission("stage.manage", "a"), true);
  assert.equal(access.hasPermission("stage.manage", "b"), false);
  assert.equal(access.hasPermission("stage.manage"), false);
  assert.equal(access.hasPermission("score.submit", "a"), false);
  assert.equal(roleAccess(profile("custom", null)).hasPermission("stage.manage", "b"), true);
  const admin = profile("admin", null); admin.isAdmin = true;
  assert.equal(roleAccess(admin).hasRole("judge", "b"), true);
  assert.equal(roleAccess(admin).hasPermission("stage.manage", "b"), true);
  assert.equal(roleAccess(null).hasRole("judge"), false);
});
test("gate requirements combine without auth bypass and hide while loading", () => {
  function render(user: UserProfile | null, loading = false) {
    return renderToStaticMarkup(<AuthContext.Provider value={context(user, loading)}>
      <RoleGate requireAuth roles={["judge"]} permissions={["stage.manage"]} eventId="a" fallback="denied">allowed</RoleGate>
    </AuthContext.Provider>);
  }
  assert.equal(render(profile("judge", "a")), "allowed");
  assert.equal(render(profile("representative", "a")), "denied");
  assert.equal(render(profile("judge", "b")), "denied");
  assert.equal(render(null), "denied"); assert.equal(render(profile("judge", "a"), true), "");
  const admin = profile("admin", null); admin.isAdmin = true;
  assert.equal(render(admin), "allowed");
  assert.equal(renderToStaticMarkup(<AuthContext.Provider value={context(admin)}><RoleGate guestsOnly>guest</RoleGate></AuthContext.Provider>), "");
});
