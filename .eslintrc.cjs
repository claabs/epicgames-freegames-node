module.exports = {
  root: true,
  env: {
    node: true,
    es2023: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  rules: {
    'import/prefer-default-export': 0,
  },
  ignorePatterns: ['dist', 'node_modules', '!.*.cjs', 'docs/**'],
};
