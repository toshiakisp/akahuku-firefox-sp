/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

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
        Cu.import ("resource://gre/modules/Services.jsm");
        if (Services.vc.compare (Services.appinfo.platformVersion, "2.0") >= 0) {
          this._isGecko2orAbove = true;
        }
      }
      catch (e) { Cu.reportError (e);
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
  this.asyncFetch = function (istream, byteSize, callback) {
    var pipeSize = byteSize;
    var pumpSize = byteSize;
    if (byteSize < 0) {
      pipeSize = 0xffffffff;
      pumpSize = -1;
    }
    var pipe = Cc ["@mozilla.org/pipe;1"]
      .createInstance (Ci.nsIPipe);
    pipe.init (true, true, 0, pipeSize, null);

    var pump = Cc ["@mozilla.org/network/input-stream-pump;1"]
      .createInstance (Ci.nsIInputStreamPump);
    pump.init (istream, -1, pumpSize, 0, 0, true);

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
        var bistream = Cc ["@mozilla.org/binaryinputstream;1"]
          .createInstance (Ci.nsIBinaryInputStream);
        bistream.setInputStream (pipe.inputStream);
        callback (bistream, statusCode);
      },
    };
    pump.asyncRead (listener, null);
  };
};

