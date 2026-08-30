import { Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "./Text";
import { useAppTheme } from "./theme";

// Matches packages/ui's <BottomNav>/<BottomNavItem>: a floating rounded
// pill inset from the screen edges (web: rounded-[28px], inset-x-4,
// bottom-4, border, shadow-xl, translucent surface), not a flush bar.
// True backdrop-blur isn't attempted here (would need expo-blur cross-
// platform tuning) — a solid surface color at full opacity approximates it.
// `style` is for the consumer's own placement (bottom safe-area inset) —
// merged in, not replacing, the pill's own visual styles.
export function BottomNav({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, radius } = useAppTheme();
  return (
    <View
      style={StyleSheet.flatten([
        styles.nav,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl + 8,
        },
        style,
      ])}
    >
      {children}
    </View>
  );
}

export interface BottomNavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  emphasized?: boolean;
  onPress?: ((e: GestureResponderEvent) => void) | null;
}

// `emphasized` matches web's raised center "Post a job" nav item: a rounded-
// square icon button pulled up out of the pill (packages/ui/src/bottom-nav.tsx
// `-mt-9 h-16 w-16 rounded-[22px]`), label stays mutedForeground even though
// the icon pill itself is brand-colored.
export function BottomNavItem({ icon: Icon, label, active, emphasized, onPress }: BottomNavItemProps) {
  const { colors } = useAppTheme();

  if (emphasized) {
    return (
      <Pressable style={styles.item} onPress={onPress}>
        <View style={[styles.emphasizedPill, { backgroundColor: active ? colors.brand[700] : colors.brand[600] }]}>
          <Icon size={28} color="#ffffff" />
        </View>
        <Text variant="caption" style={{ color: colors.mutedForeground, marginTop: 2 }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const color = active ? colors.brand[600] : colors.mutedForeground;
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Icon size={22} color={color} strokeWidth={active ? 2.5 : 2} />
      <Text variant="caption" style={{ color, marginTop: 2 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-around",
    height: 64,
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  item: {
    flex: 1,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  emphasizedPill: {
    marginTop: -36,
    height: 64,
    width: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
});
