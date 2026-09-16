import React from "react";
import { useI18n } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Help() {
  const { t } = useI18n();
  const sections = [
    { titleKey: "help.sttTitle", bodyKey: "help.sttBody" },
    { titleKey: "help.ttsTitle", bodyKey: "help.ttsBody" },
    { titleKey: "help.pipelineTitle", bodyKey: "help.pipelineBody" },
    { titleKey: "help.keysTitle", bodyKey: "help.keysBody" },
    { titleKey: "help.quotaTitle", bodyKey: "help.quotaBody" },
    { titleKey: "help.langTitle", bodyKey: "help.langBody" }
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("help.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("help.subtitle")}</p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t("help.intro")}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.titleKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t(s.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t(s.bodyKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t("help.contactTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("help.contactBody")}</p>
        </CardContent>
      </Card>
    </div>
  );
}