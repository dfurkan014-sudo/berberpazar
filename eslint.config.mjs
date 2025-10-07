// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Next.js önerileri
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ignore
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "public/**",
      "tsconfig.tsbuildinfo",
      "next-env.d.ts",
    ],
  },

  // Typed linting (tsconfig ile)
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // projeyi kilitlemesin diye yumuşat
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "warn",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      // <img> kullanımına izin ver (şimdilik)
      "@next/next/no-img-element": "off",
      // hook bağımlılıkları için uyarı bile istemiyorsan:
      "react-hooks/exhaustive-deps": "off",
    },
  },

  // API route’lar: daha da gevşek
  {
    files: ["src/app/api/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
];
// Bu dosya hakkında detaylı bilgi için:
// https://eslint.org/docs/latest/use/configure/configuration-files
// Next.js ESLint config:
// https://nextjs.org/docs/basic-features/eslint
// @eslint/eslintrc (FlatCompat):
// https://www.npmjs.com/package/@eslint/eslintrc
// ESLint + TypeScript önerileri:
//  