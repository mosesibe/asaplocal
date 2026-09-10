import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "./theme";
import { WAVE_BAR_HEIGHT, WAVE_BUMP_HEIGHT } from "./BottomNavWave";

const NAV_HEIGHT = 64;

/** How much bottom padding a scrollable screen needs so its last item clears BottomNav — the customer app's wave nav is docked flush full-width (its bump extends above the 64px row too, so both count), provider's is flush with no bump. */
export function useBottomNavInset(): number {
  const { app } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (app === "customer" ? WAVE_BAR_HEIGHT + WAVE_BUMP_HEIGHT : NAV_HEIGHT) + insets.bottom;
}
