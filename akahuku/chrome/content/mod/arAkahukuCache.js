/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig,
 *          arAkahukuReload, arAkahukuFile
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
        documentParam.cachedimages.destruct ();
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
      documentParam.cachedimages = new CachedImageReserver ();
    }

    if (info.isCache) {
      notifyCacheStatus (targetDocument);
    }
  };

  // キャッシュを表示中 とユーザーに通知
  function notifyCacheStatus (targetDocument) {
    var cacheStat
      = Akahuku.Cache.getStatus (targetDocument.location.href);
    if (!cacheStat.isExist || cacheStat.httpStatusCode === "404") {
      return;
    }
    var lmday = new Date (cacheStat.lastModified);
    var timestamp
      = "\u66F4\u65B0\u65E5\u6642:" //"更新日時"
      + lmday.toLocaleString ();
    try {
      var box = getNotificationBox (targetDocument.defaultView);
      var oldItem = box.getNotificationWithValue (Akahuku.Cache);
      box.appendNotification
        ("\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u8868\u793A\u4E2D"
         //"キャッシュを表示中 ("
         + ": " + cacheStat.key
         + " (" + timestamp + ")",
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
  };


  /**
   * キャッシュの状態を調べる
   *
   * @param  String url
   *         対象のURL
   * @return Object
   *         キャッシュの状態
   */
  this.getStatus = function (url) {
    var p = Akahuku.protocolHandler.getAkahukuURIParam (url);
    if (p.type === "filecache") {
      return _getFilecacheStatus (p.original);
    }
    else if (p.type === "cache") {
      var status = Akahuku.Cache.getHttpCacheStatus (p.original);
      if ((!status.isExist || status.httpStatusCode === "404")
          && /\d+\.htm$/.test (url)) {
        url = p.original + ".backup";
        var statusBackup = Akahuku.Cache.getHttpCacheStatus (url);
        if (statusBackup.isExist) {
          status = statusBackup;
        }
      }
      return status;
    }
    return Akahuku.Cache.getHttpCacheStatus (url);
  };
  this.getHttpCacheStatus = function (key, noRedirect) {
    var status = new CacheStatus (key);
    var finder = new Akahuku.Cache.RedirectedCacheFinder ();
    finder.init ();
    if (noRedirect) {
      finder.maxRedirections = 0;
    }
    try {
      var descriptor = finder.open (key);
      if (!descriptor)
        return status;
      status.isExist = true;
      status.key = descriptor.key;
      status.expires = descriptor.expirationTime;
      status.dataSize = descriptor.dataSize;
      status.lastModified = descriptor.lastModified * 1000; //[ms]
      // HTTP status
      var text = descriptor.getMetaDataElement ("response-head");
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
    }
    catch (e if e.result
        == Components.results.NS_ERROR_CACHE_WAIT_FOR_VALIDATION) {
      status.isExist = true;
    }
    if (descriptor)
      descriptor.close ();

    return status;
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
  function _getFilecacheStatus (originalUrl) {
    var status = new CacheStatus (originalUrl);
    if (!(/^https?:/.test (originalUrl))) {
      return status;
    }
    // from arAkahukuReloadCacheWriter.createFile ()
    var path = originalUrl.replace (/^https?:\/\//, "");
    var base
      = arAkahukuFile.getURLSpecFromFilename
      (arAkahukuReload.extCacheFileBase);
    path = arAkahukuFile.getFilenameFromURLSpec (base + path);

    var targetFile
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
    targetFile.initWithPath (path);
    if (targetFile.exists ()) {
      status.isExist = true;
      status.key = path;
      status.lastModified = targetFile.lastModifiedTime;
    }
    return status;
  }



  /**
   * 画像のロード状態診断結果
   */
  function ImageStatus () {
    this.isImage = false;
    this.isBlocked = false;
    this.isErrored = false;
  };
  ImageStatus.prototype = {
    blockingStatus : 0,
    requestImageStatus : 0,
    requestURI : null, 
    cache : new CacheStatus (),
  };

  /**
   * 画像のロード状態を調べる
   *
   * @param  HTMLImageElement img
   *         対象の画像要素
   * @param  Boolean optCheckCache
   *         エラーの詳細を調べるか
   * @return Object
   *         画像の状態
   */
  this.getImageStatus = function (img, optCheckCache) {
    var status = new ImageStatus ();
    try {
      var img
        = img.QueryInterface
          (Components.interfaces.nsIImageLoadingContent);
      status.isImage = true;

      /* コンテンツポリシーによるブロックチェック */
      status.isBlocked = 
        (img.imageBlockingStatus
         != Components.interfaces.nsIContentPolicy.ACCEPT);
      status.blockingStatus = img.imageBlockingStatus;

      /* リクエストチェック */
      var request
        = img.getRequest
          (Components.interfaces.nsIImageLoadingContent
           .CURRENT_REQUEST);
      if (request) {
        status.requestImageStatus = request.imageStatus;
        status.requestURI = request.URI;
        var errorMask
          = Components.interfaces.imgIRequest.STATUS_LOAD_PARTIAL
            | Components.interfaces.imgIRequest.STATUS_ERROR;
        status.isErrored = ((request.imageStatus & errorMask) != 0);
      }
    }
    catch (e if e.result == Components.results.NS_ERROR_NO_INTERFACE) {
      status.isImage = false;
    }
    catch (e) { Akahuku.debug.exception (e);
    }

    if (optCheckCache && status.requestURI) {
      status.cache = Akahuku.Cache.getStatus (status.requestURI.spec);
    }

    return status;
  };

    

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

    if (!contentLocation) {
      var status = Akahuku.Cache.getImageStatus (context, true);
      if (status.cache.isExist && status.cache.key) {
        contentLocation = status.cache.key;
      }
    }
    if (!contentLocation || !/^https?:/.test (contentLocation)) {
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
    
  this.enCacheURIForImages = function (rootElement) {
    var nodes = rootElement.getElementsByTagName ("img");
    for (var i = 0; i < nodes.length; i ++) {
      Akahuku.Cache.enCacheURIContext (nodes [i]);
    }
  };

  /**
   * リダイレクトを解決しながらキャッシュエントリを探す
   *   (エラー時は null をコールバックに通知)
   */
  this.RedirectedCacheFinder = function () {
    this.session = null;
    this._isPending = false;
    this._lastDescriptor = null;
    this._accessRequested = this.accessMode;
    this._callback = null;
    this._redirected = 0;
  }
  this.RedirectedCacheFinder.prototype = {
    maxRedirections : 10,
    // cache session parameters used if no session specified
    clientID : "HTTP",
    storagePolicy : Components.interfaces.nsICache.STORE_ANYWHERE,
    streamBased : Components.interfaces.nsICache.STREAM_BASED,
    doomEntriesIfExpired : false,
    // access mode for all entries (asyncOpenCacheEntry)
    accessMode : Components.interfaces.nsICache.ACCESS_READ,
    blockingMode : Components.interfaces.nsICache.NON_BLOCKING,
    init : function (cacheSession)
    {
      if (!cacheSession) {
        cacheSession
          = Components.classes
          ["@mozilla.org/network/cache-service;1"]
          .getService (Components.interfaces.nsICacheService)
          .createSession (this.clientID,
                          this.storagePolicy,
                          this.streamBased);
        cacheSession.doomEntriesIfExpired = this.doomEntriesIfExpired;
      }
      this.session = cacheSession;
    },
    isPending : function () { return this._isPending },
    cancel : function ()
    {
      this._isPending = false;
      if (this._lastDescriptor)
        this._lastDescriptor.close ();
    },
    open : function (key)
    {
      this._redirected = 0;
      var descriptor;
      while (key) {
        if (descriptor)
          descriptor.close ();
        try {
          descriptor
            = this.session.openCacheEntry (key,
                this.accessMode,
                this.blockingMode);
        }
        catch (e if e.result
            == Components.results.NS_ERROR_CACHE_KEY_NOT_FOUND) {
          descriptor = null;
          break;
        }
        key = this._resolveRedirection (descriptor);
      }
      return descriptor;
    },
    asyncOpen : function (key, callback)
    {
      this._redirected = 0;
      if (this._isPending)
        throw Components.results.NS_ERROR_IN_PROGRESS;
      this.session.asyncOpenCacheEntry (key, this.accessMode, this);
      this._accessRequested = this.accessMode;
      this._callback = callback;
      this._lastDescriptor = null;
      this._isPending = true;
    },
    // for asyncOpen
    onCacheEntryAvailable : function (descriptor, accessGranted, status)
    {
      if (!this._isPending) { // canceled
        if (descriptor)
          descriptor.close ();
        if (this._lastDescriptor)
          this._lastDescriptor.close ();
        this._lastDescriptor = null;
        this._callback = null;
        return;
      }
      if (accessGranted == this._accessRequested
          && Components.isSuccessCode (status)) {
        if (this._lastDescriptor)
          this._lastDescriptor.close ();
        this._lastDescriptor = descriptor;
        var dest = this._resolveRedirection (descriptor);
        if (dest) {
          this.session
            .asyncOpenCacheEntry (dest, this.accessMode, this);
          return; // dest の onCacheEntryAvailable を待つ
        }
      }

      if (this._callback) {
        try {
          this._callback.apply (this, [this._lastDescriptor]);
        }
        catch (e) { Akahuku.debug.exception (e);
        }
        this._callback = null;
      }
      this._lastDescriptor = null;
      this._isPending = false;
    },

    _resolveRedirection : function (descriptor)
    {
      var head = descriptor.getMetaDataElement ("response-head");
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
  function CachedImageReserver () {
    this.keys = [];
    this.originalExpireTimes = {};
  };
  CachedImageReserver.prototype = {
    /**
     * データを開放する
     */
    destruct : function () {
      var cacheSession
        = Components.classes
        ["@mozilla.org/network/cache-service;1"]
        .getService (Components.interfaces.nsICacheService)
        .createSession ("HTTP",
                        Components.interfaces.nsICache.STORE_ANYWHERE,
                        Components.interfaces.nsICache.STREAM_BASED);
      cacheSession.doomEntriesIfExpired = false;

      for (var i=0; i < this.keys.length; i++) {
        var t = this.originalExpireTimes [this.keys [i]];
        try {
          var descriptor
            = cacheSession.openCacheEntry
            (this.keys [i],
             Components.interfaces.nsICache.ACCESS_READ,
             Components.interfaces.nsICache.BLOCKING);
          if (descriptor.expirationTime != 0xFFFFFFFF) {
            continue; //保持が解除されてたら触らない
          }
          descriptor.setExpirationTime (t);
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
        finder.init ();
        finder.asyncOpen
          (originalSrc,
           function (descriptor) {
              if (descriptor) {
                that.register (descriptor);
                descriptor.close ();
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

};

