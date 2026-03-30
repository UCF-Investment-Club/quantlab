import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit/log";
import { canRolePerform, isRole } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import { generateOpaqueToken, hashToken } from "@/lib/security/token";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

type InviteBody = {
  email?: string;
  role?: string;
};

const INVITE_TTL_HOURS = 72;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as InviteBody | null;

  if (!body?.email || !body.role || !isRole(body.role)) {
    return NextResponse.json(
      failure("BAD_REQUEST", "email and valid role are required"),
      { status: 400 },
    );
  }

  const supabase = await createSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      failure("UNAUTHORIZED", "Authentication required"),
      {
        status: 401,
      },
    );
  }

  const actorRole = await resolveRoleForUser(supabase, { id: user.id });
  if (!canRolePerform(actorRole, "INVITE_USER")) {
    return NextResponse.json(failure("FORBIDDEN", "Insufficient permissions"), {
      status: 403,
    });
  }

  const email = body.email.trim().toLowerCase();
  const now = Date.now();
  const expiresAt = new Date(
    now + INVITE_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: existingInvite, error: existingError } = await supabase
    .from("invites")
    .select("id")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date(now).toISOString())
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      failure("INVITE_CHECK_FAILED", existingError.message),
      {
        status: 500,
      },
    );
  }

  if (existingInvite) {
    return NextResponse.json(
      failure(
        "INVITE_EXISTS",
        "An active invite already exists for this email",
      ),
      { status: 409 },
    );
  }

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      email,
      role: body.role,
      invite_token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: user.id,
    })
    .select("id,email,role,expires_at")
    .single();

  if (error) {
    return NextResponse.json(failure("INVITE_CREATE_FAILED", error.message), {
      status: 500,
    });
  }

  let auditLogged = true;
  let auditError: string | null = null;

  try {
    await writeAuditLog({
      actorId: user.id,
      action: "INVITE_CREATED",
      entityType: "invite",
      entityId: invite.id,
      metadata: {
        email,
        role: body.role,
        expiresAt,
      },
    });
  } catch (error) {
    auditLogged = false;
    auditError =
      error instanceof Error ? error.message : "Audit log write failed";
  }

  const origin = new URL(request.url).origin;
  const inviteLink = `${origin}/invite/accept?token=${rawToken}`;

  return NextResponse.json(
    success({
      invite,
      inviteToken: rawToken,
      inviteLink,
      auditLogged,
      auditError,
      note: "Token is only returned once. Store or send immediately.",
    }),
  );
}
