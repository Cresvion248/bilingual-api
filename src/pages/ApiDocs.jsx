import React from "react";
import { KeyRound } from "lucide-react";
import { useI18n } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_CODES = [
  "AUTH_REQUIRED", "INVALID_API_KEY", "REVOKED_API_KEY", "EXPIRED_API_KEY", "ACCOUNT_SUSPENDED",
  "MISSING_AUDIO", "INVALID_AUDIO_FORMAT", "FILE_TOO_LARGE", "AUDIO_TOO_LONG", "EMPTY_TEXT",
  "TEXT_TOO_LONG", "UNSUPPORTED_LANGUAGE", "UNSUPPORTED_VOICE", "RATE_LIMIT_EXCEEDED",
  "QUOTA_DAILY_EXCEEDED", "QUOTA_MONTHLY_EXCEEDED", "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_TIMEOUT", "PROVIDER_UNAVAILABLE", "ASSISTANT_NOT_CONFIGURED", "INTERNAL_ERROR"
];

const STT_CURL = [
  'curl -X POST "YOUR_CRESVION_API_URL/stt" \\',
  '  -H "X-API-Key: YOUR_CRESVION_API_KEY" \\',
  '  -F "audio=@sample.wav" \\',
  '  -F "language=auto"'
].join("\n");

const TTS_CURL = [
  'curl -X POST "YOUR_CRESVION_API_URL/tts" \\',
  '  -H "X-API-Key: YOUR_CRESVION_API_KEY" \\',
  '  -F "text=Quiero una burger, please" \\',
  '  -F "voice=Zephyr" \\',
  '  --output speech_audio.wav'
].join("\n");

const PIPELINE_CURL = [
  'curl -X POST "YOUR_CRESVION_API_URL/pipeline" \\',
  '  -H "X-API-Key: YOUR_CRESVION_API_KEY" \\',
  '  -F "audio=@sample.wav" \\',
  '  -F "mode=repeat"'
].join("\n");

const STT_RESPONSE = [
  "{",
  '  "transcript": "Quiero una burger, pero sin cebolla, please.",',
  '  "detected_language": "es",',
  '  "duration": 4.2,',
  '  "request_id": "req_...",',
  '  "usage_units": 5',
  "}"
].join("\n");

const TTS_RESPONSE = [
  "{",
  '  "audio": "<base64-encoded audio>",',
  '  "content_type": "audio/wav",',
  '  "characters": 26,',
  '  "request_id": "req_...",',
  '  "usage_units": 26',
  "}"
].join("\n");

function CodeBlock({ children }) {
  return (
    <pre dir="ltr" className="overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
      <code>{children}</code>
    </pre>
  );
}

function Section({ title, children }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title ? t(title) : ""}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export default function ApiDocs() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("apiDocs.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("apiDocs.subtitle")}</p>
      </div>

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
        {t("apiDocs.urlNote")}
      </div>

      <Section title="apiDocs.authTitle">
        <p>{t("apiDocs.authBody")}</p>
        <CodeBlock>{'X-API-Key: cs_live_...'}</CodeBlock>
      </Section>

      <Section title="apiDocs.endpointsTitle">
        <p className="font-medium text-foreground">{t("apiDocs.sttTitle")}</p>
        <p>{t("apiDocs.sttBody")}</p>
        <CodeBlock>{STT_CURL}</CodeBlock>
        <CodeBlock>{STT_RESPONSE}</CodeBlock>

        <p className="pt-3 font-medium text-foreground">{t("apiDocs.ttsTitle")}</p>
        <p>{t("apiDocs.ttsBody")}</p>
        <CodeBlock>{TTS_CURL}</CodeBlock>
        <CodeBlock>{TTS_RESPONSE}</CodeBlock>

        <p className="pt-3 font-medium text-foreground">{t("apiDocs.pipelineTitle")}</p>
        <p>{t("apiDocs.pipelineBody")}</p>
        <CodeBlock>{PIPELINE_CURL}</CodeBlock>
      </Section>

      <Section title="apiDocs.languagesTitle">
        <p className="flex items-start gap-2">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("apiDocs.languagesBody")}
        </p>
        <CodeBlock>{'language: "auto" | "en" | "es"'}</CodeBlock>
      </Section>

      <Section title="apiDocs.filesTitle">
        <p>{t("apiDocs.filesBody")}</p>
      </Section>

      <Section title="apiDocs.limitsTitle">
        <p>{t("apiDocs.limitsBody")}</p>
      </Section>

      <Section title="apiDocs.rateTitle">
        <p>{t("apiDocs.rateBody")}</p>
      </Section>

      <Section title="apiDocs.errorsTitle">
        <p>{t("apiDocs.errorsBody")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {ERROR_CODES.map((code) => (
                <tr key={code} className="border-b border-border/60 last:border-0">
                  <td dir="ltr" className="py-1.5 pr-4 font-mono text-foreground">{code}</td>
                  <td className="py-1.5">{t("errors." + code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="apiDocs.examplesTitle">
        <p>{t("apiDocs.examplesNote")}</p>
        <CodeBlock>{STT_CURL}</CodeBlock>
        <CodeBlock>{TTS_CURL}</CodeBlock>
      </Section>
    </div>
  );
}