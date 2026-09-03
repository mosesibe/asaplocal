import { Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "./Text";
import { useAppTheme } from "./theme";

// The two apps' web navs genuinely differ, not just cosmetically:
// apps/web/components/web-bottom-nav.tsx overrides the shared
// packages/ui/src/bottom-nav.tsx base (a flush `fixed inset-x-0 bottom-0`
// bar) into a rounded pill inset from the edges — apps/provider's own
// ProviderBottomNav applies no such override, so it keeps the flush base.
// An earlier pass here missed that WebBottomNav override and shipped
// provider's flush look on both apps. Theme already knows which app is
// rendering (UiNativeThemeProvider app="customer"|"provider"), so this
// branches on that directly — no variant prop for every call site to
// remember to pass.
export function BottomNav({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { app, colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (app === "customer") {
    return (
      <View
        style={StyleSheet.flatten([
          styles.pillNav,
          {
            left: 16,
            right: 16,
            bottom: 16 + insets.bottom,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          style,
        ])}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={StyleSheet.flatten([
        styles.flushNav,
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
  flushNav: {
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
  pillNav: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-around",
    height: 64,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
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
