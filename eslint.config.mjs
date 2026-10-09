import js from '@eslint/js'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default [
  {
    ignores: ['dist/', 'node_modules/'],
  },
  js.configs.recommended,
  { languageOptions: { globals: globals.node } },
  eslintConfigPrettier,
]
