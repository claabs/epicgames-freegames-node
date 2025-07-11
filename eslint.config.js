import js from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import pluginPromise from 'eslint-plugin-promise';
import tseslint from 'typescript-eslint';

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
  ...tseslint.configs.stylisticTypeChecked,
  {
    name: 'typescript/disable',
    files: ['**/*.*js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
];

export default tseslint.config(
  globalIgnores(['**/dist', '**/node_modules', '!**/.*.*js', 'docs/**/*']),
  // Javascript Config
  ...jsConfig,
  // Node Config
  ...nodeConfig,
  // TypeScript Config
  ...typescriptConfig,
  // Prettier Config
  prettierPlugin,
  {
    rules: {
      'import-x/prefer-default-export': 0,
    },
  },
);
