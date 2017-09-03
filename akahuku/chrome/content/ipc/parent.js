/**
 * This js defines IPC command in the parent process.
 */

/* global Components,
 *   Akahuku, arAkahukuCompat, arAkahukuWindow, arAkahukuCatalog,
 *   arAkahukuReload, arAkahukuClipboard, arAkahukuConfig, arAkahukuFile,
 *   arAkahukuImage, arAkahukuLink, arAkahukuMHT, arAkahukuP2P,
 *   arAkahukuQuote, arAkahukuSidebar, arAkahukuSound, arAkahukuThread,
 *   arAkahukuUI, arAkahukuIPCRoot,
 */

(function () {

var Ci = Components.interfaces;
var Cu = Components.utils;

var arAkahukuCacheIPCWrapper = {
  asyncGetHttpCacheStatus : function (source, noRedirect, callback)
  {
    var browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    var sourceObj = {
      url: source,
      contextWindow: browser.ownerDocument.defaultView.top,
    };
    Akahuku.Cache.asyncGetHttpCacheStatus (sourceObj, noRedirect, callback);
  },

  asyncOpenCache : function (source, flag, callback)
  {
    var messageManager = arAkahukuIPCRoot.messageTarget;
    var sourceObj = {
      url: source,
      contextWindow: null,
    };
    if (messageManager instanceof Ci.nsIDOMXULElement) {
      // xul:browser in remote mode
      var browser = arAkahukuIPCRoot.messageTarget;
      sourceObj.contextWindow = browser.ownerDocument.defaultView.top;
      messageManager = browser.messageManager;
    }
    var wrappedCallback = {
      onCacheEntryCheck : function (entry, appCache) {
        // (how can I send sync IPC command to a content process?)
        try {
          entry.dataSize;
        }
        catch (e) {
          if (e.result == Components.results.NS_ERROR_IN_PROGRESS) {
            return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
          }
          throw e;
        }
        return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
      },
      onCacheEntryAvailable : function (entry, isNew, appCache, status) {
        if (entry) {
          var {arCacheEntryParent}
          = Cu.import ("resource://akahuku/ipc-cache.jsm", {});
          var entryP = new arCacheEntryParent (entry);
          entryP.attachIPCMessageManager (messageManager);
          entry = entryP.createIPCTransferable ();
        }
        callback.onCacheEntryAvaiable (entry, isNew, appCache, status);
      },
      mainThreadOnly : true,
    };
    Akahuku.Cache.asyncOpenCache (sourceObj, flag, wrappedCallback);
  },

  showCacheNotification : function (browser, text) {
    browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    Akahuku.Cache.showCacheNotification (browser, text);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuCacheIPCWrapper,
   "Cache", "asyncGetHttpCacheStatus",
   {async: true, callback: 3, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuCacheIPCWrapper,
   "Cache", "showCacheNotification",
   {async: true, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuCacheIPCWrapper,
   "Cache", "asyncOpenCache",
   {async: true, callback: 3,
     callbackObjectMethod: ["onCacheEntryCheck","onCacheEntryAvaiable"]});



var arAkahukuCatalogIPCWrapper = {
  asyncFocusByThreadURI : function (uri, context, callback) {
    var result = false;
    var params = Akahuku.getDocumentParamsByURI (uri);
    if (params.length > 0) {
      try {
        var targetBrowser = params [0].targetBrowser;
        var tab = arAkahukuWindow.getTabForBrowser (targetBrowser);
        if (tab) {
          result = true;// to be success
          arAkahukuWindow.focusTabForBrowser (targetBrowser);
          if (arAkahukuCatalog.enableObserveOpenedReload) {
            arAkahukuReload.reloadOnDemandForBrowser (targetBrowser);
          }
        }
        else {
          result = false;
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    callback.apply (null, [result]);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuCatalogIPCWrapper,
   "Catalog", "asyncFocusByThreadURI",
   {async: true, callback: 3});



arAkahukuIPCRoot.defineProc
  (arAkahukuClipboard, "Clipboard", "getFile",
   {async:true, promise: true});



arAkahukuIPCRoot.defineProc
  (arAkahukuCompat.AsyncHistory,
   "CompatAsyncHistory", "isURIVisited",
   {async: true, callback: 2,
     callbackObjectMethod: "isVisited",
   });
arAkahukuIPCRoot.defineProc
  (arAkahukuCompat, "Compat", "losslessDecodeURI");
arAkahukuIPCRoot.defineProc
  (arAkahukuCompat.AddonManager,
   "CompatAddonManager", "getAddonByID",
   {async: true, callback: 2});



arAkahukuIPCRoot.defineProc
  (arAkahukuConfig, "Config", "setBoolPref");
arAkahukuIPCRoot.defineProc
  (arAkahukuConfig, "Config", "setCharPref");
arAkahukuIPCRoot.defineProc
  (arAkahukuConfig, "Config", "setIntPref");
arAkahukuIPCRoot.defineProc
  (arAkahukuConfig, "Config", "clearUserPref");
arAkahukuIPCRoot.defineProc
  (arAkahukuConfig, "Config", "setTime");
arAkahukuIPCRoot.defineProc
  (arAkahukuConfig, "Config", "restoreTime");




arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "getDirectory");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "create");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "createUnique");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "readFile");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "readBinaryFile");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "moveTo");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "remove");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "createDirectory");
var arAkahukuFileIPC = {
  createFileOutputStream : function (file, ioFlags, perm, behaviorFlags) {
    var fstream = arAkahukuFile.createFileOutputStream (file, ioFlags, perm, behaviorFlags);
    if (fstream) {
      var {arOutputStreamParent}
      = Cu.import ("resource://akahuku/ipc-stream.jsm", {});
      fstream = new arOutputStreamParent (fstream);
      var mm = arAkahukuIPCRoot.messageTarget.messageManager;
      if (!mm) { // via child process message manager
        mm = arAkahukuIPCRoot.messageTarget;
      }
      fstream.attachIPCMessageManager (mm);
      fstream = fstream.createIPCTransferable ();
    }
    return fstream;
  },
  createFileInputStream : function (file, ioFlags, perm, behaviorFlags) {
    var fstream = arAkahukuFile.createFileInputStream (file, ioFlags, perm, behaviorFlags);
    if (fstream) {
      var {arInputStreamParent}
      = Cu.import ("resource://akahuku/ipc-stream.jsm", {});
      fstream = new arInputStreamParent (fstream);
      var mm = arAkahukuIPCRoot.messageTarget.messageManager;
      if (!mm) { // via child process message manager
        mm = arAkahukuIPCRoot.messageTarget;
      }
      fstream.attachIPCMessageManager (mm);
      fstream = fstream.createIPCTransferable ();
    }
    return fstream;
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuFileIPC, "File", "createFileOutputStream");
arAkahukuIPCRoot.defineProc
  (arAkahukuFileIPC, "File", "createFileInputStream");



var arAkahukuImageIPC = {
  openXULSaveImagePopup : function (node, rect, x, y) {
    // messageTarget is <xul:browser> in the chrome process.
    var window = arAkahukuIPCRoot.messageTarget.ownerDocument.defaultView;
    arAkahukuImage.openXULSaveImagePopup (null, rect, x, y, window);
  },
  asyncOpenSaveImageFilePicker : function (browser, filename, dirname, callback) {
    // replace actual browser for message
    browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    arAkahukuImage.asyncOpenSaveImageFilePicker
      (browser, filename, dirname, callback);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuImageIPC,
   "Image", "openXULSaveImagePopup",
   {async: true, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuImageIPC,
   "Image", "asyncOpenSaveImageFilePicker",
   {async: true, callback: 4, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuImage,
   "Image", "asyncSaveImageToFile",
   {async: true, callback: 4});



var arAkahukuLinkIPCWrapper = {
  openLinkInXUL : function (href, to, focus, target, isPrivate) {
    var browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    arAkahukuLink.openLinkInXUL
      (href, to, focus, browser, isPrivate);
  },
  makeURLSafeInNoscript : function (targetUrl, docUrl, browser) {
    browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    arAkahukuLink.makeURLSafeInNoscript (targetUrl, docUrl, browser);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuLinkIPCWrapper, "Link", "openLinkInXUL",
   {async: true, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuLinkIPCWrapper, "Link", "makeURLSafeInNoscript",
   {async: false, frame: true});



var arAkahukuMHTIPCWrapper = {
  asyncOpenSaveMHTFilePicker : function (browser, filename, dirname_base, callback)
  {
    // replace actual browser for message
    browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    arAkahukuMHT.asyncOpenSaveMHTFilePicker
      (browser, filename, dirname_base, callback);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuMHTIPCWrapper,
   "MHT", "asyncOpenSaveMHTFilePicker",
   {async: true, callback: 4, frame: true});



arAkahukuIPCRoot.defineProc
  (arAkahukuP2P, "P2P", "deleteCacheFiles", {async: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuP2P, "P2P", "update", {async: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuP2P, "P2P", "updateStatusbar", {async: true});



var arAkahukuQuoteIPC = {
  searchInNewTabXUL : function (href, focus, browser) {
    browser = arAkahukuIPCRoot.messageTarget;
    arAkahukuQuote.searchInNewTabXUL (href, focus, browser);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuQuoteIPC,
   "Quote", "searchInNewTabXUL",
   {async: true, frame: true});



var arAkahukuSidebarIPC = {
  hasTabForBoard : function (name, browser) {
    browser = arAkahukuIPCRoot.messageTarget;
    return arAkahukuSidebar.hasTabForBoard (name, browser);
  },
  hasBoard : function (name, browser) {
    browser = arAkahukuIPCRoot.messageTarget;
    return arAkahukuSidebar.hasBoard (name, browser);
  },
  getThread : function (boardName, threadNumber, browser) {
    browser = arAkahukuIPCRoot.messageTarget;
    return arAkahukuSidebar.getThread (boardName, threadNumber, browser);
  },
  resetCatalogOrder : function (name, browser) {
    browser = arAkahukuIPCRoot.messageTarget;
    return arAkahukuSidebar.resetCatalogOrder (name, browser);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuSidebar, "Sidebar", "updateThreadItem", {async: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuSidebarIPC, "Sidebar", "hasTabForBoard", {frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuSidebarIPC, "Sidebar", "hasBoard", {frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuSidebarIPC, "Sidebar", "getThread", {frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuSidebar, "Sidebar", "asyncUpdateVisited", {async: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuSidebarIPC, "Sidebar", "resetCatalogOrder", {frame: true});



var arAkahukuSoundIPCHelper = {
  play : function (uri) {
    if (!arAkahukuSound.sound) {
      arAkahukuSound.init ();
    }
    arAkahukuSound.sound.play (uri);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuSoundIPCHelper, "Sound", "play", {async: true});



var arAkahukuThreadIPC = {
  setTabIconForWindow : function (targetContentWindow, prop) {
    arAkahukuThread.setTabIconForBrowser (arAkahukuIPCRoot.messageTarget, prop);
  },
  resetTabIconForWindow : function (targetContentWindow) {
    arAkahukuThread.resetTabIconForBrowser (arAkahukuIPCRoot.messageTarget);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuThreadIPC,
   "Thread", "setTabIconForWindow",
   {async: false, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuThreadIPC,
   "Thread", "resetTabIconForWindow",
   {async: true, callback: 0, frame: true});



var arAkahukuUIIPC = {
  setStatusPanelText : function (text, type) {
    var browser = arAkahukuIPCRoot.messageTarget;
    arAkahukuUI.setStatusPanelText (text, type, browser);
  },
  clearStatusPanelText : function (text) {
    var browser = arAkahukuIPCRoot.messageTarget;
    arAkahukuUI.clearStatusPanelText (text, browser);
  },
  getStatusPanelText : function () {
    var browser = arAkahukuIPCRoot.messageTarget;
    arAkahukuUI.getStatusPanelText (browser);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuUI, "UI", "setContextMenuContentData");
arAkahukuIPCRoot.defineProc
  (arAkahukuUIIPC,
   "UI", "setStatusPanelText",
   {async: false, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuUIIPC,
   "UI", "clearStatusPanelText",
   {async: false, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuUIIPC,
   "UI", "getStatusPanelText",
   {async: false, callback: 0, frame: true});




var arAkahukuWindowIPC = {
  focusTabForWindow : function (targetContentWindow) {
    arAkahukuWindow.focusTabForBrowser (arAkahukuIPCRoot.messageTarget);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuWindowIPC,
   "Window", "focusTabForWindow",
   {async: true, callback: 0, frame: true});



// In e10s XUL, document params are registered by linking its browser.
var AkahukuIPCWrapper = {
  addDocumentParamForBrowser : function (targetBrowser, info) {
    Akahuku.addDocumentParamForBrowser (arAkahukuIPCRoot.messageTarget, info);
  },
  deleteDocumentParam : function (innerWindowID) {
    Akahuku.deleteDocumentParam (innerWindowID);
  },

  getChromeEnvironmentFlags : function (browser) {
    browser = arAkahukuIPCRoot.messageTarget;
    return Akahuku.getChromeEnvironmentFlags (browser);
  },

  // utiliy IPC command
  getFocusedDocument : function () {
    var window = arAkahukuWindow.getMostRecentWindow ();
    var focusedBrowser = window.document.commandDispatcher.focusedElement;
    if (!focusedBrowser
        || !(focusedBrowser instanceof Components.interfaces.nsIDOMXULElement)
        || !/(?:xul:)?browser/i.test (focusedBrowser.nodeName)) {
      return null;
    }
    return focusedBrowser.contentDocumentAsCPOW;
  },
  setDocumentParamFlag : function (name, value) {
    var browser = arAkahukuIPCRoot.messageTarget;
    var param = Akahuku.getDocumentParam (browser);
    if (param) {
      param.flags [name] = value;
    }
  },
  unsetDocumentParamFlag : function (name) {
    var browser = arAkahukuIPCRoot.messageTarget;
    var param = Akahuku.getDocumentParam (browser);
    if (param) {
      delete param.flags [name];
    }
  },
};
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "addDocumentParamForBrowser", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "deleteDocumentParam", {frame: false, async:true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "getFocusedDocument", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "getChromeEnvironmentFlags", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "setDocumentParamFlag", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "unsetDocumentParamFlag", {frame: true});



// Special methods for the parent process
var AkahukuIPCSpecial = {
  hasDocumentParamForURIAsync : function (url, callback) {
    var ret = Akahuku.hasDocumentParamForURI (url);
    callback.apply (null, [ret]);
  },
};
arAkahukuIPCRoot.defineProc
  (AkahukuIPCSpecial, "Akahuku", "hasDocumentParamForURIAsync",
   {async: true, callback: 2});



})();

