import { Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "./Text";
import { useAppTheme } from "./theme";

// Matches packages/ui/src/bottom-nav.tsx's actual CSS: `fixed inset-x-0
// bottom-0 ... border-t ... pb-[env(safe-area-inset-bottom)]` — a flush,
// full-width sticky bar, not a rounded pill inset from the edges (an
// earlier version of this file described that pill as "matching web",
// which it never did). Self-positions and pads for the safe area itself,
// same as web bakes both into the one component, so callers just render
// <BottomNav> with no placement style of their own.
export function BottomNav({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={StyleSheet.flatten([
        styles.nav,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
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
// square icon button pulled up out of the bar (packages/ui/src/bottom-nav.tsx
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-around",
    height: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
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
