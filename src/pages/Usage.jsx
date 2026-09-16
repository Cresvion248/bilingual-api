import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import QuotaBar from "@/components/QuotaBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Usage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("usageSummary", {});
      setSummary(res.data);
      setError(null);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("usage.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("usage.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {t("usage.refresh")}
        </Button>
      </div>

      {error && <ErrorAlert error={error} />}

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("usage.sttSecondsToday")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {summary.today.stt_seconds} <span className="text-sm font-normal text-muted-foreground">{t("common.seconds")}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("usage.ttsCharsToday")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {summary.today.tts_characters}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t("common.characters")}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("usage.pipelineToday")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{summary.today.pipeline_requests}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("usage.sttSecondsMonth")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {summary.month.stt_seconds} <span className="text-sm font-normal text-muted-foreground">{t("common.seconds")}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("usage.ttsCharsMonth")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {summary.month.tts_characters}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t("common.characters")}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("common.thisMonth")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-emerald-600">{t("usage.successCount", { count: summary.today.successes })}</p>
                <p className="text-destructive">{t("usage.errorCount", { count: summary.today.errors })}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("usage.remainingDaily")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuotaBar label={t("usage.sttSecondsToday")} used={summary.today.stt_seconds} limit={summary.limits.daily_stt_seconds} unitKey="common.seconds" />
              <QuotaBar label={t("usage.ttsCharsToday")} used={summary.today.tts_characters} limit={summary.limits.daily_tts_characters} unitKey="common.characters" />
              <QuotaBar label={t("common.requests")} used={summary.today.successes} limit={summary.limits.daily_requests} unitKey="common.requests" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("usage.remainingMonthly")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuotaBar label={t("usage.sttSecondsMonth")} used={summary.month.stt_seconds} limit={summary.limits.monthly_stt_seconds} unitKey="common.seconds" />
              <QuotaBar label={t("usage.ttsCharsMonth")} used={summary.month.tts_characters} limit={summary.limits.monthly_tts_characters} unitKey="common.characters" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("usage.recentRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.recent && summary.recent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-2 pr-4">{t("usage.endpoint")}</th>
                        <th className="pb-2 pr-4">{t("usage.statusCol")}</th>
                        <th className="pb-2 pr-4">{t("usage.unitsCol")}</th>
                        <th className="pb-2">{t("usage.timeCol")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recent.map((r) => (
                        <tr key={r.id} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs uppercase text-muted-foreground">{r.endpoint}</td>
                          <td className="py-2 pr-4">
                            <span className={r.status === "success" ? "text-emerald-600" : "text-destructive"}>
                              {r.status === "success" ? t("usage.success") : t("usage.failed")}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {(r.stt_seconds ? Math.ceil(r.stt_seconds) + "s " : "") +
                              (r.tts_characters ? r.tts_characters + " ch" : "")}
                          </td>
                          <td className="py-2 text-muted-foreground">{new Date(r.created_date).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("usage.empty")}</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : !error ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}