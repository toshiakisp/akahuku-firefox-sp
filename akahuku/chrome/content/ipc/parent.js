/**
 * This js defines IPC command in the parent process.
 */

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
        catch (e if e.result == Components.results.NS_ERROR_IN_PROGRESS) {
          return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
        }
        return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
      },
      onCacheEntryAvailable : function (entry, isNew, appCache, status) {
        if (entry) {
          Cu.import ("resource://akahuku/ipc-cache.jsm");
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



arAkahukuIPCRoot.defineProc
  (arAkahukuClipboard, "Clipboard", "getFile");



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
  (arAkahukuFile, "File", "getDirectory");
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
      Cu.import ("resource://akahuku/ipc-stream.jsm");
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
    // store mm to be responsed when command is called
    // for future use in selectSaveImageDirFromXUL.
    // messageTarget is <xul:browser> in the chrome process.
    arAkahukuImage.__IPC_popupFrame
      = arAkahukuIPCRoot.messageTarget.messageManager;
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
arAkahukuIPCRoot.defineProc
  (arAkahukuImage,
   "Image", "asyncSaveImageToFile",
   {async: true, callback: 4});
arAkahukuIPCRoot.defineProc
  (arAkahukuImage, "Image", "setContextMenuContentData");



arAkahukuIPCRoot.defineProc
  (arAkahukuJPEG, "JPEG", "setContextMenuContentData");



arAkahukuIPCRoot.defineProc
  (arAkahukuLink, "Link", "openLinkInXUL",
   {async: true, callback: 0, frame: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuLink, "Link", "setContextMenuContentData");



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
  (arAkahukuP2P, "P2P", "setContextMenuContentData");
arAkahukuIPCRoot.defineProc
  (arAkahukuP2P, "P2P", "deleteCacheFiles", {async: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuP2P, "P2P", "update", {async: true});
arAkahukuIPCRoot.defineProc
  (arAkahukuP2P, "P2P", "updateStatusbar", {async: true});



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



// In e10s XUL, document params are registered by linking its browser.
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



})();

