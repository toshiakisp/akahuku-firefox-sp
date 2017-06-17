
/**
 * Firefox/Gecko バージョン間の差異を吸収する
 */
var arAkahukuCompat = new function () {
  function _getArg (args, name, defaultValue) {
    if (name in args) {
      return args [name];
    }
    return defaultValue;
  }

  const Ci = Components.interfaces;
  const Cc = Components.classes;
  const Cr = Components.results;
  const Cu = Components.utils;

  this.compareVersion = function (v1, v2) {
    try {
      // Gecko 1.8+
      var vc = Cc ["@mozilla.org/xpcom/version-comparator;1"]
        .getService (Ci.nsIVersionComparator);
      return vc.compare (v1, v2);
    }
    catch (e) {
      return -1; // 1.8より前ではやっつけ
    }
  };
  this.comparePlatformVersion = function (v) {
    try {
      // Gecko 1.8+
      var ai = Cc ["@mozilla.org/xre/app-info;1"]
        .getService (Ci.nsIXULAppInfo);
      var platformVersion = ai.platformVersion;
      if (ai.ID === "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}") {
        // For compatibility with Pale moon 26+ (includes 25),
        // > When wanting to provide Goanna compatibility, you should use
        // > the application version for an equivalent check on "rough
        // > Firefox range compatibility".
        // (https://forum.palemoon.org/viewtopic.php?t=9077)
        platformVersion = ai.version;
      }
      return arAkahukuCompat.compareVersion (platformVersion, v);
    }
    catch (e) {
      return -1; // 1.8より前ではやっつけ
    }
  };

  this.getPlatformType = function () {
    try {
      // Gecko 1.8+
      var ai = Cc ["@mozilla.org/xre/app-info;1"]
        .getService (Ci.nsIXULAppInfo);
      if (ai.ID === "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}") {
        return "Goanna";
      }
    }
    catch (e) {
    }
    return "Gecko";
  };

  this.WebBrowserPersist = {
    _versionChecked : false,
    _version3_6: false,
    _version18 : false,
    _version36 : false,

    saveURI : function (webBrowserPersist, args) {
      if (!this._versionChecked) {
        this._versionChecked = true;
        this._version36 = arAkahukuCompat.comparePlatformVersion ("35.*") > 0;
        this._version18 = arAkahukuCompat.comparePlatformVersion ("17.*") > 0;
        this._version3_6 = arAkahukuCompat.comparePlatformVersion ("1.9.2") >= 0;
        if (arAkahukuCompat.getPlatformType () === "Goanna"
            && arAkahukuCompat.comparePlatformVersion ("27.0") >= 0) {
          // Palemoon 27+ has newer API
          this._version36 = true;
        }
      }

      var uri = _getArg (args, 'uri', null);
      var file = _getArg (args, 'file', null);
      var postData = _getArg (args, 'postData', null);
      var cacheKey = _getArg (args, 'cacheKey', null);
      var referrer = _getArg (args, 'referrer', null);
      var referrerPolicy = _getArg (args, 'referrerPolicy', 0); // REFERRER_POLICY_NO_REFERRER_WHEN_DOWNGRADE
      var extraHeaders = _getArg (args, 'extraHeaders', null);
      var privacyContext = _getArg (args, 'privacyContext', null);

      var usePrivacyAware = false;
      if (privacyContext == null && args.hasOwnProperty ("isPrivate")) {
        var isPrivate = _getArg (args, 'isPrivate', false);
        var usePrivacyAware = true;
      }

      if (this._version36) {
        // Firefox 36
        if (usePrivacyAware) {
          webBrowserPersist.savePrivacyAwareURI
            (uri, cacheKey, referrer, referrerPolicy, postData,
             extraHeaders, file, isPrivate);
        }
        else {
          webBrowserPersist.saveURI
            (uri, cacheKey, referrer, referrerPolicy, postData,
             extraHeaders, file, privacyContext);
        }
      }
      else if (this._version18) {
        // Firefox 18.0+
        if (usePrivacyAware) {
          webBrowserPersist.savePrivacyAwareURI
            (uri, cacheKey, referrer, postData,
             extraHeaders, file, isPrivate);
        }
        else {
          webBrowserPersist.saveURI
            (uri, cacheKey, referrer, postData,
             extraHeaders, file, privacyContext);
        }
      }
      else if (this._version3_6) {
        // Firefox 3.6?-17.0
        webBrowserPersist.saveURI
          (uri, cacheKey, referrer, postData,
           extraHeaders, file);
      }
      else {
        // oldest version?
        webBrowserPersist.saveURI (uri, postData, file);
      }
    },
  };

  this.FilePicker = new function () {
    // Fx17 から nsIFilePicker.show() は obsolete になり
    // コールバックを取る非同期な open() が新設された [Bug 731307]。
    // そこで非同期なインタフェースに統一し、
    // 古い環境では非同期呼び出しを模擬することで動作させる。
    this.open = function (picker, callback) {
      if (typeof picker.open !== "function") {
        _asyncShow (picker, callback);
        return;
      }
      if (typeof callback === "function") {
        // nsIFilePickerShownCallback
        var callbackFunc = callback;
        callback = {done : callbackFunc};
      }
      picker.open (callback);
    };

    function _asyncShow (picker, callback) {
      var tm
        = Components.classes ["@mozilla.org/thread-manager;1"]
        .getService (Components.interfaces.nsIThreadManager);
      tm.currentThread.dispatch ({
        run : function () {
          var ret = Components.interfaces.nsIFilePicker.returnCancel;
          try {
            ret = picker.show ();
          }
          catch (e) {
          }
          if (typeof callback === "function") {
            var args = [ret];
            callback.apply (null, args);
          }
          else {
            callback.done (ret);
          }
        }
      }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
    };
  };

  this.AsyncHistory = new function () {
    this.isURIVisited = function (uri, callback) {
      this._lazyInit ();
      return this.isURIVisited (uri, callback);
    };
  };
  this.AsyncHistory._lazyInit = function () {
    // 履歴の調査を非同期的なAPIに統一する
    // mozIAsyncHistory.isURIVisited
    if ("@mozilla.org/browser/history;1" in Cc) {
      var asyncHistory
        = Cc ["@mozilla.org/browser/history;1"]
        .getService (Ci.mozIAsyncHistory);
      if ("isURIVisited" in asyncHistory) { // Gecko 11.0+
        this.isURIVisited = asyncHistory.isURIVisited;
      }
      else {
        asyncHistory = null;
      }
    }
    if (!asyncHistory) {
      // async compatibles using sync interfaces
      if ("@mozilla.org/browser/global-history;2" in Cc) {
        var gh2 = Cc ["@mozilla.org/browser/global-history;2"]
          .getService (Ci.nsIBrowserHistory);
        this.isURIVisited = function (uri, callback) {
          callback.isVisited (uri, gh2.isVisited (uri));
        };
      }
      else if ("@mozilla.org/browser/global-history;1" in Cc) {
        var gh1
          = Cc ["@mozilla.org/browser/global-history;1"]
          .getService (Ci.nsIBrowserHistory);
        this.isURIVisited = function (uri, callback) {
          callback.isVisited (uri, gh1.isVisited (uri.spec));
        };
      }
      else {
        // dummy definition
        this.isURIVisited = function (uri, callback) {
          if (callback && "isVisited" in callback) {
            callback.isVisited (uri, false);
          }
        };
      }
    }
  };

  this.gBrowser = new function () {
    this.getStatusPanel = function () {
      try {
        // since Firefox 26.0a1 [Bug 821687 (mozilla.org)]
        return gBrowser.getStatusPanel ();
      }
      catch (e) {
      }
      if (typeof document !== "undefined"
          && document instanceof Ci.nsIDOMXULDocument) {
        return document.getElementById ("statusbar-display");
      }
      else {
        return null;
      }
    };
  };

  this.Document = new function () {
    /**
     * Document.activeElement [LS]
     * (Basic support at Firefox 3.0 (Gecko 1.9.0))
     */
    function activeElementReal (targetDocument) {
      return targetDocument.activeElement;
    }
    function activeElementCompat (targetDocument) {
      // Note: this code requires running in XUL browser.
      var focusedElement = document.commandDispatcher.focusedElement;
      if (focusedElement && focusedElement.ownerDocument === targetDocument) {
        return focusedElement;
      }
      return targetDocument;
    }
    this.activeElement = function (targetDocument) {
      // on-demand initialization
      if (arAkahukuCompat.comparePlatformVersion ("1.9.0") >= 0) {
        this.activeElement = activeElementReal;
      }
      else {
        this.activeElement = activeElementCompat;
      }
      return this.activeElement (targetDocument);
    }
  };
  this.HTMLInputElement = {
    /**
     * Wrap mozSetFileArray since Firefox 38 [Bug 1068838]
     * required for e10s content process
     *
     * @param filebox HTMLInputElement
     * @param file  a url string, nsIFile, or File
     * @param callback Function
     */
    mozSetFile : function (filebox, file, callback) {
      if (!(filebox instanceof Ci.nsIDOMHTMLInputElement
          && filebox.type == "file")) {
        throw Components.Exception (
            "must be called for nsIDOMHTMLInputElement type=file",
            Cr.NS_ERROR_NO_INTERFACE, Components.stack.caller)
      }
      if (!file) {
        filebox.value = "";
      }
      else {
        if (typeof file == "string") {
          file = arAkahukuFile.initFile (
              arAkahukuFile.getFilenameFromURLSpec (file));
        }
        if ("mozSetFileArray" in filebox) { // since Firefox 38 [Bug 1068838]
          if (typeof File == "undefined") {
            // necessary for frame scripts, requiring Firefox 28 and up
            Components.utils.importGlobalProperties (["File"]);
          }
          if (!(file instanceof File)) {
            arAkahukuCompat.createFileFromNsIFile (file, function (domfile) {
              filebox.mozSetFileArray ([domfile]);
              if (typeof callback === "function") {
                callback.apply (null, []);
              }
            });
            return;
          }
          else {
            filebox.mozSetFileArray ([file]);
          }
        }
        else if ("mozSetFileNameArray" in filebox) {
          filebox.mozSetFileNameArray ([file.path], 1);
        }
        else {
          // classic way
          filebox.value = arAkahukuFile.getURLSpecFromFile (file);
        }
      }
      // Call directly callback after classical sync operations
      if (typeof callback === "function") {
        callback.apply (null, []);
      }
    },
  };

  /**
   * Async File.createFromNsIFile
   * (requires Fx6+, not ready for content processes)
   */
  this.createFileFromNsIFile = function (localfile, callback) {
    if (typeof File == "undefined") {
      // necessary for frame scripts, requiring Firefox 28 and up
      Components.utils.importGlobalProperties (["File"]);
    }
    if (typeof File.createFromNsIFile !== "undefined") {
      // Firefox 52.0+ (Bug 1303518)
      var file = File.createFromNsIFile (localfile);
      if (!(file instanceof File) && "then" in file) {
        // 54.0+: createFromNsIFile returns a Promise (Bug 1335536)
        file.then (function (file) {
          callback.apply (null, [file]);
        });
        return;
      }
    }
    else {
      // Gecko (6.0)-51.0
      file = new File (file);
      callback.apply (null, [file]);
    }
  };


  this.losslessDecodeURI = function (uri) {
    if (typeof window !== "undefined"
        && "losslessDecodeURI" in window) {
      try {
        return window.losslessDecodeURI (uri);
      }
      catch (e) { Cu.reportError (e);
      }
    }
    return uri.spec;
  };

  this.AddonManager = new function () {
    this.getAddonByID = function (id, callback) {
      try {
        var scope = {};
        Cu.import ("resource://gre/modules/AddonManager.jsm", scope);
        this.getAddonByID = scope.AddonManager.getAddonByID;
        this.getAddonByID (id, callback);
      }
      catch (e if e.result == Cr.NS_ERROR_FILE_NOT_FOUND) {
        this.getAddonByID = function getAddonByIDCompat (id, callback) {
          // obsolete gecko 2.0
          var extMan = Cc ["@mozilla.org/extensions/manager;1"]
            .getService (Ci.nsIExtensionManager);
          var ext = extMan.getItemForID (id);
          if (!(ext instanceof Ci.nsIUpdateItem)) {
            ext = null;
          }
          var addon = { // only for Akahuku's neccessity
            id: ext ? ext.id : "",
            version: ext ? ext.version : "",
            name: ext ? ext.name : "",
            isActive: ext ? true : false,
          };
          callback (addon);
        };
      }
      catch (e) {
        Cu.reportError (e);
      }
    }
  };


  // Cache service v2
  
  var CacheStorage = {
    // Constants of nsICacheStorage for compatiblility
    OPEN_NORMALLY : 0,
    OPEN_TRUNCATE : 1 << 0,
    OPEN_READONLY : 1 << 1,
    OPEN_PRIORITY : 1 << 2,
    OPEN_BYPASS_IF_BUSY : 1 << 31,
  };
  if ("nsICacheStorage" in Ci) {
    CacheStorage = Ci.nsICacheStorage;
  }
  this.CacheStorage = CacheStorage;
  var CacheEntryOpenCallback = {
    // Constants of nsICacheStorage for compatiblility
    ENTRY_WANTED : 0,
    RECHECK_AFTER_WRITE_FINISHED : 1,
    ENTRY_NEEDS_REVALIDATION : 2,
    ENTRY_NOT_WANTED : 3,
  };
  if ("nsICacheEntryOpenCallback" in Ci) {
    CacheEntryOpenCallback = Ci.nsICacheEntryOpenCallback;
  }
  this.CacheEntryOpenCallback = CacheEntryOpenCallback;

  // nsICacheSession を nsICacheStorage のようにラップする
  var CacheSessionWrapper = function (session, loadContextInfo, lookupAppCache) {
    this._session = session;
    this._lcinfo = loadContextInfo;
    this._lookup = lookupAppCache;
  };
  CacheSessionWrapper.prototype = {
    asyncOpenURI : function (uri, id, flag, callback) {
      var accessMode = Ci.nsICache.ACCESS_READ_WRITE;
      if (flag & CacheStorage.OPEN_READONLY) {
        accessMode = Ci.nsICache.ACCESS_READ;
      }
      else if (flag & CacheStorage.OPEN_TRUNCATE) {
        accessMode = Ci.nsICache.ACCESS_WRITE;
      }
      var wrappedcb = {
        // nsICacheListener.onCacheEntryAvailable 
        onCacheEntryAvailable : function (descriptor, accessGranted, result) {
          // nsICacheEntry と nsICacheDescriptor は等価と思っておく
          var entry = descriptor;
          var appCache = null;
          var check = CacheEntryOpenCallback.ENTRY_WANTED;
          if (entry) {
            check = callback.onCacheEntryCheck (entry, appCache);
          }
          if (check === CacheEntryOpenCallback.ENTRY_WANTED) {
            var isNew = (accessGranted == Ci.nsICache.ACCESS_WRITE); //OK?
            callback.onCacheEntryAvailable (entry, isNew, appCache, result);
          }
          else {
            result = Cr.NS_ERROR_CACHE_KEY_NOT_FOUND;
            callback.onCacheEntryAvailable (null, false, appCache, result);
          }
        },
      };
      this._session.doomEntriesIfExpired = false;
      try {
        this._session.asyncOpenCacheEntry (uri.spec, accessMode, wrappedcb);
      }
      catch (e if e.result === Cr.NS_ERROR_CACHE_KEY_NOT_FOUND) {
        // fake async call
        arAkahukuUtil.executeSoon (function () {
          wrappedcb.onCacheEntryAvailable (null, false, e.result);
        });
      }
    },
    // 
  };

  this.CacheStorageService = new function () {
    if ("@mozilla.org/netwerk/cache-storage-service;1" in Cc) {
      // Initialize for HTTP cache v2
      this._version = 2;
      this._cacheService
        = Cc ["@mozilla.org/netwerk/cache-storage-service;1"]
        .getService (Ci.nsICacheStorageService);
      this.CallbackInterface = Ci.nsICacheEntryOpenCallback;
    }
    else {
      this._version = 1;
      this._cacheService
        = Cc ["@mozilla.org/network/cache-service;1"]
        .getService (Ci.nsICacheService);
      this.CallbackInterface = Ci.nsICacheListener;
    }

    // v1: nsICacheSession nsICacheService.createSession を
    // v2: nsICacheStorage nsICacheStorageService.diskCacheStorage
    // のように見せかける
    this.diskCacheStorage = function (loadContextInfo, lookupAppCache) {
      if (this._version === 1) {
        var session
          = this._cacheService.createSession
          ("HTTP", Ci.nsICache.STORE_ANYWHERE, Ci.nsICache.STREAM_BASED);
        return new CacheSessionWrapper (session, loadContextInfo, lookupAppCache);
      }
      return this._cacheService.diskCacheStorage (loadContextInfo, lookupAppCache);
    };
  };

  try {
    var scope = {};
    Cu.import ("resource://gre/modules/LoadContextInfo.jsm", scope);
    this.LoadContextInfo = scope.LoadContextInfo;
  }
  catch (e) {
    this.LoadContextInfo = { }; // dummy
  }

  this.UnMHT = new function () {
    function getRootContentLocation_8 (url) {
      // UnMHT 8.2.0 (UnMHTPageInfo.jsm)
      var m = {};
      Cu.import ("resource://unmht/modules/UnMHTCache.jsm", m);
      var [eFileInfo, part] = m.UnMHTCache.getPart (url);
      if (eFileInfo && part &&
          eFileInfo.startPart &&
          eFileInfo.startPart.contentLocation) {
        return (part.contentLocation ||
            eFileInfo.startPart.contentLocation);
      }
      return null;
    }
    function getRootContentLocation_6 (url) {
      // UnMHT 6
      var m = {};
      Cu.import ("resource://unmht/modules/UnMHTExtractor.jsm", m);
      var [eFileInfo, part] = m.UnMHTExtractor.getFileInfoAndPart (url);
      if (eFileInfo && part && part.startPart) {
        return part.startPart.contentLocation;
      }
      return null;
    }
    function getRootContentLocation_old (url) {
      var param = UnMHT.protocolHandler.getUnMHTURIParam (url);
      if (param && param.original) {
        var extractor = UnMHT.getExtractor (param.original);
        if (extractor && extractor.rootFile) {
          return extractor.rootFile.contentLocation;
        }
      }
      return null;
    }
    function getRootContentLocation_dummy (url) {
      return null;
    }

    /**
     * mht ファイルの保存元 URI を取得する
     *
     * @param   string contentLocation  対象の URI (unmht:)
     * @returns string  保存元 URI or null
     */
    this.getRootContentLocation = function (url) {
      var candidates = [
        getRootContentLocation_8,
        getRootContentLocation_6,
        getRootContentLocation_old,
        getRootContentLocation_dummy,
      ];
      var rooturl = null;
      for (var i = 0; i < candidates.length; i ++) {
        try {
          rooturl = candidates [i] (url);
          this.getRootContentLocation = candidates [i];
          return rooturl;
        }
        catch (e) { Cu.reportError (e);
        }
      }
      return null;
    };

    function getMHTFileURI_8 (contentLocation, requestOrigin) {
      // UnMHT 8.2.0
      var m = {};
      Cu.import ("resource://unmht/modules/UnMHTScheme.jsm", m);
      if (m.UnMHTScheme.isUnMHTURI (contentLocation)) {
        return contentLocation;
      }
      Cu.import ("resource://unmht/modules/UnMHTCache.jsm", m);
      return m.UnMHTCache.getMHTFileURI (contentLocation, requestOrigin);
    }
    function getMHTFileURI_old (contentLocation, requestOrigin) {
      contentLocation = arAkahukuUtil.newURIViaNode (contentLocation, null);
      requestOrigin = arAkahukuUtil.newURIViaNode (requestOrigin, null);
      var uri = UnMHT.getMHTFileURI (contentLocation, requestOrigin);
      if (uri) {
        return uri.spec;
      }
      return null;
    }
    function getMHTFileURI_dummy (contentLocation, requestOrigin) {
      return null;
    }

    /**
     * mht に含まれるファイルの URI を取得する
     *
     * @param   string contentLocation  対象の URI
     * @param   string requestOrigin  呼び出し元の URI (unmht:)
     * @returns string  ファイルの URI or null
     */
    this.getMHTFileURI = function (contentLocation, requestOrigin) {
      var candidates = [
        getMHTFileURI_8,
        getMHTFileURI_old,
        getMHTFileURI_dummy,
      ];
      for (var i = 0; i < candidates.length; i ++) {
        try {
          var uri = candidates [i] (contentLocation, requestOrigin);
          this.getMHTFileURI = candidates [i];
          return uri;
        }
        catch (e) { Cu.reportError (e);
        }
      }
      return null;
    };
  };

  this.isDeadWrapper = function (object) {
    if ("isDeadWrapper" in Cu) {
      // requires Firefox 17?+
      return Cu.isDeadWrapper (object);
    }
    try {
      String (object);
      return false;
    }
    catch (e) {
      return true;
    }
  };

  this.toggleSidebar = function (commandID, forceOpen) {
    if (typeof SidebarUI !== "undefined") {
      if (forceOpen) {
        SidebarUI.show (commandID);
      }
      else {
        SidebarUI.toggle (commandID);
      }
    }
    else {
      toggleSidebar (commandID, forceOpen);
    }
  };
};

