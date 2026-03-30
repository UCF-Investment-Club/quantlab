import { NextResponse } from "next/server";

import { canRolePerform } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET() {
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

  const role = await resolveRoleForUser(supabase, { id: user.id });
  if (!canRolePerform(role, "READ_NEWS")) {
    return NextResponse.json(failure("FORBIDDEN", "Insufficient permissions"), {
      status: 403,
    });
  }

  return NextResponse.json(
    success([], {
      provider: "yahoo-finance2",
      available: false,
      note: "SEC filings feed is not enabled in this phase baseline",
    }),
  );
}
