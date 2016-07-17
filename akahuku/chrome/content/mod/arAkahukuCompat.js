/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

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

  this.comparePlatformVersion = function (v) {
    try {
      // Gecko 1.8+
      var vc = Cc ["@mozilla.org/xpcom/version-comparator;1"]
        .getService (Ci.nsIVersionComparator);
      var ai = Cc ["@mozilla.org/xre/app-info;1"]
        .getService (Ci.nsIXULAppInfo);
      return vc.compare (ai.platformVersion, v);
    }
    catch (e) {
      return -1; // 1.8より前ではやっつけ
    }
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
        this._version3_6 = arAkahukuCompat.comparePlatformVersion ("3.5.*") > 0;
      }

      var uri = _getArg (args, 'uri', null);
      var file = _getArg (args, 'file', null);
      var postData = _getArg (args, 'postData', null);
      var cacheKey = _getArg (args, 'cacheKey', null);
      var referrer = _getArg (args, 'referrer', null);
      var referrerPolicy = _getArg (args, 'referrerPolicy', 0); // REFERRER_POLICY_NO_REFERRER_WHEN_DOWNGRADE
      var extraHeaders = _getArg (args, 'extraHeaders', null);
      var privacyContext = _getArg (args, 'privacyContext', null);

      if (this._version36) {
        // Firefox 36
        webBrowserPersist.saveURI
          (uri, cacheKey, referrer, referrerPolicy, postData,
           extraHeaders, file, privacyContext);
      }
      else if (this._version18) {
        // Firefox 18.0+
        webBrowserPersist.saveURI
          (uri, cacheKey, referrer, postData,
           extraHeaders, file, privacyContext);
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
     * @param file  a url string or nsIFile
     *              (no support for nsIDOMFile and Array)
     */
    mozSetFile : function (filebox, file) {
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
            file = new File (file); // Gecko 6.0
          }
          filebox.mozSetFileArray ([file]);
        }
        else {
          // classic way
          filebox.value = arAkahukuFile.getURLSpecFromFile (file);
        }
      }
    },
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
      catch (e) { Cu.reportError (e);
        this.getAddonByID = function getAddonByIDCompat (id, callback) {
          // obsolete gecko 2.0
          var extMan = Cc ["@mozilla.org/extensions/manager;1"]
            .getService (Ci.nsIExtensionManager);
          var ext = extMan.getItemForID (id);
          ext.QueryInterface (Ci.nsIUpdateItem);
          var addon = { // only for Akahuku's neccessity
            id: ext.id,
            version: ext.version,
            name: ext.name,
            isActive: true,
          };
          callback (addon);
        };
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
    ENTRY_NEEDS_REVALIDATION : 1,
    ENTRY_NOT_WANTED : 2,
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
          var check = callback.onCacheEntryCheck (entry, appCache);
          if (check === CacheEntryOpenCallback.ENTRY_WANTED) {
            var isNew = (accessGranted == Ci.nsICache.ACCESS_WRITE); //OK?
            callback.onCacheEntryAvailable (entry, isNew, appCache, result);
          }
        },
      };
      this._session.doomEntriesIfExpired = false;
      this._session.asyncOpenCacheEntry (uri.spec, accessMode, wrappedcb);
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
};

