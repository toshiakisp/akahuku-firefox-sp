
/* global Components, arAkahukuCompat */

/**
 * XPCOM周りの頻出処理を簡単にするモジュール
 */
var arAkahukuUtil = new function () {
  const Cu = Components.utils;
  const Ci = Components.interfaces;
  const Cc = Components.classes;
  const Cr = Components.results;

  /**
   * Channel に LoadContext を関連づける
   * (webconsole でモニタできるように)
   */
  this.setChannelContext = function (channel, targetDocument) {
    if (!("_isGecko2orAbove" in this)) {
      this._isGecko2orAbove = false;
      try {
        var s = {};
        Cu.import ("resource://gre/modules/Services.jsm", s);
        if (s.Services.vc.compare (s.Services.appinfo.platformVersion, "2.0") >= 0) {
          this._isGecko2orAbove = true;
        }
      }
      catch (e) {
        if (e.result == Cr.NS_ERROR_FILE_NOT_FOUND) {
        }
        else {
          Cu.reportError (e);
        }
      }
    }
    if (!this._isGecko2orAbove
        && (channel.loadFlags & Ci.nsICachingChannel.LOAD_ONLY_IF_MODIFIED)) {
      // Firefox 3.6 で LOAD_ONLY_IF_MODIFIED した場合には
      // なぜかステータスが完了にならないため変更しない
      return;
    }

    try {
      channel.QueryInterface (Ci.nsIChannel)
        .notificationCallbacks
        = targetDocument.defaultView
        .QueryInterface (Ci.nsIInterfaceRequestor)
        .getInterface (Ci.nsIWebNavigation);
    }
    catch (e) { Cu.reportError (e);
    }
  };

  this.newURIViaNode = function (path, node) {
    var ios = Cc ["@mozilla.org/network/io-service;1"]
      .getService (Ci.nsIIOService);
    var baseuri = null;
    if (node && "baseURIObject" in node) {
      baseuri = node.baseURIObject;
    }
    else if (node && "baseURI" in node) {
      baseuri = ios.newURI (node.baseURI, null, null);
    }
    return ios.newURI (path, null, baseuri);
  };

  this.tryConvertIDNHostToAscii = function (url) {
    try {
      var uri = this.newURIViaNode (url, null);
      if (typeof uri.asciiHostPort !== "undefined" &&
          uri.asciiHostPort !== uri.hostPort) {
        url = uri.scheme + "://" +
          (uri.userPass ? url += uri.userPass + "@" : "") +
          uri.asciiHostPort + arAkahukuCompat.nsIURI.getPathQueryRef (uri);
      }
    }
    catch (e) { Cu.reportError (e);
    }
    return url;
  };

  /*
   * 後で少し後で実行するように登録する
   */
  this.executeSoon = function (func, optArgs) {
    var tm = Cc ["@mozilla.org/thread-manager;1"]
      .getService (Ci.nsIThreadManager);
    var runnable = {
      run: function () {
        if (typeof optArgs === "undefined") {
          func.apply (null);
        }
        else {
          func.apply (null, optArgs);
        }
      }
    };
    tm.mainThread.dispatch
      (runnable, Ci.nsIThread.DISPATCH_NORMAL);
  };

  /**
   * 現スレッドのイベントループを回しながら指定時間経過を待つ
   */
  this.wait = function (millisedonds) {
    var tm = Cc ["@mozilla.org/thread-manager;1"]
      .getService (Ci.nsIThreadManager);
    var timeout = false;
    var timer = Cc ["@mozilla.org/timer;1"].createInstance (Ci.nsITimer);
    timer.initWithCallback (function () {
      timeout = true;
    }, millisedonds, timer.TYPE_ONE_SHOT);
    while (!timeout) {
      tm.currentThread.processNextEvent (true);
    }
  };

  this.resultCodeToString = function (code) {
    var codeInHex = "(0x" + code.toString (16) + ")";
    var codeName = "";
    for (var name in Components.results) {
      if (code === Components.results [name]) {
        codeName = name + " ";
        break;
      }
    }
    return codeName + codeInHex;
  };

  /*
   * nsIFile等からデータをバッファに読み込む
   * (NetUtil.jsmのasyncFetchライクに)
   */
  this.asyncFetch = function (source, callback, optByteSize) {
    var pipeSize = (optByteSize>>12)+1;
    if (!(optByteSize > 0)) {
      pipeSize = 0xffffffff;
    }
    var pipe = Cc ["@mozilla.org/pipe;1"]
      .createInstance (Ci.nsIPipe);
    pipe.init (true, true, 1<<12, pipeSize, null);

    var listener = {
      onDataAvailable : function (request, context, inputStream, offset, count) {
        var writeCount = pipe.outputStream.writeFrom (inputStream, count);
        if (writeCount == 0) {
          throw Cr.NS_BASE_STREAM_CLOSED;
        }
      },
      onStartRequest : function (request, context) {},
      onStopRequest : function (request, context, statusCode) {
        pipe.outputStream.close ();
        callback (pipe.inputStream, statusCode, request);
      },
    };

    if (source instanceof Ci.nsIInputStream) {
      var pump = Cc ["@mozilla.org/network/input-stream-pump;1"]
        .createInstance (Ci.nsIInputStreamPump);
      pump.init (source, -1, -1, 0, 0, true);
      pump.asyncRead (listener, null);
      return;
    }

    var channel = this.newChannel (source);
    channel.asyncOpen (listener, null);
  };

  /*
   * nsIChannel を作成する
   * (NetUtil.newChannel の最小限版)
   * source = {
   *   uri: string, nsIURI, or nsIFile
   *   loadingNode: DOMNode,
   *   contentPolicyType: Ci.nsIContentPolicy.TYPE_* [optional]
   *   }
   * or
   * source = {
   *   uri: string, nsIURI, or nsIFile
   *   loadUsingSystemPrincipal: true,
   *   contentPolicyType: Ci.nsIContentPolicy.TYPE_* [optional]
   *   }
   * or (newChannel2 実装用拡張)
   * source = {
   *   uri: string, nsIURI, or nsIFile
   *   loadInfo: nsILoadInfo, or null
   *   }
   */
  this.newChannel = function (source) {
    if (source instanceof Ci.nsIChannel) {
      return source;
    }

    var uri;
    var loadingNode = null;
    var loadingPrincipal = null;
    var triggeringPrincipal = null;
    var securityFlags = 0;
    var loadUsingSystemPrincipal = false;
    var loadInfo = null;
    var contentPolicyType = Ci.nsIContentPolicy.TYPE_OTHER;
    if (typeof source == "string"
        || source instanceof Ci.nsIURI
        || source instanceof Ci.nsIFile) {
      uri = (source instanceof Ci.nsIURI ?
          source : this.newURI (source, null, null));
      loadUsingSystemPrincipal = true;
    }
    else if (typeof source == "object") {
      uri = source.uri;
      if (!uri) {
        throw Components.Exception (
            "arAkahukuUtil.newChannel requires object with uri property",
            Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller);
      }
      uri = (source.uri instanceof Ci.nsIURI ?
          source.uri : this.newURI (source.uri, null, null));

      if (source.loadUsingSystemPrincipal) {
        loadUsingSystemPrincipal = true;
      }
      else if (source.loadingNode) {
        loadUsingSystemPrincipal = false;
        loadingNode = source.loadingNode;
      }
      else if ("loadInfo" in source) {
        loadInfo = source.loadInfo;
        // loadInfo が null の場合に備えて
        loadUsingSystemPrincipal = true;
      }
      else {
        throw Components.Exception (
            "arAkahukuUtil.newChannel: illegal property set",
            Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller);
      }

      if (source.contentPolicyType) {
        contentPolicyType = source.contentPolicyType;
      }
    }
    else {
      throw Components.Exception (
          "arAkahukuUtil.newChannel requires string, nsIURI, nsIFile, or object",
          Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller);
    }

    var ios = Cc ["@mozilla.org/network/io-service;1"]
      .getService (Ci.nsIIOService);

    if (loadInfo && "newChannelFromURIWithLoadInfo" in ios) {
      // requires Firefox 37+
      return ios.newChannelFromURIWithLoadInfo (uri, loadInfo);
    }
    if ("newChannelFromURI2" in ios) {
      if (loadUsingSystemPrincipal) {
        loadingPrincipal = getSystemPrincipal ();
        securityFlags = Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL;
      }
      else {
        securityFlags = Ci.nsILoadInfo.SEC_NORMAL;
      }
      return ios.newChannelFromURI2 (uri,
          loadingNode, loadingPrincipal, triggeringPrincipal,
          securityFlags, contentPolicyType);
    }

    // newChannel, newChannelFromURI: Obsolete since Gecko 48
    return ios.newChannelFromURI (uri);
  };
  function getSystemPrincipal () {
    try {
      return Cc ["@mozilla.org/scriptsecuritymanager;1"]
        .getService (Ci.nsIScriptSecurityManager)
        .getSystemPrincipal ();
    }
    catch (e) { Cu.reportError (e);
    }
    return null;
  }
  /*
   * nsIFileかstringからnsIURIを得る(NetUtil.newURI互換)
   */
  this.newURI = function (source, optCharset, optBaseURI) {
    var ios = Cc ["@mozilla.org/network/io-service;1"]
      .getService (Ci.nsIIOService);
    if (source instanceof Ci.nsIFile) {
      return ios.newFileURI (source);
    }
    return ios.newURI (source, optCharset, optBaseURI);
  };
  /*
   * nsIFile等からデータをバッファに読み込む
   */
  this.asyncFetchBinary = function (source, byteSize, callback) {
    this.asyncFetch (source, function (istream, statusCode, request) {
      var bistream = null;
      if (istream) {
        bistream = Cc ["@mozilla.org/binaryinputstream;1"]
          .createInstance (Ci.nsIBinaryInputStream);
        bistream.setInputStream (istream);
      }
      callback (bistream, statusCode, request);
    }, byteSize);
  };

  var URL2MIME = [
    [/\.jpe?g(\?.*)?$/i, "image/jpeg"],
    [/\.png(\?.*)?$/i, "image/png"],
    [/\.gif(\?.*)?$/i, "image/gif"],
    [/\.html?(\?.*)?$/i, "text/html"],
    [/\/uua?count\.php(\?.*)?$/i, "image/gif"],
    [/\.php(\?.*)?$/i, "text/html"],
    [/\.css(\?.*)?$/i, "text/css"],
    [/\.bmp(\?.*)?$/i, "image/bmp"],
    [/\.psd(\?.*)?$/i, "image/x-photoshop"],
    [/\.tiff?(\?.*)?$/i, "image/tiff"],
    [/\.sai(\?.*)?$/i, "application/octet-stream"],
    [/\.mht(\?.*)?$/i, "message/rfc822"],
    [/\.lzh(\?.*)?$/i, "application/octet-stream"],
    [/\.zip(\?.*)?$/i, "application/zip"],
    [/\.7z(\?.*)?$/i, "application/x-7z-compressed"],
    [/\.rar(\?.*)?$/i, "application/x-rar-compressed"],
    [/\.gca(\?.*)?$/i, "application/x-gca-compressed"],
    [/\.txt(\?.*)?$/i, "text/plain"],
    [/\.swf(\?.*)?$/i, "application/x-shockwave-flash"],
    [/\.flv(\?.*)?$/i, "video/x-flv"],
    [/\.mid(\?.*)?$/i, "audio/mid"],
    [/\.wav(\?.*)?$/i, "audio/x-wav"],
    [/\.wma(\?.*)?$/i, "audio/x-ms-wma"],
    [/\.wmv(\?.*)?$/i, "video/x-ms-wmv"],
    [/\.mp3(\?.*)?$/i, "audio/mpeg"],
    [/\.m4a(\?.*)?$/i, "audio/mp4"],
    [/\.ogg(\?.*)?$/i, "application/ogg"],
    [/\.aac(\?.*)?$/i, "audio/aac"],
    [/\.aif(\?.*)?$/i, "audio/x-aiff"],
    [/\.pls(\?.*)?$/i, "audio/mpegurl"],
    [/\.asf(\?.*)?$/i, "video/x-la-asf"],
    [/\.avi(\?.*)?$/i, "video/x-msvideo"],
    [/\.mpg(\?.*)?$/i, "video/mpeg"],
    [/\.doc(\?.*)?$/i, "application/msword"],
    [/\.xls(\?.*)?$/i, "application/vnd.ms-excel"],
    [/\.ppt(\?.*)?$/i, "application/vnd.ms-powerpoint"],
    [/\.pdf(\?.*)?$/i, "application/pdf"],
    [/\.rpy(\?.*)?$/i, "application/octet-stream"],
  ];
  this.getMIMETypeFromURI = function (url) {
    try {
      var uri = this.newURI (url);
      for (var k = 0; k < URL2MIME.length; k ++) {
        var path = arAkahukuCompat.nsIURI.getPathQueryRef (uri);
        if (URL2MIME [k][0].test (path)) {
          return URL2MIME [k][1];
        }
      }
      var mime = Cc ["@mozilla.org/mime;1"]
        .getService (Ci.nsIMIMEService);
      return mime.getTypeFromURI (uri);
    }
    catch (e) { Cu.reportError (e);
    }
    return "application/octet-stream";
  };


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
  };

  /**
   * 画像のロード状態を imgIRequest で調べる
   *
   * @param  HTMLImageElement img
   *         対象の画像要素
   * @return Object
   *         画像の状態
   */
  this.getImageStatus = function (img) {
    var status = new ImageStatus ();
    try {
      img = img.QueryInterface (Ci.nsIImageLoadingContent);
      status.isImage = true;

      /* コンテンツポリシーによるブロックチェック */
      status.isBlocked
        = (img.imageBlockingStatus != Ci.nsIContentPolicy.ACCEPT);
      status.blockingStatus = img.imageBlockingStatus;

      /* リクエストチェック */
      var request
        = img.getRequest (Ci.nsIImageLoadingContent.CURRENT_REQUEST);
      if (request) {
        status.requestImageStatus = request.imageStatus;
        status.requestURI = request.URI;
        var errorMask = Ci.imgIRequest.STATUS_ERROR;
        if (typeof Ci.imgIRequest.STATUS_LOAD_PARTIAL !== "undefined") {
          errorMask |= Ci.imgIRequest.STATUS_LOAD_PARTIAL;
        }
        status.isErrored = ((request.imageStatus & errorMask) != 0);
      }
    }
    catch (e) {
      if (e.result == Cr.NS_ERROR_NO_INTERFACE) {
        status.isImage = false;
      }
      else {
        Cu.reportError (e);
      }
    }

    return status;
  };

  /**
   * Timer
   */
  var nextTimerId = 1;
  var timerIds = [];

  var timerCallback = function (callback, args) {
    this._callback = callback;
    this._args = args;
  };
  timerCallback.prototype = {
    QueryInterface : function (iid) {
      if (iid.Equals (Ci.nsITimerCallback) ||
          iid.Equals (Ci.nsISupports)) {
        return this;
      }
      throw Cr.NS_ERROR_NO_INTERFACE;
    },
    notify : function (timer) {
      this._callback.apply (null, this._args);
    },
  };

  /**
   * setTimeout equivalent without window
   */
  this.setTimeout = function (callback, delay) {
    var id = nextTimerId ++;
    if (nextTimerId == 0x7fffffff) {
      nextTimerId = 1;
    }
    var args = Array.prototype.slice.call (arguments, 2);
    var timer
      = Cc ["@mozilla.org/timer;1"]
      .createInstance (Ci.nsITimer);
    timerIds.push ({id: id, timer: timer});
    var tcb = new timerCallback (callback, args);
    timer.initWithCallback (tcb, delay, timer.TYPE_ONE_SHOT);
    return id;
  };
  this.clearTimeout = function (id) {
    if (!(id > 0)) {
      return;
    }
    for (var i = 0; i < timerIds.length; i ++) {
      if (timerIds [i].id == id) {
        timerIds [i].timer.cancel ();
        timerIds.splice (i, 1);
        return;
      }
    }
  };

};

