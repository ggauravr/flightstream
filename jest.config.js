export default {
  projects: [
    '<rootDir>/packages/utils/jest.config.js',
    '<rootDir>/packages/core/jest.config.js', 
    '<rootDir>/packages/csv-service/jest.config.js'
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.js',
    '!packages/examples/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
}; 