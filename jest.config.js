module.exports = {
  "transform": {
    ".(ts|tsx)": "./node_modules/ts-jest/preprocessor.js"
  },
  /*"globals": {
    "ts-jest": {
      "tsConfigFile": "tsconfig.json"
    }
  },*/
  "testRegex": "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  "testPathIgnorePatterns": ["/lib/", "/node_modules/"],
  "moduleFileExtensions": ["ts", "tsx", "js", "jsx", "json", "node"],
  "coverageThreshold": {
    "global": {
      "branches": 50,
      "functions": 90,
      "lines": 80,
      "statements": 80
    }
  },
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/test/"
  ],
  "testPathIgnorePatterns": [
    "/node_modules/"
  ],
  "bail": true,
  "collectCoverage": true
};
