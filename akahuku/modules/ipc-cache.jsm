
/**
 * Akahuku IPC support for nsICacheEntry
 */

/* global Components */

var EXPORTED_SYMBOLS = [
  "arCacheEntryParent",
  "arCacheEntryChild",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;

var {arIPCProxyParent, arIPCProxyChild}
= Cu.import ("resource://akahuku/ipc-proxy.jsm", {});
var {arInputStreamParent, arInputStreamChild,
  arOutputStreamParent, arOutputStreamChild}
= Cu.import ("resource://akahuku/ipc-stream.jsm", {});


/**
 * arCacheEntryParent
 *
 * nsICacheEntry entry への操作をIPC経由で受け付ける
 */
function arCacheEntryParent (entry) {
  this.ipc = new arIPCProxyParent (entry);

  // override methods
  var self = this;
  this.ipc.openInputStream = function (offset) {
    var istream = self.ipc.target.openInputStream (offset);
    var istreamP = new arInputStreamParent (istream);
    istreamP.attachIPCMessageManager (self.ipc.messageManager);
    return istreamP.createIPCTransferable ();
  };
  this.ipc.openOutputStream = function (offset) {
    var ostream = self.ipc.target.openOutputStream (offset);
    var ostreamP = new arOutputStreamParent (ostream);
    ostreamP.attachIPCMessageManager (self.ipc.messageManager);
    return ostreamP.createIPCTransferable ();
  };
  this.ipc.close = function () {
    self.ipc.target.close ();
    self.detachIPCMessageManager ();
  };
}

arCacheEntryParent.prototype = {
  IPC_TRANSFERABLE_TYPE : "arCacheEntry",

  createIPCTransferable : function () {
    var entry = this.ipc.target;
    var obj = {
      _type: this.IPC_TRANSFERABLE_TYPE,
      _id: this.ipc.id,
      key: entry.key,
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
 * arCacheEntryChild
 *
 * nsICacheEntry として振る舞い、
 * 操作をIPC経由で対応する arCacheEntryParent へ転送する
 */
function arCacheEntryChild (entryT) {
  if (entryT._type != arCacheEntryChild.prototype.IPC_TRANSFERABLE_TYPE) {
    throw CE ("argument type is not matched: " + entryT._type,
        Cr.NS_ERROR_ILLEGAL_VALUE, Components.stack.caller);
  }
  this.ipc = new arIPCProxyChild (arCacheEntryChild.prototype);
  this.ipc.parentId = entryT._id;
  this.id = entryT._id;

  // static properties
  this.mKey = entryT.key;
}

arCacheEntryChild.prototype = {
  IPC_TRANSFERABLE_TYPE : "arCacheEntry",
  attachIPCMessageManager : function (mm) {
    this.ipc.attachIPCMessageManager (mm);
  },
  detachIPCMessageManager : function () {
    this.ipc.detachIPCMessageManager ();
    this.ipc = null;
  },
  toString : function () {
    return "[object arCacheEntryChild]";
  },

  // nsICacheEntry

  NO_EXPIRATION_TIME: 0xFFFFFFFF,

  get key () {return this.mKey},
  get persistent () {return this.ipc.persistent},
  get fetchCount () {return this.ipc.fetchCount},
  get lastFetched () {return this.ipc.lastFetched},
  get lastModified () {return this.ipc.lastModified},
  get expirationTime () {return this.ipc.expirationTime},

  setExpirationTime : function (expirationTime) {
    this.ipc.setExpirationTime (expirationTime);
  },

  forceValidFor : function (aSecondsToTheFuture) {
    this.ipc.forceValidFor (aSecondsToTheFuture);
  },

  get isForcedValid () {return this.ipc.isForcedValid},

  openInputStream : function (offset) {
    var istream = this.ipc.openInputStream (offset);
    if (istream) {
      var istreamC = new arInputStreamChild (istream);
      istreamC.attachIPCMessageManager (this.ipc.messageManager);
      istream = istreamC.inputStream;
    }
    return istream;
  },

  openOutputStream : function (offset) {
    var ostream = this.ipc.openOutputStream (offset);
    if (ostream) {
      ostream = new arOutputStreamChild (ostream);
      ostream.attachIPCMessageManager (this.ipc.messageManager);
    }
    return ostream;
  },

  get predictedDataSize () {return this.ipc.predictedDataSize},
  set predictedDataSize (value) {
    this.ipc.predictedDataSize = value;
  },

  securityInfo : null, // nsISupports

  get storageDataSize () {return this.ipc.storageDataSize},

  asyncDoom : function (listener) {
    // nsICacheEntryDoomCallback listener
    throw CE ("Not implemented for IPC");//FIXME
    this.ipc.asyncDoom (listener);
  },

  getMetaDataElement : function (key) {
    return this.ipc.getMetaDataElement (key);
  },

  setMetaDataElement : function (key, value) {
    this.ipc.setMetaDataElement (key, value);
  },

  visitMetaData : function (visitor) {
    // nsICacheEntryMetaDataVisitor visitor
    throw CE ("Not implemented yet for IPC",
        Cr.NS_ERROR_NOT_IMPLEMENTED, Components.stack.caller);
    this.ipc.visitMetaData (visitor);
  },

  metaDataReady : function () {
    this.ipc.metaDataReady ();
  },

  setValid : function () {
    this.ipc.setValid ();
  },

  recreate : function (aMemoryOnly) {
    throw CE ("Not implemented yet for IPC",
        Cr.NS_ERROR_NOT_IMPLEMENTED, Components.stack.caller);
    return null; // nsICacheEntry
  },

  get dataSize () {return this.ipc.dataSize},

  // @deprecated 
  close : function () {
    this.ipc.close ();
    this.detachIPCMessageManager ();
  },
  markValid : function () {
    this.ipc.markValid ();
  },
  maybeMarkValid : function () {
    this.ipc.maybeMarkValid ();
  },
  hasWriteAccess : function (aWriteAllowed) {
    return this.ipc.hasWriteAccess (aWriteAllowed);
  },

};


