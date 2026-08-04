import Link from "next/link";
import { Card } from "@asaplocal/ui";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 7-day Mon-Sun strip — a dot marks days with bookings, today is highlighted. Links out to the full /calendar page. */
export function WeekCalendarStrip({ bookingDates }: { bookingDates: string[] }) {
  const weekStart = startOfWeek(new Date());
  const todayStr = new Date().toISOString().slice(0, 10);
  const bookingDateSet = new Set(bookingDates);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return { label: DAY_LABELS[i], num: d.getDate(), dateStr: d.toISOString().slice(0, 10) };
  });

  return (
    <Link href="/calendar" className="block">
      <Card className="p-4 transition-shadow hover:shadow-card">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const isToday = d.dateStr === todayStr;
            const hasBooking = bookingDateSet.has(d.dateStr);
            return (
              <div key={d.dateStr} className="flex flex-col items-center gap-1 py-1">
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                    isToday ? "bg-brand-500 text-white" : "text-foreground"
                  }`}
                >
                  {d.num}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${hasBooking ? "bg-brand-500" : "bg-transparent"}`} />
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
