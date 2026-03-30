import { NextResponse } from "next/server";

import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

type ResetRequestBody = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as ResetRequestBody | null;

  if (!body?.email) {
    return NextResponse.json(failure("BAD_REQUEST", "email is required"), {
      status: 400,
    });
  }

  const supabase = await createSupabaseRouteClient();
  const origin = new URL(request.url).origin;

  const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return NextResponse.json(failure("RESET_REQUEST_FAILED", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(success({ ok: true }));
}
