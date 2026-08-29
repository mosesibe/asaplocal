import { TextInput, StyleSheet, type TextInputProps } from "react-native";
import { useAppTheme } from "./theme";

// Matches packages/ui's <Input>: h-11 rounded-xl border bg-surface px-3.5 text-base.
export function TextField({ style, multiline, ...props }: TextInputProps) {
  const { colors, radius, font } = useAppTheme();
  return (
    <TextInput
      style={[
        styles.base,
        {
          minHeight: multiline ? 96 : 44,
          borderRadius: radius.lg,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.foreground,
          fontFamily: font.regular,
          textAlignVertical: multiline ? "top" : "center",
        },
        style,
      ]}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
});
