import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export type AppIdentity = { id: string; email: string; name: string; provider: "chatgpt" | "supabase" | "local" };

export const ACCESS_COOKIE = "ycfo_access_token";
export const REFRESH_COOKIE = "ycfo_refresh_token";

function decodeName(value: string | null) {
  try { return value ? decodeURIComponent(value) : null; } catch { return null; }
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [key, ...parts] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export async function getCurrentIdentity(): Promise<AppIdentity | null> {
  const requestHeaders = await headers();
  const chatGPTId = requestHeaders.get("oai-authenticated-user-id");
  const chatGPTEmail = requestHeaders.get("oai-authenticated-user-email");
  if (chatGPTId && chatGPTEmail) return { id: chatGPTId, email: chatGPTEmail, name: decodeName(requestHeaders.get("oai-authenticated-user-full-name")) ?? chatGPTEmail.split("@")[0], provider: "chatgpt" };

  const supabaseUrl = env.SUPABASE_URL; const supabaseKey = env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const accessToken = cookieValue(requestHeaders.get("cookie"), ACCESS_COOKIE);
    if (!accessToken) return null;
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    const user = await response.json() as { id?: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } };
    if (!user.id || !user.email) return null;
    return { id: `supabase:${user.id}`, email: user.email, name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email.split("@")[0], provider: "supabase" };
  }

  if (process.env.NODE_ENV !== "production") return { id: "local-demo-user", email: "ilyas@example.com", name: "Ilyas", provider: "local" };
  return null;
}
