import { beforeEach, describe, expect, it, vi } from "vitest";

const claimActiveInviteByRawToken = vi.fn();
const getInviteByRawToken = vi.fn();
const getInviteState = vi.fn();
const releaseInviteClaim = vi.fn();
const writeAuditLog = vi.fn();
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/invite/service", () => ({
  claimActiveInviteByRawToken,
  getInviteByRawToken,
  getInviteState,
  releaseInviteClaim,
}));

vi.mock("@/lib/audit/log", () => ({
  writeAuditLog,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient,
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/v1/members/invite/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function makeAdminClient(params?: {
  createUserError?: { message: string } | null;
  profileError?: { message: string } | null;
}) {
  const createUserError = params?.createUserError ?? null;
  const profileError = params?.profileError ?? null;

  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(
          createUserError
            ? {
                data: { user: null },
                error: createUserError,
              }
            : {
                data: { user: { id: "user-1" } },
                error: null,
              },
        ),
      },
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: profileError,
        }),
      }),
    }),
  };
}

describe("invite accept route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid payload", async () => {
    const { POST } = await import("@/app/api/v1/members/invite/accept/route");

    const response = await POST(
      makeRequest({ token: "abc", fullName: "User", password: "short" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "BAD_REQUEST",
      },
    });
  });

  it("returns expired when claim fails and token is expired", async () => {
    claimActiveInviteByRawToken.mockResolvedValue(null);
    getInviteByRawToken.mockResolvedValue({ id: "invite-1" });
    getInviteState.mockReturnValue("expired");

    const { POST } = await import("@/app/api/v1/members/invite/accept/route");

    const response = await POST(
      makeRequest({
        token: "abc",
        fullName: "User Name",
        password: "password123",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVITE_EXPIRED",
      },
    });
  });

  it("accepts invite successfully and writes audit with admin mode", async () => {
    claimActiveInviteByRawToken.mockResolvedValue({
      invite: {
        id: "invite-1",
        email: "member@example.com",
        role: "MEMBER",
      },
      claimedAt: "2026-03-29T12:00:00.000Z",
    });

    const adminClient = makeAdminClient();
    createSupabaseAdminClient.mockReturnValue(adminClient);
    writeAuditLog.mockResolvedValue(undefined);

    const { POST } = await import("@/app/api/v1/members/invite/accept/route");

    const response = await POST(
      makeRequest({
        token: "abc",
        fullName: "User Name",
        password: "password123",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        accepted: true,
        email: "member@example.com",
        auditLogged: true,
        auditError: null,
      },
    });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        clientMode: "admin",
        action: "INVITE_ACCEPTED",
        entityId: "invite-1",
      }),
    );
  });

  it("releases claim and returns conflict when user already exists", async () => {
    claimActiveInviteByRawToken.mockResolvedValue({
      invite: {
        id: "invite-1",
        email: "member@example.com",
        role: "MEMBER",
      },
      claimedAt: "2026-03-29T12:00:00.000Z",
    });

    const adminClient = makeAdminClient({
      createUserError: { message: "User already registered" },
    });

    createSupabaseAdminClient.mockReturnValue(adminClient);
    releaseInviteClaim.mockResolvedValue(undefined);

    const { POST } = await import("@/app/api/v1/members/invite/accept/route");

    const response = await POST(
      makeRequest({
        token: "abc",
        fullName: "User Name",
        password: "password123",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVITE_ACCEPT_FAILED",
      },
    });

    expect(releaseInviteClaim).toHaveBeenCalledWith(
      "invite-1",
      "2026-03-29T12:00:00.000Z",
    );
  });

  it("returns success with audit failure details when audit write fails", async () => {
    claimActiveInviteByRawToken.mockResolvedValue({
      invite: {
        id: "invite-1",
        email: "member@example.com",
        role: "MEMBER",
      },
      claimedAt: "2026-03-29T12:00:00.000Z",
    });

    const adminClient = makeAdminClient();
    createSupabaseAdminClient.mockReturnValue(adminClient);
    writeAuditLog.mockRejectedValue(new Error("audit write blocked"));

    const { POST } = await import("@/app/api/v1/members/invite/accept/route");

    const response = await POST(
      makeRequest({
        token: "abc",
        fullName: "User Name",
        password: "password123",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        accepted: true,
        auditLogged: false,
        auditError: "audit write blocked",
      },
    });
  });
});
