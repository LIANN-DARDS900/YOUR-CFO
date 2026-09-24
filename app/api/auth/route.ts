import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/identity";

export const dynamic = "force-dynamic";

type AuthSession = { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id?: string; email?: string } };

function config() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw new Error("Public authentication is not configured yet");
  return { url: env.SUPABASE_URL.replace(/\/$/, ""), key: env.SUPABASE_ANON_KEY };
}

function clean(value: unknown, max = 160) { return String(value ?? "").trim().slice(0, max); }

async function supabase(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  return fetch(`${url}/auth/v1${path}`, { ...init, headers: { apikey: key, "Content-Type": "application/json", ...(init.headers ?? {}) } });
}

function applySession(response: NextResponse, session: AuthSession) {
  if (!session.access_token || !session.refresh_token) return;
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, session.expires_in ?? 3600) });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, secure, sameSite: "strict", path: "/api/auth", maxAge: 60 * 60 * 24 * 30 });
}

function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/auth", maxAge: 0 });
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin"); if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>; const action = clean(body.action, 30);
    if (action === "signup") {
      const email = clean(body.email).toLowerCase(); const password = clean(body.password, 200); const name = clean(body.name, 80);
      if (!email.includes("@") || password.length < 8 || !name) return NextResponse.json({ error: "Enter your name, a valid email, and at least 8 password characters" }, { status: 400 });
      const callbackUrl = new URL("/auth/callback", request.url).toString();
      const upstream = await supabase(`/signup?redirect_to=${encodeURIComponent(callbackUrl)}`, { method: "POST", body: JSON.stringify({ email, password, data: { display_name: name } }) });
      const data = await upstream.json() as AuthSession & { msg?: string; error_description?: string };
      if (!upstream.ok) return NextResponse.json({ error: data.msg || data.error_description || "Could not create account" }, { status: upstream.status });
      const response = NextResponse.json({ ok: true, verificationRequired: !data.access_token }); applySession(response, data); return response;
    }
    if (action === "login") {
      const email = clean(body.email).toLowerCase(); const password = clean(body.password, 200);
      const upstream = await supabase("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
      const data = await upstream.json() as AuthSession & { msg?: string; error_description?: string };
      if (!upstream.ok || !data.access_token) return NextResponse.json({ error: data.msg || data.error_description || "Incorrect email or password" }, { status: 401 });
      const response = NextResponse.json({ ok: true }); applySession(response, data); return response;
    }
    if (action === "refresh") {
      const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
      if (!refreshToken) return NextResponse.json({ error: "Session expired" }, { status: 401 });
      const upstream = await supabase("/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
      const data = await upstream.json() as AuthSession;
      if (!upstream.ok || !data.access_token) { const response = NextResponse.json({ error: "Session expired" }, { status: 401 }); clearSession(response); return response; }
      const response = NextResponse.json({ ok: true }); applySession(response, data); return response;
    }
    if (action === "set_session") {
      const accessToken = clean(body.accessToken, 4096); const refreshToken = clean(body.refreshToken, 4096);
      const upstream = await supabase("/user", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!upstream.ok || !refreshToken) return NextResponse.json({ error: "Invalid confirmation link" }, { status: 401 });
      const response = NextResponse.json({ ok: true }); applySession(response, { access_token: accessToken, refresh_token: refreshToken, expires_in: Number(body.expiresIn) || 3600 }); return response;
    }
    if (action === "logout") {
      const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
      if (accessToken) await supabase("/logout", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined);
      const response = NextResponse.json({ ok: true }); clearSession(response); return response;
    }
    return NextResponse.json({ error: "Unknown authentication action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication failed" }, { status: 400 }); }
}
