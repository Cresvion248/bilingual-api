import { corsHeaders, errorResponse, getSettings, resolveAuth } from "../_shared/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  const requestId = "req_" + crypto.randomUUID();
  try {
    const auth = await resolveAuth(req);
    const settings = auth.settings || await getSettings(auth.admin);
    const gemini = !!(Deno.env.get("GEMINI_API_KEY") || "");
    const cf = !!(Deno.env.get("CLOUDFLARE_ACCOUNT_ID") && Deno.env.get("CLOUDFLARE_AUTH_TOKEN"));
    const provider = String(settings.tts_provider || "gemini").toLowerCase() === "cloudflare" ? "cloudflare" : "gemini";
    return Response.json({
      stt_configured: gemini,
      tts_configured: provider === "cloudflare" ? cf : gemini,
      tts_provider: provider,
      assistant_enabled: String(settings.pipeline_assistant_model || "disabled") === "enabled",
      request_id: requestId
    }, { headers: corsHeaders() });
  } catch (error) {
    return errorResponse(error, requestId);
  }
});
