"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "./theme-provider";
import { Button, type ButtonProps } from "./button";

const ICONS: Record<ThemePreference, typeof Monitor> = { system: Monitor, light: Sun, dark: Moon };
const LABELS: Record<ThemePreference, string> = { system: "System", light: "Light", dark: "Dark" };
const NEXT: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };

/** Cycles System -> Light -> Dark. System leads: it is the option most people want. */
export function ThemeToggle({ className, size = "icon", variant = "ghost", ...props }: Omit<ButtonProps, "onClick" | "aria-label">) {
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];
  const next = NEXT[preference];

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      // The icon shows the CURRENT preference, so the label has to carry both it
      // and the action — with three states, neither can be inferred from the other.
      aria-label={`Theme: ${LABELS[preference]}. Switch to ${LABELS[next].toLowerCase()}.`}
      title={`Theme: ${LABELS[preference]}`}
      onClick={() => setPreference(next)}
      {...props}
    >
      <Icon size={18} />
    </Button>
  );
}
