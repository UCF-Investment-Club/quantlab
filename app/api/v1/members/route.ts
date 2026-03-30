import { NextResponse } from "next/server";

import { canRolePerform, isRole } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  member_profiles:
    | {
        major: string | null;
        graduation_year: number | null;
        joined_at: string;
        is_active: boolean;
      }
    | {
        major: string | null;
        graduation_year: number | null;
        joined_at: string;
        is_active: boolean;
      }[]
    | null;
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value: string | null): boolean | null {
  if (!value) {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

export async function GET(request: Request) {
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
  if (!canRolePerform(role, "READ_MEMBERS")) {
    return NextResponse.json(failure("FORBIDDEN", "Insufficient permissions"), {
      status: 403,
    });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const roleFilterParam = url.searchParams.get("role");
  const activeFilter = parseBoolean(url.searchParams.get("active"));

  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(url.searchParams.get("pageSize"), 20),
    100,
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const roleFilter = isRole(roleFilterParam) ? roleFilterParam : null;

  let query = supabase
    .from("users")
    .select(
      "id,email,full_name,role,status,member_profiles(major,graduation_year,joined_at,is_active)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  if (roleFilter) {
    query = query.eq("role", roleFilter);
  }

  if (activeFilter !== null) {
    query = query.eq("member_profiles.is_active", activeFilter);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(failure("MEMBERS_QUERY_FAILED", error.message), {
      status: 500,
    });
  }

  const members = ((data ?? []) as MemberRow[]).map((item) => {
    const profile = Array.isArray(item.member_profiles)
      ? (item.member_profiles[0] ?? null)
      : item.member_profiles;

    return {
      id: item.id,
      email: item.email,
      fullName: item.full_name,
      role: item.role,
      status: item.status,
      profile: profile
        ? {
            major: profile.major,
            graduationYear: profile.graduation_year,
            joinedAt: profile.joined_at,
            isActive: profile.is_active,
          }
        : null,
    };
  });

  return NextResponse.json(
    success(members, {
      page,
      pageSize,
      total: count ?? 0,
    }),
  );
}
