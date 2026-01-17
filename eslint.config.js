// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],

      // ---- reduce noise (style-only) ----
      "@typescript-eslint/consistent-type-definitions": "off", // don't force interface over type
      "@typescript-eslint/array-type": "off", // allow Array<T>
      "@typescript-eslint/class-literal-property-style": "off", // don't force readonly field style

      // ---- keep useful ----
      "@typescript-eslint/no-explicit-any": "warn", // let you keep moving; fix later if desired
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      // ---- reduce noise (style-only) ----
      "@angular-eslint/template/prefer-control-flow": "off", // keep *ngIf/*ngFor for speed

      // keep accessibility ON (don’t disable these)
      // "@angular-eslint/template/click-events-have-key-events": "error",
      // "@angular-eslint/template/interactive-supports-focus": "error",
      // "@angular-eslint/template/label-has-associated-control": "error",
    },
  },
]);
