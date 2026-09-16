import React, { useEffect, useState } from "react";
import { AudioLines, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_VOICE, GEMINI_VOICES } from "@/lib/voices";

export default function TextToSpeech() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(DEFAULT_VOICE);
  const [maxChars, setMaxChars] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioExt, setAudioExt] = useState("mp3");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    base44.functions
      .invoke("usageSummary", {})
      .then((res) => {
        if (!cancelled && res.data && res.data.limits && res.data.limits.max_tts_characters) {
          setMaxChars(res.data.limits.max_tts_characters);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const res = await base44.functions.invoke("tts", { text, voice });
      const bytes = Uint8Array.from(atob(res.data.audio), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: res.data.content_type || "audio/mpeg" });
      setAudioUrl(URL.createObjectURL(blob));
      setAudioExt((res.data.content_type || "").includes("wav") ? "wav" : "mp3");
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("tts.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("tts.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tts-text">{t("tts.textLabel")}</Label>
              <span className={text.length > maxChars ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
                {t("tts.charCount", { current: text.length, max: maxChars })}
              </span>
            </div>
            <Textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("tts.textPlaceholder")}
              rows={6}
              maxLength={maxChars * 2}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full space-y-2 md:w-56">
              <Label htmlFor="tts-voice">
                {t("tts.voiceLabel")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span>
              </Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger id="tts-voice" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_VOICES.map((v) => (
                    <SelectItem key={v.name} value={v.name}>
                      {v.name} — {v.style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generate} disabled={loading || !text.trim() || text.length > maxChars} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("tts.generating")}
                </>
              ) : (
                <>
                  <AudioLines className="h-4 w-4" aria-hidden="true" />
                  {t("tts.generate")}
                </>
              )}
            </Button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              {t("common.example")}: <em>“{t("tts.mixedExample")}”</em>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("tts.mixedNote")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("tts.usageEstimate")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("tts.voiceNote")}</p>
          </div>

          {error && <ErrorAlert error={error} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("tts.playAudio")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {audioUrl ? (
            <>
              <audio controls src={audioUrl} className="w-full">
                {t("tts.noAudio")}
              </audio>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={audioUrl} download={"cresvion-speech." + audioExt}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("tts.downloadAudio")}
                </a>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("tts.noAudio")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}