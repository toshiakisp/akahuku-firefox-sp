/**
 * akahuku/XPCOM.jsm
 *
 *   utility for XPCOM component registration
 */
/* global Components */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

var EXPORTED_SYMBOLS = [
  "registerXPCOM",
  "unregisterXPCOM",
];

/**
 * XPCOM コンポーネントの登録
 *
 * @param func コンストラクタ
 */
function registerXPCOM (func, doDelete) {
  var classID = func.prototype.classID;
  var classDesc = func.prototype.classDescription;
  var contractID = func.prototype.contractID;
  var factory = func.prototype._xpcom_factory;
  var categories = func.prototype._xpcom_categories;
  var destructor = func.prototype._xpcom_jsm_destroy;

  var registrar = Components.manager
    .QueryInterface (Ci.nsIComponentRegistrar);
  if (doDelete) {
    registrar.unregisterFactory (classID, factory);
  }
  else {
    registrar.registerFactory (classID, classDesc, contractID, factory);
  }

  if (categories && categories.length) {
    var cm = Cc ["@mozilla.org/categorymanager;1"]
      .getService (Ci.nsICategoryManager);
    for (var i = 0; i < categories.length; i++) {
      if (categories [i].apps) {
        // apps には非対応
        continue;
      }
      var value = categories [i].value || "";
      if (value.length == 0) {
        value = contractID;
        if (categories [i].service)
          value = "service," + contractID;
      }
      if (doDelete) {
        cm.deleteCategoryEntry (categories [i].category,
            categories [i].entry || classDesc,
          false);
        continue;
      }
      cm.addCategoryEntry (categories [i].category,
          categories [i].entry || classDesc,
          value, false, true);
    }
  }

  if (doDelete && destructor && typeof destructor.destroy == "function") {
    destructor.destroy.call ();
  }
}

function unregisterXPCOM (func) {
  registerXPCOM (func, true);
}

