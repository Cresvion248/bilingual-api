import { supabase } from "@/api/supabaseClient";
import { withCreatedDate } from "@/api/helpers";

export async function listAnnouncements({ activeOnly = true, language } = {}) {
  let q = supabase.from("system_announcements").select("*").order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("active", true);
  if (language) q = q.eq("interface_language", language);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(withCreatedDate);
}

export async function createAnnouncement(fields) {
  const { data, error } = await supabase
    .from("system_announcements")
    .insert({
      title: fields.title,
      message: fields.message,
      interface_language: fields.interface_language || "en",
      active: fields.active !== false
    })
    .select()
    .single();
  if (error) throw error;
  return withCreatedDate(data);
}

export async function updateAnnouncement(id, fields) {
  const { data, error } = await supabase
    .from("system_announcements")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return withCreatedDate(data);
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from("system_announcements").delete().eq("id", id);
  if (error) throw error;
  return { success: true, id };
}
