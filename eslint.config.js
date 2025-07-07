import js from '@eslint/js';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import { globalIgnores } from 'eslint/config';
import pluginPromise from 'eslint-plugin-promise';

const jsConfig = [
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
  pluginPromise.configs['flat/recommended'],
  {
    name: 'promise/flat/all',
    rules: {
      'promise/prefer-await-to-callbacks': 'error',
      'promise/prefer-await-to-then': 'error',
      'promise/prefer-catch': 'error',
    },
  },
];

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
  {
    rules: {
      'import-x/prefer-default-export': 0,
    },
  },
];

export default [
  globalIgnores(['**/dist', '**/node_modules', '!**/.*.*js', 'docs/**/*']),
  // Javascript Config
  ...jsConfig,
  // Node Config
  ...nodeConfig,
  // TypeScript Config
  ...typescriptConfig,
  // Prettier Config
  prettierPlugin,
];
