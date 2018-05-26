/**
 * Process-wide simple temporal storage
 */
/* global Components */
var EXPORTED_SYMBOLS = [
  "AkahukuStorage",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function AkahukuStorageArea () {
  this._data = {};
}
AkahukuStorageArea.prototype = {
  _getForKey : function (key) {
    return this._data [key];
  },
  _setForKey : function (key, value) {
    this._data [key] = value;
  },
  get : function (key) {
    return this._data [key];
  },
  set : function (obj) {
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call (obj, key)) {
        this._setForKey (key, obj [key]);
      }
    }
  },
  remove : function (keys) {
    if (!(keys instanceof Array)) {
      keys = [keys];
    }
    for (var i = 0; i < keys.length; i ++) {
      delete this._data [keys [i]];
    }
  },
  clear : function () {
    this._data = {};
  },
};


var AkahukuStorage = {
  local : new AkahukuStorageArea (),

  shutdown : function () {
    AkahukuStorage.local = null;
  },
};

// Constant id for accessing the parent-process storage
var id = "akahuku.fx.sp@toshiakisp.github.io/storage";


var appinfo
  = Cc ["@mozilla.org/xre/app-info;1"]
  .getService (Ci.nsIXULRuntime);

if (appinfo.processType == appinfo.PROCESS_TYPE_DEFAULT) {
  if ("@mozilla.org/parentprocessmessagemanager;1" in Cc
      && "nsIMessageListenerManager" in Ci) {
    // e10s-ready platform
    var {arIPCProxyParent}
    = Cu.import ("resource://akahuku/ipc-proxy.jsm", {});
    var proxy = new arIPCProxyParent (AkahukuStorage.local);
    proxy.id = id;
    var gpmm
      = Cc ["@mozilla.org/parentprocessmessagemanager;1"]
      .getService (Ci.nsIMessageListenerManager);
    proxy.attachIPCMessageManager (gpmm);

    AkahukuStorage.shutdown = function () {
      proxy.detachIPCMessageManager ();
      AkahukuStorage.local = null;
    };
  }
}
else { // child processes (e10s ready)
  var {arIPCProxyChild}
  = Cu.import ("resource://akahuku/ipc-proxy.jsm", {});

  var proxy = new arIPCProxyChild (AkahukuStorageArea.prototype);
  proxy.parentId = id;
  var mm
    = Cc ['@mozilla.org/childprocessmessagemanager;1']
    .getService (Ci.nsISyncMessageSender);
  proxy.attachIPCMessageManager (mm);

  AkahukuStorage.local = proxy;
  AkahukuStorage.shutdown = function () {
    proxy.detachIPCMessageManager ();
    AkahukuStorage.local = null;
  };
}

