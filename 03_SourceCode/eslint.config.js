import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const domainImportMessage =
  'Domain must remain framework- and infrastructure-independent. Depend on Domain-owned types only.';

export default tseslint.config(
  {
    ignores: ['coverage', 'dist', 'node_modules', 'playwright-report', 'test-results'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: 'module',
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      'no-duplicate-imports': 'error',
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'document', message: domainImportMessage },
        { name: 'history', message: domainImportMessage },
        { name: 'indexedDB', message: domainImportMessage },
        { name: 'localStorage', message: domainImportMessage },
        { name: 'location', message: domainImportMessage },
        { name: 'navigator', message: domainImportMessage },
        { name: 'window', message: domainImportMessage },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-router',
                'react-router/*',
                'react-router-dom',
                'react-router-dom/*',
                'zustand',
                'zustand/*',
                'zod',
                'zod/*',
                'dexie',
                'dexie/*',
                'workbox-*',
                'workbox-*/*',
                '@/app/**',
                '@/components/**',
                '@/features/**',
                '@/infrastructure/**',
                '@/pages/**',
                '@/schemas/**',
                '**/app/**',
                '**/components/**',
                '**/features/**',
                '**/infrastructure/**',
                '**/pages/**',
                '**/schemas/**',
              ],
              message: domainImportMessage,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.ts', 'e2e/**/*.ts', 'eslint.config.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
