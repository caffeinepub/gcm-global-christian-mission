import { HttpAgent } from "@dfinity/agent";
import {
  CalendarDays,
  Download,
  Edit,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Event } from "../backend";
import { Badge } from "../components/ui/badge";
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

const fmtDate = (ns: bigint) => {
  const ms = Number(ns / 1000000n);
  return new Date(ms).toLocaleString();
};

const generateIcs = (event: Event, lang: "en" | "ar") => {
  const ms = Number(event.dateTime / 1000000n);
  const d = new Date(ms);
  const fmt = (dt: Date) =>
    `${dt.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const title = lang === "ar" ? event.titleAr : event.titleEn;
  const loc = lang === "ar" ? event.locationAr : event.locationEn;
  const desc = lang === "ar" ? event.descriptionAr : event.descriptionEn;
  const end = new Date(d.getTime() + 2 * 3600000);
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${fmt(d)}\nDTEND:${fmt(end)}\nSUMMARY:${title}\nLOCATION:${loc}\nDESCRIPTION:${desc}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};

const emptyEvent = (): Event => ({
  id: 0n,
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  dateTime: BigInt(Date.now()) * 1000000n,
  locationEn: "",
  locationAr: "",
  isPublished: true,
  createdAt: 0n,
  imageUrl: undefined,
  calendarLink: undefined,
  image: undefined,
});

export default function Events() {
  const { isAdmin } = useAuth();
  const { lang, t } = useLang();
  const { actor } = useActor();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Event>(emptyEvent());
  const [isNew, setIsNew] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEvents = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = await actor.getAllEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const nowNs = BigInt(Date.now()) * 1000000n;
  const displayed = events
    .filter((e) => (showPast ? e.dateTime < nowNs : e.dateTime >= nowNs))
    .sort((a, b) => Number(a.dateTime - b.dateTime));

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
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
        setImagePreview(url);
        setForm((f) => ({ ...f, imageUrl: url }));
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
    const evtToSave: Event = {
      ...form,
      dateTime: BigInt(new Date(dateInput).getTime()) * 1000000n,
    };
    try {
      if (isNew) {
        const newId = await actor.addEvent({
          ...evtToSave,
          id: 0n,
          createdAt: 0n,
        });
        await actor.updateEvent({ ...evtToSave, id: newId, isPublished: true });
      } else {
        await actor.updateEvent(evtToSave);
      }
      setEditOpen(false);
      setImagePreview(null);
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [form, isNew, dateInput, actor, loadEvents]);

  const handleDelete = useCallback(
    async (id: bigint) => {
      if (!actor) return;
      if (!confirm(t("confirmDelete"))) return;
      try {
        await actor.deleteEvent(id);
        await loadEvents();
      } catch (err) {
        console.error(err);
        alert("Failed to delete.");
      }
    },
    [t, actor, loadEvents],
  );

  const openEdit = (evt: Event) => {
    setForm({ ...evt });
    setIsNew(false);
    setDateInput(
      new Date(Number(evt.dateTime / 1000000n)).toISOString().slice(0, 16),
    );
    setImagePreview(evt.imageUrl || null);
    setEditOpen(true);
  };

  const openNew = () => {
    const e = emptyEvent();
    setForm(e);
    setIsNew(true);
    setDateInput(new Date().toISOString().slice(0, 16));
    setImagePreview(null);
    setEditOpen(true);
  };

  const removeImage = () => {
    setImagePreview(null);
    setForm((f) => ({ ...f, imageUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isUploading = uploadProgress !== null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={!showPast ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPast(false)}
          >
            {t("upcomingEvents")}
          </Button>
          <Button
            variant={showPast ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPast(true)}
          >
            {t("pastEvents")}
          </Button>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {!loading && displayed.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {t("noData")}
          </p>
        )}
        {!loading &&
          displayed.map((evt) => (
            <Card key={String(evt.id)} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      {lang === "ar" ? evt.titleAr : evt.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarDays className="w-3 h-3" />
                      {fmtDate(evt.dateTime)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lang === "ar" ? evt.locationAr : evt.locationEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {lang === "ar" ? evt.descriptionAr : evt.descriptionEn}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => generateIcs(evt, lang)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {t("addToCalendar")}
                    </Button>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(evt)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(evt.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {evt.imageUrl && (
                  <img
                    src={evt.imageUrl}
                    alt=""
                    className="w-full mt-2 rounded-lg h-24 object-cover"
                  />
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setImagePreview(null);
        }}
      >
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNew ? t("add") : t("edit")} {t("events")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title (EN)</Label>
              <Input
                value={form.titleEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleEn: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Title (AR)</Label>
              <Input
                value={form.titleAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleAr: e.target.value }))
                }
                dir="rtl"
              />
            </div>
            <div>
              <Label>Description (EN)</Label>
              <Textarea
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descriptionEn: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div>
              <Label>Description (AR)</Label>
              <Textarea
                value={form.descriptionAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descriptionAr: e.target.value }))
                }
                dir="rtl"
                rows={2}
              />
            </div>
            <div>
              <Label>Location (EN)</Label>
              <Input
                value={form.locationEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationEn: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Location (AR)</Label>
              <Input
                value={form.locationAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationAr: e.target.value }))
                }
                dir="rtl"
              />
            </div>
            <div>
              <Label>{t("date")}</Label>
              <Input
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>

            {/* Image Upload Section */}
            <div>
              <Label>{lang === "ar" ? "صورة الفعالية" : "Event Photo"}</Label>
              <div className="mt-1 space-y-2">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <ImagePlus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar"
                        ? "اضغط لرفع صورة من جهازك"
                        : "Tap to upload photo from device"}
                    </p>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                {isUploading && (
                  <div className="space-y-1">
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
              </div>
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
                onClick={() => {
                  setEditOpen(false);
                  setImagePreview(null);
                }}
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
