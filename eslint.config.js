import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // `const { animal_name: _, ...rest } = row` is how the importer drops a
      // column before insert; the omitted sibling is the point, not a mistake.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // These files each pair a provider component with its own consumer hook.
    // Fast refresh wants them split, but the hooks are imported in 32 files,
    // so the split is its own change rather than a lint cleanup. The rule
    // governs HMR granularity only — nothing that ships to users.
    files: [
      'src/context/AuthContext.tsx',
      'src/context/HouseholdContext.tsx',
      'src/components/ui/Toast.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
