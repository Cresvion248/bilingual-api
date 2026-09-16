import {
  corsHeaders,
  enforceGate,
  errorResponse,
  getNumber,
  limitsFor,
  readAudioPayload,
  recordUsage,
  resolveAuth,
  synthesizeGemini,
  touchApiKey,
  usageUnits,
  validateText
} from "../_shared/mod.ts";
import { apiError } from "../_shared/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  const requestId = "req_" + crypto.randomUUID();
  let auth: any = null;
  let usageBase: any = null;
  try {
    auth = await resolveAuth(req);
    usageBase = { user_id: auth.userId, api_key_id: auth.apiKey?.id || null, endpoint: "tts", request_id: requestId };
    const limits = limitsFor(auth);
    const maxChars = getNumber(auth.settings, "max_tts_characters", 2000);
    const payload = await readAudioPayload(req);
    const text = validateText(payload.text, maxChars);
    await enforceGate(auth.admin, { userId: auth.userId, settings: auth.settings, limits, pendingTtsCharacters: text.length });
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const result = await synthesizeGemini(text, payload.voice ? String(payload.voice) : null, geminiKey);
    await recordUsage(auth.admin, { ...usageBase, status: "success", tts_characters: text.length });
    await touchApiKey(auth.admin, auth.apiKey);
    return Response.json({
      audio: result.audioBase64,
      content_type: result.contentType,
      characters: text.length,
      request_id: requestId,
      usage_units: usageUnits(0, text.length)
    }, { headers: corsHeaders() });
  } catch (error) {
    if (auth && usageBase) {
      await recordUsage(auth.admin, { ...usageBase, status: "error", error_code: (error as any).code || "INTERNAL_ERROR" }).catch(() => {});
    }
    return errorResponse(error, requestId);
  }
});
