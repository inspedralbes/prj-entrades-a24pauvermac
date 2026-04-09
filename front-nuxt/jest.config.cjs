/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'vue'],
  
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: false,
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        types: ['jest', 'node'],
        baseUrl: '.',
        paths: {
          '~/*': ['app/*'],
          '@/*': ['app/*']
        }
      }
    }],
  },
  
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/app/$1',
    '^(@/stores/.*)$': '<rootDir>/app/stores/$1',
    '^.+\\.ts$': 'ts-jest'
  },
  
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  roots: ['<rootDir>/app']
}