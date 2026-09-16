import React from "react";
import { useI18n } from "@/i18n";

export default function QuotaBar({ label, used, limit, unitKey }) {
  const { t } = useI18n();
  const safeLimit = Math.max(1, limit || 1);
  const safeUsed = Math.max(0, used || 0);
  const pct = Math.min(100, Math.round((safeUsed / safeLimit) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="whitespace-nowrap text-muted-foreground">
          {safeUsed} / {safeLimit} {unitKey ? t(unitKey) : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}