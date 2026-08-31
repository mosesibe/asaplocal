import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset, type BadgeVariant } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface CalendarSpanJob {
  id: string;
  status: string;
  title: string;
  startKey: string;
  endKey: string;
}
interface ListedBooking {
  id: string;
  title: string;
  customerName: string;
  scheduledDate: string;
  addressLine: string;
  city: string;
  status: string;
  assignedStaffName: string | null;
  earnedPence: number | null;
}
interface UpcomingBooking {
  id: string;
  title: string;
  scheduledDate: string;
  status: string;
}
interface CalendarResponse {
  year: number;
  month: number;
  todayKey: string;
  jobs: CalendarSpanJob[];
  monthBookingsCount: number;
  completedCount: number;
  earnedPence: number;
  upcoming: UpcomingBooking[];
  listed: ListedBooking[];
}

// Status → bar colour, tracking a job's lifecycle as it progresses — the
// "progress bar" on the month grid. Ports STATUS_COLOR from
// apps/provider/app/calendar/month-grid.tsx; hex values pulled from the
// preset/BRAND_PROVIDER tokens that those Tailwind classes actually render
// as for this app (see packages/ui-native/src/tokens.ts and
// packages/ui/tailwind.preset.js's espresso scale).
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#7b5a3f',
  CONFIRMED: '#c15f2a',
  IN_PROGRESS: '#f59e0b',
  AWAITING_APPROVAL: '#8b5cf6',
  COMPLETED: '#059669',
  CANCELLED: '#ef4444',
  DISPUTED: '#dc2626',
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  PENDING: 'outline',
  CONFIRMED: 'secondary',
  IN_PROGRESS: 'warning',
  AWAITING_APPROVAL: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  DISPUTED: 'destructive',
};

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

interface DayCell {
  day: number | null;
  key: string | null;
}
interface BarSegment {
  job: CalendarSpanJob;
  startCol: number;
  endCol: number;
  isTrueStart: boolean;
  isTrueEnd: boolean;
  lane: number;
}
const MAX_LANES = 4;

// Ported verbatim from apps/provider/app/calendar/month-grid.tsx — pure
// data/layout logic, no DOM/CSS involved, so it's identical here.
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
    if (startCol === -1) continue;
    segments.push({ job, startCol, endCol, isTrueStart: week[startCol]!.key === job.startKey, isTrueEnd: week[endCol]!.key === job.endKey, lane: 0 });
  }
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

function buildWeeks(year: number, month: number): DayCell[][] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const monthParam = `${year}-${String(month).padStart(2, '0')}`;
  const cells: DayCell[] = [
    ...Array.from({ length: leadingBlanks }, () => ({ day: null, key: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, key: `${monthParam}-${String(i + 1).padStart(2, '0')}` })),
  ];
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null });
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Rebuilds apps/provider/app/calendar/page.tsx + month-grid.tsx: month-grid
// job bars colour-coded by status, stat tiles, legend, "Next up", and the
// day-filtered/full-month job list. A native month grid is worth it here
// (unlike a full RadarMap-style native dependency) since it's pure
// flexbox — no new native library needed.
export default function CalendarScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const monthParam = `${year}-${String(month).padStart(2, '0')}`;
      const res = await api.request<CalendarResponse>(`/api/calendar?month=${monthParam}`);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your calendar.');
    }
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function goToMonth(deltaMonths: number) {
    const d = new Date(year, month - 1 + deltaMonths, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDay(undefined);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSelectedDay(undefined);
  }

  function toggleDay(key: string) {
    setSelectedDay((prev) => (prev === key ? undefined : key));
  }

  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);
  const monthLabel = useMemo(() => new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), [year, month]);

  if (loading || !data) {
    return <Screen style={styles.centered} />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]}>
        <Text variant="small" color="muted">
          Every job you've booked, in progress and completed.
        </Text>
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.statGrid}>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Jobs this month
            </Text>
            <Text variant="bodyMedium">{data.monthBookingsCount}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Completed
            </Text>
            <Text variant="bodyMedium">{data.completedCount}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" color="muted">
              Earned
            </Text>
            <Text variant="bodyMedium">{formatPence(data.earnedPence)}</Text>
          </Card>
        </View>

        <Card style={styles.gridCard}>
          <View style={styles.monthNav}>
            <Pressable style={styles.navButton} onPress={() => goToMonth(-1)}>
              <ChevronLeft size={18} color={colors.foreground} />
            </Pressable>
            <View style={styles.monthNavCenter}>
              <Text variant="smallMedium">{monthLabel}</Text>
              <Pressable onPress={goToday}>
                <Text variant="caption" color="brand">
                  Today
                </Text>
              </Pressable>
            </View>
            <Pressable style={styles.navButton} onPress={() => goToMonth(1)}>
              <ChevronRight size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((d) => (
              <Text key={d} variant="caption" color="muted" style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => {
            const bars = buildWeekBars(week, data.jobs);
            const visible = bars.filter((s) => s.lane < MAX_LANES);
            const overflowCount = new Set(bars.filter((s) => s.lane >= MAX_LANES).map((s) => s.job.id)).size;
            const lanes: (BarSegment | null)[][] = Array.from({ length: Math.min(MAX_LANES, Math.max(0, ...visible.map((s) => s.lane + 1))) }, () =>
              new Array(7).fill(null)
            );
            for (const seg of visible) {
              for (let c = seg.startCol; c <= seg.endCol; c++) lanes[seg.lane]![c] = c === seg.startCol ? seg : (lanes[seg.lane]![c] ?? undefined) === undefined ? null : lanes[seg.lane]![c];
            }

            return (
              <View key={wi} style={styles.week}>
                <View style={styles.dayRow}>
                  {week.map((cell, ci) => {
                    if (cell.day === null || cell.key === null) return <View key={`b-${wi}-${ci}`} style={styles.dayCell} />;
                    const isToday = cell.key === data.todayKey;
                    const isSelected = cell.key === selectedDay;
                    return (
                      <Pressable key={cell.key} style={styles.dayCell} onPress={() => toggleDay(cell.key!)}>
                        <View
                          style={[
                            styles.dayCellInner,
                            { borderRadius: 8 },
                            isSelected && { backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[500] },
                          ]}
                        >
                          <Text
                            variant="caption"
                            style={[
                              styles.dayNumber,
                              isToday && [styles.todayCircle, { backgroundColor: colors.brand[600] }],
                              isToday && styles.todayText,
                            ]}
                          >
                            {cell.day}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {visible.length > 0 &&
                  lanes.map((laneRow, li) => (
                    <View key={li} style={styles.laneRow}>
                      {(() => {
                        const nodes: React.ReactNode[] = [];
                        let c = 0;
                        while (c < 7) {
                          const seg = visible.find((s) => s.lane === li && s.startCol === c);
                          if (seg) {
                            const span = seg.endCol - seg.startCol + 1;
                            nodes.push(
                              <Pressable
                                key={seg.job.id}
                                style={[
                                  styles.bar,
                                  {
                                    flex: span,
                                    backgroundColor: STATUS_COLOR[seg.job.status] ?? colors.mutedForeground,
                                    borderTopLeftRadius: seg.isTrueStart ? 4 : 0,
                                    borderBottomLeftRadius: seg.isTrueStart ? 4 : 0,
                                    borderTopRightRadius: seg.isTrueEnd ? 4 : 0,
                                    borderBottomRightRadius: seg.isTrueEnd ? 4 : 0,
                                  },
                                ]}
                                onPress={() => router.push(`/bookings/${seg.job.id}`)}
                              >
                                <Text variant="caption" color="inverse" numberOfLines={1} style={styles.barText}>
                                  {seg.job.title}
                                </Text>
                              </Pressable>
                            );
                            c = seg.endCol + 1;
                          } else {
                            // find how many consecutive empty columns to skip as one spacer
                            let span = 0;
                            while (c + span < 7 && !visible.some((s) => s.lane === li && s.startCol === c + span)) span++;
                            nodes.push(<View key={`gap-${li}-${c}`} style={{ flex: span || 1 }} />);
                            c += span || 1;
                          }
                        }
                        return nodes;
                      })()}
                    </View>
                  ))}
                {overflowCount > 0 && (
                  <Text variant="caption" color="muted" style={styles.overflow}>
                    +{overflowCount} more
                  </Text>
                )}
              </View>
            );
          })}

          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            {Object.entries(STATUS_COLOR)
              .filter(([s]) => s !== 'DISPUTED')
              .map(([status, color]) => (
                <View key={status} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                  <Text variant="caption" color="muted">
                    {status.replace(/_/g, ' ').toLowerCase()}
                  </Text>
                </View>
              ))}
          </View>
        </Card>

        {data.upcoming.length > 0 && !selectedDay && (
          <>
            <Text variant="subtitle" style={styles.sectionHeading}>
              Next up
            </Text>
            {data.upcoming.map((b) => (
              <Pressable key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
                <Card style={styles.upcomingCard}>
                  <View style={styles.cardRow}>
                    <View style={styles.flexShrink}>
                      <Text variant="small" numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text variant="caption" color="muted">
                        {new Date(b.scheduledDate).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Badge variant={STATUS_BADGE[b.status] ?? 'outline'}>{b.status.replace(/_/g, ' ')}</Badge>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">
            {selectedDay ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : monthLabel}
          </Text>
          {selectedDay && (
            <Pressable onPress={() => setSelectedDay(undefined)}>
              <Text variant="small" color="brand">
                Show whole month
              </Text>
            </Pressable>
          )}
        </View>

        {data.listed.length === 0 ? (
          <Text variant="small" color="muted">
            {selectedDay ? 'Nothing scheduled that day.' : `No jobs in ${monthLabel}.`}
          </Text>
        ) : (
          data.listed.map((b) => (
            <Pressable key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
              <Card style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.flexShrink}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {b.title}
                    </Text>
                    <Text variant="caption" color="muted">
                      {b.customerName} · {new Date(b.scheduledDate).toLocaleString('en-GB')}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={1}>
                      {b.addressLine}, {b.city}
                    </Text>
                    {b.earnedPence != null && (
                      <Text variant="caption" style={styles.earned}>
                        You earned {formatPence(b.earnedPence)}
                      </Text>
                    )}
                  </View>
                  <Badge variant={STATUS_BADGE[b.status] ?? 'outline'}>{b.status.replace(/_/g, ' ')}</Badge>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 4 },
  error: { color: '#dc2626', marginTop: 4 },
  statGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: { flex: 1, gap: 2 },
  gridCard: { marginTop: 12, gap: 0 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navButton: { padding: 6 },
  monthNavCenter: { alignItems: 'center', gap: 2 },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center' },
  week: { marginTop: 2 },
  dayRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayCellInner: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 12 },
  todayCircle: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  todayText: { color: '#fff' },
  laneRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 18 },
  bar: { justifyContent: 'center', paddingHorizontal: 4, height: 18 },
  barText: { fontSize: 10 },
  overflow: { textAlign: 'right', marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 14, height: 8, borderRadius: 2 },
  sectionHeading: { marginTop: 20, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  upcomingCard: { marginBottom: 6 },
  card: { marginBottom: 6, gap: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  flexShrink: { flexShrink: 1, gap: 2 },
  earned: { color: '#059669', marginTop: 2 },
});
