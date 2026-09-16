import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const url = new URL(window.location.href);
      const oauthError =
        url.searchParams.get("error_description") || url.searchParams.get("error");
      if (oauthError) {
        setMessage(oauthError);
        return;
      }

      let next = "/";
      try {
        next = sessionStorage.getItem("auth_return_to") || "/";
        sessionStorage.removeItem("auth_return_to");
      } catch {
        next = "/";
      }
      if (!next.startsWith("/") || next.startsWith("//")) next = "/";

      try {
        let { data } = await supabase.auth.getSession();
        if (!data.session) {
          const code = url.searchParams.get("code");
          if (!code) throw new Error("No session returned from Google.");
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) throw exchanged.error;
          data = exchanged.data;
        }
        if (!data.session) throw new Error("No session returned from Google.");
        if (!cancelled) navigate(next, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setMessage(err.message || "Google sign-in failed.");
          setTimeout(() => navigate("/login", { replace: true }), 2500);
        }
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
