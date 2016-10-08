
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

  Akahuku.init (); // required for main-process IPC childs

  window.addEventListener
    ("load", function () {Akahuku.onLoad ();}, false);
  window.addEventListener
    ("unload", function () {Akahuku.onUnload ();}, false);

  // Start Local inter-Process Call service in the main process
  Components.utils.import ("resource://akahuku/ipc.jsm", this);
  arAkahukuIPCRoot.init ();

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
      Components.utils.import ("resource://akahuku/ipc.jsm", this);
      arAkahukuIPCRoot.init ();
      arAkahukuIPCRoot.initSubScriptScope (this);
      arAkahukuIPCRoot.loadSubScript
        ("chrome://akahuku/content/ipc/parent.js");
    }
    catch (e) { Components.utils.reportError (e);
    }
  }
  Akahuku.init ();

  // Add listeners for (chrome-)window opening and closing
  // to initialize Akahuku
  window.addEventListener
    ("load", function () {Akahuku.onLoad ();}, false);
  window.addEventListener
    ("unload", function () {Akahuku.onUnload ();}, false);

  if (arAkahukuCompat.comparePlatformVersion ("1.7.*") <= 0) {
    /* 古い Mozilla Suite では最初のイベントリスナが無視されるので 2 つ登録する */
    window.addEventListener
      ("load", function () {Akahuku.onLoad ();}, false);
    window.addEventListener
      ("unload", function () {Akahuku.onUnload ();}, false);
  }

}



