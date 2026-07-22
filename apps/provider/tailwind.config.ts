import type { Config } from "tailwindcss";
import preset from "@asaplocal/ui/tailwind.preset.js";

const config: Config = {
  presets: [preset as Partial<Config>],
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  plugins: [],
};
export default config;
