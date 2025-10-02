// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Next.js önerileri (Core Web Vitals + TypeScript)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Lint dışında tutulacaklar
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  // Proje özel kurallar (build'i kesen uyarıları yumuşatıyoruz)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { project: false } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",   // build’i kilitleyen kural
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": "warn",
    },
  },
];
// Daha fazla bilgi: https://eslint.org/docs/latest/use/configure/configuration-files#using-a-configuration-file