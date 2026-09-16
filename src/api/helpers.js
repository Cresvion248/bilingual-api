import { supabase } from "@/api/supabaseClient";

export const KEY_PREFIX = "cs_live_";
export const KEY_PREFIX_DISPLAY_LENGTH = 12;
export const MAX_API_KEYS_PER_USER = 5;

export function requestId() {
  return "req_" + crypto.randomUUID();
}

export function withCreatedDate(row) {
  if (!row) return row;
  return { ...row, created_date: row.created_at };
}

export function periodStartUtc(daysAgo = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

export function monthStartUtc() {
  return periodStartUtc(29);
}

export function summarizeRecords(records) {
  const totals = {
    requests: 0,
    successes: 0,
    errors: 0,
    stt_seconds: 0,
    tts_characters: 0,
    stt_requests: 0,
    tts_requests: 0,
    pipeline_requests: 0,
    rate_limit_events: 0
  };
  for (const r of records || []) {
    totals.requests += 1;
    if (r.status === "success") {
      totals.successes += 1;
      totals.stt_seconds += r.stt_seconds || 0;
      totals.tts_characters += r.tts_characters || 0;
      if (r.endpoint === "stt") totals.stt_requests += 1;
      else if (r.endpoint === "tts") totals.tts_requests += 1;
      else if (r.endpoint === "pipeline") totals.pipeline_requests += 1;
    } else {
      totals.errors += 1;
      if (r.error_code === "RATE_LIMIT_EXCEEDED") totals.rate_limit_events += 1;
    }
  }
  return totals;
}

export function usageUnits(sttSeconds, ttsCharacters) {
  const stt = Math.ceil(sttSeconds || 0);
  const tts = Math.ceil(ttsCharacters || 0);
  return Math.max(1, stt + tts);
}

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) {
    const err = new Error("AUTH_REQUIRED");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  return data.user.id;
}

export async function hashApiKey(rawKey) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return KEY_PREFIX + hex;
}

export function keyDisplayPrefix(rawKey) {
  return rawKey.slice(0, KEY_PREFIX_DISPLAY_LENGTH);
}

export function getNumber(settings, key, fallback) {
  const n = Number(settings ? settings[key] : undefined);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function apiError(code, extra) {
  const err = new Error(code);
  err.code = code;
  if (extra) Object.assign(err, extra);
  return err;
}
