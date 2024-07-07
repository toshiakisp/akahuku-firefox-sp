// eslint.config.js

import js from "@eslint/js";
import globals from "globals";
import mozilla from "eslint-plugin-mozilla";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      }
    },
    plugins: {
      mozilla: mozilla
    },
    rules: {
      "no-console": "off",
      "no-constant-condition" : "off",
      "no-control-regex": "off",
      "no-empty": ["error", {"allowEmptyCatch": true}],
      "no-extra-semi": "off",
      "no-unexpected-multiline": "off",

      "no-fallthrough": "off",
      "no-redeclare": "off",
      "no-self-assign": "off",
      "no-useless-escape": "off",

      "no-unused-vars": "off",

      "no-mixed-spaces-and-tabs": "off",

      "no-extra-boolean-cast": "off",
      "no-misleading-character-class": "off",

      "no-undef": "error",
      "sort-imports": ["warn", {
        "allowSeparatedGroups": true,
      }],
      "strict": ["error"],
      "no-caller": "error",
    }
  },
  {
    files: ["akahuku/background/**/*.js"],
    rules: {
      "strict": "off",
    },
    languageOptions: {
      globals: {
          AkahukuCentral: "readonly",
          ObserverService: "readonly",
          HistoryService: "readonly",
          Prefs: "readonly",
          Tabs: "readonly",
          arAkahukuURLUtil: "readonly",
          AkahukuContentLoader: "readonly",

          arAkahukuBrowserAction: "readonly",
          arAkahukuImage: "readonly",
          arAkahukuJPEG: "readonly",
          arAkahukuLink: "readonly",
          arAkahukuP2P: "readonly",
          arAkahukuQuote: "readonly"
      }
    }
  },
  {
    files: ["akahuku/background/styles/**/*.js"],
    languageOptions: {
      globals: {
        Prefs: "readonly",
        AkahukuCSSInjector: "readonly",
        arAkahukuStyle: "readonly"
      }
    }
  },
  {
    files: ["akahuku/background/options/**/*.js"],
    languageOptions: {
      globals: {
      }
    }
  },
  {
    files: ["akahuku/content/**/*.js"],
    languageOptions: {
      globals: {
        content: "readonly",
      }
    }
  },
  {
    files: ["akahuku/common/**/*.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly"
      }
    }
  }
];

