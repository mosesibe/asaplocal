"use client";

import { useEffect, useState } from "react";
import { Globe, Moon } from "lucide-react";
import { Select, useTheme } from "@asaplocal/ui";
import { SectionRow, Switch } from "./section-row";

const LANGUAGES = [
  { code: "en-GB", label: "English (UK)" },
  { code: "en-US", label: "English (US)" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

export function PreferencesRows() {
  const { theme, toggleTheme } = useTheme();
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
        icon={Moon}
        label="Dark mode"
        right={<Switch checked={theme === "dark"} onChange={toggleTheme} label="Toggle dark mode" />}
      />
    </>
  );
}
