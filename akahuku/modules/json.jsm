
/**
 * JavaScript Code Module 版 arAkahukuJSON
 */

var EXPORTED_SYMBOLS = [
  "arAkahukuJSON",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var arAkahukuJSON = {};

if (JSON) {
  arAkahukuJSON.decode = function (text) {
    return JSON.parse (text);
  };
  arAkahukuJSON.encode = function (value) {
    return JSON.stringify (value);
  };
}
else if ("@mozilla.org/dom/json;1" in Cc) {
  arAkahukuJSON._nsJSON
    = Cc ["@mozilla.org/dom/json;1"]
    .createInstance (Ci.nsIJSON);
  arAkahukuJSON.decode = function (text) {
    return arAkahukuJSON._nsJSON.decode (text);
  }
  arAkahukuJSON.encode = function (value) {
    return arAkahukuJSON._nsJSON.encode (value);
  }
}
else {
  Cu.reportError
    ("load arAkahukuJSON because of no native JSON implementation");
  var loader
    = Cc ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Ci.mozIJSSubScriptLoader);
  loader.loadSubScript
    ("chrome://akahuku/content/mod/arAkahukuJSON.js");
}

