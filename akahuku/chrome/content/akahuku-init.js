
// Akahuku Bootstrap from XUL overlay by e10s and non-e10s ways
//
// This script runs after all Akahuku modules loaded

try {
  if (arAkahukuCompat.comparePlatformVersion ("47.*") > 0) { //48 or newer
    // e10s-ready booting is activated if necessary
    Akahuku.useFrameScript
      = Components.classes ["@mozilla.org/xre/app-info;1"]
      .getService (Components.interfaces.nsIXULRuntime)
      .browserTabsRemoteAutostart;
  }
}
catch (e) {
}

try {
  const {AkahukuIPCManager}
  = Components.utils.import ("resource://akahuku/ipc.jsm", {});
  var ipc = AkahukuIPCManager.createRoot ("main");
  var arAkahukuIPCRoot = ipc.root;
  var arAkahukuIPC = ipc.child;
}
catch (e) {
  Components.utils.reportError (e);
}

if (Akahuku.useFrameScript) {
  // Boot as an e10s-ready extension by building extension modules
  // (even if multiprocess firefox is disabled)

  // For the multi-process (e10s) Firefox environment:
  // * XUL Window
  //   * Akahuku in XUL overlay (main process)
  //     * IPC in the main-process JSM scope
  //       * IPC services (capable only in the main process, i.e. I/O.)
  //   * Akahuku in a content-process JSM scope with IPC calls
  //     * each frames: listen events (DOMContentLoaded)

  // activate XUL-overlay Akahuku partially for IPC call
  Components.utils.import ("resource://akahuku/console.jsm", this);
  Akahuku.debug = new AkahukuConsole ();
  Akahuku.debug.prefix = "Akahuku debug(xul#main)";

  // Start Local inter-Process Call service in the main process
  arAkahukuIPCRoot.init ();
  // Prepare P2PServant IPC parent
  Components.utils.import ("resource://akahuku/p2p-service.jsm", {});
  // Prepare Observer IPC parent
  Components.utils.import ("resource://akahuku/observer.jsm", {});
  // Prepare Notification relay root for e10s-multi
  Components.utils.import ("resource://akahuku/notification-relay.jsm", {});

  Akahuku.init (); // required for main-process IPC childs

  window.addEventListener
    ("load", function () {Akahuku.onLoad ();}, false);
  window.addEventListener
    ("unload", function () {Akahuku.onUnload ();}, false);

  // Set scope for subscripts to be loaded
  arAkahukuIPCRoot.initSubScriptScope (this);
  // Load susbscripts that define IPC commands
  arAkahukuIPCRoot.loadSubScript
    ("chrome://akahuku/content/ipc/parent.js");
  // Overwrite content-dependent methods
  arAkahukuIPCRoot.loadSubScript
    ("chrome://akahuku/content/ipc/parent_content.js");

  // Register the frame script
  // to load content-process Akahuku and to listen events
  window.messageManager.loadFrameScript
    ("chrome://akahuku/content/akahuku-frame.js", true);

}
else { // Boot as a classic XUL-overlay extension

  if (arAkahukuCompat.comparePlatformVersion ("37.*") > 0) { //38 or newer
    // Prepare IPC for compatiblility of akahuku.jsm in classic XUL mode
    // (ipc message manager may be usable since Firefox 38)
    try {
      arAkahukuIPCRoot.init ();
      arAkahukuIPCRoot.initSubScriptScope (this);
      arAkahukuIPCRoot.loadSubScript
        ("chrome://akahuku/content/ipc/parent.js");
    }
    catch (e) { Components.utils.reportError (e);
    }
  }

  try {
    Components.utils.import ("resource://akahuku/console.jsm", this);
    Akahuku.debug = new AkahukuConsole ();
    Akahuku.debug.prefix = "Akahuku debug";
  }
  catch (e) {
    Components.utils.reportError (e);
    // minimum impl. for fail safe
    Akahuku.debug = {
      log : function () {},
      info : function () {},
      warn : function () {},
      error : function () {},
      exception : function (e) {
        Components.utils.reportError (e);
      },
      tic : function () {
        return {toc: function () { return 0; }};
      },
      nsresultToString : function (e) {
        return "[0x" + Number (e).toString (16) + "]";
      },
    };
  }

  Akahuku.init ();

  // Transfer old-ext handler calls for JSM to handler calls for XUL
  // for compatibility of aima_aimani
  try {
    var jsm = {};
    Components.utils.import ("resource://akahuku/akahuku.jsm", jsm);
    jsm.Akahuku.startup ();
    jsm.Akahuku.onAima_Aimanied = function () {
      Akahuku.onAima_Aimanied (arguments [0]);
    }
    jsm.Akahuku.onHideEntireThread = function () {
      Akahuku.onHideEntireThread (arguments [0]);
    }
  }
  catch (e) { Components.utils.reportError (e);
  }

  // Add listeners for (chrome-)window opening and closing
  // to initialize Akahuku
  window.addEventListener
    ("load", function () {Akahuku.onLoad ();}, false);
  window.addEventListener
    ("unload", function () {Akahuku.onUnload ();}, false);

}



