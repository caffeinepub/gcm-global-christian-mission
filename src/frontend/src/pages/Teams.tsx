import { Edit, ImageIcon, Plus, Trash2, Users } from "lucide-react";
import { useCallback, useRef, useState } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";

let nextId = 100n;

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Team>(emptyTeam());
  const [isNew, setIsNew] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPhotoPreview(url);
      setForm((f) => ({ ...f, mediaUrls: [url] }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = useCallback(() => {
    if (isNew) {
      setTeams((prev) =>
        [...prev, { ...form, id: nextId++ }].sort((a, b) =>
          Number(a.order - b.order),
        ),
      );
    } else {
      setTeams((prev) =>
        prev
          .map((team) => (team.id === form.id ? form : team))
          .sort((a, b) => Number(a.order - b.order)),
      );
    }
    setEditOpen(false);
    setPhotoPreview(null);
  }, [form, isNew]);

  const handleDelete = useCallback(
    (id: bigint) => {
      if (!confirm(t("confirmDelete"))) return;
      setTeams((prev) => prev.filter((team) => team.id !== id));
    },
    [t],
  );

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

        {teams.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {t("noData")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {teams.map((team) => (
            <Card key={String(team.id)} className="overflow-hidden">
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
                  <div className="flex gap-1 mt-2">
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
      </div>

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
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "اضغط لرفع صورة" : "Tap to upload photo"}
                    </p>
                  </>
                )}
              </div>
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
              <Button onClick={handleSave} className="flex-1">
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
