import { SupabaseClient } from "@supabase/supabase-js";

import { normalizeRole, type Role } from "@/lib/auth/policy";

export function getRoleFromUserMetadata(user: {
  user_metadata?: Record<string, unknown>;
}): Role {
  return normalizeRole(
    (user.user_metadata?.role as string | undefined) ?? null,
  );
}

export async function resolveRoleForUser(
  supabase: SupabaseClient,
  user: { id: string },
): Promise<Role> {
  if (!user?.id) {
    return "MEMBER";
  }

  try {
    const { data: userRecord, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !userRecord) {
      // Fallback to metadata on query error or missing record
      return "MEMBER";
    }

    return normalizeRole(userRecord.role as string | undefined);
  } catch {
    // Fallback on exception
    return "MEMBER";
  }
}
