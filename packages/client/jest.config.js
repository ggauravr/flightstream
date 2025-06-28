export default {
  displayName: '@flightstream/client',
  testEnvironment: 'jsdom',
  
  // ES Modules configuration
  preset: 'ts-jest/presets/default-esm',
  
  // Transform configuration
  transform: {
    '^.+\\.js$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        allowJs: true,
        module: 'ESNext',
        moduleResolution: 'node',
        target: 'ES2020',
        esModuleInterop: true
      }
    }]
  },
  
  // Module name mapping for dependencies
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Disable for now to focus on getting tests to run
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
}; 