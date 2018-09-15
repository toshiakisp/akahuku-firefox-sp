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

  this.compareVersion = function (v1, v2) {
    return -1;
  };
  this.comparePlatformVersion = function (v) {
    return 1;
  };

  this.getPlatformType = function () {
    return "Gecko";
  };

  this.WebBrowserPersist = {

    saveURI : function (webBrowserPersist, args) {
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

      throw new Error('NotYetImplemented');

      if (typeof file === "string") {
        var filePath = file;
        file = arAkahukuFile.initFile (filePath);
      }
    },
  };

  this.FilePicker = new function () {
    this.open = function (picker, callback) {
      throw new Error('NotYetImplemented');
    };
  };

  this.AsyncHistory = new function () {
    this.isURIVisited = function (uri, callback) {
      Akahuku.debug.error('NotYetImplemented, deprecated');
      if (callback && "isVisited" in callback) {
        callback.isVisited (uri, false);
      }
      /*
      arAkahukuIPC.sendAsyncCommand
        ("CompatAsyncHistory/isURIVisited", arguments);
      */
    };
  };

  this.gBrowser = new function () {
    this.getStatusPanel = function (window) {
      throw new Error('deprecated for content');
      return null;
    };
  };

  this.HTMLInputElement = {
    /**
     * Wrap mozSetFileArray since Firefox 38 [Bug 1068838]
     * required for e10s content process
     *
     * @param filebox HTMLInputElement
     * @param file  File
     */
    mozSetFile : function (filebox, file) {
      if (!file) {
        filebox.value = "";
      }
      else {
        if ("mozSetFileArray" in filebox) { // since Firefox 38 [Bug 1068838]
          filebox.mozSetFileArray ([file]);
        }
        else {
          var filepath = "";
          if (file && "mozFullPath" in file) { // DOM File
            filepath = file.mozFullPath;
          }
          if (filepath) {
            filebox.mozSetFileNameArray ([filepath], 1);
          }
          else {
            throw new Error ("no path from a file: " + file);
          }
        }
      }
    },
  };

  this.losslessDecodeURL = function (value) {
    // from browser.js

    // Try to decode as UTF-8 if there's no encoding sequence that we would break.
    if (!/%25(?:3B|2F|3F|3A|40|26|3D|2B|24|2C|23)/i.test(value))
      try {
        value = decodeURI(value)
                  // 1. decodeURI decodes %25 to %, which creates unintended
                  //    encoding sequences. Re-encode it, unless it's part of
                  //    a sequence that survived decodeURI, i.e. one for:
                  //    ';', '/', '?', ':', '@', '&', '=', '+', '$', ',', '#'
                  //    (RFC 3987 section 3.2)
                  // 2. Re-encode whitespace so that it doesn't get eaten away
                  //    by the location bar (bug 410726).
                  .replace(/%(?!3B|2F|3F|3A|40|26|3D|2B|24|2C|23)|[\r\n\t]/ig,
                           encodeURIComponent);
      } catch (e) {}

    // Encode invisible characters (C0/C1 control characters, U+007F [DEL],
    // U+00A0 [no-break space], line and paragraph separator,
    // object replacement character) (bug 452979, bug 909264)
    value = value.replace(/[\u0000-\u001f\u007f-\u00a0\u2028\u2029\ufffc]/g,
                          encodeURIComponent);

    // Encode default ignorable characters (bug 546013)
    // except ZWNJ (U+200C) and ZWJ (U+200D) (bug 582186).
    // This includes all bidirectional formatting characters.
    // (RFC 3987 sections 3.2 and 4.1 paragraph 6)
    value = value.replace(/[\u00ad\u034f\u061c\u115f-\u1160\u17b4-\u17b5\u180b-\u180d\u200b\u200e-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufff8]|\ud834[\udd73-\udd7a]|[\udb40-\udb43][\udc00-\udfff]/g,
                          encodeURIComponent);
    return value;
  };

  this.AddonManager = new function () {
    this.getAddonByID = function (id, callback) {
      Akahuku.debug.error('NotYetImplemented');
      var addon = { // only for Akahuku's neccessity
        id: "",
        version: "",
        name: "",
        isActive: false,
      };
      callback(addon);
      /*
      arAkahukuIPC.sendAsyncCommand
        ("CompatAddonManager/getAddonByID", arguments);
      */
    }
  };

  this.nsIURI = new function () {
    /**
     * pathQueryRef (rename from path) [Bug 1326520] Fx57+
     */
    this.getPathQueryRef = function (uri) {
      return uri.pathQueryRef || uri.path;
    };
    this.setPathQueryRef = function (uri, newPath) {
      if (typeof uri.pathQueryRef !== "undefined") {
        uri.pathQueryRef = newPath;
      }
      else {
        uri.path = newPath;
      }
    };
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
  this.CacheStorage = CacheStorage;
  var CacheEntryOpenCallback = {
    // Constants of nsICacheStorage for compatiblility
    ENTRY_WANTED : 0,
    RECHECK_AFTER_WRITE_FINISHED : 1,
    ENTRY_NEEDS_REVALIDATION : 2,
    ENTRY_NOT_WANTED : 3,
  };
  this.CacheEntryOpenCallback = CacheEntryOpenCallback;

  var CacheSessionWrapper = function (session, loadContextInfo, lookupAppCache) {
    this._session = session;
    this._lcinfo = loadContextInfo;
    this._lookup = lookupAppCache;
  };
  CacheSessionWrapper.prototype = {
    asyncOpenURI : function (uri, id, flag, callback) {
      //FIXME: not yet implemented
      var wrappedcb = {
        // nsICacheListener.onCacheEntryAvailable 
        onCacheEntryAvailable : function (descriptor, accessGranted, result) {
          result = 61; //NS_ERROR_CACHE_KEY_NOT_FOUND
          callback.onCacheEntryAvailable (null, false, appCache, result);
        },
      };
      // fake async call
      arAkahukuUtil.executeSoon (function () {
        wrappedcb.onCacheEntryAvailable (null, false, 0);
      });
    },
    // 
  };

  this.CacheStorageService = new function () {
    this.CallbackInterface = null;
    this.diskCacheStorage = function (loadContextInfo, lookupAppCache) {
      var session = null;
      return new CacheSessionWrapper (session, loadContextInfo, lookupAppCache);
    };
  };

  this.LoadContextInfo = { }; // dummy

  this.UnMHT = new function () {
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
        getMHTFileURI_dummy,
      ];
      for (var i = 0; i < candidates.length; i ++) {
        try {
          var uri = candidates [i] (contentLocation, requestOrigin);
          this.getMHTFileURI = candidates [i];
          return uri;
        }
        catch (e) {
        }
      }
      return null;
    };
  };

  this.isDeadWrapper = function (object) {
    try {
      String (object);
      return false;
    }
    catch (e) {
      return true;
    }
  };

  this.toggleSidebar = function (commandID, forceOpen, window) {
    if (typeof window.SidebarUI !== "undefined") {
      if (forceOpen) {
        window.SidebarUI.show (commandID);
      }
      else {
        window.SidebarUI.toggle (commandID);
      }
    }
    else {
      window.toggleSidebar (commandID, forceOpen);
    }
  };
};

