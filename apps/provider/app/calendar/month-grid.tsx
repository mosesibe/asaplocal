import Link from "next/link";
import { cn } from "@asaplocal/ui";

/**
 * A job's calendar span. Always has a start/end day, even a job that hasn't
 * started yet (both equal its scheduledDate) — every job renders as a bar,
 * not just genuinely multi-day ones.
 */
export interface CalendarSpanJob {
  id: string;
  status: string;
  title: string;
  startKey: string; // YYYY-MM-DD
  endKey: string; // YYYY-MM-DD, >= startKey
}

/** Status → bar colour, tracking the job's lifecycle as it progresses. */
export const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-espresso-400",
  CONFIRMED: "bg-brand-500",
  IN_PROGRESS: "bg-amber-500",
  AWAITING_APPROVAL: "bg-violet-500",
  COMPLETED: "bg-emerald-600",
  CANCELLED: "bg-red-500",
  DISPUTED: "bg-red-600",
};

interface DayCell {
  day: number | null;
  key: string | null; // YYYY-MM-DD
}

interface BarSegment {
  job: CalendarSpanJob;
  startCol: number; // 0-6, this week
  endCol: number; // 0-6, this week
  isTrueStart: boolean; // job.startKey falls in this week (vs. continuing from an earlier one)
  isTrueEnd: boolean; // job.endKey falls in this week (vs. continuing into a later one)
  lane: number;
}

const MAX_LANES = 4;

function buildWeekBars(week: DayCell[], jobs: CalendarSpanJob[]): BarSegment[] {
  const segments: BarSegment[] = [];
  for (const job of jobs) {
    let startCol = -1;
    let endCol = -1;
    week.forEach((cell, i) => {
      if (!cell.key) return;
      if (cell.key >= job.startKey && cell.key <= job.endKey) {
        if (startCol === -1) startCol = i;
        endCol = i;
      }
    });
    if (startCol === -1) continue; // job doesn't touch this week
    segments.push({
      job,
      startCol,
      endCol,
      isTrueStart: week[startCol]!.key === job.startKey,
      isTrueEnd: week[endCol]!.key === job.endKey,
      lane: 0,
    });
  }

  // Greedy lane packing: earliest/longest segments first, each takes the
  // first lane whose last-placed segment doesn't overlap its columns.
  segments.sort((a, b) => a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol));
  const laneEnds: number[] = [];
  for (const seg of segments) {
    let lane = laneEnds.findIndex((end) => end < seg.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.endCol);
    } else {
      laneEnds[lane] = seg.endCol;
    }
    seg.lane = lane;
  }
  return segments;
}

export function MonthGrid({
  year,
  month, // 1-12
  jobs,
  selectedDay,
  todayKey,
}: {
  year: number;
  month: number;
  jobs: CalendarSpanJob[];
  selectedDay?: string;
  todayKey: string;
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday-first, matching the customer-facing date picker.
  const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const monthParam = `${year}-${String(month).padStart(2, "0")}`;

  const cells: DayCell[] = [
    ...Array.from({ length: leadingBlanks }, () => ({ day: null, key: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, key: `${monthParam}-${String(day).padStart(2, "0")}` };
    }),
  ];
  // Pad to a multiple of 7 so every week is a clean 7-wide row to lay bars across.
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null });

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-1 space-y-1">
        {weeks.map((week, wi) => {
          const bars = buildWeekBars(week, jobs);
          const visible = bars.filter((s) => s.lane < MAX_LANES);
          const overflowCount = new Set(bars.filter((s) => s.lane >= MAX_LANES).map((s) => s.job.id)).size;
          const lanesUsed = visible.reduce((m, s) => Math.max(m, s.lane + 1), 0);

          return (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) => {
                if (cell.day === null || cell.key === null) return <div key={`blank-${wi}-${ci}`} />;
                const isToday = cell.key === todayKey;
                const isSelected = cell.key === selectedDay;
                return (
                  <Link
                    key={cell.key}
                    href={`/calendar?month=${monthParam}${isSelected ? "" : `&day=${cell.key}`}`}
                    scroll={false}
                    className={cn(
                      "flex justify-center rounded-md border px-1 pt-0.5 pb-1 text-xs font-medium transition-colors",
                      isSelected ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30" : "border-transparent hover:border-border hover:bg-muted"
                    )}
                  >
                    <span className={cn(isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white")}>
                      {cell.day}
                    </span>
                  </Link>
                );
              })}

              {lanesUsed > 0 && (
                <div className="col-span-7 grid grid-cols-7 gap-1" style={{ gridAutoRows: "20px", rowGap: "2px" }}>
                  {visible.map((seg) => (
                    <Link
                      key={seg.job.id}
                      href={`/calendar/${seg.job.id}`}
                      title={`${seg.job.title} — ${seg.job.status.replace(/_/g, " ")}`}
                      style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, gridRow: seg.lane + 1 }}
                      className={cn(
                        "flex items-center overflow-hidden px-1.5 text-[11px] leading-none text-white transition-opacity hover:opacity-90",
                        STATUS_COLOR[seg.job.status] ?? "bg-muted-foreground",
                        seg.job.status === "COMPLETED" ? "font-bold" : "font-medium",
                        seg.isTrueStart ? "rounded-l" : "rounded-l-none",
                        seg.isTrueEnd ? "rounded-r" : "rounded-r-none"
                      )}
                    >
                      <span className="truncate">{seg.job.title}</span>
                    </Link>
                  ))}
                </div>
              )}
              {overflowCount > 0 && (
                <p className="col-span-7 text-right text-[10px] text-muted-foreground">+{overflowCount} more</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
