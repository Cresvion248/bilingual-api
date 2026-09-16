import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n";

// English / Spanish interface language selector. The interface language is
// independent from the speech language used on the speech pages.
export default function LanguageSelector({ className }) {
  const { lang, setLang, t } = useI18n();
  return (
    <Select value={lang} onValueChange={setLang}>
      <SelectTrigger className={className || "w-[130px]"} aria-label={t("common.language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t("common.english")}</SelectItem>
        <SelectItem value="es">{t("common.spanish")}</SelectItem>
      </SelectContent>
    </Select>
  );
}