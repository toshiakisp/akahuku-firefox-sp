// bootstrap.js
//
// The script gets executed in a privileged sandbox,
// which is cached until the extension is shut down.

var global = this;

var C = Components;
var Cc = C.classes;
var Ci = C.interfaces;
var Cu = C.utils;
var Cr = C.results;

var xulruntime
= Cc ["@mozilla.org/xre/app-info;1"]
.getService (Ci.nsIXULRuntime);
var ios
= Cc ["@mozilla.org/network/io-service;1"]
.getService (Ci.nsIIOService);
var resource
= ios.getProtocolHandler ("resource")
.QueryInterface (Ci.nsIResProtocolHandler);

var cssURL = "chrome://akahuku/content/akahuku.css";

var debug = null;
var winobserver;
var AkahukuNotificationRelay, AkahukuIPCManager;

// Entry points of the bootstrap extension

function startup (data, reason) {
  // APP_STARTUP, ADDON_ENABLE, ADDON_INSTALL, ADDON_UPGRADE, or ADDON_DOWNGRADE

  // chrome.manifest equivalent:
  // 1) register: resource akahuku modules/
  var aliasContent = ios.newURI (ios.newFileURI (data.installPath)
      .resolve ("./contenet/"), null, null);
  var aliasModules = ios.newURI (ios.newFileURI (data.installPath)
      .resolve ("./modules/"), null, null);
  resource.setSubstitution ("akahuku", aliasModules);
  resource.setSubstitution ("akahuku-content", aliasContent);
  // 2) register: style * akahuku.css
  try {
    var stylesheet = Cc ["@mozilla.org/content/style-sheet-service;1"]
    .getService (Ci.nsIStyleSheetService);
    var cssURI = ios.newURI (cssURL, null, null);
    stylesheet.loadAndRegisterSheet (cssURI, stylesheet.USER_SHEET);
  }
  catch (e) {
    Cu.reportError (e);
  }

  // normal bootstrap for Akahuku

  Cu.import ("resource://akahuku/console.jsm", global);
  debug = new AkahukuConsole ();
  debug.prefix = "Akahuku debug(bootstrap)";

  var {AkahukuContextMenusService}
  = Cu.import ("resource://akahuku/xul-contextmenus.jsm", {});
  AkahukuContextMenusService.startup (); // if not yet started
  // ensure starting module's ipc root in the main process
  Cu.import ("resource://akahuku/fileutil.jsm", {});
  Cu.import ("resource://akahuku/observer.jsm", {});

  Cu.import ("resource://akahuku/akahuku.jsm");
  Cu.import ("resource://akahuku/p2p-service.jsm");

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

  if (Akahuku.useFrameScript) {
    // load e10s-specific module(s)
    {AkahukuNotificationRelay}
    = Cu.import ("resource://akahuku/notification-relay.jsm", {});
    // AkahukuNotificationRelay.startup ();// auto start

    // Overwrite content-dependent methods
    {AkahukuIPCManager}
    = Cu.import ("resource://akahuku/ipc.jsm", {});
    AkahukuIPCManager.getRoot ("main")
    .loadSubScript ("chrome://akahuku/content/ipc/parent_content.js");
  }

  // For bootstrap.js,
  // window observation to attach/dettach Akahuku
  Cu.import ("resource://akahuku/xul-window-observer.jsm", global);
  winobserver = new XULWindowObserver (Akahuku);
  winobserver.startup ();

  debug.log ("startup() finished");
}

function shutdown (data, reason) {
  // APP_SHUTDOWN, ADDON_DISABLE, ADDON_UNINSTALL, ADDON_UPGRADE, or ADDON_DOWNGRADE

  winobserver.shutdown ();

  try {
    Akahuku.shutdown ();
    AkahukuContextMenusService.shutdown ();
    if (Akahuku.useFrameScript) {
      AkahukuNotificationRelay.shutdown ();
      AkahukuIPCManager.termAll ();
    }
  }
  catch (e) { Cu.reportError (e);
  }

  // unregister: style * akahuku.css
  var stylesheet = Cc ["@mozilla.org/content/style-sheet-service;1"]
  .getService (Ci.nsIStyleSheetService);
  var cssURI = ios.newURI (cssURL, null, null);
  if (stylesheet.sheetRegistered (cssURI, stylesheet.USER_SHEET)) {
    stylesheet.unregisterSheet (cssURI, stylesheet.USER_SHEET);
  }

  Cu.unload ("resource://akahuku/notification-relay.jsm");
  Cu.unload ("resource://akahuku/p2p-service.jsm");
  Cu.unload ("resource://akahuku/akahuku.jsm");
  Cu.unload ("resource://akahuku/xul-window-observer.jsm");
  Cu.unload ("resource://akahuku/xul-contextmenus.jsm");
  Cu.unload ("resource://akahuku/observer.jsm");
  Cu.unload ("resource://akahuku/fileutil.jsm");
  Cu.unload ("resource://akahuku/ipc.jsm");
  Cu.unload ("resource://akahuku/console.jsm");

  resource.setSubstitution ("akahuku", null);
  resource.setSubstitution ("akahuku-content", null);
}

function install (data, reason) {
  if (reason == ADDON_INSTALL) { // really installing
  } else { // ADDON_UPGRADE or ADDON_DOWNGRADE
  }
}

function uninstall (data, reason) {
  if (reason == ADDON_UNINSTALL) { // really uninstalling
  } else { // ADDON_UPGRADE or ADDON_DOWNGRADE (not a permanent uninstall)
  }
}


