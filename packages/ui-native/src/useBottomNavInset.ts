import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_HEIGHT = 64;
const NAV_MARGIN = 16; // matches BottomNav's own bottom offset and the web's bottom-4

/** How much bottom padding a scrollable screen needs so its last item clears the floating BottomNav. */
export function useBottomNavInset(): number {
  const insets = useSafeAreaInsets();
  return NAV_HEIGHT + NAV_MARGIN * 2 + insets.bottom;
}
