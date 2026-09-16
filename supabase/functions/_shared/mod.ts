import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown;
  constructor(code: string, status: number, message: string, details: unknown = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const ERROR_DEFS: Record<string, { status: number; message: string }> = {
  AUTH_REQUIRED: { status: 401, message: "Authentication required." },
  INVALID_API_KEY: { status: 401, message: "Invalid API key." },
  REVOKED_API_KEY: { status: 401, message: "This API key has been revoked." },
  EXPIRED_API_KEY: { status: 401, message: "This API key has expired." },
  ACCOUNT_SUSPENDED: { status: 403, message: "This account is suspended." },
  FORBIDDEN: { status: 403, message: "You do not have permission to perform this action." },
  MISSING_AUDIO: { status: 400, message: "No audio file was provided." },
  INVALID_AUDIO_FORMAT: { status: 400, message: "The audio format is not supported." },
  FILE_TOO_LARGE: { status: 413, message: "The audio file is too large." },
  AUDIO_TOO_LONG: { status: 400, message: "The audio is too long." },
  EMPTY_TEXT: { status: 400, message: "No text was provided." },
  TEXT_TOO_LONG: { status: 400, message: "The text is too long." },
  UNSUPPORTED_LANGUAGE: { status: 400, message: "The speech language is not supported." },
  INVALID_MODE: { status: 400, message: "The selected pipeline mode is not supported." },
  RATE_LIMIT_EXCEEDED: { status: 429, message: "Rate limit exceeded. Please try again shortly." },
  QUOTA_DAILY_EXCEEDED: { status: 429, message: "Daily quota exceeded." },
  QUOTA_MONTHLY_EXCEEDED: { status: 429, message: "Monthly quota exceeded." },
  SAFETY_THRESHOLD: { status: 429, message: "System usage reached its safety threshold. Please try again later." },
  PROVIDER_NOT_CONFIGURED: { status: 503, message: "The speech provider is not configured yet." },
  PROVIDER_TIMEOUT: { status: 504, message: "The speech provider took too long to respond." },
  PROVIDER_UNAVAILABLE: { status: 502, message: "The speech provider is currently unavailable." },
  ASSISTANT_NOT_CONFIGURED: { status: 503, message: "No response model is configured for assistant mode." },
  INTERNAL_ERROR: { status: 500, message: "An unexpected server error occurred." }
};

export function apiError(code: string, details: unknown = null) {
  const def = ERROR_DEFS[code] || ERROR_DEFS.INTERNAL_ERROR;
  return new ApiError(code, def.status, def.message, details);
}

export function errorResponse(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details, request_id: requestId } },
      { status: error.status, headers: corsHeaders() }
    );
  }
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred.", request_id: requestId } },
    { status: 500, headers: corsHeaders() }
  );
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(url, key, { auth: { persistSession: false } });
}

export function userClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const auth = req.headers.get("Authorization") || "";
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false }
  });
}

export async function hashApiKey(rawKey: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getSettings(admin: ReturnType<typeof serviceClient>) {
  const defaults: Record<string, string> = {
    tts_provider: "gemini",
    default_daily_stt_seconds: "300",
    default_daily_tts_characters: "10000",
    default_daily_requests: "20",
    rate_limit_per_minute: "10",
    max_audio_seconds: "60",
    max_audio_file_mb: "25",
    max_tts_characters: "2000",
    monthly_multiplier_days: "30",
    safety_threshold_percent: "80",
    system_daily_capacity_requests: "500",
    safety_block_enabled: "false",
    pipeline_assistant_model: "disabled",
    pipeline_assistant_prompt: ""
  };
  const { data } = await admin.from("app_settings").select("setting_name, setting_value");
  const settings = { ...defaults };
  for (const row of data || []) {
    if (row.setting_name) settings[row.setting_name] = String(row.setting_value ?? "");
  }
  return settings;
}

export function getNumber(settings: Record<string, string>, key: string, fallback: number) {
  const n = Number(settings[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function resolveAuth(req: Request) {
  const admin = serviceClient();
  const settings = await getSettings(admin);
  const apiKeyHeader = String(req.headers.get("X-API-Key") || "").trim();

  if (apiKeyHeader) {
    if (!apiKeyHeader.startsWith("cs_live_")) throw apiError("INVALID_API_KEY");
    const hash = await hashApiKey(apiKeyHeader);
    const { data: keys } = await admin.from("api_keys").select("*").eq("key_hash", hash).limit(1);
    const key = keys?.[0];
    if (!key) throw apiError("INVALID_API_KEY");
    if (key.status === "revoked") throw apiError("REVOKED_API_KEY");
    if (key.status === "expired") throw apiError("EXPIRED_API_KEY");
    if (key.status !== "active") throw apiError("INVALID_API_KEY");
    const { data: profile } = await admin.from("profiles").select("*").eq("id", key.user_id).maybeSingle();
    if (profile?.account_status === "suspended") throw apiError("ACCOUNT_SUSPENDED");
    return { userId: key.user_id as string, apiKey: key, profile, settings, admin };
  }

  const client = userClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw apiError("AUTH_REQUIRED");
  const { data: profile } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (profile?.account_status === "suspended") throw apiError("ACCOUNT_SUSPENDED");
  return { userId: data.user.id, apiKey: null, profile, settings, admin };
}

export async function listRecordsSince(admin: ReturnType<typeof serviceClient>, sinceIso: string, userId: string | null) {
  let q = admin.from("usage_records").select("*").gte("created_at", sinceIso);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return data || [];
}

export function summarize(records: any[]) {
  const totals = { requests: 0, successes: 0, errors: 0, stt_seconds: 0, tts_characters: 0 };
  for (const r of records || []) {
    totals.requests += 1;
    if (r.status === "success") {
      totals.successes += 1;
      totals.stt_seconds += r.stt_seconds || 0;
      totals.tts_characters += r.tts_characters || 0;
    } else totals.errors += 1;
  }
  return totals;
}

export async function enforceGate(
  admin: ReturnType<typeof serviceClient>,
  opts: { userId: string; settings: Record<string, string>; limits: any; pendingSttSeconds?: number; pendingTtsCharacters?: number }
) {
  const perMinute = getNumber(opts.settings, "rate_limit_per_minute", 10);
  const recent = await listRecordsSince(admin, new Date(Date.now() - 60000).toISOString(), opts.userId);
  if (recent.length >= perMinute) throw apiError("RATE_LIMIT_EXCEEDED", { limit: perMinute });

  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  const todayRecords = await listRecordsSince(admin, startToday.toISOString(), opts.userId);
  const today = summarize(todayRecords);
  if (today.successes >= getNumber(opts.settings, "default_daily_requests", 20)) {
    throw apiError("QUOTA_DAILY_EXCEEDED");
  }
  if ((opts.pendingSttSeconds || 0) > 0 && today.stt_seconds >= opts.limits.daily_stt_seconds) {
    throw apiError("QUOTA_DAILY_EXCEEDED");
  }
  if ((opts.pendingTtsCharacters || 0) > 0 && today.tts_characters + (opts.pendingTtsCharacters || 0) > opts.limits.daily_tts_characters) {
    throw apiError("QUOTA_DAILY_EXCEEDED");
  }
}

export function limitsFor(auth: any) {
  if (auth.apiKey) {
    return {
      daily_stt_seconds: auth.apiKey.daily_stt_seconds_limit || 300,
      daily_tts_characters: auth.apiKey.daily_tts_characters_limit || 10000,
      monthly_stt_seconds: auth.apiKey.monthly_stt_seconds_limit || 9000,
      monthly_tts_characters: auth.apiKey.monthly_tts_characters_limit || 300000
    };
  }
  const dailyStt = getNumber(auth.settings, "default_daily_stt_seconds", 300);
  const dailyTts = getNumber(auth.settings, "default_daily_tts_characters", 10000);
  const mult = getNumber(auth.settings, "monthly_multiplier_days", 30);
  return {
    daily_stt_seconds: dailyStt,
    daily_tts_characters: dailyTts,
    monthly_stt_seconds: dailyStt * mult,
    monthly_tts_characters: dailyTts * mult
  };
}

export async function recordUsage(admin: ReturnType<typeof serviceClient>, entry: Record<string, unknown>) {
  await admin.from("usage_records").insert(entry);
}

export async function touchApiKey(admin: ReturnType<typeof serviceClient>, key: any) {
  if (!key) return;
  await admin.from("api_keys").update({ last_used_date: new Date().toISOString() }).eq("id", key.id);
}

export function usageUnits(sttSeconds: number, ttsCharacters: number) {
  return Math.max(1, Math.ceil(sttSeconds || 0) + Math.ceil(ttsCharacters || 0));
}

export function validateLanguage(value: unknown) {
  const lang = String(value || "auto").toLowerCase().trim();
  if (["auto", "en", "es"].includes(lang)) return lang;
  throw apiError("UNSUPPORTED_LANGUAGE");
}

export function validateText(text: unknown, maxChars: number) {
  if (text == null || String(text).trim() === "") throw apiError("EMPTY_TEXT");
  const value = String(text);
  if (value.length > maxChars) throw apiError("TEXT_TOO_LONG", { max_characters: maxChars });
  return value;
}

export async function transcribeGemini(audioBytes: ArrayBuffer, mimeType: string, language: string, apiKey: string) {
  if (!apiKey) throw apiError("PROVIDER_NOT_CONFIGURED", { provider: "gemini" });
  if (mimeType === "video/webm") mimeType = "audio/webm";
  if (mimeType === "video/mp4") mimeType = "audio/mp4";
  const bytes = new Uint8Array(audioBytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const prompt = language === "en"
    ? "Transcribe this audio verbatim in English."
    : language === "es"
      ? "Transcribe this audio verbatim in Spanish."
      : "Transcribe this audio verbatim. It may be English, Spanish, or a mix of both.";
  const model = "gemini-2.5-flash";
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType || "audio/webm", data: btoa(binary) } }] }]
    })
  });
  if (!resp.ok) throw apiError("PROVIDER_UNAVAILABLE", { provider: "gemini" });
  const body = await resp.json();
  const parts = body?.candidates?.[0]?.content?.parts || [];
  const transcript = parts.map((p: any) => p.text || "").join("").trim();
  if (!transcript) throw apiError("PROVIDER_UNAVAILABLE", { provider: "gemini" });
  return { transcript, detected_language: language !== "auto" ? language : null, duration: Math.max(1, Math.round(audioBytes.byteLength / 16000)) };
}

export async function synthesizeGemini(text: string, voice: string | null, apiKey: string) {
  if (!apiKey) throw apiError("PROVIDER_NOT_CONFIGURED", { provider: "gemini" });
  const model = "gemini-2.5-flash-preview-tts";
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Zephyr" } } }
      }
    })
  });
  if (!resp.ok) throw apiError("PROVIDER_UNAVAILABLE", { provider: "gemini" });
  const body = await resp.json();
  const data = body?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    || body?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
  if (!data) throw apiError("PROVIDER_UNAVAILABLE", { provider: "gemini" });
  return { audioBase64: data, contentType: "audio/wav" };
}

export async function invokeAssistant(prompt: string, transcript: string, apiKey: string) {
  const model = "gemini-2.5-flash";
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt + "\n\nUser message: " + transcript.slice(0, 1000) }] }]
    })
  });
  if (!resp.ok) throw apiError("PROVIDER_UNAVAILABLE", { provider: "gemini" });
  const body = await resp.json();
  return String(body?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

export async function readAudioPayload(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("audio") || form.get("file");
    const language = validateLanguage(typeof form.get("language") === "string" ? form.get("language") : "auto");
    const mode = String(form.get("mode") || "repeat");
    if (!file || typeof file === "string") throw apiError("MISSING_AUDIO");
    const bytes = await (file as File).arrayBuffer();
    return { audioBytes: bytes, mimeType: (file as File).type || "audio/webm", language, mode, text: form.get("text"), voice: form.get("voice") };
  }
  const payload = await req.json().catch(() => ({}));
  if (payload.audio_base64) {
    const raw = Uint8Array.from(atob(payload.audio_base64), (c) => c.charCodeAt(0));
    return {
      audioBytes: raw.buffer,
      mimeType: payload.mime_type || "audio/webm",
      language: validateLanguage(payload.language),
      mode: payload.mode || "repeat",
      text: payload.text,
      voice: payload.voice
    };
  }
  if (payload.audio_url) {
    const fileResp = await fetch(payload.audio_url);
    if (!fileResp.ok) throw apiError("MISSING_AUDIO");
    return {
      audioBytes: await fileResp.arrayBuffer(),
      mimeType: fileResp.headers.get("content-type") || "audio/webm",
      language: validateLanguage(payload.language),
      mode: payload.mode || "repeat",
      text: payload.text,
      voice: payload.voice
    };
  }
  return {
    audioBytes: null,
    mimeType: "",
    language: validateLanguage(payload.language),
    mode: payload.mode || "repeat",
    text: payload.text,
    voice: payload.voice
  };
}
