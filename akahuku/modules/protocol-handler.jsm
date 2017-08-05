
/*
 * akahuku/protocol-handler.jsm
 *
 *   カスタムプロトコル(akahuku:)を実現する XPCOM サービス用
 */

var EXPORTED_SYMBOLS = [
  "arAkahukuProtocolHandler",
  "arAkahukuSafeProtocolHandler",
  "arAkahukuLocalProtocolHandler",
];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

if ("import" in Cu) {
  Cu.import ("resource://akahuku/protocol-channel.jsm");
  Cu.import ("resource://akahuku/p2p-channel.jsm");
}
else {
  var loader
    = Cc ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Ci.mozIJSSubScriptLoader);
  loader.loadSubScript ("resource://akahuku/protocol-channel.jsm");
  loader.loadSubScript ("resource://akahuku/p2p-channel.jsm");
}

var arAkahukuProtocolHandlerKey = "";

/**
 * 本体
 * akahuku プロトコルからチャネルを生成する
 *   Inherits From: nsIProtocolHandler
 */
function arAkahukuProtocolHandler () {
  this.init ();
}
arAkahukuProtocolHandler.prototype = {
  scheme : "akahuku", /* String  プロトコルスキーム */
  defaultPort : -1, /* Number  ポート番号
                     *   ネットワークベースではないので -1 */
    
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH, /* Number プロトコルの詳細
                                                 *   file と同様のプロトコル */

  // required for XPCOM registration by XPCOMUtils
  classDescription: "Akahuku Protocol Handler JS Component",
  classID : Components.ID ("{65e9b537-0fa4-4e73-ac9c-77a75fdf2c9f}"),
  contractID : "@mozilla.org/network/protocol;1?name=akahuku",
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
      var handler = new arAkahukuProtocolHandler ();
      return handler.QueryInterface (iid);
    }
  },
    
  inMainProcess : true,

  init : function () {
    try {
      var appinfo
        = Cc ["@mozilla.org/xre/app-info;1"].getService (Ci.nsIXULRuntime);
      this.inMainProcess
        = (appinfo.processType == appinfo.PROCESS_TYPE_DEFAULT);
    }
    catch (e) { Cu.reportError (e);
    }
  },

  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws NS_NOINTERFACE
   * @return nsIProtocolHandler
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIProtocolHandler)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
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
      = Cc ["@mozilla.org/network/standard-url;1"]
      .createInstance (Ci.nsIStandardURL);
    var preamble; // encoded type, protocol, and sep
    if (baseURI) {
      // 相対アドレスを正しく解決させるために preamble を除外しておく
      baseURI = baseURI.clone ();
      var r = /^\/(?:p2p|preview\.[^\/]+|jpeg|(?:file)?cache)\/\w+\.\d(?=\/)/;
      var path = baseURI.pathQueryRef || baseURI.path;
      var match = r.exec (path);
      if (match) {
        preamble = match [0];
        path = path.substr (preamble.length);
        if (typeof baseURI.pathQueryRef !== "undefined") {
          baseURI.pathQueryRef = path;
        }
        else {
          baseURI.path = path;
        }
        // filecache からの相対アドレスはただの cache へ変換
        preamble = preamble.replace (/^\/filecache/,"/cache");
      }
    }
    try {
      url.init (Ci.nsIStandardURL.URLTYPE_AUTHORITY, -1, spec, charset, baseURI);
    }
    catch (e) {
      if (e.result == Cr.NS_ERROR_MALFORMED_URI) {
        // "akahuku:///"
        url.init (Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, spec, charset, baseURI);
      }
      else {
        throw e;
      }
    }
    var uri = url.QueryInterface (Ci.nsIURI);
    if (preamble && uri.spec != spec) {
      // 相対アドレスが解決された後に preamble を戻す
      uri.path = preamble + uri.path;
    }
    return uri;
  },
    
  /**
   * チャネルを作成する
   *   nsIProtocolHandler.newChannel2 (since Firefox 36)
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  newChannel2 : function (uri, loadInfo) {
    var pos;
    while ((pos = uri.spec.indexOf ("akahuku://", 1)) > 0) {
      /* Bazzacuda Image Saver が相対パスの連結に失敗する
       * 先頭以外にプロトコル指定があれば以前を削除 */
            
      uri.spec = uri.spec.substr (pos);
    }
    var param = this.getAkahukuURIParam (uri.spec);
    if (param.type == "p2p") {
      /* P2P */
      return this._createP2PChannel (uri, loadInfo);
    }
    else if (param.type == "preview") {
      /* プレビュー */
      return this._createPreviewChannel (uri, loadInfo);
    }
    else if (param.type == "jpeg") {
      /* JPEG サムネ */
      return this._createJPEGThumbnailChannel (uri, loadInfo);
    }
    else if (param.type == "cache") {
      /* スレバックアップキャッシュ */
      return this._createThreadCacheChannel (uri, false, loadInfo);
    }
    else if (param.type == "filecache") {
      /* スレバックアップキャッシュ (ファイル) */
      return this._createThreadCacheChannel (uri, true, loadInfo);
    }
        
    return this._createEmptyChannel (uri, loadInfo);
  },

  newChannel : function (uri) {
    return this.newChannel2 (uri, null);
  },
    
  /**
   * プレビューのチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  _createPreviewChannel : function (uri, loadInfo) {
    var param = this.getAkahukuURIParam (uri.spec);
        
    if (param.hash
        != this.getHash (param.protocol, param.host, param.path)) {
      return this._createEmptyChannel (uri, loadInfo);
    }
        
    var contentType = this._expectContentTypeFromParam (param);
        
    var channel = new arAkahukuBypassChannel
      (uri.spec, param.original, contentType, loadInfo);

    if (contentType.length == 0) {
      // 画像以外(iframe等での使用)では元のURIと認識させる
      // (iframe 内での詠み込みがCORや混在コンテンツと認識されないように)
      var ios
        = Cc ["@mozilla.org/network/io-service;1"]
        .getService (Ci.nsIIOService);
      channel.URI = ios.newURI (param.original, null, null);
      channel.loadFlags |= Ci.nsIChannel.LOAD_REPLACE;
    }
        
    return channel;
  },

  _expectContentTypeFromParam : function (param) {
    var filename = param.original;
    filename = filename.replace (/\?.*/, "");
    if (/\.jpe?g$/i.test (filename)) {
      return "image/jpeg";
    }
    if (/\.gif$/i.test (filename)) {
      return "image/gif";
    }
    if (/\.png$/i.test (filename)) {
      return "image/png";
    }
    if (/\.bmp$/i.test (filename)) {
      return "image/bmp";
    }
    if (/\.swf$/i.test (filename)) {
      return "application/x-shockwave-flash";
    }
    if (/\.webm$/i.test (filename)) {
      return "video/webm";
    }
    if (/\.mp4$/i.test (filename)) {
      return "video/mp4";
    }
    return "";
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
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  _createJPEGThumbnailChannel : function (uri, loadInfo) {
    var param = this.getAkahukuURIParam (uri.spec);
        
    if (this.isAkahukuURI (param.original)) {
      var param2 = this.getAkahukuURIParam (param.original);
      if (param2.type == "jpeg") {
        /* 対象がサムネなら何もしない */
        return this._createEmptyChannel (uri, loadInfo);
      }
    }
        
    var channel = new arAkahukuJPEGThumbnailChannel
      (uri.spec, param.original, "image/jpeg", loadInfo);
        
    return channel;
  },
    
  /**
   * スレバックアプキャッシュチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  Boolean isFile
   *         ファイルかどうか
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  _createThreadCacheChannel : function (uri, isFile, loadInfo) {
    var param = this.getAkahukuURIParam (uri.spec);

    if (!isFile) {
      return new arAkahukuCacheChannel (param.original, uri, loadInfo);
    }
    try {
      // from arAkahukuReload.js
      var extCacheFileBase = "";
      var prefName = "akahuku.reload.extcache.file.base";
      var prefBranch
        = Cc ["@mozilla.org/preferences-service;1"]
        .getService (Ci.nsIPrefBranch2 ? Ci.nsIPrefBranch2 : Ci.nsIPrefBranch);
      if (prefBranch.prefHasUserValue (prefName)) {
        extCacheFileBase = unescape (prefBranch.getCharPref (prefName));
      }

      const {AkahukuFileUtil}
        = Cu.import ("resource://akahuku/fileutil.jsm", {});
      var base
        = AkahukuFileUtil.getURLSpecFromNativePath (extCacheFileBase);
      base = base.replace (/\/?$/, "/"); // ensure directory
      var ios
        = Cc ["@mozilla.org/network/io-service;1"]
        .getService (Ci.nsIIOService);
      var baseUri = ios.newURI (base, null, null);
      var path = param.original
        .replace (/^https?:\/\//, "./");
      path = AkahukuFileUtil
        .getNativePathFromURLSpec (baseUri.resolve (path));

      if (this.inMainProcess && !loadInfo) {
        // create nsIInputStreamChannel directly
        return this._createThreadCacheFileChannel (uri, path);
      }
      else { // in content process or init by newChannel2 (Firefox 36+)
        return this._createThreadCacheDOMFileChannel (uri, path, loadInfo);
      }
    }
    catch (e) {
      // 想定外のエラーが起きた場合
      Cu.reportError (e);
      return this._createThreadCacheFailChannel (uri, loadInfo);
    }
  },
  _createThreadCacheFileChannel : function (uri, path) {
    try {
      var targetFile
        = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      targetFile.initWithPath (path);
      if (!targetFile.exists ()) {
        return this._createThreadCacheFailChannel (uri);
      }

      var fstream
        = Cc ["@mozilla.org/network/file-input-stream;1"]
        .createInstance (Ci.nsIFileInputStream);
      fstream.init (targetFile, 0x01, 292/*0o444*/, 0);

      var inputStreamChannel
        = Cc ["@mozilla.org/network/input-stream-channel;1"]
        .createInstance (Ci.nsIInputStreamChannel);
      inputStreamChannel.setURI (uri);
      inputStreamChannel.contentStream
        = fstream.QueryInterface (Ci.nsIInputStream);

      var channel
        = inputStreamChannel.QueryInterface (Ci.nsIChannel);
      channel.contentType = "text/html";
      channel.contentCharset = "";
      channel.contentLength = targetFile.fileSize;

      return inputStreamChannel;
    }
    catch (e) {
      // 想定外のエラーが起きた場合
      Cu.reportError (e);
      return this._createThreadCacheFailChannel (uri);
    }
  },
  _createThreadCacheDOMFileChannel : function (uri, path, loadInfo) {
    var channel = new arAkahukuDOMFileChannel (uri, path, loadInfo);
    channel.contentType = "text/html";
    return channel;
  },
    
  /**
   * キャッシュ取得失敗のチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  _createThreadCacheFailChannel : function (uri, loadInfo) {
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

    if (loadInfo) { // via newChannel2
      throw Components.Exception ("Akahuku protocol-handler: "
          + "_createThreadCacheFailChannel() "
          + "does not support loadInfo (newChannel2)");
      // exception will result in a fallback to newChannel
    }

    var sstream
    = Cc ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (Ci.nsIStringInputStream);
    sstream.setData (text, text.length);
        
    var inputStreamChannel
    = Cc ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (Ci.nsIInputStreamChannel);
        
    inputStreamChannel.setURI (uri);
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentCharset
    = "utf-8";
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentType
    = "text/html";
    inputStreamChannel.contentStream = sstream;
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentLength
    = text.length;
        
    return inputStreamChannel;
  },
    
  /**
   * P2P チャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  _createP2PChannel : function (uri, loadInfo) {
    var channel = new arAkahukuP2PChannel ();
        
    channel = channel.init (uri.spec, loadInfo);
        
    if (!channel) {
      return this._createEmptyChannel (uri, loadInfo);
    }
        
    return channel;
  },
    
  /**
   * 空のチャネルを作成する
   *
   * @param  nsIURI uri
   *         対象の URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel
   *         作成したチャネル
   */
  _createEmptyChannel : function (uri, loadInfo) {
    if (loadInfo) { // via newChannel2
      throw Components.Exception ("Akahuku protocol-handler: "
          + "_createEmptyChannel() "
          + "does not support loadInfo (newChannel2)");
      // exception will result in a fallback to newChannel
    }

    var sstream
    = Cc ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (Ci.nsIStringInputStream);
    sstream.setData ("", 0);
        
    var inputStreamChannel
    = Cc ["@mozilla.org/network/input-stream-channel;1"]
    .createInstance (Ci.nsIInputStreamChannel);
        
    inputStreamChannel.setURI (uri);
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentCharset
    = "utf-8";
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentType
    = "text/html";
    inputStreamChannel.contentStream = sstream;
    inputStreamChannel.QueryInterface (Ci.nsIChannel).contentLength
    = 0;
        
    return inputStreamChannel;
  }
};

if ("URI_LOADABLE_BY_ANYONE" in Ci.nsIProtocolHandler) {
  arAkahukuProtocolHandler.prototype.protocolFlags
    |= Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
}

/*
 * XPCOM と Frame script から同じハッシュが得られるようにするため
 * 関連APIとキーは別JSM (protocol.jsm) のスコープとし
 * Frame script からは protocol.jsm のみを使う
 */
if ("import" in Cu) {
  Cu.import ("resource://akahuku/protocol.jsm",
      arAkahukuProtocolHandler.prototype);
}
else {
  loader.loadSubScript ("resource://akahuku/protocol.jsm",
      arAkahukuProtocolHandler.prototype);
}

arAkahukuProtocolHandler.prototype.initKey ();


/**
 * akahuku-local プロトコル (ローカルにあるファイルのプレビュー用)
 *   Inherits From: nsIProtocolHandler
 */
function arAkahukuLocalProtocolHandler () {
}
arAkahukuLocalProtocolHandler.prototype = {
  scheme : "akahuku-local",
  defaultPort : -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_STD,

  // required for XPCOM registration by XPCOMUtils
  classDescription: "Akahuku Local Resource Protocol Handler JS Component",
  classID : Components.ID ("{9d5fe646-b180-4f04-8a20-3069416a4886}"),
  contractID : "@mozilla.org/network/protocol;1?name=akahuku-local",
  _xpcom_categories : [],
  _xpcom_factory : {
    createInstance : function (outer, iid) {
      if (outer != null) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      var handler = new arAkahukuLocalProtocolHandler ();
      return handler.QueryInterface (iid);
    }
  },

  /**
   * インターフェース要求
   *   nsISupports.QueryInterface
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIProtocolHandler)) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },

  /**
   * ブラックリストのポートを上書きするか
   *   nsIProtocolHandler.allowPort
   */
  allowPort : function (port, scheme) {
    return false;
  },

  /**
   * URI を作成する
   *   nsIProtocolHandler.newURI
   *
   * @param  String 対象の URI
   * @param  String 対象の文字コード
   * @param  nsIURI 読み込み元の URI
   * @return nsIURI 作成した URI
   */
  newURI : function (spec, charset, baseURI) {
    var url
    = Cc ["@mozilla.org/network/standard-url;1"]
    .createInstance (Ci.nsIStandardURL);
    var type = Ci.nsIStandardURL.URLTYPE_STANDARD;
    url.init (type, this.defaultPort, spec, charset, baseURI);
    return url.QueryInterface (Ci.nsIURI);
  },

  /**
   * チャネルを作成する
   *   nsIProtocolHandler.newChannel2
   *
   * @param  nsIURI 対象の URI
   * @param  nsILoadInfo loadInfo
   * @return nsIChannel 作成したチャネル
   */
  newChannel2 : function (uri, loadInfo) {
    var param
      = arAkahukuProtocolHandler.prototype
      .getAkahukuURIParam (uri.spec);
    if (param.type == "local") {
      if (/^file:/.test (param.original)) {
        // file:// access via preview channel will be blocked by sandbox
        return this._createLocalFileChannel (uri, param, loadInfo);
      }
      return arAkahukuProtocolHandler.prototype
        ._createPreviewChannel (uri, loadInfo);
    }
    return arAkahukuProtocolHandler.prototype
      ._createEmptyChannel (uri, loadInfo);
  },

  newChannel : function (uri) {
    return this.newChannel2 (uri, null);
  },

  _createLocalFileChannel : function (uri, param, loadInfo) {
    const {AkahukuFileUtil} = Cu.import ("resource://akahuku/fileutil.jsm", {});
    var path = AkahukuFileUtil.getNativePathFromURLSpec (param.original);
    var channel = new arAkahukuDOMFileChannel (uri, path, loadInfo);
    channel.contentType = arAkahukuProtocolHandler.prototype
      ._expectContentTypeFromParam (param);
    return channel;
  },
};

if ("URI_LOADABLE_BY_ANYONE" in Ci.nsIProtocolHandler) {
  arAkahukuLocalProtocolHandler.prototype.protocolFlags
    |= Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
}
if ("URI_IS_LOCAL_RESOURCE" in Ci.nsIProtocolHandler) {
  // 混在表示コンテンツとなることを回避
  arAkahukuLocalProtocolHandler.prototype.protocolFlags
    |= Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE;
}


/**
 * akahuku-safe: プロトコル (httpsリソース用)
 *   Inherits From: arAkahukuProtocolHandler
 */
function arAkahukuSafeProtocolHandler () {
  this.init ();
}
var asph_properties = {
  scheme : "akahuku-safe",
  defaultPort : -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_STD,

  // required for XPCOM registration by XPCOMUtils
  classDescription: "Akahuku Safe Protocol Handler JS Component",
  classID : Components.ID ("{74597554-7400-4074-8c10-a97c54da1989}"),
  contractID : "@mozilla.org/network/protocol;1?name=akahuku-safe",
  _xpcom_factory : {
    createInstance : function (outer, iid) {
      if (outer != null) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      var handler = new arAkahukuSafeProtocolHandler ();
      return handler.QueryInterface (iid);
    }
  },
};
if (typeof Object.create == "function" &&
    typeof Object.assign == "function") {
  // requires Gecko 2.0+
  arAkahukuSafeProtocolHandler.prototype
    = Object.create (arAkahukuProtocolHandler.prototype);
  // requires Gecko 34+
  Object.assign (arAkahukuSafeProtocolHandler.prototype, asph_properties);
}
else {
  asph_properties.__proto__ = arAkahukuProtocolHandler.prototype;
  arAkahukuSafeProtocolHandler.prototype = asph_properties;
}

if ("URI_LOADABLE_BY_ANYONE" in Ci.nsIProtocolHandler) {
  arAkahukuSafeProtocolHandler.prototype.protocolFlags
    |= Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE;
}
if ("URI_SAFE_TO_LOAD_IN_SECURE_CONTEXT" in Ci.nsIProtocolHandler) {
  // requires Firefox 19.0+
  arAkahukuSafeProtocolHandler.prototype.protocolFlags
    |= Ci.nsIProtocolHandler.URI_SAFE_TO_LOAD_IN_SECURE_CONTEXT;
}

