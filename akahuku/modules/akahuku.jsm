/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/**
 * akahuku.jsm - per-process instance of Akahuku using JavaScript Module
 *
 */

var EXPORTED_SYMBOLS = [
  "Akahuku",
  // belows are necessary for akahuku content-policy
  "arAkahukuP2P",
  "arAkahukuDelBanner",
  "arAkahukuCatalog",
  "arAkahukuReload",
];


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;


/**
 * Prepare basis of the extension
 */
Cu.import ("resource://akahuku/console.jsm");
var console = new AkahukuConsole ();
var appinfo =
  Cc ["@mozilla.org/xre/app-info;1"].getService (Ci.nsIXULRuntime);
if (appinfo.processType === appinfo.PROCESS_TYPE_DEFAULT) {
  console.prefix = "Akahuku debug(jsm#main)";
}
else {
  console.prefix = "Akahuku debug(jsm#" + appinfo.processID + ")";
}
console.log ("akahuku.jsm starting up ..."); 

// subscript loder
var load = (function () {
  var base = "chrome://akahuku/content/";
  var baseURI = Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService)
    .newURI (base, null, null);
  var loader = Cc ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Ci.mozIJSSubScriptLoader);
  var loadedFiles = [];
  function alreadyLoaded (absPath) {
    for (var i = 0; i < loadedFiles.length; i++) {
      if (loadedFiles [i] === absPath) return true;
    }
    return false;
  }
  function resolveRelativePath (path) {
    return (/^[^:]+:/.test (path) ? path : baseURI.resolve (path));
  }
  return function load (path) {
    path = resolveRelativePath (path);
    if (alreadyLoaded (path)) {
      throw Components.Exception (path + " is already loaded.");
    }
    loader.loadSubScript (path);
    loadedFiles.push (path);
  };
})();

// utility function; registerXPCOM
Cu.import ("resource://akahuku/XPCOM.jsm", this);


/**
 * Step.1 XPCOMコンポーネントを各プロセスに登録する
 */
console.log ("akahuku.jsm: registering XPCOM components for current process if neccesary")

// akahuku://... プロトコルをコンテントプロセスでも登録
Cu.import ("resource://akahuku/protocol-handler.jsm", this);
try {
  registerXPCOM (arAkahukuProtocolHandler);
  // akahuku-local://
  registerXPCOM (arAkahukuLocalProtocolHandler);
  // akahuku-safe://
  registerXPCOM (arAkahukuSafeProtocolHandler);
}
catch (e if Cr.NS_ERROR_FACTORY_EXISTS) {}//登録済み
catch (e) { console.exception (e);
}

// Content policy をコンテントプロセスでも登録
Cu.import ("resource://akahuku/content-policy.jsm", this);
try {
  registerXPCOM (arAkahukuContentPolicy);
}
catch (e if Cr.NS_ERROR_FACTORY_EXISTS) {}//登録済み
catch (e) { console.exception (e);
}


/**
 * Stpe.2 Akahukuモジュールスタックを構築
 */
console.log ("akahuku.jsm: building Akahuku module stack for JSM")

// XSLTParser and XULSerializer for frame scripts
Cu.import ("resource://akahuku/XSLT.jsm");

load ("version.js");

// Level 1: 
load ("mod/arAkahukuCompat.js");
load ("mod/arAkahukuUtil.js");
load ("mod/arAkahukuDOM.js");
load ("mod/arAkahukuClipboard.js");
load ("mod/arAkahukuWindow.js");
load ("mod/arAkahukuConverter.js");
load ("mod/arAkahukuFile.js");
load ("mod/arAkahukuConfig.js");
load ("mod/arAkahukuStyle.js");
load ("mod/arAkahukuSound.js");
load ("mod/arAkahukuDocumentParam.js");
load ("mod/arAkahukuBoard.js");
load ("mod/arAkahukuTitle.js");
load ("mod/arAkahukuFileName.js");
load ("mod/arAkahukuP2P.js");
arAkahukuP2P.update = function () { //XUL, XPCOM(p2p-servant)
};
arAkahukuP2P.applyP2P = function (targetDocument, targetNode, prefetchOnly) { // XPCOM(p2p-servant)
  return [-1, -1, -1, -1];
};
arAkahukuP2P.prefetchNotify = function () { // XPCOM(p2p-servant)
};
load ("mod/arAkahukuLocationInfo.js");
load ("mod/arAkahukuDelBanner.js");
load ("mod/arAkahukuThread.js");
load ("mod/arAkahukuImage.js");
load ("mod/arAkahukuLink.js");
load ("mod/arAkahukuPopupQuote.js");
load ("mod/arAkahukuCatalog.js");
load ("mod/arAkahukuScroll.js");
load ("mod/arAkahukuPostForm.js");
load ("mod/arAkahukuUI.js");
load ("mod/arAkahukuQuote.js");
load ("mod/arAkahukuPopup.js");
load ("mod/arAkahukuThreadOperator.js");
load ("mod/arAkahukuReload.js");
load ("mod/arAkahukuWheel.js");
load ("mod/arAkahukuMHT.js");

// XUL-heavy stuffs
load ("mod/arAkahukuBloomer.js");
load ("mod/arAkahukuJPEG.js");
load ("mod/arAkahukuTab.js");
load ("mod/arAkahukuSidebar.js");
arAkahukuSidebar.getConfig = function () {
  //FIXME: XUL document
};
arAkahukuSidebar.applyOnXul = arAkahukuSidebar.apply;
arAkahukuSidebar.apply = function (targetDocument, info) {
  // FIXME: XUL側の処理だがcontent documentが必要で…
};


load ("akahuku.js");
Akahuku.debug = console;

load ("mod/arAkahukuCache.js");

if (arAkahukuCompat.comparePlatformVersion ("47.*") > 0) {
  // IPC in a content process or main-process frame
  Cu.import ("resource://akahuku/ipc.jsm", this);
  arAkahukuIPC.init ();
  // redefine methods for ipc child
  load ("ipc/child.js");
}


// Akahuku initialize (Akahuku.onLoad 相当)
Akahuku.init ();

Akahuku.addFrame = function addFrame (frame) {

  // Fire a custom event that Akahuku is ready for a frame.
  // Listeing this event is a simple way to detect that Akahuku with
  // custom events for cooperations is active.
  frame.addEventListener ("DOMWindowCreated", function (event) {
    // Ensure to fire an event once for a frame
    frame.removeEventListener (event.type, arguments.callee);
    var targetDocument = event.target;
    var ev = targetDocument.createEvent ("Events");
    ev.initEvent ("AkahukuFrameLoaded", false, false);
    frame.dispatchEvent (ev);
  });

  frame.addEventListener ("DOMContentLoaded", function (event) {
    Akahuku.onDOMContentLoaded (event);
  });

  // add event listenr of IPC for a frame
  arAkahukuIPC.addFrame (frame);
  // remove event listenr of IPC for a frame
  frame.addEventListener ("unload", function (event) {
    if (event.target == frame) {// when the frame script env is shut down
      arAkahukuIPC.removeFrame (frame);
    }
  });

};


/**
 * Register notification observer for context menu items in e10s
 * to get and send content-base data
 */
function handleContentContextMenu (subject) {
  var target = subject.wrappedJSObject.event.target;
  var data;
  data = arAkahukuLink.getContextMenuContentData (target);
  arAkahukuIPC.sendSyncCommand ("Link/setContextMenuContentData", [data]);
  data = arAkahukuImage.getContextMenuContentData (target);
  arAkahukuIPC.sendSyncCommand ("Image/setContextMenuContentData", [data]);
  data = arAkahukuJPEG.getContextMenuContentData (target);
  arAkahukuIPC.sendSyncCommand ("JPEG/setContextMenuContentData", [data]);
  data = arAkahukuP2P.getContextMenuContentData (target);
  arAkahukuIPC.sendSyncCommand ("P2P/setContextMenuContentData", [data]);
};
if (appinfo.PROCESS_TYPE_CONTENT
    && appinfo.processType === appinfo.PROCESS_TYPE_CONTENT) {
  var os = Cc ["@mozilla.org/observer-service;1"]
    .getService (Ci.nsIObserverService);
  os.addObserver (handleContentContextMenu, "content-contextmenu", false);
}


Akahuku.initialized = true;
Akahuku.debug.log ("Akahuku is initialized for JSM.")

