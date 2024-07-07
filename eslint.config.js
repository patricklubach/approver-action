import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/.devcontainer/*',
      '**/.github/*',
      '**/badges/*',
      '**/dist/*',
      '**/node_modules/*'
    ]
  }
]
