/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

const nsISupports           = Components.interfaces.nsISupports;

const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsIFactory            = Components.interfaces.nsIFactory;
const nsIModule             = Components.interfaces.nsIModule;
const nsIProtocolHandler    = Components.interfaces.nsIProtocolHandler;

const nsIChannel            = Components.interfaces.nsIChannel;
const nsIRequest            = Components.interfaces.nsIRequest;
const nsIStreamListener     = Components.interfaces.nsIStreamListener;
const nsIRequestObserver    = Components.interfaces.nsIRequestObserver;
const nsIObserver           = Components.interfaces.nsIObserver;
const nsIInterfaceRequestor = Components.interfaces.nsIInterfaceRequestor;
const nsIChannelEventSink   = Components.interfaces.nsIChannelEventSink;

const nsIPipe               = Components.interfaces.nsIPipe;
const nsIIOService          = Components.interfaces.nsIIOService;
const nsIInputStreamChannel = Components.interfaces.nsIInputStreamChannel;
const nsIStringInputStream  = Components.interfaces.nsIStringInputStream;
const nsIURI                = Components.interfaces.nsIURI;
const nsIStandardURL        = Components.interfaces.nsIStandardURL;

const nsILocalFile           = Components.interfaces.nsILocalFile;
const nsIFile                = Components.interfaces.nsIFile;
const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
const nsICache               = Components.interfaces.nsICache;
const nsIHttpChannel         = Components.interfaces.nsIHttpChannel;
const nsIWebBrowserPersist   = Components.interfaces.nsIWebBrowserPersist;
const nsIWindowMediator      = Components.interfaces.nsIWindowMediator;
const nsIInputStream         = Components.interfaces.nsIInputStream;
const nsIFileInputStream     = Components.interfaces.nsIFileInputStream;
const nsIFileOutputStream    = Components.interfaces.nsIFileOutputStream;
const nsIBinaryInputStream   = Components.interfaces.nsIBinaryInputStream;

const nsITimer                = Components.interfaces.nsITimer;
const nsITimerCallback        = Components.interfaces.nsITimerCallback;

//const arIAkahukuP2PChannel    = Components.interfaces.arIAkahukuP2PChannel;
const arIAkahukuP2PServant2        = Components.interfaces.arIAkahukuP2PServant2;
const arIAkahukuP2PServantListener = Components.interfaces.arIAkahukuP2PServantListener;
const nsIStreamConverter           = Components.interfaces.nsIStreamConverter;

const arIAkahukuProtocolHandler = Components.interfaces.arIAkahukuProtocolHandler;

const nsIIDNService = Components.interfaces.nsIIDNService;

const nsIAsyncVerifyRedirectCallback = Components.interfaces.nsIAsyncVerifyRedirectCallback;
const nsIThreadManager = Components.interfaces.nsIThreadManager;
const nsIThread        = Components.interfaces.nsIThread;

var loader
= Components.classes ["@mozilla.org/moz/jssubscript-loader;1"]
.getService (Components.interfaces.mozIJSSubScriptLoader);
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
    this._realChannel = arguments [0].QueryInterface (nsIChannel);
    callbacks = this._realChannel.notificationCallbacks;
    this.originalURI = this._realChannel.originalURI.clone ();
  }
  else {
    var ios
      = Components.classes ["@mozilla.org/network/io-service;1"]
      .getService (nsIIOService);
    this._realChannel = ios.newChannel (originalURI, null, null);
    this.originalURI = ios.newURI (uri, null, null);
  }
  this.name = uri;
  /* 通知をフィルタリングする */
  this.notificationCallbacks = callbacks;
  this._realChannel.notificationCallbacks = this;

  if (contentType) {
    this.contentType = contentType;
  }
  this.loadFlags |= this._realChannel.LOAD_REPLACE;
}
arAkahukuBypassChannel.prototype = {
  _listener : null,   /* nsIStreamListener  チャネルのリスナ */
  _realChannel : null,/* nsIChannel  実チャネル */
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
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIProtocolHandler
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIChannel)
        || iid.equals (nsIRequest)
        || iid.equals (nsIObserver)
        || iid.equals (nsIInterfaceRequestor)
        || iid.equals (nsIChannelEventSink)
        || iid.equals (nsIStreamListener)
        || iid.equals (nsIRequestObserver)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
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
        throw Components.results.NS_NOINTERFACE;
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
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  open : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
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
    var httpChannel = subject.QueryInterface (nsIHttpChannel);

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
        || !(this._realChannel instanceof nsIHttpChannel)) {
      return;
    }
    var observerService
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
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
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
    observerService.removeObserver (this, "http-on-modify-request");
    observerService.removeObserver (this, "http-on-examine-response");
    this._observingHeaders = false;
  },

  /**
   * リダイレクトイベント
   *   nsIChannelEventSink.asyncOnChannelRedirect
   */
  asyncOnChannelRedirect : function (oldChannel, newChannel, flags, callback) {
    try {
      var sink
        = this.notificationCallbacks
        .getInterface (nsIChannelEventSink);
    }
    catch (e) {
      /* リダイレクトを止める */
      callback.onRedirectVerifyCallback
        (Components.results.NS_ERROR_FAILURE);
      return;
    }
    newChannel = this.createRedirectedChannel (oldChannel, newChannel);
    sink.asyncOnChannelRedirect (this, newChannel, flags, callback);
  },

  /**
   * リダイレクトイベント (Obsolete since Gecko 2)
   *   nsIChannelEventSink.onChannelRedirect
   */
  onChannelRedirect : function (oldChannel, newChannel, flags) {
    try {
      var sink
        = this.notificationCallbacks
        .getInterface (nsIChannelEventSink);
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
    if (newChannel instanceof nsIHttpChannel) {
      newChannel = new arAkahukuBypassChannel (newChannel);
      /* リダイレクト時にはリファラを付与 */
      newChannel._realChannel.referrer = oldChannel.URI;
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
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
  this.URI.spec = uri;
    
  this.originalURI
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
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
  status : Components.results.NS_OK,
    
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
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIProtocolHandler
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIChannel)
        || iid.equals (nsIRequest)
        || iid.equals (nsITimerCallback)
        || iid.equals (nsIWebProgressListener)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
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
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  resume : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  },
    
  /**
   * リクエストを停止する
   *   nsIRequest.suspend
   *
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  suspend : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
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
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
    uri.spec = this._originalURI;
        
    var mediator
    = Components.classes
    ["@mozilla.org/appshell/window-mediator;1"]
    .getService (nsIWindowMediator);
    var chromeWindow
    = mediator
    .getMostRecentWindow ("navigator:browser");
        
    if (uri.scheme == "file") {
      this._targetFile
        = chromeWindow.arAkahukuFile.getFileFromURLSpec (uri.spec);
            
      /* asyncOpen 内で即応答するとおかしくなるので
       * タイマを走らせて遅延を作る */
      var timer
        = Components.classes ["@mozilla.org/timer;1"]
        .createInstance (nsITimer);
      timer.initWithCallback (this, 10, nsITimer.TYPE_ONE_SHOT);
      return;
    }
        
    var leafName
    = new Date ().getTime ()
    + "_" + Math.floor (Math.random () * 1000);
        
    var filename
    = chromeWindow.arAkahukuFile.systemDirectory
    + chromeWindow.arAkahukuFile.separator + leafName;
        
    this._targetFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    this._targetFile.initWithPath (filename);
        
    var webBrowserPersist
    = Components
    .classes ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance (nsIWebBrowserPersist);
    var flags = nsIWebBrowserPersist.PERSIST_FLAGS_NO_CONVERSION;
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
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  open : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
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
        = request.QueryInterface (nsIHttpChannel)
        .responseStatus;
    }
    catch (e) {
    }
        
    if (stateFlags
        & nsIWebProgressListener.STATE_STOP) {
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
        .createInstance (nsIFileInputStream);
      var bstream
        = Components
        .classes ["@mozilla.org/binaryinputstream;1"]
        .createInstance (nsIBinaryInputStream);
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
    = Components.classes ["@mozilla.org/pipe;1"]
    .createInstance (nsIPipe);
        
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
                                    Components.results.NS_OK);
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
                                    Components.results.NS_OK);
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
    if (iid.equals (nsISupports)
        || iid.equals (nsIRequest)
        || iid.equals (nsIChannel)
        || iid.equals (arAkahukuCompat.CacheStorageService.CallbackInterface)
        || iid.equals (nsIAsyncVerifyRedirectCallback)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsIRequest */
  loadFlags : nsIRequest.LOAD_NORMAL,
  loadGroup : null,
  name : "",
  status : Components.results.NS_OK,
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
    if (this._isPending) throw Components.results.NS_ERROR_IN_PROGRESS;
    if (this._wasOpened) throw Components.results.NS_ERROR_ALREADY_OPENED;
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
      this._close (Components.results.NS_BINDING_FAILED);
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
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
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
      if (status != Components.results.NS_BINDING_REDIRECTED
          && status != Components.results.NS_OK) {
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
      if ("nsIPrivateBrowsingChannel" in Components.interfaces) {
        pb = this.QueryInterface (Components.interfaces.nsIPrivateBrowsingChannel);
      }
      if (pb && pb.isChannelPrivate) {
        loadContextInfo = arAkahukuCompat.LoadContextInfo.private;
      }
    }
    catch (e) {
    }
    var ios
      = Components.classes ["@mozilla.org/network/io-service;1"]
      .getService (nsIIOService);
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
      this._close (Components.results.NS_BINDING_ABORTED);
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
             Components.results.NS_ERROR_UNEXPECTED);
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
          if (e.result != Components.results.NS_ERROR_CACHE_KEY_NOT_FOUND) {
            Components.utils.reportError (e);
          }
          // asyncOpenCacheEntryが失敗するような場合は諦める
          // TODO: or 時間をおいて再実行？
          this._close (Components.results.NS_BINDING_FAILED);
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
          .createInstance (nsIInputStreamChannel);
        ischannel.setURI (this.URI);
        ischannel.contentStream = descriptor.openInputStream (0);          
        this._setupReplacementChannel (ischannel);
        doRedirect = true;
      }
      else {
        if (status == Components.results.NS_ERROR_CACHE_KEY_NOT_FOUND
            && this.loadFlags & nsIRequest.LOAD_BYPASS_CACHE) {
          // Shift-Reload ではキャッシュが無ければ普通に開く
          var ios
            = Components.classes ["@mozilla.org/network/io-service;1"]
            .getService (nsIIOService);
          ischannel = ios.newChannel (this._originalKey, null, null);
          this._setupReplacementChannel (ischannel);
          doRedirect = true;
        }
        else if (this.loadFlags & nsIChannel.LOAD_INITIAL_DOCUMENT_URI) {
          // キャッシュが無いよメッセージ
          ischannel = this._createFailChannel (this.URI);
        }
      }

      if (!ischannel) {
        this._close (Components.results.NS_ERROR_NO_CONTENT);
        return;
      }

      if (doRedirect) {
        var verifyHelper = new arAkahukuAsyncRedirectVerifyHelper ();
        verifyHelper.init
          (this, ischannel, nsIChannelEventSink.REDIRECT_INTERNAL, this);
        this._waitingForRedirectCallback = true;
        this._redirectChannel = ischannel;
      }
      else {
        // リダイレクト通知せず直にチャネルを開く
        this._redirectChannel = ischannel;
        this.onRedirectVerifyCallback (Components.results.NS_OK);
      }
    }
    catch (e) { Components.utils.reportError (e);
      this._close (Components.results.NS_BINDING_FAILED);
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
      result = Components.results.NS_BINDING_ABORTED;
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
            .createInstance (nsIStreamConverter);
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
          result = Components.results.NS_BINDING_REDIRECTED;
      }
      catch (e) { Components.utils.reportError (e);
        result = Components.results.NS_BINDING_FAILED;
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
    channel = channel.QueryInterface (nsIChannel);
    channel.loadGroup = this.loadGroup;
    channel.notificationCallbacks = this.notificationCallbacks;
    channel.loadFlags |= (this.loadFlags | nsIChannel.LOAD_REPLACE);
    channel.originalURI = this.originalURI;

    try {
      channel = channel.QueryInterface (nsIInputStreamChannel);
    } catch (e if e.result == Components.results.NS_ERROR_NO_INTERFACE) {
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
    = Components.classes ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (nsIStringInputStream);
    sstream.setData (text, text.length);
        
    var inputStreamChannel
    = Components.classes ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (nsIInputStreamChannel);
        
    inputStreamChannel.setURI (uri);
    inputStreamChannel.contentStream = sstream;
    var channel = inputStreamChannel.QueryInterface (nsIChannel);
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
  _result : Components.results.NS_OK, /* nsresult リダイレクト可否 */

  _oldChan : null,
  _newChan : null,
  _flags : 0,
  _callback : null,

  init : function (oldChan, newChan, flags, callback)
  {
    if (nsIAsyncVerifyRedirectCallback) {// Gecko2.0+
      callback = callback.QueryInterface (nsIAsyncVerifyRedirectCallback);
    }
    if (typeof (callback.onRedirectVerifyCallback) != "function") {
      throw new Components.Exception
        ("arAkahukuAsyncRedirectVerifyHelper: "
         + "no onRedirectVerifyCallback for a callback",
         Components.results.NS_ERROR_UNEXPECTED);
    }
    this._callback = callback;
    this._oldChan = oldChan;
    this._newChan = newChan;
    this._flags   = flags;
    var tm
      = Components.classes ["@mozilla.org/thread-manager;1"]
      .getService (nsIThreadManager);
    this._callbackThread = tm.currentThread;

    tm.mainThread.dispatch (this, nsIThread.DISPATCH_NORMAL);
  },
  //nsIRunnable
  run : function ()
  {
    if (!Components.isSuccessCode (this._oldChan.status)) {
      this._returnCallback (Components.results.NS_BINDING_ABORTED);
      return;
    }
    var gsink
      = Components.classes
      ["@mozilla.org/netwerk/global-channel-event-sink;1"]
      .getService (nsIChannelEventSink);
    try {
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
      this._callbackThread.dispatch (event, nsIThread.DISPATCH_NORMAL);
    } catch (e) { Components.utils.reportError (e);
      //no echo
    }
  },

  _delegateOnChannelRedirect : function (sink)
  {
    this._expectedCallbacks ++;

    if (!Components.isSuccessCode (this._oldChan.status)) {
      // 既にキャンセルされてるのでリダイレクトも中止
      this.onRedirectVerifyCallback (Components.results.NS_BINDING_ABORTED);
      throw new Components.Exception
        ("Old channel has been canceled:",
         Components.results.NS_BINDING_ABORTED);
    }

    var cesink;
    if (sink instanceof nsIChannelEventSink) {
      cesink = sink;
    } else {
      try {
        cesink = sink.getInterface (nsIChannelEventSink);
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
    if (iid.equals (nsIAsyncVerifyRedirectCallback)
        || iid.equals (Components.interfaces.nsIRunnable)
        || iid.equals (nsISupports)) {
      return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
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
    if (iid.equals (Components.interfaces.nsIRunnable)
        || iid.equals (nsISupports)) {
      return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
};

/* moved from arAkahukuP2PChannel.js */
/**
 * gzip ファイル展開用
 *   Inherits From: nsIStreamListener, nsIRequestObserver
 */
function arAkahukuGZIPFileData () {
}
arAkahukuGZIPFileData.prototype = {
  data : "",
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIStreamListener)
        || iid.equals (nsIRequestObserver)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
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
    var bstream
    = Components.classes ["@mozilla.org/binaryinputstream;1"]
    .createInstance (Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream (inputStream);
    this.data += bstream.readBytes (count);
  }
};
/**
 * P2P チャネル
 *   Inherits From: arIAkahukuP2PChannel,
 *                  nsIChannel, nsIRequest
 *                  nsIWebProgressListener
 *                  nsITimerCallback
 *                  arIAkahukuP2PServantListener
 */
function arAkahukuP2PChannel () {
}
arAkahukuP2PChannel.prototype = {
  _webURI : "",  /* String  本来の URI */
  _listener : null,   /* nsIStreamListener  チャネルのリスナ */
  _context : null,    /* nsISupports  ユーザ定義のコンテキスト */
  _isPending : false, /* Boolean  リクエストの途中かどうか */
    
  _type : 0,   /* Number  動作の形態
                *   0: キャッシュから
                *   1: チャネル
                *   2: pipe 経由 */
    
  _outputStream : null, /* nsIAsyncOutputStream  ファイルの出力先
                         *   pipe 経由の場合に使用する */
    
  _targetDirName : "",  /* String  保存先のディレクトリ名 */
  _targetFileName : "", /* String  保存先のファイル名 */
  _cacheFileName : "",  /* String  保存先のキャッシュファイル名 */

  _targetFileServer : "",  /* String  対象のファイルのサーバ名 */
  _targetFilePort : "",    /* String  対象のファイルのポート番号 */
  _targetFileDir : "",     /* String  対象のファイルのディレクトリ */
  _targetFileType : "",    /* String  対象のファイルの種類
                            *   src   : 元画像
                            *   thumb : サムネ
                            *   cat   : カタログ */
  _targetFileLeafName : "", /* String  対象のファイルのファイル名 */
    
  _isGecko19 : false,       /* Boolean  Gecko 1.9 か */
    
  /* nsIRequest のメンバ */
  loadFlags : 0,
  loadGroup : null,
  name : "",
  status : Components.results.NS_OK,
    
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
   * @throws Components.results.NS_NOINTERFACE
   * @return arIAkahukuP2PChannel
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIChannel)
        || iid.equals (nsIRequest)
        || iid.equals (nsIWebProgressListener)
        || iid.equals (nsITimerCallback)
        || iid.equals (arIAkahukuP2PServantListener)
        || iid.equals (arIAkahukuP2PChannel)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 初期化
   *   arIAkahukuP2PChannel.init
   *
   * @param  String uri
   *         akahuku プロトコルの URI
   * @return nsIChannel
   *         キャッシュのチャネル
   *         失敗すれば null
   */
  init : function (uri) {
    if (uri.match (/^akahuku:\/\/([^\/]*)\/(p2p)\/([A-Za-z0-9\-]+)\.([0-9]+)\/(.+)$/)) {
      var host = RegExp.$1;
      // var type = RegExp.$2;
      var protocol = RegExp.$3;
      var sep = parseInt (RegExp.$4);
      var path = RegExp.$5;
            
      var sep1 = (sep & 1) ? "//" : "";
      var sep2 = (sep & 2) ? "//" : "";
      var sep3 = (sep & 4) ? "/" : "";
            
      this._webURI
      = protocol + ":" + sep1 + host + sep2 + sep3 + path;
    }
    else {
      return null;
    }
        
    var servant
    = Components.classes ["@unmht.org/akahuku-p2p-servant;2"]
    .getService (arIAkahukuP2PServant2);
        
    this.URI
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
    this.URI.spec = uri;
    
    this.originalURI
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
    this.originalURI.spec = uri;
        
    this._targetFileServer = "";
    if (this._webURI.match
        (/^http:\/\/([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
      /* サーバ名、ディレクトリ名、種類、ファイル名を取得 */
      this._targetFileServer = RegExp.$1;
      this._targetFilePort = RegExp.$2;
      var sdir = RegExp.$3;
      this._targetFileDir = RegExp.$4;
      this._targetFileType = RegExp.$5;
      var leafName = RegExp.$6;
      var ext = RegExp.$7;
      if (leafName.length == 17) {
        /* 末尾にランダム文字列が付いている場合、取り除く */
        leafName = leafName.substr (0, leafName.length - 4);
      }
      if (ext.match (/^jpg$/i)) {
        this.contentType = "image/jpeg";
      }
      else if (ext.match (/^gif$/i)) {
        this.contentType = "image/gif";
      }
      else if (ext.match (/^png$/i)) {
        this.contentType = "image/png";
      }
      else {
        return null;
      }
            
      if (sdir) {
        sdir = sdir.replace (/\//, "");
        if (servant.getTreatAsSame ()) {
          this._targetFileServer = sdir;
        }
        else {
          this._targetFileDir = sdir + "-" + this._targetFileDir;
        }
      }
            
      this._targetFileLeafName = leafName + "." + ext;
    }
    else if (this._webURI.match
             (/^http:\/\/www\.(nijibox)5\.com\/futabafiles\/(tubu)\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
      /* サーバ名、ディレクトリ名、種類、ファイル名を取得 */
      this._targetFileServer = RegExp.$1;
      this._targetFileDir = RegExp.$2;
      this._targetFileType = RegExp.$3;
      var leafName = RegExp.$4;
      var ext = RegExp.$5;
            
      if (ext.match (/^jpg$/i)) {
        this.contentType = "image/jpeg";
      }
      else if (ext.match (/^gif$/i)) {
        this.contentType = "image/gif";
      }
      else if (ext.match (/^png$/i)) {
        this.contentType = "image/png";
      }
      else {
        return null;
      }
            
      this._targetFileLeafName = leafName + "." + ext;
    }
    else {
      return null;
    }
    
    var board = this._targetFileServer + "/" + this._targetFileDir;
    if (this._targetFileDir.match (/^([^\-]+)\-([^\-]+)$/)) {
      board = RegExp.$1 + "/" + RegExp.$2;
    }
    if (this._targetFileType == "cat") {
      board += "_cat";
    }
    servant.visitBoard (board);
    
    var mediator
    = Components.classes
    ["@mozilla.org/appshell/window-mediator;1"]
    .getService (nsIWindowMediator);
    var chromeWindow
    = mediator
    .getMostRecentWindow ("navigator:browser");
        
    this._isGecko19 = false;
        
    try {
      var re;
      if (re = chromeWindow.navigator.userAgent.match (/rv:([0-9]+\.[0-9]+)/)) {
        if (parseFloat (re [1]) >= 1.9) {
          this._isGecko19 = true;
        }
      }
    }
    catch (e) { Components.utils.reportError (e);
    }
        
    if (chromeWindow.arAkahukuP2P.cacheBase) {
      this._targetDirName
      = chromeWindow.arAkahukuP2P.cacheBase
      + chromeWindow.arAkahukuFile.separator
      + this._targetFileServer
      + chromeWindow.arAkahukuFile.separator
      + this._targetFileDir
      + chromeWindow.arAkahukuFile.separator
      + this._targetFileType;
        
      this._targetFileName
      = this._targetDirName
      + chromeWindow.arAkahukuFile.separator
      + this._targetFileLeafName;
        
      var tmp
      = new Date ().getTime ()
      + "_" + Math.floor (Math.random () * 1000);
        
      this._cacheFileName
      = this._targetDirName
      + chromeWindow.arAkahukuFile.separator
      + tmp;
    }
    else {
      return null;
    }
        
    var cacheChannel = this._getCacheChannel ();
    if (cacheChannel) {
      /* キャッシュがあればキャッシュから */
      this._type = 0;
      return cacheChannel;
    }
        
    if (this._isGecko19) {
      /* Gecko 1.9 以降では */
      this._type = 2;

      return this._getPipedChannel ();
    }
        
    if (this.contentType == "image/jpeg") {
      /* JPEG ならば pipe を経由しない */
      this._type = 1;
      return this;
    }
    else {
      /* PNG、GIF ならばパイプを通して返す */
      this._type = 2;
      return this._getPipedChannel ();
    }
  },
    
  /**
   * キャッシュのチャネルを取得する
   * 
   * @return nsIInputStreamChannel
   *         キャッシュのチャネル
   *         キャッシュが無ければ null
   */
  _getCacheChannel : function () {
    var targetFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
        
    if (!targetFile.exists ()) {
      return null;
    }
        
    var fstream
    = Components.classes
    ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (nsIFileInputStream);
    fstream.init (targetFile, 0x01, 0444, 0);
        
    var bstream
    = Components.classes
    ["@mozilla.org/binaryinputstream;1"]
    .createInstance
    (Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream (fstream);
    var data = "";
    data += bstream.readBytes (3);
    bstream.close ();
    fstream.close ();
        
    if (data.length == 3
        && data == "\x1f\x8b\x08") {
      /* gzip 圧縮されている */
            
      this.gunzipFile (targetFile);
            
      targetFile
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (nsILocalFile);
      targetFile.initWithPath (this._targetFileName);
            
    }
        
    fstream
    = Components.classes
    ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (nsIFileInputStream);
    fstream.init (targetFile, 0x01, 0444, 0);
        
    var inputStreamChannel
    = Components.classes
    ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (nsIInputStreamChannel);
        
    inputStreamChannel.setURI (this.URI);
    inputStreamChannel.QueryInterface (nsIChannel).contentType
    = this.contentType;
    inputStreamChannel.contentStream = fstream;
    inputStreamChannel.QueryInterface (nsIChannel).contentLength
    = targetFile.fileSize;
        
    return inputStreamChannel;
  },
    
  gunzipFile : function (targetFile) {
    var ifstream
    = Components.classes
    ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (nsIFileInputStream);
    ifstream.init (targetFile, 0x01, 0444, 0);
            
    var fileData = new arAkahukuGZIPFileData ();
    var converter
    = Components.classes
    ["@mozilla.org/streamconv;1?from=gzip&to=uncompressed"]
    .createInstance (nsIStreamConverter);
    converter.asyncConvertData ("gzip", "uncompressed",
                                fileData, null);
    var listener
    = converter.QueryInterface
    (Components.interfaces.nsIStreamListener);
    listener.onStartRequest (null, null);
    listener.onDataAvailable (null, null,
                              ifstream, 0, targetFile.fileSize);
    ifstream.close ();
    listener.onStopRequest (null, null, 0);
            
    var cacheFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    cacheFile.initWithPath (this._targetFileName + ".conv");
    var ofstream
    = Components.classes
    ["@mozilla.org/network/file-output-stream;1"]
    .createInstance (nsIFileOutputStream);
    ofstream.init (cacheFile, 0x02 | 0x08 | 0x20, 0644, 0);
    ofstream.write (fileData.data, fileData.data.length);
    ofstream.close ();
            
    targetFile.remove (true);
    cacheFile.moveTo (null, this._targetFileLeafName);
        
    targetFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
            
    var servant
    = Components.classes ["@unmht.org/akahuku-p2p-servant;2"]
    .getService (arIAkahukuP2PServant2);
    servant.createHashFile (targetFile,
                            this._targetFileLeafName, "");
  },
    
  /**
   * pipe 経由のチャネルを取得する
   * 
   * @return nsIInputStreamChannel
   *         pipe 経由のチャネル
   */
  _getPipedChannel : function () {
    var pipe
    = Components.classes ["@mozilla.org/pipe;1"]
    .createInstance (nsIPipe);
        
    if (this._isGecko19) {
      pipe.init (true, true, 0, 0xffffffff, null);
    }
    else {
      pipe.init (false, false, 0, 0xffffffff, null);
    }
        
    var inputStreamChannel
    = Components
    .classes ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (nsIInputStreamChannel);
        
    inputStreamChannel.setURI (this.URI);
    inputStreamChannel.QueryInterface (nsIChannel).contentType
    = this.contentType;
    inputStreamChannel.QueryInterface (nsIChannel).contentCharset = "";
    inputStreamChannel.contentStream = pipe.inputStream;
    if (this._isGecko19) {
      inputStreamChannel.QueryInterface (nsIChannel).contentLength
        = -1;
    }
    else {
      inputStreamChannel.QueryInterface (nsIChannel).contentLength
      = 1024 * 1024;
    }
            
    this._outputStream = pipe.outputStream;
    this._getFromP2P ();
        
    return inputStreamChannel;
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
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  resume : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  },
    
  /**
   * リクエストを停止する
   *   nsIRequest.suspend
   *
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  suspend : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
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
        
    /* asyncOpen 内で即応答するとおかしくなるので
     * タイマを走らせて遅延を作る */
    var timer
    = Components.classes ["@mozilla.org/timer;1"]
    .createInstance (nsITimer);
    timer.initWithCallback (this, 100, nsITimer.TYPE_ONE_SHOT);
  },
    
  /**
   * 同期オープン
   *   nsIChannel.open
   *
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   */
  open : function () {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
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
  onProgressChange: function (webProgress , request,
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
        = request.QueryInterface (nsIHttpChannel)
        .responseStatus;
    }
    catch (e) {
    }
        
    if (stateFlags
        & nsIWebProgressListener.STATE_STOP) {
      if (httpStatus < 400) {
        /* 転送が終了したら */
        try {
          var servant
          = Components.classes
          ["@unmht.org/akahuku-p2p-servant;2"]
          .getService (arIAkahukuP2PServant2);
                    
          /* キャッシュから元のファイルを作成 */
          var cacheFile
          = Components.classes ["@mozilla.org/file/local;1"]
          .createInstance (nsILocalFile);
          cacheFile.initWithPath (this._cacheFileName);
                    
          var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (nsIFileInputStream);
          fstream.init (cacheFile, 0x01, 0444, 0);
          var bstream
          = Components.classes
          ["@mozilla.org/binaryinputstream;1"]
          .createInstance
          (Components.interfaces.nsIBinaryInputStream);
          bstream.setInputStream (fstream);
          var data = "";
          while (fstream.available ()) {
            data += bstream.readBytes (fstream.available ());
          }
          bstream.close ();
          fstream.close ();
                    
          if (data.length > 1
              && data.substr (0, 1) == "<") {
          }
          else {
            cacheFile.moveTo (null, this._targetFileLeafName);
                    
            /* ハッシュを作成 */
            var targetFile
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (nsILocalFile);
            targetFile.initWithPath (this._targetFileName);
            servant.createHashFile (targetFile,
                                    this._targetFileLeafName, "");
                    
            this._onSave ();
            return;
          }
        }
        catch (e) { Components.utils.reportError (e);
        }
      }
            
      var cacheFile
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (nsILocalFile);
      cacheFile.initWithPath (this._cacheFileName);
      if (cacheFile.exists ()) {
        cacheFile.remove (true);
      }
            
      this._onFail ();
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
   * 時間経過イベント
   *   nsITimerCallback.notify
   *
   * @param  nsITimer timer
   *         呼び出し元のタイマ
   */
  notify : function (tiemr) {
    if (this._type == 1) {
      this._isPending = true;
      try {
        this._listener.onStartRequest (this, this._context);
      }
      catch (e) {
        this._isPending = false;
        this._listener = null;
        return;
      }
    }
        
    this._getFromP2P ();
  },
    
  /**
   * ファイルを P2P ネットワークから取得する
   */
  _getFromP2P : function () {
    var servant
    = Components.classes ["@unmht.org/akahuku-p2p-servant;2"]
    .getService (arIAkahukuP2PServant2);
    servant.getFile ("/" + this._targetFileServer
                     + "/" + this._targetFileDir
                     + "/" + this._targetFileType
                     + "/" + this._targetFileLeafName,
                     this);
  },
    
  /**
   * P2P による取得に成功したイベント
   *   arIAkahukuP2PServantListener.onP2PSave
   */
  onP2PSave : function () {
    this._onSave ();
  },
    
  /**
   * P2P による取得に失敗したイベント
   *   arIAkahukuP2PServantListener.onP2PFail
   */
  onP2PFail : function () {
    this._getFromWeb ();
  },
    
  /**
   * ファイルを元のサーバから取得する
   */
  _getFromWeb : function () {
    var targetDir
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    targetDir.initWithPath (this._targetDirName);
    if (!targetDir.exists ()) {
      targetDir.create (nsIFile.DIRECTORY_TYPE, 0755);
    }
        
    var cacheFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    cacheFile.initWithPath (this._cacheFileName);
        
    var uri
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
    uri.spec = this._webURI;
        
    var webBrowserPersist
    = Components
    .classes ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance (nsIWebBrowserPersist);
    var flags = nsIWebBrowserPersist.PERSIST_FLAGS_NONE;
    webBrowserPersist.persistFlags = flags;
    webBrowserPersist.progressListener = this;
    try {
      arAkahukuCompat.WebBrowserPersist.saveURI
        (webBrowserPersist, {uri: uri, file: cacheFile});
    }
    catch (e) { Components.utils.reportError (e);
    }
  },
    
  /**
   * ファイルの保存が完了したイベント
   */
  _onSave : function () {
    var targetFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
        
    if (targetFile.exists ()) {
      /* キャッシュファイルは突然消える */
      try {
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (nsIFileInputStream);
        fstream.init (targetFile, 0x01, 0444, 0);
                
        var bstream
          = Components.classes
          ["@mozilla.org/binaryinputstream;1"]
          .createInstance
          (Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream (fstream);
        var data = "";
        data += bstream.readBytes (3);
        bstream.close ();
        fstream.close ();
                
        if (data.length == 3
            && data == "\x1f\x8b\x08") {
          /* gzip 圧縮されている */
            
          this.gunzipFile (targetFile);
            
          targetFile
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (nsILocalFile);
          targetFile.initWithPath (this._targetFileName);
            
        }
                
        fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (nsIFileInputStream);
        fstream.init (targetFile, 0x01, 0444, 0);
                
        if (this._type == 1) {
          this._listener.onDataAvailable
            (this, this._context, fstream,
             0, targetFile.fileSize);
        }
        else if (this._type == 2) {
          if (targetFile.fileSize > 0) {
            var bstream
              = Components.classes
              ["@mozilla.org/binaryinputstream;1"]
              .createInstance (nsIBinaryInputStream);
            bstream.setInputStream (fstream);
            var wrote, size;
            wrote = 0;
            size = 0;
                        
            while (wrote < targetFile.fileSize) {
              size = targetFile.fileSize - wrote;
              if (this._isGecko19) {
                if (size > 1024) {
                  size = 1024;
                }
              }
                        
              var bindata = bstream.readBytes (size);
              try {
              size
                = this._outputStream.write
                (bindata, bindata.length);
              }
              catch (e if e.result == Components.results.NS_BINDING_ABORTED) {
                break;
              }
              wrote += size;
            }
            bstream.close ();
          }
        }
      }
      catch (e) { Components.utils.reportError (e);
      }
    }
        
    if (this._type == 1) {
      try {
        this._isPending = false;
        this._listener.onStopRequest (this, this._context,
                                      Components.results.NS_OK);
      }
      catch (e) { Components.utils.reportError (e);
        this._isPending = false;
      }
    }
    else if (this._type == 2) {
      try {
        this._outputStream.close ()
      }
      catch (e) { Components.utils.reportError (e);
      }
    }
        
    try {
      fstream.close ();
    }
    catch (e) { Components.utils.reportError (e);
    }
        
    this._listener = null;
    this._context = null;
    this._outputStream = null;
  },
    
  /**
   * ファイルの保存が失敗したイベント
   */
  _onFail : function () {
    if (this._type == 1) {
      try {
        this._isPending = false;
        this._listener.onStopRequest (this, this._context,
                                      Components.results.NS_OK);
      }
      catch (e) {
      }
    }
    else if (this._type == 2) {
      try {
        this._outputStream.close ()
      }
      catch (e) { Components.utils.reportError (e);
      }
    }
        
    this._listener = null;
    this._context = null;
    this._outputStream = null;
  }
};


var arAkahukuProtocolHandlerKey = "";

/**
 * 本体
 * akahuku プロトコルからチャネルを生成する
 *   Inherits From: nsIProtocolHandler, arIAkahukuProtocolHandler
 */
function arAkahukuProtocolHandler () {
}
arAkahukuProtocolHandler.prototype = {
  scheme : "akahuku", /* String  プロトコルスキーム */
  defaultPort : -1, /* Number  ポート番号
                     *   ネットワークベースではないので -1 */
    
  protocolFlags: nsIProtocolHandler.URI_NOAUTH, /* Number プロトコルの詳細
                                                 *   file と同様のプロトコル */
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIProtocolHandler
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIProtocolHandler)
        || iid.equals (arIAkahukuProtocolHandler)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 16 進文字列にエンコードする
   *
   * @param  String text
   *         エンコードする文字列
   * @return String
   *         エンコードした文字列
   */
  toHex : function (text) {
    var hex = [
      "0", "1", "2", "3", "4", "5", "6", "7",
      "8", "9", "a", "b", "c", "d", "e", "f"
      ];
        
    var result = "";
    var c;
        
    for (var i = 0; i < text.length; i ++) {
      c = text.charCodeAt (i) & 0xff;
      result += hex [(c >> 4) & 0x0f];
      result += hex [c        & 0x0f];
    }
        
    return result;
  },
    
  /**
   * MD5 を 4 バイトずつ区切って XOR を取る
   *
   * @param  String data
   *         元の文字列
   * @return String
   *         MD5 を 4 バイトずつ区切って XOR を取ったもの
   */
  md5_4 : function (data) {
    var r
    = new Array (7, 12, 17, 22,
                 5,  9, 14, 20,
                 4, 11, 16, 23,
                 6, 10, 15, 21);
            
    var k = new Array ();
            
    for (var i = 0; i < 64; i ++) {
      k [i]
        = parseInt (Math.abs (Math.sin (i + 1)) * Math.pow (2, 32));
    }
                                
    var h0 = 0x67452301;
    var h1 = 0xEFCDAB89;
    var h2 = 0x98BADCFE;
    var h3 = 0x10325476;
            
    var length = data.length * 8;
    data += "\x80";
    while (data.length % 64 != 56) {
      data += "\x00";
    }
            
    data += String.fromCharCode ((length      )  & 0xff);
    data += String.fromCharCode ((length >>  8)  & 0xff);
    data += String.fromCharCode ((length >> 16)  & 0xff);
    data += String.fromCharCode ((length >> 24)  & 0xff);
    data += String.fromCharCode (0x00);
    data += String.fromCharCode (0x00);
    data += String.fromCharCode (0x00);
    data += String.fromCharCode (0x00);
            
    for (var j = 0; j < data.length; j += 64) {
      var w = new Array ();
      for (var i = 0; i < 16; i ++) {
        w [i]
          = (data.charCodeAt (j + i * 4    )      )
          | (data.charCodeAt (j + i * 4 + 1) <<  8)
          | (data.charCodeAt (j + i * 4 + 2) << 16)
          | (data.charCodeAt (j + i * 4 + 3) << 24);
      }
                
      var a = h0;
      var b = h1;
      var c = h2;
      var d = h3;
                
      for (var i = 0; i < 64; i ++) {
        var f, g, ii;
        if (0 <= i && i <= 15) {
          f = (b & c) | (~b & d);
          g = i;
          ii = i % 4;
        }
        else if (16 <= i && i <= 31) {
          f = (d & b) | (~d & c);
          g = (5 * i + 1) % 16;
          ii = 4 + (i % 4);
        }
        else if (32 <= i && i <= 47) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
          ii = 8 + (i % 4);
        }
        else if (48 <= i && i <= 63) {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
          ii = 12 + (i % 4);
        }
                    
        var temp = d;
        d = c;
        c = b;
        var temp2 = a + f + k [i] + w [g];
        while (temp2 < 0) {
          temp2 += 4294967296;
        }
        while (temp2 > 4294967295) {
          temp2 -= 4294967296;
        }
        var temp3 = (temp2 << r [ii]) | (temp2 >>> (32 - r [ii]));
        temp3 += b;
        while (temp3 < 0) {
          temp3 += 4294967296;
        }
        while (temp3 > 4294967295) {
          temp3 -= 4294967296;
        }
        b = temp3;
        a = temp;
      }
                
      h0 = h0 + a;
      h1 = h1 + b;
      h2 = h2 + c;
      h3 = h3 + d;
    }
            
    data
    = String.fromCharCode ((h0      ) & 0xff)
    + String.fromCharCode ((h0 >>  8) & 0xff)
    + String.fromCharCode ((h0 >> 16) & 0xff)
    + String.fromCharCode ((h0 >> 24) & 0xff)
    + String.fromCharCode ((h1      ) & 0xff)
    + String.fromCharCode ((h1 >>  8) & 0xff)
    + String.fromCharCode ((h1 >> 16) & 0xff)
    + String.fromCharCode ((h1 >> 24) & 0xff)
    + String.fromCharCode ((h2      ) & 0xff)
    + String.fromCharCode ((h2 >>  8) & 0xff)
    + String.fromCharCode ((h2 >> 16) & 0xff)
    + String.fromCharCode ((h2 >> 24) & 0xff)
    + String.fromCharCode ((h3      ) & 0xff)
    + String.fromCharCode ((h3 >>  8) & 0xff)
    + String.fromCharCode ((h3 >> 16) & 0xff)
    + String.fromCharCode ((h3 >> 24) & 0xff);
        
    data
    = String.fromCharCode (data.charCodeAt (0)
                           ^ data.charCodeAt (4)
                           ^ data.charCodeAt (8)
                           ^ data.charCodeAt (12))
    + String.fromCharCode (data.charCodeAt (1)
                           ^ data.charCodeAt (5)
                           ^ data.charCodeAt (9)
                           ^ data.charCodeAt (13))
    + String.fromCharCode (data.charCodeAt (2)
                           ^ data.charCodeAt (6)
                           ^ data.charCodeAt (10)
                           ^ data.charCodeAt (14))
    + String.fromCharCode (data.charCodeAt (3)
                           ^ data.charCodeAt (7)
                           ^ data.charCodeAt (11)
                           ^ data.charCodeAt (15));
        
    return data;
  },
    
  /**
   * akahuku:// 形式の URI にする
   *   arIAkahukuProtocolHandler.enAkahukuURI
   *
   * @param  String type
   *         種類
   *           "p2p"
   *           "preview"
   *           "jpeg"
   *           "cache"
   * @param  String uri
   *         URI
   * @return String
   *         akahuku:// 形式の URI
   */
  enAkahukuURI : function (type, uri) {
    if (type == "p2p") {
      if (uri.match (/^http:\/\/dec\.2chan\.net\/up\/src\//)) {
        return uri;
      }
    }
    
    uri = this.deAkahukuURI (uri); // 二重エンコードしないと保証
    if (uri
        .match (/^([A-Za-z0-9\-]+):(\/\/)?([^\/]*)(\/\/)?(\/)?(.*)$/)) {
      var protocol = RegExp.$1;
      var sep1 = RegExp.$2;
      var host = RegExp.$3;
      var sep2 = RegExp.$4;
      var sep3 = RegExp.$5;
      var path = RegExp.$6;
                 
      var sep = 0;
      if (sep1) {
        sep |= 1;
      }
      if (sep2) {
        sep |= 2;
      }
      if (sep3) {
        sep |= 4;
      }
            
      if (!host) {
        /* ホスト名省略はしない */
        host = "localhost";
      }
            
      if (type == "preview") {
        type
        = type + "."
        + this.getHash (protocol, host, path);
      }
            
      uri
      = "akahuku://" + host + "/" + type
      + "/" + protocol + "." + sep + "/" + path;
    }
        
    return uri;
  },
    
  /**
   * akahuku:// 形式の URI かどうかを返す
   *   arIAkahukuProtocolHandler.isAkahukuURI
   *
   * @param  String uri
   *         URI
   * @return Boolean
   *         akahuku:// 形式の URI かどうか
   */
  isAkahukuURI : function (uri) {
    var param = this.getAkahukuURIParam (uri);
    if ("original" in param) {
      return true;
    }
        
    return false;
  },
    
  /**
   * akahuku:// 形式の URI を元に戻す
   *   arIAkahukuProtocolHandler.deAkahukuURI
   *
   * @param  String uri
   *         akahuku:// 形式の URI
   * @return String
   *         URI
   */
  deAkahukuURI : function (uri) {
    var param = this.getAkahukuURIParam (uri);
    if ("original" in param) {
      return param.original;
    }
        
    return uri;
  },
    
  /**
   * akahuku:// 形式の URI の情報を取得する
   *   arIAkahukuProtocolHandler.getAkahukuURIParam
   *
   * @param  String uri
   *         akahuku:// 形式の URI
   * @return Object
   *         URI の情報
   */
  getAkahukuURIParam : function (uri) {
    var param = new Object ();
        
    if (uri
        .match (/^akahuku:\/\/([^\/]*)\/([^\/]+)\/([A-Za-z0-9\-]+)\.([0-9]+)\/(.*)$/)) {
      param.host = RegExp.$1;
      param.type = RegExp.$2;
      param.protocol = RegExp.$3;
      var sep = parseInt (RegExp.$4);
      param.path = RegExp.$5;
            
      try {
        var idn
          = Components.classes
          ["@mozilla.org/network/idn-service;1"].
          getService (nsIIDNService);
                
        param.host = idn.convertUTF8toACE (param.host);
      }
      catch (e) {
      }
            
      var sep1 = (sep & 1) ? "//" : "";
      var sep2 = (sep & 2) ? "//" : "";
      var sep3 = (sep & 4) ? "/" : "";
            
      if (param.type.match (/^preview\.(.+)/)) {
        param.type = "preview";
        param.hash = RegExp.$1;
      }
            
      param.original
        = param.protocol + ":" + sep1 + param.host + sep2 + sep3
        + param.path;
    }
        
    return param;
  },
    
  /**
   * ハッシュを生成する
   *
   * @param  String protocol
   *         プロトコル
   * @param  String host
   *         ホスト
   * @param  String path
   *         パス
   * @return String
   *         ハッシュ
   */
  getHash : function (protocol, host, path) { 
    var hash;
    hash
    = this.toHex (this.md5_4 (arAkahukuProtocolHandlerKey
                              + "@" + protocol
                              + "/" + host
                              + "/" + path));
    return hash;
  },
    
  /**
   * ブラックリストのポートを上書きするか
   *   nsIProtocolHandler.allowPort
   *
   * @param  Number port
   *         ポート番号
   * @param  String scheme
   *         プロトコルスキーム
   * @return Boolean
   *         上書きするか
   */
  allowPort : function (port, scheme) {
    return false;
  },
    
  /**
   * URI を作成する
   *   nsIProtocolHandler.newURI
   *
   * @param  String spec
   *         対象の URI
   * @param  String charset
   *         対象の文字コード
   * @param  nsIURI baseURI
   *         読み込み元の URI
   * @return nsIURI
   *         作成した URI
   */
  newURI : function (spec, charset, baseURI) {
    var url
      = Components.classes ["@mozilla.org/network/standard-url;1"]
      .createInstance (nsIStandardURL);
    var preamble; // encoded type, protocol, and sep
    if (baseURI) {
      // 相対アドレスを正しく解決させるために preamble を除外しておく
      baseURI = baseURI.clone ();
      var r = /^\/(?:p2p|preview\.[^\/]+|jpeg|(?:file)?cache)\/\w+\.\d(?=\/)/;
      var match = r.exec (baseURI.path);
      if (match) {
        preamble = match [0];
        baseURI.path = baseURI.path.substr (preamble.length);
        // filecache からの相対アドレスはただの cache へ変換
        preamble = preamble.replace (/^\/filecache/,"/cache");
      }
    }
    url.init
      (nsIStandardURL.URLTYPE_AUTHORITY, -1, spec, charset, baseURI);
    var uri = url.QueryInterface (nsIURI);
    if (preamble && uri.spec != spec) {
      // 相対アドレスが解決された後に preamble を戻す
      uri.path = preamble + uri.path;
    }
    return uri;

    // 必要？
    var pos;
    while ((pos = spec.indexOf ("akahuku://", 1)) > 0) {
      /* Bazzacuda Image Saver が相対パスの連結に失敗する
       * 先頭以外にプロトコル指定があれば以前を削除 */
            
      spec = spec.substr (pos);
    }
        
    var uri
    = Components.classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (nsIURI);
    uri.spec = spec;
        
    return uri;
  },
    
  /**
   * チャネルを作成する
   *   nsIProtocolHandler.newChannel
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return nsIChannel
   *         作成したチャネル
   */
  newChannel : function (uri) {
    var pos;
    while ((pos = uri.spec.indexOf ("akahuku://", 1)) > 0) {
      /* Bazzacuda Image Saver が相対パスの連結に失敗する
       * 先頭以外にプロトコル指定があれば以前を削除 */
            
      uri.spec = uri.spec.substr (pos);
    }
    var param = this.getAkahukuURIParam (uri.spec);
    if (param.type == "p2p") {
      /* P2P */
      return this._createP2PChannel (uri);
    }
    else if (param.type == "preview") {
      /* プレビュー */
      return this._createPreviewChannel (uri);
    }
    else if (param.type == "jpeg") {
      /* JPEG サムネ */
      return this._createJPEGThumbnailChannel (uri);
    }
    else if (param.type == "cache") {
      /* スレバックアップキャッシュ */
      return this._createThreadCacheChannel (uri, false);
    }
    else if (param.type == "filecache") {
      /* スレバックアップキャッシュ (ファイル) */
      return this._createThreadCacheChannel (uri, true);
    }
        
    return this._createEmptyChannel (uri);
  },
    
  /**
   * プレビューのチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return nsIChannel
   *         作成したチャネル
   */
  _createPreviewChannel : function (uri) {
    var param = this.getAkahukuURIParam (uri.spec);
        
    if (param.hash
        != this.getHash (param.protocol, param.host, param.path)) {
      return this._createEmptyChannel (uri);
    }
        
    var contentType = "";
    var tmp = param.original;
    tmp = tmp.replace (/\?.*/, "");
    if (tmp.match (/\.jpe?g$/i)) {
      contentType = "image/jpeg";
    }
    else if (tmp.match (/\.gif$/i)) {
      contentType = "image/gif";
    }
    else if (tmp.match (/\.png$/i)) {
      contentType = "image/png";
    }
    else if (/\.bmp$/i.test (tmp)) {
      contentType = "image/bmp";
    }
    else {
      /* 画像以外でもバイパスチャネルの利用を許可する
      return this._createEmptyChannel (uri);
      */
    }
        
    var channel = new arAkahukuBypassChannel (uri.spec,
                                              param.original,
                                              contentType);
        
    return channel;
  },
    
  /**
   * unescape の代替品
   * 旧バージョンの場合このスコープでは未定義なので使用する
   *
   * @param  String text
   *         エスケープ解除する文字列
   * @return String
   *         エスケープ解除した文字列
   */
  _unescape : function (text) {
    text
    = text.replace (/%([0-9A-Za-z][0-9A-Za-z])/g,
                    function (match, part1) {
                      return String
                      .fromCharCode (parseInt ("0x" + part1));
                    });
        
    return text;
  },
    
  /**
   * JPEG サムネのチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return nsIChannel
   *         作成したチャネル
   */
  _createJPEGThumbnailChannel : function (uri) {
    var param = this.getAkahukuURIParam (uri.spec);
        
    if (this.isAkahukuURI (param.original)) {
      var param2 = this.getAkahukuURIParam (param.original);
      if (param2.type == "jpeg") {
        /* 対象がサムネなら何もしない */
        return this._createEmptyChannel (uri);
      }
    }
        
    var channel = new arAkahukuJPEGThumbnailChannel (uri.spec,
                                                     param.original,
                                                     "image/jpeg");
        
    return channel;
  },
    
  /**
   * スレバックアプキャッシュチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  Boolean isFile
   *         ファイルかどうか
   * @return nsIChannel
   *         作成したチャネル
   */
  _createThreadCacheChannel : function (uri, isFile) {
    var param = this.getAkahukuURIParam (uri.spec);

    if (!isFile) {
      var channel
        = new arAkahukuCacheChannel (param.original, uri);
      return channel;
    }

    try {
      var mediator
        = Components.classes
        ["@mozilla.org/appshell/window-mediator;1"]
        .getService (nsIWindowMediator);
      var chromeWindow
        = mediator
        .getMostRecentWindow ("navigator:browser");

      var base
        = chromeWindow.arAkahukuFile.getURLSpecFromDirname
        (chromeWindow.arAkahukuReload.extCacheFileBase);
      var param = this.getAkahukuURIParam (uri.spec);
      var path = param.original
        .replace (/^https?:\/\//, "");

      path
        = chromeWindow.arAkahukuFile.getFilenameFromURLSpec
        (base + path);

      var targetFile
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (nsILocalFile);
      targetFile.initWithPath (path);
      if (!targetFile.exists ()) {
        return this._createThreadCacheFailChannel (uri);
      }

      var fstream
        = Components
        .classes ["@mozilla.org/network/file-input-stream;1"]
        .createInstance (nsIFileInputStream);
      fstream.init (targetFile, 0x01, 0444, 0);

      var inputStreamChannel
        = Components
        .classes ["@mozilla.org/network/input-stream-channel;1"]
        .createInstance (nsIInputStreamChannel);
      inputStreamChannel.setURI (uri);
      inputStreamChannel.contentStream
        = fstream.QueryInterface (nsIInputStream);

      var channel
        = inputStreamChannel.QueryInterface (nsIChannel);
      channel.contentType = "text/html";
      channel.contentCharset = "";
      channel.contentLength = targetFile.fileSize;

      return inputStreamChannel;
    }
    catch (e) {
      // 想定外のエラーが起きた場合
      Components.utils.reportError (e);
      return this._createThreadCacheFailChannel (uri);
    }
  },
    
  /**
   * キャッシュ取得失敗のチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return nsIChannel
   *         作成したチャネル
   */
  _createThreadCacheFailChannel : function (uri) {
    var text
    = "<?xml version=\"1.0\" encoding=\"Shift_JIS\"?>"
    + "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\""
    + "          \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">"
    + "<html lang=\"ja\" xmlns=\"http://www.w3.org/1999/xhtml\""
    + "      xml:lang=\"ja\">"
    + "<head>"
    + "<title>&#x8D64;&#x798F;&#x30AD;&#x30E3;&#x30C3;&#x30B7;&#x30E5;</title>"
    + "<style type=\"text/css\">"
    + "th {"
    + "text-align: right;"
    + "white-space: nowrap;"
    + "}"
    + "table {"
    + "margin-bottom: 1em;"
    + "}"
    + "table.file {"
    + "margin-bottom: 1em;"
    + "margin-left: 1em;"
    + "}"
    + "</style>"
    + "</head>"
    + "<body>"
    + "<p>"
    + "&#x30AD;&#x30E3;&#x30C3;&#x30B7;&#x30E5;&#x304C;&#x3042;&#x308A;&#x307E;&#x305B;&#x3093;&#x3067;&#x3057;&#x305F;"
    + "</p>"
    + "</body>"
    + "</html>";
    var sstream
    = Components.classes ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (nsIStringInputStream);
    sstream.setData (text, text.length);
        
    var inputStreamChannel
    = Components.classes ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (nsIInputStreamChannel);
        
    inputStreamChannel.setURI (uri);
    inputStreamChannel.QueryInterface (nsIChannel).contentCharset
    = "utf-8";
    inputStreamChannel.QueryInterface (nsIChannel).contentType
    = "text/html";
    inputStreamChannel.contentStream = sstream;
    inputStreamChannel.QueryInterface (nsIChannel).contentLength
    = text.length;
        
    return inputStreamChannel;
  },
    
  /**
   * P2P チャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return nsIChannel
   *         作成したチャネル
   */
  _createP2PChannel : function (uri) {
    /*
    = Components.classes ["@unmht.org/akahuku-p2p-channel;1"]
    .createInstance (arIAkahukuP2PChannel);
    */
    var channel = new arAkahukuP2PChannel ();
        
    channel = channel.init (uri.spec);
        
    if (!channel) {
      return this._createEmptyChannel (uri);
    }
        
    return channel;
  },
    
  /**
   * 空のチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return nsIChannel
   *         作成したチャネル
   */
  _createEmptyChannel : function (uri) {
    var sstream
    = Components.classes ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (nsIStringInputStream);
    sstream.setData ("", 0);
        
    var inputStreamChannel
    = Components.classes ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (nsIInputStreamChannel);
        
    inputStreamChannel.setURI (uri);
    inputStreamChannel.QueryInterface (nsIChannel).contentCharset
    = "utf-8";
    inputStreamChannel.QueryInterface (nsIChannel).contentType
    = "text/html";
    inputStreamChannel.contentStream = sstream;
    inputStreamChannel.QueryInterface (nsIChannel).contentLength
    = 0;
        
    return inputStreamChannel;
  }
};

/**
 * 本体のファクトリー
 *   Inherits From: nsIFactory
 */
var arAkahukuProtocolHandlerFactory = {
  /**
   * 本体を生成する
   *   nsIFactory.createInstance
   *
   * @param  nsISupport outer
   *          統合する対象
   * @param  nsIIDRef iid
   *         生成する対象のインターフェース ID
   * @return arAkahukuProtocolHandler
   *         本体
   */
  createInstance : function (outer, iid) {
    if (outer != null) {
      /* 統合する対象がある場合はエラー */
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }
        
    var handler;
    handler = new arAkahukuProtocolHandler ();
    if ("URI_LOADABLE_BY_ANYONE" in nsIProtocolHandler) {
      handler.protocolFlags |= nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
    }
        
    return handler.QueryInterface (iid);
  }
};

/**
 * XPCOM のモジュール
 *   Inherits From: nsIModule
 */
var arAkahukuProtocolHandlerModule = {
  /* 本体に関する情報 */
  CONTRACTID: "@mozilla.org/network/protocol;1?name=akahuku",
  CID: Components.ID ("{65e9b537-0fa4-4e73-ac9c-77a75fdf2c9f}"),
  CNAME: "Akahuku Protocol Handler JS Component",
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェースID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIModule
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIModule)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 登録処理
   *   nsIModule.registerSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   * @param  String type
   *         ローダの種類
   */
  registerSelf : function (compMgr, fileSpec, location, type) {
    if ("URI_LOADABLE_BY_ANYONE" in nsIProtocolHandler) {
      arAkahukuProtocolHandler.prototype.protocolFlags
      |= nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
    }
        
    arAkahukuProtocolHandlerKey = "";
    var hex = [
      "0", "1", "2", "3", "4", "5", "6", "7",
      "8", "9", "a", "b", "c", "d", "e", "f"
      ];
    for (var i = 0; i < 32; i ++) {
      arAkahukuProtocolHandlerKey
        += hex [parseInt (Math.random () * 15)];
    }
        
    compMgr = compMgr.QueryInterface (nsIComponentRegistrar);
    compMgr.registerFactoryLocation (this.CID,
                                     this.CNAME,
                                     this.CONTRACTID,
                                     fileSpec, location, type);
  },
    
  /**
   * 登録解除処理
   *   nsIModule.unregisterSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   */
  unregisterSelf : function (compMgr, fileSpec, location) {
    compMgr = compMgr.QueryInterface (nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation (this.CID, fileSpec);
  },
    
  /**
   * ファクトリーオブジェクトを取得する
   *   nsIModule.getClassObject
   *
   * @param  nsIComponentManager compMgr
   * @param  nsCIDRef cid
   *         取得対象のクラス ID
   * @param  nsIIDRef iid
   *         取得対象のインターフェース ID
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   *         Components.results.NS_ERROR_NO_INTERFACE
   * @return arAkahukuProtocolHandlerFactory
   *         本体のファクトリー
   */
  getClassObject : function (compMgr, cid, iid) {
    if (cid.equals (this.CID)) {
      return arAkahukuProtocolHandlerFactory;
    }
        
    if (!iid.equals (nsIFactory)) {
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 終了できるかどうか
   *   nsIModule.canUnload
   *
   * @param  nsIComponentManager compMgr
   * @return Boolean
   *         終了できるかどうか
   */
  canUnload : function (compMgr) {
    return true;
  }
};

/**
 * モジュールを取得する
 * @param  nsIComponentManager compMgr
 * @param  nsIFile fileSpec
 *         モジュールのファイル
 * @return arAkahukuProtocolHandlerModule
 *         モジュール
 */
function NSGetModule (compMgr, fileSpec) {
  return arAkahukuProtocolHandlerModule;
}

try {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  
  if ("URI_LOADABLE_BY_ANYONE" in nsIProtocolHandler) {
    arAkahukuProtocolHandler.prototype.protocolFlags
      |= nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
  }
        
  arAkahukuProtocolHandlerKey = "";
  var hex = [
    "0", "1", "2", "3", "4", "5", "6", "7",
    "8", "9", "a", "b", "c", "d", "e", "f"
    ];
  for (var i = 0; i < 32; i ++) {
    arAkahukuProtocolHandlerKey
      += hex [parseInt (Math.random () * 15)];
  }
  arAkahukuProtocolHandler.prototype.classID
    = Components.ID ("{65e9b537-0fa4-4e73-ac9c-77a75fdf2c9f}");
  const NSGetFactory = XPCOMUtils.generateNSGetFactory ([arAkahukuProtocolHandler]);
}
catch (e) {
}
