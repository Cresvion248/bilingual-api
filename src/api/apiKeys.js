import { supabase } from "@/api/supabaseClient";
import {
  MAX_API_KEYS_PER_USER,
  apiError,
  currentUserId,
  generateApiKey,
  hashApiKey,
  keyDisplayPrefix,
  requestId,
  withCreatedDate
} from "@/api/helpers";
import { getNumber, getSettings } from "@/api/settings";

function safeKey(key) {
  const row = withCreatedDate(key);
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    key_prefix: row.key_prefix,
    status: row.status,
    created_date: row.created_date,
    last_used_date: row.last_used_date || null,
    revoked_date: row.revoked_date || null,
    quotas: {
      daily_stt_seconds_limit: row.daily_stt_seconds_limit,
      daily_tts_characters_limit: row.daily_tts_characters_limit,
      monthly_stt_seconds_limit: row.monthly_stt_seconds_limit,
      monthly_tts_characters_limit: row.monthly_tts_characters_limit
    }
  };
}

export async function listApiKeys({ all = false } = {}) {
  const userId = await currentUserId();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const wantsAll = all === true && profile?.role === "admin";

  let q = supabase.from("api_keys").select("*").order("created_at", { ascending: false });
  if (!wantsAll) q = q.eq("user_id", userId);
  q = q.limit(500);
  const { data, error } = await q;
  if (error) throw error;
  return { keys: (data || []).map(safeKey), request_id: requestId() };
}

export async function createApiKey({ name } = {}) {
  const userId = await currentUserId();
  const trimmed = String(name || "").trim();
  if (!trimmed || trimmed.length > 64) throw apiError("INVALID_NAME");

  const { data: existing, error: listError } = await supabase
    .from("api_keys")
    .select("id, status")
    .eq("user_id", userId);
  if (listError) throw listError;
  const activeCount = (existing || []).filter((k) => k.status === "active").length;
  if (activeCount >= MAX_API_KEYS_PER_USER) {
    throw apiError("KEY_LIMIT_REACHED", { limit: MAX_API_KEYS_PER_USER });
  }

  const settings = await getSettings();
  const dailyStt = getNumber(settings, "default_daily_stt_seconds", 300);
  const dailyTts = getNumber(settings, "default_daily_tts_characters", 10000);
  const mult = getNumber(settings, "monthly_multiplier_days", 30);
  const rawKey = generateApiKey();
  const hash = await hashApiKey(rawKey);
  const prefix = keyDisplayPrefix(rawKey);

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    name: trimmed,
    key_prefix: prefix,
    key_hash: hash,
    status: "active",
    daily_stt_seconds_limit: dailyStt,
    daily_tts_characters_limit: dailyTts,
    monthly_stt_seconds_limit: dailyStt * mult,
    monthly_tts_characters_limit: dailyTts * mult
  });
  if (error) throw error;

  return {
    api_key: rawKey,
    name: trimmed,
    key_prefix: prefix,
    status: "active",
    request_id: requestId()
  };
}

export async function revokeApiKey({ key_id } = {}) {
  const userId = await currentUserId();
  if (!key_id) throw apiError("NOT_FOUND");

  const { data: key, error } = await supabase.from("api_keys").select("*").eq("id", key_id).maybeSingle();
  if (error || !key) throw apiError("NOT_FOUND");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (key.user_id !== userId && profile?.role !== "admin") throw apiError("FORBIDDEN");

  if (key.status !== "revoked") {
    const { error: upd } = await supabase
      .from("api_keys")
      .update({ status: "revoked", revoked_date: new Date().toISOString() })
      .eq("id", key.id);
    if (upd) throw upd;
  }

  return { success: true, key_id: key.id, status: "revoked", request_id: requestId() };
}

export async function filterApiKeys(query = {}, sort = "-created_date", limit = 100) {
  let q = supabase.from("api_keys").select("*");
  if (query.user_id) q = q.eq("user_id", query.user_id);
  if (query.status) q = q.eq("status", query.status);
  if (query.key_hash) q = q.eq("key_hash", query.key_hash);
  const desc = String(sort).startsWith("-");
  q = q.order("created_at", { ascending: !desc }).limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(withCreatedDate);
}
