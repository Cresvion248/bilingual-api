import React, { useState } from "react";
import { Download, FileAudio, Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import AudioRecorder from "@/components/AudioRecorder";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function SpeechToText() {
  const { t } = useI18n();
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("auto");
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

  const downloadTranscript = () => {
    if (!result) return;
    const blob = new Blob([result.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cresvion-transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const uploaded = await base44.integrations.Core.UploadPublicFile({ file });
      const res = await base44.functions.invoke("stt", {
        audio_url: uploaded.file_url,
        language
      });
      setResult(res.data);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const languageOptions = [
    { value: "auto", label: t("stt.langAuto") },
    { value: "en", label: t("stt.langEn") },
    { value: "es", label: t("stt.langEs") }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("stt.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("stt.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("stt.upload")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="audio-file" className="sr-only">
                {t("stt.upload")}
              </Label>
              <input
                id="audio-file"
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac,.aac"
                onChange={pickFile}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileAudio className="h-4 w-4 shrink-0" aria-hidden="true" />
              {file ? t("stt.fileInfo", { name: file.name, size: formatSize(file.size) }) : t("stt.noFile")}
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
          <div className="space-y-2">
            <Label htmlFor="stt-language">{t("stt.languageLabel")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="stt-language" className="w-full md:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={submit} disabled={!file || loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("stt.processing")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                {t("stt.submit")}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">{t("stt.usageEstimate")}</p>
          <p className="text-xs text-muted-foreground">{t("stt.autoDetectNote")}</p>

          {error && <ErrorAlert error={error} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("stt.transcript")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result ? (
            <>
              <div className="min-h-24 rounded-lg border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap text-foreground">
                {result.transcript}
              </div>
              {result.detected_language && (
                <p className="text-sm text-muted-foreground">
                  {t("stt.detectedLanguage", { language: result.detected_language })}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <CopyButton value={result.transcript} label={t("stt.copyTranscript")} />
                <Button variant="outline" size="sm" className="gap-2" onClick={downloadTranscript}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("stt.downloadTranscript")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("stt.placeholderResult")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}