import { StyleSheet, View } from 'react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

const STEPS = ['Business profile', 'Services', 'Verification'] as const;

// Ports apps/provider/components/onboarding-progress.tsx: shown at the top
// of the three post-signup wizard screens (onboarding.tsx, services.tsx,
// verification/index.tsx when reached with ?onboarding=1).
export function OnboardingProgress({ current }: { current: 1 | 2 | 3 }) {
  const { colors, radius } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {STEPS.map((label, i) => {
          const step = (i + 1) as 1 | 2 | 3;
          const done = step < current;
          const active = step === current;
          return (
            <View key={label} style={styles.item}>
              <View
                style={[
                  styles.dot,
                  { borderRadius: radius.full },
                  done && { backgroundColor: colors.brand[600] },
                  active && { borderWidth: 2, borderColor: colors.brand[600] },
                  !done && !active && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
                ]}
              >
                <Text variant="caption" style={done ? styles.doneLabel : undefined} color={active ? 'brand' : !done ? 'muted' : undefined}>
                  {done ? '✓' : step}
                </Text>
              </View>
              {step < 3 && <View style={[styles.line, { backgroundColor: done ? colors.brand[600] : colors.border }]} />}
            </View>
          );
        })}
      </View>
      <Text variant="caption" color="muted">
        Step {current} of 3 · {STEPS[current - 1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  doneLabel: { color: '#ffffff' },
  line: { height: StyleSheet.hairlineWidth, flex: 1, marginHorizontal: 6 },
});
