import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { supabase } from "@/api/supabaseClient";

const AuthContext = createContext(null);

function mergeUser(sessionUser, profile) {
  if (!sessionUser) return null;
  return {
    id: sessionUser.id,
    email: sessionUser.email || (profile && profile.email) || "",
    full_name:
      (profile && profile.full_name) ||
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.name ||
      "",
    display_name: (profile && profile.display_name) || "",
    role: (profile && profile.role) || "user",
    preferred_interface_language:
      (profile && profile.preferred_interface_language) || "en",
    timezone: (profile && profile.timezone) || "UTC",
    account_status: (profile && profile.account_status) || "active",
    user_id: (profile && profile.user_id) || sessionUser.id
  };
}

function siteOrigin() {
  if (typeof window === "undefined") return "http://localhost:5173";
  return window.location.origin;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [publicSettings, setPublicSettings] = useState({});
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadPublicSettings = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_name, setting_value");
      if (error) {
        setPublicSettings({});
        return;
      }
      const next = {};
      for (const row of data || []) {
        if (row.setting_name != null) next[row.setting_name] = row.setting_value;
      }
      setPublicSettings(next);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, []);

  const loadProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null);
      setUser(null);
      setAuthError(null);
      return null;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sessionUser.id)
      .maybeSingle();

    let row = data;
    if (error || !row) {
      await new Promise((r) => setTimeout(r, 400));
      const retry = await supabase.from("profiles").select("*").eq("id", sessionUser.id).maybeSingle();
      row = retry.data;
    }
    if (!row) {
      const insert = {
        id: sessionUser.id,
        user_id: sessionUser.id,
        email: sessionUser.email || "",
        full_name:
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name ||
          "",
        display_name: sessionUser.user_metadata?.name || "",
        preferred_interface_language: "en",
        timezone: "UTC",
        role: "user",
        account_status: "active"
      };
      const { data: created } = await supabase.from("profiles").upsert(insert).select().maybeSingle();
      row = created || insert;
    }

    if (row.account_status === "pending") {
      setProfile(row);
      setUser(mergeUser(sessionUser, row));
      setAuthError({ type: "user_not_registered" });
      return row;
    }

    setProfile(row);
    setUser(mergeUser(sessionUser, row));
    setAuthError(null);
    return row;
  }, []);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const { data } = await supabase.auth.getSession();
      const nextSession = data?.session || null;
      setSession(nextSession);
      await loadProfile(nextSession?.user || null);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [loadProfile]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const sessionUser = data?.user || session?.user || null;
    return loadProfile(sessionUser);
  }, [loadProfile, session]);

  useEffect(() => {
    loadPublicSettings();
    checkUserAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        await loadProfile(nextSession?.user || null);
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [checkUserAuth, loadProfile, loadPublicSettings]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    setSession(data.session);
    await loadProfile(data.user);
    return data;
  }, [loadProfile]);

  const register = useCallback(async ({ email, password, display_name }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteOrigin()}/`,
        data: {
          display_name: display_name || "",
          full_name: display_name || ""
        }
      }
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.user);
    }
    return data;
  }, [loadProfile]);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteOrigin()}/auth/callback` }
    });
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteOrigin()}/reset-password`
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
  }, []);

  const navigateToLogin = useCallback(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      publicSettings,
      appPublicSettings: publicSettings,
      isAuthenticated: !!(session && user && !authError),
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authError,
      checkUserAuth,
      checkAppState: checkUserAuth,
      refreshUser,
      login,
      register,
      loginWithGoogle,
      sendPasswordReset,
      updatePassword,
      logout,
      navigateToLogin
    }),
    [
      user,
      profile,
      session,
      publicSettings,
      authError,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      checkUserAuth,
      refreshUser,
      login,
      register,
      loginWithGoogle,
      sendPasswordReset,
      updatePassword,
      logout,
      navigateToLogin
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export default AuthContext;
