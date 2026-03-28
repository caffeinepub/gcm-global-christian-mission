import { Loader2, MapPin, Navigation, Search, Star, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useLang } from "../contexts/LanguageContext";

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

interface NearbyChurch {
  id: number;
  lat: number;
  lon: number;
  name: string;
  dist: number;
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
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [churches, setChurches] = useState<NearbyChurch[]>([]);
  const [allChurches, setAllChurches] = useState<NearbyChurch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAreaSearch, setIsAreaSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!userPos) return;
    setSearchLoading(true);
    setError(null);
    fetchNearbyChurches(userPos[0], userPos[1], 10)
      .then((results) => {
        setAllChurches(results);
        setChurches(results);
        if (results.length === 0) {
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
  }, [userPos, lang]);

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
      setChurches(results);
      if (results.length === 0) {
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
  }, [searchQuery, lang]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsAreaSearch(false);
    setError(null);
    setChurches(allChurches);
    inputRef.current?.focus();
  }, [allChurches]);

  const openMaps = useCallback((c: NearbyChurch) => {
    window.open(
      `https://maps.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const mapCenter = userPos ?? [30.044, 31.236];
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${mapCenter[0]},${mapCenter[1]}&zoom=13&size=430x180&maptype=osm`;

  const isLoading = locationLoading || searchLoading;

  return (
    <div className="flex flex-col h-full">
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
        <div className="mb-3">
          <h2 className="font-semibold text-foreground">
            {lang === "ar" ? "الكنائس القريبة منك" : "Nearby Churches"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === "ar"
              ? "في نطاق 10 كيلومترات — اضغط للحصول على الاتجاهات"
              : "Within 10 km — tap for directions"}
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-3 space-y-1" data-ocid="church.search_input">
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
                  data-ocid="church.close_button"
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
              data-ocid="church.primary_button"
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
          <div
            className="flex flex-col items-center justify-center py-12 gap-3"
            data-ocid="church.loading_state"
          >
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
          <div className="text-center py-8 px-4" data-ocid="church.error_state">
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
              <div
                className="text-center py-8 px-4"
                data-ocid="church.empty_state"
              >
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {lang === "ar"
                    ? `لا توجد نتائج لـ "${searchQuery}" — اضغط بحث للبحث في هذه المنطقة`
                    : `No results for "${searchQuery}" — press search to look in this area`}
                </p>
              </div>
            ) : (
              churches.map((c, index) => (
                <Card
                  key={c.id}
                  className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                  onClick={() => openMaps(c)}
                  data-ocid={`church.item.${index + 1}`}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          {c.name}
                        </p>
                        {index === 0 && (
                          <Badge
                            className="mt-1 ml-5 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                            variant="outline"
                          >
                            <Star className="w-3 h-3 fill-primary" />
                            {lang === "ar" ? "الأقرب إليك" : "Nearest to you"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-primary font-medium flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5">
                          <Navigation className="w-3 h-3" />
                          {c.dist.toFixed(1)} {lang === "ar" ? "كم" : "km"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
