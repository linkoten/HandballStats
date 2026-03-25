module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testMatch: ["**/__tests__/**/*.test.(ts|js)"],
  moduleNameMapper: {
    "^@/lib/stripe$": "<rootDir>/__tests__/__mocks__/stripe.js",
    "^@/(.*)$": "<rootDir>/$1",
    "server-only": "<rootDir>/__tests__/__mocks__/server-only.js",
    "@clerk/nextjs/server": "<rootDir>/__tests__/__mocks__/clerk-server.js",
    "@clerk/nextjs": "<rootDir>/__tests__/__mocks__/clerk-server.js",
    "^lib/stripe$": "<rootDir>/__tests__/__mocks__/stripe.js",
  },
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
};
