import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Megaphone,
  Search,
  Settings as SettingsIcon,
  X
} from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/AuthContext";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function StatusPill({ ok, labelOk, labelBad }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
      {ok ? labelOk : labelBad}
    </span>
  );
}

export default function Admin() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = !!(user && user.role === "admin");
  const [data, setData] = useState(null);
  const [settingsRows, setSettingsRows] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [quotaDrafts, setQuotaDrafts] = useState({});
  const [settingDrafts, setSettingDrafts] = useState({});
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annLang, setAnnLang] = useState("en");
  const [announcements, setAnnouncements] = useState([]);

  const load = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("adminOverview", {});
      setData(res.data);
      const rows = await base44.entities.AppSetting.list();
      setSettingsRows(rows || []);
      const anns = await base44.entities.SystemAnnouncement.list();
      setAnnouncements(anns || []);
      setError(null);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">{t("admin.forbidden")}</p>;
  }

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  const setUserStatus = async (profile, status) => {
    try {
      await base44.entities.UserProfile.update(profile.id, { account_status: status });
      flash(status === "active" ? t("admin.userActivated") : t("admin.userSuspended"));
      load();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const revokeKey = async (key) => {
    try {
      await base44.functions.invoke("revokeApiKey", { key_id: key.id });
      flash(t("apiKeys.revoked"));
      load();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const saveQuota = async (key) => {
    const draft = quotaDrafts[key.id] || key.quotas;
    try {
      await base44.entities.ApiKey.update(key.id, {
        daily_stt_seconds_limit: Number(draft.daily_stt_seconds_limit) || 300,
        daily_tts_characters_limit: Number(draft.daily_tts_characters_limit) || 10000,
        monthly_stt_seconds_limit: Number(draft.monthly_stt_seconds_limit) || 9000,
        monthly_tts_characters_limit: Number(draft.monthly_tts_characters_limit) || 300000
      });
      flash(t("admin.quotaSaved"));
      load();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const saveSetting = async (row) => {
    const value = settingDrafts[row.setting_name] !== undefined ? settingDrafts[row.setting_name] : row.setting_value;
    try {
      await base44.entities.AppSetting.update(row.id, {
        setting_value: String(value),
        updated_by: user ? user.email : "admin"
      });
      flash(t("common.success"));
      load();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const createAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) return;
    try {
      await base44.entities.SystemAnnouncement.create({
        title: annTitle,
        message: annMessage,
        interface_language: annLang,
        active: true
      });
      setAnnTitle("");
      setAnnMessage("");
      flash(t("common.success"));
      load();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const deleteAnnouncement = async (id) => {
    try {
      await base44.entities.SystemAnnouncement.delete(id);
      load();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const users = data ? data.users : [];
  const profiles = data ? data.profiles : [];
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("admin.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {t("usage.refresh")}
        </Button>
      </div>

      {error && <ErrorAlert error={error} />}
      {notice && <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      {!data ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("admin.usageToday")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-foreground">
                  {t("admin.sttUsage")}: {data.usage.today.stt_seconds}s · {t("admin.ttsUsage")}: {data.usage.today.tts_characters} ch
                </p>
                <p className="text-foreground">
                  {t("admin.pipelineUsage")}: {data.usage.today.pipeline_requests}
                </p>
                <p className="text-destructive">{t("admin.errorRate", { count: data.usage.today.errors })}</p>
                <p className="text-muted-foreground">
                  {t("admin.rateLimitEvents", { count: data.usage.today.rate_limit_events })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("admin.usageMonth")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-foreground">
                  {t("admin.sttUsage")}: {data.usage.month.stt_seconds}s · {t("admin.ttsUsage")}: {data.usage.month.tts_characters} ch
                </p>
                <p className="text-foreground">
                  {t("admin.pipelineUsage")}: {data.usage.month.pipeline_requests}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t("admin.providerTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("admin.sttConfigured")}</span>
                  <StatusPill ok={data.provider_status.stt_configured} labelOk={t("admin.configured")} labelBad={t("admin.notConfigured")} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("admin.ttsConfigured")}</span>
                  <StatusPill ok={data.provider_status.tts_configured} labelOk={t("admin.configured")} labelBad={t("admin.notConfigured")} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("admin.ttsProvider")}</span>
                  <span className="font-mono text-xs text-foreground">{data.provider_status.tts_provider || "gemini"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("admin.assistantEnabled")}</span>
                  <StatusPill ok={data.assistant_enabled} labelOk={t("admin.enabled")} labelBad={t("admin.disabled")} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
              data.safety.warning
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {data.safety.warning
              ? t("admin.safetyWarning", { percent: data.safety.threshold_percent })
              : t("admin.safetyOk")}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("admin.users")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.searchUsers")} className="pl-9" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">{t("common.name")}</th>
                      <th className="pb-2 pr-4">{t("common.status")}</th>
                      <th className="pb-2">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const profile = profiles.find((p) => p.user_id === u.id);
                      const status = profile ? profile.account_status : "pending";
                      return (
                        <tr key={u.id} className="border-b border-border/60 last:border-0">
                          <td className="py-3 pr-4 text-foreground">{u.email}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{u.full_name || "—"}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3">
                            {profile && status === "active" ? (
                              <Button variant="outline" size="sm" className="text-destructive" onClick={() => setUserStatus(profile, "suspended")}>
                                {t("admin.suspend")}
                              </Button>
                            ) : profile ? (
                              <Button variant="outline" size="sm" onClick={() => setUserStatus(profile, "active")}>
                                {t("admin.activate")}
                              </Button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("admin.keys")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("admin.editQuota")}</p>
              {data.keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("apiKeys.empty")}</p>
              ) : (
                data.keys.map((k) => {
                  const draft = quotaDrafts[k.id] || k.quotas;
                  const setDraft = (field, value) =>
                    setQuotaDrafts((prev) => ({ ...prev, [k.id]: { ...draft, [field]: value } }));
                  return (
                    <div key={k.id} className="rounded-lg border border-border p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-foreground">{k.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              k.status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {k.status}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => saveQuota(k)}>
                            {t("admin.quotas")}
                          </Button>
                          {k.status === "active" && (
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => revokeKey(k)}>
                              {t("admin.revokeKey")}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {[
                          ["daily_stt_seconds_limit", "STT " + t("common.today")],
                          ["daily_tts_characters_limit", "TTS " + t("common.today")],
                          ["monthly_stt_seconds_limit", "STT " + t("common.thisMonth")],
                          ["monthly_tts_characters_limit", "TTS " + t("common.thisMonth")]
                        ].map(([field, label]) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs text-muted-foreground" htmlFor={`${k.id}-${field}`}>
                              {label}
                            </Label>
                            <Input
                              id={`${k.id}-${field}`}
                              type="number"
                              min="1"
                              value={draft[field]}
                              onChange={(e) => setDraft(field, e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                {t("admin.announcements")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder={t("admin.titleField")} />
                <Input value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} placeholder={t("admin.messageField")} />
                <Select value={annLang} onValueChange={setAnnLang}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">EN</SelectItem>
                    <SelectItem value="es">ES</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={createAnnouncement} disabled={!annTitle.trim() || !annMessage.trim()}>
                  {t("admin.publish")}
                </Button>
              </div>
              <div className="space-y-2">
                {announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("usage.empty")}</p>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {a.title} <span className="text-xs uppercase text-muted-foreground">({a.interface_language})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteAnnouncement(a.id)}
                        aria-label={t("admin.deleteAnnouncement")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                {t("admin.settings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settingsRows.map((row) => (
                <div key={row.id} className="grid items-end gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label className="font-mono text-xs text-muted-foreground" htmlFor={`setting-${row.id}`}>
                      {row.setting_name}
                    </Label>
                    <Input
                      id={`setting-${row.id}`}
                      value={settingDrafts[row.setting_name] !== undefined ? settingDrafts[row.setting_name] : row.setting_value}
                      onChange={(e) => setSettingDrafts((prev) => ({ ...prev, [row.setting_name]: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <p className="hidden text-xs text-muted-foreground md:block">{row.updated_by || ""}</p>
                  <Button variant="outline" size="sm" onClick={() => saveSetting(row)}>
                    {t("admin.saveSetting")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}