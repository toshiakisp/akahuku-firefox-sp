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

const nsIPipe               = Components.interfaces.nsIPipe;
const nsIIOService          = Components.interfaces.nsIIOService;
const nsIInputStreamChannel = Components.interfaces.nsIInputStreamChannel;
const nsIStringInputStream  = Components.interfaces.nsIStringInputStream;
const nsIURI                = Components.interfaces.nsIURI;

const nsILocalFile           = Components.interfaces.nsILocalFile;
const nsIFile                = Components.interfaces.nsIFile;
const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
const nsICacheListener       = Components.interfaces.nsICacheListener;
const nsICache               = Components.interfaces.nsICache;
const nsICacheService        = Components.interfaces.nsICacheService;
const nsIHttpChannel         = Components.interfaces.nsIHttpChannel;
const nsIWebBrowserPersist   = Components.interfaces.nsIWebBrowserPersist;
const nsIWindowMediator      = Components.interfaces.nsIWindowMediator;
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

/**
 * リファラを送信しないチャネル
 *   Inherits From: nsIChannel, nsIRequest
 *                  nsIStreamListener, nsIRequestObserver
 *
 * @param  String uri
 *         akahuku プロトコルの URI
 * @param  String originalURI 
 *         本来の URI
 * @param  String contentType
 *         MIME タイプ
 */
function arAkahukuBypassChannel (uri, originalURI, contentType) {
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
arAkahukuBypassChannel.prototype = {
  _originalURI : "",  /* String  本来の URI */
  _listener : null,   /* nsIStreamListener  チャネルのリスナ */
  _context : null,    /* nsISupports  ユーザ定義のコンテキスト */
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
        || iid.equals (nsIStreamListener)
        || iid.equals (nsIRequestObserver)) {
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
        
    var ios
    = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (nsIIOService);
        
    var channel = ios.newChannel (this._originalURI, null, null);
    channel.asyncOpen (this, null);
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
    this._isPending = true;
    this._listener.onStartRequest (this, this._context);
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
    this._isPending = false;
    var tmp = this._listener;
    this._listener = null;
    this._context = null;
        
    tmp.onStopRequest (this, this._context, statusCode);
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
    this._listener.onDataAvailable (this, this._context, inputStream,
                                    offset, count);
  }
};

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
      webBrowserPersist.saveURI (uri, null, this._targetFile);
    }
    catch (e) {
      webBrowserPersist.saveURI (uri, null, null, null, null,
                                 this._targetFile);
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
    catch (e) {
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
      pipe.init (true, true, 1024 * 1024, 1, null);
    }
    else {
      pipe.init (false, false, 1024 * 1024, 1, null);
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
        catch (e) {
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
      webBrowserPersist.saveURI (uri, null, cacheFile);
    }
    catch (e) {
      try {
        webBrowserPersist.saveURI (uri, null, null, null, null,
                                   cacheFile);
      }
      catch (e) {
      }
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
          if (targetFile.fileSize <= 1024 * 1024) {
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
              size
                = this._outputStream.write
                (bindata, bindata.length);
              wrote += size;
            }
            bstream.close ();
          }
        }
      }
      catch (e) {
      }
    }
        
    if (this._type == 1) {
      try {
        this._isPending = false;
        this._listener.onStopRequest (this, this._context,
                                      Components.results.NS_OK);
      }
      catch (e) {
        this._isPending = false;
      }
    }
    else if (this._type == 2) {
      try {
        this._outputStream.close ()
      }
      catch (e) {
      }
    }
        
    try {
      fstream.close ();
    }
    catch (e) {
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
      catch (e) {
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
    else if (tmp.match (/\.bmp/i)) {
      contentType = "image/bmp";
    }
    else {
      return this._createEmptyChannel (uri);
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
        
    try {
      var bindata = "";
      if (isFile) {
        var mediator
          = Components.classes
          ["@mozilla.org/appshell/window-mediator;1"]
          .getService (nsIWindowMediator);
        var chromeWindow
          = mediator
          .getMostRecentWindow ("navigator:browser");
                
        var base
          = chromeWindow.arAkahukuFile.getURLSpecFromFilename
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
          throw false;
        }
                
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (nsIFileInputStream);
        fstream.init (targetFile, 0x01, 0444, 0);
        var bstream
          = Components.classes ["@mozilla.org/binaryinputstream;1"]
          .createInstance (nsIBinaryInputStream);
        bstream.setInputStream (fstream);
        bindata = bstream.readBytes (targetFile.fileSize);
        bstream.close ();
        fstream.close ();
      }
      else {
        var cacheService
          = Components.classes
          ["@mozilla.org/network/cache-service;1"]
          .getService (nsICacheService);
        var httpCacheSession;
        httpCacheSession
          = cacheService
          .createSession ("HTTP",
                          nsICache.STORE_ANYWHERE,
                          true);
        httpCacheSession.doomEntriesIfExpired = false;
            
        descriptor
          = httpCacheSession.openCacheEntry
          (param.original + ".backup",
           nsICache.ACCESS_READ,
           false);
        if (!descriptor) {
          return this._createThreadCacheFailChannel (uri);
        }
            
        var istream = descriptor.openInputStream (0);
        var bstream
          = Components.classes ["@mozilla.org/binaryinputstream;1"]
          .createInstance (nsIBinaryInputStream);
        bstream.setInputStream (istream);
        bindata = bstream.readBytes (descriptor.dataSize);
        bstream.close ();
        istream.close ();
        descriptor.close ();
      }
            
      var pipe
        = Components.classes ["@mozilla.org/pipe;1"]
        .createInstance (nsIPipe);
                    
      pipe.init (false, false, bindata.length, 1, null);
                    
      pipe.outputStream.write (bindata, bindata.length);
      pipe.outputStream.close ();
                    
      var inputStreamChannel
        = Components
        .classes ["@mozilla.org/network/input-stream-channel;1"]
        .createInstance (nsIInputStreamChannel);
                    
      inputStreamChannel.setURI (uri);
      inputStreamChannel.QueryInterface (nsIChannel).contentType
        = "text/html";
      inputStreamChannel.QueryInterface (nsIChannel)
        .contentCharset = "";
      inputStreamChannel.contentStream = pipe.inputStream;
      inputStreamChannel.QueryInterface (nsIChannel)
        .contentLength = bindata.length;
            
      return inputStreamChannel;
    }
    catch (e) {
      /* キャッシュが存在しなかった場合 */
      return this._createThreadCacheFailChannel (uri);
    }
        
    return channel;
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
