import { View, StyleSheet, type ViewProps } from "react-native";
import { Text } from "./Text";
import { useAppTheme } from "./theme";

export type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  children: string;
}

// Matches packages/ui's badgeVariants (rounded-full px-2.5 py-0.5 text-xs).
export function Badge({ variant = "default", children, style, ...props }: BadgeProps) {
  const { colors, radius } = useAppTheme();

  const variantStyle: Record<BadgeVariant, { bg: string; fg: string }> = {
    default: { bg: colors.brand[600], fg: "#ffffff" },
    secondary: { bg: colors.brand[100], fg: colors.brand[800] },
    outline: { bg: "transparent", fg: colors.foreground },
    success: { bg: "#d1fae5", fg: "#065f46" },
    warning: { bg: "#fef3c7", fg: "#92400e" },
    destructive: { bg: "#fee2e2", fg: "#991b1b" },
  };
  const v = variantStyle[variant];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: v.bg, borderRadius: radius.full },
        variant === "outline" && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
        style,
      ]}
      {...props}
    >
      <Text variant="caption" style={{ color: v.fg }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
});
