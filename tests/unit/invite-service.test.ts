import { describe, expect, it } from "vitest";

import {
  getInviteState,
  maskInviteEmail,
  type InviteRecord,
} from "@/lib/invite/service";

function makeInvite(overrides: Partial<InviteRecord> = {}): InviteRecord {
  return {
    id: "invite-1",
    email: "member@example.com",
    role: "MEMBER",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    accepted_at: null,
    ...overrides,
  };
}

describe("invite service state helpers", () => {
  it("returns missing for null invite", () => {
    expect(getInviteState(null)).toBe("missing");
  });

  it("returns accepted when accepted_at exists", () => {
    const invite = makeInvite({ accepted_at: new Date().toISOString() });
    expect(getInviteState(invite)).toBe("accepted");
  });

  it("returns expired when expiry is in the past", () => {
    const invite = makeInvite({
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(getInviteState(invite)).toBe("expired");
  });

  it("returns active for unaccepted non-expired invite", () => {
    const invite = makeInvite();
    expect(getInviteState(invite)).toBe("active");
  });
});

describe("invite email masking", () => {
  it("masks typical addresses", () => {
    expect(maskInviteEmail("username@example.com")).toBe("us***@example.com");
  });

  it("handles short local parts", () => {
    expect(maskInviteEmail("ab@example.com")).toBe("a*@example.com");
  });
});
