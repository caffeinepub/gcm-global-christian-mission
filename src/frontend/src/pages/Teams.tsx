import { HttpAgent } from "@icp-sdk/core/agent";
import { Edit, ImageIcon, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Team } from "../backend";
import { TeamsCategory } from "../backend";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { loadConfig } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useActor } from "../hooks/useActor";
import { StorageClient } from "../utils/StorageClient";

const emptyTeam = (): Team => ({
  id: 0n,
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  category: TeamsCategory.ministry,
  mediaUrls: [],
  order: 0n,
});

export default function Teams() {
  const { isAdmin } = useAuth();
  const { lang, t } = useLang();
  const { actor } = useActor();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Team>(emptyTeam());
  const [isNew, setIsNew] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTeams = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = await actor.getAllTeams();
      setTeams([...data].sort((a, b) => Number(a.order - b.order)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handlePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadProgress(0);
      try {
        const config = await loadConfig();
        const agent = new HttpAgent({ host: config.backend_host });
        const storageClient = new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          agent,
        );
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { hash } = await storageClient.putFile(bytes, (pct) =>
          setUploadProgress(pct),
        );
        const url = await storageClient.getDirectURL(hash);
        setPhotoPreview(url);
        setForm((f) => ({ ...f, mediaUrls: [url] }));
      } catch (err) {
        console.error("Upload failed:", err);
        alert(
          lang === "ar"
            ? "فشل الرفع. حاول مرة أخرى."
            : "Upload failed. Please try again.",
        );
      } finally {
        setUploadProgress(null);
      }
    },
    [lang],
  );

  const handleSave = useCallback(async () => {
    if (!actor) return;
    setSaving(true);
    try {
      if (isNew) {
        await actor.addTeam({ ...form, id: 0n });
      } else {
        await actor.updateTeam(form);
      }
      setEditOpen(false);
      setPhotoPreview(null);
      await loadTeams();
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [form, isNew, actor, loadTeams]);

  const handleDelete = useCallback(
    async (id: bigint) => {
      if (!actor) return;
      if (!confirm(t("confirmDelete"))) return;
      try {
        await actor.deleteTeam(id);
        await loadTeams();
      } catch (err) {
        console.error(err);
        alert("Failed to delete.");
      }
    },
    [t, actor, loadTeams],
  );

  const isUploading = uploadProgress !== null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">{t("ourTeams")}</h2>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setForm(emptyTeam());
                setPhotoPreview(null);
                setIsNew(true);
                setEditOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t("add")}
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && teams.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {t("noData")}
          </p>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            {teams.map((team) => (
              <Card
                key={String(team.id)}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => !editOpen && setSelectedTeam(team)}
              >
                <div className="bg-primary/10 h-24 flex items-center justify-center">
                  {team.mediaUrls?.[0] ? (
                    <img
                      src={team.mediaUrls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-primary/50" />
                  )}
                </div>
                <CardContent className="p-2">
                  <h3 className="font-medium text-xs leading-tight">
                    {lang === "ar" ? team.nameAr : team.nameEn}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {lang === "ar" ? team.descriptionAr : team.descriptionEn}
                  </p>
                  {isAdmin && (
                    <div
                      className="flex gap-1 mt-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setForm({ ...team, mediaUrls: [...team.mediaUrls] });
                          setPhotoPreview(team.mediaUrls?.[0] ?? null);
                          setIsNew(false);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDelete(team.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Team Detail / Lightbox Dialog */}
      <Dialog
        open={!!selectedTeam}
        onOpenChange={(open) => !open && setSelectedTeam(null)}
      >
        <DialogContent className="max-w-sm p-4">
          {selectedTeam && (
            <div>
              {selectedTeam.mediaUrls?.[0] && (
                <img
                  src={selectedTeam.mediaUrls[0]}
                  alt=""
                  className="w-full rounded-lg object-contain max-h-[50vh] mb-3"
                />
              )}
              <h3 className="font-semibold text-lg">
                {lang === "ar" ? selectedTeam.nameAr : selectedTeam.nameEn}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {lang === "ar"
                  ? selectedTeam.descriptionAr
                  : selectedTeam.descriptionEn}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setPhotoPreview(null);
        }}
      >
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNew ? t("add") : t("edit")} {t("teams")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Photo Upload */}
            <div>
              <Label>{lang === "ar" ? "صورة الفريق" : "Team Photo"}</Label>
              <div
                className="mt-1 h-28 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
                onClick={() => !isUploading && fileRef.current?.click()}
                onKeyDown={(e) =>
                  !isUploading && e.key === "Enter" && fileRef.current?.click()
                }
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : isUploading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "اضغط لرفع صورة" : "Tap to upload photo"}
                    </p>
                  </>
                )}
              </div>
              {isUploading && (
                <div className="mt-1 space-y-1">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {lang === "ar"
                      ? `جاري الرفع... ${Math.round(uploadProgress ?? 0)}%`
                      : `Uploading... ${Math.round(uploadProgress ?? 0)}%`}
                  </p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div>
              <Label>{lang === "ar" ? "الاسم (إنجليزي)" : "Name (EN)"}</Label>
              <Input
                value={form.nameEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nameEn: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{lang === "ar" ? "الاسم (عربي)" : "Name (AR)"}</Label>
              <Input
                value={form.nameAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nameAr: e.target.value }))
                }
                dir="rtl"
              />
            </div>
            <div>
              <Label>
                {lang === "ar" ? "الوصف (إنجليزي)" : "Description (EN)"}
              </Label>
              <Textarea
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descriptionEn: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div>
              <Label>
                {lang === "ar" ? "الوصف (عربي)" : "Description (AR)"}
              </Label>
              <Textarea
                value={form.descriptionAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descriptionAr: e.target.value }))
                }
                dir="rtl"
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={isUploading || saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                {t("save")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="flex-1"
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
