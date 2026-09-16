import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";

function nextPath() {
  let next = "/";
  try {
    next = sessionStorage.getItem("auth_return_to") || "/";
    sessionStorage.removeItem("auth_return_to");
  } catch {
    next = "/";
  }
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const go = (path) => {
      if (cancelled || finished) return;
      finished = true;
      navigate(path, { replace: true });
    };

    async function finish() {
      const url = new URL(window.location.href);
      const oauthError =
        url.searchParams.get("error_description") || url.searchParams.get("error");
      if (oauthError) {
        setMessage(oauthError);
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");

      try {
        if (access_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ""
          });
          if (error) throw error;
        }

        for (let i = 0; i < 8; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            go(nextPath());
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        throw new Error(
          "Google came back but this tab has no session. Confirm Vercel env VITE_SUPABASE_URL is https://eahctwizprdmefjntvms.supabase.co and redeploy."
        );
      } catch (err) {
        if (!cancelled) {
          setMessage(err.message || "Google sign-in failed.");
          setTimeout(() => go("/login"), 4000);
        }
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4 text-center">
      <p className="max-w-lg text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
