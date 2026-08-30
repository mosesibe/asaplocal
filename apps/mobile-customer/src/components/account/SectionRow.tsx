import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

// Ports apps/web/components/account/section-row.tsx's SectionCard/SectionRow
// layout primitives.
export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { radius } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text variant="subtitle" style={styles.title}>
        {title}
      </Text>
      <Card style={[styles.card, { borderRadius: radius.xl }]}>{children}</Card>
    </View>
  );
}

export function SectionRow({
  icon: Icon,
  label,
  description,
  right,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const interactive = !!onPress && !right;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={[styles.row, { borderColor: colors.border }]}>
      <Icon size={18} color={colors.mutedForeground} />
      <View style={styles.rowText}>
        <Text variant="small">{label}</Text>
        {description && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
      {right ?? (interactive ? <ChevronRight size={18} color={colors.mutedForeground} /> : null)}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, marginTop: 24 },
  title: {},
  card: { padding: 0, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
});
