import { supabase } from "@/api/supabaseClient";
import { currentUserId, getNumber } from "@/api/helpers";

export const DEFAULT_SETTINGS = {
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

export async function getSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_name, setting_value")
    .limit(200);
  if (error) return { ...DEFAULT_SETTINGS };
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of data || []) {
    if (row?.setting_name != null && row.setting_value != null) {
      settings[row.setting_name] = String(row.setting_value);
    }
  }
  return settings;
}

export async function listAppSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("setting_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateAppSetting(setting_name, setting_value) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ setting_value: String(setting_value), updated_by: userId })
    .eq("setting_name", setting_name)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export { getNumber };
