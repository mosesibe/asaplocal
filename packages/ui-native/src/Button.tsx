import { Pressable, ActivityIndicator, StyleSheet, type PressableProps } from "react-native";
import { Text } from "./Text";
import { useAppTheme } from "./theme";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "default" | "lg";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: string;
}

const SIZE_STYLE: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 12 },
  default: { height: 44, paddingHorizontal: 16, fontSize: 14 },
  lg: { height: 48, paddingHorizontal: 24, fontSize: 16 },
};

// Matches packages/ui's buttonVariants: default = bg-brand-600 + shadow-accent,
// secondary = bg-brand-100/text-brand-800, outline = border + bg-surface,
// ghost = transparent + hover:bg-muted (native has no hover, so ghost is
// just transparent + pressed-state opacity), destructive = red.
export function Button({ variant = "default", size = "default", loading, disabled, children, style, ...props }: ButtonProps) {
  const { colors, radius } = useAppTheme();
  const sizeStyle = SIZE_STYLE[size];
  const isDisabled = disabled || loading;

  const variantStyle = {
    default: { backgroundColor: colors.brand[600] },
    secondary: { backgroundColor: colors.brand[100] },
    outline: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    ghost: { backgroundColor: "transparent" },
    destructive: { backgroundColor: "#dc2626" },
  }[variant];

  const textColor = {
    default: "#ffffff",
    secondary: colors.brand[800],
    outline: colors.foreground,
    ghost: colors.foreground,
    destructive: "#ffffff",
  }[variant];

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { height: sizeStyle.height, paddingHorizontal: sizeStyle.paddingHorizontal, borderRadius: radius.lg },
        variantStyle,
        variant === "default" && { ...styles.accentShadow, shadowColor: colors.brand[600] },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text variant="smallMedium" style={{ color: textColor, fontSize: sizeStyle.fontSize }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  accentShadow: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
