
(function () {

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
    var browser = arAkahukuIPCRoot.messageTarget;//is xul:browser
    var sourceObj = {
      url: source,
      contextWindow: browser.ownerDocument.defaultView.top,
    };
    var wrappedCallback = {
      onCacheEntryCheck : function (entry, appCache) {
        // (how can I send sync IPC command to a content process?)
        try {
          entry.dataSize;
        }
        catch (e if e.result == Components.results.NS_ERROR_IN_PROGRESS) {
          return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
        }
        return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
      },
      onCacheEntryAvailable : function (entry, isNew, appCache, status) {
        if (entry) {
          Cu.import ("resource://akahuku/ipc-cache.jsm");
          var entryP = new arCacheEntryParent (entry);
          entryP.attachIPCMessageManager (browser.messageManager);
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
   {async: true, callback: 3, frame: true,
     callbackObjectMethod: ["onCacheEntryCheck","onCacheEntryAvaiable"]});



arAkahukuIPCRoot.defineProc
  (arAkahukuClipboard, "Clipboard", "getFile");



arAkahukuIPCRoot.defineProc
  (arAkahukuCompat.AsyncHistory,
   "CompatAsyncHistory", "isURIVisited",
   {async: true, callback: 2,
     callbackObjectMethod: "isVisited",
   });
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
  (arAkahukuFile, "File", "getDirectory");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "createFile");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "asyncCreateFile",
   {async: true, callback: 3});
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
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "getFilenameFromURLSpec");
arAkahukuIPCRoot.defineProc
  (arAkahukuFile, "File", "getFileFromURLSpec");
var arAkahukuFileIPC = {
  createFileOutputStream : function (file, ioFlags, perm, behaviorFlags) {
    var fstream = arAkahukuFile.createFileOutputStream (file, ioFlags, perm, behaviorFlags);
    if (fstream) {
      Cu.import ("resource://akahuku/ipc-stream.jsm");
      fstream = new arOutputStreamParent (fstream);
      var mm = arAkahukuIPCRoot.messageTarget.messageManager;
      fstream.attachIPCMessageManager (mm);
      fstream = fstream.createIPCTransferable ();
    }
    return fstream;
  },
  createFileInputStream : function (file, ioFlags, perm, behaviorFlags) {
    var fstream = arAkahukuFile.createFileInputStream (file, ioFlags, perm, behaviorFlags);
    if (fstream) {
      Cu.import ("resource://akahuku/ipc-stream.jsm");
      fstream = new arInputStreamParent (fstream);
      var mm = arAkahukuIPCRoot.messageTarget.messageManager;
      fstream.attachIPCMessageManager (mm);
      fstream = fstream.createIPCTransferable ();
    }
    return fstream;
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuFileIPC, "File", "createFileOutputStream", {frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuFileIPC, "File", "createFileInputStream", {frame: true});



var arAkahukuImageIPC = {
  openXULSaveImagePopup : function (node, rect, x, y) {
    // store mm to be responsed when command is called
    // for future use in selectSaveImageDirFromXUL.
    // messageTarget is <xul:browser> in the chrome process.
    this.popupFrame = arAkahukuIPCRoot.messageTarget.messageManager;
    arAkahukuImage.openXULSaveImagePopup (node, rect, x, y);
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
arAkahukuImage.selectSaveImageDirFromXUL = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Image/selectSaveImageDirFromXUL", arguments,
     arAkahukuImageIPC.popupFrame);
  arAkahukuImageIPC.popupFrame = null;
};
arAkahukuIPCRoot.defineProc
  (arAkahukuImage,
   "Image", "asyncSaveImageToFile",
   {async: true, callback: 4});



arAkahukuJPEG.openThumbnail = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("JPEG/openThumbnail", 
     [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuJPEG.closeThumbnail = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("JPEG/closeThumbnail", 
     [gContextMenu.target],
     gContextMenu.browser.messageManager);
};



arAkahukuLink.setExt = function (type, ext) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/setExt", [type, ext, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.addUser = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/addUser", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.openLink = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/openLink", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.saveLink = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/saveLink", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.copyLink = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/copyLink", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.openAsAutoLink = function (event) {
  var eventDummy = {shiftKey: event.shiftKey}; // minimum requirements
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/openAsAutoLink", [eventDummy, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuIPCRoot.defineProc
  (arAkahukuLink, "Link", "openLinkInXUL",
   {async: true, callback: 0, frame: true});



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



arAkahukuP2P.deleteCache = function (optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("P2P/deleteCache", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuIPCRoot.defineProc
  (arAkahukuQuote, "P2P", "deleteCacheFiles");



arAkahukuQuote.quote = function (addQuotePrefix, focusTextArea, optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quote", [addQuotePrefix, focusTextArea, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.quoteToMailBox = function (focusMailBox, optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quoteToMailBox", [focusMailBox, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.quoteToNameBox = function (focusNameBox, optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quoteToNameBox", [focusNameBox, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.googleImage = function (optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/googleImage", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.wikipedia = function (optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/wikipedia", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuIPCRoot.defineProc
  (arAkahukuQuote, "Quote", "searchInNewTabXUL", {async: true});



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

arAkahukuThread.showResPanel = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Thread/showResPanel", [],
     gBrowser.selectedBrowser.messageManager);
};
arAkahukuThread.closeResPanel = function (targetDocument) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Thread/closeResPanel", [],
     gBrowser.selectedBrowser.messageManager);
};


arAkahukuIPCRoot.defineProc
  (arAkahukuUI,
   "UI", "setStatusPanelText",
   {async: false, callback: 0, frame: false});
arAkahukuIPCRoot.defineProc
  (arAkahukuUI,
   "UI", "clearStatusPanelText",
   {async: false, callback: 0, frame: false});
arAkahukuIPCRoot.defineProc
  (arAkahukuUI,
   "UI", "getStatusPanelText",
   {async: false, callback: 0, frame: false});




var arAkahukuWindowIPC = {
  focusTabForWindow : function (targetContentWindow) {
    arAkahukuWindow.focusTabForBrowser (arAkahukuIPCRoot.messageTarget);
  },
};
arAkahukuIPCRoot.defineProc
  (arAkahukuWindowIPC,
   "Window", "focusTabForWindow",
   {async: true, callback: 0, frame: true});



function broadcastNavHistoryMessage (eventName, aURI) {
  switch (eventName) {
    case "ClearHistory":
    case "DeleteURI":
    case "EndUpdateBatch":
    case "Visit":
      arAkahukuIPCRoot.broadcastAsyncCommandToChildProcesses
        ("NavHistoryObserver/observe", [eventName, aURI]);
      break;
    default:
      Akahuku.debug.error
        ("invalid name for broadcastNavHistoryMessage; "+eventName);
  }
}
arAkahukuCatalog.onClearHistory = function () {
  broadcastNavHistoryMessage ("ClearHistory");
};
arAkahukuCatalog.onDeleteURI = function (aURI, aGUID) {
  broadcastNavHistoryMessage ("DeleteURI", aURI);
};
arAkahukuCatalog.onDeleteVisits = function (aURI, aVisitTime, aGUID) {
  broadcastNavHistoryMessage ("DeleteVisits", aURI);
};
arAkahukuCatalog.onEndUpdateBatch = function () {
  broadcastNavHistoryMessage ("EndUpdateBatch");
};
arAkahukuCatalog.onVisit = function (aURI, aVisitID, aTime, aSessionID,
    aReferringID, aTransitionType, aGUID) {
  broadcastNavHistoryMessage ("Visit", aURI);
};
arAkahukuLink.onVisit = function (aURI, aVisitID, aTime, aSessionID,
    aReferringID, aTransitionType, aGUID) {
  broadcastNavHistoryMessage ("Visit", aURI);
};



//
// In XUL, document params are registered by linking its browser.
//
Akahuku.addDocumentParam = function (targetBrowser, info) {
  var documentParam = new arAkahukuDocumentParam ();
  documentParam.targetBrowser = targetBrowser;
  documentParam.targetDocument = {
    // dummy fo getDocumentParamsByURI
    documentURIObject: targetBrowser.currentURI.clone (),
  };
  documentParam.location_info = info;
  documentParam.flags = {}; // only available in the main process
  Akahuku.documentParams.push (documentParam);
  Akahuku.latestParam = documentParam;
};
Akahuku.removeDocumentParam = function (targetBrowser) {
  for (var i = 0; i < Akahuku.documentParams.length; i ++) {
    var tmp = Akahuku.documentParams [i];
    if (tmp.targetBrowser == targetBrowser) {
      Akahuku.documentParams.splice (i, 1);
      tmp.targetBrowser = null;
      tmp.targetDocument = null;
      tmp.location_info = null;
      tmp = null;
      break;
    }
  }
  Akahuku.latestParam = null;
};
Akahuku.getDocumentParam = function (targetBrowser) {
  if (targetBrowser
      && !targetBrowser instanceof Components.interfaces.nsIDOMXULDocument
      && targetBrowser instanceof Components.interfaces.nsIDOMDocument) {
    // content document as CPOW
    var targetDocument = targetBrowser;
    targetBrowser = null;
    var tabbrowser = document.getElementById ("content");
    var numTabs = tabbrowser.tabs.length;
    for (var i = 0; i < numTabs; i ++) {
      var browser = tabbrowser.getBrowserForTab (tabbrowser.tabs [i]);
      if (browser.contentDocumentAsCPOW === targetDocument) {
        targetBrowser = browser;
        break;
      }
    }
  }
  if (!targetBrowser) {
    return null;
  }
  for (var i = 0; i < Akahuku.documentParams.length; i ++) {
    if (Akahuku.documentParams [i].targetBrowser == targetBrowser) {
      return Akahuku.documentParams [i];
    }
  }
  return null;
};
Akahuku.getFocusedDocumentParam = function () {
  var focusedBrowser = document.commandDispatcher.focusedElement;
  if (!focusedBrowser
      || !focusedBrowser instanceof Components.interfaces.nsIDOMXULElement
      || !/(?:xul:)?browser/i.test (focusedBrowser.nodeName)) {
    return null;
  }
  return Akahuku.getDocumentParam (focusedBrowser);
};
var AkahukuIPCWrapper = {
  addDocumentParam : function (targetBrowser, info) {
    Akahuku.addDocumentParam (arAkahukuIPCRoot.messageTarget, info);
  },
  removeDocumentParam : function (targetBrowser) {
    Akahuku.removeDocumentParam (arAkahukuIPCRoot.messageTarget);
  },

  // utiliy IPC command
  getFocusedDocument : function () {
    var focusedBrowser = document.commandDispatcher.focusedElement;
    if (!focusedBrowser
        || !focusedBrowser instanceof Components.interfaces.nsIDOMXULElement
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
  (AkahukuIPCWrapper, "Akahuku", "addDocumentParam", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "removeDocumentParam", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "getFocusedDocument", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "setDocumentParamFlag", {frame: true});
arAkahukuIPCRoot.defineProc
  (AkahukuIPCWrapper, "Akahuku", "unsetDocumentParamFlag", {frame: true});

arAkahukuUI.getFocusedDocumentInfo = function () {
  var param = Akahuku.getFocusedDocumentParam ();
  var focusedBrowser = param ? param.targetBrowser : null;
  var info = {
    isAkahukuApplied: param != null,
    isAbleToAddExternal: param == null && focusedBrowser
      && arAkahukuBoard.isAbleToAddExternal (focusedBrowser.currentURI.spec),
    isRespanelOpenable: param && param.location_info.isReply,
    isRespanelOpened: param && param.flags.respanel_param,
    isRespanelOrphaned: false,
    targetDocument: null,
  };
  return info;
};


})();

