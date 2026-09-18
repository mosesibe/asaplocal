// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Plain apostrophes in <Text> render fine; this is style-only noise.
      "react/no-unescaped-entities": "off",
      // React Compiler advisory; existing effects work, refactor opportunistically.
      "react-hooks/set-state-in-effect": "warn",
      // Flags the documented useRef(new Animated.Value()).current pattern.
      "react-hooks/refs": "warn",
    },
  },
]);
