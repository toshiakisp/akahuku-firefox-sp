
/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuUtil,
 *          arAkahukuReload, arAkahukuFile, arAkahukuCompat
 */

/**
 * キャッシュ制御モジュール
 */
Akahuku.Cache = new function () {
  "use strict";

  /**
   * 初期化処理
   */
  this.init = function () {
    /* window.addEventListener ("TabMove", function () { }, true); */
  };

  /**
   * ドキュメントのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  this.setStyle = function (style, targetDocument, info) {
    /*if (info.isNormal || info.isReply) {
      style
      .addRule ("span.akahuku_bottom_status_number",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("span.akahuku_bottom_status_alert",
                "font-size: 9pt; "
                + "color: #f00000; "
                + "background-color: inherit;");
    }*/
  };
    
  /**
   * スタイルファイルのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  this.setStyleFile = function (style) {
  };
    
  /**
   * スタイルファイルのスタイルを解除する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  this.resetStyleFile = function (style) {
  };
    
  /**
   * 設定を読み込む
   */
  this.getConfig = function () {
    //= arAkahukuConfig.initPref ("bool", "akahuku.cache", false);
  };

  /**
   * body の unload イベント
   * (Akahuku.onBodyUnload から呼ばれる)
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  this.onBodyUnload = function (targetDocument, documentParam) {
    try {
      if (documentParam.cachedimages)
        documentParam.cachedimages.destruct (targetDocument);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    delete documentParam.cachedimages;
  };

  /**
   * DOMContentLoaded 後の処理
   * (Akahuku.apply から呼ばれる)
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  this.apply = function (targetDocument, info) {
    if (info.isReply) {
      var documentParam = Akahuku.getDocumentParam (targetDocument);
      documentParam.cachedimages
        = new CachedImageReserver (targetDocument.defaultView);
    }

    if (info.isCache && info.isReply) {
      Akahuku.Cache.asyncGetStatus
        ({url: targetDocument.location.href,
          triggeringNode: targetDocument},
         function (cacheStatus) {
          notifyCacheStatus (targetDocument, cacheStatus);
         });
    }
  };

  // キャッシュを表示中 とユーザーに通知
  function notifyCacheStatus (targetDocument, cacheStat) {
    if (!cacheStat.isExist || cacheStat.httpStatusCode === "404") {
      return;
    }
    var lmday = new Date (cacheStat.lastModified);
    var timestamp
      = "\u66F4\u65B0\u65E5\u6642:" //"更新日時"
      + lmday.toLocaleString ();
    var text
      = "\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u8868\u793A\u4E2D"
      //"キャッシュを表示中 ("
      + ": " + cacheStat.key + " (" + timestamp + ")";
    var browser
      = arAkahukuWindow.getBrowserForWindow
      (targetDocument.defaultView);
    Akahuku.Cache.showCacheNotification (browser, text);
  };

  this.showCacheNotification = function (browser, text) {
    try {
      var tabbrowser = browser.ownerDocument.getElementById ("content");
      var box = tabbrowser.getNotificationBox (browser);
      var oldItem = box.getNotificationWithValue (Akahuku.Cache);
      box.appendNotification
        (text,
         Akahuku.Cache,
         "chrome://akahuku/content/images/icon_small.png",
         box.PRIORITY_WARNING_LOW,
         []);
      if (oldItem) {
        box.removeNotification (oldItem);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },


  /**
   * キャッシュの状態を調べる (非同期)
   * @param  String url or Object {url:"", contextWindow: DOMWindow}
   *         対象のURL
   * @param  Function callback
   *         状態(Object)を受け取るコールバック関数
   */
  this.asyncGetStatus = function (source, callback) {
    source = _ensureSourceObject (source);
    var url = source.url;
    var p = Akahuku.protocolHandler.getAkahukuURIParam (url);
    if (p.type === "filecache") {
      _asyncGetFilecacheStatus (p.original, callback);
    }
    else if (p.type === "cache") {
      var candidates = [p.original, p.original + ".backup"];
      var callbackHttpCacheStatus
        = function (status) {
          if ((!status.isExist || status.httpStatusCode === "404")
              && /\d+\.htm$/.test (url)) {
            source.url = candidates.shift ();
            if (source.url) {
              Akahuku.Cache.asyncGetHttpCacheStatus
                (source, false, callbackHttpCacheStatus);
              return;
            }
          }
          callback.apply (null, [status]);
        };
      source.url = candidates.shift ();
      Akahuku.Cache.asyncGetHttpCacheStatus
        (source, false, callbackHttpCacheStatus);
    }
    else {
      Akahuku.Cache.asyncGetHttpCacheStatus (source, false, callback);
    }
  };
  this.asyncGetHttpCacheStatus = function (source, noRedirect, callback) {
    source = _ensureSourceObject (source);
    var key = source.url;
    var status = new CacheStatus (key);
    var finder = new Akahuku.Cache.RedirectedCacheFinder ();
    finder.init (source.contextWindow);
    if (noRedirect) {
      finder.maxRedirections = 0;
    }
    var callbackStatus = callback;
    if (!callbackStatus) {
      Akahuku.debug.warn ("aborted by invalid callback");
      return;
    }
    try {
      finder.asyncOpen (key, function (descriptor) {
        if (!descriptor) {
          callbackStatus.apply (null, [status]);
          return;
        }

        status.isExist = true;
        status.key = descriptor.key;
        status.expires = descriptor.expirationTime;
        status.dataSize = descriptor.dataSize;
        status.lastModified = descriptor.lastModified * 1000; //[ms]

        // HTTP status
        try {
          var text = descriptor.getMetaDataElement ("response-head");
        }
        catch (e) {
          if (e.result == Components.results.NS_ERROR_NOT_AVAILABLE) {
            text = "";
          }
          else {
            throw e;
          }
        }
        if (text) {
          var headers = text.match (/[^\r\n]*\r\n/g);
          if (headers.length > 0) {
            status.header = {};
            var re = headers [0].match
              (/^HTTP\/[0-9]\.[0-9] ([0-9]+) ([^\r\n]+)/);
            if (re) {
              status.httpStatusCode = re [1];
              status.httpStatusText = re [2];
            }
          }
          for (var i = 1; i < headers.length; i ++) {
            var matches = headers [i].match (/^([^:\s]+):\s*([^\s].*)\r\n/);
            if (!matches) continue;
            status.header [matches [1]] = matches [2];
          }
        }

        descriptor.close ();
        callbackStatus.apply (null, [status]);
      });
    }
    catch (e) { Akahuku.debug.exception (e);
      callbackStatus.apply (null, [status]);
    }
  };

  function CacheStatus (key) {
    this.isExist = false;
    this.key = key;
  }
  CacheStatus.prototype = {
    expires : 0,
    dataSize : 0,
    lastModified : 0,
    httpStatusCode : "000",
    httpStatusText : "No HTTP response",
    header : {},
  };
  function _asyncGetFilecacheStatus (originalUrl, callback) {
    var status = new CacheStatus (originalUrl);
    if (!(/^https?:/.test (originalUrl))) {
      callback.apply (null, [status]);
      return;
    }
    // from arAkahukuReloadCacheWriter.createFile ()
    var {AkahukuFileUtil} = Components.utils
      .import ("resource://akahuku/fileutil.jsm", {});
    var base
      = AkahukuFileUtil.getURLSpecFromNativeDirPath
      (arAkahukuReload.extCacheFileBase);
    var path = originalUrl.replace (/^https?:\/\//, "");
    path = AkahukuFileUtil.getNativePathFromURLSpec (base + path);
    AkahukuFileUtil.createFromFileName (path)
      .then (function (file) { // file exists
        status.isExist = true;
        status.key = path;
        status.lastModified = AkahukuFileUtil.getLastModified (file);
      }, function () { // not exist
        Akahuku.debug.log ("filecache doesn't exist: " + path);
      })
      .then (function () {
        callback.apply (null, [status]);
      });
    return;
  }

  /**
   * 画像要素をキャッシュのアドレスに変換する
   *
   * @param  HTMLElement context
   *         呼び出し元
   * @param  String contentLocation
   *         対象の URI
   */
  this.enCacheURIContext = function (context, contentLocation) {

    // taken from arAkahukuP2P.enP2P
    /* ScrapBook には干渉しない */
    if ("id" in context && context.id == "sbCaptureBrowser") {
      return;
    }

    if (!contentLocation || !/^https?:/.test (contentLocation)) {
      Akahuku.debug.warn ("enCacheURIContext: "
          + "invalid contentLocation; " + contentLocation);
      return;
    }

    var src
      = Akahuku.protocolHandler
      .enAkahukuURI ("cache", contentLocation);

    // Akahuku.Cache によって制御されているページでは
    // ロード成功したキャッシュは保持リストに送る
    var param = Akahuku.getDocumentParam (context.ownerDocument);
    if (param && "cachedimages" in param) {
      context.addEventListener
        ("load",
         param.cachedimages.onLoadListenerFactory
         (src, contentLocation),
         false);
    }

    context.src = src;
  };

  /**
   * 画像要素をキャッシュのアドレスに変換する (非同期キャッシュ確認後)
   *
   * @param  HTMLElement 画像要素
   */
  this.enCacheURIContextIfCached = function (context) {
    var status = arAkahukuUtil.getImageStatus (context);
    if (!status.isImage) {
      Akahuku.debug.warn ("enCacheURIContextIfCached: " +
          "non image; " + context);
      return;
    }
    if (!status.requestURI) {
      Akahuku.debug.warn ("enCacheURIContextIfCached: " +
          "no request URI; " + context);
      return;
    }
    if (!(status.requestURI.schemeIs ("http") ||
          status.requestURI.schemeIs ("https")) ||
        (status.isBlocked || status.isErrored)) {
      // キャッシュされてると期待できない状態
      return;
    }
    Akahuku.Cache.asyncGetStatus
      ({url: status.requestURI.spec, triggeringNode: context},
       function (cacheStatus) {
         if (!cacheStatus.isExist) {
           Akahuku.debug.warn ("enCacheURIContextIfCached: "
             + "cache entry is not found for " + cacheStatus.key);
           return;
         }
         if (!(cacheStatus.dataSize > 0)) {
           Akahuku.debug.warn ("enCacheURIContextIfCached: "
             + "invalid cache entry for " + cacheStatus.key);
           return;
         }
         if (cacheStatus.expires == 0) {
           // expires が無いエントリなら処理する必要がない
           return;
         }
         if (!arAkahukuCompat.isDeadWrapper (context)) {
           Akahuku.Cache.enCacheURIContext (context, cacheStatus.key);
         }
       });
  };
    
  this.enCacheURIForImages = function (rootElement) {
    var nodes = rootElement.getElementsByTagName ("img");
    for (var i = 0; i < nodes.length; i ++) {
      Akahuku.Cache.enCacheURIContextIfCached (nodes [i]);
    }
  };

  /**
   * リダイレクトを解決しながらキャッシュエントリを探す
   *   (エラー時は null をコールバックに通知)
   */
  this.RedirectedCacheFinder = function () {
    this.openFlag = arAkahukuCompat.CacheStorage.OPEN_READONLY;
    this._isPending = false;
    this._lastEntry = null;
    this._callback = null;
    this._redirected = 0;
  };
  this.RedirectedCacheFinder.prototype = {
    maxRedirections : 10,
    init : function (targetWindow)
    {
      var Ci = Components.interfaces;
      var loadContextInfo = null;
      try {
        if ("fromLoadContext" in arAkahukuCompat.LoadContextInfo) {
          loadContextInfo =
            arAkahukuCompat.LoadContextInfo.fromLoadContext
            (targetWindow.QueryInterface (Ci.nsIInterfaceRequestor)
             .getInterface (Ci.nsIWebNavigation)
             .QueryInterface (Ci.nsILoadContext),
             false);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      this._contextWindow = targetWindow;
    },
    isPending : function () { return this._isPending },
    cancel : function ()
    {
      this._isPending = false;
      if (this._lastEntry)
        this._lastEntry.close ();
    },
    asyncOpen : function (key, callback)
    {
      this._redirected = 0;
      if (this._isPending)
        throw Components.results.NS_ERROR_IN_PROGRESS;
      this._callback = callback;
      this._lastEntry = null;
      this._isPending = true;
      var source = {url: key, contextWindow: this._contextWindow};
      Akahuku.Cache.asyncOpenCache (source, this.openFlag, this);
    },
    // nsICacheEntryOpenCallback
    mainThreadOnly : true,
    onCacheEntryCheck : function (entry, appCache) {
      try {
        entry.dataSize;
      }
      catch (e) {
        if (e.result == Components.results.NS_ERROR_IN_PROGRESS) {
          return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
        }
        else {
          throw e;
        }
      }
      return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
    },
    onCacheEntryAvailable : function (entry, isNew, appCache, result)
    {
      if (!this._isPending) { // canceled
        if (entry)
          entry.close ();
        if (this._lastEntry)
          this._lastEntry.close ();
        this._lastEntry = null;
        this._callback = null;
        return;
      }
      if (Components.isSuccessCode (result)) {
        if (this._lastEntry)
          this._lastEntry.close ();
        this._lastEntry = entry;
        var dest = this._resolveRedirection (entry);
        if (dest) {
          var source = {url: dest, contextWindow: this._contextWindow};
          Akahuku.Cache.asyncOpenCache (source, this.openFlag, this);
          return; // dest の onCacheEntryAvailable を待つ
        }
      }

      if (this._callback) {
        try {
          this._callback.apply (this, [this._lastEntry]);
        }
        catch (e) { Akahuku.debug.exception (e);
        }
        this._callback = null;
      }
      this._lastEntry = null;
      this._isPending = false;
    },

    _resolveRedirection : function (descriptor)
    {
      try {
        var head = descriptor.getMetaDataElement ("response-head");
      }
      catch (e) {
        if (e.result == Components.results.NS_ERROR_NOT_AVAILABLE) {
          head = "";
        }
        else {
          throw e;
        }
      }
      var httpStatusCode = "000";
      if (head && head.match (/^HTTP\/\d\.\d (\d{3}) ([^\r\n]+)/)) {
        httpStatusCode = RegExp.$1;
      }
      if (httpStatusCode [0] == "3" // ie. 301 Moved Permanently
          && head.match (/^Location: ([^\s]+)/m)) {
        var dest = RegExp.$1;
        if (this._redirected < this.maxRedirections) {
          this._redirected ++;
          return dest;
        }
      }
      return null;
    },
  };

  /**
   * ページ内のキャッシュ済み画像を管理
   *   登録中はキャッシュの有効期限を最大に延ばす
   */
  function CachedImageReserver (contextWindow) {
    this.keys = [];
    this.originalExpireTimes = {};
    this.contextWindow = contextWindow;
  };
  CachedImageReserver.prototype = {
    /**
     * データを開放する
     */
    destruct : function (targetDocument) {
      var CacheEtimeRestorer = function (t) {
        this.originalExpirationTime = t;
      };
      CacheEtimeRestorer.prototype = {
        onCacheEntryAvailable : function (entry, isNew, appCache, status)
        {
          if (Components.isSuccessCode (status)) {
            if (entry.expirationTime == 0xFFFFFFFF) {
              entry.setExpirationTime (this.originalExpirationTime);
            }
          }
        },
        mainThreadOnly : true,
        onCacheEntryCheck : function (entry, appCache) {
          return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
        },
      };

      var loadContextInfo = null;
      try {
        loadContextInfo = arAkahukuCompat.LoadContextInfo.default;
      }
      catch (e) {
      }

      for (var i=0; i < this.keys.length; i++) {
        var source = {url: "", contextWindow: targetDocument.defaultView};
        var t = this.originalExpireTimes [this.keys [i]];
        var listener = new CacheEtimeRestorer (t);
        try {
          source.url = this.keys [i];
          Akahuku.Cache.asyncOpenCacheToRead (source, listener);
        }
        catch (e) { Akahuku.debug.exception (e);
        }
      }

      this.keys = null;
      this.originalExpireTimes = null;
    },
    
    onLoadListenerFactory : function (src, originalSrc)
    {
      var that = this;
      return function (event) {
        if (event.target.src != src) return;
        var finder = new Akahuku.Cache.RedirectedCacheFinder ();
        finder.init (that.contextWindow);
        finder.asyncOpen
          (originalSrc,
           function (descriptor) {
              if (descriptor) {
                that.register (descriptor);
                descriptor.close ();
              }
              else {
                Akahuku.debug.warn ("CachedImageReserver:",
                  "no cache entry", originalSrc);
              }
            });
      };
    },
    register : function (descriptor)
    {
      if (!this.originalExpireTimes.hasOwnProperty (descriptor.key)
          && descriptor.expirationTime != 0xFFFFFFFF) {
        this.keys.push (descriptor.key);
        this.originalExpireTimes [descriptor.key]
          = descriptor.expirationTime;
        // キャッシュを保持させる
        descriptor.setExpirationTime (0xFFFFFFFF);
      }
    },
  };

  /**
   * キャッシュを開く
   */
  this.asyncOpenCache = function (source, flag, callback) {
    source = _ensureSourceObject (source);
    var url = source.url;
    var Ci = Components.interfaces;
    var loadContextInfo = null;

    if ("fromLoadContext" in arAkahukuCompat.LoadContextInfo) {
      try {
        loadContextInfo =
          arAkahukuCompat.LoadContextInfo.fromLoadContext
          (source.contextWindow.QueryInterface (Ci.nsIInterfaceRequestor)
           .getInterface (Ci.nsIWebNavigation)
           .QueryInterface (Ci.nsILoadContext), false);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    try {
      var cacheStorage
        = arAkahukuCompat.CacheStorageService
        .diskCacheStorage (loadContextInfo, false);
      var ios = Components.classes
        ["@mozilla.org/network/io-service;1"]
        .getService (Ci.nsIIOService);
      var uri = ios.newURI (url, null, null);
      cacheStorage.asyncOpenURI (uri, "", flag, callback);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  };
  this.asyncOpenCacheToWrite = function (url, callback) {
    var flag = arAkahukuCompat.CacheStorage.OPEN_TRUNCATE;
    this.asyncOpenCache (url, flag, callback);
  };
  this.asyncOpenCacheToRead = function (url, callback) {
    var flag = arAkahukuCompat.CacheStorage.OPEN_READONLY;
    this.asyncOpenCache (url, flag, callback);
  };

  function _ensureSourceObject (source)  {
    if (typeof (source) == "string") {
      source = {
        url: source,
        contextWindow: null,
      };
    }
    if (!source.contextWindow) {
      if ("triggeringNode" in source && source.triggeringNode !== null) {
        if ("ownerDocument" in source.triggeringNode
            && source.triggeringNode.ownerDocument) {
          source.contextWindow
            = source.triggeringNode.ownerDocument.defaultView;
        }
        else if ("defaultView" in source.triggeringNode
            && source.triggeringNode.defaultView) {
          source.contextWindow = source.triggeringNode.defaultView;
        }
      }
    }
    if (!source.contextWindow) {
      Akahuku.debug.warn ("Cache._ensureSourceObject:",
          "no source.contextWindow;", source);
    }
    return source;
  }
};

