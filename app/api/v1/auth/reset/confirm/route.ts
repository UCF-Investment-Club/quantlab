import { NextResponse } from "next/server";

import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

type ResetConfirmBody = {
  password?: string;
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as ResetConfirmBody | null;

  if (!body?.password) {
    return NextResponse.json(failure("BAD_REQUEST", "password is required"), {
      status: 400,
    });
  }

  const supabase = await createSupabaseRouteClient();

  if (body.accessToken && body.refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
    });

    if (sessionError) {
      return NextResponse.json(
        failure("RESET_CONFIRM_FAILED", sessionError.message),
        {
          status: 400,
        },
      );
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: body.password,
  });

  if (error) {
    return NextResponse.json(failure("RESET_CONFIRM_FAILED", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(success({ ok: true }));
}
