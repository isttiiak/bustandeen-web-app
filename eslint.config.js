import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vercel/**',
      'frontend/dev-dist/**',
    ],
  },

  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  prettierConfig,

  {
    plugins: {
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Explicit escape hatch: `any` is an error, but can be disabled inline —
      // as long as the disable comment explains why (enforced below).
      '@typescript-eslint/no-explicit-any': 'error',
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      // Destructuring-to-omit (`const { a, b, ...rest } = x`) is the standard
      // way to strip fields before a response/write — the omitted names are
      // intentionally unused.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // `condition && doSomething()` is used throughout as a shorthand guard —
      // allow the short-circuit idiom instead of flagging every call site.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },

  // Backend (+ the Vercel function entry at /api) — Node, ESM
  {
    files: ['backend/src/**/*.ts', 'api/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
    },
  },

  // Backend e2e tests — plain Node ESM JS, run under Jest
  {
    files: ['backend/tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.jest, jasmine: 'readonly' },
    },
  },

  // Node-context config files that live under frontend/ or the repo root
  {
    files: [
      'frontend/vite.config.ts',
      'frontend/vite.ssr.config.ts',
      'frontend/tailwind.config.js',
      'frontend/postcss.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // Build-time Node scripts (city dataset, OG image, SSG prerender) — not
  // shipped to the browser.
  {
    files: ['frontend/scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // Frontend — React + TS, browser
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks.configs.flat['recommended-latest'].plugins['react-hooks'],
    },
    rules: {
      // Only the two long-standing, always-a-real-bug rules. react-hooks@7
      // bundles a much larger "recommended-latest" set aimed at React
      // Compiler readiness (set-state-in-effect, purity, immutability, …)
      // that flags plenty of idiomatic, working code across this app —
      // adopting those wholesale would mean refactoring, not linting.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
