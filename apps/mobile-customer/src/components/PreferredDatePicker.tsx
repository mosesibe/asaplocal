import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

export interface PreferredDateValue {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM, or null if flexible
}

const DEFAULT_TIME = '09:00';
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export function toPreferredDateTime(value: PreferredDateValue): string {
  const [hours, minutes] = (value.time ?? DEFAULT_TIME).split(':').map(Number);
  const d = new Date(`${value.date}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
}

// Ports apps/web/components/preferred-date-picker.tsx: a custom month-grid
// calendar (Monday-start, disabled past days) rather than a native date
// picker library — avoids adding yet another native module (and the
// rebuild it would require) for what's otherwise a simple grid. The web
// version's raw <input type="time"> becomes hourly preset chips here, since
// RN has no built-in time input either; the weather-forecast integration is
// left out as a lower-priority enhancement, not a required field.
export function PreferredDatePicker({ value, onChange }: { value: PreferredDateValue | null; onChange: (v: PreferredDateValue | null) => void }) {
  const { colors, radius, spacing } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = value ? new Date(value.date) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const today = startOfDay(new Date());
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isCurrentOrFutureMonth =
    viewMonth.getFullYear() > today.getFullYear() || (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() >= today.getMonth());

  function selectDay(day: number) {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange({ date: toISODate(picked), time: DEFAULT_TIME });
    setOpen(false);
  }

  function selectTime(time: string) {
    if (!value) return;
    onChange({ ...value, time });
  }

  function toggleFlexible(flexible: boolean) {
    if (!value) return;
    onChange({ ...value, time: flexible ? null : DEFAULT_TIME });
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg }]}
      >
        <Calendar size={16} color={colors.mutedForeground} />
        {value ? (
          <Text variant="body" style={styles.fieldText}>
            {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value.date))}
            <Text variant="body" color="muted">
              {' '}
              · {value.time ? formatTime(value.time) : 'Flexible'}
            </Text>
          </Text>
        ) : (
          <Text variant="body" color="muted" style={styles.fieldText}>
            Choose a date (optional)
          </Text>
        )}
        {value && (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <X size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
      </Pressable>

      {value && (
        <View style={styles.timeSection}>
          <Text variant="small" color="muted">
            Arrival time
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
            {TIME_SLOTS.map((t) => {
              const selected = value.time === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => selectTime(t)}
                  style={[
                    styles.timeChip,
                    { borderRadius: radius.full, borderColor: selected ? colors.brand[600] : colors.border, backgroundColor: selected ? colors.brand[600] : 'transparent' },
                  ]}
                >
                  <Text variant="caption" color={selected ? 'inverse' : 'muted'}>
                    {formatTime(t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.flexibleRow} onPress={() => toggleFlexible(value.time !== null)}>
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: value.time === null ? colors.brand[600] : 'transparent' }]} />
            <Text variant="small" color="muted">
              I'm flexible — any time works
            </Text>
          </Pressable>
        </View>
      )}

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card style={[styles.calendar, { backgroundColor: colors.surface, padding: spacing.four }]}>
              <View style={styles.calendarHeader}>
                <Pressable
                  disabled={!isCurrentOrFutureMonth}
                  onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  style={styles.navButton}
                  hitSlop={8}
                >
                  <ChevronLeft size={18} color={isCurrentOrFutureMonth ? colors.foreground : colors.border} />
                </Pressable>
                <Text variant="smallMedium">{new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(viewMonth)}</Text>
                <Pressable onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={styles.navButton} hitSlop={8}>
                  <ChevronRight size={18} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.weekRow}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                  <Text key={d} variant="caption" color="muted" style={styles.weekDay}>
                    {d}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={i} style={styles.cell} />;
                  const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                  const isPast = cellDate < today;
                  const iso = toISODate(cellDate);
                  const isSelected = value ? iso === value.date : false;
                  const isToday = iso === toISODate(today);
                  return (
                    <Pressable
                      key={i}
                      disabled={isPast}
                      onPress={() => selectDay(day)}
                      style={[
                        styles.cell,
                        styles.dayCell,
                        { borderRadius: 999, backgroundColor: isSelected ? colors.brand[600] : 'transparent', borderColor: isToday ? colors.brand[500] : 'transparent', opacity: isPast ? 0.3 : 1 },
                      ]}
                    >
                      <Text variant="small" color={isSelected ? 'inverse' : 'foreground'}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth },
  fieldText: { flex: 1 },
  timeSection: { marginTop: 8, gap: 6 },
  timeRow: { gap: 6 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth },
  flexibleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  calendar: { width: '100%', maxWidth: 360, gap: 4 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  navButton: { padding: 4 },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderWidth: StyleSheet.hairlineWidth },
});
