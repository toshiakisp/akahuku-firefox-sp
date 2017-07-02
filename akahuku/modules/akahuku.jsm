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

var console;
var global = this;
var startedup = false;
var shutdowned = false;
var appinfo =
  Cc ["@mozilla.org/xre/app-info;1"].getService (Ci.nsIXULRuntime);

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

/**
 * Akahuku モジュールスタックを構築
 */
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


load ("akahuku.js");

load ("mod/arAkahukuCache.js");

/**
 * startup jsm module
 */
Akahuku.startup = function () {
  if (startedup) {
    return;
  }
  startedup = true;

  Cu.import ("resource://akahuku/console.jsm");
  console = new AkahukuConsole ();
  if (appinfo.processType === appinfo.PROCESS_TYPE_DEFAULT) {
    console.prefix = "Akahuku debug(jsm#main)";
  }
  else {
    console.prefix = "Akahuku debug(jsm#" + appinfo.processID + ")";
  }
  console.log ("startup: starting up Akahuku ...");
  Akahuku.debug = console;

  // Prepare IPC staff (some XPCOM modules depends it)
  if (arAkahukuCompat.comparePlatformVersion ("37.*") > 0) { //38 or newer
    // Prepare IPC (MessageManager may be usable since Firefox 38)
    Cu.import ("resource://akahuku/ipc.jsm", global);

    if (appinfo.processType === appinfo.PROCESS_TYPE_DEFAULT) {
      console.log ("startup: starting IPC Root")
      arAkahukuIPCRoot.init ();
      arAkahukuIPCRoot.initSubScriptScope (global);
      arAkahukuIPCRoot.loadSubScript
        ("chrome://akahuku/content/ipc/parent.js");
      // only init a child module in the main process
      arAkahukuIPC.init ();
    }
    else { // child process
      console.log ("startup: starting IPC child")
      arAkahukuIPC.init ();
      load ("ipc/child.js"); // applicable only for child proceseses

      // child-process shutdown
      arAkahukuIPC.defineProc
        (Akahuku, "Akahuku", "shutdown",
         {async: true, callback: 0, remote: true});
    }
  }

  Cu.import ("resource://akahuku/XPCOM.jsm", global);
  Cu.import ("resource://akahuku/protocol-handler.jsm", global);
  try {
    // akahuku:// protocol
    registerXPCOM (arAkahukuProtocolHandler);
    console.log ("startup: arAkahukuProtocolHandler XPCOM registered")
    // akahuku-local://
    registerXPCOM (arAkahukuLocalProtocolHandler);
    console.log ("startup: arAkahukuLocalProtocolHandler XPCOM registered")
    // akahuku-safe://
    registerXPCOM (arAkahukuSafeProtocolHandler);
    console.log ("startup: arAkahukuSafeProtocolHandler XPCOM registered")
  }
  catch (e if Cr.NS_ERROR_FACTORY_EXISTS) {} // already registered
  catch (e) { console.exception (e);
  }

  Cu.import ("resource://akahuku/content-policy.jsm", global);
  try {
    registerXPCOM (arAkahukuContentPolicy);
    console.log ("startup: arAkahukuContentPolicy XPCOM registered")
  }
  catch (e if Cr.NS_ERROR_FACTORY_EXISTS) {} // already registered
  catch (e) { console.exception (e);
  }

  // XSLTParser and XULSerializer for frame scripts
  Cu.import ("resource://akahuku/XSLT.jsm", global);

  Akahuku.init ();

  if (typeof appinfo.PROCESS_TYPE_CONTENT !== "undefined"
      && appinfo.processType === appinfo.PROCESS_TYPE_CONTENT) {
    var os = Cc ["@mozilla.org/observer-service;1"]
      .getService (Ci.nsIObserverService);
    os.addObserver (handleContentContextMenu, "content-contextmenu", false);
  }

  Akahuku.initialized = true;
  Akahuku.debug.log ("Akahuku is initialized for JSM.")
};


/**
 * shutdown jsm module
 */
Akahuku.shutdown = function () {
  if (shutdowned || !startedup) {
    console.warn ("abort shutdown (startedup =", startedup,
        ", shutdowned =", shutdowned, ")");
    return;
  }
  shutdowned = true;
  Akahuku.debug.log ("shutdown: shutting down Akahuku ...")

  if (arAkahukuCompat.comparePlatformVersion ("37.*") > 0 //38 or newer
      && appinfo.processType === appinfo.PROCESS_TYPE_DEFAULT) {
    arAkahukuIPCRoot.broadcastAsyncCommandToChildProcesses ("Akahuku/shutdown");
  }


  var unload = function () {};
  if ("unload" in Cu) { // Fx7+
    unload = Cu.unload;
  }
  unload ("resource://akahuku/protocol-handler.jsm");
  unload ("resource://akahuku/content-policy.jsm");
  unload ("resource://akahuku/XSLT.jsm");

  if (typeof appinfo.PROCESS_TYPE_CONTENT !== "undefined"
      && appinfo.processType === appinfo.PROCESS_TYPE_CONTENT) {
    var os = Cc ["@mozilla.org/observer-service;1"]
      .getService (Ci.nsIObserverService);
    os.removeObserver (handleContentContextMenu, "content-contextmenu");
  }

  try {
    Akahuku.term ();
  }
  catch (e) { console.exception (e);
  }

  try {
    unregisterXPCOM (arAkahukuProtocolHandler);
    console.log ("shutdown: arAkahukuProtocolHandler XPCOM unregistered")
    unregisterXPCOM (arAkahukuLocalProtocolHandler);
    console.log ("shutdown: arAkahukuLocalProtocolHandler XPCOM unregistered")
    unregisterXPCOM (arAkahukuSafeProtocolHandler);
    console.log ("shutdown: arAkahukuSafeProtocolHandler XPCOM unregistered")
  }
  catch (e) { console.exception (e);
  }
  try {
    unregisterXPCOM (arAkahukuContentPolicy);
    console.log ("shutdown: arAkahukuContentPolicy XPCOM unregistered")
  }
  catch (e) { console.exception (e);
  }
  unload ("resource://akahuku/XPCOM.jsm");

  if (arAkahukuCompat.comparePlatformVersion ("37.*") > 0) { //38 or newer
    if (appinfo.processType === appinfo.PROCESS_TYPE_DEFAULT) {
      arAkahukuIPC.term ();
      arAkahukuIPCRoot.term ();
    }
    else { // child process
      arAkahukuIPC.term ();
    }
    unload ("resource://akahuku/ipc.jsm");
  }

  Akahuku.debug.log ("shutdown: Akahuku is shutdowned")
};

/**
 * register event listeners for frame script environment
 * @param frame
 */
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

  // turn flag on in content processes at this timing
  // (while turn off via arAkahukuUI.onContextMenuHidden IPC command)
  arAkahukuUI.onContextMenuShown ();
  arAkahukuUI._ContentContextMenuShowing = true;
};

