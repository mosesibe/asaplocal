import { KeyboardAvoidingView, Platform, View, type ViewProps } from "react-native";
import { useAppTheme } from "./theme";

export interface ScreenProps extends ViewProps {
  /** For a screen with its own fixed header content above the scrollable
   * area (e.g. a meta card above a chat's message list) that the default
   * KeyboardAvoidingView offset doesn't already account for. Most screens
   * don't need this — the app's persistent top bar lives outside <Screen>
   * (rendered once in the root layout), so it's already excluded from what
   * this view's own bounds cover. */
  keyboardVerticalOffset?: number;
  /** Escape hatch for a screen that wants to manage its own keyboard
   * behavior (or genuinely has no text input to worry about). */
  disableKeyboardAvoiding?: boolean;
}

// Root container matching packages/ui's `body { @apply bg-background }` —
// and, as of this pass, keyboard-safe by default. Most screens across both
// apps rendered a form (TextField + a submit Button) inside a plain
// ScrollView with no KeyboardAvoidingView at all, so focusing a field could
// leave it — and the submit button below it — hidden behind the keyboard
// with no way to scroll it into view. Centralizing this here fixes every
// screen that already wraps itself in <Screen> (nearly all of them) at
// once, rather than requiring each one to remember to add it individually,
// which is exactly what didn't happen consistently before.
export function Screen({ style, children, keyboardVerticalOffset = 0, disableKeyboardAvoiding, ...props }: ScreenProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]} {...props}>
      {disableKeyboardAvoiding ? (
        children
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {children}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
