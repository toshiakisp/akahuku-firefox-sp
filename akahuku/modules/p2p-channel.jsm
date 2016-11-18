
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
    if (uri.match (/^akahuku(?:-safe)?:\/\/([^\/]*)\/(p2p)\/([A-Za-z0-9\-]+)\.([0-9]+)\/(.+)$/)) {
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
    = Cc ["@unmht.org/akahuku-p2p-servant;2"]
    .getService (Ci.arIAkahukuP2PServant2);
        
    this.URI
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    this.URI.spec = uri;
    
    this.originalURI
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    this.originalURI.spec = uri;
        
    this._targetFileServer = "";
    if (this._webURI.match
        (/^https?:\/\/([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
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
    .getService (Ci.nsIWindowMediator);
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
    fstream.init (targetFile, 0x01, 0444, 0);
        
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
    fstream.init (targetFile, 0x01, 0444, 0);
        
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
    ifstream.init (targetFile, 0x01, 0444, 0);
            
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
    ofstream.init (cacheFile, 0x02 | 0x08 | 0x20, 0644, 0);
    ofstream.write (fileData.data, fileData.data.length);
    ofstream.close ();
            
    targetFile.remove (true);
    cacheFile.moveTo (null, this._targetFileLeafName);
        
    targetFile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    targetFile.initWithPath (this._targetFileName);
            
    var servant
    = Cc ["@unmht.org/akahuku-p2p-servant;2"]
    .getService (Ci.arIAkahukuP2PServant2);
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
        
    if (this._isGecko19) {
      pipe.init (true, true, 0, 0xffffffff, null);
    }
    else {
      pipe.init (false, false, 0, 0xffffffff, null);
    }
        
    var inputStreamChannel
    = Components
    .classes ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (Ci.nsIInputStreamChannel);
        
    inputStreamChannel.setURI (this.URI);
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentType
    = this.contentType;
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentCharset = "";
    inputStreamChannel.contentStream = pipe.inputStream;
    if (this._isGecko19) {
      inputStreamChannel.QueryInterface (Ci.nsIChannel).contentLength
        = -1;
    }
    else {
      inputStreamChannel.QueryInterface (Ci.nsIChannel).contentLength
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
          var servant
          = Components.classes
          ["@unmht.org/akahuku-p2p-servant;2"]
          .getService (Ci.arIAkahukuP2PServant2);
                    
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
    = Cc ["@unmht.org/akahuku-p2p-servant;2"]
    .getService (Ci.arIAkahukuP2PServant2);
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
      targetDir.create (Ci.nsIFile.DIRECTORY_TYPE, 0755);
    }
        
    var cacheFile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
    cacheFile.initWithPath (this._cacheFileName);
        
    var uri
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIURI);
    uri.spec = this._webURI;
        
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
        fstream.init (targetFile, 0x01, 0444, 0);
                
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
        fstream.init (targetFile, 0x01, 0444, 0);
                
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
              catch (e if e.result == Cr.NS_BINDING_ABORTED) {
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
    if (this._type == 1) {
      try {
        this._isPending = false;
        this._listener.onStopRequest (this, this._context,
                                      Cr.NS_OK);
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


