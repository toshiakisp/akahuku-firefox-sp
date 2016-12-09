/**
 * content.js
 *
 *  Overwrite methods that only works in Chrome window
 *  in order to work in the e10s message manager framework.
 */


Akahuku.Cache.asyncGetHttpCacheStatus = function (source, noRedirect, callback) {
  var contextWindow = null;
  if (typeof source == "object") {
    if (source.contextWindow) {
      contextWindow = source.contextWindow;
    }
    else if (source.triggeringNode) {
      var doc = source.triggeringNode.ownerDocument || source.triggeringNode;
      contextWindow = doc.defaultView;
    }
    source = source.url;// simplify for tranfering
  }
  arAkahukuIPC.sendAsyncCommand
    ("Cache/asyncGetHttpCacheStatus", [source, noRedirect, callback],
     contextWindow);
};
Akahuku.Cache.showCacheNotification = function (browser, text) {
  var contentWindow = browser.ownerGlobal;
  arAkahukuIPC.sendAsyncCommand
    ("Cache/showCacheNotification", [null, text],
     contentWindow);
};
Akahuku.Cache._asyncOpenCache
  = Akahuku.Cache.asyncOpenCache;
Akahuku.Cache.asyncOpenCache = function (source, flag, callback) {
  if (arAkahukuIPC.inMainProcess) {
    Akahuku.Cache._asyncOpenCache (source, flag, callback);
    return;
  }
  // in content process
  var contextWindow = null;
  if (typeof source == "object") {
    if (source.contextWindow) {
      contextWindow = source.contextWindow;
    }
    else if (source.triggeringNode) {
      var doc = source.triggeringNode.ownerDocument || source.triggeringNode;
      contextWindow = doc.defaultView;
    }
    source = source.url;// simplify for tranfering
  }

  var callbackWrapper = {
    originalCallback: callback,
    messageManager:
      contextWindow
      ? arAkahukuIPC.getContentFrameMessageManager (contextWindow)
      : arAkahukuIPC.getChildProcessMessageManager (),
    onCacheEntryAvaiable : function (entry, isNew, appCache, status) {
      if (entry) {
        Cu.import ("resource://akahuku/ipc-cache.jsm");
        entry = new arCacheEntryChild (entry);
        entry.attachIPCMessageManager (this.messageManager);
      }
      this.originalCallback
        .onCacheEntryAvailable (entry, isNew, appCache, status);
    },
  };
  arAkahukuIPC.sendAsyncCommand
    ("Cache/asyncOpenCache", [source, flag, callbackWrapper],
     contextWindow);
};



arAkahukuCatalog.init = function () {
  // receive nsINavHistoryObserver calls as messages
  var catalogIPCNavHistoryObserver = {
    observe : function (eventName, uri) {
      switch (eventName) {
        case "ClearHistory":
          arAkahukuCatalog.onClearHistory ();
          break;
        case "DeleteURI":
          arAkahukuCatalog.onDeleteURI (uri);
          break;
        case "EndUpdateBatch":
          arAkahukuCatalog.onEndUpdateBatch ();
          break;
        case "Visit":
          arAkahukuCatalog.onVisit (uri);
          break;
        default:
          Akahuku.debug.error
            ("invalid name for NavHistoryObserver; "+eventName);
      }
    },
  };
  // Define remote command called by the main process
  arAkahukuIPC.defineProc
    (catalogIPCNavHistoryObserver,
     "NavHistoryObserver", "observe",
     {async: true, callback: 0, remote: true});
};
arAkahukuCatalog.term = function () {
  // arAkahukuIPC remove proc?
};



arAkahukuClipboard.getFile = function () {
  return arAkahukuIPC.sendSyncCommand ("Clipboard/getFile", []);
};



arAkahukuCompat.AsyncHistory.isURIVisited = function () {
  arAkahukuIPC.sendAsyncCommand
    ("CompatAsyncHistory/isURIVisited", arguments);
};
arAkahukuCompat.losslessDecodeURI = function () {
  return arAkahukuIPC.sendSyncCommand
    ("Compat/losslessDecodeURI", arguments);
};
arAkahukuCompat.AddonManager.getAddonByID = function () {
  arAkahukuIPC.sendAsyncCommand
    ("CompatAddonManager/getAddonByID", arguments);
};



arAkahukuConfig.setBoolPref = function (n, v) {
  arAkahukuIPC.sendSyncCommand
    ("Config/setBoolPref", [n, v]);
};
arAkahukuConfig.setCharPref = function (n, v) {
  arAkahukuIPC.sendSyncCommand
    ("Config/setCharPref", [n, v]);
};
arAkahukuConfig.setIntPref = function (n, v) {
  arAkahukuIPC.sendSyncCommand
    ("Config/setIntPref", [n, v]);
};
arAkahukuConfig.clearUserPref = function (n) {
  arAkahukuIPC.sendSyncCommand
    ("Config/clearUserPref", [n]);
};
arAkahukuConfig.setTime = function (t) {
  arAkahukuIPC.sendSyncCommand
    ("Config/setTime", [t]);
};
arAkahukuConfig.restoreTime = function () {
  arAkahukuIPC.sendSyncCommand
    ("Config/restoreTime", []);
};



arAkahukuFile.getDirectory = function () {
  return arAkahukuIPC.sendSyncCommand ("File/getDirectory", arguments);
};
arAkahukuFile.create = function () {
  return arAkahukuIPC.sendSyncCommand ("File/create", arguments);
};
arAkahukuFile.createUnique = function () {
  return arAkahukuIPC.sendSyncCommand ("File/createUnique", arguments);
};
arAkahukuFile.createFileOutputStream = function (file, ioFlags, perm, behaviorFlags, contentWindow) {
  var fstream = arAkahukuIPC
    .sendSyncCommand ("File/createFileOutputStream",
        [file, ioFlags, perm, behaviorFlags], contentWindow);
  if (fstream) {
    Cu.import ("resource://akahuku/ipc-stream.jsm");
    fstream = new arOutputStreamChild (fstream);
    var mm = (contentWindow
        ? arAkahukuIPC.getContentFrameMessageManager (contentWindow)
        : arAkahukuIPC.getChildProcessMessageManager ());
    fstream.attachIPCMessageManager (mm);
    fstream = fstream.getBufferedOutputStream ();
  }
  return fstream;
};
arAkahukuFile.readFile = function () {
  return arAkahukuIPC.sendSyncCommand ("File/readFile", arguments);
};
arAkahukuFile.readBinaryFile = function () {
  return arAkahukuIPC.sendSyncCommand ("File/readBinaryFile", arguments);
};
arAkahukuFile.createFileInputStream = function (file, ioFlags, perm, behaviorFlags, contentWindow) {
  var fstream = arAkahukuIPC
    .sendSyncCommand ("File/createFileInputStream",
        [file, ioFlags, perm, behaviorFlags], contentWindow);
  if (fstream) {
    Cu.import ("resource://akahuku/ipc-stream.jsm");
    var fstreamC = new arInputStreamChild (fstream);
    var mm = (contentWindow
        ? arAkahukuIPC.getContentFrameMessageManager (contentWindow)
        : arAkahukuIPC.getChildProcessMessageManager ());
    fstreamC.attachIPCMessageManager (mm);
    fstream = fstreamC.inputStream;
  }
  return fstream;
};
arAkahukuFile.moveTo = function () {
  arAkahukuIPC.sendSyncCommand ("File/moveTo", arguments);
};
arAkahukuFile.remove = function () {
  arAkahukuIPC.sendSyncCommand ("File/remove", arguments);
};
arAkahukuFile.createDirectory = function () {
  arAkahukuIPC.sendSyncCommand ("File/createDirectory", arguments);
};

arAkahukuFile.getFilenameFromURLSpec  = function () {
  return arAkahukuIPC.sendSyncCommand
    ("File/getFilenameFromURLSpec", arguments);
};
arAkahukuFile.getFileFromURLSpec = function () {
  return arAkahukuIPC.sendSyncCommand
    ("File/getFileFromURLSpec", arguments);
};



arAkahukuImage.openXULSaveImagePopup = function (node, rect, x, y) {
  var recto = {x: rect.x, y: rect.y,
    width: rect.width, height: rect.height,
    top: rect.top, left: rect.left,
  };
  arAkahukuIPC.sendAsyncCommand
    ("Image/openXULSaveImagePopup", [null, recto, x, y],
     node.ownerDocument.defaultView);
};
arAkahukuImage.asyncOpenSaveImageFilePicker
= function (browser, filename, dirname, callback) {
  // e10s: browser is WindowRoot, not xul:browser
  var contentWindow = browser.ownerGlobal;
  arAkahukuIPC.sendAsyncCommand
    ("Image/asyncOpenSaveImageFilePicker",
     [null, filename, dirname, callback],
     contentWindow);
};
arAkahukuImage.asyncSaveImageToFile = function () {
  arAkahukuIPC.sendAsyncCommand
    ("Image/asyncSaveImageToFile", arguments);
};
arAkahukuIPC.defineProc
  (arAkahukuImage,
   "Image", "selectSaveImageDirFromXUL",
   {async: true, callback: 0, remote: true});



arAkahukuIPC.defineProc
  (arAkahukuJPEG,
   "JPEG", "openThumbnail",
   {async: true, callback: 0, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuJPEG,
   "JPEG", "closeThumbnail",
   {async: true, callback: 0, remote: true});



arAkahukuIPC.defineProc
  (arAkahukuLink, "Link", "setExt", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLink, "Link", "addUser", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLink, "Link", "openLink", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLink, "Link", "saveLink", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLink, "Link", "copyLink", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLink, "Link", "openAsAutoLink", {async: true, remote: true});
arAkahukuLink.openLinkInXUL = function (href, to, focus, targetDocument, isPrivate) {
  arAkahukuIPC.sendAsyncCommand
    ("Link/openLinkInXUL", [href, to, focus, targetDocument, isPrivate],
     targetDocument.defaultView);
};



arAkahukuMHT.asyncOpenSaveMHTFilePicker
= function (browser, filename, dirname_base, callback) {
  // e10s: browser is WindowRoot, not xul:browser
  var contentWindow = browser.ownerGlobal;

  arAkahukuIPC.sendAsyncCommand
    ("MHT/asyncOpenSaveMHTFilePicker",
     [null, filename, dirname_base, callback],
     contentWindow);
};



arAkahukuIPC.defineProc
  (arAkahukuP2P, "P2P", "deleteCache", {async: true, remote: true});

arAkahukuP2P.deleteCacheFiles = function () {
  arAkahukuIPC.sendAsyncCommand
    ("P2P/deleteCacheFiles", arguments);
};
arAkahukuP2P.update = function () {
  arAkahukuIPC.sendAsyncCommand
    ("P2P/update", arguments);
};
arAkahukuP2P.updateStatusbar = function () {
  arAkahukuIPC.sendAsyncCommand
    ("P2P/updateStatusbar", arguments);
};



arAkahukuIPC.defineProc
  (arAkahukuQuote, "Quote", "quote", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuote, "Quote", "quoteToMailBox", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuote, "Quote", "quoteToNameBox", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuote, "Quote", "copyToClipboard", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuote, "Quote", "googleImage", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuote, "Quote", "wikipedia", {async: true, remote: true});

arAkahukuQuote.searchInNewTabXUL = function () {
  arAkahukuIPC.sendAsyncCommand ("Quote/searchInNewTabXUL", arguments);
};



var arAkahukuReloadIPCWrapper = {
  diffReloadForBrowser : function (browser, doSync) {
    // minimum equivalent
    browser = {
      contentDocument: arAkahukuIPC.messageTarget.content.document,
    };
    arAkahukuReload.diffReloadForBrowser (browser, doSync);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuReloadIPCWrapper,
   "Reload", "diffReloadForBrowser", {async: true, remote: true});



arAkahukuSidebar.updateThreadItem = function () {
  arAkahukuIPC.sendAsyncCommand ("Sidebar/updateThreadItem", arguments);
};
arAkahukuSidebar.hasTabForBoard = function () {
  return arAkahukuIPC.sendSyncCommand ("Sidebar/hasTabForBoard", arguments);
};
arAkahukuSidebar.hasBoard = function () {
  return arAkahukuIPC.sendSyncCommand ("Sidebar/hasBoard", arguments);
};
arAkahukuSidebar.getThread = function () {
  return arAkahukuIPC.sendSyncCommand ("Sidebar/getThread", arguments);
};
arAkahukuSidebar.asyncUpdateVisited = function () {
  arAkahukuIPC.sendAsyncCommand ("Sidebar/asyncUpdateVisited", arguments);
}
arAkahukuSidebar.sort = function () {
  arAkahukuIPC.sendSyncCommand ("Sidebar/sort", arguments);
};
arAkahukuSidebar.updateMarked = function () {
  arAkahukuIPC.sendSyncCommand ("Sidebar/updateMarked", arguments);
};
arAkahukuSidebar.update = function () {
  arAkahukuIPC.sendSyncCommand ("Sidebar/update", arguments);
};
arAkahukuSidebar.term = function () {
  // don't save in child processes
};



arAkahukuSound.init = function () {
  // Create simple object providing necessary "play" function
  // because nsISound instance can not be created in child processes.
  arAkahukuSound.sound = {
    play : function (uri) {
      arAkahukuIPC.sendAsyncCommand ("Sound/play", arguments);
    },
  };
};



arAkahukuStyle.modifyStyleFile = function () {
  // update css only in the Chrome process
};



arAkahukuThread.setTabIconForWindow = function (targetWindow, prop) {
  arAkahukuIPC.sendSyncCommand
    ("Thread/setTabIconForWindow",
     [null, prop], targetWindow);
};
arAkahukuThread.resetTabIconForWindow = function (targetWindow) {
  arAkahukuIPC.sendAsyncCommand
    ("Thread/resetTabIconForWindow",
     [null], targetWindow);
};

var arAkahukuThreadIPCWrapper = {
  showResPanel : function () {
    var targetDocument = arAkahukuIPC.messageTarget.content.document
    arAkahukuThread.showResPanel (targetDocument);

    // simply flag in the main process (for popup menu)
    arAkahukuIPC.sendSyncCommand
      ("Akahuku/setDocumentParamFlag", ["respanel_param", true],
       targetDocument.defaultView);
  },
  closeResPanel : function () {
    var targetDocument = arAkahukuIPC.messageTarget.content.document
    arAkahukuThread.closeResPanel (targetDocument);

    // simply flag out in the main process (for popup menu)
    arAkahukuIPC.sendSyncCommand
      ("Akahuku/unsetDocumentParamFlag", ["respanel_param"],
       targetDocument.defaultView);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuThreadIPCWrapper,
   "Thread", "showResPanel", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuThreadIPCWrapper,
   "Thread", "closeResPanel", {async: true, remote: true});



arAkahukuUI.setStatusPanelText = function () {
  arAkahukuIPC.sendSyncCommand
    ("UI/setStatusPanelText", arguments);
};
arAkahukuUI.clearStatusPanelText = function () {
  arAkahukuIPC.sendSyncCommand
    ("UI/clearStatusPanelText", arguments);
};
arAkahukuUI.getStatusPanelText = function () {
  return arAkahukuIPC.sendSyncCommand
    ("UI/getStatusPanelText", []);
};
arAkahukuUI.showPanel = function () {
  // no action need from content processes
};
arAkahukuUI.setPanelStatus = function () {
};



arAkahukuWindow.getTabForWindow = function (targetWindow) {
  throw Components.Exception ("arAkahukuWindow.getTabForWindow"
      + " is not supported in e10s-ready env.",
      Components.results.NS_ERROR_NOT_IMPLEMENTED,
      Components.stack.caller);
};
arAkahukuWindow.getParentWindowInChrome = function (targetWindow) {
  throw Components.Exception ("arAkahukuWindow.getParentWindowInChrome"
      + " is not supported in e10s-ready env.",
      Components.results.NS_ERROR_NOT_IMPLEMENTED,
      Components.stack.caller);
};
arAkahukuWindow.focusTabForWindow = function (targetWindow) {
  arAkahukuIPC.sendAsyncCommand
    ("Window/focusTabForWindow", [],
     targetWindow); // send from frame message manager
};



Akahuku.getFocusedDocumentParam = function () {
  var focusedDocument
    = arAkahukuIPC.sendSyncCommand ("Akahuku/getFocusedDocument", []);
  Akahuku.debug.log ("getFocusedDocumentParam", focusedDocument);
  return Akahuku.getDocumentParam (focusedDocument);
};

//
// add/remove arAkahukuDocumentParam in both content and XUL(browser)
//
Akahuku._addDocumentParamOrig = Akahuku.addDocumentParam;
Akahuku.addDocumentParam = function (targetDocument, info) {
  Akahuku._addDocumentParamOrig (targetDocument, info);
  arAkahukuIPC.sendSyncCommand
    ("Akahuku/addDocumentParam", [null, info],
     targetDocument.defaultView);
};
Akahuku._removeDocumentParamOrig = Akahuku.removeDocumentParam;
Akahuku.removeDocumentParam = function (targetDocument) {
  arAkahukuIPC.sendSyncCommand
    ("Akahuku/removeDocumentParam", [null],
     targetDocument.defaultView);
  Akahuku._removeDocumentParamOrig (targetDocument);
};


