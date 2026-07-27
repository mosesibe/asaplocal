"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface PreferredDateValue {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM (24-hour), or null if the customer is flexible on arrival time
}

const DEFAULT_TIME = "09:00";

/** Combines a picked date + exact arrival time into a single ISO timestamp for the `preferredDate` field. */
export function toPreferredDateTime(value: PreferredDateValue): string {
  const [hours, minutes] = (value.time ?? DEFAULT_TIME).split(":").map(Number) as [number, number];
  const d = new Date(`${value.date}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

interface WeatherForecast {
  emoji: string;
  label: string;
  tempMinC: number;
  tempMaxC: number;
  precipitationChancePct: number;
}

export function PreferredDatePicker({
  value,
  onChange,
  location,
}: {
  value: PreferredDateValue | null;
  onChange: (value: PreferredDateValue | null) => void;
  location?: { lat?: number; lng?: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = value ? new Date(value.date) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const today = startOfDay(new Date());

  useEffect(() => {
    if (!value?.date || !location?.lat || !location?.lng) {
      setWeather(null);
      return;
    }
    setWeatherLoading(true);
    fetch(`/api/geo/weather?lat=${location.lat}&lng=${location.lng}&date=${value.date}`)
      .then((res) => (res.ok ? res.json() : { forecast: null }))
      .then((data) => setWeather(data.forecast ?? null))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [value?.date, location?.lat, location?.lng]);

  const [pendingDate, setPendingDate] = useState<string | null>(value?.date ?? null);

  function selectDay(day: number) {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange(null); // require re-picking an arrival time for the new date
    setOpen(false);
    setPendingDate(toISODate(picked));
  }

  function selectTime(time: string) {
    if (!pendingDate) return;
    onChange({ date: pendingDate, time });
  }

  function toggleFlexible(flexible: boolean) {
    if (!pendingDate) return;
    onChange({ date: pendingDate, time: flexible ? null : DEFAULT_TIME });
  }

  function clear() {
    setPendingDate(null);
    onChange(null);
    setWeather(null);
  }

  const activeDate = pendingDate ?? value?.date ?? null;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay() + 6) % 7; // Monday-start
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isCurrentOrFutureMonth = viewMonth.getFullYear() > today.getFullYear() || (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() >= today.getMonth());

  return (
    <div>
      <div className="relative">
        <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-base text-foreground shadow-sm focus-within:ring-2 focus-within:ring-brand-500">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none"
          >
            <Calendar size={16} className="shrink-0 text-muted-foreground" />
            {activeDate ? (
              <span>
                {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(activeDate))}
                {value?.time !== undefined && (
                  <span className="text-muted-foreground"> · {value.time ? formatTime(value.time) : "Flexible"}</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Choose a date (optional)</span>
            )}
          </button>
          {activeDate && (
            <button type="button" aria-label="Clear date" onClick={clear} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!isCurrentOrFutureMonth}
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="rounded-lg p-1 hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(viewMonth)}</span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                const isPast = cellDate < today;
                const iso = toISODate(cellDate);
                const isSelected = iso === activeDate;
                const isToday = iso === toISODate(today);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPast}
                    onClick={() => selectDay(day)}
                    className={`h-9 w-9 rounded-full text-sm transition-colors disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-40 ${
                      isSelected ? "bg-brand-600 text-white" : isToday ? "ring-1 ring-brand-500" : "hover:bg-muted"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeDate && !open && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Arrival time</span>
            <input
              type="time"
              value={value?.time ?? DEFAULT_TIME}
              disabled={value?.time === null}
              onChange={(e) => selectTime(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm disabled:opacity-50"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={value?.time === null}
              onChange={(e) => toggleFlexible(e.target.checked)}
            />
            I'm flexible — any time works
          </label>
        </div>
      )}

      {activeDate && !open && (weatherLoading || weather) && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          {weatherLoading ? (
            <span className="text-muted-foreground">Checking the forecast…</span>
          ) : weather ? (
            <>
              <span className="text-lg leading-none">{weather.emoji}</span>
              <span>
                {weather.label}, {weather.tempMinC}–{weather.tempMaxC}°C
              </span>
              <span className="text-muted-foreground">· {weather.precipitationChancePct}% chance of rain</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
