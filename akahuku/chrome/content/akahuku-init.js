/* Akahuku Bootstrap from XUL overlay by e10s and non-e10s ways
 *
 * Brief architecture:
 * + Akahuku JSM in the main process (singleton)
 *   + startup/shutdown at once from XUL overlay (this file)
 *   + direct DOMContentLoaded listening for XUL Windows [non-e10s]
 *   + IPC Root [e10s]
 *     + IPC services, i.e. I/O and XUL
 * + Akahuku JSMs in content processes [e10s, e10s-multi]
 *   + IPC requests (and some services)
 *   + DOMContentLoaded listening for content frames
 */

/* global Components, window, Akahuku, arAkahukuCompat */

(function () {// not to expose inner-module variables
  var {AkahukuContextMenusService}
  = Components.utils.import ("resource://akahuku/xul-contextmenus.jsm", {});
  AkahukuContextMenusService.startup (); // if not yet started
  // ensure starting module's ipc root in the main process
  Components.utils.import ("resource://akahuku/fileutil.jsm", {});
  Components.utils.import ("resource://akahuku/filestorage.jsm", {});
  Components.utils.import ("resource://akahuku/observer.jsm", {});
})();

Components.utils.import ("resource://akahuku/akahuku.jsm");
Components.utils.import ("resource://akahuku/p2p-service.jsm");

if (!Akahuku.initialized) {
  // run once
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

  Akahuku.startup ();

  (function () {// not to expose inner-module variables

    if (Akahuku.useFrameScript) {
      // load e10s-specific module(s)
      var {AkahukuNotificationRelay}
      = Components.utils.import ("resource://akahuku/notification-relay.jsm", {});
      // AkahukuNotificationRelay.startup ();// auto start
    }

    // Observe to shutdown global Akahuku module properly
    var os = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
    var observer = {
      observe : function (subject, topic, data) {
        if (topic == "quit-application") {
          Akahuku.shutdown ();
          var {AkahukuContextMenusService}
          = Components.utils.import ("resource://akahuku/xul-contextmenus.jsm", {});
          AkahukuContextMenusService.shutdown ();
          if (typeof AkahukuNotificationRelay !== "undefined") {
            AkahukuNotificationRelay.shutdown ();
          }
          os.removeObserver (observer, "quit-application");
        }
      },
    };
    os.addObserver (observer, "quit-application", false);

  })();
}

// Add listeners for (chrome-)window opening and closing
// to attach/dettach the global Akahuku module
window.addEventListener
  ("load", function (event) {
    Akahuku.attachToWindow (event.currentTarget, {});
  }, false);
window.addEventListener
  ("unload", function (event) {
    Akahuku.dettachFromWindow (event.currentTarget,
      {shutdown: false, unload: true});
  }, false);

