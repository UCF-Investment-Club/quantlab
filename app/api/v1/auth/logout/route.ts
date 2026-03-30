import { NextResponse } from "next/server";

import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseRouteClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(failure("LOGOUT_FAILED", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(success({ ok: true }));
}
