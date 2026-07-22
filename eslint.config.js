import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from '@eslint-react/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      '@eslint-react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'no-await-in-loop': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'public/**', 'src/data-provider/migrations/**'],
  },
];
