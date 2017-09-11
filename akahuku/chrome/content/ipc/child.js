/**
 * content.js
 *
 *  Overwrite methods that only works in Chrome window
 *  in order to work in the e10s message manager framework.
 */

/* global Components, arAkahukuIPC,
 *   Akahuku, arAkahukuCatalog, arAkahukuClipboard, arAkahukuCompat,
 *   arAkahukuConfig, arAkahukuFile, arAkahukuImage, arAkahukuJPEG,
 *   arAkahukuLink, arAkahukuMHT, arAkahukuP2P, arAkahukuPostForm,
 *   arAkahukuQuote, arAkahukuReload, arAkahukuSidebar, arAkahukuSound,
 *   arAkahukuStyle, arAkahukuThread, arAkahukuUI, arAkahukuWindow,
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
        var {arCacheEntryChild}
        = Components.utils.import ("resource://akahuku/ipc-cache.jsm", {});
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
arAkahukuCatalog.isOpenedAsync = function (uri, callback) {
  // just query for the parent process
  arAkahukuIPC.sendAsyncCommand
    ("Akahuku/hasDocumentParamForURIAsync", [uri, function (opened) {
      if (typeof callback === "function") {
        callback.apply (null, [opened]);
      }
      else {
        callback.isOpened.apply (callback, [uri, opened]);
      }
    }]);
};
arAkahukuCatalog.asyncFocusByThreadURI = function (uri, anchor, callback) {
  arAkahukuIPC.sendAsyncCommand
    ("Catalog/asyncFocusByThreadURI", [uri, null, callback]);
};



arAkahukuClipboard.getFile = function () {
  return arAkahukuIPC.sendAsyncCommand ("Clipboard/getFile", []);
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
arAkahukuFile.createUnique = function () {
  return arAkahukuIPC.sendSyncCommand ("File/createUnique", arguments);
};
arAkahukuFile.createFileOutputStream = function (file, ioFlags, perm, behaviorFlags, contentWindow) {
  var fstream = arAkahukuIPC
    .sendSyncCommand ("File/createFileOutputStream",
        [file, ioFlags, perm, behaviorFlags], contentWindow);
  if (fstream) {
    var {arOutputStreamChild}
    = Components.utils.import ("resource://akahuku/ipc-stream.jsm", {});
    fstream = new arOutputStreamChild (fstream);
    var mm = (contentWindow
        ? arAkahukuIPC.getContentFrameMessageManager (contentWindow)
        : arAkahukuIPC.getChildProcessMessageManager ());
    fstream.attachIPCMessageManager (mm);
    fstream = fstream.getBufferedOutputStream ();
  }
  return fstream;
};
arAkahukuFile.createFileInputStream = function (file, ioFlags, perm, behaviorFlags, contentWindow) {
  var fstream = arAkahukuIPC
    .sendSyncCommand ("File/createFileInputStream",
        [file, ioFlags, perm, behaviorFlags], contentWindow);
  if (fstream) {
    var {arInputStreamChild}
    = Components.utils.import ("resource://akahuku/ipc-stream.jsm", {});
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
arAkahukuFile.createDirectory = function () {
  arAkahukuIPC.sendSyncCommand ("File/createDirectory", arguments);
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



var arAkahukuJPEGIPC = {
  openThumbnail : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuJPEG.openThumbnail (target);
  },
  closeThumbnail : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuJPEG.closeThumbnail (target);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuJPEGIPC,
   "JPEG", "openThumbnail",
   {async: true, callback: 0, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuJPEGIPC,
   "JPEG", "closeThumbnail",
   {async: true, callback: 0, remote: true});



var arAkahukuLinkIPC = {
  setExt : function (type, ext, target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuLink.setExt (type, ext, target);
  },
  addUser : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuLink.addUser (target);
  },
  openLink : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuLink.openLink (target);
  },
  saveLink : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuLink.saveLink (target);
  },
  copyLink : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuLink.copyLink (target);
  },
  openAsAutoLink : function (target, shiftKey) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuLink.openAsAutoLink (target, shiftKey);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuLinkIPC, "Link", "setExt", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLinkIPC, "Link", "addUser", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLinkIPC, "Link", "openLink", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLinkIPC, "Link", "saveLink", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLinkIPC, "Link", "copyLink", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuLinkIPC, "Link", "openAsAutoLink", {async: true, remote: true});
arAkahukuLink.openLinkInXUL = function (href, to, focus, target, isPrivate) {
  arAkahukuIPC.sendAsyncCommand
    ("Link/openLinkInXUL", [href, to, focus, null, isPrivate],
     target.defaultView);
};
arAkahukuLink.makeURLSafeInNoscript = function (targetUrl, docUrl, browser) {
  arAkahukuIPC.sendSyncCommand
    ("Link/makeURLSafeInNoscript", [targetUrl, docUrl, null],
     browser.ownerGlobal);
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
var arAkahukuMHTIPCWrapper = {
  saveMHTForBrowser : function () {
    var browser = { // minimum
      contentDocument : arAkahukuIPC.messageTarget.content.document,
    };
    arAkahukuMHT.saveMHTForBrowser (browser);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuMHTIPCWrapper, "MHT", "saveMHTForBrowser",
   {async: true, remote: true});


var arAkahukuP2PIPC = {
  deleteCache : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuP2P.deleteCache (target);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuP2PIPC, "P2P", "deleteCache", {async: true, remote: true});

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



var arAkahukuPostFormIPCWrapper = {
  // called from onKeyDown in Chrome process
  focusCommentboxForBrowser : function (browser) {
    var contentDocument = arAkahukuIPC.messageTarget.content.document;
    arAkahukuPostForm.focusCommentbox (contentDocument);
  },
  toggleSageButtonForBrowser : function (browser) {
    var contentDocument = arAkahukuIPC.messageTarget.content.document;
    arAkahukuPostForm.toggleSageButton (contentDocument);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuPostFormIPCWrapper, "PostForm", "focusCommentboxForBrowser",
   {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuPostFormIPCWrapper, "PostForm", "toggleSageButtonForBrowser",
   {async: true, remote: true});



var arAkahukuQuoteIPC = {
  quote : function (addQuotePrefix, focusTextArea, target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuQuote.quote (addQuotePrefix, focusTextArea, target);
  },
  quoteToMailBox : function (focusMailBox, target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuQuote.quoteToMailBox (focusMailBox, target);
  },
  quoteToNameBox : function (focusNameBox, target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuQuote.quoteToNameBox (focusNameBox, target);
  },
  copyToClipboard : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuQuote.copyToClipboard (target);
  },
  googleImage : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuQuote.googleImage (target);
  },
  wikipedia : function (target) {
    target = arAkahukuUI.contextMenuContentTarget;
    arAkahukuQuote.wikipedia (target);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuQuoteIPC, "Quote", "quote", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuoteIPC, "Quote", "quoteToMailBox", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuoteIPC, "Quote", "quoteToNameBox", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuoteIPC, "Quote", "copyToClipboard", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuoteIPC, "Quote", "googleImage", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuQuoteIPC, "Quote", "wikipedia", {async: true, remote: true});

arAkahukuQuote.searchInNewTabXUL = function (href, focus, browser) {
  arAkahukuIPC.sendAsyncCommand
    ("Quote/searchInNewTabXUL", [href, focus],
     browser.ownerGlobal);
};



var arAkahukuReloadIPCWrapper = {
  diffReloadForBrowser : function (browser, doSync) {
    // minimum equivalent
    browser = {
      contentDocument: arAkahukuIPC.messageTarget.content.document,
    };
    arAkahukuReload.diffReloadForBrowser (browser, doSync);
  },
  reloadOnDemandForBrowser : function (browser, doSync) {
    // minimum equivalent
    browser = {
      contentDocument: arAkahukuIPC.messageTarget.content.document,
    };
    arAkahukuReload.reloadOnDemandForBrowser (browser, doSync);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuReloadIPCWrapper,
   "Reload", "diffReloadForBrowser", {async: true, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuReloadIPCWrapper,
   "Reload", "reloadOnDemandForBrowser", {async: true, remote: true});



arAkahukuSidebar.updateThreadItem = function () {
  arAkahukuIPC.sendAsyncCommand ("Sidebar/updateThreadItem", arguments);
};
arAkahukuSidebar.hasTabForBoard = function (name, browser) {
  return arAkahukuIPC.sendSyncCommand
    ("Sidebar/hasTabForBoard", [name, null],
     browser.ownerGlobal);
};
arAkahukuSidebar.hasBoard = function (boardName, browser) {
  return arAkahukuIPC.sendSyncCommand
    ("Sidebar/hasBoard", [boardName, null],
     browser.ownerGlobal);
};
arAkahukuSidebar.getThread = function (boardName, threadNumber, browser) {
  return arAkahukuIPC.sendSyncCommand
    ("Sidebar/getThread", [boardName, threadNumber, null],
     browser.ownerGlobal);
};
arAkahukuSidebar.asyncUpdateVisited = function (name) {
  arAkahukuIPC.sendAsyncCommand ("Sidebar/asyncUpdateVisited", [name]);
}
arAkahukuSidebar.resetCatalogOrder = function (name, originBrowser) {
  arAkahukuIPC.sendSyncCommand
    ("Sidebar/resetCatalogOrder", [name, null],
     originBrowser.ownerGlobal);
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



arAkahukuUI.setStatusPanelText = function (text, type, browser) {
  arAkahukuIPC.sendSyncCommand
    ("UI/setStatusPanelText", [text, type],
     browser.ownerGlobal);
};
arAkahukuUI.clearStatusPanelText = function (optText, browser) {
  arAkahukuIPC.sendSyncCommand
    ("UI/clearStatusPanelText", [optText],
     browser.ownerGlobal);
};
arAkahukuUI.getStatusPanelText = function (browser) {
  return arAkahukuIPC.sendSyncCommand
    ("UI/getStatusPanelText", [],
     browser.ownerGlobal);
};
arAkahukuUI.showPanel = function () {
  // no action need from content processes
};
arAkahukuUI.setPanelStatus = function () {
};
arAkahukuUI._ContentContextMenuShowing = false;
var arAkahukuUIIPCWrapper = {
  onContextMenuHidden : function () {
    if (arAkahukuUI._ContentContextMenuShowing) {
      arAkahukuUI._ContentContextMenuShowing = false;
      arAkahukuUI.onContextMenuHidden ();
    }
  },
  addDocumentToExternalBoards : function () {
    var targetDocument = arAkahukuIPC.messageTarget.content.document;
    arAkahukuUI.addDocumentToExternalBoards (targetDocument);
  },
  applyDocument : function () {
    var targetDocument = arAkahukuIPC.messageTarget.content.document;
    arAkahukuUI.applyDocument (targetDocument);
  },
};
arAkahukuIPC.defineProc
  (arAkahukuUIIPCWrapper,
   "UI", "addDocumentToExternalBoards",
   {async: true, callback: 0, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuUIIPCWrapper,
   "UI", "applyDocument",
   {async: true, callback: 0, remote: true});
arAkahukuIPC.defineProc
  (arAkahukuUIIPCWrapper,
   "UI", "onContextMenuHidden",
   {async: true, remote: true});



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



Akahuku.initContextMenus = function () {
  // no need in context processes
};
Akahuku.getFocusedDocumentParam = function () {
  var focusedDocument
    = arAkahukuIPC.sendSyncCommand ("Akahuku/getFocusedDocument", []);
  return Akahuku.getDocumentParam (focusedDocument);
};
Akahuku.getChromeEnvironmentFlags = function (browser) {
  return arAkahukuIPC.sendSyncCommand
    ("Akahuku/getChromeEnvironmentFlags", [null],
     browser.ownerGlobal);
};

//
// add/remove arAkahukuDocumentParam in both content and XUL(browser)
//
Akahuku._addDocumentParamOrig = Akahuku.addDocumentParam;
Akahuku.addDocumentParam = function (targetDocument, info) {
  Akahuku._addDocumentParamOrig (targetDocument, info);
  arAkahukuIPC.sendSyncCommand
    ("Akahuku/addDocumentParamForBrowser", [null, info],
     targetDocument.defaultView);
};
Akahuku._deleteDocumentParamOrig = Akahuku.deleteDocumentParam;
Akahuku.deleteDocumentParam = function (targetDocument) {
  // sendSyncCommand nor sendAsyncCommand with frame is not capable (why?)
  var innerWindowID = -1;
  try {
    var contextWinUtil
      = targetDocument.defaultView
      .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
      .getInterface (Components.interfaces.nsIDOMWindowUtils);
    // requires Gekco 2.0 (Firefox 4) or above
    innerWindowID = contextWinUtil.currentInnerWindowID || -1;
  }
  catch (e) { Akahuku.debug.exception (e);
  }
  arAkahukuIPC.sendAsyncCommand
    ("Akahuku/deleteDocumentParam", [innerWindowID]);
  Akahuku._deleteDocumentParamOrig (targetDocument);
};


