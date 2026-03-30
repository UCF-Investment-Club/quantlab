"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getEnv } from "@/lib/config/env";

export function createSupabaseBrowserClient() {
  const env = getEnv();
  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}
