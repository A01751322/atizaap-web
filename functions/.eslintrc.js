module.exports = {
  env: {
    es2021: true, // <-- soporte sintaxis moderna (incluye optional chaining)
    node: true,
    browser: true, // <-- opcional: si linter también revisa archivos front-end
  },
  parserOptions: {
    ecmaVersion: 2021, // <- cambia 2018 -> 2021 (o "latest")
    sourceType: "script", // o "module" si usas import/export
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
