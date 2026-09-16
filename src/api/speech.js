import { supabase } from "@/api/supabaseClient";

export const SPEECH_UPLOAD_BUCKET = "speech-uploads";

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function invokeJson(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const err = new Error(error.message || name);
    err.code = error.message || "FUNCTION_ERROR";
    throw err;
  }
  if (data?.error) {
    const err = new Error(data.error.message || data.error.code);
    err.code = data.error.code;
    err.request_id = data.error.request_id;
    throw err;
  }
  return data;
}

export async function stt({ file, audio_url, language = "auto" }) {
  if (file) {
    return invokeJson("stt", {
      audio_base64: await fileToBase64(file),
      mime_type: file.type || "audio/webm",
      language
    });
  }
  return invokeJson("stt", { audio_url, language });
}

export async function tts({ text, voice }) {
  return invokeJson("tts", { text, voice });
}

export async function pipeline({ file, audio_url, language = "auto", mode = "repeat" }) {
  if (file) {
    return invokeJson("pipeline", {
      audio_base64: await fileToBase64(file),
      mime_type: file.type || "audio/webm",
      language,
      mode
    });
  }
  return invokeJson("pipeline", { audio_url, language, mode });
}

export async function uploadSpeechFile(file, userId) {
  const path = `${userId}/${Date.now()}-${file.name || "audio.webm"}`;
  const { error } = await supabase.storage.from(SPEECH_UPLOAD_BUCKET).upload(path, file, {
    contentType: file.type || "audio/webm",
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(SPEECH_UPLOAD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function providerStatus() {
  return invokeJson("provider-status", {});
}
