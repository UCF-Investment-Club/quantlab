import { canRolePerform, type Action, type Role } from "@/lib/auth/policy";

export type NavItem = {
  label: string;
  href: string;
  action: Action;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "News",
    href: "/dashboard/news",
    action: "READ_NEWS",
  },
  {
    label: "Members",
    href: "/members",
    action: "READ_MEMBERS",
  },
  {
    label: "Admin Invites",
    href: "/admin/invites",
    action: "INVITE_USER",
  },
  {
    label: "Admin Users",
    href: "/admin/users",
    action: "UPDATE_ROLE",
  },
];

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canRolePerform(role, item.action));
}
