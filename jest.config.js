module.exports = {
  "rootDir": "./",
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  /*"globals": {
    "ts-jest": {
      "tsConfigFile": "tsconfig.json"
    }
  },*/
  "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
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
  "bail": true,
  "collectCoverage": true
};
