import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit/log";
import { failure, success } from "@/lib/http/envelope";
import {
  claimActiveInviteByRawToken,
  getInviteByRawToken,
  getInviteState,
  releaseInviteClaim,
} from "@/lib/invite/service";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type AcceptBody = {
  token?: string;
  fullName?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AcceptBody | null;
  const rawToken = body?.token?.trim() ?? "";
  const fullName = body?.fullName?.trim() ?? "";

  if (!rawToken || !fullName || !body?.password || body.password.length < 8) {
    return NextResponse.json(
      failure(
        "BAD_REQUEST",
        "token, fullName, and password (min 8 chars) are required",
      ),
      { status: 400 },
    );
  }

  try {
    const claim = await claimActiveInviteByRawToken(rawToken);

    if (!claim) {
      const invite = await getInviteByRawToken(rawToken);
      const state = getInviteState(invite);

      if (state === "accepted") {
        return NextResponse.json(
          failure("INVITE_ALREADY_USED", "Invite token has already been used"),
          { status: 409 },
        );
      }

      if (state === "expired") {
        return NextResponse.json(
          failure("INVITE_EXPIRED", "Invite token has expired"),
          { status: 400 },
        );
      }

      return NextResponse.json(
        failure("INVITE_INVALID", "Invite token is invalid"),
        { status: 400 },
      );
    }

    const { invite, claimedAt } = claim;
    const adminClient = createSupabaseAdminClient();

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email: invite.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          role: invite.role,
          full_name: fullName,
        },
      });

    if (createError || !created.user) {
      try {
        await releaseInviteClaim(invite.id, claimedAt);
      } catch {
        // If release fails, invite may remain consumed and requires admin intervention.
      }

      const message = createError?.message ?? "Unable to create invited user";
      const isConflict = /already|exists|registered/i.test(message);

      return NextResponse.json(failure("INVITE_ACCEPT_FAILED", message), {
        status: isConflict ? 409 : 500,
      });
    }

    let profileSyncError: string | null = null;
    const { error: profileError } = await adminClient
      .from("users")
      .update({
        full_name: fullName,
        role: invite.role,
        status: "ACTIVE",
      })
      .eq("id", created.user.id);

    if (profileError) {
      profileSyncError = profileError.message;
    }

    let auditLogged = true;
    let auditError: string | null = null;

    try {
      await writeAuditLog({
        actorId: created.user.id,
        action: "INVITE_ACCEPTED",
        entityType: "invite",
        entityId: invite.id,
        metadata: {
          email: invite.email,
          role: invite.role,
          acceptedAt: claimedAt,
          profileSyncError,
        },
        clientMode: "admin",
      });
    } catch (error) {
      auditLogged = false;
      auditError =
        error instanceof Error ? error.message : "Audit log write failed";
    }

    return NextResponse.json(
      success({
        accepted: true,
        email: invite.email,
        role: invite.role,
        auditLogged,
        auditError,
        profileSyncError,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      failure(
        "INVITE_ACCEPT_FAILED",
        error instanceof Error
          ? error.message
          : "Unable to process invite acceptance",
      ),
      { status: 500 },
    );
  }
}
