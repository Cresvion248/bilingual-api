import React from "react";
import { useI18n } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function Privacy() {
  const { t } = useI18n();
  const points = ["privacy.p1", "privacy.p2", "privacy.p3", "privacy.p4", "privacy.p5", "privacy.p6"];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("privacy.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("privacy.subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {t("privacy.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {points.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-4 text-xs italic text-muted-foreground">{t("privacy.disclaimer")}</p>
        </CardContent>
      </Card>
    </div>
  );
}