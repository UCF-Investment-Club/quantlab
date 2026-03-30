import { describe, expect, it } from "vitest";

import { canRolePerform } from "@/lib/auth/policy";

describe("role policy", () => {
  it("allows member news read", () => {
    expect(canRolePerform("MEMBER", "READ_NEWS")).toBe(true);
  });

  it("blocks member invite action", () => {
    expect(canRolePerform("MEMBER", "INVITE_USER")).toBe(false);
  });

  it("allows admin invite and role update", () => {
    expect(canRolePerform("ADMIN", "INVITE_USER")).toBe(true);
    expect(canRolePerform("ADMIN", "UPDATE_ROLE")).toBe(true);
  });
});
