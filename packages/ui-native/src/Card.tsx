import { View, StyleSheet, type ViewProps } from "react-native";
import { useAppTheme } from "./theme";

// Matches packages/ui's <Card>: rounded-2xl border bg-surface shadow-card.
export function Card({ style, ...props }: ViewProps) {
  const { colors, radius } = useAppTheme();
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 4,
    shadowColor: "#1c120c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
});
