import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from "react-native";
import { useAppTheme } from "./theme";

export type TextVariant = "title" | "subtitle" | "body" | "bodyMedium" | "small" | "smallMedium" | "caption" | "link";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: "foreground" | "muted" | "brand" | "inverse";
}

// Matches packages/ui's actual rendered scale: text-2xl font-bold page
// headings, text-lg font-semibold card titles, text-sm/text-base body,
// text-xs badges/captions.
export function Text({ variant = "body", color = "foreground", style, ...props }: TextProps) {
  const theme = useAppTheme();

  const colorValue =
    color === "muted"
      ? theme.colors.mutedForeground
      : color === "brand"
        ? theme.colors.brand[600]
        : color === "inverse"
          ? "#ffffff"
          : theme.colors.foreground;

  return <RNText style={[styles[variant], { color: colorValue, fontFamily: fontFor(variant, theme.font) }, style]} {...props} />;
}

function fontFor(variant: TextVariant, font: { regular: string; medium: string; semibold: string; bold: string }) {
  switch (variant) {
    case "title":
      return font.bold;
    case "subtitle":
      return font.semibold;
    case "bodyMedium":
    case "smallMedium":
    case "link":
      return font.medium;
    default:
      return font.regular;
  }
}

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 32 },
  subtitle: { fontSize: 18, lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  smallMedium: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  link: { fontSize: 14, lineHeight: 20 },
});
