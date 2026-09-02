import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_HEIGHT = 64;

/** How much bottom padding a scrollable screen needs so its last item clears the flush BottomNav. */
export function useBottomNavInset(): number {
  const insets = useSafeAreaInsets();
  return NAV_HEIGHT + insets.bottom;
}
