import { canRolePerform, type Action, type Role } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: await resolveRoleForUser(supabase, { id: user.id }),
  };
}

export function canSessionUserPerform(
  user: SessionUser | null,
  action: Action,
): boolean {
  if (!user) {
    return false;
  }
  return canRolePerform(user.role, action);
}
