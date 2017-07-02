
/**
 * akahuku/p2p-channel.jsm
 */

var EXPORTED_SYMBOLS = [
  "arAkahukuGZIPFileData",
  "arAkahukuP2PChannel",
];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

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

Cu.import ("resource://akahuku/p2p-service.jsm");
var protocolHandler = {};
Cu.import ("resource://akahuku/protocol.jsm", protocolHandler);
Cu.import ("resource://akahuku/console.jsm");
var console = new AkahukuConsole ();
console.prefix = "Akahuku P2P channel";

var inMainProcess = true;
try {
  var appinfo
  = Cc ["@mozilla.org/xre/app-info;1"]
  .getService (Ci.nsIXULRuntime);
  inMainProcess
  = (appinfo.processType == appinfo.PROCESS_TYPE_DEFAULT);
}
catch (e) {
  Cu.reportError (e);
}

if (!inMainProcess) {
  Cu.import ("resource://akahuku/ipc.jsm");
}

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
   * @throws Cr.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIStreamListener)
        || iid.equals (Ci.nsIRequestObserver)) {
      return this;
    }
        
    throw Cr.NS_NOINTERFACE;
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
    = Cc ["@mozilla.org/binaryinputstream;1"]
    .createInstance (Ci.nsIBinaryInputStream);
    bstream.setInputStream (inputStream);
    this.data += bstream.readBytes (count);
  }
};
/**
 * P2P チャネル
 *   Inherits From: arIAkahukuP2PChannel,
 *                  nsIChannel, nsIRequest, nsIInterfaceRequestor
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
                *   0: キャッシュから (return nsIInputStreamChannel)
                *   1: チャネル (Firefox 1.* 用)
                *   2: pipe 経由 (return nsIInputStreamChannel)
                *   3: チャネル (内部バッファ経由)
                *   4: チャネル (ファイルから内部バッファ経由読込) */
    
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

  _progressStatusCode : 0,
  _progressStatusMessage : "",
    
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
  loadInfo : null,

  // required for XPCOM registration by XPCOMUtils
  classDescription: "Akahuku P2P Channel JS Component",
  classID : Components.ID ("{6f220dbc-d883-43e7-a3aa-7336153dd076}"),
  contractID : "@unmht.org/akahuku-p2p-channel;1",
  _xpcom_categories : [],
  _xpcom_factory : {
    /**
     * 本体を生成する
     *   nsIFactory.createInstance
     */
    createInstance : function (outer, iid) {
      if (outer != null) {
        /* 統合する対象がある場合はエラー */
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      return new arAkahukuP2PChannel ().QueryInterface (iid);
    }
  },

    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Cr.NS_NOINTERFACE
   * @return arIAkahukuP2PChannel
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIChannel)
        || iid.equals (Ci.nsIInterfaceRequestor)
        || iid.equals (Ci.nsIRequest)
        || iid.equals (Ci.nsIWebProgressListener)
        || iid.equals (Ci.nsITimerCallback)
        || iid.equals (Ci.arIAkahukuP2PServantListener)
        /*|| iid.equals (Ci.arIAkahukuP2PChannel) */) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  /**
   * nsIInterfaceRequestor
   */
  getInterface : function (iid) {
    // see nsBaseChannel.cpp, nsNetUtil.h (NS_QueryNotificationCallbacks)
    try {
      if (this.notificationCallbacks) {
        try {
          return this.notificationCallbacks.getInterface (iid);
        }
        catch (e) {
        }
      }
      if (this.loadGroup &&
          this.loadGroup.notificationCallbacks) {
        return this.loadGroup.notificationCallbacks.getInterface (iid);
      }
    }
    catch (e) {
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 初期化
   *   arIAkahukuP2PChannel.init
   *
   * @param  String uri
   *         akahuku プロトコルの URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         キャッシュのチャネル
   *         失敗すれば null
   */
  init : function (uri, loadInfo) {
    var uriParam = protocolHandler.getAkahukuURIParam (uri);
    if (uriParam.original) {
      this._webURI = uriParam.original;
    }
    else {
      return null;
    }
        
    this.URI
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    this.URI.spec = uri;
    
    this.originalURI
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    this.originalURI.spec = uri;

    this.loadInfo = loadInfo || null;

    var param
      = arAkahukuP2PService.utils.getP2PPathParam (this._webURI);
    if (!param) {
      return null;
    }
    this._targetFileServer = param.server;
    this._targetFilePort = param.port;
    this._targetFileDir = param.dir;
    this._targetFileType = param.type;
    this._targetFileLeafName = param.leafName;

    if (param.ext.match (/^jpg$/i)) {
      this.contentType = "image/jpeg";
    }
    else if (param.ext.match (/^gif$/i)) {
      this.contentType = "image/gif";
    }
    else if (param.ext.match (/^png$/i)) {
      this.contentType = "image/png";
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
    var servant = arAkahukuP2PService.servant;
    servant.visitBoard (board);
    
    var file
      = arAkahukuP2PService.utils.getCacheFileFromParam (param);
    if (file) {
      // nsIFile path operations
      this._targetFileName = file.path;
      file.leafName = ""; // ad hoc way to get parent
      this._targetDirName = file.path;

      var tmp
      = new Date ().getTime ()
      + "_" + Math.floor (Math.random () * 1000);
        
      file.leafName = tmp;
      this._cacheFileName = file.path;
    }
    else {
      Cu.reportError ("no valid cache path!");
      return null;
    }
        
    var cacheChannel = this._getCacheChannel ();
    if (cacheChannel) {
      /* キャッシュがあればキャッシュから */
      if (this.loadInfo) { // init by newChannel2 (Firefox 36)
        this._type = 4; // 内部バッファでファイル詠み込み
        return this;
      }
      this._type = 0;
      return cacheChannel;
    }
        
    if (this.loadInfo) { // init by newChannel2 (Firefox 36)
      this._type = 3; // P2Pリクエスト(内部バッファ読込)
      return this;
    }
    this._type = 2;
    return this._getPipedChannel ();
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
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
        
    if (!targetFile.exists ()) {
      return null;
    }
        
    var fstream
    = Components.classes
    ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (Ci.nsIFileInputStream);
    fstream.init (targetFile, 0x01, 292/*0o444*/, 0);
        
    var bstream
    = Components.classes
    ["@mozilla.org/binaryinputstream;1"]
    .createInstance
    (Ci.nsIBinaryInputStream);
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
        = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      targetFile.initWithPath (this._targetFileName);
            
    }
        
    fstream
    = Components.classes
    ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (Ci.nsIFileInputStream);
    fstream.init (targetFile, 0x01, 292/*0o444*/, 0);
        
    var inputStreamChannel
    = Components.classes
    ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (Ci.nsIInputStreamChannel);
        
    inputStreamChannel.setURI (this.URI);
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentType
    = this.contentType;
    inputStreamChannel.contentStream = fstream;
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentLength
    = targetFile.fileSize;
        
    return inputStreamChannel;
  },
    
  gunzipFile : function (targetFile) {
    var ifstream
    = Components.classes
    ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (Ci.nsIFileInputStream);
    ifstream.init (targetFile, 0x01, 292/*0o444*/, 0);
            
    var fileData = new arAkahukuGZIPFileData ();
    var converter
    = Components.classes
    ["@mozilla.org/streamconv;1?from=gzip&to=uncompressed"]
    .createInstance (Ci.nsIStreamConverter);
    converter.asyncConvertData ("gzip", "uncompressed",
                                fileData, null);
    var listener
    = converter.QueryInterface
    (Ci.nsIStreamListener);
    listener.onStartRequest (null, null);
    listener.onDataAvailable (null, null,
                              ifstream, 0, targetFile.fileSize);
    ifstream.close ();
    listener.onStopRequest (null, null, 0);
            
    var cacheFile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    cacheFile.initWithPath (this._targetFileName + ".conv");
    var ofstream
    = Components.classes
    ["@mozilla.org/network/file-output-stream;1"]
    .createInstance (Ci.nsIFileOutputStream);
    ofstream.init (cacheFile, 0x02 | 0x08 | 0x20, 420/*0o644*/, 0);
    ofstream.write (fileData.data, fileData.data.length);
    ofstream.close ();
            
    targetFile.remove (true);
    cacheFile.moveTo (null, this._targetFileLeafName);
        
    targetFile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
            
    var servant = arAkahukuP2PService.servant;
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
    = Cc ["@mozilla.org/pipe;1"]
    .createInstance (Ci.nsIPipe);
        
    pipe.init (true, true, 0, 0xffffffff, null);
        
    var inputStreamChannel
    = Components
    .classes ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (Ci.nsIInputStreamChannel);
        
    inputStreamChannel.setURI (this.URI);
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentType
    = this.contentType;
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentCharset = "";
    inputStreamChannel.contentStream = pipe.inputStream;
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentLength = -1;
            
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
        
    /* asyncOpen 内で即応答するとおかしくなるので
     * タイマを走らせて遅延を作る */
    var timer
    = Cc ["@mozilla.org/timer;1"]
    .createInstance (Ci.nsITimer);
    timer.initWithCallback (this, 100, Ci.nsITimer.TYPE_ONE_SHOT);
    this._isPending = true;
  },

  asyncOpen2 : function (listener) {
    var csm
      = Cc ["@mozilla.org/contentsecuritymanager;1"]
      .getService (Ci.nsIContentSecurityManager);
    var wrappedListener = csm.performSecurityCheck (this, listener);
    this.asyncOpen (wrappedListener, null);
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
    if (!(stateFlags & Ci.nsIWebProgressListener.STATE_IS_REQUEST)) {
      if (stateFlags &
          (Ci.nsIWebProgressListener.STATE_IS_NETWORK |
           Ci.nsIWebProgressListener.STATE_STOP) &&
          !Components.isSuccessCode (status) &&
          this._cacheFileName) {
        // request と関係無いところで異常終了 (書込エラー等)
        this._cacheFileName = null; // to ensure 'run once'
        if (this._progressStatusCode !== 0) {
          console.error (this.URI.spec, "onStateChange",
              "stateFlags=0x" + stateFlags.toString (16),
              console.nsresultToString (status) + ";",
              "(" + console.nsresultToString (this._progressStatusCode),
              '"' + this._progressStatusMessage + '")');
        }
        else {
          console.error (this.URI.spec, "onStateChange",
              "stateFlags=0x" + stateFlags.toString (16),
              console.nsresultToString (status) + ";");
        }
        this.status = status;
        this._onFail ();
        return;
      }

      return;
    }
    var httpStatus = 200;
    var contentType = "";
    try {
      var httpChannel = request.QueryInterface (Ci.nsIHttpChannel);
      httpStatus = httpChannel.responseStatus;
      // レスポンスヘッダからContent-Typeを得る
      httpChannel.visitResponseHeaders ({
        // nsIHttpHeaderVisitor
        visitHeader : function (name, value) {
          if (name === "Content-Type") {
            contentType = value;
          }
        }
      });
    }
    catch (e) { Components.utils.reportError (e);
    }
        
    if (stateFlags & Ci.nsIWebProgressListener.STATE_STOP
        && this._cacheFileName) {
      var cacheFile
      = Cc ["@mozilla.org/file/local;1"]
      .createInstance (Ci.nsILocalFile);
      cacheFile.initWithPath (this._cacheFileName);
      this._cacheFileName = null; // to ensure 'run once'
      if (httpStatus < 400) {
        /* 転送が終了したら */
        try {
          var servant = arAkahukuP2PService.servant;
                    
          if (contentType.substr (5) == "text/") {
            // エラーページの場合
          }
          else {
            /* キャッシュから元のファイルを作成 */
            cacheFile.moveTo (null, this._targetFileLeafName);
                    
            /* ハッシュを作成 */
            var targetFile
            = Cc ["@mozilla.org/file/local;1"]
            .createInstance (Ci.nsILocalFile);
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
            
      if (cacheFile.exists ()) {
        cacheFile.remove (true);
      }
            
      this.status = Cr.NS_BINDING_FAILED;
      this._onFail ();
    }
  },
    
  /**
   * ステータスバーに表示するメッセージが変わった時のイベント
   *   nsIWebProgressListener.onStatusChange
   * 未使用
   */
  onStatusChange : function (webProgress, request, status, message) {
    this._progressStatusMessage = message;
    this._progressStatusCode = status;
  },
    
  /**
   * 時間経過イベント
   *   nsITimerCallback.notify
   *
   * @param  nsITimer timer
   *         呼び出し元のタイマ
   */
  notify : function (tiemr) {
    if (this._type == 1 || this._type == 3 || this._type == 4) {
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
        
    if (this._type == 4) {
      // キャッシュファイルを読む
      this._onSave ();
      return;
    }
    this._getFromP2P ();
  },
    
  /**
   * ファイルを P2P ネットワークから取得する
   */
  _getFromP2P : function () {
    var servant = arAkahukuP2PService.servant;
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
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    targetDir.initWithPath (this._targetDirName);
    if (!targetDir.exists ()) {
      if (inMainProcess) {
        targetDir.create (Ci.nsIFile.DIRECTORY_TYPE, 493/*0o755*/);
      }
      else {
        arAkahukuIPC.sendSyncCommand
          ("File/createDirectory", [this._targetDirName]);
      }
    }
        
    var uri
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    uri.spec = this._webURI;

    if (!inMainProcess) {
      // File I/Oのための余分なIPCコールを避けるため
      // 直接 _targetFileName へ保存させる
      var targetFile
      = Cc ["@mozilla.org/file/local;1"]
      .createInstance (Ci.nsILocalFile);
      targetFile.initWithPath (this._targetFileName);

      // Use a wrapper of WebBrowserPersist in arAkahukuImage
      var isPrivate = false;
      if (this.loadInfo) {
        isPrivate = this.loadInfo.usePrivateBrowsing;
      }
      var self = this;
      var callback = function (success, savedFile, msg) {
        if (!success) {
          if (savedFile) {
            arAkahukuIPC.sendSyncCommand
              ("File/remove", [savedFile, false]);
          }
          self.status = Cr.NS_BINDING_FAILED;
          self._onFail ();
          return;
        }
        arAkahukuP2PService.servant
          .createHashFile (targetFile, self._targetFileLeafName, "");
        self._onSave ();
        return;
      }
      arAkahukuIPC.sendAsyncCommand
        ("Image/asyncSaveImageToFile",
         [targetFile, uri, isPrivate, callback]);
      return;
    }

    var cacheFile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    cacheFile.initWithPath (this._cacheFileName);
        
    var webBrowserPersist
    = Components
    .classes ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance (Ci.nsIWebBrowserPersist);
    var flags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_NONE;
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
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
        
    if (targetFile.exists ()) {
      /* キャッシュファイルは突然消える */
      try {
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (Ci.nsIFileInputStream);
        fstream.init (targetFile, 0x01, 292/*0o444*/, 0);
                
        var bstream
          = Components.classes
          ["@mozilla.org/binaryinputstream;1"]
          .createInstance
          (Ci.nsIBinaryInputStream);
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
            = Cc ["@mozilla.org/file/local;1"]
            .createInstance (Ci.nsILocalFile);
          targetFile.initWithPath (this._targetFileName);
            
        }
                
        fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (Ci.nsIFileInputStream);
        fstream.init (targetFile, 0x01, 292/*0o444*/, 0);
                
        if (this._type == 1) {
          this._listener.onDataAvailable
            (this, this._context, fstream,
             0, targetFile.fileSize);
        }
        else if (this._type == 2) {
          if ("nsIAsyncStreamCopier" in Ci) {
            var copier
              = Components.classes
              ["@mozilla.org/network/async-stream-copier;1"]
              .createInstance (Ci.nsIAsyncStreamCopier);
            copier.init (fstream, this._outputStream, null, false, true, 4096, true, true);
            var observer = {
              _p2pch : null,
              onStartRequest : function (r, c) {},
              onStopRequest : function (r, c, statusCode) {
                this._p2pch._listener = null;
                this._p2pch._context = null;
                this._p2pch._outputStream = null;
                this._p2pch = null;
              },
            };
            observer._p2pch = this;
            copier.asyncCopy (observer, null);
            return;
          }
          else {
            var bstream
              = Components.classes
              ["@mozilla.org/binaryinputstream;1"]
              .createInstance (Ci.nsIBinaryInputStream);
            bstream.setInputStream (fstream);
            var wrote, size;
            wrote = 0;
            size = 0;
                        
            while (wrote < targetFile.fileSize) {
              size = targetFile.fileSize - wrote;
              if (size > 1024) {
                size = 1024;
              }
                        
              var bindata = bstream.readBytes (size);
              try {
              size
                = this._outputStream.write
                (bindata, bindata.length);
              }
              catch (e) {
                if (e.result == Cr.NS_BINDING_ABORTED) {
                  break;
                }
                throw e;
              }
              wrote += size;
            }
            bstream.close ();
          }
        }
        else if (this._type == 3 || this._type == 4) {
          // 内部読み込みモード (Firefox 42 or above)
          var copier
            = Cc ["@mozilla.org/network/async-stream-copier;1"]
            .createInstance (Ci.nsIAsyncStreamCopier);
          var pipe
            = Cc ["@mozilla.org/pipe;1"].createInstance (Ci.nsIPipe);
          pipe.init (true, true, 1<<12, 0xffffffff, null);
          copier.init (fstream, pipe.outputStream, null, false, true, 4096, true, true);
          // 内部バッファへの詠み込み監視
          var observer = {
            _p2pch : null,
            onStartRequest : function (r, c) {},
            onStopRequest : function (r, c, statusCode) {
              // バッファに読み込み完了
              pipe.outputStream.close ();
              // リスナに通知
              var listener = this._p2pch._listener;
              listener.onDataAvailable
                (this._p2pch, this._p2pch._context,
                 pipe.inputStream, 0, pipe.inputStream.available ());
              pipe.inputStream.close ();
              pipe = null;
              this._p2pch._isPending = false;
              listener.onStopRequest
                (this._p2pch, this._p2pch._context, Cr.NS_OK);
              // 片付け
              fstream.close ();
              fstream = null;
              this._p2pch._listener = null;
              this._p2pch._context = null;
              this._p2pch._outputStream = null;
              this._p2pch = null;
            },
          };
          observer._p2pch = this;
          copier.asyncCopy (observer, null);
          return;
        }
      }
      catch (e) { Components.utils.reportError (e);
      }
    }
        
    if (this._type == 1 || this._type == 3 || this._type == 4) {
      try {
        this._isPending = false;
        this._listener.onStopRequest (this, this._context,
                                      Cr.NS_OK);
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
    if (this._type == 1 || this._type == 3 || this._type == 4) {
      try {
        this._isPending = false;
        this._listener.onStopRequest (this, this._context,
                                      this.status);
      }
      catch (e) {
      }
    }
    else if (this._type == 2) {
      try {
        this._outputStream.closeWithStatus (this.status);
      }
      catch (e) { Components.utils.reportError (e);
      }
    }
        
    this._listener = null;
    this._context = null;
    this._outputStream = null;
  }
};


