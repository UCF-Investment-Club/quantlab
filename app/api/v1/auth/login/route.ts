import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit/log";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null;

  if (!body?.email || !body.password) {
    return NextResponse.json(
      failure("BAD_REQUEST", "email and password are required"),
      { status: 400 },
    );
  }

  const supabase = await createSupabaseRouteClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) {
    return NextResponse.json(failure("AUTH_FAILED", error.message), {
      status: 401,
    });
  }

  const userId = data.user?.id ?? null;
  const resolvedRole = userId
    ? await resolveRoleForUser(supabase, { id: userId })
    : "MEMBER";

  if (userId) {
    try {
      await writeAuditLog({
        actorId: userId,
        action: "LOGIN_SUCCESS",
        entityType: "session",
        entityId: userId,
        metadata: {
          email: data.user?.email ?? null,
        },
      });
    } catch (auditError) {
      const message =
        auditError instanceof Error
          ? auditError.message
          : "Unknown audit logging error";
      console.error(`[auth-login] Failed to write login audit log: ${message}`);
    }
  }

  return NextResponse.json(
    success({
      user: {
        id: userId,
        email: data.user?.email ?? null,
        role: resolvedRole,
      },
    }),
  );
}
