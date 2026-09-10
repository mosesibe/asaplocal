import { Pressable, View, StyleSheet, Platform, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "./Text";
import { useAppTheme } from "./theme";

/**
 * Customer app's bottom nav — native port of packages/ui/src/bottom-nav-notched.tsx
 * (same geometry constants, same wave-runs-under-the-button construction).
 * See that file for the full rationale; kept in sync by hand since RN has
 * no CSS to share with web.
 *
 * Provider's mobile nav (packages/ui-native/src/BottomNav.tsx) is untouched
 * and unrelated — this is a new, separate component only ever used by
 * apps/mobile-customer.
 */
export interface WaveNavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  emphasized?: boolean;
  onPress?: ((e: GestureResponderEvent) => void) | null;
}

const BAR_WIDTH = 390;
// Exported so useBottomNavInset.ts can size a screen's bottom padding to
// exactly clear this bar without duplicating these numbers and risking drift.
export const WAVE_BAR_HEIGHT = 64;
const TOP_RADIUS = 20;
export const WAVE_BUMP_HEIGHT = 34;
const BAR_HEIGHT = WAVE_BAR_HEIGHT;
const BUMP_HEIGHT = WAVE_BUMP_HEIGHT;
const BUMP_CENTER = BAR_WIDTH / 2;
const BUMP_HALF_WIDTH = 66;
const BUTTON_SIZE = 56;
const BUTTON_TOP = BUMP_HEIGHT - BUTTON_SIZE / 2 + 6;

const WAVE_PATH = `
  M ${TOP_RADIUS} 0
  L ${BUMP_CENTER - BUMP_HALF_WIDTH} 0
  C ${BUMP_CENTER - BUMP_HALF_WIDTH + 26} 0 ${BUMP_CENTER - 32} ${-BUMP_HEIGHT} ${BUMP_CENTER} ${-BUMP_HEIGHT}
  C ${BUMP_CENTER + 32} ${-BUMP_HEIGHT} ${BUMP_CENTER + BUMP_HALF_WIDTH - 26} 0 ${BUMP_CENTER + BUMP_HALF_WIDTH} 0
  L ${BAR_WIDTH - TOP_RADIUS} 0
  Q ${BAR_WIDTH} 0 ${BAR_WIDTH} ${TOP_RADIUS}
  L ${BAR_WIDTH} ${BAR_HEIGHT}
  L 0 ${BAR_HEIGHT}
  L 0 ${TOP_RADIUS}
  Q 0 0 ${TOP_RADIUS} 0
  Z
`;

export function BottomNavWave({ items }: { items: WaveNavItem[] }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const center = items.find((item) => item.emphasized);
  const centerIndex = items.findIndex((item) => item.emphasized);
  const CenterIcon = center?.icon;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={{ height: BAR_HEIGHT + BUMP_HEIGHT }}>
        {/* RN shadow props apply to this View's own (rectangular) box, not the
            SVG path's actual silhouette — an approximation every RN app with a
            non-rectangular shadow shape lives with, same as the drop-shadow
            filter on web only roughly tracing the curve. */}
        <View style={[styles.svgShadow, { top: 0 }]}>
          <Svg
            width="100%"
            height={BAR_HEIGHT + BUMP_HEIGHT}
            viewBox={`0 ${-BUMP_HEIGHT} ${BAR_WIDTH} ${BAR_HEIGHT + BUMP_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <Path d={WAVE_PATH} fill={colors.surface} />
          </Svg>
        </View>

        <View style={[styles.itemsRow, { top: BUMP_HEIGHT, height: BAR_HEIGHT }]}>
          {items.map((item, i) => (
            <WaveItem
              key={item.label}
              {...item}
              colors={colors}
              // Extra breathing room for the two items flanking the raised
              // center button, so it doesn't crowd them.
              pushRight={i === centerIndex - 1}
              pushLeft={i === centerIndex + 1}
            />
          ))}
        </View>

        {center && CenterIcon && (
          <Pressable
            onPress={center.onPress}
            accessibilityLabel={center.label}
            style={[
              styles.centerButton,
              { top: BUTTON_TOP, backgroundColor: center.active ? colors.brand[700] : colors.brand[600] },
            ]}
          >
            <CenterIcon size={24} color="#ffffff" />
          </Pressable>
        )}
      </View>
      {/* Flush filler absorbing the home-indicator safe area, so the bar's background reaches the true screen edge instead of stopping at the icon row. */}
      <View style={{ height: insets.bottom, backgroundColor: colors.surface }} />
    </View>
  );
}

function WaveItem({
  icon: Icon,
  label,
  active,
  emphasized,
  onPress,
  colors,
  pushRight,
  pushLeft,
}: WaveNavItem & { colors: ReturnType<typeof useAppTheme>["colors"]; pushRight?: boolean; pushLeft?: boolean }) {
  const pushStyle = pushRight ? { marginRight: 12 } : pushLeft ? { marginLeft: 12 } : undefined;

  if (emphasized) {
    // The visible button is rendered separately (see above) so it can sit
    // above the bar and overlap the wave's peak — this just reserves the
    // row's flex-1 width and shows the label, no icon (the real icon is on
    // the floating button). alignSelf: "flex-end" sizes this element's own
    // touch target to just the label text, pinned to the row's bottom edge
    // — the button deliberately overlaps *down* into the row (that's what
    // makes the wave read as running under it), so without this the
    // pressable would stretch to the row's full height and its upper
    // portion would sit *under* the button, intercepting taps meant for the
    // label (same issue confirmed on the web version via a real click
    // test — fixed there the same way).
    return (
      <Pressable onPress={onPress} style={[styles.item, styles.labelOnlyItem, pushStyle]}>
        <Text variant="caption" style={{ color: colors.mutedForeground }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const color = active ? colors.brand[600] : colors.mutedForeground;
  return (
    <Pressable onPress={onPress} style={[styles.item, pushStyle]}>
      <Icon size={22} color={color} strokeWidth={active ? 2.5 : 2} />
      <Text variant="caption" style={{ color, marginTop: 2 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  svgShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  itemsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  labelOnlyItem: {
    alignSelf: "flex-end",
    paddingBottom: 2,
  },
  centerButton: {
    position: "absolute",
    left: "50%",
    marginLeft: -BUTTON_SIZE / 2,
    height: BUTTON_SIZE,
    width: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
});
