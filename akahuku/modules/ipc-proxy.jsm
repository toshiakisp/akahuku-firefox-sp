
/**
 * Akahuku IPC Proxy - プロセス間でのプロパティアクセスを中継するプロキシ
 *
 * Require: Gecko 18 (Proxy)
 */

/* global Components, Proxy, Promise */

var EXPORTED_SYMBOLS = [
  "arIPCProxyParent",
  "arIPCProxyChild",
  "arIPCProxyAsyncChild",
  "arIPCPromisedProxyChild",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;

var {Promise} = Cu.import ("resource://akahuku/promise-polyfill.jsm", {});

/**
 * arIPCProxyParent
 *
 * IPCメッセージに従い target への実操作を行う。
 * target への関数呼び出しの一部をオーバーラップするには
 * arIPCProxyParent インスタンスにその名前の関数を定義する。
 */
function arIPCProxyParent (target) {
  this.target = target;
  this.id = arIPCProxyParent.createId ();
}

arIPCProxyParent.prototype = {
  attachIPCMessageManager : function (mm) {
    var message = "arIPCProxy:" + this.id;
    mm.addMessageListener (message, this, false);
    this.messageManager = mm;
  },
  detachIPCMessageManager : function () {
    if (this.messageManager) {
      var message = "arIPCProxy:" + this.id;
      this.messageManager.removeMessageListener (message, this);
    }
    this.messageManager = null;
    this.target = null;
  },

  receiveMessage : function (message) {
    var data = message.data;
    var ret = {value: null, result: Cr.NS_OK, message: ""};
    try {
      switch (data.type) {
        case "set":
          ret.value = this.target [data.name] = data.value;
          break;
        case "get":
          ret.value = this.target [data.name];
          break;
        case "call":
          var args = unconvArguments (data.value, this.messageManager);
          if (this.hasOwnProperty (data.name)) {
            ret.value = this [data.name].apply (this, args);
          }
          else {
            ret.value = this.target [data.name]
              .apply (this.target, args);
          }
          break;
        case "callAsync":
          var args = unconvArguments (data.value, this.messageManager);
          var sender = new PromiseParentSender (data.callback);
          sender.attachIPCMessageManager (message.target);
          try {
            if (this.hasOwnProperty (data.name)) {
              ret.value = this [data.name].apply (this, args);
            }
            else {
              ret.value = this.target [data.name]
                .apply (this.target, args);
            }
            if (typeof ret.value.then == "function") {
              ret.value.then (function (value) {
                sender.resolve (value);
              }, function (e) {
                sender.reject (e);
              });
            }
            else {
              sender.resolve (ret.value);
            }
          }
          catch (e) {
            sender.reject (e);
          }
          return null;
        case "detach":
          this.detachIPCMessageManager ();
          return null;
      }
    }
    catch (e) {
      // send back a exception as a response message
      ret.result = e.result;
      ret.message = e.message;
    }
    return ret;
  },

};

arIPCProxyParent.idNum = 0;
arIPCProxyParent.createId = function () {
  var id_r_base = "0000";
  var id_r_num
    = Math.floor (Math.random () * Math.pow (2,4*id_r_base.length));
  var id_r_hex
    = (id_r_base + id_r_num.toString (16))
    .slice(-id_r_base.length);
  var id_n_base = "00";
  arIPCProxyParent.idNum ++;
  arIPCProxyParent.idNum %= Math.pow (2, 4*id_n_base.length);
  var id_n_hex
    = (id_n_base + arIPCProxyParent.idNum.toString (16))
    .slice(-id_n_base.length);
  return id_n_hex + id_r_hex;
};



/**
 * arIPCProxyChild 
 *
 * arIPCProxyParentが保持するターゲットに対する操作を
 * IPCメッセージで送信して arIPCProxyParent 側で実行する。
 * IPCメッセージ化する操作は prototype で指定。
 */
function arIPCProxyChild (prototype) {
  var handler = {
    get : function (target, property, receiver) {
      if (arIPCProxyChild.prototype.hasOwnProperty (property)) {
        // 自身のプロトタイプに存在するものはそのままアクセス
        if (target.hasOwnProperty (property)) {
          return target [property];
        }
        else {
          return arIPCProxyChild.prototype [property];
        }
      }
      else if (prototype.hasOwnProperty (property)) {
        // プロトタイプに存在するプロパティはIPCメッセージ化
        var desc = Object.getOwnPropertyDescriptor (target, property);
        if (desc && "function" == typeof desc.value) {
          return target [property]; // cached function
        }
        desc = Object.getOwnPropertyDescriptor (prototype, property);
        if (desc && "function" == typeof desc.value) {
          return target [property] = function () {
            if (!receiver.parentId) {
              throw CE ("arIPCProxyChild: parentId must be given");
            }
            var args = convArgumentsForIPC (arguments, receiver.messageManager);
            var data = {type: "call", name: property, value: args};
            var message = "arIPCProxy:" + receiver.parentId;
            var ret = receiver.messageManager
              .sendSyncMessage (message, data) [0];
            if (ret && ret.result == Cr.NS_OK) {
              return ret.value;
            }
            else if (ret) {
              // throw an exception occured in the parent
              throw CE (ret.message, ret.result, Components.stack.caller.caller);
            }
            else {
              throw CE ("no valid response for IPC:" + property,
                Cr.NS_ERROR_FAILURE, Components.stack.caller.caller);
            }
          };
        }
        else {
          if (!receiver.parentId) {
            throw CE ("arIPCProxyChild: parentId must be given");
          }
          var data = {type: "get", name: property};
          var message = "arIPCProxy:" + receiver.parentId;
          var ret = receiver.messageManager
            .sendSyncMessage (message, data) [0];
          return ret.value;
        }
      }
      return undefined;
    },
    set : function (target, property, value, receiver) {
      if (arIPCProxyChild.prototype.hasOwnProperty (property)) {
        // store in target {}
        target [property] = value;
        return true;
      }
      else if (prototype.hasOwnProperty (property)) {
        var desc = Object.getOwnPropertyDescriptor (prototype, property);
        if (desc && "function" == typeof desc.value) {
          // function overwrite
          target [property] = value;
          return true;
        }
        else {
          var data = {type: "set", name: property, value: value};
          var message = "arIPCProxy:" + receiver.parentId;
          var ret = receiver.messageManager
            .sendSyncMessage (message, data) [0];
          if (ret && ret.result == Cr.NS_OK) {
            return true;
          }
        }
      }
      return false; // strict-mode TypeError
    },
  };
  return new Proxy ({}, handler);
}

arIPCProxyChild.prototype = {
  messageManager : null,
  parentId: null,
  attachIPCMessageManager : function (mm) {
    this.messageManager = mm;
  },
  detachIPCMessageManager : function () {
    var data = {type: "detach", name: "", value: ""};
    var message = "arIPCProxy:" + this.parentId;
    this.messageManager.sendSyncMessage (message, data);
    this.messageManager = null;
    this.parentId = null;
  },
  toString : function () {
    return "[object arIPCProxyChild(" + this.parentId + ")]";
  },
};


/**
 * arIPCProxyAsyncChild
 *   関数呼び出しのみを async な IPC メッセージ化するプロキシ
 *   (chrome process からでも扱える)
 *
 *   + arIPCProxyAsyncChild.prototype 自身のプロパティは set/get 可能
 *   + 指定した prototype 自身のプロパティ:
 *     + 関数の場合: IPC メッセージ化する関数を get 可能
 *     + 関数以外:
 *       + optTarget 指定時: それ自身のプロパティなら get 可能
 *         (元オブジェクトのプロパティを静的にコピーしておける)
 *       + 未指定時: throw TypeError (同期的に取得不能なため)
 *   + その他のプロパティ: undefined
 */
function arIPCProxyAsyncChild (prototype, parentId, optTarget) {
  if (!parentId) {
    throw CE ("arIPCProxyAsyncChild: parentId must be given");
  }
  var target = optTarget || {};
  target.parenetId = parentId;
  var handler = {
    get : function (target, property, receiver) {
      if (Object.prototype.hasOwnProperty.call
          (arIPCProxyAsyncChild.prototype, property)) {
        // 自身のプロトタイプに存在するものはそのままアクセス
        if (Object.prototype.hasOwnProperty.call (target, property)) {
          return target [property];
        }
        return arIPCProxyAsyncChild.prototype [property];
      }
      else if (Object.prototype
          .hasOwnProperty.call (prototype, property)) {
        // 指定されたプロトタイプに存在するプロパティ
        var desc = Object.getOwnPropertyDescriptor (prototype, property);
        if (desc && "function" == typeof desc.value) {
          // target の同名関数を優先 (cached)
          desc = Object.getOwnPropertyDescriptor (target, property);
          if (desc && "function" == typeof desc.value) {
            return target [property];
          }
          // IPCメッセージ化(async)
          return target [property] = function () {
            var args = convArgumentsForIPC (arguments, receiver.messageManager);
            var data = {type: "call", name: property, value: args};
            var message = "arIPCProxy:" + parentId;
            receiver.messageManager.sendAsyncMessage (message, data);
          };
        }
        else if (Object.prototype.hasOwnProperty.call (target, property)) {
          // 関数ではないプロパティなら target を参照
          return target [property];
        }
        else {
          throw TypeError
            ("arIPCProxyAsyncChild: invalid property '" + property + "'");
        }
      }
      return undefined;
    },
    set : function (target, property, value, receiver) {
      if (arIPCProxyAsyncChild.prototype.hasOwnProperty (property)) {
        target [property] = value;
        return true;
      }
      return false; // strict-mode TypeError
    },
  };
  return new Proxy (target, handler);
}

arIPCProxyAsyncChild.prototype = {
  messageManager : null,
  parentId: null,
  attachIPCMessageManager : function (mm) {
    this.messageManager = mm;
  },
  detachIPCMessageManager : function () {
    var data = {type: "detach", name: "", value: ""};
    var message = "arIPCProxy:" + this.parentId;
    this.messageManager.sendAsyncMessage (message, data);
    this.messageManager = null;
    this.parentId = null;
  },
};


/**
 * コールバック関数用 Proxy (手動で detach が必要)
 */
function CallbackFunctionParent (callback) {
  return new arIPCProxyParent (callback);
}

function CallbackFunctionChild (id) {
  var target = function () {}; // typeof proxy == "function"
  return new arIPCProxyAsyncChild (Function.prototype, id, target);
}


/**
 * 関数の引数を IPC で転送可能な形式に変換
 */
function convArgumentsForIPC (args, mm) {
  var result = [];
  if (args) {
    for (var i = 0; i < args.length; i ++) {
      result.push (wrapToTransfer (args [i], mm));
    }
  }
  return result;
}
function wrapToTransfer (value, mm) {
  if (typeof value === "function") {
    // コールバック関数と仮定し
    // IPCでコールバックを待ち受ける状態にして転送
    var func = new CallbackFunctionParent (value);
    func.attachIPCMessageManager (mm);
    return {value: func.id, type: "function"};
  }

  if (typeof value !== "object" || value === null) {
    // object ではないプリミティブと null はそのまま
    return value;
  }

  // "object"
  return {value: value, type: "object"};
}

/**
 * IPC で転送された引数を対応する値に戻す
 */
function unconvArguments (values, mm) {
  var result = [];
  for (var i = 0; i < values.length; i ++) {
    result.push (unwrapTransfered (values [i], mm));
  }
  return result;
}
function unwrapTransfered (value, mm) {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // object or function in {value: obj, type: ""}
  if (value.type === "function") {
    var func = new CallbackFunctionChild (value.value);
    func.attachIPCMessageManager (mm);
    return func;
  }
  return value.value;
}


/**
 * arIPCPromisedProxyChild
 *   関数呼び出しを Promise を返しつつ async な IPC メッセージ化する
 *   (chrome process からでも扱える)
 *
 *   + arIPCPromisedProxyChild.prototype 自身のプロパティは set/get 可能
 *   + 指定した prototype 自身のプロパティ:
 *     + 関数の場合: IPC メッセージ化する関数を get 可能
 *     + 関数以外:
 *       + optTarget 指定時: それ自身のプロパティなら get 可能
 *         (元オブジェクトのプロパティを静的にコピーしておける)
 *       + 未指定時: throw TypeError (同期的に取得不能なため)
 *   + その他のプロパティ: undefined
 */
function arIPCPromisedProxyChild (prototype, parentId, optTarget) {
  if (!parentId) {
    throw CE ("arIPCPromisedProxyChild: parentId must be given");
  }
  var target = optTarget || {};
  target.parenetId = parentId;
  var handler = {
    get : function (target, property, receiver) {
      if (Object.prototype.hasOwnProperty.call
          (arIPCPromisedProxyChild.prototype, property)) {
        // 自身のプロトタイプに存在するものはそのままアクセス
        if (Object.prototype.hasOwnProperty.call (target, property)) {
          return target [property];
        }
        return arIPCPromisedProxyChild.prototype [property];
      }
      else if (Object.prototype
          .hasOwnProperty.call (prototype, property)) {
        // 指定されたプロトタイプに存在するプロパティ
        var desc = Object.getOwnPropertyDescriptor (prototype, property);
        if (desc && "function" == typeof desc.value) {
          // target の同名関数を優先 (cached)
          desc = Object.getOwnPropertyDescriptor (target, property);
          if (desc && "function" == typeof desc.value) {
            return target [property];
          }
          // IPCメッセージ化(async)
          return target [property] = function () {
            var args = arguments;
            return new Promise (function (resolve, reject) {
              args = convArgumentsForIPC (args, receiver.messageManager);
              var listener = new PromiseChildListener (resolve, reject);
              listener.attachIPCMessageManager (receiver.messageManager);
              var data = {type: "callAsync",
                name: property, value: args, callback: listener.id};
              var message = "arIPCProxy:" + parentId;
              receiver.messageManager.sendAsyncMessage (message, data);
            });
          };
        }
        else if (Object.prototype.hasOwnProperty.call (target, property)) {
          // 関数ではないプロパティなら target を参照
          return target [property];
        }
        else {
          throw TypeError
            ("arIPCPromisedProxyChild: invalid property '" + property + "'");
        }
      }
      return undefined;
    },
    set : function (target, property, value, receiver) {
      if (arIPCPromisedProxyChild.prototype.hasOwnProperty (property)) {
        target [property] = value;
        return true;
      }
      return false; // strict-mode TypeError
    },
  };
  return new Proxy (target, handler);
}

arIPCPromisedProxyChild.prototype = {
  messageManager : null,
  parentId: null,
  attachIPCMessageManager : function (mm) {
    this.messageManager = mm;
  },
  detachIPCMessageManager : function () {
    var data = {type: "detach", name: "", value: ""};
    var message = "arIPCProxy:" + this.parentId;
    this.messageManager.sendAsyncMessage (message, data);
    this.messageManager = null;
    this.parentId = null;
  },
};

/**
 * Promise の結果をIPC経由で待ちコールバックする
 */
function PromiseChildListener (resolve, reject) {
  this.resolve = resolve;
  this.reject = reject;
  this.id = arIPCProxyParent.createId ();
  this.messageManager = null;
};
PromiseChildListener.prototype = {
  MESSAGE_PREFIX : "arIPCProxyChild",
  attachIPCMessageManager : function (mm) {
    var message = this.MESSAGE_PREFIX + ":" + this.id;
    mm.addMessageListener (message, this, false);
    this.messageManager = mm;
  },
  detachIPCMessageManager : function () {
    if (this.messageManager) {
      var message = this.MESSAGE_PREFIX + ":" + this.id;
      this.messageManager.removeMessageListener (message, this);
    }
    this.messageManager = null;
    this.resolve = null;
    this.reject = null;
  },

  receiveMessage : function (message) {
    var data = message.data;
    try {
      if (data.type == "resolve") {
        try {
          var value = unwrapTransfered (data.value, this.messageManager);
          this.resolve.call (null, value);
        }
        catch (e) {
          this.reject.call (null, e);
        }
      }
      else { // "reject"
        var reason = unwrapTransfered (data.value, this.messageManager);
        this.reject.call (null, reason);
      }
    }
    finally {
      this.detachIPCMessageManager ();
    }
  },
};

/**
 * Promise のIPCコールバックを送信する
 */
function PromiseParentSender (id) {
  this.callbackId = id;
  this.messageManager = null;
  this.callbacked = false;
}
PromiseParentSender.prototype = {
  MESSAGE_PREFIX : "arIPCProxyChild",
  attachIPCMessageManager : function (mm) {
    this.messageManager = mm;
    if (typeof mm.sendAsyncMessage !== "function"
        && typeof mm.broadcastAsyncMessage !== "function") {
      throw new TypeError ("invalid message manager: " + mm);
    }
  },
  detachIPCMessageManager : function () {
    if (!this.callbacked) {
      this.callbacked = true;
      var data = {type: "detach", value: {name: "AbortError"}};
      var message = this.MESSAGE_PREFIX + ":" + this.callbackId;
      if (typeof this.messageManager.sendAsyncMessage == "function") {
        this.messageManager.sendAsyncMessage (message, data);
      }
      else {
        this.messageManager.broadcastAsyncMessage (message, data);
      }
    }
    this.messageManager = null;
    this.callbackId = null;
  },

  _callback : function (type, value) {
    value = wrapToTransfer (value, this.messageManager);
    var data = {type: type, value: value};
    var message = this.MESSAGE_PREFIX + ":" + this.callbackId;
    if (typeof this.messageManager.sendAsyncMessage == "function") {
      this.messageManager.sendAsyncMessage (message, data);
    }
    else {
      this.messageManager.broadcastAsyncMessage (message, data);
    }
    this.callbacked = true;
    this.detachIPCMessageManager ();
  },
  resolve : function (value) {
    this._callback ("resolve", value);
  },
  reject : function (reason) {
    this._callback ("reject", reason);
  },
};

