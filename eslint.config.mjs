import eslint from '@eslint/js'
import next from '@next/eslint-plugin-next'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['.next/**', 'dist/**', 'out/**', 'node_modules/**', 'payload-types.ts', 'tests/**']),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  next.flatConfig.coreWebVitals,
])
