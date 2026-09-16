import { supabase } from "@/api/supabaseClient";
import { updateProfile } from "@/api/profiles";
import { listApiKeys, createApiKey, revokeApiKey } from "@/api/apiKeys";
import { usageSummary, purgeUsageRecords } from "@/api/usage";
import { adminOverview, providerStatus as adminProviderStatus } from "@/api/admin";
import { stt, tts, pipeline, uploadSpeechFile, providerStatus } from "@/api/speech";
import { getSettings, updateAppSetting } from "@/api/settings";

function siteOrigin() {
  if (typeof window === "undefined") return "http://localhost:5173";
  return window.location.origin;
}

function wrapData(payload) {
  return { data: payload };
}

const functionHandlers = {
  updateProfile: (payload) => updateProfile(payload || {}),
  listApiKeys: (payload) => listApiKeys(payload || {}),
  createApiKey: (payload) => createApiKey(payload || {}),
  revokeApiKey: (payload) => revokeApiKey(payload || {}),
  usageSummary: (payload) => usageSummary(payload || {}),
  purgeUsageRecords: () => purgeUsageRecords(),
  adminOverview: () => adminOverview(),
  providerStatus: () => providerStatus().catch(() => adminProviderStatus()),
  stt: (payload) => stt(payload || {}),
  tts: (payload) => tts(payload || {}),
  pipeline: (payload) => pipeline(payload || {}),
  authenticateApiKey: async () => ({ authenticated: false })
};

export const app = {
  auth: {
    async loginViaEmailPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async loginWithProvider(provider, returnTo = "/") {
      const next = returnTo.startsWith("/") ? returnTo : "/";
      try {
        sessionStorage.setItem("auth_return_to", next);
      } catch {
        /* ignore */
      }
      const redirectTo = `${siteOrigin()}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      });
      if (error) throw error;
    },
    async register({ email, password }) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${siteOrigin()}/` }
      });
      if (error) throw error;
    },
    async verifyOtp({ email, otpCode }) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email"
      });
      if (error) throw error;
      return { access_token: data.session?.access_token };
    },
    async resendOtp(email) {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
    },
    setToken() {},
    async resetPasswordRequest(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteOrigin()}/reset-password`
      });
      if (error) throw error;
    },
    async resetPassword({ newPassword }) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    async logout() {
      await supabase.auth.signOut();
    },
    redirectToLogin() {
      if (typeof window !== "undefined") window.location.assign("/login");
    }
  },
  functions: {
    async invoke(name, payload = {}) {
      const handler = functionHandlers[name];
      if (!handler) {
        const err = new Error("NOT_FOUND");
        err.code = "NOT_FOUND";
        throw err;
      }
      const data = await handler(payload);
      return wrapData(data);
    }
  },
  integrations: {
    Core: {
      async UploadPublicFile({ file }) {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id || "anon";
        const file_url = await uploadSpeechFile(file, userId);
        return { file_url };
      }
    }
  }
};

export const base44 = app;

export { getSettings, updateAppSetting };
