import React, { useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/appClient";
import { useI18n } from "@/i18n";
import { extractApiError } from "@/lib/apiError";
import ErrorAlert from "@/components/ErrorAlert";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function statusClasses(status) {
  if (status === "active") return "bg-emerald-500/15 text-emerald-700";
  if (status === "revoked") return "bg-destructive/15 text-destructive";
  return "bg-amber-500/15 text-amber-700";
}

function statusLabel(status, t) {
  if (status === "active") return t("apiKeys.statusActive");
  if (status === "revoked") return t("apiKeys.statusRevoked");
  return t("apiKeys.statusExpired");
}

export default function ApiKeys() {
  const { t } = useI18n();
  const [keys, setKeys] = useState(null);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("listApiKeys", {});
      setKeys(res.data.keys || []);
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setCreating(true);
    setActionError(null);
    try {
      const res = await base44.functions.invoke("createApiKey", { name: newName });
      setNewKey(res.data);
    } catch (e) {
      setActionError(extractApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const finishCreate = () => {
    setCreateOpen(false);
    setNewKey(null);
    setNewName("");
    load();
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setActionError(null);
    try {
      await base44.functions.invoke("revokeApiKey", { key_id: revokeTarget.id });
      setRevokeTarget(null);
      load();
    } catch (e) {
      setActionError(extractApiError(e));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{t("apiKeys.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("apiKeys.subtitle")}</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("apiKeys.createButton")}
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t("apiKeys.explainer")}
      </div>

      {error && <ErrorAlert error={error} />}
      {actionError && <ErrorAlert error={actionError} />}

      <Card>
        <CardContent className="pt-6">
          {keys === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : keys.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("apiKeys.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">{t("common.name")}</th>
                    <th className="pb-2 pr-4">{t("apiKeys.prefix")}</th>
                    <th className="pb-2 pr-4">{t("common.status")}</th>
                    <th className="pb-2 pr-4">{t("apiKeys.createdDate")}</th>
                    <th className="pb-2 pr-4">{t("apiKeys.lastUsed")}</th>
                    <th className="pb-2">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{k.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{k.key_prefix}…</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(k.status)}`}>
                          {statusLabel(k.status, t)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {k.created_date ? new Date(k.created_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {k.last_used_date ? new Date(k.last_used_date).toLocaleString() : t("apiKeys.neverUsed")}
                      </td>
                      <td className="py-3">
                        {k.status === "active" ? (
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setRevokeTarget(k)}>
                            {t("apiKeys.revoke")}
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) finishCreate(); else setCreateOpen(true); }}>
        <DialogContent>
          {newKey ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("apiKeys.createdOnce")}</DialogTitle>
                <DialogDescription>{t("apiKeys.createWarning")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{newKey.name}</p>
                  <p className="break-all font-mono text-xs text-foreground">{newKey.api_key}</p>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("apiKeys.createWarning")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={newKey.api_key} label={t("apiKeys.copyKey")} />
                  <Button onClick={finishCreate}>{t("apiKeys.done")}</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("apiKeys.createTitle")}</DialogTitle>
                <DialogDescription>{t("apiKeys.explainer")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {actionError && <ErrorAlert error={actionError} />}
                <div className="space-y-2">
                  <Label htmlFor="key-name">{t("apiKeys.nameLabel")}</Label>
                  <Input
                    id="key-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("apiKeys.namePlaceholder")}
                    maxLength={64}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={finishCreate}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={create} disabled={creating || !newName.trim()} className="gap-2">
                    {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t("common.create")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("apiKeys.revokeTitle")}</DialogTitle>
            <DialogDescription>{t("apiKeys.revokeBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={revoke} disabled={revoking} className="gap-2">
              {revoking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("apiKeys.revoke")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}