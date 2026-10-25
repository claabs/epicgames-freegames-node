import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import pluginPromise from 'eslint-plugin-promise';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

const jsConfig = defineConfig([
  // ESLint Recommended Rules
  {
    name: 'js/config',
    ...js.configs.recommended,
  },
  // Stylistic Plugin
  plugins.stylistic,
  // Import X Plugin
  plugins.importX,
  // Airbnb Base Recommended Config
  ...configs.base.recommended,
  // Strict Import Config
  rules.base.importsStrict,

  pluginPromise.configs['flat/recommended'],
  {
    name: 'promise/flat/all',
    rules: {
      'promise/prefer-await-to-callbacks': 'error',
      'promise/prefer-await-to-then': 'error',
      'promise/prefer-catch': 'error',
    },
  },
]);

const nodeConfig = [
  // Node Plugin
  plugins.node,
  // Airbnb Node Recommended Config
  ...configs.node.recommended,
];

const typescriptConfig = [
  // TypeScript ESLint Plugin
  plugins.typescriptEslint,
  // Airbnb Base TypeScript Config
  ...configs.base.typescript,
  rules.typescript.typescriptEslintStrict,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    name: 'typescript/disable',
    files: ['**/*.*js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
];

export default defineConfig([
  globalIgnores(['**/dist', '**/node_modules', '!**/.*.*js', 'docs/**/*', 'config/**/*']),
  // Javascript Config
  ...jsConfig,
  // Node Config
  ...nodeConfig,
  // TypeScript Config
  ...typescriptConfig,
  // Unicorn
  eslintPluginUnicorn.configs.recommended,

  {
    name: 'project/overrides',
    rules: {
      'import-x/prefer-default-export': 0, // default export is dumb
      'import-x/extensions': ['error', 'ignorePackages', { ts: 'always' }], // Node native TS support
      'import-x/no-useless-path-segments': ['error', { noUselessIndex: false }], // Allow indexes
      'unicorn/prefer-ternary': ['error', 'only-single-line'], // Hard to read
      'unicorn/prefer-switch': 'off', // Too wordy
      'unicorn/prevent-abbreviations': 'off', // Unrealistic
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'], // Remove Airbnb's ban on for..of
    },
  },
  // Prettier Config
  prettierPlugin,
]);
