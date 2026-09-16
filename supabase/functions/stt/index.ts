import {
  corsHeaders,
  enforceGate,
  errorResponse,
  limitsFor,
  readAudioPayload,
  recordUsage,
  resolveAuth,
  touchApiKey,
  transcribeGemini,
  usageUnits
} from "../_shared/mod.ts";
import { apiError, getNumber } from "../_shared/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  const requestId = "req_" + crypto.randomUUID();
  let auth: any = null;
  let usageBase: any = null;
  try {
    auth = await resolveAuth(req);
    usageBase = { user_id: auth.userId, api_key_id: auth.apiKey?.id || null, endpoint: "stt", request_id: requestId };
    const limits = limitsFor(auth);
    const maxBytes = getNumber(auth.settings, "max_audio_file_mb", 25) * 1024 * 1024;
    const payload = await readAudioPayload(req);
    if (!payload.audioBytes) throw apiError("MISSING_AUDIO");
    if (payload.audioBytes.byteLength > maxBytes) throw apiError("FILE_TOO_LARGE");
    await enforceGate(auth.admin, { userId: auth.userId, settings: auth.settings, limits, pendingSttSeconds: 1 });
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const result = await transcribeGemini(payload.audioBytes, payload.mimeType, payload.language, geminiKey);
    const sttSeconds = Math.max(1, Math.ceil(result.duration || 1));
    await recordUsage(auth.admin, { ...usageBase, status: "success", stt_seconds: sttSeconds, detected_language: result.detected_language });
    await touchApiKey(auth.admin, auth.apiKey);
    return Response.json({
      transcript: result.transcript,
      detected_language: result.detected_language,
      duration: result.duration,
      request_id: requestId,
      usage_units: usageUnits(sttSeconds, 0)
    }, { headers: corsHeaders() });
  } catch (error) {
    if (auth && usageBase && error instanceof Error) {
      await recordUsage(auth.admin, { ...usageBase, status: "error", error_code: (error as any).code || "INTERNAL_ERROR" }).catch(() => {});
    }
    return errorResponse(error, requestId);
  }
});
