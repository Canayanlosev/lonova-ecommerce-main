import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Our data-fetching pattern (setLoading → async → setState) is intentional
      // and correct for this app's architecture. React 19's strict concurrent-mode
      // warning is overly conservative for these server-side dashboard patterns.
      "react-hooks/set-state-in-effect": "warn",

      // Turkish text naturally contains apostrophes (CanayanWeb'e, hesabınız'ı etc.)
      // Escaping every one would hurt readability with no functional benefit.
      "react/no-unescaped-entities": "warn",

      // next/image reminders are useful but not blocking
      "@next/next/no-img-element": "warn",

      // Allow explicit `any` where necessary (3rd-party API responses, catch clauses)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
