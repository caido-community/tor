import { defaultConfig } from "@caido/eslint-config";

/** @type {import('eslint').Linter.Config } */
export default [
  ...defaultConfig(),
  {
    files: ["packages/backend/**/*.ts"],
    rules: {
      "compat/compat": "off",
    },
  },
]
