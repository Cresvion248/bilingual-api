import React, { useState } from "react";
import { Loader2, Play, Repeat2, Sparkles, Upload } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import AudioRecorder from "@/components/AudioRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SpeechPipeline() {
  const { t } = useI18n();
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("auto");
  const [mode, setMode] = useState("repeat");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleRecorded = (recordedFile) => {
    setFile(recordedFile);
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const uploaded = await base44.integrations.Core.UploadPublicFile({ file });
      const res = await base44.functions.invoke("pipeline", {
        audio_url: uploaded.file_url,
        language,
        mode
      });
      setResult(res.data);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("pipeline.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pipeline.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("stt.upload")}</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              id="pipeline-audio"
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac,.aac"
              onChange={pickFile}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {file ? t("stt.fileInfo", { name: file.name, size: file.size ? (file.size / 1024).toFixed(0) + " KB" : "" }) : t("stt.noFile")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("stt.record")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioRecorder onRecorded={handleRecorded} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pipeline-language">{t("stt.languageLabel")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="pipeline-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("stt.langAuto")}</SelectItem>
                  <SelectItem value="en">{t("stt.langEn")}</SelectItem>
                  <SelectItem value="es">{t("stt.langEs")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pipeline-mode">{t("pipeline.modeLabel")}</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="pipeline-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repeat">{t("pipeline.modeRepeat")}</SelectItem>
                  <SelectItem value="assistant">{t("pipeline.modeAssistant")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm text-muted-foreground">
              <Repeat2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("pipeline.repeatExplain")}
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("pipeline.assistantExplain")}
            </div>
          </div>

          <Button onClick={submit} disabled={!file || loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("pipeline.processing")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                {t("pipeline.submit")}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">{t("pipeline.usageInfo")}</p>

          {error && <ErrorAlert error={error} />}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t("pipeline.transcript")} — {t("pipeline.responsePreview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t("pipeline.transcriptPreview")}</p>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground">
                {result.transcript}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t("pipeline.responsePreview")}</p>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground">
                {result.response_text}
              </div>
            </div>
            {result.audio && (
              <div className="flex items-center gap-3">
                <Play className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <audio
                  controls
                  src={URL.createObjectURL(
                    new Blob([Uint8Array.from(atob(result.audio), (c) => c.charCodeAt(0))], {
                      type: result.content_type || "audio/mpeg"
                    })
                  )}
                  className="w-full"
                >
                  {t("tts.noAudio")}
                </audio>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}