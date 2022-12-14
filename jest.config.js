/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    crypto: {
      randomUUID: () => require('crypto').randomUUID(),
    },
  },
};
