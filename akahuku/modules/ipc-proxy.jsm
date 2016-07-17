
/**
 * Akahuku IPC Proxy - プロセス間でのプロパティアクセスを中継するプロキシ
 *
 * Require: Gecko 18 (Proxy)
 * Globals: Components, Proxy
 */

var EXPORTED_SYMBOLS = [
  "arIPCProxyParent",
  "arIPCProxyChild",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;


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
          if (this.hasOwnProperty (data.name)) {
            ret.value = this [data.name].apply (this, data.value);
          }
          else {
            ret.value = this.target [data.name]
              .apply (this.target, data.value);
          }
          break;
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
            var args = [];
            if (arguments) {
              args = (arguments.length == 1
                  ? [arguments [0]]
                  : Array.apply (null, arguments));
            }
            if (!receiver.parentId) {
              throw CE ("arIPCProxyChild: parentId must be given");
            }
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
      }
      else if (prototype.hasOwnProperty (property)) {
        var desc = Object.getOwnPropertyDescriptor (prototype, property);
        if (desc && "function" == typeof desc.value) {
          // function overwrite
          target [property] = value;
        }
        else {
          var data = {type: "set", name: property, value: value};
          var message = "arIPCProxy:" + receiver.parentId;
          var ret = receiver.messageManager
            .sendSyncMessage (message, data) [0];
          return ret.value;
        }
      }
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


