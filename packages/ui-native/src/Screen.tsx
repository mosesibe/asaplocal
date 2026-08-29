import { View, type ViewProps } from "react-native";
import { useAppTheme } from "./theme";

/** Root container matching packages/ui's `body { @apply bg-background }`. */
export function Screen({ style, ...props }: ViewProps) {
  const { colors } = useAppTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]} {...props} />;
}
