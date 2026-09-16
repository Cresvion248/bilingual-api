import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export default function CopyButton({ value, label, className, variant = "outline", size = "sm" }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Clipboard unavailable; nothing to do.
    }
  };

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={doCopy}>
      {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
      {copied ? t("common.copied") : label || t("common.copy")}
    </Button>
  );
}