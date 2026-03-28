import {
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Church } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import { useActor } from "../hooks/useActor";

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Try to extract [lat, lon] from a Google Maps URL */
function parseGoogleMapsUrl(url: string): [number, number] | null {
  let m = url.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [Number.parseFloat(m[1]), Number.parseFloat(m[2])];
  m = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [Number.parseFloat(m[1]), Number.parseFloat(m[2])];
  m = url.match(/(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
  if (m) return [Number.parseFloat(m[1]), Number.parseFloat(m[2])];
  return null;
}

interface NearbyChurch {
  id: number;
  lat: number;
  lon: number;
  name: string;
  dist: number;
  manual?: boolean;
  mapsUrl?: string;
  backendId?: bigint;
}

async function fetchNearbyChurches(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<NearbyChurch[]> {
  const radius = radiusKm * 1000;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="christian"](around:${radius},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="christian"](around:${radius},${lat},${lon});
    );
    out center 20;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });
  const data = await res.json();
  const elements: NearbyChurch[] = (data.elements ?? [])
    .map(
      (el: {
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string; "name:en"?: string; "name:ar"?: string };
      }) => {
        const elLat = el.lat ?? el.center?.lat ?? 0;
        const elLon = el.lon ?? el.center?.lon ?? 0;
        const tags = el.tags ?? {};
        const name = tags["name:ar"] || tags["name:en"] || tags.name || "كنيسة";
        return {
          id: el.id,
          lat: elLat,
          lon: elLon,
          name,
          dist: calcDistance(lat, lon, elLat, elLon),
        };
      },
    )
    .filter((c: NearbyChurch) => c.lat !== 0 && c.lon !== 0)
    .sort((a: NearbyChurch, b: NearbyChurch) => a.dist - b.dist)
    .slice(0, 5);
  return elements;
}

async function geocodeLocation(
  query: string,
): Promise<[number, number] | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { "Accept-Language": "ar,en" } },
  );
  const data = await res.json();
  if (data.length > 0) {
    return [Number.parseFloat(data[0].lat), Number.parseFloat(data[0].lon)];
  }
  return null;
}

export default function ChurchLocator() {
  const { lang } = useLang();
  const { isAdmin } = useAuth();
  const { actor } = useActor();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [churches, setChurches] = useState<NearbyChurch[]>([]);
  const [allChurches, setAllChurches] = useState<NearbyChurch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAreaSearch, setIsAreaSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manual churches from backend
  const [manualChurches, setManualChurches] = useState<Church[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Church | null>(null);
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formMapsUrl, setFormMapsUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [savingChurch, setSavingChurch] = useState(false);

  const loadManualChurches = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await actor.getAllChurches();
      setManualChurches(data);
    } catch (err) {
      console.error(err);
    }
  }, [actor]);

  useEffect(() => {
    loadManualChurches();
  }, [loadManualChurches]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        setError(
          lang === "ar"
            ? "تعذّر تحديد موقعك. يرجى السماح بالوصول إلى الموقع وإعادة المحاولة."
            : "Could not detect your location. Please allow location access and try again.",
        );
      },
    );
  }, [lang]);

  const mergeWithManual = useCallback(
    (
      autoList: NearbyChurch[],
      pos: [number, number] | null,
      manualList: Church[],
    ): NearbyChurch[] => {
      const manualAsNearby: NearbyChurch[] = manualList.map((m) => ({
        id: Number(m.id) * -1,
        lat: m.latitude,
        lon: m.longitude,
        name: lang === "ar" ? m.nameAr || m.nameEn : m.nameEn || m.nameAr,
        dist: pos ? calcDistance(pos[0], pos[1], m.latitude, m.longitude) : 0,
        manual: true,
        mapsUrl: m.imageUrl, // reusing imageUrl field to store mapsUrl
        backendId: m.id,
      }));
      return [...autoList, ...manualAsNearby].sort((a, b) => a.dist - b.dist);
    },
    [lang],
  );

  useEffect(() => {
    if (!userPos) return;
    setSearchLoading(true);
    setError(null);
    fetchNearbyChurches(userPos[0], userPos[1], 10)
      .then((results) => {
        const merged = mergeWithManual(results, userPos, manualChurches);
        setAllChurches(merged);
        setChurches(merged);
        if (merged.length === 0) {
          setError(
            lang === "ar"
              ? "لا توجد كنائس في نطاق 10 كيلومترات من موقعك."
              : "No churches found within 10 km of your location.",
          );
        }
      })
      .catch(() => {
        setError(
          lang === "ar"
            ? "حدث خطأ أثناء البحث. تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
            : "Search failed. Check your internet connection and try again.",
        );
      })
      .finally(() => setSearchLoading(false));
  }, [userPos, lang, mergeWithManual, manualChurches]);

  // Filter by name as user types
  useEffect(() => {
    if (isAreaSearch) return;
    if (!searchQuery.trim()) {
      setChurches(allChurches);
      return;
    }
    const q = searchQuery.toLowerCase();
    setChurches(allChurches.filter((c) => c.name.toLowerCase().includes(q)));
  }, [searchQuery, allChurches, isAreaSearch]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setIsAreaSearch(true);
    setError(null);
    try {
      const coords = await geocodeLocation(q);
      if (!coords) {
        setError(
          lang === "ar"
            ? "لم يتم العثور على المنطقة. جرّب اسمًا مختلفًا."
            : "Area not found. Try a different name.",
        );
        setChurches([]);
        return;
      }
      const results = await fetchNearbyChurches(coords[0], coords[1], 10);
      const merged = mergeWithManual(results, coords, manualChurches);
      setChurches(merged);
      if (merged.length === 0) {
        setError(
          lang === "ar"
            ? `لا توجد كنائس في نطاق 10 كيلومترات من "${q}".`
            : `No churches found within 10 km of "${q}".`,
        );
      }
    } catch {
      setError(
        lang === "ar"
          ? "حدث خطأ أثناء البحث. تحقق من اتصالك بالإنترنت."
          : "Search failed. Check your internet connection.",
      );
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, lang, mergeWithManual, manualChurches]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsAreaSearch(false);
    setError(null);
    setChurches(allChurches);
    inputRef.current?.focus();
  }, [allChurches]);

  const openMaps = useCallback((c: NearbyChurch) => {
    const url = c.mapsUrl
      ? c.mapsUrl
      : `https://maps.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const openAddDialog = () => {
    setEditTarget(null);
    setFormNameAr("");
    setFormNameEn("");
    setFormMapsUrl("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (church: Church, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(church);
    setFormNameAr(church.nameAr);
    setFormNameEn(church.nameEn);
    setFormMapsUrl(church.imageUrl ?? "");
    setFormError("");
    setDialogOpen(true);
  };

  const handleDeleteManual = async (id: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actor) return;
    try {
      await actor.deleteChurch(id);
      await loadManualChurches();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    const nameAr = formNameAr.trim();
    const nameEn = formNameEn.trim();
    const mapsUrl = formMapsUrl.trim();

    if (!nameAr && !nameEn) {
      setFormError(lang === "ar" ? "أدخل اسم الكنيسة" : "Enter church name");
      return;
    }
    if (!mapsUrl) {
      setFormError(
        lang === "ar" ? "أدخل لينك خرائط جوجل" : "Enter a Google Maps link",
      );
      return;
    }
    const coords = parseGoogleMapsUrl(mapsUrl);
    if (!coords) {
      setFormError(
        lang === "ar"
          ? "تعذّر استخراج الموقع من الرابط. تأكد من نسخ رابط خرائط جوجل كامل (لَيس رابطًا مختصرًا)"
          : "Could not extract location from this link. Use a full Google Maps URL (not a short link).",
      );
      return;
    }

    if (!actor) return;
    setSavingChurch(true);
    try {
      if (editTarget) {
        await actor.updateChurch({
          ...editTarget,
          nameAr,
          nameEn,
          latitude: coords[0],
          longitude: coords[1],
          imageUrl: mapsUrl,
        });
      } else {
        await actor.addChurch({
          id: 0n,
          nameAr,
          nameEn,
          addressAr: "",
          addressEn: "",
          phone: "",
          descriptionAr: "",
          descriptionEn: "",
          latitude: coords[0],
          longitude: coords[1],
          imageUrl: mapsUrl,
        });
      }
      await loadManualChurches();
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save church. Please try again.");
    } finally {
      setSavingChurch(false);
    }
  };

  const mapCenter = userPos ?? [30.044, 31.236];
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${mapCenter[0]},${mapCenter[1]}&zoom=13&size=430x180&maptype=osm`;

  const isLoading = locationLoading || searchLoading;

  return (
    <div className="flex flex-col h-full" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Map banner */}
      <div className="h-40 relative overflow-hidden bg-muted shrink-0">
        <img
          src={mapUrl}
          alt="Map"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
            <MapPin className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-foreground">
              {lang === "ar" ? "الكنائس القريبة منك" : "Nearby Churches"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "ar"
                ? "في نطاق 10 كيلومترات — اضغط للحصول على الاتجاهات"
                : "Within 10 km — tap for directions"}
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={openAddDialog}
              className="shrink-0 gap-1"
            >
              <Plus className="w-4 h-4" />
              {lang === "ar" ? "إضافة كنيسة" : "Add Church"}
            </Button>
          )}
        </div>

        {/* Search bar */}
        <div className="mb-3 space-y-1">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsAreaSearch(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={
                  lang === "ar" ? "ابحث عن كنيسة..." : "Search for a church..."
                }
                className="ps-9 pe-9 bg-background"
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoading}
              className="shrink-0"
            >
              {searchLoading && isAreaSearch ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            {lang === "ar"
              ? "ابحث بالاسم أو اسم المنطقة واضغط البحث للبحث في منطقة مختلفة"
              : "Search by name or area — press search to find churches in a different area"}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {locationLoading
                ? lang === "ar"
                  ? "جاري تحديد موقعك..."
                  : "Detecting your location..."
                : lang === "ar"
                  ? "جاري البحث عن الكنائس القريبة..."
                  : "Searching for nearby churches..."}
            </p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="text-center py-8 px-4">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            {isAreaSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-3 text-xs text-primary underline underline-offset-2"
              >
                {lang === "ar" ? "العودة إلى موقعي" : "Back to my location"}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {churches.length === 0 && searchQuery && !isAreaSearch ? (
              <div className="text-center py-8 px-4">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {lang === "ar"
                    ? `لا توجد نتائج لـ "${searchQuery}" — اضغط بحث للبحث في هذه المنطقة`
                    : `No results for "${searchQuery}" — press search to look in this area`}
                </p>
              </div>
            ) : (
              churches.map((c, index) => {
                const backendChurch = c.manual
                  ? manualChurches.find((m) => m.id === c.backendId)
                  : null;
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                    onClick={() => openMaps(c)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1 ms-5">
                            {index === 0 && (
                              <Badge
                                className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                variant="outline"
                              >
                                <Star className="w-3 h-3 fill-primary" />
                                {lang === "ar"
                                  ? "الأقرب إليك"
                                  : "Nearest to you"}
                              </Badge>
                            )}
                            {c.manual && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                              >
                                {lang === "ar"
                                  ? "مضافة يدويًا"
                                  : "Added manually"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-primary font-medium flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5">
                            <Navigation className="w-3 h-3" />
                            {c.dist.toFixed(1)} {lang === "ar" ? "كم" : "km"}
                          </span>
                          {isAdmin && c.manual && backendChurch && (
                            <div className="flex gap-1 mt-1">
                              <button
                                type="button"
                                onClick={(e) =>
                                  openEditDialog(backendChurch, e)
                                }
                                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteManual(backendChurch.id, e)
                                }
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Church Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editTarget
                ? lang === "ar"
                  ? "تعديل الكنيسة"
                  : "Edit Church"
                : lang === "ar"
                  ? "إضافة كنيسة"
                  : "Add Church"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم الكنيسة (عربي)</Label>
              <Input
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="كنيسة القديس جرجس"
                dir="rtl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {lang === "ar"
                  ? "اسم الكنيسة (إنجليزي)"
                  : "Church Name (English)"}
              </Label>
              <Input
                value={formNameEn}
                onChange={(e) => setFormNameEn(e.target.value)}
                placeholder="St. George Church"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {lang === "ar" ? "لينك خرائط جوجل" : "Google Maps Link"}
              </Label>
              <Input
                value={formMapsUrl}
                onChange={(e) => setFormMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/maps/place/..."
                dir="ltr"
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "افتح الكنيسة على خرائط جوجل ثم اضغط مشاركة → نسخ الرابط والصقه هنا. استخدم الرابط الكامل ليس المختصر."
                  : "Open the church on Google Maps, tap Share → Copy Link and paste it here. Use the full link, not a short link."}
              </p>
            </div>

            {formError && (
              <p className="text-xs text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={savingChurch}>
              {savingChurch ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              {lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
