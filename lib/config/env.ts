type RequiredEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseServiceRoleKey?: string;
};

function readFirstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(): RequiredEnv {
  const supabaseUrl = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  const supabasePublishableKey = requireEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    readFirstDefined([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]),
  );

  return {
    supabaseUrl,
    supabasePublishableKey,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
