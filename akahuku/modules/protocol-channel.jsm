/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * akahuku/protocol-channel.jsm
 */

var EXPORTED_SYMBOLS = [
  "arAkahukuBypassChannel",
  "arAkahukuJPEGThumbnailChannel",
  "arAkahukuCacheChannel",
  "arAkahukuAsyncRedirectVerifyHelper",
];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;

var loader
= Cc ["@mozilla.org/moz/jssubscript-loader;1"]
.getService (Ci.mozIJSSubScriptLoader);
try {
  if (typeof arAkahukuCompat === "undefined") {
    loader.loadSubScript
      ("chrome://akahuku/content/mod/arAkahukuCompat.js");
  }
}
catch (e) {
  Components.utils.reportError (e);
}

/**
 * リファラを送信しないチャネル
 * (画像などドキュメント以外ではクッキーも送受信しない)
 *   Inherits From: nsIChannel, nsIRequest
 *                  nsIStreamListener, nsIRequestObserver
 *                  nsIObserver
 *                  nsIInterfaceRequestor, nsIChannelEventSink
 *
 * @param  String uri
 *         akahuku プロトコルの URI
 * @param  String originalURI 
 *         本来の URI
 * @param  String contentType
 *         MIME タイプ
 */
function arAkahukuBypassChannel (uri, originalURI, contentType) {
  var callbacks = null;
  if (arguments.length == 1) {
    /* 既存のチャネルをラップして生成する */
    this._realChannel = arguments [0].QueryInterface (Ci.nsIChannel);
    callbacks = this._realChannel.notificationCallbacks;
    this.originalURI = this._realChannel.originalURI.clone ();
  }
  else {
    var ios
      = Cc ["@mozilla.org/network/io-service;1"]
      .getService (Ci.nsIIOService);
    if ("newChannel2" in ios) {
      var ssm
        = Cc ["@mozilla.org/scriptsecuritymanager;1"]
        .getService (Ci.nsIScriptSecurityManager);
      this._realChannel = ios.newChannel2 (originalURI, null, null,
          null,
          ssm.getSystemPrincipal (),
          null,
          Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
          Ci.nsIContentPolicy.TYPE_OTHER);
    }
    else {
      this._realChannel = ios.newChannel (originalURI, null, null);
    }
    this.originalURI = ios.newURI (uri, null, null);
    // hide a real channel's originalURI
    // to bypass ScriptSecurityManager's CheckLoadURI
    this.URI = this.originalURI.clone ();
  }
  this.name = uri;
  /* 通知をフィルタリングする */
  this.notificationCallbacks = callbacks;
  this._realChannel.notificationCallbacks = this;

  if (contentType) {
    this.contentType = contentType;
  }
}
arAkahukuBypassChannel.prototype = {
  _listener : null,   /* nsIStreamListener  チャネルのリスナ */
  _realChannel : null,/* nsIChannel  実チャネル */
  _redirectCallback : null,
  _observingHeaders : false, /* Boolean ヘッダーを監視しているか */

  /* 実チャネルに委譲しないプロパティ */
  name : "",
  notificationCallbacks : null,
  originalURI : null,

  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Cr.NS_NOINTERFACE
   * @return nsIProtocolHandler
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIChannel)
        || iid.equals (Ci.nsIRequest)
        || iid.equals (Ci.nsIObserver)
        || iid.equals (Ci.nsIInterfaceRequestor)
        || iid.equals (Ci.nsIChannelEventSink)
        || iid.equals (Ci.nsIStreamListener)
        || iid.equals (Ci.nsIRequestObserver)) {
      return this;
    }
    if ("nsIAsyncVerifyRedirectCallback" in Ci
        && iid.equals (Ci.nsIAsyncVerifyRedirectCallback)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  /**
   * インターフェース要求 (notificationCallbacksのための)
   *   nsIInterfaceRequestor.getInterface 
   */
  getInterface : function (iid) {
    try {
      return this.QueryInterface (iid);
    }
    catch (e) {
      try {
        /* nsIProgressEventSink 等、自身でサポートしないものは
         * クライアントの notificationCallbacks から直に取得 */
        return this.notificationCallbacks.getInterface (iid);
      }
      catch (e) {
        throw Cr.NS_NOINTERFACE;
      }
    }
  },
    
  /**
   * リクエストのキャンセル
   *   nsIRequest.cancel
   *
   * @param  Number status
   *         ステータス
   */
  cancel : function (status) {
    this._realChannel.cancel (status);
  },
    
  /**
   * リクエストの途中かどうか
   *   nsIRequest.isPending
   *
   * @return Boolean
   *         リクエストの途中かどうか
   */
  isPending : function () {
    return this._realChannel.isPending ();
  },
    
  /**
   * リクエストを再開する
   *   nsIRequest.resume
   */
  resume : function () {
    this._realChannel.resume ();
  },
    
  /**
   * リクエストを停止する
   *   nsIRequest.suspend
   */
  suspend : function () {
    this._realChannel.suspend ();
  },
    
  /**
   * 非同期オープン
   *   nsIChannel.asyncOpen
   *
   * @param  nsIStreamListener listener
   *         チャネルのリスナ
   * @param  nsISupports context
   *         ユーザ定義のコンテキスト
   */
  asyncOpen : function (listener, context) {
    this._listener = listener;
    if (!(this.loadFlags & this._realChannel.LOAD_DOCUMENT_URI)) {
      /* 埋め込み要素の場合 */
      this.startHeadersBlocker ();
    }
    try {
      this._realChannel.asyncOpen (this, context);
    }
    catch (e) {
      this.stopHeadersBlocker ();
      throw e;
    }
  },
    
  /**
   * 同期オープン
   *   nsIChannel.open
   *
   * @throws Cr.NS_ERROR_NOT_IMPLEMENTED
   */
  open : function () {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
    
  /**
   * リクエスト開始のイベント
   *   nsIRequestObserver.onStartRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   */
  onStartRequest : function (request, context) {
    try {
      this._listener.onStartRequest (this, context);
    }
    catch (e) {
      this.cancel (e.result);
    }
  },
    
  /**
   * リクエスト終了のイベント
   *   nsIRequestObserver.onStopRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  Number statusCode
   *         終了コード
   */
  onStopRequest : function (request, context, statusCode) {
    try {
      this._listener.onStopRequest (this, context, statusCode);
    }
    catch (e) {
    }
    finally {
      this._listener = null;
      this.stopHeadersBlocker ();
    }
  },
    
  /**
   * データ到着のイベント
   *   nsIStreamListener.onDataAvailable
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  nsIInputStream inputStream
   *         データを取得するストリーム
   * @param  PRUint32 offset
   *         データの位置
   * @param  PRUint32 count 
   *         データの長さ
   */
  onDataAvailable : function (request, context, inputStream, offset, count) {
    try {
      this._listener.onDataAvailable (this, context, inputStream,
                                      offset, count);
    }
    catch (e) {
      this.cancel (e.result);
    }
  },

  /**
   * ヘッダーを監視
   *   nsIObserver.observe
   *
   * @param  nsISupports subject
   *         この通知を引き起こしたチャネル (nsIChannel)
   * @param  String topic
   *         通知トピック
   * @param  String data
   *         データ
   */
  observe : function (subject, topic, data) {
    if (subject != this._realChannel) {
      return;
    }
    var httpChannel = subject.QueryInterface (Ci.nsIHttpChannel);

    if (topic == "http-on-modify-request") {
      /* リクエストにクッキーを含めないように */
      httpChannel.setRequestHeader ("Cookie", "", false);
    }
    else if (topic == "http-on-examine-response") {
      /* レスポンスによってクッキーをセットされないように */
      httpChannel.setResponseHeader ("Set-Cookie", "", false);
      this.stopHeadersBlocker ();
    }
  },

  /**
   * 必要ならヘッダー監視を開始する
   */
  startHeadersBlocker : function () {
    if (this._observingHeaders
        || !(this._realChannel instanceof Ci.nsIHttpChannel)) {
      return;
    }
    var observerService
      = Cc ["@mozilla.org/observer-service;1"]
      .getService (Ci.nsIObserverService);
    observerService.addObserver (this, "http-on-modify-request", false);
    observerService.addObserver (this, "http-on-examine-response", false);
    this._observingHeaders = true;
  },

  /**
   * ヘッダー監視を解除する
   */
  stopHeadersBlocker : function () {
    if (!this._observingHeaders) {
      return;
    }
    var observerService
      = Cc ["@mozilla.org/observer-service;1"]
      .getService (Ci.nsIObserverService);
    observerService.removeObserver (this, "http-on-modify-request");
    observerService.removeObserver (this, "http-on-examine-response");
    this._observingHeaders = false;
  },

  /**
   * リダイレクトイベント
   *   nsIChannelEventSink.asyncOnChannelRedirect
   */
  asyncOnChannelRedirect : function (oldChannel, newChannel, flags, callback) {
    newChannel = this.createRedirectedChannel (oldChannel, newChannel);
    this._redirectCallback = callback;
    // コールバックにリダイレクト発生を伝える
    var verifyHelper = new arAkahukuAsyncRedirectVerifyHelper ();
    verifyHelper.init
      (this, newChannel, Ci.nsIChannelEventSink.REDIRECT_INTERNAL, this);
  },
  /**
   * 非同期リダイレクトイベントの待ち受け
   *   nsIAsyncVerifyRedirectCallback.onRedirectVerifyCallback
   */
  onRedirectVerifyCallback : function (result) {
    this._redirectCallback.onRedirectVerifyCallback (result);
    this._redirectCallback = null;
  },

  /**
   * リダイレクトイベント (Obsolete since Gecko 2)
   *   nsIChannelEventSink.onChannelRedirect
   */
  onChannelRedirect : function (oldChannel, newChannel, flags) {
    try {
      var sink
        = this.notificationCallbacks
        .getInterface (Ci.nsIChannelEventSink);
    }
    catch (e) {
      return;
    }
    newChannel = this.createRedirectedChannel (oldChannel, newChannel);
    sink.onChannelRedirect (this, newChannel, flags);
  },

  /**
   * リダイレクト用 arAkahukuBypassChannel を生成する
   */
  createRedirectedChannel : function (oldChannel, newChannel) {
    if (newChannel instanceof Ci.nsIHttpChannel) {
      newChannel = new arAkahukuBypassChannel (newChannel);
      /* リダイレクト時にはリファラを付与 */
      newChannel._realChannel.referrer = oldChannel.URI;
      // 新しいリダイレクト用チャネルの asyncOpen は呼ばず
      // ストリームリスナを数珠つなぎにする
      newChannel._listener = this._listener;
      this._listener = newChannel;
      if (!(newChannel.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI)) {
        newChannel.startHeadersBlocker ();
      }
    }
    return newChannel;
  },

  /**
   *  実チャネルに委譲するプロパティを定義する
   *
   * @param  String name 
   *         プロパティ名
   * @param  Boolean readonly
   *         読込専用か (setter も定義するか)
   */
  defineDelegateProperty : function (name, readonly) {
    var getter = function () { return this._realChannel [name]; };
    var setter = null;
    if (!readonly) {
      setter = function (newValue) { this._realChannel [name] = newValue; };
    }
    this._defineGetterAndSetter (name, getter, setter);
    return this;
  },
  _defineGetterAndSetter : function (name, getter, optSetter) {
    var descriptor = {
      configurable : false,
      enumerable : true,
      get : getter,
    };
    if (optSetter) {
      descriptor.set = optSetter;
    }
    try {
      if (typeof (Object.defineProperty) == "function") {
        /* Gecko2/Firefox4 (JavaScript 1.8.5) */
        Object.defineProperty (this, name, descriptor);
      }
      else {
        /* legacy fallback */
        this.__defineGetter__ (name, getter);
        if (optSetter) {
          this.__defineSetter__ (name, optSetter);
        }
      }
    }
    catch (e) {
      Components.utils.reportError (e);
    }
  },
};

arAkahukuBypassChannel.prototype
  /* nsIRequest のメンバ */
  .defineDelegateProperty ("loadFlags")
  .defineDelegateProperty ("loadGroup")
  //.defineDelegateProperty ("name", "readonly")
  .defineDelegateProperty ("status", "readonly")
  /* nsIChannel のメンバ */
  .defineDelegateProperty ("contentCharset")
  .defineDelegateProperty ("contentLength")
  .defineDelegateProperty ("contentType")
  //.defineDelegateProperty ("notificationCallbacks")
  //.defineDelegateProperty ("originalURI")
  .defineDelegateProperty ("owner")
  .defineDelegateProperty ("securityInfo", "readonly")
  .defineDelegateProperty ("URI", "readonly");

/**
 * JPEG サムネチャネル
 *   Inherits From: nsIChannel, nsIRequest
 *                  nsITimerCallback
 *                  nsIWebProgressListener
 *
 * @param  String uri
 *         akahuku プロトコルの URI
 * @param  String originalURI 
 *         本来の URI
 * @param  String contentType
 *         MIME タイプ
 */
function arAkahukuJPEGThumbnailChannel (uri, originalURI, contentType) {
  this._originalURI = originalURI;
  this.contentType = contentType;
    
  this.URI
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
  this.URI.spec = uri;
    
  this.originalURI
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
  this.originalURI.spec = uri;
}
arAkahukuJPEGThumbnailChannel.prototype = {
  _originalURI : "",  /* String  本来の URI */
  _listener : null,   /* nsIStreamListener  チャネルのリスナ */
  _context : null,    /* nsISupports  ユーザ定義のコンテキスト */
  _targetFile : null, /* nsILocalFile  保存対象のファイル */
  _isPending : false, /* Boolean  リクエストの途中かどうか */
    
  /* nsIRequest のメンバ */
  loadFlags : 0,
  loadGroup : null,
  name : "",
  status : Cr.NS_OK,
    
  /* nsIChannel のメンバ */
  contentCharset : "",
  contentLength : -1,
  contentType : "",
  notificationCallbacks : null,
  originalURI : null,
  owner : null,
  securityInfo : null,
  URI : null,
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Cr.NS_NOINTERFACE
   * @return nsIProtocolHandler
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIChannel)
        || iid.equals (Ci.nsIRequest)
        || iid.equals (Ci.nsITimerCallback)
        || iid.equals (Ci.nsIWebProgressListener)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * リクエストのキャンセル
   *   nsIRequest.cancel
   *
   * @param  Number status
   *         ステータス
   */
  cancel : function (status) {
    this.status = status;
  },
    
  /**
   * リクエストの途中かどうか
   *   nsIRequest.isPending
   *
   * @return Boolean
   *         リクエストの途中かどうか
   */
  isPending : function () {
    return this._isPending;
  },
    
  /**
   * リクエストを再開する
   *   nsIRequest.resume
   *
   * @throws Cr.NS_ERROR_NOT_IMPLEMENTED
   */
  resume : function () {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
    
  /**
   * リクエストを停止する
   *   nsIRequest.suspend
   *
   * @throws Cr.NS_ERROR_NOT_IMPLEMENTED
   */
  suspend : function () {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
    
  /**
   * 非同期オープン
   *   nsIChannel.asyncOpen
   *
   * @param  nsIStreamListener listener
   *         チャネルのリスナ
   * @param  nsISupports context
   *         ユーザ定義のコンテキスト
   */
  asyncOpen : function (listener, context) {
    this._listener = listener;
    this._context = context;
        
    var uri
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    uri.spec = this._originalURI;
        
    var mediator
    = Components.classes
    ["@mozilla.org/appshell/window-mediator;1"]
    .getService (Ci.nsIWindowMediator);
    var chromeWindow
    = mediator
    .getMostRecentWindow ("navigator:browser");
        
    if (uri.scheme == "file") {
      this._targetFile
        = chromeWindow.arAkahukuFile.getFileFromURLSpec (uri.spec);
            
      /* asyncOpen 内で即応答するとおかしくなるので
       * タイマを走らせて遅延を作る */
      var timer
        = Cc ["@mozilla.org/timer;1"]
        .createInstance (Ci.nsITimer);
      timer.initWithCallback (this, 10, Ci.nsITimer.TYPE_ONE_SHOT);
      return;
    }
        
    var leafName
    = new Date ().getTime ()
    + "_" + Math.floor (Math.random () * 1000);
        
    var filename
    = chromeWindow.arAkahukuFile.systemDirectory
    + chromeWindow.arAkahukuFile.separator + leafName;
        
    this._targetFile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    this._targetFile.initWithPath (filename);
        
    var webBrowserPersist
    = Components
    .classes ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance (Ci.nsIWebBrowserPersist);
    var flags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_NO_CONVERSION;
    webBrowserPersist.persistFlags = flags;
    webBrowserPersist.progressListener = this;
    try {
      arAkahukuCompat.WebBrowserPersist.saveURI
        (webBrowserPersist, {uri: uri, file: this._targetFile});
    }
    catch (e) { Components.utils.reportError (e);
    }
  },
    
  /**
   * 時間経過イベント
   *   nsITimerCallback.notify
   *
   * @param  nsITimer timer
   *         呼び出し元のタイマ
   */
  notify : function (timer) {
    this._onSave ();
  },
    
  /**
   * 同期オープン
   *   nsIChannel.open
   *
   * @throws Cr.NS_ERROR_NOT_IMPLEMENTED
   */
  open : function () {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },
    
  /**
   * 監視ウィンドウのロケーションが変わった時のイベント
   *   nsIWebProgressListener.onLocationChange
   * 未使用
   */
  onLocationChange : function (webProgress, request, location) {
  },
    
  /**
   * 進行状況が変わった時のイベント
   *   nsIWebProgressListener.onProgressChange
   * 未使用
   */
  onProgressChange : function (webProgress , request,
                               curSelfProgress, maxSelfProgress,
                               curTotalProgress, maxTotalProgress) {
  },
    
  /**
   * プロトコルのセキュリティ設定が変わった時のイベント
   *   nsIWebProgressListener.onSecurityChange
   * 未使用
   */
  onSecurityChange : function (webProgress, request, state) {
  },
    
  /**
   * 状況が変わった時のイベント
   *   nsIWebProgressListener.onStateChange
   * 終了したらファイルを展開する
   *
   * @param  nsIWebProgress webProgress
   *         呼び出し元
   * @param  nsIRequest request
   *         状況の変わったリクエスト
   * @param  Number stateFlags
   *         変わった状況のフラグ
   * @param  nsresult status
   *         エラーコード
   */
  onStateChange : function (webProgress, request, stateFlags, status) {
    var httpStatus = 200;
    try {
      httpStatus
        = request.QueryInterface (Ci.nsIHttpChannel)
        .responseStatus;
    }
    catch (e) {
    }
        
    if (stateFlags
        & Ci.nsIWebProgressListener.STATE_STOP) {
      if (httpStatus < 400) {
        /* 転送が終了したら */
        this._onSave ();
        this._targetFile.remove (true);
      }
      else {
        this._onFail ();
        this._targetFile.remove (true);
      }
            
      this._targetFile = null;
    }
  },
    
  /**
   * ステータスバーに表示するメッセージが変わった時のイベント
   *   nsIWebProgressListener.onStatusChange
   * 未使用
   */
  onStatusChange : function (webProgress, request, status, message) {
  },
        
  /**
   * ファイルの保存が完了したイベント
   */
  _onSave : function () {
    var bindata = "";
    try {
      var fstream
        = Components
        .classes ["@mozilla.org/network/file-input-stream;1"]
        .createInstance (Ci.nsIFileInputStream);
      var bstream
        = Components
        .classes ["@mozilla.org/binaryinputstream;1"]
        .createInstance (Ci.nsIBinaryInputStream);
      fstream.init (this._targetFile, 0x01, 0444, 0);
      bstream.setInputStream (fstream);
      bindata = bstream.readBytes (this._targetFile.fileSize);
      bstream.close ();
      fstream.close ();
    }
    catch (e) {
      bindata = "";
    }

    var start = bindata.indexOf ("\xff\xd8", 2);
    if (start == -1) {
      bindata = "";
    }
    else {
      var end = bindata.indexOf ("\xff\xd9", start);
      if (end == -1) {
        bindata = "";
      }
      else {
        bindata = bindata.substr (start, end + 2 - start);
      }
    }
        
    var pipe
    = Cc ["@mozilla.org/pipe;1"]
    .createInstance (Ci.nsIPipe);
        
    pipe.init (false, false, bindata.length, 1, null);
        
    pipe.outputStream.write (bindata, bindata.length);
    pipe.outputStream.close ();
        
    this._isPending = true;
    try {
      this._listener.onStartRequest (this, this._context);
      this._listener.onDataAvailable (this, this._context,
                                      pipe.inputStream,
                                      0, this._targetFile.fileSize);
      this._isPending = false;
      this._listener.onStopRequest (this, this._context,
                                    Cr.NS_OK);
    }
    catch (e) {
      this._isPending = false;
    }
        
    this._listener = null;
    this._context = null;
  },
    
  /**
   * ファイルの保存が失敗したイベント
   */
  _onFail : function () {
    this._isPending = true;
    try {
      this._listener.onStartRequest (this, this._context);
      this._isPending = false;
      this._listener.onStopRequest (this, this._context,
                                    Cr.NS_OK);
    }
    catch (e) {
      this._isPending = false;
    }
        
    this._listener = null;
    this._context = null;
  }
};

/**
 * キャッシュアクセスチャネル
 *   Inherits From: nsIChannel, nsIRequest
 *                  nsICacheListener
 *
 * @param  String key
 * @param  nsIURI  uri
 */
function arAkahukuCacheChannel (key, uri) {
  this._originalKey = new String (key);
  this._candidates = [
    this._originalKey,
    this._originalKey + ".backup", //スレのバックアップキャッシュ
  ];

  this._key = this._candidates.shift ();
  this.name = uri.spec;
  this.originalURI = uri;
  this.URI = uri;
}
arAkahukuCacheChannel.prototype = {
  _isPending : false,
  _wasOpened : false,
  _canceled : false,
  _waitingForRedirectCallback : true,
  _redirectChannel : null,
  _contentEncoding : "",
  _streamConverter : null,

  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIRequest)
        || iid.equals (Ci.nsIChannel)
        || iid.equals (arAkahukuCompat.CacheStorageService.CallbackInterface)
        || iid.equals (Ci.nsIAsyncVerifyRedirectCallback)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  /* nsIRequest */
  loadFlags : Ci.nsIRequest.LOAD_NORMAL,
  loadGroup : null,
  name : "",
  status : Cr.NS_OK,
  cancel : function (status) {
    this._canceled = true;
    this.status = status;
    if (this._redirectChannel)
      this._redirectChannel.cancel (status);
    if (this._streamConverter)
      this._streamConverter.cancel (status);
  },
  isPending : function () {
    return this._isPending;
  },
  resume : function () {
    if (this._redirectChannel)
      this._redirectChannel.resume ();
    if (this._streamConverter)
      this._streamConverter.resume ();
  },
  suspend : function () {
    if (this._redirectChannel)
      this._redirectChannel.suspend ();
    if (this._streamConverter)
      this._streamConverter.suspend ();
  },

  /* nsIChannel */
  contentCharset : "",
  contentLength : -1,
  contentType : "",
  notificationCallbacks : null, //ignored
  originalURI : null,
  owner : null,
  securityInfo : null,
  URI : null,
  asyncOpen : function (listener, context) {
    if (this._isPending) throw Cr.NS_ERROR_IN_PROGRESS;
    if (this._wasOpened) throw Cr.NS_ERROR_ALREADY_OPENED;
    if (this._canceled) throw this.status;
    this._isPending = true;
    this._wasOpened = true;
    this._listener = listener;
    this._context = context;
    if (this._canceled) {
      throw this.status;
    }
    try {
      this._asyncOpenCacheEntryToRead (this._key, this);
    }
    catch (e) { Components.utils.reportError (e);
      this._isPending = false;
      this._close (Cr.NS_BINDING_FAILED);
      throw e;
    }
    if (this.loadGroup) {
      try {
        this.loadGroup.addRequest (this, null);
      } catch (e) { Components.utils.reportError (e);
      }
    }
  },
  open : function () {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  // チャネルを片付ける
  _close : function (status)
  {
    this.status = status;
    if (this._isPending) {
      if (this.loadGroup) {
        try {
          this.loadGroup.removeRequest (this, null, this.status);
        } catch (e) { }
      }
      if (status != Cr.NS_BINDING_REDIRECTED
          && status != Cr.NS_OK) {
        // リクエスト失敗
        try {
          this._listener.onStartRequest (this, this._context);
        } catch (e) { Components.utils.reportError (e); }
        this._isPending = false;
        try {
          this._listener.onStopRequest (this, this._context, status);
        } catch (e) { Components.utils.reportError (e); }
      }
      else {
        this._isPending = false;
      }
    }
    this._listener = null;
    this._context = null;
    this.notificationCallbacks = null;
    this._redirectChannel = null;
    this._streamConverter = null;
  },

  _asyncOpenCacheEntryToRead : function (key, listener)
  {
    var loadContextInfo = arAkahukuCompat.LoadContextInfo.default;
    try {
      var pb = null;
      if ("nsIPrivateBrowsingChannel" in Ci) {
        pb = this.QueryInterface (Ci.nsIPrivateBrowsingChannel);
      }
      if (pb && pb.isChannelPrivate) {
        loadContextInfo = arAkahukuCompat.LoadContextInfo.private;
      }
    }
    catch (e) {
    }
    var ios
      = Cc ["@mozilla.org/network/io-service;1"]
      .getService (Ci.nsIIOService);
    var uri = ios.newURI (key, null, null);
    var flag = arAkahukuCompat.CacheStorage.OPEN_READONLY;
    arAkahukuCompat.CacheStorageService
      .diskCacheStorage (loadContextInfo, false)
      .asyncOpenURI (uri, "", flag, this);
  },

  /**
   * nsICacheEntryOpenCallback.onCacheEntryAvailable
   *
   * @param nsICacheEntry descriptor (or nsICacheDescriptor)
   * @param boolean isNew
   * @param nsIApplicationCache appCache
   * @param nsresult result
   */
  onCacheEntryAvailable: function (descriptor, isNew, appCache, status) {
    if (this._canceled) {
      if (descriptor) descriptor.close ();
      this._close (Cr.NS_BINDING_ABORTED);
      return;
    }

    var isValidCache = false;
    if (Components.isSuccessCode (status)) {
      try { // レスポンスヘッダー解析
        var text = descriptor.getMetaDataElement ("response-head");
        var headers = (text ? text.split ("\n") : ["no response-head"]);
        var statusCode = this._parseHeaders (headers);
        if (!statusCode) {
          throw new Components.Exception
            ("Akahuku: unexpected cache status \""
             + headers [0] + "\" ("+ descriptor.key + ")",
             Cr.NS_ERROR_UNEXPECTED);
        }
        else if (statusCode [0] == "2" && descriptor.dataSize > 0) {
          isValidCache = true;
          this.contentLength = descriptor.dataSize;
        }
        else { // 404 など
          descriptor.close ();
        }
      }
      catch (e) { Components.utils.reportError (e);
        descriptor.close ();
      }
    }
    if (!isValidCache) { // 次の候補に切り替えて再調査
      var nextKey = this._candidates.shift ();
      if (nextKey) {
        this._key = nextKey;
        try {
          this._asyncOpenCacheEntryToRead (this._key, this);
        }
        catch (e) {
          if (e.result != Cr.NS_ERROR_CACHE_KEY_NOT_FOUND) {
            Components.utils.reportError (e);
          }
          // asyncOpenCacheEntryが失敗するような場合は諦める
          // TODO: or 時間をおいて再実行？
          this._close (Cr.NS_BINDING_FAILED);
        }
        return;
      }
    }

    try {
      var ischannel = null;
      var doRedirect = false;
      if (isValidCache) {
        ischannel
          = Components.classes
          ["@mozilla.org/network/input-stream-channel;1"]
          .createInstance (Ci.nsIInputStreamChannel);
        ischannel.setURI (this.URI);
        ischannel.contentStream = descriptor.openInputStream (0);          
        this._setupReplacementChannel (ischannel);
        doRedirect = true;
      }
      else {
        if (status == Cr.NS_ERROR_CACHE_KEY_NOT_FOUND
            && this.loadFlags & Ci.nsIRequest.LOAD_BYPASS_CACHE) {
          // Shift-Reload ではキャッシュが無ければ普通に開く
          var ios
            = Cc ["@mozilla.org/network/io-service;1"]
            .getService (Ci.nsIIOService);
          if ("newChannel2" in ios) {
            var ssm
              = Cc ["@mozilla.org/scriptsecuritymanager;1"]
              .getService (Ci.nsIScriptSecurityManager);
            ischannel = ios.newChannel2 (this._originalKey, null, null,
                null,
                ssm.getSystemPrincipal (),
                null,
                Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
                Ci.nsIContentPolicy.TYPE_OTHER);
          }
          else {
            ischannel = ios.newChannel (this._originalKey, null, null);
          }
          this._setupReplacementChannel (ischannel);
          doRedirect = true;
        }
        else if (this.loadFlags & Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI) {
          // キャッシュが無いよメッセージ
          ischannel = this._createFailChannel (this.URI);
        }
      }

      if (!ischannel) {
        this._close (Cr.NS_ERROR_NO_CONTENT);
        return;
      }

      if (doRedirect) {
        var verifyHelper = new arAkahukuAsyncRedirectVerifyHelper ();
        verifyHelper.init
          (this, ischannel, Ci.nsIChannelEventSink.REDIRECT_INTERNAL, this);
        this._waitingForRedirectCallback = true;
        this._redirectChannel = ischannel;
      }
      else {
        // リダイレクト通知せず直にチャネルを開く
        this._redirectChannel = ischannel;
        this.onRedirectVerifyCallback (Cr.NS_OK);
      }
    }
    catch (e) { Components.utils.reportError (e);
      this._close (Cr.NS_BINDING_FAILED);
    }
  },
  /**
   * nsICacheEntryOpenCallback.onCacheEntryCheck
   */
  onCacheEntryCheck : function (entry, appCache) {
    return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
  },
  mainThreadOnly : true,

  onRedirectVerifyCallback : function (result)
  {
    if (this._canceled && Components.isSuccessCode (result)) {
      result = Cr.NS_BINDING_ABORTED;
    }

    if (Components.isSuccessCode (result)) {
      // リダイレクト先を開く
      try {
        if (this._contentEncoding) {
          this._streamConverter
            = Components.classes
            ["@mozilla.org/streamconv;1?from="
            +this._contentEncoding
            +"&to=uncompressed"]
            .createInstance (Ci.nsIStreamConverter);
        }
        if (this._streamConverter) {
          this._streamConverter.asyncConvertData
            (this._contentEncoding, "uncompressed",
             this._listener, this._context);
          this._listener = this._streamConverter;
        }
        this._redirectChannel.asyncOpen
          (this._listener, this._context);
        if (this._waitingForRedirectCallback)
          result = Cr.NS_BINDING_REDIRECTED;
      }
      catch (e) { Components.utils.reportError (e);
        result = Cr.NS_BINDING_FAILED;
      }
    } else {
      // リダイレクト拒絶
    }

    this._waitingForRedirectCallback = false;

    this._close (result);
  },

  _parseHeaders : function (headers)
  {
    if (!/^HTTP\/1\.[10] \d\d\d /.test (headers [0])) {
      return "";
    }
    var statusCode = headers [0].substr (9, 3);
    var newLocations = new Array ();
    for (var i = 1; i < headers.length; i++) {
      if (!headers [i].match (/^([^: ]+): ([^\s]+)/)) {
        continue;
      }
      var key = RegExp.$1, value = RegExp.$2;
      switch (key) {
        case "Content-Type":
          value.replace
            (/;\s*charset=([^\s]+)/,
             function (matched, charset) {
               this.contentCharset = charset;
               return "";
             });
          this.contentType = new String (value);
          break;
        case "Content-Encoding":
          if (!this._contentEncoding) {
            this._contentEncoding = value;
          }
          break;
        case "Location":
          if (statusCode [0] == "3") {
            newLocations.push (new String (value));
          }
          break;
      }
    }

    // Locationを候補に追加 (HTTP/1.x 3xx)
    for (var i = newLocations.length - 1; i >= 0; i--) {
      this._candidates.unshift (newLocations [i]);
    }

    return statusCode;
  },

  _setupReplacementChannel : function (channel) 
  {
    channel = channel.QueryInterface (Ci.nsIChannel);
    channel.loadGroup = this.loadGroup;
    channel.notificationCallbacks = this.notificationCallbacks;
    channel.loadFlags |= (this.loadFlags | Ci.nsIChannel.LOAD_REPLACE);
    channel.originalURI = this.originalURI;

    try {
      channel = channel.QueryInterface (Ci.nsIInputStreamChannel);
    } catch (e if e.result == Cr.NS_ERROR_NO_INTERFACE) {
      return;
    }
    // 既知のコンテンツ情報を引き継ぐ
    if (this.contentType)
      channel.contentType = this.contentType;
    if (this.contentCharset)
      channel.contentCharset = this.contentCharset; 
    if (this.contentLength)
      channel.contentLength = this.contentLength;
  },

  _createFailChannel : function (uri) 
  {
    var text = "No Cache for " + this._originalKey;
    var sstream
    = Cc ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (Ci.nsIStringInputStream);
    sstream.setData (text, text.length);
        
    var inputStreamChannel
    = Cc ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (Ci.nsIInputStreamChannel);
        
    inputStreamChannel.setURI (uri);
    inputStreamChannel.contentStream = sstream;
    var channel = inputStreamChannel.QueryInterface (Ci.nsIChannel);
    channel.contentCharset = "utf-8";
    channel.contentType = "text/plain";
    channel.contentLength = text.length;
    return inputStreamChannel;
  },
};

// Gecko 2.0 以降にも対応したリダイレクト通知ヘルパー
// (based on nsAsyncRedirectVerifyHelper.cpp)
function arAkahukuAsyncRedirectVerifyHelper () 
{
}
arAkahukuAsyncRedirectVerifyHelper.prototype = {
  _callbackInitiated : false, /* Boolean */
  _expectedCallbacks : 0, /* Number VerifyCallback が返答されるはずの数 */
  _result : Cr.NS_OK, /* nsresult リダイレクト可否 */

  _oldChan : null,
  _newChan : null,
  _flags : 0,
  _callback : null,

  init : function (oldChan, newChan, flags, callback)
  {
    if (Ci.nsIAsyncVerifyRedirectCallback) {// Gecko2.0+
      callback = callback.QueryInterface (Ci.nsIAsyncVerifyRedirectCallback);
    }
    if (typeof (callback.onRedirectVerifyCallback) != "function") {
      throw new Components.Exception
        ("arAkahukuAsyncRedirectVerifyHelper: "
         + "no onRedirectVerifyCallback for a callback",
         Cr.NS_ERROR_UNEXPECTED);
    }
    this._callback = callback;
    this._oldChan = oldChan;
    this._newChan = newChan;
    this._flags   = flags;
    var tm
      = Cc ["@mozilla.org/thread-manager;1"]
      .getService (Ci.nsIThreadManager);
    this._callbackThread = tm.currentThread;

    tm.mainThread.dispatch (this, Ci.nsIThread.DISPATCH_NORMAL);
  },
  //nsIRunnable
  run : function ()
  {
    if (!Components.isSuccessCode (this._oldChan.status)) {
      this._returnCallback (Cr.NS_BINDING_ABORTED);
      return;
    }

    var gsink;
    if ("@mozilla.org/contentsecuritymanager;1" in Components.classes) {
      // Global channel event sink is deprecated since [Bug 1226909].
      // Imitage nsIOService::AsyncOnChannelRedirect in netwerk/base/nsIOService.cpp
      try {
        gsink = Components.classes
          ["@mozilla.org/contentsecuritymanager;1"]
          .getService (Ci.nsIChannelEventSink);
      }
      catch (e if e.result == Cr.NS_ERROR_XPC_GS_RETURNED_FAILURE) {
        // no nsIChannelEventSink (Gecko < 46)
      }
      catch (e) { Components.utils.reportError (e);
      }
    }
    if (!gsink && "@mozilla.org/netwerk/global-channel-event-sink;1" in Components.classes) {
      try {
        gsink = Components.classes
          ["@mozilla.org/netwerk/global-channel-event-sink;1"]
          .getService (Ci.nsIChannelEventSink);
      }
      catch (e) { Components.utils.reportError (e);
      }
    }

    try {
      if (gsink)
        this._delegateOnChannelRedirect (gsink);
    } catch (e) { Components.utils.reportError (e);
      this._returnCallback (e.result);
      return;
    }
    try {
      if (this._oldChan.notificationCallbacks) {
        this._delegateOnChannelRedirect
          (this._oldChan.notificationCallbacks);
      }
    } catch (e) { Components.utils.reportError (e);
    }
    try {
      if (this._oldChan.loadGroup
          && this._oldChan.loadGroup.notificationCallbacks) {
        this._delegateOnChannelRedirect
          (this._oldChan.loadGroup.notificationCallbacks);
      }
    } catch (e) { Components.utils.reportError (e);
    }
    this._initCallback ();
  },
  _initCallback : function ()
  {
    this._callbackInitiated = true;
    if (this._expectedCallbacks == 0)
      this._returnCallback (this._result);
  },
  _returnCallback : function (result)
  {
    try {
      this._callbackInitiated = false;
      var event = new arAkahukuAsyncRedirectVerifyHelper.Event (this._callback, result);
      this._callbackThread.dispatch (event, Ci.nsIThread.DISPATCH_NORMAL);
    } catch (e) { Components.utils.reportError (e);
      //no echo
    }
  },

  _delegateOnChannelRedirect : function (sink)
  {
    this._expectedCallbacks ++;

    if (!Components.isSuccessCode (this._oldChan.status)) {
      // 既にキャンセルされてるのでリダイレクトも中止
      this.onRedirectVerifyCallback (Cr.NS_BINDING_ABORTED);
      throw new Components.Exception
        ("Old channel has been canceled:",
         Cr.NS_BINDING_ABORTED);
    }

    var cesink;
    if (sink instanceof Ci.nsIChannelEventSink) {
      cesink = sink;
    } else {
      try {
        cesink = sink.getInterface (Ci.nsIChannelEventSink);
      } catch (e) { Components.utils.reportError (e);
        this._expectedCallbacks --;
        return;
      }
    }
    try {
      if (typeof (cesink.onChannelRedirect) == "function") {
        // Obsolete since Gecko 2.0 
        cesink.onChannelRedirect
          (this._oldChan, this._newChan, this._flags);
        this._expectedCallbacks --; // Callbackを待つ必要がない
      } else {
        // Requires Gecko 2.0 (Firefox 4)
        cesink.asyncOnChannelRedirect
          (this._oldChan, this._newChan, this._flags, this);
      }
    } catch (e) { Components.utils.reportError (e);
      // リダイレクト通知を中止
      this.onRedirectVerifyCallback (e.result);
      throw e;
    }
  },

  // リダイレクトの問い合わせ結果を受ける
  // nsIAsyncVerifyRedirectCallback
  onRedirectVerifyCallback : function (result)
  {
    this._expectedCallbacks --;
    if (!Components.isSuccessCode (result)) {
      if (Components.isSuccessCode (this._result))
        this._result = result; // 最初の否定的結果を保存
      if (this._callbackInitiated)
        this._returnCallback (this._result);
    }
    if (this._callbackInitiated
        && this._expectedCallbacks == 0) {
      this._returnCallback (this._result);
    }
  },
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsIAsyncVerifyRedirectCallback)
        || iid.equals (Ci.nsIRunnable)
        || iid.equals (Ci.nsISupports)) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
};
arAkahukuAsyncRedirectVerifyHelper.Event = function (callback, result) {
  this._callback = callback;
  this._result = result;
};
arAkahukuAsyncRedirectVerifyHelper.Event.prototype = {
  // nsIRunnable
  run : function ()
  {
    this._callback.onRedirectVerifyCallback (this._result);
  },
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsIRunnable)
        || iid.equals (Ci.nsISupports)) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
};

