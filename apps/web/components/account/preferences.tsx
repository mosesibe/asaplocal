"use client";

import { useEffect, useState } from "react";
import { Globe, Monitor } from "lucide-react";
import { Select, useTheme, type ThemePreference } from "@asaplocal/ui";
import { SectionRow } from "./section-row";

const LANGUAGES = [
  { code: "en-GB", label: "English (UK)" },
  { code: "en-US", label: "English (US)" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

// System first: it is the option most people want, and the one that keeps
// working when they change their phone's setting later.
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function PreferencesRows() {
  const { preference, setPreference } = useTheme();
  const [language, setLanguage] = useState("en-GB");

  useEffect(() => {
    setLanguage(localStorage.getItem("locale") ?? "en-GB");
  }, []);

  function onLanguageChange(code: string) {
    setLanguage(code);
    localStorage.setItem("locale", code);
  }

  return (
    <>
      <SectionRow
        icon={Globe}
        label="Language"
        right={
          <Select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="h-9 w-40 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </Select>
        }
      />
      <SectionRow
        icon={Monitor}
        label="Theme"
        right={
          <Select
            value={preference}
            onChange={(e) => setPreference(e.target.value as ThemePreference)}
            className="h-9 w-40 text-sm"
            onClick={(e) => e.stopPropagation()}
            aria-label="Theme"
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        }
      />
    </>
  );
}
