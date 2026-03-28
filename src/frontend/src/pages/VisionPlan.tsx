import {
  ClipboardList,
  Edit,
  Eye,
  Lightbulb,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { VisionContents } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";

const sectionOptions = [
  {
    key: "vision",
    labelEn: "Vision",
    labelAr: "الرؤية",
    icon: <Eye className="w-5 h-5" />,
  },
  {
    key: "plans",
    labelEn: "Plans",
    labelAr: "الخطط",
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    key: "strategies",
    labelEn: "Strategies",
    labelAr: "الاستراتيجيات",
    icon: <Lightbulb className="w-5 h-5" />,
  },
];

const emptySection = (): VisionContents => ({
  sectionKey: "vision",
  titleEn: "",
  titleAr: "",
  bodyEn: "",
  bodyAr: "",
  order: 0n,
});

function getSectionIcon(key: string) {
  return (
    sectionOptions.find((s) => s.key === key)?.icon ?? (
      <Eye className="w-5 h-5" />
    )
  );
}

export default function VisionPlan() {
  const { isAdmin } = useAuth();
  const { lang, t } = useLang();
  const [sections, setSections] = useState<VisionContents[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<VisionContents>(emptySection());
  const [isNew, setIsNew] = useState(false);

  const handleSave = useCallback(() => {
    if (isNew) {
      setSections((prev) =>
        [...prev, form].sort((a, b) => Number(a.order - b.order)),
      );
    } else {
      setSections((prev) =>
        prev
          .map((s) => (s.sectionKey === form.sectionKey ? form : s))
          .sort((a, b) => Number(a.order - b.order)),
      );
    }
    setEditOpen(false);
  }, [form, isNew]);

  const handleDelete = useCallback(
    (key: string) => {
      if (!confirm(t("confirmDelete"))) return;
      setSections((prev) => prev.filter((s) => s.sectionKey !== key));
    },
    [t],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-3">
            <Eye className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">{t("visionPlan")}</h1>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setForm(emptySection());
              setIsNew(true);
              setEditOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t("add")}
          </Button>
        )}

        {sections.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {t("noData")}
          </p>
        )}

        {sections.map((sec) => (
          <Card key={sec.sectionKey} className="overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-primary">
                  {getSectionIcon(sec.sectionKey)}
                </span>
                {lang === "ar" ? sec.titleAr : sec.titleEn}
                {isAdmin && (
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setForm({ ...sec });
                        setIsNew(false);
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(sec.sectionKey)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {lang === "ar" ? sec.bodyAr : sec.bodyEn}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? t("add") : t("edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Section Type */}
            <div>
              <Label>{lang === "ar" ? "النوع" : "Type"}</Label>
              <Select
                value={form.sectionKey}
                onValueChange={(v) => setForm((f) => ({ ...f, sectionKey: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        {lang === "ar" ? opt.labelAr : opt.labelEn}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                {lang === "ar" ? "العنوان (إنجليزي)" : "Title (EN)"}
              </Label>
              <Input
                value={form.titleEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleEn: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{lang === "ar" ? "العنوان (عربي)" : "Title (AR)"}</Label>
              <Input
                value={form.titleAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleAr: e.target.value }))
                }
                dir="rtl"
              />
            </div>
            <div>
              <Label>{lang === "ar" ? "المحتوى (إنجليزي)" : "Body (EN)"}</Label>
              <Textarea
                value={form.bodyEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyEn: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div>
              <Label>{lang === "ar" ? "المحتوى (عربي)" : "Body (AR)"}</Label>
              <Textarea
                value={form.bodyAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyAr: e.target.value }))
                }
                dir="rtl"
                rows={4}
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
