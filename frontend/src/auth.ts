import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const authConfigured = Boolean(url && publishableKey);
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url as string, publishableKey as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

let accessToken: string | null = null;

export function setApiSession(session: Session | null): void {
  accessToken = session?.access_token ?? null;
}

export function authHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  if (accessToken) next.set("Authorization", `Bearer ${accessToken}`);
  return next;
}
