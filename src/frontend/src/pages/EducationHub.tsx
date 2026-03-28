import { HttpAgent } from "@icp-sdk/core/agent";
import {
  Edit,
  FileText,
  Image,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EducationPost } from "../backend";
import { Variant_video_text_photo } from "../backend";
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
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { Textarea } from "../components/ui/textarea";
import { loadConfig } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { StorageClient } from "../utils/StorageClient";

const now = () => BigInt(Date.now()) * 1000000n;

let nextId = 100n;

const STORAGE_KEY = "gcm_education_posts";

// BigInt-safe JSON serialization
function bigintReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return `__bigint__${value.toString()}`;
  return value;
}

function bigintReviver(_key: string, value: unknown) {
  if (typeof value === "string" && value.startsWith("__bigint__")) {
    return BigInt(value.slice(10));
  }
  return value;
}

function savePosts(posts: EducationPost[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts, bigintReplacer));
  } catch {
    // ignore storage errors
  }
}

function loadPosts(): EducationPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw, bigintReviver) as EducationPost[];
  } catch {
    return [];
  }
}

const emptyPost = (): EducationPost => ({
  id: 0n,
  titleEn: "",
  titleAr: "",
  contentEn: "",
  contentAr: "",
  postType: Variant_video_text_photo.text,
  authorName: "",
  publishedAt: now(),
  mediaUrls: [],
  isPublished: true,
});

const typeIcons = {
  [Variant_video_text_photo.video]: <Video className="w-4 h-4" />,
  [Variant_video_text_photo.photo]: <Image className="w-4 h-4" />,
  [Variant_video_text_photo.text]: <FileText className="w-4 h-4" />,
};

function toYoutubeEmbed(url: string): string {
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url;
}

export default function EducationHub() {
  const { isAdmin } = useAuth();
  const { lang, t } = useLang();
  const [posts, setPosts] = useState<EducationPost[]>(() => loadPosts());
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<EducationPost | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EducationPost>(emptyPost());
  const [isNew, setIsNew] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist posts to localStorage whenever they change
  useEffect(() => {
    savePosts(posts);
  }, [posts]);

  const filtered =
    filter === "all" ? posts : posts.filter((p) => p.postType === filter);

  const handleSave = useCallback(() => {
    if (isNew) {
      const newPost: EducationPost = { ...form, id: nextId++ };
      setPosts((prev) => [...prev, newPost]);
    } else {
      setPosts((prev) => prev.map((p) => (p.id === form.id ? form : p)));
    }
    setEditOpen(false);
  }, [form, isNew]);

  const handleDelete = useCallback(
    (id: bigint) => {
      if (!confirm(t("confirmDelete"))) return;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    },
    [t],
  );

  const handleAddUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, trimmed] }));
    setUrlInput("");
  }, [urlInput]);

  const handleRemoveUrl = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      mediaUrls: f.mediaUrls.filter((_, i) => i !== index),
    }));
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
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
      setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, url] }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadProgress(null);
    }
  }, []);

  const canUploadFile =
    form.postType === Variant_video_text_photo.video ||
    form.postType === Variant_video_text_photo.photo;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "video", "photo", "text"].map((f) => (
            <Button
              key={f}
              data-ocid="education.filter.tab"
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setFilter(f)}
            >
              {t(f === "all" ? "all" : f)}
            </Button>
          ))}
          {isAdmin && (
            <Button
              size="sm"
              className="shrink-0 ml-auto"
              data-ocid="education.primary_button"
              onClick={() => {
                setForm(emptyPost());
                setIsNew(true);
                setUrlInput("");
                setEditOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t("add")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filtered.length === 0 && (
          <p
            className="text-center text-muted-foreground py-8"
            data-ocid="education.empty_state"
          >
            {t("noData")}
          </p>
        )}
        {filtered.map((post, index) => (
          <Card
            key={String(post.id)}
            data-ocid={`education.item.${index + 1}`}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelected(post)}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      {typeIcons[post.postType]}
                      {t(post.postType)}
                    </Badge>
                    {!post.isPublished && (
                      <Badge variant="outline" className="text-xs">
                        {t("draft")}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-medium text-sm">
                    {lang === "ar" ? post.titleAr : post.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("author")}: {post.authorName}
                  </p>
                </div>
                {isAdmin && (
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      data-ocid={`education.edit_button.${index + 1}`}
                      onClick={() => {
                        setForm({ ...post, mediaUrls: [...post.mediaUrls] });
                        setIsNew(false);
                        setUrlInput("");
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      data-ocid={`education.delete_button.${index + 1}`}
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Sheet */}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>
                  {lang === "ar" ? selected.titleAr : selected.titleEn}
                </SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {typeIcons[selected.postType]}
                    {t(selected.postType)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selected.authorName}
                  </span>
                </div>
              </SheetHeader>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">
                  {lang === "ar" ? selected.contentAr : selected.contentEn}
                </p>
              </div>
              {selected.mediaUrls?.map((url) => {
                const isYoutube =
                  url.includes("youtube.com") || url.includes("youtu.be");
                const isVideoPost =
                  selected.postType === Variant_video_text_photo.video;
                if (isYoutube) {
                  return (
                    <iframe
                      title="Media content"
                      key={url}
                      src={toYoutubeEmbed(url)}
                      className="w-full aspect-video mt-3 rounded-lg"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  );
                }
                if (isVideoPost) {
                  return (
                    // biome-ignore lint/a11y/useMediaCaption: user-provided video content
                    <video
                      key={url}
                      controls
                      className="w-full mt-3 rounded-lg"
                    >
                      <source src={url} />
                    </video>
                  );
                }
                return (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="w-full mt-3 rounded-lg object-cover"
                  />
                );
              })}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-w-sm max-h-[85vh] overflow-y-auto"
          data-ocid="education.dialog"
        >
          <DialogHeader>
            <DialogTitle>{isNew ? t("add") : t("edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title (EN)</Label>
              <Input
                data-ocid="education.input"
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
              <Label>Content (EN)</Label>
              <Textarea
                value={form.contentEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contentEn: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div>
              <Label>Content (AR)</Label>
              <Textarea
                value={form.contentAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contentAr: e.target.value }))
                }
                dir="rtl"
                rows={3}
              />
            </div>
            <div>
              <Label>{t("author")}</Label>
              <Input
                value={form.authorName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, authorName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{t("type")}</Label>
              <Select
                value={form.postType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    postType: v as Variant_video_text_photo,
                  }))
                }
              >
                <SelectTrigger data-ocid="education.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Variant_video_text_photo.text}>
                    {t("text")}
                  </SelectItem>
                  <SelectItem value={Variant_video_text_photo.video}>
                    {t("video")}
                  </SelectItem>
                  <SelectItem value={Variant_video_text_photo.photo}>
                    {t("photo")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Media URLs section */}
            <div>
              <Label className="mb-2 block">{t("mediaUrls")}</Label>

              {/* Current URLs list */}
              {form.mediaUrls.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.mediaUrls.map((url) => (
                    <div
                      key={url}
                      className="flex items-center gap-1 bg-muted rounded px-2 py-1"
                    >
                      <span className="text-xs flex-1 truncate text-muted-foreground">
                        {url}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveUrl(form.mediaUrls.indexOf(url))
                        }
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Remove URL"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add URL manually */}
              <div className="flex gap-1 mb-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste YouTube or media URL"
                  className="text-xs h-8"
                  data-ocid="education.search_input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddUrl();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={handleAddUrl}
                  data-ocid="education.secondary_button"
                >
                  {t("add")}
                </Button>
              </div>

              {/* File upload (only for video/photo) */}
              {canUploadFile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    data-ocid="education.upload_button"
                    disabled={uploadProgress !== null}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadProgress !== null ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3 mr-1" />
                    )}
                    {uploadProgress !== null
                      ? `Uploading... ${uploadProgress}%`
                      : "Upload Photo/Video"}
                  </Button>

                  {uploadProgress !== null && (
                    <div className="mt-1" data-ocid="education.loading_state">
                      <Progress value={uploadProgress} className="h-1.5" />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                className="flex-1"
                data-ocid="education.submit_button"
                disabled={uploadProgress !== null}
              >
                {t("save")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="flex-1"
                data-ocid="education.cancel_button"
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
