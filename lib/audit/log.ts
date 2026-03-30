import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabase/server";

type AuditClientMode = "route" | "admin";

type AuditInput = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  clientMode?: AuditClientMode;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const supabase =
    input.clientMode === "admin"
      ? createSupabaseAdminClient()
      : await createSupabaseRouteClient();

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata_json: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}
