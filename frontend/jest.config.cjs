module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.[tj]s?(x)'],
  transform: { '^.+\\.[tj]sx?$': 'babel-jest' },
  moduleNameMapper: { '\\.(css)$': '<rootDir>/test/styleMock.cjs' },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageReporters: ['text', 'json', 'json-summary', 'html', 'lcov', 'cobertura'],
  coverageThreshold: { global: { branches: 75, functions: 75, lines: 75, statements: 75 } },
};
