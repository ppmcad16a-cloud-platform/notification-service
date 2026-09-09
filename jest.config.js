// Jest config for the notification_server test suite. Tests live next to
// the source files they cover (*.test.js); shared test infrastructure
// (in-memory Mongo bootstrap, a supertest app factory, model registration)
// lives in tests/. Mirrors catalog_server/jest.config.js.
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!jest.config.js',
    '!**/*.test.js'
  ],
  // No JaCoCo-style COMPLEXITY counter exists for Istanbul/nyc — see
  // package.json's analyze:complexity script for an informational-only
  // complexity report instead.
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    }
  }
};
