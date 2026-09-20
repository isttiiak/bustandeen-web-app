export default {
  testEnvironment: 'node',
  // Tests are plain ESM .js files but import TypeScript sources with .js
  // specifiers (NodeNext style). Map the .js suffix back to the extensionless
  // path so jest resolves the .ts file, and compile it with ts-jest in ESM mode.
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  roots: ['<rootDir>/tests'],
  verbose: true,
  // Increase default timeout to accommodate mongodb-memory-server binary download/startup
  testTimeout: 120000,
  // Global setup after env is ready
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
};
