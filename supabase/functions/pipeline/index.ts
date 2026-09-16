import {
  apiError,
  corsHeaders,
  enforceGate,
  errorResponse,
  getNumber,
  invokeAssistant,
  limitsFor,
  readAudioPayload,
  recordUsage,
  resolveAuth,
  synthesizeGemini,
  touchApiKey,
  transcribeGemini,
  usageUnits,
  validateText
} from "../_shared/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  const requestId = "req_" + crypto.randomUUID();
  let auth: any = null;
  let usageBase: any = null;
  try {
    auth = await resolveAuth(req);
    usageBase = { user_id: auth.userId, api_key_id: auth.apiKey?.id || null, endpoint: "pipeline", request_id: requestId };
    const limits = limitsFor(auth);
    const maxBytes = getNumber(auth.settings, "max_audio_file_mb", 25) * 1024 * 1024;
    const maxChars = getNumber(auth.settings, "max_tts_characters", 2000);
    const payload = await readAudioPayload(req);
    if (!payload.audioBytes) throw apiError("MISSING_AUDIO");
    if (payload.audioBytes.byteLength > maxBytes) throw apiError("FILE_TOO_LARGE");
    const mode = payload.mode === "assistant" ? "assistant" : "repeat";
    if (mode === "assistant" && String(auth.settings.pipeline_assistant_model || "disabled") !== "enabled") {
      throw apiError("ASSISTANT_NOT_CONFIGURED");
    }
    await enforceGate(auth.admin, {
      userId: auth.userId,
      settings: auth.settings,
      limits,
      pendingSttSeconds: 1,
      pendingTtsCharacters: 1
    });
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const stt = await transcribeGemini(payload.audioBytes, payload.mimeType, payload.language, geminiKey);
    let responseText = stt.transcript;
    if (mode === "assistant") {
      const prompt = String(auth.settings.pipeline_assistant_prompt || "").trim() ||
        "You are a helpful bilingual assistant. Reply to the user's message in the same language they used (English, Spanish, or a mix of both). Keep your reply under 280 characters.";
      responseText = validateText(await invokeAssistant(prompt, stt.transcript, geminiKey), maxChars);
    }
    const tts = await synthesizeGemini(responseText, null, geminiKey);
    const sttSeconds = Math.max(1, Math.ceil(stt.duration || 1));
    await recordUsage(auth.admin, {
      ...usageBase,
      status: "success",
      stt_seconds: sttSeconds,
      tts_characters: responseText.length,
      detected_language: stt.detected_language
    });
    await touchApiKey(auth.admin, auth.apiKey);
    return Response.json({
      mode,
      transcript: stt.transcript,
      response_text: responseText,
      audio: tts.audioBase64,
      content_type: tts.contentType,
      request_id: requestId,
      usage_units: usageUnits(sttSeconds, responseText.length)
    }, { headers: corsHeaders() });
  } catch (error) {
    if (auth && usageBase) {
      await recordUsage(auth.admin, { ...usageBase, status: "error", error_code: (error as any).code || "INTERNAL_ERROR" }).catch(() => {});
    }
    return errorResponse(error, requestId);
  }
});
