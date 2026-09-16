import { supabase } from "@/api/supabaseClient";
import { apiError, currentUserId, monthStartUtc, periodStartUtc, requestId, summarizeRecords } from "@/api/helpers";
import { getNumber, getSettings } from "@/api/settings";
import { filterUsageRecords } from "@/api/usage";
import { withCreatedDate } from "@/api/helpers";

export async function adminOverview() {
  const userId = await currentUserId();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") throw apiError("FORBIDDEN");

  const settings = await getSettings();
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
  if (pErr) throw pErr;
  const { data: keys, error: kErr } = await supabase.from("api_keys").select("*").limit(500);
  if (kErr) throw kErr;

  const { data: todayRows } = await supabase.from("usage_records").select("*").gte("created_at", periodStartUtc(0));
  const { data: monthRows } = await supabase.from("usage_records").select("*").gte("created_at", monthStartUtc());
  const today = summarizeRecords(todayRows);
  const month = summarizeRecords(monthRows);
  const recent = await filterUsageRecords({}, "-created_date", 50);

  const capacity = getNumber(settings, "system_daily_capacity_requests", 500);
  const thresholdPercent = getNumber(settings, "safety_threshold_percent", 80);
  const warning = today.requests >= (capacity * thresholdPercent) / 100;

  return {
    users: (profiles || []).map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role
    })),
    profiles: (profiles || []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: p.display_name,
      account_status: p.account_status,
      preferred_interface_language: p.preferred_interface_language,
      timezone: p.timezone
    })),
    keys: (keys || []).map((k) => ({
      id: k.id,
      user_id: k.user_id,
      name: k.name,
      key_prefix: k.key_prefix,
      status: k.status,
      created_date: k.created_at,
      last_used_date: k.last_used_date || null,
      revoked_date: k.revoked_date || null,
      quotas: {
        daily_stt_seconds_limit: k.daily_stt_seconds_limit,
        daily_tts_characters_limit: k.daily_tts_characters_limit,
        monthly_stt_seconds_limit: k.monthly_stt_seconds_limit,
        monthly_tts_characters_limit: k.monthly_tts_characters_limit
      }
    })),
    usage: { today, month },
    assistant_enabled: String(settings.pipeline_assistant_model || "disabled") === "enabled",
    provider_status: {
      stt_configured: false,
      tts_provider: settings.tts_provider || "gemini",
      tts_configured: false
    },
    safety: {
      warning,
      system_requests_today: today.requests,
      capacity,
      threshold_percent: thresholdPercent,
      block_enabled: String(settings.safety_block_enabled || "").toLowerCase() === "true"
    },
    settings,
    recent: recent.map(withCreatedDate),
    request_id: requestId()
  };
}

export async function providerStatus() {
  const settings = await getSettings();
  return {
    stt_configured: false,
    tts_configured: false,
    tts_provider: settings.tts_provider || "gemini",
    assistant_enabled: String(settings.pipeline_assistant_model || "disabled") === "enabled",
    request_id: requestId()
  };
}
