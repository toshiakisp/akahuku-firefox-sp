/*
 * akahuku/protocol.jsm
 *
 *   akahuku*: プロトコルのURIを利用するための関数群
 *   (arAkahukuProtocolHandler XPCOM とスコープ共有)
 */

/* global Components */

var EXPORTED_SYMBOLS = [
  "enAkahukuURI", 
  "isAkahukuURI",
  "deAkahukuURI",
  "getAkahukuURIParam",
  // for use in XPCOM
  "getHash",
  "initKey",
];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;

var akahuku_scheme_key = "";


  /**
   * 16 進文字列にエンコードする
   *
   * @param  String text
   *         エンコードする文字列
   * @return String
   *         エンコードした文字列
   */
  function toHex (text) {
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
  }
    
  /**
   * MD5 を 4 バイトずつ区切って XOR を取る
   *
   * @param  String data
   *         元の文字列
   * @return String
   *         MD5 を 4 バイトずつ区切って XOR を取ったもの
   */
  function md5_4 (data) {
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
  }

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
  this.getHash = function (protocol, host, path) { 
    var hash;
    hash
    = toHex (md5_4 (akahuku_scheme_key
          + "@" + protocol + "/" + host + "/" + path));
    return hash;
  };

  /**
   * akahuku:// 形式の URI にする
   *   EXPORTED_SYMBOLS
   *
   * @param  String type
   *         種類
   *           "p2p"
   *           "preview"
   *           "jpeg"
   *           "cache"
   *           "local"
   * @param  String uri
   *         URI
   * @return String
   *         akahuku:// 形式の URI
   */
  this.enAkahukuURI = function (type, uri) {
    if (type == "p2p") {
      if (uri.match (/^https?:\/\/dec\.2chan\.net\/up\/src\//)) {
        return uri;
      }
    }
    else if (type == "local") {
      if (/^chrome:\/\/akahuku\/content\//.test (uri)) {
        var path = uri.replace (/^chrome:\/\/akahuku\/content\//, "");
        return "akahuku-local://akahuku/" + path +
          "?" + this.getHash ("chrome", "akahuku", "content/" + path);
      }
      else if (/^file:\/{3}/.test (uri)) {
        var path = uri.replace (/^file:\/{3}/, "");
        return "akahuku-local://localhost/" + path +
          "?" + this.getHash ("file", "localhost", path);
      }
      else if (/^akahuku-local:/.test (uri)) {
        return uri;
      }
      Cu.reportError ("enAkahukuURI: "
          + "failed to akahuku-local protocol; " + uri);
      return uri;
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
            
      var scheme = "akahuku";
      if (protocol == "https" && type != "cachefile") {
        scheme = "akahuku-safe";
      }

      uri
      = scheme + "://" + host + "/" + type
      + "/" + protocol + "." + sep + "/" + path;
    }
        
    return uri;
  };
    
  /**
   * akahuku:// 形式の URI かどうかを返す
   *   EXPORTED_SYMBOLS
   *
   * @param  String uri
   *         URI
   * @return Boolean
   *         akahuku:// 形式の URI かどうか
   */
  this.isAkahukuURI = function (uri) {
    var param = this.getAkahukuURIParam (uri);
    if ("original" in param) {
      return true;
    }
        
    return false;
  };
    
  /**
   * akahuku:// 形式の URI を元に戻す
   *   EXPORTED_SYMBOLS
   *
   * @param  String uri
   *         akahuku:// 形式の URI
   * @return String
   *         URI
   */
  this.deAkahukuURI = function (uri) {
    var param = this.getAkahukuURIParam (uri);
    if ("original" in param) {
      return param.original;
    }
        
    return uri;
  },
    
  /**
   * akahuku:// 形式の URI の情報を取得する
   *   EXPORTED_SYMBOLS
   *
   * @param  String uri
   *         akahuku:// 形式の URI
   * @return Object
   *         URI の情報
   */
  this.getAkahukuURIParam = function (uri) {
    var param = new Object ();
        
    if (uri
        .match (/^akahuku(?:-safe)?:\/\/([^\/]*)\/([^\/]+)\/([A-Za-z0-9\-]+)\.([0-9]+)\/(.*)$/)) {
      param.host = RegExp.$1;
      param.type = RegExp.$2;
      param.protocol = RegExp.$3;
      var sep = parseInt (RegExp.$4);
      param.path = RegExp.$5;
            
      if (/^akahuku-safe:/.test (uri) && param.protocol !== "https") {
        Cu.reportError ("getAkahukuURIParam: "
            + "akahuku-safe allows https only; " + uri);
        return new Object ();
      }
      try {
        var idn
          = Cc ["@mozilla.org/network/idn-service;1"].
          getService (Ci.nsIIDNService);
                
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
    else if (uri.match (/^akahuku-local:\/\/(akahuku|localhost)\/(.*)\?(.*)$/)) {
      param.type = "local";
      param.hash = RegExp.$3;
      if (RegExp.$1 == "akahuku") {
        param.protocol = "chrome";
        param.host = "akahuku";
        param.path = "content/" + RegExp.$2;
        param.original = "chrome://akahuku/" + param.path;
      }
      else {
        param.protocol = "file";
        param.host = "localhost";
        param.path = RegExp.$2;
        param.original = "file:///" + param.path;
      }

      var hash = this.getHash (param.protocol, param.host, param.path);
      if (hash !== param.hash) {
        Cu.reportError ("getAkahukuURIParam: hash check failed; " + uri);
      }
    }
        
    return param;
  };
    

  this.initKey = function () {
    var {AkahukuStorage}
    = Cu.import ("resource://akahuku/storage.jsm", {});
    akahuku_scheme_key
      = AkahukuStorage.local.get ("protocol/akahuku_scheme_key") || "";
    if (akahuku_scheme_key.length == 0) {
      var hex = [
        "0", "1", "2", "3", "4", "5", "6", "7",
        "8", "9", "a", "b", "c", "d", "e", "f"
        ];
      for (var i = 0; i < 32; i ++) {
        akahuku_scheme_key
          += hex [parseInt (Math.random () * 15)];
      }
      // store process-wide key for other processes
      AkahukuStorage.local.set ({
        "protocol/akahuku_scheme_key": akahuku_scheme_key,
      });
    }
  };


