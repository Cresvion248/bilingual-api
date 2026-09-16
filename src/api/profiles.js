import { supabase } from "@/api/supabaseClient";
import { apiError, currentUserId, requestId } from "@/api/helpers";

export async function getProfile(userId) {
  const id = userId || (await currentUserId());
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateProfile(payload = {}) {
  const userId = await currentUserId();
  const fields = {};
  if (payload.display_name !== undefined) {
    const n = String(payload.display_name).trim();
    if (n.length > 80) throw apiError("INVALID_NAME");
    fields.display_name = n;
  }
  if (payload.preferred_interface_language !== undefined) {
    const l = String(payload.preferred_interface_language).toLowerCase().trim();
    if (l !== "en" && l !== "es") throw apiError("UNSUPPORTED_LANGUAGE");
    fields.preferred_interface_language = l;
  }
  if (payload.timezone !== undefined) {
    const tz = String(payload.timezone).trim() || "UTC";
    if (tz.length > 64) throw apiError("INVALID_NAME");
    fields.timezone = tz;
  }

  let { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;

  if (!existing) {
    const insert = {
      id: userId,
      user_id: userId,
      display_name: fields.display_name || "",
      preferred_interface_language: fields.preferred_interface_language || "en",
      timezone: fields.timezone || "UTC",
      role: "user",
      account_status: "active"
    };
    const { data, error } = await supabase.from("profiles").insert(insert).select().single();
    if (error) throw error;
    existing = data;
  } else if (Object.keys(fields).length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    existing = data;
  }

  return {
    profile: {
      user_id: existing.user_id || existing.id,
      display_name: existing.display_name,
      preferred_interface_language: existing.preferred_interface_language,
      timezone: existing.timezone,
      role: existing.role,
      account_status: existing.account_status
    },
    request_id: requestId()
  };
}

export async function filterProfiles(query = {}) {
  let q = supabase.from("profiles").select("*");
  if (query.user_id) q = q.eq("user_id", query.user_id);
  if (query.role) q = q.eq("role", query.role);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
