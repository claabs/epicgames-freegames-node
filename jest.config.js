module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "**/test/**/*.test.ts"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/"
  ]
};