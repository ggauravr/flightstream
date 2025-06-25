/**
 * Jest configuration for FlightStream monorepo
 * 
 * This configuration supports ES modules with coverage collection.
 * Coverage is collected for all packages in the monorepo.
 */
export default {
  // Define projects inline to properly collect coverage for ES modules
  projects: [
    {
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/tests/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/packages/core/tests/setup.js'],
      transform: {}, // No transform needed for ES modules with NODE_OPTIONS
      collectCoverageFrom: ['<rootDir>/packages/core/src/**/*.js']
    },
    {
      displayName: 'utils',
      testMatch: ['<rootDir>/packages/utils/tests/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/packages/utils/tests/setup.js'],
      transform: {},
      collectCoverageFrom: ['<rootDir>/packages/utils/src/**/*.js']
    },
    {
      displayName: 'csv-service',
      testMatch: ['<rootDir>/packages/csv-service/tests/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/packages/csv-service/tests/setup.js'],
      transform: {},
      collectCoverageFrom: ['<rootDir>/packages/csv-service/src/**/*.js']
    }
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.js',
    '!packages/examples/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  // Coverage thresholds - baseline set to current levels (as of 2024)
  // TODO: Gradually increase these thresholds as test coverage improves
  coverageThreshold: {
    global: {
      branches: 65,     // Current: 69.04% - room for improvement
      functions: 60,    // Current: 64.94% - room for improvement  
      lines: 60,        // Current: 61.36% - room for improvement
      statements: 60    // Current: 61.28% - room for improvement
    }
  }
}; 