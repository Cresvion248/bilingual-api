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
    let done = false;

    const go = (path) => {
      if (cancelled || done) return;
      done = true;
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

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
          go(nextPath());
        }
      });

      try {
        const existing = await supabase.auth.getSession();
        if (existing.data.session) {
          listener.subscription.unsubscribe();
          go(nextPath());
          return;
        }

        const code = url.searchParams.get("code");
        if (code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) throw exchanged.error;
          if (exchanged.data.session) {
            listener.subscription.unsubscribe();
            go(nextPath());
            return;
          }
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          const set = await supabase.auth.setSession({ access_token, refresh_token });
          if (set.error) throw set.error;
          if (set.data.session) {
            listener.subscription.unsubscribe();
            go(nextPath());
            return;
          }
        }

        await new Promise((r) => setTimeout(r, 1500));
        const again = await supabase.auth.getSession();
        listener.subscription.unsubscribe();
        if (again.data.session) {
          go(nextPath());
          return;
        }
        throw new Error("No session returned from Google.");
      } catch (err) {
        listener.subscription.unsubscribe();
        if (!cancelled) {
          setMessage(err.message || "Google sign-in failed.");
          setTimeout(() => go("/login"), 3000);
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
