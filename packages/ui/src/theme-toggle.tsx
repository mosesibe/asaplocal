"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button, type ButtonProps } from "./button";

export function ThemeToggle({ className, size = "icon", variant = "ghost", ...props }: Omit<ButtonProps, "onClick" | "aria-label">) {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      {...props}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
