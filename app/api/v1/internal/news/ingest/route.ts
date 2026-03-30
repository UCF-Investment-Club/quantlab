import { NextResponse } from "next/server";

import { canRolePerform } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import { runNewsIngestion } from "@/lib/news/ingestion";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

function hasValidCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return false;
  }

  // Check x-cron-secret header
  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret === expected) {
    return true;
  }

  // Check Authorization Bearer header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === expected) {
      return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  const secretAuthorized = hasValidCronSecret(request);

  if (!secretAuthorized) {
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
    if (!canRolePerform(role, "INVITE_USER")) {
      return NextResponse.json(
        failure("FORBIDDEN", "Insufficient permissions"),
        {
          status: 403,
        },
      );
    }
  }

  const result = await runNewsIngestion();
  const statusCode = result.status === "SUCCESS" ? 200 : 500;

  return NextResponse.json(success(result), { status: statusCode });
}
