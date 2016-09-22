
/**
 * Akahuku IPC support for nsIInputStream and nsIOutpuStream
 *
 * Globals: Components,
 */

var EXPORTED_SYMBOLS = [
  "arInputStreamParent",
  "arInputStreamChild",
  "arOutputStreamParent",
  "arOutputStreamChild",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;

const PR_UINT32_MAX = 0xffffffff;

Cu.import ("resource://akahuku/ipc-proxy.jsm");


/**
 * arInputStreamParent
 *
 * nsIInputStream stream から(メインプロセスで)データを読み
 * 対応する id の arInputStreamChild にIPCメッセージで転送する
 */
function arInputStreamParent (stream) {
  if (!(stream instanceof Ci.nsIInputStream)) {
    throw CE ("arInputStreamParent: nsIInputStream must be given",
        Cr.NS_ERROR_INVALID_VALUE, Components.stack.caller);
  }
  this.mInputStream = stream;
  this.id = arIPCProxyParent.createId ();
}

arInputStreamParent.prototype = {
  IPC_TRANSFERABLE_TYPE : "arInputStream",

  createIPCTransferable : function () {
    var obj = {
      _type: this.IPC_TRANSFERABLE_TYPE,
      _id: this.id,
    };
    return obj;
  },

  attachIPCMessageManager : function (mm) {
    this.messageManager = mm;
    var message = "arInputStreamParent:" + this.id;
    mm.addMessageListener (message, this, false);

    // start an initial waiting
    this.asyncReadInputStream ();
  },
  detachIPCMessageManager : function () {
    if (this.messageManager) {
      var message = "arInputStreamParent:" + this.id;
      this.messageManager.removeMessageListener (message, this);
    }
    this.messageManager = null;
    this._destruct ();
  },

  _destruct : function (optStatus) {
    try {
      if (this.mInputStream
          && this.mInputStream instanceof Ci.nsIAsyncInputStream) {
        this.mInputStream.closeWithStatus (optStatus || Cr.NS_OK);
      }
      else if (this.mInputStream) {
        this.mInputStream.close ();
      }
    }
    catch (e) {
      Cu.reportError (e);
    }
    this.mInputStream = null;
    this.id = null;
  },

  // nsIMessageListener.receiveMessage
  receiveMessage : function (message) {
    if (message.name != "arInputStreamParent:" + this.id) {
      return;
    }
    if (message.data.status == Cr.NS_OK) {
      // send next data segment
      this.sendDataFromInputStream ();
    }
    else {
      var errorMsg = message.data.message;
      Cu.reportError ("arInputStreamParent.recieveMessage: " + errorMsg);
      this._destruct (message.data.status);
      this.detachIPCMessageManager ();
    }
  },

  // IPCメッセージで一度に送る最大バイト数 (分割送信)
  MAX_TRANSFER_BYTES : 4096,

  asyncReadInputStream : function () { 
    var pipe = Cc ["@mozilla.org/pipe;1"].createInstance (Ci.nsIPipe);
    pipe.init (true, true, 0, PR_UINT32_MAX, null);

    var pump = Cc ["@mozilla.org/network/input-stream-pump;1"]
      .createInstance (Ci.nsIInputStreamPump);
    pump.init (this.mInputStream, -1, -1, 0, 0, true);
    // 元の stream は pump に close させるので pipe に挿げ替える
    this.mInputStream = pipe.inputStream;

    var observer = {
      mStream: null,
      // nsIRequestObserver
      onStartRequest: function (request, context) {},
      onStopRequest: function (request, context, statusCode) {
        pipe.outputStream.closeWithStatus (statusCode);
        this.mStream.sendDataFromInputStream ();
        this.mStream = null;
      },
    };
    observer.mStream = this;

    var listener = Cc ["@mozilla.org/network/simple-stream-listener;1"]
      .createInstance (Ci.nsISimpleStreamListener);
    listener.init (pipe.outputStream, observer);

    pump.asyncRead (listener, null);
  },

  sendDataFromInputStream : function () {
    var payload = {status: 0, data: "", count: 0, message: ""};
    try {
      var bistream = Cc ["@mozilla.org/binaryinputstream;1"]
        .createInstance (Ci.nsIBinaryInputStream);
      bistream.setInputStream (this.mInputStream);
      var count = bistream.available ();
      if (count > 0) {
        count = Math.min (count, this.MAX_TRANSFER_BYTES);
        var buf = bistream.readBytes (count);
        payload.data = buf;
        payload.count = count;
        payload.status = Cr.NS_OK;
      }
      else { // EOF
        payload.status = Cr.NS_BASE_STREAM_CLOSED;
      }
    }
    catch (e if e.result == Cr.NS_BASE_STREAM_CLOSED) { // EOF
      payload.status = e.result;
    }
    catch (e) {
      Cu.reportError (e);
      payload.status = e.result;
      payload.message = e.name + "; " + e.message;
    }

    try {
      var message = "arInputStreamChild:" + this.id;
      this.messageManager.sendAsyncMessage (message, payload);
    }
    catch (e) {
      Cu.reportError (e);
      payload.status = e.result;
    }

    if (payload.status !== Cr.NS_OK) {
      this._destruct (payload.status);
      this.detachIPCMessageManager ();
    }
  },

};


/**
 * arInputStreamChild
 *
 * 対応する id を持つ arInputStreamParent からIPCでデータを受け取り
 * 子プロセスで使える nsIInputStream (nsIPipe) に受け渡す
 * (nsIInputStream はJSで実装できないので
 *  arInputStreamChild.inputStream からデータを受け取る)
 */
function arInputStreamChild (streamT) {
  if (streamT._type != arInputStreamChild.prototype.IPC_TRANSFERABLE_TYPE) {
    throw CE ("invalid argument type",
        Cr.NS_ERROR_INVALID_VALUE, Components.stack.caller);
  }
  this.id = streamT._id;

  var pipe = Cc ["@mozilla.org/pipe;1"].createInstance (Ci.nsIPipe);
  // non-blocking input, blocking output
  pipe.init (true, false, 0, 0, null);
  this.mPipe = pipe;
  this.inputStream = pipe.inputStream;

  var bostream = Cc ["@mozilla.org/binaryoutputstream;1"]
    .createInstance (Ci.nsIBinaryOutputStream);
  bostream.setOutputStream (this.mPipe.outputStream);
  this.mOutputStream = bostream;
}

arInputStreamChild.prototype = {
  IPC_TRANSFERABLE_TYPE : "arInputStream",
  attachIPCMessageManager : function (messageManager) {
    this.messageManager = messageManager;
    var message = "arInputStreamChild:" + this.id
    messageManager.addMessageListener (message, this, false);
  },

  // nsIMessageListener.receiveMessage
  receiveMessage : function (message) {
    if (message.data.status == Cr.NS_OK) {
      var aBuf = message.data.data;
      var aCount = message.data.count;
      try {
        if (aBuf && aBuf.length > 0) {
          this.mOutputStream.writeBytes (aBuf, aCount);
        }
        this.callbackToParent (Cr.NS_OK);
        return;
      }
      catch (e) {
        Cu.reportError (e);
        this.callbackToParent (e.result, e.name + "; " + e.message);
      }
    }

    this.mOutputStream.close ();
    this.mOutputStream = null;
    this.mPipe = null;
    this.inputStream = null;
  },

  callbackToParent : function (status, message) {
    var payload = {status: status, message: message || ""};
    var message = "arInputStreamParent:" + this.id;
    this.messageManager.sendAsyncMessage (message, payload);
  },

};



/**
 * arOutputStreamParent
 *
 * 対応する id の arOutputStreamChild からIPCメッセージで受けて
 * nsIOutputStream stream に(メインプロセスで)データを書き込む
 */
function arOutputStreamParent (stream) {
  this.ipc = new arIPCProxyParent (stream);

  var self = this;
  this.ipc.close = function () {
    self.ipc.target.close ();
    self.detachIPCMessageManager ();
  };
}

arOutputStreamParent.prototype = {
  IPC_TRANSFERABLE_TYPE : "arOutputStream",

  createIPCTransferable : function () {
    var entry = this.ipc.target;
    var obj = {
      _type: this.IPC_TRANSFERABLE_TYPE,
      _id: this.ipc.id,
    };
    return obj;
  },

  attachIPCMessageManager : function (mm) {
    this.ipc.attachIPCMessageManager (mm);
  },
  detachIPCMessageManager : function () {
    this.ipc.detachIPCMessageManager ();
    this.ipc = null;
  },
};


/**
 * arOutputStreamChild
 *
 * nsIOutputStream として振る舞い
 * データ等を(メインプロセスの) arOutputStreamParent へ転送する
 */
function arOutputStreamChild (streamT) {
  if (streamT._type != arOutputStreamChild.prototype.IPC_TRANSFERABLE_TYPE) {
    throw CE ("argument type is not matched: " + streamT._type,
        Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller);
  }
  this.ipc = new arIPCProxyChild (arOutputStreamChild.prototype);
  this.ipc.parentId = streamT._id;
  this.id = streamT._id;
}

arOutputStreamChild.prototype = {
  IPC_TRANSFERABLE_TYPE : "arOutputStream",
  attachIPCMessageManager : function (messageManager) {
    this.ipc.attachIPCMessageManager (messageManager);
  },
  toString : function () {
    return "[object arOutputStreamChild]";
  },

  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIOutputStream)) {
      return this;
    }
    throw Cr.NS_NOINTERFACE;
  },

  // nsIOutputStream

  close : function () {
    this.ipc.close ();
    this.ipc.detachIPCMessageManager ();
  },
  flush : function () { this.ipc.flush (); },
  MAX_TRANSFER_BYTES : 4096,
  write : function (aBuf, aCount) {
    // 分割転送
    var countWritten = 0;
    var bufSub;
    while (countWritten < aCount) {
      var countLeft = aCount - countWritten;
      var countSub = Math.min (countLeft, this.MAX_TRANSFER_BYTES);
      if (countWritten == 0 && countSub == aCount) {
        bufSub = aBuf;
      }
      else {
        bufSub = aBuf.substr (countWritten, countSub);
      }
      countWritten += this.ipc.write (bufSub, countSub);
    }
    return countWritten;
  },
  writeFrom : function (aFromStream, aCount) {
    //nsIInputStream aFromStream (FIXME)
    throw CE ("not implemented yet",
        Cr.NS_ERROR_NOT_IMPLEMENTED, Components.stack.caller)
    this.ipc.writeFrom (aFromStream, aCount);
  },
  writeSegments : function () {
    throw CE ("not implemented in script",
        Cr.NS_ERROR_NOT_IMPLEMENTED, Components.stack.caller)
  },
  isNonBlocking : function () { return this.ipc.isNonBlocking (); },

};
