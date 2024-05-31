// eslint.config.js

import js from "@eslint/js";
import globals from "globals";
import mozilla from "eslint-plugin-mozilla";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2018,
      globals: {
        ...globals.browser,
        ...globals.es6,
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
    }
  },
  {
    files: ["akahuku/background/**/*.js"],
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
        arAkahukuBrowserAction: "readonly",
        arAkahukuImage: "readonly",
        arAkahukuJPEG: "readonly",
        arAkahukuLink: "readonly",
        arAkahukuP2P: "readonly",
        arAkahukuQuote: "readonly",
        AkahukuCentral: "readonly",
        ObserverService: "readonly",
        HistoryService: "readonly",
        Prefs: "readonly",
        pref: "readonly",
        prefEndDeclare: "readonly",
        Tabs: "readonly"
      }
    }
  },
  {
    files: ["akahuku/content/**/*.js"],
    languageOptions: {
      globals: {
        Akahuku: "readonly",

        arAkahukuBoard: "readonly",
        arAkahukuCatalog: "readonly",
        arAkahukuMergeItemCallbackList: "readonly",
        arAkahukuClipboard: "readonly",
        arAkahukuCompat: "readonly",
        arAkahukuConfig: "readonly",
        arAkahukuConverter: "readonly",
        arAkahukuDOM: "readonly",
        arAkahukuDelBanner: "readonly",
        arAkahukuDocumentParam: "readonly",
        arAkahukuFile: "readonly",
        arAkahukuFileName: "readonly",
        arAkahukuImage: "readonly",
        arAkahukuImageURL: "readonly",
        arAkahukuJPEG: "readonly",
        arAkahukuLink: "readonly",
        arAkahukuLocationInfo: "readonly",
        arAkahukuMHT: "readonly",
        arAkahukuP2P: "readonly",
        arAkahukuPopup: "readonly",
        arAkahukuPopupParam: "readonly",
        arAkahukuPopupQuote: "readonly",
        arAkahukuPostForm: "readonly",
        arAkahukuQuote: "readonly",
        arAkahukuReload: "readonly",
        arAkahukuServerData: "readonly",
        arAkahukuScroll: "readonly",
        arAkahukuSidebar: "readonly",
        arAkahukuSound: "readonly",
        arAkahukuStyle: "readonly",
        arAkahukuTab: "readonly",
        arAkahukuThread: "readonly",
        arAkahukuThreadOperator: "readonly",
        arAkahukuTitle: "readonly",
        arAkahukuUI: "readonly",
        arAkahukuUtil: "readonly",
        arAkahukuWheel: "readonly",
        arAkahukuWindow: "readonly",
        arAkahukuURLUtil: "readonly",

        PolyFillTextEncoder: "readonly",

        AkahukuFileUtil: "readonly",
        AkahukuConsole: "readonly",
        AkahukuCentral: "readonly",
        AkahukuVersion: "writable",
        ObserverService: "readonly",
        HistoryService: "readonly",
        PortObserverHandler: "readonly",
        Prefs: "readonly",
        Tabs: "readonly",
        Downloads: "readonly",
        Loader: "readonly"
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

