
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var EXPORTED_SYMBOLS = [
  "arAkahukuBoard",
];

var loader
  = Cc ["@mozilla.org/moz/jssubscript-loader;1"]
  .getService (Ci.mozIJSSubScriptLoader);

Cu.import("resource://akahuku/json.jsm");
loader.loadSubScript
  ("chrome://akahuku/content/mod/arAkahukuConfig.js");
// 最低限の初期化
arAkahukuConfig.loadPrefBranch ();

loader.loadSubScript
  ("chrome://akahuku/content/mod/arAkahukuBoard.js");

