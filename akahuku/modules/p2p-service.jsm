/**
 * arAkahukuP2PService - wrapper of P2P XPCOM and related utils
 */

var EXPORTED_SYMBOLS = [
  "arAkahukuP2PService",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import ("resource://akahuku/console.jsm");
var console = new AkahukuConsole ();
console.prefix = "Akahuku debug(p2p-service)";

// Interface infomation for IPC
var typeSync = {ret: false, async: false};
var typeAsync = {ret: false, async: true};
var typeValue = {ret: true,  async: false};
var arAkahukuP2PServant2_idl = {
  // arIAkahukuP2PServant2
  start : typeValue,
  stop : typeSync,
  encodeNodeName : typeValue,
  getFile : {ret: false, async: true, callback: 2,
    // arIAkahukuP2PServantListener
    callbackObjectMethod: ["onP2PSave", "onP2PFail"]},
  createHashFile : typeSync,
  visitBoard : typeSync,
  addNode : typeSync,
  setAddress : typeSync,
  setPort : typeSync,
  setDynamic : typeSync,
  setTransferLimit : typeSync,
  setNoCat : typeSync,
  setAcceptSlot : typeSync,
  setAkahukuVersion : typeSync,
  setCacheCheckInterval : typeSync,
  setCacheSrcLimit : typeSync,
  setCacheThumbLimit : typeSync,
  setCacheCatLimit : typeSync,
  setCacheBase : typeSync,
  setTreatAsSame : typeSync,
  getTreatAsSame : typeValue,
  prefetchFile : typeSync,
  forceClearCache : typeValue,
  getClearCacheState : typeValue,
  getCacheBase : typeValue,
  getStatus : typeValue,
  getNodeList : typeValue,
};

const ipcBaseName = "P2PServant";

var isE10sReady = false;
var inMainProcess = true;
try {
  var appinfo
    = Cc ["@mozilla.org/xre/app-info;1"]
    .getService (Ci.nsIXULRuntime);
  if (typeof appinfo.browserTabsRemoteAutostart !== "undefined") {
    isE10sReady = true;
  }
  if (appinfo.processType !== appinfo.PROCESS_TYPE_DEFAULT) {
    inMainProcess = false;
  }
}
catch (e) {
  console.exception (e);
}

var arAkahukuP2PService = {};

Cu.import ("resource://gre/modules/XPCOMUtils.jsm");

/**
 * arAkahukuP2PService.servant
 */
function lazyGetter () {
  var servant;
  if ("@unmht.org/akahuku-p2p-servant;2" in Cc) {
    servant
      = Cc ["@unmht.org/akahuku-p2p-servant;2"]
      .getService (Ci.arIAkahukuP2PServant2);
  }
  if (isE10sReady) {
    Cu.import ("resource://akahuku/ipc.jsm");

    if (inMainProcess) {
      // chrome process (servant is available)
      if (!arAkahukuIPCRoot.initialized) {
        // ensure init
        arAkahukuIPCRoot.init ();
        console.warn ("arAkahukuIPCRoot.init () called");
      }

      for (var prop in arAkahukuP2PServant2_idl) {
        if (!Object.prototype.hasOwnProperty
            .call (arAkahukuP2PServant2_idl, prop)) {
          continue;
        }
        var options = arAkahukuP2PServant2_idl [prop];
        arAkahukuIPCRoot.defineProc
          (servant, ipcBaseName, prop, options);
      }
      console.log ("defined IPC-parent P2P servant");
    }
    else { // in child processes
      console.prefix = "Akahuku debug(p2p-service#"
        + appinfo.processID + ")";

      servant = {};

      var createIPCMethod = function (prop, options) {
        var name = ipcBaseName + "/" + prop;
        if (options.ret) {
          return function () {
            return arAkahukuIPC.sendSyncCommand (name, arguments);
          };
        }
        else if (options.async) {
          return function () {
            arAkahukuIPC.sendAsyncCommand (name, arguments);
          };
        }
        return function () {
          arAkahukuIPC.sendSyncCommand (name, arguments);
        };
      };

      // Prepare IPC-child servant module
      for (var prop in arAkahukuP2PServant2_idl) {
        if (!Object.prototype.hasOwnProperty
            .call (arAkahukuP2PServant2_idl, prop)) {
          continue;
        }
        var options = arAkahukuP2PServant2_idl [prop];
        servant [prop] = createIPCMethod (prop, options);
      }
    }
  }

  return servant;
}
XPCOMUtils.defineLazyGetter (arAkahukuP2PService, "servant", lazyGetter);

var protocolHandler = {};
Cu.import ("resource://akahuku/protocol.jsm", protocolHandler);

/**
 * arAkahukuP2PService.utils
 */
arAkahukuP2PService.utils = {
  /**
   * P2P用正規化パスのパラメータを取得
   *
   * @param String URL
   * @param Boolean treatAsSame (optional)
   * @return Object
   */
  getP2PPathParam : function (url, treatAsSame) {
    var p = {
      path: "", // P2P用正規化パス
      server: "",
      port: "",
      dir: "",
      type: "",
      leafName: "",
      leafNameBase: "",
      ext: "",
    };

    url = protocolHandler.deAkahukuURI (url);

    var patFutaba = /^https?:\/\/([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/;
    var match, sdir;
    [match, p.server, p.port, sdir, p.dir, p.type, p.leafNameBase, p.ext]
      = patFutaba.exec (url) || [];
    if (match) {
      if (p.leafNameBase.length == 17) {
        // 末尾にランダム文字列が付いている場合、取り除く
        // (JSTで 2001/9/9 10:46:40 から 2286/11/21 2:46:39 は13桁のはず)
        p.leafNameBase = p.leafNameBase.substr (0, 13);
      }
      if (sdir) {
        sdir = sdir.replace (/\//, "");
        if (typeof treatAsSame === "undefined") {
          treatAsSame = arAkahukuP2PService.servant.getTreatAsSame ();
        }
        if (treatAsAame) {
          p.server = sdir;
        }
        else {
          p.dir = sdir + "-" + p.dir;
        }
      }
      p.leafName = p.leafNameBase + "." + p.ext;
      p.path = "/" + p.server + "/" + p.dir + "/" + p.type
        + "/" + p.leafName;
      return p;
    }

    var patSio = /^http:\/\/www\.(nijibox)5\.com\/futabafiles\/(tubu)\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/;
    [match, p.server, p.dir, p.type, p.leafNameBase, p.ext]
      = patSio.exec (url) || [];
    if (match) {
      p.leafName = p.leafNameBase + "." + p.ext;
      p.path = "/" + p.server + "/" + p.dir + "/" + p.type
        + "/" + p.leafName;
      return p;
    }

    return null;
  },

  /**
   * キャッシュファイルを取得する (存在確認無し)
   *
   * @param  String 対象のURL
   * @return nsIFile キャッシュファイル or null
   */
  getCacheFile : function (url) {
    var enableTreatAsSame = arAkahukuP2PService.servant.getTreatAsSame ();
    var cacheBase = arAkahukuP2PService.servant.getCacheBase ();

    var param = this.getP2PPathParam (url, enableTreatAsSame);
    if (!param) {
      return null;
    }
    return this.getCacheFileFromParam (param, cacheBase);
  },

  /**
   * キャッシュファイルを取得する (存在確認無し)
   *
   * @param  Object getP2PPathParam()の戻すオブジェクト
   * @return nsIFile キャッシュファイル or null
   */
  getCacheFileFromParam : function (param, cacheBase) {
    var path = param.path;
    if (!cacheBase) {
      cacheBase = arAkahukuP2PService.servant.getCacheBase ();
    }

    // パスを解析 (taken from arAkahukuP2PServant2.js getFileCore)
    var patPath = /^\/([^\/]+)\/([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+\.[a-z]+)$/;
    var board;
    var [match, server, dir, type, leafName] = patPath.exec (path) || [];
    if (match) {
      board = server + "/" + dir;
      if (type == "cat") {
        board += "_cat";
      }
    }
    if (!/^[a-z0-9\-]+$/.test (server) ||
        !/^[a-z0-9\-]+$/.test (dir) ||
        !/^[a-z]+$/.test (type) ||
        !/^[A-Za-z0-9]+\.[A-Za-z0-9]+$/.test (leafName)) {
      console.warn ("ignore illegal path: " + path);
      return null;
    }

    var file = null;
    try {
      var cacheBaseDir
        = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      cacheBaseDir.initWithPath (cacheBase);
      var fph
        = Cc ["@mozilla.org/network/io-service;1"]
        .getService (Ci.nsIIOService)
        .getProtocolHandler ("file")
        .QueryInterface (Ci.nsIFileProtocolHandler);
      var targetFileURL
        = fph.getURLSpecFromDir (cacheBaseDir);
      targetFileURL = targetFileURL.replace (/\/$/, "");
      targetFileURL += path;
      if (inMainProcess) {
        file = fph.getFileFromURLSpec (targetFileURL);
      }
      else {
        file = arAkahukuIPC.sendSyncCommand
          ("File/getFileFromURLSpec", [targetFileURL]);
      }
    }
    catch (e) {
      Cu.reportError (e);
    }
    return file;
  },

  /**
   * キャッシュファイルを得る(存在している場合)
   *
   * @param  String 対象のURL
   * @return nsIFile キャッシュファイル or null
   */
  getCacheFileIfExists : function (url) {
    try {
      var file = this.getCacheFile (url);
      if (file.exists ()) {
        return file;
      }
    }
    catch (e) {
      Cu.reportError (e);
    }
    return null;
  },

  /**
   * P2P のキャッシュが存在すれば削除する
   *
   * @param String 対象のURL
   */
  deleteCache : function (url) {
    if (!url) {
      return;
    }

    var file = this.getCacheFile (url);
    if (!file) {
      return;
    }

    try {
      if (file.exists ()) {
        file.remove (true);
      }
      file
        = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      file.initWithPath (targetFileName + ".hash");
      if (file.exists ()) {
        file.remove (true);
      }
    }
    catch (e) {
      Cu.reportError (e);
    }
  },

};

