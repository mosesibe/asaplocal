"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MapPin, Navigation, Search, Trash2 } from "lucide-react";
import { Button, Input } from "@asaplocal/ui";

export interface LocationValue {
  addressLine: string;
  city: string;
  postcode?: string;
  lat?: number; // absent only in the "new" manual-fallback path; the server geocodes it on submit
  lng?: number;
  source: "current" | "saved" | "new";
}

interface SavedAddress {
  id: string;
  addressLine: string;
  city: string;
  postcode: string | null;
  lat: string | number;
  lng: string | number;
}

interface Prediction {
  placeId: string;
  description: string;
}

type Mode = "current" | "saved" | "new";

export function LocationPicker({
  value,
  onChange,
  tone = "auto",
}: {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  /** "light" forces a readable palette for use inside a permanently-light card on a dark surface. */
  tone?: "auto" | "light";
}) {
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>(value?.source ?? "new");
  const [modeTouched, setModeTouched] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[] | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const [gpsState, setGpsState] = useState<"idle" | "locating" | "resolving" | "error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const [manualFields, setManualFields] = useState({ addressLine: "", city: "", postcode: "" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLight = tone === "light";
  const textClass = isLight ? "text-espresso-900" : "text-foreground";
  const mutedClass = isLight ? "text-espresso-400" : "text-muted-foreground";
  const borderClass = isLight ? "border-espresso-200" : "border-border";
  const surfaceClass = isLight ? "bg-white" : "bg-surface";
  const fieldClass = isLight ? "border-espresso-200 bg-white text-espresso-900 placeholder:text-espresso-400" : "";

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingSaved(true);
    fetch("/api/addresses")
      .then((res) => (res.ok ? res.json() : { addresses: [] }))
      .then((data: { addresses?: SavedAddress[] }) => {
        const addresses = data.addresses ?? [];
        setSavedAddresses(addresses);
        if (!modeTouched && !value && addresses.length > 0) setMode("saved");
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setLoadingSaved(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function selectMode(next: Mode) {
    setMode(next);
    setModeTouched(true);
    if (value?.source !== next) onChange(null);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setGpsState("error");
      setGpsError("Your browser doesn't support location access — please add your address instead.");
      return;
    }
    setGpsState("locating");
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsState("resolving");
        try {
          const res = await fetch("/api/geo/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setGpsState("idle");
          onChange({ addressLine: data.addressLine, city: data.city, postcode: data.postcode || undefined, lat: data.lat, lng: data.lng, source: "current" });
        } catch {
          setGpsState("error");
          setGpsError("Couldn't determine your address — please add it manually.");
        }
      },
      () => {
        setGpsState("error");
        setGpsError("Location access was denied — please add your address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function selectSaved(addr: SavedAddress) {
    setSelectedSavedId(addr.id);
    onChange({ addressLine: addr.addressLine, city: addr.city, postcode: addr.postcode ?? undefined, lat: Number(addr.lat), lng: Number(addr.lng), source: "saved" });
  }

  async function removeSaved(id: string) {
    setSavedAddresses((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
    if (selectedSavedId === id) {
      setSelectedSavedId(null);
      onChange(null);
    }
    await fetch(`/api/addresses/${id}`, { method: "DELETE" }).catch(() => {});
  }

  // Debounced Places Autocomplete as the user types.
  useEffect(() => {
    if (mode !== "new" || showManualFields) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geo/autocomplete?input=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPredictions(data.predictions ?? []);
      } catch {
        setLookupUnavailable(true);
        setShowManualFields(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, showManualFields]);

  async function selectPrediction(p: Prediction) {
    setPredictions([]);
    setQuery(p.description);
    try {
      const res = await fetch(`/api/geo/place/${p.placeId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setManualFields({ addressLine: data.addressLine, city: data.city, postcode: data.postcode ?? "" });
      setShowManualFields(true);
      onChange({ addressLine: data.addressLine, city: data.city, postcode: data.postcode || undefined, lat: data.lat, lng: data.lng, source: "new" });
    } catch {
      setLookupUnavailable(true);
      setShowManualFields(true);
    }
  }

  function updateManualField(field: "addressLine" | "city" | "postcode", val: string) {
    const next = { ...manualFields, [field]: val };
    setManualFields(next);
    if (next.addressLine.trim() && next.city.trim()) {
      onChange({ addressLine: next.addressLine.trim(), city: next.city.trim(), postcode: next.postcode.trim() || undefined, source: "new" });
    } else {
      onChange(null);
    }
  }

  const showSavedTab = status === "authenticated" && (loadingSaved || (savedAddresses?.length ?? 0) > 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={mode === "current" ? "default" : "outline"} size="sm" onClick={() => selectMode("current")}>
          <Navigation size={14} /> Current location
        </Button>
        {showSavedTab && (
          <Button type="button" variant={mode === "saved" ? "default" : "outline"} size="sm" onClick={() => selectMode("saved")}>
            <MapPin size={14} /> Saved address
          </Button>
        )}
        <Button type="button" variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => selectMode("new")}>
          <Search size={14} /> Add new
        </Button>
      </div>

      <div className={`mt-3 rounded-xl border ${borderClass} ${surfaceClass} p-3`}>
        {mode === "current" && (
          <div>
            {gpsState === "idle" && value?.source === "current" ? (
              <div className={`flex items-start gap-2 text-sm ${textClass}`}>
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span>
                  {value.addressLine ? `${value.addressLine}, ` : ""}
                  {value.city}
                  {value.postcode ? `, ${value.postcode}` : ""}
                </span>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={gpsState === "locating" || gpsState === "resolving"}>
                {gpsState === "locating" || gpsState === "resolving" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> {gpsState === "locating" ? "Getting location…" : "Looking up address…"}
                  </>
                ) : (
                  <>
                    <Navigation size={14} /> Use my current location
                  </>
                )}
              </Button>
            )}
            {gpsState === "error" && gpsError && <p className="mt-2 text-xs text-red-600">{gpsError}</p>}
          </div>
        )}

        {mode === "saved" && (
          <div className="space-y-2">
            {loadingSaved && <p className={`text-sm ${mutedClass}`}>Loading your addresses…</p>}
            {!loadingSaved && savedAddresses?.length === 0 && <p className={`text-sm ${mutedClass}`}>No saved addresses yet — add one below.</p>}
            {savedAddresses?.map((addr) => (
              <div
                key={addr.id}
                className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm ${
                  selectedSavedId === addr.id ? "border-brand-500 ring-1 ring-brand-500" : borderClass
                }`}
              >
                <button type="button" onClick={() => selectSaved(addr)} className={`flex-1 text-left ${textClass}`}>
                  <span className="font-medium">{addr.addressLine}</span>
                  <span className={mutedClass}>
                    , {addr.city}
                    {addr.postcode ? `, ${addr.postcode}` : ""}
                  </span>
                </button>
                <button type="button" aria-label="Remove saved address" onClick={() => removeSaved(addr.id)} className={mutedClass}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {mode === "new" && (
          <div className="space-y-2">
            {!showManualFields && (
              <div className="relative">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing your postcode or address…" className={fieldClass} />
                {searching && <Loader2 size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 animate-spin ${mutedClass}`} />}
                {predictions.length > 0 && (
                  <div className={`absolute z-10 mt-1 w-full rounded-xl border ${borderClass} ${surfaceClass} shadow-card`}>
                    {predictions.map((p) => (
                      <button key={p.placeId} type="button" onClick={() => selectPrediction(p)} className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${textClass}`}>
                        {p.description}
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setShowManualFields(true)} className={`mt-1 text-xs underline ${mutedClass}`}>
                  Enter address manually instead
                </button>
              </div>
            )}

            {showManualFields && (
              <div className="space-y-2">
                {lookupUnavailable && <p className="text-xs text-amber-600">Address lookup is unavailable right now — enter your address below.</p>}
                <Input value={manualFields.addressLine} onChange={(e) => updateManualField("addressLine", e.target.value)} placeholder="Address line" className={fieldClass} />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={manualFields.city} onChange={(e) => updateManualField("city", e.target.value)} placeholder="City" className={fieldClass} />
                  <Input value={manualFields.postcode} onChange={(e) => updateManualField("postcode", e.target.value)} placeholder="Postcode" className={fieldClass} />
                </div>
                {!lookupUnavailable && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualFields(false);
                      setQuery("");
                      setManualFields({ addressLine: "", city: "", postcode: "" });
                      onChange(null);
                    }}
                    className={`text-xs underline ${mutedClass}`}
                  >
                    Search for an address instead
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
