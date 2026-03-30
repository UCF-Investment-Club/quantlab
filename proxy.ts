import { NextResponse, type NextRequest } from "next/server";

import { resolveRoleForUser } from "@/lib/auth/role";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/dashboard", "/members", "/admin"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.E2E_BYPASS_AUTH === "true") {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  const supabase = createSupabaseProxyClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && user) {
    const role = await resolveRoleForUser(supabase, { id: user.id });

    try {
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action:
          role === "ADMIN"
            ? "ADMIN_ROUTE_ACCESS_GRANTED"
            : "ADMIN_ROUTE_ACCESS_DENIED",
        entity_type: "route",
        entity_id: pathname,
        metadata_json: {
          pathname,
          resolvedRole: role,
        },
      });
    } catch (auditError) {
      const message =
        auditError instanceof Error
          ? auditError.message
          : "Unknown proxy audit error";
      console.error(
        `[proxy] Failed to write admin route audit log: ${message}`,
      );
    }

    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if ((pathname === "/login" || pathname === "/reset-password") && user) {
    return NextResponse.redirect(new URL("/dashboard/news", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/members/:path*",
    "/admin/:path*",
    "/login",
    "/reset-password",
  ],
};
