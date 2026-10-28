"use client";

import { useState, useEffect, useMemo, useRef, useId } from "react";
import dynamic from "next/dynamic";
import { debounce } from "lodash";
import Icon from "./Icon";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-80 flex items-center justify-center bg-ob-field rounded-xl border border-ob-border text-text/60">
      加载地图...
    </div>
  ),
});

interface LocationData {
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
}
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}
interface LocationPickerProps {
  value: LocationData | null;
  onChange: (location: LocationData) => void;
}

const NOMINATIM_HEADERS = () => ({
  "User-Agent": "C-arot/1.0 (https://c-arot.app)",
  Referer: typeof window !== "undefined" ? window.location.origin : "",
});

async function getTimezone(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch("/api/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    const d = await r.json();
    return d.timezone || "Asia/Kuala_Lumpur";
  } catch {
    return "Asia/Kuala_Lumpur";
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: NOMINATIM_HEADERS() },
    );
    const d = await r.json();
    return d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function LocationPicker({
  value,
  onChange,
}: LocationPickerProps) {
  // One field: shows the selected place; typing turns it into a search.
  const [query, setQuery] = useState(value?.place || "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [position, setPosition] = useState<[number, number]>([
    value?.latitude ?? 3.139,
    value?.longitude ?? 101.687,
  ]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (value?.place) setQuery(value.place);
  }, [value?.place]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const search = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q.trim()) {
          setResults([]);
          setOpen(false);
          return;
        }
        setIsSearching(true);
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
            { headers: NOMINATIM_HEADERS() },
          );
          const d: NominatimResult[] = await r.json();
          setResults(d);
          setActive(d.length ? 0 : -1);
          setOpen(d.length > 0);
        } catch {
          setResults([]);
          setOpen(false);
        } finally {
          setIsSearching(false);
        }
      }, 450),
    [],
  );
  useEffect(() => () => search.cancel(), [search]);

  const commit = async (place: string, lat: number, lng: number) => {
    setPosition([lat, lng]);
    setQuery(place);
    setShowMap(true);
    const timezone = await getTimezone(lat, lng);
    onChange({ place, latitude: lat, longitude: lng, timezone });
  };

  const select = (r: NominatimResult) => {
    setOpen(false);
    setResults([]);
    setActive(-1);
    search.cancel();
    commit(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
  };

  const onMapClick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    commit(await reverseGeocode(lat, lng), lat, lng);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      select(results[active]);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={wrapRef} className="relative z-[1100]">
        <label
          htmlFor={`${listId}-input`}
          className="block text-text mb-2 text-sm"
        >
          出生地点
        </label>
        <div className="relative">
          <Icon
            name="search"
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text/60 pointer-events-none"
          />
          <input
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && active >= 0 ? `${listId}-opt-${active}` : undefined
            }
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            onFocus={() => {
              if (results.length) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder="搜索城市,例如 Kuala Lumpur"
            className="w-full h-12 pl-12 pr-10 bg-ob-field text-text rounded-xl border border-ob-border focus:border-primary focus:outline-none"
          />
          {isSearching && (
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text/60"
              aria-live="polite"
            >
              搜索中…
            </span>
          )}
        </div>
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-2 bg-ob-field border border-ob-border rounded-xl overflow-hidden shadow-[var(--shadow-1)]"
          >
            {results.map((r, i) => (
              <li
                key={`${r.lat},${r.lon},${i}`}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(r)}
                onMouseEnter={() => setActive(i)}
                className={`min-h-[44px] px-4 py-2.5 flex items-center gap-2 text-sm text-text cursor-pointer border-b border-ob-border last:border-0 ${i === active ? "bg-primary text-on-primary" : ""}`}
              >
                <Icon name="pin" size={16} className="shrink-0" />
                <span className="truncate">{r.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowMap((s) => !s)}
        aria-expanded={showMap}
        className="text-sm text-primary inline-flex items-center gap-1.5 hover:underline"
      >
        <Icon name={showMap ? "map" : "pin"} size={18} />
        {showMap ? "收起地图" : "在地图上选择"}
      </button>

      {showMap && (
        <div className="space-y-2">
          <LeafletMap
            position={position}
            onLocationSelect={onMapClick}
            markerPosition={
              value ? [value.latitude, value.longitude] : undefined
            }
            zoom={value ? 11 : 6}
          />
          {value && (
            <p className="text-xs text-text/60">
              坐标 {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)} ·
              时区 {value.timezone}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
