import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "./theme";

const NAV_HEIGHT = 64;
const PILL_MARGIN = 16; // matches BottomNav's pill offset from the bottom edge and web's bottom-4

/** How much bottom padding a scrollable screen needs so its last item clears BottomNav — flush on provider, a floating pill (with a gap beneath it) on customer, matching each app's actual web nav. */
export function useBottomNavInset(): number {
  const { app } = useAppTheme();
  const insets = useSafeAreaInsets();
  return app === "customer" ? NAV_HEIGHT + PILL_MARGIN * 2 + insets.bottom : NAV_HEIGHT + insets.bottom;
}
