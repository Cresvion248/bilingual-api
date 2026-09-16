import { supabase } from "@/api/supabaseClient";
import {
  currentUserId,
  monthStartUtc,
  periodStartUtc,
  requestId,
  summarizeRecords,
  withCreatedDate
} from "@/api/helpers";
import { getNumber, getSettings } from "@/api/settings";

export async function listRecordsSince(sinceIso, userId = null) {
  let q = supabase.from("usage_records").select("*").gte("created_at", sinceIso);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function filterUsageRecords(query = {}, sort = "-created_date", limit = 50) {
  let q = supabase.from("usage_records").select("*");
  if (query.user_id) q = q.eq("user_id", query.user_id);
  if (query.endpoint) q = q.eq("endpoint", query.endpoint);
  if (query.status) q = q.eq("status", query.status);
  if (query.api_key_id) q = q.eq("api_key_id", query.api_key_id);
  const desc = String(sort).startsWith("-");
  q = q.order("created_at", { ascending: !desc }).limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(withCreatedDate);
}

export async function createUsageRecord(entry) {
  const { data, error } = await supabase
    .from("usage_records")
    .insert({
      user_id: entry.user_id,
      api_key_id: entry.api_key_id || null,
      endpoint: entry.endpoint,
      status: entry.status,
      stt_seconds: entry.stt_seconds || 0,
      tts_characters: entry.tts_characters || 0,
      detected_language: entry.detected_language || null,
      request_id: entry.request_id,
      error_code: entry.error_code || null
    })
    .select()
    .single();
  if (error) throw error;
  return withCreatedDate(data);
}

export async function usageSummary({ scope } = {}) {
  const userId = await currentUserId();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const wantsSystem = scope === "system";
  if (wantsSystem && profile?.role !== "admin") {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }

  const settings = await getSettings();
  const dailyStt = getNumber(settings, "default_daily_stt_seconds", 300);
  const dailyTts = getNumber(settings, "default_daily_tts_characters", 10000);
  const mult = getNumber(settings, "monthly_multiplier_days", 30);
  const dailyRequests = getNumber(settings, "default_daily_requests", 20);
  const perMinute = getNumber(settings, "rate_limit_per_minute", 10);

  const scopeUser = wantsSystem ? null : userId;
  const recordsToday = await listRecordsSince(periodStartUtc(0), scopeUser);
  const recordsMonth = await listRecordsSince(monthStartUtc(), scopeUser);
  const today = summarizeRecords(recordsToday);
  const month = summarizeRecords(recordsMonth);

  const recent = wantsSystem
    ? await filterUsageRecords({}, "-created_date", 50)
    : await filterUsageRecords({ user_id: userId }, "-created_date", 20);

  const limits = {
    daily_stt_seconds: dailyStt,
    daily_tts_characters: dailyTts,
    monthly_stt_seconds: dailyStt * mult,
    monthly_tts_characters: dailyTts * mult,
    daily_requests: dailyRequests,
    rate_limit_per_minute: perMinute,
    max_tts_characters: getNumber(settings, "max_tts_characters", 2000),
    max_audio_seconds: getNumber(settings, "max_audio_seconds", 60)
  };

  return {
    scope: wantsSystem ? "system" : "own",
    today,
    month,
    limits,
    remaining: {
      daily_stt_seconds: Math.max(0, limits.daily_stt_seconds - today.stt_seconds),
      daily_tts_characters: Math.max(0, limits.daily_tts_characters - today.tts_characters),
      monthly_stt_seconds: Math.max(0, limits.monthly_stt_seconds - month.stt_seconds),
      monthly_tts_characters: Math.max(0, limits.monthly_tts_characters - month.tts_characters),
      daily_requests: Math.max(0, limits.daily_requests - today.successes)
    },
    recent,
    request_id: requestId()
  };
}

export async function purgeUsageRecords() {
  const userId = await currentUserId();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
  const cutoff = monthStartUtc();
  const { data, error } = await supabase.from("usage_records").delete().lt("created_at", cutoff).select("id");
  if (error) throw error;
  return { purged: (data || []).length, cutoff, request_id: requestId() };
}
