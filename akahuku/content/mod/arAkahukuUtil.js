
/**
 * XPCOM周りの頻出処理を簡単にするモジュール
 */
var arAkahukuUtil = new function () {

  /**
   * Channel に LoadContext を関連づける
   * (webconsole でモニタできるように)
   */
  this.setChannelContext = function (channel, targetDocument) {
    return;
  };

  this.tryConvertIDNHostToAscii = function (url) {
    return url;
  };

  /*
   * 後で少し後で実行するように登録する
   */
  this.executeSoon = function (func, optArgs) {
    window.setTimeout(function () {
      if (typeof optArgs === "undefined") {
        func.apply (null);
      }
      else {
        func.apply (null, optArgs);
      }
    }, 10);
  };

  /**
   * 現スレッドのイベントループを回しながら指定時間経過を待つ
   */
  this.wait = function (millisedonds) {
    throw new Error('Deprecated for content');
  };

  this.resultCodeToString = function (code) {
    var codeInHex = "(0x" + code.toString (16) + ")";
    var codeName = "";
    return codeName + codeInHex;
  };

  /*
   * nsIFile等からデータをバッファに読み込む
   * (NetUtil.jsmのasyncFetchライクに)
   */
  this.asyncFetch = function (source, callback, optByteSize) {
    throw new Error('NotYetImplemented');
  };

  this.isSuccessCode = function (code) {
    return false;
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
    throw new Error('NotYetImplemented');
  };
  function getSystemPrincipal () {
    return null;
  }
  /*
   * nsIFileかstringからnsIURIを得る(NetUtil.newURI互換)
   */
  this.newURI = function (source, optCharset, optBaseURI) {
    throw new Error('Deprecated in content (no nsIURI)');
  };
  /*
   * nsIFile等からデータをバッファに読み込む
   */
  this.asyncFetchBinary = function (source, byteSize, callback) {
    this.asyncFetch (source, function (istream, statusCode, request) {
      // FIXME: not implemented
      callback (istream, statusCode, request);
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
    for (var k = 0; k < URL2MIME.length; k ++) {
      if (URL2MIME [k][0].test (url)) {
        return URL2MIME [k][1];
      }
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
      if ('tagName' in img && img.tagName.toLowerCase() === 'img') {
        status.isImage = true;
      }
    }
    catch (e) {
    }

    return status;
  };

  /**
   * Timer
   */
  var timerCallback = function (callback, args) {
    this._callback = callback;
    this._args = args;
  };
  timerCallback.prototype = {
    notify : function (timer) {
      this._callback.apply (null, this._args);
    },
  };

  /**
   * setTimeout equivalent
   */
  this.setTimeout = function (callback, delay) {
    var args = Array.prototype.slice.call (arguments, 2);
    var tcb = new timerCallback (callback, args);
    return window.setTimeout(function () {
      tcb.notify();
    }, delay);
  };
  this.clearTimeout = function (id) {
    window.clearTimeout(id);
  };

};

