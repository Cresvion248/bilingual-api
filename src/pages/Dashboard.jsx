import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AudioLines, CheckCircle2, AlertCircle, Languages, Loader2, Mic, Workflow } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/AuthContext";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import QuotaBar from "@/components/QuotaBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [providers, setProviders] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, p, a] = await Promise.all([
          base44.functions.invoke("usageSummary", {}),
          base44.functions.invoke("providerStatus", {}),
          base44.entities.SystemAnnouncement.list()
        ]);
        if (cancelled) return;
        setSummary(s.data);
        setProviders(p.data);
        setAnnouncements(((a || []).filter((x) => x.active) || []).filter(Boolean));
      } catch (e) {
        if (!cancelled) setError(extractApiError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorAlert error={error} />;

  const announcement = announcements.find((a) => a.interface_language === lang) || announcements[0];
  const displayName = (user && (user.full_name || user.email)) || "";
  const remaining = summary ? summary.remaining : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {t("dashboard.welcome", { name: displayName })}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Languages className="h-4 w-4" aria-hidden="true" />
          {t("dashboard.yourLanguage", { language: lang === "es" ? t("common.spanish") : t("common.english") })}
        </p>
      </div>

      {announcement && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("dashboard.announcement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-foreground">{announcement.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.apiStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {providers ? (
              <>
                <div className="flex items-center gap-2">
                  {providers.stt_configured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  )}
                  <span className={providers.stt_configured ? "" : "text-amber-600"}>
                    {providers.stt_configured ? t("dashboard.sttReady") : t("dashboard.setupNeeded") + " — STT"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {providers.tts_configured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  )}
                  <span className={providers.tts_configured ? "" : "text-amber-600"}>
                    {providers.tts_configured ? t("dashboard.ttsReady") : t("dashboard.setupNeeded") + " — TTS"}
                  </span>
                </div>
              </>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.dailyQuota")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {remaining ? (
              <>
                <QuotaBar label={t("usage.sttSecondsToday")} used={summary.today.stt_seconds} limit={summary.limits.daily_stt_seconds} unitKey="common.seconds" />
                <QuotaBar label={t("usage.ttsCharsToday")} used={summary.today.tts_characters} limit={summary.limits.daily_tts_characters} unitKey="common.characters" />
                <QuotaBar label={t("common.requests")} used={summary.today.successes} limit={summary.limits.daily_requests} unitKey="common.requests" />
              </>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("dashboard.quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/speech-to-text">
              <Mic className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.goStt")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/text-to-speech">
              <AudioLines className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.goTts")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/pipeline">
              <Workflow className="h-4 w-4" aria-hidden="true" />
              {t("dashboard.goPipeline")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("dashboard.bilingualTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <blockquote className="border-l-4 border-primary bg-muted/50 px-4 py-3 font-medium italic text-foreground">
            “{t("dashboard.bilingualExample")}”
          </blockquote>
          <p className="text-sm text-muted-foreground">{t("dashboard.bilingualExplain")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("dashboard.recentRequests")}</CardTitle>
        </CardHeader>
        <CardContent>
          {summary && summary.recent && summary.recent.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {summary.recent.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span className="font-mono text-xs uppercase text-muted-foreground">{r.endpoint}</span>
                  <span className={r.status === "success" ? "text-emerald-600" : "text-destructive"}>
                    {r.status === "success" ? t("usage.success") : t("usage.failed")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_date).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.noRecent")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}