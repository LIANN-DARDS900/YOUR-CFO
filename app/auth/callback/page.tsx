"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Confirming your account…");
  useEffect(() => {
    async function confirm() {
      const params = new URLSearchParams(window.location.hash.slice(1)); const accessToken = params.get("access_token"); const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) throw new Error("This confirmation link is invalid or expired.");
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_session", accessToken, refreshToken, expiresIn: params.get("expires_in") }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Confirmation failed"); window.location.replace("/");
    }
    void confirm().catch((error: Error) => setMessage(error.message));
  }, []);
  return <main className="auth-callback"><span className="brand-mark"><CircleDollarSign/></span><Loader2 className="spin"/><p>{message}</p></main>;
}
