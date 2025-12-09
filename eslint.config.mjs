import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // AI-vibe coding: catch the mistakes AI makes
    rules: {
      // Dead code detection - AI loves to leave unused vars
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],

      // React hooks - catch stale closures AI creates
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",

      // Prevent common AI mistakes
      "no-console": "warn",  // AI loves console.log
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-template-curly-in-string": "warn",  // AI confuses template syntax

      // Type safety - AI sometimes bypasses types
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Prevent unreachable/dead code
      "no-unreachable": "error",
      "no-constant-condition": "warn",

      // Catch async mistakes AI makes
      "no-async-promise-executor": "error",
      "require-await": "warn",

      // Prevent accidental globals
      "no-undef": "error",
      "no-shadow": "off",  // TS version handles this better
      "@typescript-eslint/no-shadow": "warn",

      // AI often forgets return types on complex functions
      "@typescript-eslint/explicit-function-return-type": "off",  // Too noisy for game code

      // Catch switch statement fallthrough (AI forgets break)
      "no-fallthrough": "error",

      // Catch duplicate object keys (AI copy-paste errors)
      "no-dupe-keys": "error",

      // Catch comparison to self (AI logic errors)
      "no-self-compare": "error",

      // Catch assignments in conditions (AI confuses = and ==)
      "no-cond-assign": "error",

      // Catch empty blocks (AI leaves stubs)
      "no-empty": "warn",

      // Catch loss of precision in numbers (game math)
      "no-loss-of-precision": "error",
    },
  },
]);

export default eslintConfig;
