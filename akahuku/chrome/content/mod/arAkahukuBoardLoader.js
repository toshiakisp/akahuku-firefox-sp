
// arAkahukuBoard のロード

try {
  // JavaScript Code Module としてロード
  Components.utils.import("resource://akahuku/board.jsm");
}
catch (e) {
  // JavaScript Code Module が使えない環境(Fx3より前)では
  // 従来通りにロード
  var loader
    = Components.classes ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Components.interfaces.mozIJSSubScriptLoader);
  loader.loadSubScript
    ("chrome://akahuku/content/mod/arAkahukuBoard.js");
}
