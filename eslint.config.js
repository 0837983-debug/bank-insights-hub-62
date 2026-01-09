import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.config.js", "*.config.ts", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react": react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "security": security,
      "sonarjs": sonarjs,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-console": "off", // Allow console for development
      "no-debugger": "error",
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      // Security rules
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "off",
      // Code quality rules
      "sonarjs/cognitive-complexity": "off", // Too strict for now
      "sonarjs/no-duplicate-string": "off",
    },
  },
);
