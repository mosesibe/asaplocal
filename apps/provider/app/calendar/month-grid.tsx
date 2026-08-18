import Link from "next/link";
import { cn } from "@asaplocal/ui";

export interface CalendarDayJob {
  id: string;
  status: string;
  title: string;
}

/** Status → dot colour. Kept next to the legend so the two can't drift apart. */
export const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-espresso-400",
  CONFIRMED: "bg-brand-500",
  IN_PROGRESS: "bg-amber-500",
  AWAITING_APPROVAL: "bg-violet-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-500",
  DISPUTED: "bg-red-600",
};

export function MonthGrid({
  year,
  month, // 1-12
  jobsByDay,
  selectedDay,
  todayKey,
}: {
  year: number;
  month: number;
  jobsByDay: Map<string, CalendarDayJob[]>;
  selectedDay?: string;
  todayKey: string;
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday-first, matching the customer-facing date picker.
  const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthParam = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const key = `${monthParam}-${String(day).padStart(2, "0")}`;
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
                jobs.length === 0 && "opacity-70"
              )}
            >
              <span className={cn("text-xs font-medium", isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white")}>
                {day}
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
      </div>
    </div>
  );
}
