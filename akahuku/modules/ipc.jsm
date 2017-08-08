
/**
 * Akahuku Inter-Process Comunication manager
 */
/* global Components, Promise */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

var EXPORTED_SYMBOLS = [
  "AkahukuIPCManager",
];

Cu.import ("resource://akahuku/console.jsm");
var console = new AkahukuConsole ();





function needsCPOW (value)
{
  if (value instanceof Ci.nsIDOMNode
      || value instanceof Ci.nsIDOMXULElement) {
    return true;
  }
  return false;
}
function needsSerialize (value) {
  if (value instanceof Ci.nsIURI) {
    return true;
  }
  if (typeof Ci.nsILocalFile !== "undefined"
      && value instanceof Ci.nsILocalFile) {
    return true;
  }
  if (value instanceof Ci.nsIFile) {
    return true;
  }
  if (value instanceof Ci.nsIXPCException) {
    return true;
  }
  return false;
}
function serialize (value) {
  var ret = {type: "", value:""};
  if (value instanceof Ci.nsIURI) {
    ret.type = "nsIURI";
    ret.value = value.spec;
  }
  else if (typeof Ci.nsILocalFile !== "undefined"
      && value instanceof Ci.nsILocalFile) {
    ret.type = "nsILocalFile";
    ret.value = value.path;
  }
  else if (value instanceof Ci.nsIFile) {
    ret.type = "nsIFile";
    ret.value = value.path;
  }
  else if (value instanceof Ci.nsIXPCException) {
    ret.type = "nsIXPCException";
    ret.value = {
      result: value.result,
      message: value.message || value.name,
      stack: value.stack.toString (),
    };
  }
  return ret;
}
function deserialize (sobj) {
  var ret = null;
  switch (sobj.type) {
    case "nsIURI":
      var ios = Cc ["@mozilla.org/network/io-service;1"]
        .getService (Ci.nsIIOService);
      ret = ios.newURI (sobj.value, null, null);
      break;
    case "nsIFile":
      var file = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsIFile);
      file.initWithPath (sobj.value);
      ret = file;
      break;
    case "nsILocalFile":
      var file = Cc ["@mozilla.org/file/local;1"]
        .createInstance (Ci.nsILocalFile);
      file.initWithPath (sobj.value);
      ret = file;
      break;
    case "nsIXPCException":
      ret = new Components.Exception (sobj.value.message
          + " [" + sobj.value.stack + "]",
          sobj.value.result);
      break;
  }
  return ret;
}

function convertArgsToTransfer (args, serialized, CPOWs) {
  for (var i = 0; i < args.length; i++) {
    serialized [i] = null;
    CPOWs [i] = null;
    if (needsCPOW (args [i])) {
      CPOWs [i] = args [i];
      args [i] = null;
      //console.log (" args [" + i + "] --> CPOWs [" + i + "] (" + CPOWs [i] + "); ");
    }
    else if (needsSerialize (args [i])) {
      var so = serialize (args [i]);
      if (so.type) {
        //console.log (" args [" + i + "]=" + args [i] + " --> serialized [" + i + "] (" + so.value + ");");
        serialized [i] = so;
        args [i] = null;
      }
    }
  }
}
function convertArgsFromTransfer (args, serialized, CPOWs) {
  var ret = [];
  for (var i = 0; i < args.length; i++) {
    ret [i] = args [i];
    if (serialized [i] !== null) {
      //console.log (" args [" + i + "] <-- serialized [" + i + "] (" + serialized [i].value + "); ");
      ret [i] = deserialize (serialized [i]);
    }
    else if (CPOWs [i] !== null) {
      ret [i] = CPOWs [i];
      //console.log (" args [" + i + "] <-- CPOWs [" + i + "]; " + CPOWs [i] + "); ");
    }
  }
  return ret;
}

function getContentFrameMessageManager (targetWindow) {
  return targetWindow
    .QueryInterface (Ci.nsIInterfaceRequestor)
    .getInterface (Ci.nsIWebNavigation)
    .QueryInterface (Ci.nsIInterfaceRequestor)
    .QueryInterface (Ci.nsIDocShell)
    .QueryInterface (Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIContentFrameMessageManager);
}


/*
 * Two IPC Request types:
 *    Request -store-> message -construct-> Request
 *    sending          payload              received
 *
 * 1) sender's Request:
 *    Prepare a callback listener for the original callback
 *    and omit original callback from transfering arguments.
 *    It can be stored in a message payload.
 * 2) listener's Request:
 *    Prepare a fake callback object/function for actual method call,
 *    which sends back a response to original caller.
 *    It can be restored from a message payload.
 *
 * IPC call and callback:
 *   original call=>sending   "/Call"     received
 *                  request  --message--> request  => actual call
 *                     |                     |        in the main
 *                     |                     v        process, and
 *                     v      "/Response"  sender  <= callback
 *                  callback <--message-- callback
 *   orig callback<=listener
 */

function AkahukuIPCPayload (message) {
  this.data = message ? message.data : null;
  this.objects = message ? message.objects : null;
}

function AkahukuIPCSendingRequest () {
  this.name = null;
  this.callback = null;
  this.promise = null;
  this.definition = {};
  this.transferableArguments = null;
  this.transferableObjects = null;
  this.argumentsToCall = null;
}
AkahukuIPCSendingRequest.prototype = {
  init : function (entry, args, optContentWindow)
  {
    this.name = entry.moduleName + "/" + entry.command;
    this.definition = entry.def;
    if (args) { // copy to array
      args = (args.length === 1 ? [args [0]] : Array.apply (null, args));
    }
    else {
      args = [];
    }
    this.argumentsToCall = args.slice (0); // copy for instant sync call

    if (entry.def.callback > 0) {
      // when a callback function or object is required
      var callback = args [entry.def.callback - 1];
      args [entry.def.callback - 1] = null; // omit from transferables
      this.callback = new AkahukuIPCCallbackListener (entry, callback);
      this.callback.init (optContentWindow);
    }
    else if (entry.def.promise) {
      var that = this;
      this.promise = new Promise (function (resolve, reject) {
        // special callback object for "promise" type
        var callback = {
          onFulfilled : function (value) { resolve (value); },
          onRejected : function (reason) { reject (reason); },
        };
        that.callback = new AkahukuIPCCallbackListener (entry, callback);
        that.callback.init (optContentWindow);
      });
    }

    this.transferableArguments = args;
    this.transferableSerializedArguments = [];
    this.transferableObjects = [];
    convertArgsToTransfer
      (this.transferableArguments,
       this.transferableSerializedArguments,
       this.transferableObjects);
  },

  // convert this request to a payload
  store : function () {
    var payload = new AkahukuIPCPayload ();
    payload.data = {
      call: this.name,
      args: this.transferableArguments,
      argsS: this.transferableSerializedArguments,
      callback: 0,
      responseId: null,
    };
    payload.objects = this.transferableObjects;
    if (this.callback) {
      payload.data.responseId = this.callback.message;
      payload.data.callback = this.definition.callback;
      if (this.definition.callbackType == "object") {
        payload.data.callbackMethod
          = this.definition.callbackMethod;
      }
    }
    return payload;
  },
};

function AkahukuIPCReceivedRequest (message) {
  this.name = null;
  this.callback = null;
  this.callbackAddress = 0;
  this.response = null;
  this.transferableArguments = null;
  this.transferableSerializedArguments = null;
  this.transferableObjects = null;
  this.argumentsToCall = null;
  this.promiseHandler = null;
  this.messageManager = null;
  if (message) {
    if ("sendAsyncMessage" in message.target) {
      this.messageManager = message.target;
    }
    else {
      // message.target is <xul:browser> in the chrome process
      this.messageManager = message.target.messageManager;
    }
    this.init (message);
  }
}
AkahukuIPCReceivedRequest.prototype = {
  // convert a payload into this request
  init : function (payload) {
    this.name = payload.data.call;
    this.transferableArguments = payload.data.args;
    this.transferableSerializedArguments = payload.data.argsS;
    this.transferableObjects = payload.objects;

    this.argumentsToCall
      = convertArgsFromTransfer
      (this.transferableArguments,
       this.transferableSerializedArguments,
       this.transferableObjects);

    // for debug
    this.argumentsToCall.toString = function () {
      var str = "[";
      for (var i = 0; i < this.length; i++) {
        str += i + ":";
        try {
          str += (this [i].hasOwnProperty ("toString")
              ? (this [i]).toString ()
              : JSON.stringify (this [i]));
        }
        catch (e) {
          str += (this [i]).toString ();
        }
        str += (i < this.length - 1 ? ", " : "]");
      }
      return str;
    }

    if (payload.data.responseId) {
      this.callback = payload.data.responseId;
      this.callbackAddress = payload.data.callback;
    }
  },
  setDefinition : function (def)
  {
    // def.callback == this.callbackAddress
    if (def.callback > 0 || def.promise) {
      var responseId = this.callback;
      this.response = new AkahukuIPCCallbackSender
        (def, responseId, this.messageManager);
      if (this.callbackAddress > 0) {
        this.argumentsToCall [this.callbackAddress-1]
          = this.response.callback;
      }
    }
    if (def.promise) {
      var callback = this.response.callback;
      this.promiseHandler = {
        onFulfilled : function (value) {
          callback.onFulfilled (value);
        },
        onRejected : function (reason) {
          callback.onRejected (reason);
        },
      };
    }
  },

  sendErrorResponse : function (error)
  {
    if (this.response) {
      this.response.sendResponse ([], false, error.message);
    }
  },

  toString : function ()
  {
    return "[object AkahukuIPCReceivedRequest("
      + this.name + ", callback=" + this.callback + ")]";
  },
};

/*
 * Callback stuffs:
 *
 *  originalCallback Callback    receive
 *    +------------- Listener <==Message===
 * original             |
 * callback <------- Response
 *          callbackTo
 *
 *
 *  sendAsync  Callback
 * <=Message==  Sender  <--callback
 *                |
 *             Response
 */

function AkahukuIPCResponse (source) {
  this.name = "";
  this.isSuccess = false;
  this.message = "";

  this.returnValuesToCallback = [];
  this.transferableReturnValues = [];
  this.transferableSerializedRV = [];
  this.transferableReturnObjects = [];

  this.callbackMethod = null;

  if (source && typeof source === "object") {
    if ("data" in source && "objects" in source) {
      this.restoreFromPayload (source);
    }
    else if ("isSuccess" in source && "value" in source) {
      this.setResponse (source);
    }
  }
}
AkahukuIPCResponse.prototype = {
  setResponse : function (source)
  {
    this.isSuccess = !!source.success;

    var args = [];
    if (source.values) {
      args = source.values;
      args = (args.length === 1 ? [args [0]] : Array.apply (null, args));
      this.returnValuesToCallback = args;
    }

    this.callbackMethod = source.callbackMethod || "";
    this.message = source.message || "";
    this.name = source.name || "";
  },
  restoreFromPayload : function (payload)
  {
    this.name = payload.name;
    this.isSuccess = payload.data.success;
    this.message = payload.data.message;

    this.transferableReturnValues = payload.data.values;
    this.transferableSerializedRV = payload.data.valuesS;
    this.transferableReturnObjects = payload.objects;
    this.returnValuesToCallback =
      convertArgsFromTransfer
        (this.transferableReturnValues,
         this.transferableSerializedRV,
         this.transferableReturnObjects);

    this.callbackMethod = payload.data.callback || null;
  },
  store : function () {
    this.transferableReturnValues = this.returnValuesToCallback;
    convertArgsToTransfer
      (this.transferableReturnValues,
       this.transferableSerializedRV,
       this.transferableReturnObjects);
    var payload = {data: null, objects: null};
    // payload format
    payload.data = {
      success: this.isSuccess,
      message: this.message,
      values: this.transferableReturnValues,
      valuesS: this.transferableSerializedRV,
    };
    if (this.callbackMethod) {
      payload.data.callback = this.callbackMethod;
    }
    payload.objects = this.transferableReturnObjects;
    return payload;
  },
  callbackTo : function (callback) {
    if (!this.isSuccess) {
      console.error ("comunication error occured in " + this.message);
      return;
    }
    if (!(typeof callback == "function"
        || (callback !== null && typeof callback == "object"))) {
      throw Components.Exception ("invalid callback",
          Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller)
    }

    var func = this.callbackMethod
      ? callback [this.callbackMethod]
      : callback;
    var funcThis = this.callbackMethod
      ? callback
      : null;
    if (typeof func !== "function") {
      if (this.callbackMethod) { //"object" type
        throw Components.Exception
          ("not found required callback method '"
           + this.callbackMethod + "' for " + this.name);
      }
      else { // "function" type
        throw Components.Exception
          ("no proper callback function for " + this.name)
      }
    }
    func.apply (funcThis, this.returnValuesToCallback);
  },
};

function AkahukuIPCCallbackListener (entry, callback) {
  this.command = entry.moduleName + "/" + entry.command;
  this.definition = entry.def;
  this.originalCallback = callback;
  this.originalCallbackMethod = null;
  if (entry.def.callbackType == "object") {
    this.originalCallbackMethod = entry.def.callbackMethod;
  }

  // callback 待ち受け用のユニークなメッセージを作成
  var id_base = "00000"; // 作りたい桁数分の0(for zero padding)
  var id_num = Math.floor (Math.random () * Math.pow (2,4*id_base.length));
  var id_hex = (id_base + id_num.toString (16)).slice(-id_base.length);
  this.message = this.messagePrefix + "/" + this.command + "?" + id_hex;
  this.messageManager = null;
}

AkahukuIPCCallbackListener.prototype = {
  messagePrefix: "akahuku.fx.sp@toshiakisp.github.io:IPC/Response",

  init : function (contentWindow) {
    if (contentWindow) {
      this.messageManager = getContentFrameMessageManager (contentWindow);
    }
    else {
      this.messageManager =
        Cc ['@mozilla.org/childprocessmessagemanager;1']
        .getService (Ci.nsIMessageListenerManager);
    }
    //console.log ("AkahukuIPCCallbackListener init: start listening '"
    //    +this.message + "' at " + this.messageManager);
    this.messageManager
      .addMessageListener (this.message, this, false);
  },

  // nsIMessageListener.receiveMessage
  receiveMessage : function (message) {
    if (this.message !== message.name) {
      return;
    }
    this.messageManager
      .removeMessageListener (this.message, this);
    this.messageManager = null;

    var resp = new AkahukuIPCResponse (message);
    if (this.definition.debug) {
      console.log ("AkahukuIPCCallbackListener received response:",
          resp.name, resp);
    }
    resp.callbackTo (this.originalCallback);
  },
};

function AkahukuIPCCallbackSender (def, responseId, mm) {
  this.responseId = responseId;
  this.callbackMethod = def.callbackMethod;
  this.definition = def;
  this.callback = this.createCallback ();
  this.messageManager = mm;
}
AkahukuIPCCallbackSender.prototype = {
  createCallback : function () {
    if (this.callbackMethod) {
      // "object" type
      var callback = {};
      var methods = this.callbackMethod;
      if (typeof this.callbackMethod == "string") {
        methods = [this.callbackMethod];
      }
      for (var i = 0; i < methods.length; i ++) {
        callback [methods [i]] = (function (sender, name) {
          return function () {
            sender.sendResponse (arguments, true, "", name);
          };
        })(this, methods [i]);
      }
      callback.toString = function () {
        return "[object Callback]";
      };
      return callback;
    }
    else {
      // "function" type
      var sender = this;
      var callback_func = function () {
        sender.sendResponse (arguments, true, "");
      };
      callback_func.toString = function () {
        return "[function Callback]";
      };
      return callback_func;
    }
  },
  sendResponse : function (args, success, message, callbackMethod)
  {
    // convert raw value to transferables
    if (args) {
      args = (args.length === 1 ? [args [0]] : Array.apply (null, args));
    }
    var response = new AkahukuIPCResponse ();
    response.setResponse ({
      success: success,
      values: args,
      message: message || "",
      callbackMethod: callbackMethod || null,
    });
    var payload = response.store ();
    if (this.definition.debug) {
      console.log ("AkahukuIPCCallbackSender send response:",
          this.responseId, response);
    }
    if (this.messageManager) {
      var ms = this.messageManager;
      ms.sendAsyncMessage
        (this.responseId, payload.data, payload.objects);
    }
    else {
      console.error ("sendResponse has no message manager to response; "
          + this.responseId);
    }
  },
};

/**
 * メッセージベースのコマンド登録/実行マネージャー
 */
function AkahukuIPC () {
  var appinfo
    = Cc ["@mozilla.org/xre/app-info;1"]
    .getService (Ci.nsIXULRuntime);
  this.inMainProcess
    = (appinfo.processType === appinfo.PROCESS_TYPE_DEFAULT);
  this.processID = appinfo.processID;
  // Define default procedures
  this._procedures = {
    AkahukuIPC : {
      cloneState : {
        _module : this,
        enable: true,
        async: false,
        callback: 0,
      },
      loadSubScript : {
        _module : this,
        enable: true,
        async: false,
        callback: 0,
      },
    },
  };
}
AkahukuIPC.prototype = {
  messagePrefix : "akahuku.fx.sp@toshiakisp.github.io:IPC",
  subKey : "",
  inMainProcess : false,
  isRoot : false,
  processID : -1,
  initialized : false,
  terminated : false,
  console : null,

  getContentFrameMessageManager : getContentFrameMessageManager,

  getChildProcessMessageManager : function () {
    return Cc ['@mozilla.org/childprocessmessagemanager;1']
      .getService (Ci.nsISyncMessageSender);
  },

  /**
   * IPCコマンドを実行中のみセットされる message.event
   */
  messageTarget : null,


  get messageCall () { // 子プロセス->メインプロセス
    return this.messagePrefix
      + (this.subKey ? ":" + this.subKey : "")
      + "/Call";
  },
  get messageResponse () { // メインプロセス->子プロセス(コールバック)
    return this.messagePrefix
      + (this.subKey ? ":" + this.subKey : "")
      + "/Response";
  },
  get messageCallChild () { // メインプロセス->子プロセス (含broadcast)
    return this.messagePrefix
      + (this.subKey ? ":" + this.subKey : "")
      + "/CallChild";
  },
  get messageDefine () { // 新コマンド追加
    return this.messagePrefix
      + (this.subKey ? ":" + this.subKey : "")
      + "/Define";
  },

  /* _procedures : {
   *   "aModule1" : {
   *     "aCommand1" : {
   *       _module : aModule1,
   *       enable : true,
   *     },
   *     "aCommand2" : {
   *       _module : aModule1b,
   *       enable : true,
   *     },
   *   },
   *   "aModule2" : {
   *   }
   * }
   */
  _procedures : {},
  _scope : null,

  /**
   * コマンドの登録
   *
   * @param  object module
   *         実行するオブジェクト
   * @param  string moduleName
   *         オブジェクト名
   * @param  string commandName
   *         コマンド名=関数名
   * @param  object optSettings
   *         [optional] コマンドの設定
   */
  defineProc : function (module, moduleName, commandName, optSettings) {
    if (!this.initialized) {
      throw Components.Exception
        ("AkahukuIPC is not initizilzed yet",
         Cr.NS_ERROR_FAILURE, Components.stack.caller);
    }
    if (!this.isRoot && !(optSettings && optSettings.remote)) {
      throw Components.Exception
        ("AkahukuIPC.defineProc is available only for root IPC"
         + " except remote command",
         Cr.NS_ERROR_FAILURE, Components.stack.caller);
    }
    this._defineProc (module, moduleName, commandName, optSettings);
  },
  _defineProc : function (module, moduleName, commandName, optSettings) {
    if (!(moduleName in this._procedures)) {
      // モジュールエントリの初期化
      this._procedures [moduleName] = {};
    }
    if (commandName in (this._procedures [moduleName]) && !module) {
      // already registered
      return;
    }
    // コマンド定義の初期化
    var command_def = {
      _module: module,
      moduleName: moduleName,
      methodName: commandName,
      debug: false,
      enable: true,
      async: false,
      frame: false, // use frame message manager to send
      remote: false, // send requests to a target frame from the main process
      callback: 0,
      callbackType: "function",
      callbackMethod: "",
      promise: false, // async command returns a promise (instead of callback)
    };
    if (optSettings) {
      if ("debug" in optSettings && optSettings.debug) {
        command_def.debug = true;
      }
      if ("async" in optSettings && optSettings.async) {
        command_def.async = true;
      }
      if ("callback" in optSettings && optSettings.callback > 0) {
        command_def.callback = optSettings.callback;
      }
      if ("callbackObjectMethod" in optSettings) {
        command_def.callbackType = "object";
        command_def.callbackMethod = optSettings.callbackObjectMethod;
      }
      if ("frame" in optSettings && optSettings.frame) {
        command_def.frame = true;
      }
      if ("remote" in optSettings && optSettings.remote) {
        command_def.remote = true;
        // FIXME frame とは排他？
      }
      if ("promise" in optSettings && optSettings.promise) {
        command_def.promise = true;
        // "promise" type is implemented as a special object-type callback
        command_def.callback = 0;
        command_def.callbackType = "object";
        command_def.callbackMethod = ["onFulfilled", "onRejected"];
      }
    }
    this._procedures [moduleName] [commandName] = command_def;

    if (this.isRoot) {
      if (!command_def.remote) {
        this._broadcastDefineMessage (moduleName, commandName, optSettings);
      }
      else {
        // no need to send definitions for remote commands
      }
    }
    else { // in child IPC
      if (command_def.remote && command_def._module) {
        // send remote command defined in child to root
        //console.log ("sending remote command definition to root; " + moduleName + "/" + commandName);
        this._sendDefineMessage (moduleName, commandName, optSettings);
      }
      else {
        // no need to send from child to root
      }
    }
  },

  _getCommandEntry : function (commandMessage)
  {
    var match = commandMessage.match (/^([^\/]+)\/([^\/]+)$/);
    if (!match) {
      return null;
    }
    var moduleName = match [1];
    var commandName = match [2];

    var entry = {
      moduleName: "", // module name
      module: null,
      command: "", // command name
      def: { // see command_def in _defineProc
        enable: false
      },
    };
    if (moduleName in this._procedures) {
      entry.moduleName = moduleName;
      if (commandName in this._procedures [moduleName]) {
        entry.command = commandName;
        entry.def = this._procedures [moduleName][commandName];
        entry.module = this._procedures [moduleName][commandName]._module;
      }
      return entry;
    }
    return null;
  },


  // nsIMessageListener.receiveMessage
  receiveMessage : function (message) {
    if (this.isRoot ?
        (message.name === this.messageCall) :
        (message.name === this.messageCallChild)) {
      return this._receiveCallMessage (message);
    }
    if (message.name === this.messageDefine) {
      return this._receiveDefineMessage (message);
    }
    return null;
  },

  _receiveCallMessage : function (message) {
    // in the main process
    // or in a content process for remote commands
    var rcvRequest = new AkahukuIPCReceivedRequest (message);
    var entry = this._getCommandEntry (rcvRequest.name);
    if (entry && entry.module && entry.def.enable) {
      rcvRequest.setDefinition (entry.def);//arguments ready
      if (message.sync !== !entry.def.async) {
        throw Components.Exception
          ("AkahukuIPC receives "
           + (message.sync ? "" : "a") + "sync message for "
           + (entry.def.async ? "a" : "") + "sync command: "
           + rcvRequest.name);
      }
      if (this.isRoot && entry.def.remote) {
        throw Components.Exception
          ("AkahukuIPC(root) receives remote command; "
           + rcvRequest.name);
      }
      if (!this.isRoot && !entry.def.remote) {
        throw Components.Exception
          ("AkahukuIPC(child) receives non-remote command; "
           + rcvRequest.name);
      }
      if (!this.isRoot && message.sync) {
        throw Components.Exception
          ("AkahukuIPC(child) receives sync message; "
           + rcvRequest.name);
      }
      var ret = null;
      this.messageTarget = message.target;
      if (entry.def.async) {
        if (entry.def.debug) {
          this.console.log ("receive async IPC call " + rcvRequest.name);
        }
        this._executeAsyncCommandEntry (entry, rcvRequest);
      }
      else {
        if (entry.def.debug) {
          this.console.log ("receive IPC call " + rcvRequest.name);
        }
        ret = this._executeSyncCommandEntry (entry, rcvRequest);
      }
      this.messageTarget = null;
      return ret;
    }
    else {
      if (!this.isRoot && this.inMainProcess) {
        // just ignore undefined (broadcast) commands
        // in child node in the main processes
        return;
      }
      var debugHeader = "AkahukuICP"
        + (this.subKey ? ":" + this.subKey : "")
        + "(" + (this.isRoot ? "root" : "child#" + this.processId) + "): ";
      if (entry) {
        if (!entry.module) {
          throw Components.Exception
            (debugHeader + "can not execute '"
             + rcvRequest.name + "' because of no module");
        }
        throw Components.Exception
          (debugHeader + "'" + entry.command + "' is disabled");
      }
      else {
        throw Components.Exception
          (debugHeader + "'" + rcvRequest.name+ "' is not defined.");
      }
    }
  },

  _executeSyncCommandEntry : function (entry, request) {
    var ret = {value: null, success: false, message: null, serialize: false};
    try {
      var func = entry.module [entry.command];
      ret.value = func.apply (entry.module, request.argumentsToCall);
      if (needsSerialize (ret.value)) {
        ret.value = serialize (ret.value);
        ret.serialize = true;
        ret.success = true;
      }
      else if (needsCPOW (ret.value)) {
        ret.success = false;
        ret.message =
          "sendSyncCommand ('" + entry.moduleName + "/" + entry.command
           + "') can not return CPOW-required objects, but results in " + ret.value;
        ret.value = null;
        this.console.error (ret.message);
      }
      else {
        ret.success = true;
      }
    }
    catch (e) {
      Cu.reportError (e);
      ret.message = e.message;
      ret.value = e.result;
    }
    return ret;
  },

  _executeAsyncCommandEntry : function (entry, request)
  {
    try {
      //console.log ("async IPC: " + entry.command + " argumentsToCall=" + request.argumentsToCall);
    } catch (e) {this.console.log (e);}
    try {
      var func = entry.module [entry.command];
      var ret = func.apply (entry.module, request.argumentsToCall);
      if (entry.def.promise) {
        ret.then (request.promiseHandler.onFulfilled,
            request.promiseHandler.onRejected);
      }
    }
    catch (e) {
      this.console.exception (e);
      if (entry.def.callback > 0) {
        // エラーが起きたことをレスポンスして
        // コールバックメッセージの待ち受けを解除させる
        request.sendErrorResponse (e);
      }
    }
  },

  /**
   * Main-process IPCからContent-process IPCへの
   * 新しく defineProc された情報の受け渡し
   */
  _broadcastDefineMessage : function (moduleName, commandName, settings) {
    if (!this.inMainProcess) {
      throw Components.Exception
        ("AkahukuIPC: broadcasting is permited only in the main process.");
    }
    var mm  = Cc ["@mozilla.org/parentprocessmessagemanager;1"]
      .getService (Ci.nsIMessageBroadcaster);
    var obj = {
      name : moduleName,
      command : commandName,
      settings : settings,
    };
    mm.broadcastAsyncMessage (this.messageDefine, obj);
  },
  _sendDefineMessage : function (moduleName, commandName, settings) {
    if (this.isRoot) {
      throw Components.Exception
        ("AkahukuIPC: parent IPC does not send definitions, use broadcasting.");
    }
    var mm = Cc ['@mozilla.org/childprocessmessagemanager;1']
      .getService (Ci.nsIMessageSender);
    var obj = {
      name : moduleName,
      command : commandName,
      settings : settings,
    };
    mm.sendAsyncMessage (this.messageDefine, obj);
  },
  _receiveDefineMessage : function (message) {
    // in a content process
    // or in a content process for definitions of remote command
    var obj = message.data;
    if (obj !== null && typeof obj === "object"
        && "name" in obj && "command" in obj && "settings" in obj) {
      if (this.isRoot && !obj.settings.remote) {
        throw Components.Exception
          ("AkahukuIPC in the main process received "
           + "an illegal proc definition (no remote)");
      }
      this._defineProc (null, obj.name, obj.command, obj.settings);
    }
    else {
      throw Components.Exception
        ("AkahukuIPC receive an illegal proc definition");
    }
  },


  /**
   * コマンドを送って結果を受け取る(同期)
   *   (メインプロセス内から使ったらそのまま実行する)
   *   メッセージ送受やコマンド実行自体でエラーがあったら例外
   *   引数および戻り値は JSON 化可能なものに限る
   *
   * @param  string command
   *         "Module/command"
   * @param  array args
   *         command 関数への引数リスト
   * @return コマンドの戻り値
   */
  sendSyncCommand : function (command, args, optContentWindow) {
    var rets;
    var entry = this._getCommandEntry (command);
    if (!(entry && entry.def.enable)) {
      throw Components.Exception
        ("AkahukuIPC: unregistered command; " + command,
         Cr.NS_ERROR_FAILURE, Components.stack.caller);
    }
    if (entry.def.async) {
      throw Components.Exception
        ("AkahukuIPC: command is for asyncronus requests; " + command,
         Cr.NS_ERROR_FAILURE, Components.stack.caller);
    }
    if (entry.def.remote) {
      throw Components.Exception
        ("AkahukuIPC: command is for remote requests; " + command,
         Cr.NS_ERROR_FAILURE, Components.stack.caller);
    }
    if (entry.def.frame
        && !(optContentWindow
          && optContentWindow instanceof Ci.nsIDOMWindow)) {
      throw Components.Exception
        ("AkahukuIPC: command requires an additional argument of the content window; " + command,
         Cr.NS_ERROR_NOT_AVAILABLE, Components.stack.caller);
    }

    var request = new AkahukuIPCSendingRequest ();
    request.init (entry, args, optContentWindow);

    if (this.inMainProcess && this.isRoot) {
      this.messageTarget = null;
      if (optContentWindow) {
        this.messageTarget = optContentWindow
          .QueryInterface (Ci.nsIInterfaceRequestor)
          .getInterface (Ci.nsIWebNavigation)
          .QueryInterface (Ci.nsIDocShell)
          .chromeEventHandler; // => XUL browser in the main process
      }
      rets = [this._executeSyncCommandEntry (entry, request)];
      this.messageTarget = null;
    }
    else {
      if (optContentWindow) {
        var mm = getContentFrameMessageManager (optContentWindow);
      }
      else {
        var mm = Cc ['@mozilla.org/childprocessmessagemanager;1']
          .getService (Ci.nsISyncMessageSender);
      }
      var payload = request.store ();
      rets = mm.sendSyncMessage (this.messageCall, payload.data, payload.objects);
    }

    // Check syncronusly returned values
    if (rets.length > 1) {
      this.console.warn
        ("sendSyncCommand returns multiple values, not only one.")
    }
    if (rets.length > 0) {
      var ret = rets [0];
      if (ret !== null && typeof ret === "object"
          && "value" in ret && "success" in ret) {
        if (ret.success) {
          if (ret.serialize) {
            return deserialize (ret.value);
          }
          return ret.value;
        }
        else {
          throw Components.Exception
            (ret.message + " (AkahukuIPC:" + command + ")",
             ret.value || Cr.NS_ERROR_FAILURE,
             Components.stack.caller);
        }
      }
      else {
        this.console.info (rets);
        throw Components.Exception
          ("AkahukuIPC: unexpected structure returned; " + command,
           Cr.NS_ERROR_FAILURE, Components.stack.caller);
      }
    }
    throw Components.Exception
      ("AkahukuIPC: no response for " + command,
       Cr.NS_ERROR_FAILURE, Components.stack.caller);
  },

  /**
   * コマンドを送る(非同期)
   *   メッセージ送受やコマンド実行自体でエラーがあったら例外
   *   引数および戻り値は JSON 化可能なものに限る
   *
   * @param  string command
   *         "Module/command"
   * @param  array args
   *         command 関数への引数リスト。
   *         コールバック関数もそのまま渡す。
   * @return コマンドの戻り値
   */
  sendAsyncCommand : function (command, args, optContentWindow, optTarget, optBroadcast){
    var entry = this._getCommandEntry (command);
    if (!(entry && entry.def.enable)) {
      throw Components.Exception
        ("AkahukuIPC: invalid command; " + command,
         Cr.NS_ERROR_NOT_AVAILABLE, Components.stack.caller);
    }
    if (!entry.def.async) {
      throw Components.Exception
        ("AkahukuIPC: command is for syncronus requests; " + command,
         Cr.NS_ERROR_NOT_AVAILABLE, Components.stack.caller);
    }
    if (entry.def.frame
        && !(optContentWindow
          && optContentWindow instanceof Ci.nsIDOMWindow)) {
      throw Components.Exception
        ("AkahukuIPC: command requires an additional argument of the content window; " + command,
         Cr.NS_ERROR_NOT_AVAILABLE, Components.stack.caller);
    }
    if (entry.def.remote) {
      if (optBroadcast) {
        if (!(this.isRoot && entry.def.async
              && entry.def.callback == 0 && !entry.def.promise
              && !optTarget && !optContentWindow)) {
          throw Components.Exception
            ("AkahukuIPC: invalid arguments for broadcasting; " + command,
             Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller);
        }
      }
      else {
        if (!(optTarget && "sendAsyncMessage" in optTarget)) {
          throw Components.Exception
            ("AkahukuIPC: no valid target frames specified; " + command,
             Cr.NS_ERROR_NOT_AVAILABLE, Components.stack.caller);
        }
      }
    }

    var ms = null;
    var request = new AkahukuIPCSendingRequest ();
    request.init (entry, args, optContentWindow);
    var payload = request.store ();
    if (optTarget) {
      ms = optTarget;
    }
    else if (optContentWindow) {
      ms = getContentFrameMessageManager (optContentWindow);
    }
    else if (!this.isRoot) {
      ms = Cc ['@mozilla.org/childprocessmessagemanager;1']
        .getService (Ci.nsIMessageSender);
    }
    if (ms) {
      var call = (this.isRoot ? this.messageCallChild : this.messageCall); 
      ms.sendAsyncMessage (call, payload.data, payload.objects);
    }
    else {
      if (!optBroadcast) {
        throw Components.Exception
          ("AkahukuIPC: no target message manager to send (broadcast?); " + command,
           Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller)
      }
      ms = Cc ['@mozilla.org/parentprocessmessagemanager;1']
        .getService (Ci.nsIMessageBroadcaster);
      ms.broadcastAsyncMessage (this.messageCallChild, payload.data, payload.objects);
    }
    if (entry.def.promise) {
      return request.promise;
    }
    return undefined;
  },
  sendAsyncCommandToFrame : function (command, args, targetFrame)
  {
    this.sendAsyncCommand (command, args, null, targetFrame);
  },
  broadcastAsyncCommandToChildProcesses : function (command, args)
  {
    this.sendAsyncCommand (command, args, null, null, true);
  },

  cloneState : function ()
  {
    var clonedState = {};
    var moduleEntry;
    for (var moduleName in this._procedures) {
      moduleEntry = {};
      clonedState [moduleName] = moduleEntry;
      for (var commandName in this._procedures [moduleName]) {
        var commandEntry = {};
        for (var propName in this._procedures [moduleName][commandName]) {
          if (propName === "_module") {
            // module object cannot be cloned for message
            continue;
          }
          commandEntry [propName]
            = this._procedures [moduleName][commandName][propName];
        }
        moduleEntry [commandName] = commandEntry;
      }
    }
    return clonedState;
  },

  setState : function (state) {
    this._procedures = state;
  },

  _loadedFiles: [],
  _isAlreadyLoaded : function (path) {
    for (var i = 0; i < this._loadedFiles.length; i ++) {
      if (this._loadedFiles [i] === path) {
        return true;
      }
    }
    return false;
  },
  loadSubScript : function (path) {
    if (path.indexOf ("chrome://akahuku/content/") !== 0) {
      this.console.error ("AkahukuIPC: loadSubScript is for limited path: " + path);
      return;
    }
    if (this._isAlreadyLoaded (path)) {
      this.console.log ("AkahukuIPC: " + path + " is already loaded.");
      return;
    }
    Cc ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Ci.mozIJSSubScriptLoader)
    .loadSubScript (path, this._scope);
    this._loadedFiles.push (path);
  },

  initSubScriptScope : function (scope) {
    if (!this._scope) {
      this._scope = scope || {};
    }
  },

  addFrame : function (frame) {
    // listen remote command for the frame
    frame.addMessageListener (this.messageCallChild, this, false);
  },
  removeFrame : function (frame) {
    frame.removeMessageListener (this.messageCallChild, this, false);
  },


  initAsRoot : function () {
    if (this.initialized) {
      this.console.log ("AkahukuIPC already initialized");
      return;
    }
    this.initialized = true;
    this.isRoot = true;
    this.console = new AkahukuConsole ();

    if (this.inMainProcess) {
      this.console.prefix = "Akahuku root-IPC"
        + (this.subKey ? ":" + this.subKey : "")
        + " (main)";
    }
    else {
      this.console.prefix = "Akahuku root-IPC"
        + (this.subKey ? ":" + this.subKey : "")
        + " (content#" + this.processID + ")";
    }

    // Start linstening for global frame message manager
    var gfmm = Cc ["@mozilla.org/globalmessagemanager;1"]
      .getService (Ci.nsIMessageListenerManager);
    gfmm.addMessageListener (this.messageCall, this, false);
    // Start linstening for global parent process message manager
    var gpmm = Cc ["@mozilla.org/parentprocessmessagemanager;1"]
      .getService (Ci.nsIMessageListenerManager);
    gpmm.addMessageListener (this.messageCall, this, false);
    // message for transfering remote command definitions
    gpmm.addMessageListener (this.messageDefine, this, false);

    // test module
    var test = {
      hello : function () {
        return "Hello !";
      },
      echo : function (str) {
        return str;
      },
    };
    this.defineProc (test, "test", "hello");
    this.defineProc (test, "test", "echo");

    //this.console.log ("AkahukuIPC initialized as root");
  },

  initAsChild : function () {
    if (this.initialized) {
      this.console.log ("AkahukuIPC already initialized");
      return;
    }
    this.initialized = true;
    this.isRoot = false;
    this.console = new AkahukuConsole ();

    if (this.inMainProcess) {
      this.console.prefix = "Akahuku child-IPC"
        + (this.subKey ? ":" + this.subKey : "")
        + " (main)";
    }
    else {
      this.console.prefix = "Akahuku child-IPC"
        + (this.subKey ? ":" + this.subKey : "")
        + " (content#" + this.processID + ")";
    }

    // 新しく追加される情報を反映するためのメッセージを待つ
    var mlm = Cc ['@mozilla.org/childprocessmessagemanager;1']
      .getService (Ci.nsIMessageListenerManager);
    mlm.addMessageListener (this.messageDefine, this, false);
    // broadcast されるremoteコマンドを待つ
    mlm.addMessageListener (this.messageCallChild, this, false);

    // メインプロセスからサービスマップを複製
    try {
      this.setState (
          this.sendSyncCommand ("AkahukuIPC/cloneState"));
    }
    catch (e) {
      this.console.exception (e);
    }

    //this.console.log ("AkahukuIPC initialized as a child");
  },

  term : function () {
    if (!this.initialized) {
      this.console.warn ("AkahukuIPC is not initialized");
      return;
    }
    if (this.terminated) {
      this.console.warn ("AkahukuIPC is already terminated");
      return;
    }
    this.terminated = true;
    if (this.isRoot) {
      var gfmm = Cc ["@mozilla.org/globalmessagemanager;1"]
        .getService (Ci.nsIMessageListenerManager);
      gfmm.removeMessageListener (this.messageCall, this);
      var gpmm = Cc ["@mozilla.org/parentprocessmessagemanager;1"]
        .getService (Ci.nsIMessageListenerManager);
      gpmm.removeMessageListener (this.messageCall, this);
      gpmm.removeMessageListener (this.messageDefine, this);
      //this.console.log ("AkahukuIPC root is terminated.");
    }
    else {
      var mlm = Cc ['@mozilla.org/childprocessmessagemanager;1']
        .getService (Ci.nsIMessageListenerManager);
      mlm.removeMessageListener (this.messageDefine, this);
      mlm.removeMessageListener (this.messageCallChild, this);
      //this.console.log ("AkahukuIPC child is terminated.");
    }
  },

};


var managedList = [];
var AkahukuIPCManager = {
  createRoot : function (key) {
    for (var i = 0; i < managedList.length; i ++) {
      if (managedList [i].key === key) {
        // already created;
        return managedList [i];
      }
    }
    var entry = {key: key, root: null, child: null};
    var ipc = new AkahukuIPC ();
    if (ipc.inMainProcess) {
      entry.root = ipc;
      entry.root.init = entry.root.initAsRoot;
      entry.root.subKey = String (key);
      entry.child = new AkahukuIPC ();
      entry.child.init = entry.child.initAsChild;
      entry.child.subKey = String (key);
    }
    else {
      entry.root = null;
      entry.child = ipc;
      entry.child.init = entry.child.initAsChild;
      entry.child.subKey = String (key);
    }
    managedList.push (entry);
    return entry;
  },

  _getEntry : function (key) {
    for (var i = 0; i < managedList.length; i ++) {
      if (managedList [i].key === key) {
        return managedList [i];
      }
    }
    return null;
  },

  getRoot : function (key) {
    var entry = this._getEntry (key);
    if (entry) {
      return entry.root;
    }
    return null;
  },

  getChild : function (key) {
    var entry = this._getEntry (key);
    if (!entry) {
      entry = this.createRoot (key);
    }
    return entry.child;
  },

  termAll : function () {
    for (var i = 0; i < managedList.length; i ++) {
      managedList [i].child.term ();
      if (managedList [i].root) {
        managedList [i].root.term ();
      }
    }
    managedList.splice (0); // remove all
  },

  /**
   * IPC-base module construction utililty (must be called in the main process first)
   * @param Object props
   *   { root: "main",
   *     parentModule: {method1: function () {}, ...},
   *     parentDefinitions: {method1: {module: "Module", pref: {}}, ...},
   *     childModule: {method1: function () {}, ...},
   *     childDefinitions: {method2: {module: "Module", pref: {}}, ...},
   *   }
   * @return Object new object that has functions from parent/child modules
   */
  createAndRegisterModule : function (props) {
    var target = {};
    var appinfo
      = Cc ["@mozilla.org/xre/app-info;1"]
      .getService (Ci.nsIXULRuntime);
    if (appinfo.processType == appinfo.PROCESS_TYPE_DEFAULT) {
      // Mixin (parent)
      for (var c in props.parentModule) {
        if (Object.prototype.hasOwnProperty.call (props.parentModule, c)) {
          target [c] = props.parentModule [c];
        }
      }

      if ("@mozilla.org/parentprocessmessagemanager;1" in Cc
          && "@mozilla.org/globalmessagemanager;1" in Cc
          && "nsIMessageListenerManager" in Ci
          && "nsIContentFrameMessageManager" in Ci) {
        // e10s-ready env
        var ipc = AkahukuIPCManager.createRoot (props.root);
        ipc.root.init ();

        // define commands
        var provider;
        var pd = props.parentDefinitions;
        for (var c in pd) {
          provider = target;
          if (pd [c].wrapper) {
            provider = {_wrappedObject : target};
            provider [c] = pd [c].wrapper;
          }
          var module = pd [c].module || props.defaultIPCModuleName;
          try {
            ipc.root.defineProc (provider, module, c, pd [c].pref);
          }
          catch (e) {
            Cu.reportError (e);
          }
        }

        // main-process child must be initialized after parent definitions
        ipc.child.init ();
      }
      else {
        // old non-e10s env
        return target;
      }
    }
    else { // child processes (e10s ready)
      var ipc = AkahukuIPCManager.createRoot (props.root);
      ipc.child.init ();

      // Mixin (child)
      for (var c in props.childModule) {
        if (Object.prototype.hasOwnProperty.call (props.childModule, c)) {
          target [c] = props.childModule [c];
        }
      }

      // define commands
      var provider;
      var cd = props.childDefinitions;
      for (var c in cd) {
        provider = target;
        if (cd [c].wrapper) {
          provider = {};
          provider [c] = cd [c].wrapper;
        }
        var module = cd [c].module || props.defaultIPCModuleName;
        try {
          ipc.root.defineProc (provider, module, c, cd [c].pref);
        }
        catch (e) {
          Cu.reportError (e);
        }
      }
    }

    // link to IPC objects
    target.IPC = ipc.child;
    if (ipc.root) {
      target.IPCRoot = ipc.root;
    }
    return target;
  },
};

