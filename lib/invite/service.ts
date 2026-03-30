import { hashToken } from "@/lib/security/token";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type InviteRecord = {
  id: string;
  email: string;
  role: "MEMBER" | "OFFICER" | "ADMIN";
  expires_at: string;
  accepted_at: string | null;
};

export async function getInviteByRawToken(
  token: string,
): Promise<InviteRecord | null> {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(token);

  const { data, error } = await supabase
    .from("invites")
    .select("id,email,role,expires_at,accepted_at")
    .eq("invite_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as InviteRecord | null;
}

export async function claimActiveInviteByRawToken(
  token: string,
): Promise<{ invite: InviteRecord; claimedAt: string } | null> {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(token);
  const claimedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("invites")
    .update({ accepted_at: claimedAt })
    .eq("invite_token_hash", tokenHash)
    .is("accepted_at", null)
    .gt("expires_at", claimedAt)
    .select("id,email,role,expires_at,accepted_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    invite: data as InviteRecord,
    claimedAt,
  };
}

export async function releaseInviteClaim(
  inviteId: string,
  claimedAt: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("invites")
    .update({ accepted_at: null })
    .eq("id", inviteId)
    .eq("accepted_at", claimedAt);

  if (error) {
    throw new Error(error.message);
  }
}

export function getInviteState(
  invite: InviteRecord | null,
): "missing" | "accepted" | "expired" | "active" {
  if (!invite) {
    return "missing";
  }

  if (invite.accepted_at) {
    return "accepted";
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return "expired";
  }

  return "active";
}

export function maskInviteEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }

  if (local.length <= 2) {
    return `${local[0] ?? "*"}*@${domain}`;
  }

  return `${local.slice(0, 2)}***@${domain}`;
}
