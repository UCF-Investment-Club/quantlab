export const ROLES = ["MEMBER", "OFFICER", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];

export const ACTIONS = {
  READ_NEWS: "READ_NEWS",
  READ_MEMBERS: "READ_MEMBERS",
  INVITE_USER: "INVITE_USER",
  UPDATE_ROLE: "UPDATE_ROLE",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

const ROLE_RANK: Record<Role, number> = {
  MEMBER: 1,
  OFFICER: 2,
  ADMIN: 3,
};

const MIN_ROLE_FOR_ACTION: Record<Action, Role> = {
  READ_NEWS: "MEMBER",
  READ_MEMBERS: "MEMBER",
  INVITE_USER: "ADMIN",
  UPDATE_ROLE: "ADMIN",
  VIEW_AUDIT_LOGS: "ADMIN",
};

export function isRole(value: string | null | undefined): value is Role {
  if (!value) {
    return false;
  }
  return ROLES.includes(value as Role);
}

export function normalizeRole(value: string | null | undefined): Role {
  if (isRole(value)) {
    return value;
  }
  return "MEMBER";
}

export function canRolePerform(role: Role, action: Action): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[MIN_ROLE_FOR_ACTION[action]];
}

export function getMinimumRoleForAction(action: Action): Role {
  return MIN_ROLE_FOR_ACTION[action];
}
