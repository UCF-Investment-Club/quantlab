import { NextResponse } from "next/server";

import { failure, success } from "@/lib/http/envelope";
import {
  getInviteByRawToken,
  getInviteState,
  maskInviteEmail,
} from "@/lib/invite/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(failure("BAD_REQUEST", "token is required"), {
      status: 400,
    });
  }

  try {
    const invite = await getInviteByRawToken(token);
    const state = getInviteState(invite);

    if (!invite || state !== "active") {
      return NextResponse.json(
        success({
          state,
          invite: null,
        }),
      );
    }

    return NextResponse.json(
      success({
        state,
        invite: {
          id: invite.id,
          emailMasked: maskInviteEmail(invite.email),
          role: invite.role,
          expiresAt: invite.expires_at,
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      failure(
        "INVITE_VERIFY_FAILED",
        error instanceof Error ? error.message : "Unable to verify invite",
      ),
      { status: 500 },
    );
  }
}
