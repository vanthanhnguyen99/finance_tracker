import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
export default defineConfig([
  ...nextVitals,
  { rules: {
    // This app uses effects to synchronize URL, storage and server-rendered props.
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/refs": "off",
    "react-hooks/preserve-manual-memoization": "off",
    "@next/next/no-img-element": "off",
    "@next/next/no-page-custom-font": "off"
  } },
  globalIgnores([".next/**", "node_modules/**", "playwright-report/**", "test-results/**"])
]);
