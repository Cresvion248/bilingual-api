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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go(nextPath());
    });

    (async () => {
      const url = new URL(window.location.href);
      const oauthError =
        url.searchParams.get("error_description") || url.searchParams.get("error");
      if (oauthError) {
        setMessage(oauthError);
        listener.subscription.unsubscribe();
        return;
      }

      const first = await supabase.auth.getSession();
      if (first.data.session) {
        listener.subscription.unsubscribe();
        go(nextPath());
        return;
      }

      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled || finished) return;

      const second = await supabase.auth.getSession();
      listener.subscription.unsubscribe();
      if (second.data.session) {
        go(nextPath());
        return;
      }

      setMessage(
        "Google sign-in did not complete in this browser tab. Use Continue with Google again on this same site, and do not open the link in another app."
      );
      setTimeout(() => go("/login"), 3500);
    })();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4 text-center">
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
