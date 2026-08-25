import Link from "next/link";
import { cn } from "@asaplocal/ui";

export interface CalendarDayJob {
  id: string;
  status: string;
  title: string;
}

/** A job with real elapsed time (startedAt set) spanning more than one calendar day. */
export interface CalendarSpanJob {
  id: string;
  status: string;
  title: string;
  startKey: string; // YYYY-MM-DD
  endKey: string; // YYYY-MM-DD, >= startKey
}

/** Status → colour. Used for both the single-day dot and the multi-day ribbon fill. */
export const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-espresso-400",
  CONFIRMED: "bg-brand-500",
  IN_PROGRESS: "bg-amber-500",
  AWAITING_APPROVAL: "bg-violet-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-500",
  DISPUTED: "bg-red-600",
};

interface DayCell {
  day: number | null;
  key: string | null; // YYYY-MM-DD
}

interface RibbonSegment {
  job: CalendarSpanJob;
  startCol: number; // 0-6, this week
  endCol: number; // 0-6, this week
  isTrueStart: boolean; // job.startKey falls in this week (vs. continuing from an earlier one)
  isTrueEnd: boolean; // job.endKey falls in this week (vs. continuing into a later one)
  lane: number;
}

const MAX_LANES = 3;

function buildWeekRibbons(week: DayCell[], jobs: CalendarSpanJob[]): RibbonSegment[] {
  const segments: RibbonSegment[] = [];
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

  // Greedy lane packing: longest/earliest segments first, each takes the
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
  jobsByDay,
  multiDayJobs,
  selectedDay,
  todayKey,
}: {
  year: number;
  month: number;
  jobsByDay: Map<string, CalendarDayJob[]>;
  multiDayJobs: CalendarSpanJob[];
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
  // Pad to a multiple of 7 so every week is a clean 7-wide row to lay ribbons across.
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
          const ribbons = buildWeekRibbons(week, multiDayJobs);
          const visible = ribbons.filter((s) => s.lane < MAX_LANES);
          const overflowCount = new Set(ribbons.filter((s) => s.lane >= MAX_LANES).map((s) => s.job.id)).size;
          const lanesUsed = visible.reduce((m, s) => Math.max(m, s.lane + 1), 0);
          const daysWithRibbon = new Set<number>();
          ribbons.forEach((s) => {
            for (let c = s.startCol; c <= s.endCol; c++) daysWithRibbon.add(c);
          });

          return (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) => {
                if (cell.day === null || cell.key === null) return <div key={`blank-${wi}-${ci}`} />;
                const key = cell.key;
                const jobs = jobsByDay.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                return (
                  <Link
                    key={key}
                    href={`/calendar?month=${monthParam}${isSelected ? "" : `&day=${key}`}`}
                    scroll={false}
                    className={cn(
                      "flex min-h-[68px] flex-col rounded-lg border p-1.5 transition-colors",
                      isSelected ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30" : "border-border hover:bg-muted",
                      jobs.length === 0 && !daysWithRibbon.has(ci) && "opacity-70"
                    )}
                  >
                    <span className={cn("text-xs font-medium", isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white")}>
                      {cell.day}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {jobs.slice(0, 4).map((j) => (
                        <span key={j.id} title={`${j.title} — ${j.status.replace(/_/g, " ")}`} className={cn("h-2 w-2 rounded-full", STATUS_DOT[j.status] ?? "bg-muted-foreground")} />
                      ))}
                      {jobs.length > 4 && <span className="text-[10px] leading-none text-muted-foreground">+{jobs.length - 4}</span>}
                    </span>
                  </Link>
                );
              })}

              {lanesUsed > 0 && (
                <div className="col-span-7 grid grid-cols-7 gap-1" style={{ gridAutoRows: "15px", rowGap: "2px" }}>
                  {visible.map((seg) => (
                    <Link
                      key={seg.job.id}
                      href={`/calendar/${seg.job.id}`}
                      title={`${seg.job.title} — ${seg.job.status.replace(/_/g, " ")}`}
                      style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, gridRow: seg.lane + 1 }}
                      className={cn(
                        "flex items-center overflow-hidden px-1.5 text-[10px] font-medium leading-none text-white",
                        STATUS_DOT[seg.job.status] ?? "bg-muted-foreground",
                        seg.isTrueStart ? "rounded-l" : "rounded-l-none",
                        seg.isTrueEnd ? "rounded-r" : "rounded-r-none"
                      )}
                    >
                      {seg.isTrueStart && <span className="truncate">{seg.job.title}</span>}
                    </Link>
                  ))}
                </div>
              )}
              {overflowCount > 0 && (
                <p className="col-span-7 text-right text-[10px] text-muted-foreground">+{overflowCount} more spanning</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
