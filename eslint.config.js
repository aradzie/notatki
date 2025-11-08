import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import ts from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,ts,tsx}"],
  },
  {
    ignores: ["**/.venv/", "**/dist/", "**/assets/", "**/parser$.*", "**/tmp/"],
  },
  js.configs["recommended"],
  ...ts.configs["recommended"],
  {
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // configure simple-import-sort
      "simple-import-sort/imports": ["error", { groups: [["^\\u0000", "^node:", "^@?\\w", "^", "^\\."]] }],
      "simple-import-sort/exports": ["error"],
      // configure eslint
      "eqeqeq": ["error", "always", { null: "never" }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-implicit-coercion": "error",
      // configure @typescript-eslint
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-inferrable-types": ["error", { ignoreParameters: true, ignoreProperties: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
