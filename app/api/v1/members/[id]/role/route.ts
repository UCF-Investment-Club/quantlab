import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit/log";
import { canRolePerform, isRole } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabase/server";

type Params = {
  id: string;
};

type Body = {
  role?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!id || !body?.role || !isRole(body.role)) {
    return NextResponse.json(
      failure("BAD_REQUEST", "valid user id and role are required"),
      {
        status: 400,
      },
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
  if (!canRolePerform(actorRole, "UPDATE_ROLE")) {
    return NextResponse.json(failure("FORBIDDEN", "Insufficient permissions"), {
      status: 403,
    });
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({ role: body.role })
    .eq("id", id)
    .select("id,email,role")
    .single();

  if (updateError) {
    return NextResponse.json(
      failure("ROLE_UPDATE_FAILED", updateError.message),
      {
        status: 500,
      },
    );
  }

  let claimSyncError: string | null = null;
  try {
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      user_metadata: {
        role: body.role,
      },
    });

    if (error) {
      claimSyncError = error.message;
    }
  } catch (error) {
    claimSyncError =
      error instanceof Error ? error.message : "Unknown claim sync error";
  }

  let auditLogged = true;
  let auditError: string | null = null;

  try {
    await writeAuditLog({
      actorId: user.id,
      action: "ROLE_UPDATED",
      entityType: "user",
      entityId: id,
      metadata: {
        targetUserId: id,
        newRole: body.role,
        claimSyncError,
      },
    });
  } catch (error) {
    auditLogged = false;
    auditError =
      error instanceof Error ? error.message : "Audit log write failed";
  }

  return NextResponse.json(
    success({
      user: updatedUser,
      claimSyncError,
      auditLogged,
      auditError,
    }),
  );
}
