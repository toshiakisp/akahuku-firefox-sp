/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/*
 * akahuku/protocol-handler.jsm
 *
 *   カスタムプロトコル(akahuku:)を実現する XPCOM サービス用
 */

var EXPORTED_SYMBOLS = [
  "arAkahukuProtocolHandler",
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
 *   Inherits From: nsIProtocolHandler, arIAkahukuProtocolHandler
 */
function arAkahukuProtocolHandler () {
  this.inMainProcess = true;
  try {
    var appinfo
      = Cc ["@mozilla.org/xre/app-info;1"].getService (Ci.nsIXULRuntime);
    this.inMainProcess
      = (appinfo.processType == appinfo.PROCESS_TYPE_DEFAULT);
  }
  catch (e) { Cu.reportError (e);
  }
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
        || iid.equals (Ci.nsIProtocolHandler)
        || iid.equals (Ci.arIAkahukuProtocolHandler)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
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
      if (uri.match (/^https?:\/\/dec\.2chan\.net\/up\/src\//)) {
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
        type = type + "." + this.getHash (protocol, host, path);
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
          = Cc ["@mozilla.org/network/idn-service;1"]
          .getService (Ci.nsIIDNService);
                
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
          + "@" + protocol + "/" + host + "/" + path));
    return hash;
  },
    
  /**
   * ハッシュ生成の鍵を初期化する
   */
  initKey : function () {
    if (arAkahukuProtocolHandlerKey.length == 0) {
      var hex = [
        "0", "1", "2", "3", "4", "5", "6", "7",
        "8", "9", "a", "b", "c", "d", "e", "f"
        ];
      for (var i = 0; i < 32; i ++) {
        arAkahukuProtocolHandlerKey
          += hex [parseInt (Math.random () * 15)];
      }
    }
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
      var match = r.exec (baseURI.path);
      if (match) {
        preamble = match [0];
        baseURI.path = baseURI.path.substr (preamble.length);
        // filecache からの相対アドレスはただの cache へ変換
        preamble = preamble.replace (/^\/filecache/,"/cache");
      }
    }
    try {
      url.init (Ci.nsIStandardURL.URLTYPE_AUTHORITY, -1, spec, charset, baseURI);
    }
    catch (e if e.result == Cr.NS_ERROR_MALFORMED_URI) {
      // "akahuku:///"
      url.init (Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, spec, charset, baseURI);
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
      if (this.inMainProcess) {
        var channel
          = new arAkahukuCacheChannel (param.original, uri);
      }
      else { // Content process (e10s)
        // キャッシュストレージにアクセスしずらいので
        // LOAD_FROM_CACHE を立てた nsIHttpChannel に任せる
        // (arAkahukuBypassChannel でラップしてリダイレクトを解決)
        var channel
          = new arAkahukuBypassChannel (uri.spec, param.original);
        channel.enableHeaderBlocker = false;
        channel.loadFlags = Ci.nsIRequest.LOAD_FROM_CACHE;
      }
      return channel;
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

      var targetFile
        = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      targetFile.initWithPath (extCacheFileBase);

      var fileProtocolHandler
        = Cc ["@mozilla.org/network/io-service;1"]
        .getService (Ci.nsIIOService)
        .getProtocolHandler ("file")
        .QueryInterface (Ci.nsIFileProtocolHandler);
      var base = fileProtocolHandler.getURLSpecFromFile (targetFile);
      var path = param.original
        .replace (/^https?:\/\//, "");


      if (this.inMainProcess) {
        path = fileProtocolHandler.getFileFromURLSpec (base + path).path;
        // create nsIInputStreamChannel directly
        return this._createThreadCacheFileChannel (uri, path);
      }
      else { // in content process
        // Require Firefox 29 (OS.Path.fromFileURI)
        var scope = {};
        Cu.import ("resource://gre/modules/osfile.jsm",scope);
        path = scope.OS.Path.fromFileURI (base + path);
        return this._createThreadCacheDOMFileChannel (uri, path);
      }
    }
    catch (e) {
      // 想定外のエラーが起きた場合
      Cu.reportError (e);
      return this._createThreadCacheFailChannel (uri);
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
      fstream.init (targetFile, 0x01, 0444, 0);

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
  _createThreadCacheDOMFileChannel : function (uri, path) {
    try {
      Cu.importGlobalProperties (["File"]);
      var file = new File (path);
    }
    catch (e) {
      var file
        = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      file.initWithPath (path);
      if (!file.exists ()) {
        return this._createThreadCacheFailChannel (uri);
      }
    }

    var channel = new arAkahukuDOMFileChannel (uri, file);
    channel.contentType = "text/html";
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
   * @return nsIChannel
   *         作成したチャネル
   */
  _createP2PChannel : function (uri) {
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

