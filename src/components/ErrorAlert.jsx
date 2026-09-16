import React from "react";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";

// Displays a translated, nontechnical error message with the request id when
// available. Never shows server internals or secret values.
export default function ErrorAlert({ error }) {
  const { t } = useI18n();
  if (!error) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4" role="alert">
      <div className="flex items-start gap-2 text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("errors." + error.code)}</p>
          {error.request_id && <p className="mt-1 break-all text-xs opacity-70">{error.request_id}</p>}
        </div>
      </div>
    </div>
  );
}