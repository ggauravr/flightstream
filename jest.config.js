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
  preset: 'ts-jest/presets/default-esm',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.js$': ['ts-jest', {
      useESM: true
    }]
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
}; 