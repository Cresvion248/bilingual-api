import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { t, lang } = useI18n();
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("updateProfile", {})
      .then((res) => {
        const p = res.data.profile;
        setProfile(p);
        setDisplayName(p.display_name || "");
        setTimezone(p.timezone || "UTC");
      })
      .catch((e) => setError(extractApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await base44.functions.invoke("updateProfile", {
        display_name: displayName,
        timezone,
        preferred_interface_language: lang
      });
      setProfile(res.data.profile);
      setSaved(true);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const statusLabel =
    profile && profile.account_status === "active"
      ? t("settings.statusActive")
      : profile && profile.account_status === "suspended"
        ? t("settings.statusSuspended")
        : t("settings.statusPending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {error && <ErrorAlert error={error} />}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("settings.interfaceLanguage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LanguageSelector />
            <p className="text-xs text-muted-foreground">{t("settings.languageNote")}</p>
          </CardContent>
        </Card>
      )}

      {!loading && (
        <>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="display-name">{t("settings.displayName")}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("settings.displayNamePlaceholder")}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t("settings.timezone")}</Label>
                <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" maxLength={64} />
              </div>
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? t("common.saving") : t("common.save")}
              </Button>
              {saved && <p className="text-sm text-emerald-600">{t("settings.saveSuccess")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-muted-foreground">{t("settings.accountStatus")}</span>
                <span className="font-medium text-foreground">{statusLabel}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 py-3">
                <span className="text-muted-foreground">{t("settings.roleLabel")}</span>
                <span className="font-mono text-xs uppercase text-foreground">{profile ? profile.role : ""}</span>
              </div>
              <div className="py-3">
                <p className="text-muted-foreground">{t("settings.readOnly")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("settings.audioStorage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("settings.audioStorageNote")}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}