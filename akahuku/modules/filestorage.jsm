/**
 * Abstract wrapper with Promised API for filesystem
 */

/* global Components, Symbol */

"use strict";

this.EXPORTED_SYMBOLS = [
  "AkahukuFS",
  "AkahukuFSUtil",
];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const CE = Components.Exception;

var {Promise} = Cu.import ("resource://akahuku/promise-polyfill.jsm", {});

const {AkahukuFileUtil}
= Cu.import ("resource://akahuku/fileutil.jsm", {});
var {arIPCProxyParent, arIPCPromisedProxyChild}
= Cu.import ("resource://akahuku/ipc-proxy.jsm", {});


function createNsIFile (path) {
  var file = Cc ["@mozilla.org/file/local;1"]
  .createInstance (Ci.nsILocalFile || Ci.nsIFile);
  file.initWithPath (path);
  return file;
}

var IO_FLAGS = {
  RDONLY: 0x01,
  WRONLY: 0x02,
  RDWR: 0x04,
  CREATE_FILE: 0x08,
  APPEND: 0x10,
  TRUNCATE: 0x20,
  SYNC: 0x40,
  EXCL: 0x80,
};

/**
 * PromisedFile
 * pathを保持する程度の中間オブジェクト
 */
function PromisedFile (path, optFile, optType) {
  this._path = path;
  this._file = optFile; // for cache
  this._type = optType;
}
PromisedFile.prototype = {
  /**
   * DOM Fileを取得する
   * @return Promise<File>
   */
  getFile : function () {
    var that = this;
    return new Promise (function (resolve, reject) {
      if (that._file) {
        resolve (that._file);
      }
      AkahukuFileUtil.createFromFileName (that._path)
      .then (function (file) {
        that._file = file;
        resolve (file);
      }, function (err) {
        reject (err);
      });
    });
  },

  /**
   * PromisedFileHandle を得る
   * @param mode String
   * @return PromisedFileHandle
   */
  open : function (mode) {
    switch (mode) {
      case "readonly":
      case "readwrite":
      case "writeonly":
        break;
      default:
        throw new Error ("Unsupported mode: " + mode);
    }
    return FileHandleFactory.create (this, mode);
  },
};


/*
 * ファイルシステムのディレクトリをストレージに見立てたもの
 */
function DirFileStorage (path) {
  this.path = path;
}
DirFileStorage.prototype = {
  path : null,

  /**
   * Get a Promise to be a File for non-existing object
   * @param name String
   * @param type String
   * @return Promise<PromisedFile>
   */
  createPromisedFile : function (name, type) {
    var that = this;
    return new Promise (function (resolve, reject) {
      var path = AkahukuFileUtil.Path.join (that.path, name);
      AkahukuFileUtil.createFromFileName (path)
      .then (function (file) {
        reject (new Error ("File already exists; " + path));
      }, function (err) {
        resolve (new PromisedFile (path, null, type));
      });
    });
  },

  /**
   * Get a Promise to be a File for existing object
   * @param name String
   * @return Promise<PromisedFile>
   */
  getPromisedFile : function (name) {
    var that = this;
    return new Promise (function (resolve, reject) {
      var path = AkahukuFileUtil.Path.join (that.path, name);
      AkahukuFileUtil.createFromFileName (path)
      .then (function (file) {
        resolve (new PromisedFile (path, file, ""));
      }, function (err) {
        reject (err);
      });
    });
  },

  /**
   * Get a Promise to be a File for existing object
   * @param name string
   * @return Promise<File>
   */
  get : function (name) {
    var that = this;
    return new Promise (function (resolve, reject) {
      var path = AkahukuFileUtil.Path.join (that.path, name);
      AkahukuFileUtil.createFromFileName (path)
      .then (function (file) {
        resolve (file);
      }, function (err) {
        reject (err);
      });
    });
  },

  list : function (options) {
    return new Promise (function (resolve, reject) {
      var result = [];
      // list names of files in storage (with filtering options), then
      //resolve (result);
      reject (new Error ("NotYetImplementedError"));
    });
  },

  put : function (name, file) {
    return new Promise (function (resolve, reject) {
      // async save (overwrite) a file to storage, then
      //resolve ();
      reject (new Error ("NotYetImplementedError"));
    });
  },

  /**
   * Remove a file
   * @param name string
   * @return Promise
   */
  remove : function (name) {
    var that = this;
    return new Promise (function (resolve, reject) {
      var path = AkahukuFileUtil.Path.join (that.path, name);
      try {
        var file = createNsIFile (path);
        file.remove (true);
        resolve ();
      }
      catch (e) {
        reject (e);
      }
    });
  },

  /**
   * move a file (directory-specific shorthand for get/put/remove)
   * @param oldName old leaf name
   * @param newName new leaf name
   */
  move : function (oldName, newName) {
    var that = this;
    return new Promise (function (resolve, reject) {
      var oldPath = AkahukuFileUtil.Path.join (that.path, oldName);
      try {
        var file = createNsIFile (oldPath);
        file.moveTo (null, newName);
        resolve ();
      }
      catch (e) {
        reject (e);
      }
    });
  },
};


/**
 * DirUtil module (e10s ready)
 */

var DirUtilP = {};
var DirUtilPDef = {};
var DirUtilC = {};

/**
 * DirUtil.createDirFileStorage
 * @param path String
 * @return Promise<DirFileStorage>
 */
DirUtilP.createDirFileStorage = function (path) {
  return new Promise (function (resolve, reject) {
    try {
      var dir = createNsIFile (path);
      if (!dir.exists ()) {
        dir.create (0x01, 493/*0o755*/);
      }
      resolve (new DirFileStorage (path));
    }
    catch (e) {
      reject (e);
    }
  });
};
DirUtilPDef.createDirFileStorage = {
  pref: {async: true, promise: true},
  wrapper: function (path) {
    var ipc = this._wrappedObject.IPCRoot;
    return new Promise (function (resolve, reject) {
      DirUtilP.createDirFileStorage (path)
      .then (function (storage) {
        var proxy = new arIPCProxyParent (storage);
        var mm = ipc.getProcessMessageListenerManager ();
        proxy.attachIPCMessageManager (mm);
        resolve (proxy.id);
      }, function (error) {
        reject (error);
      });
    });
  },
};
DirUtilC.createDirFileStorage = function (path) {
  var that = this;
  return new Promise (function (resolve, reject) {
    that.IPC.sendAsyncCommand ("DirUtil/createDirFileStorage", [path])
    .then (function (ipcId) {
      var storageLocal = { // non-proxied props
        path : path,
        createPromisedFile : DirFileStorage.prototype.createPromisedFile,
        getPromisedFile : DirFileStorage.prototype.getPromisedFile,
      };
      var storageC = new arIPCPromisedProxyChild (DirFileStorage.prototype, ipcId, storageLocal);
      var mm = that.IPC.getChildProcessMessageManager ();
      storageC.attachIPCMessageManager (mm);
      resolve (storageC);
    }, function (err) {
      reject (err);
    });
  });
};

const {AkahukuIPCManager} = Cu.import ("resource://akahuku/ipc.jsm", {});
var DirUtil = AkahukuIPCManager.createAndRegisterModule ({
  root: "FileStorage",
  defaultIPCModuleName: "DirUtil",
  parentModule: DirUtilP,
  parentDefinitions: DirUtilPDef,
  childModule: DirUtilC,
  childDefinitions: {}, // no child-process listener
});


/*
 * PromisedFileHandle
 * ファイルストリーム等への操作(特に書き込み)の抽象化
 * @param promisedFile PromisedFile|Promise<PromisedFileHandle>
 * @param mode String
 */
function PromisedFileHandle (promisedFile, mode) {
  this._pfile = promisedFile;
  this.mode = mode;
  this._stream = null;
  this._remote = null;

  if (typeof promisedFile.then == "function") {
    // remote PromisedFileHandle proxy mode
    this._remote = promisedFile;
  }
  else {
    this._openStream ();
  }
}
PromisedFileHandle.prototype = {
  mode : null,

  getMetadata : function () {
    if (this._remote) {
      return this._remote.then (function (pfh) {
        return pfh.getMetadata ();
      });
    }
    return this._pfile.getFile ()
    .then (function (file) {
      return {
        size: file.fileSize || file.size,
        lastModified: new Date (file.lastModified)
      };
    });
  },

  close : function () {
    if (this._remote) {
      return this._remote.then (function (pfh) {
        return pfh.close ();
      });
    }
    var that = this;
    return new Promise (function (resolve, reject) {
      that._stream.close ();
      resolve ()
    });
  },

  // for writeonly, readwrite mode

  write : function (data, pos) {
    if (this._remote) {
      return this._remote.then (function (pfh) {
        return pfh.write (data, pos);
      });
    }
    var that = this;
    return new Promise (function (resolve, reject) {
      if (typeof pos !== "undefined") {
        var cur = that._stream.tell ();
        if (pos != cur) {
          that._stream.seek (0, pos);
        }
      }
      else {
        pos = 0;
      }
      that.append (data)
      .then (function () {
        var cur = that._stream.tell ();
        resolve (cur);
      }, function (err) {
        reject (err);
      });
    });
  },

  append : function (data) {
    if (this._remote) {
      return this._remote.then (function (pfh) {
        return pfh.append (data);
      });
    }
    var that = this;
    return new Promise (function (resolve, reject) {
      var istream
        = Cc ["@mozilla.org/io/string-input-stream;1"]
        .createInstance (Ci.nsIStringInputStream);
      istream.setData (data, data.length);
      var copier
        = Cc ["@mozilla.org/network/async-stream-copier;1"]
        .createInstance (Ci.nsIAsyncStreamCopier);
      copier.init (istream, that._stream, null,
        true, false, 0, true, false);
      var observer = {
        onStartRequest: function (r, c) {},
        onStopRequest: function (r, c, statusCode) {
          if (Components.isSuccessCode (statusCode)) {
            resolve ();
          }
          else {
            reject (new CE ("Async data write failed", statusCode));
          }
        }
      }
      copier.asyncCopy (observer, null);
    });
  },

  truncate : function (pos) {
    if (this._remote) {
      return this._remote.then (function (pfh) {
        return pfh.truncate (pos);
      });
    }
    var that = this;
    return new Promise (function (resolve, reject) {
      pos = pos || 0;
      var cur = that._stream.tell ();
      if (pos != cur) {
        that._stream.seek (0, pos);
      }
      that._stream.setEOF ();
      resolve ();
    });
  },

  // for readonly or readwrite mode

  readAsText : function (size, pos) {
    if (this._remote) {
      return this._remote.then (function (pfh) {
        return pfh.readAsText (size, pos);
      });
    }
    var that = this;
    return new Promise (function (resolve, reject) {
      pos = pos || -1; // -1 means read from the current position

      var segSizeBit = 12; // 12 means 2^12=4096 bytes for segment size
      var segCount = (size > 0 ? (size>>segSizeBit)+1 : 0xffffffff);
      var pipe
        = Cc ["@mozilla.org/pipe;1"]
        .createInstance (Ci.nsIPipe);
      pipe.init (true, true, 1<<segSizeBit, segCount, null);

      var byteRead = (size > 0 ? size : -1);
      var pump
        = Cc ["@mozilla.org/network/input-stream-pump;1"]
        .createInstance (Ci.nsIInputStreamPump);
      pump.init (that._stream, pos, byteRead, 0, 0, false);
      var listener = {
        onDataAvailable : function (r, c, istream, offset, count) {
          var writeCount = pipe.outputStream.writeFrom (istream, count);
          if (writeCount == 0) {
            throw new CE ("No data written", Cr.NS_BASE_STREAM_CLOSED);
          }
        },
        onStartRequest : function (r, c) {},
        onStopRequest : function (r, c, statusCode) {
          pipe.outputStream.close ();
          if (Components.isSuccessCode (statusCode)) {
            var bistream = Cc ["@mozilla.org/binaryinputstream;1"]
              .createInstance (Ci.nsIBinaryInputStream);
            bistream.setInputStream (pipe.inputStream);
            var data = bistream.readBytes (bistream.available ());
            bistream.close ();
            resolve (data);
          }
          else {
            reject (new CE ("Async data read failed", statusCode));
          }
        },
      };
      pump.asyncRead (listener, null);
    });
  },

  //readAsArrayBuffer
  // ArrayBuffer requires Fx4.0+

  _openStream : function () {
    if (this._remote) {
      throw new Error ("This must not be happen");
    }
    var ioFlags = 0;
    var permissions = 420; // 0o644
    switch (this.mode) {
      case "readonly":
        ioFlags |= IO_FLAGS.RDONLY;
        permissions = 0; // no creation
        break;
      case "readwrite":
        ioFlags |= IO_FLAGS.RDWR;
        ioFlags |= IO_FLAGS.CREATE_FILE;
        break;
      case "writeonly":
        ioFlags |= IO_FLAGS.WRONLY;
        ioFlags |= IO_FLAGS.CREATE_FILE;
        break;
      default:
        throw new Error ("Unsupported mode: " + this.mode);
    }

    switch (this.mode) {
      case "readonly":
        this._stream
          = Cc ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (Ci.nsIFileInputStream);
        break;
      case "readwrite":
        throw new Error ("'readwrite' mode is not supported yet");
      case "writeonly":
        this._stream
          = Cc ["@mozilla.org/network/file-output-stream;1"]
          .createInstance (Ci.nsIFileOutputStream);
        break;
    }

    var nsifile = createNsIFile (this._pfile._path);
    this._stream.init (nsifile, ioFlags, permissions, 0);

    // ensure nsISeekableStream
    try {
      this._stream.QueryInterface (Ci.nsISeekableStream);
    }
    catch (e) {
      this._stream.close ();
      this._stream = null;
      throw e;
    }
  },
};

/**
 * FileHandleFactory module (e10s ready)
 */

var FileHandleFactoryP = {};
var FileHandleFactoryPDef = {};
var FileHandleFactoryC = {};

/**
 * FileHandleFactory.create
 * @param pfile PromisedFile
 * @param mode String
 * @return PromisedFileHandle
 */
FileHandleFactoryP.create = function (pfile, mode) {
  return new PromisedFileHandle (pfile, mode);
};
FileHandleFactoryPDef.create = {
  pref: {async: true, promise: true},
  wrapper: function (path, type, mode) {
    var ipc = this._wrappedObject.IPCRoot;
    return new Promise (function (resolve, reject) {
      var pfile = new PromisedFile (path, null, type);
      var fh = new PromisedFileHandle (pfile, mode);
      var proxy = new arIPCProxyParent (fh);
      var mm = ipc.getProcessMessageListenerManager ();
      proxy.attachIPCMessageManager (mm);
      resolve (proxy.id);
    });
  },
};
FileHandleFactoryC.create = function (pfile, mode) {
  var that = this;
  var promise = new Promise (function (resolve, reject) {
    that.IPC.sendAsyncCommand
    ("FileHandleFactory/create", [pfile._path, pfile._type, mode])
    .then (function (ipcId) {
      var fhC = new arIPCPromisedProxyChild (PromisedFileHandle.prototype, ipcId);
      var mm = that.IPC.getChildProcessMessageManager ();
      fhC.attachIPCMessageManager (mm);
      resolve (fhC);
    }, function (err) {
      reject (err);
    });
  });
  return new PromisedFileHandle (promise, mode);
};

var FileHandleFactory = AkahukuIPCManager.createAndRegisterModule ({
  root: "FileStorage",
  defaultIPCModuleName: "FileHandleFactory",
  parentModule: FileHandleFactoryP,
  parentDefinitions: FileHandleFactoryPDef,
  childModule: FileHandleFactoryC,
  childDefinitions: {}, // no child-process listener
});


/*
 * toString object tag for internal objects
 */
if (typeof Symbol !== "undefined" &&
    typeof Symbol.toStringTag !== "undefined") {
  // require Firefox 51.0+
  PromisedFile.prototype [Symbol.toStringTag] = "PromisedFile";
  PromisedFileHandle.prototype [Symbol.toStringTag] = "PromisedFileHandle";
  DirFileStorage.prototype [Symbol.toStringTag] = "DirFileStorage";
}

/*
 * Exported module
 */

var AkahukuFS = {};
AkahukuFS.getFileStorage = function (param) {
  return new Promise (function (resolve, reject) {
    var name = (param ? param.name : null);
    if (name) {
      DirUtil.createDirFileStorage (name)
      .then (function (storage) {
        resolve (storage);
      }, function (err) {
        reject (err);
      });
    }
    else {
      reject ({name: "InvalidAccessError"});
    }
  });
};

AkahukuFS.Path = AkahukuFileUtil.Path;


/*
 * Utility functions for basic uses
 */
var AkahukuFSUtil = {};
/**
 * AkahukuFSUtil.saveStringToNativeFile
 * データをファイルに上書き保存する
 * @param path String ネイティブパス
 * @param data String 保存する内容
 * @param optType String [optinal] MIMEタイプ
 * @return Promise 保存終了時にfullfiledされる
 */
AkahukuFSUtil.saveStringToNativeFile = function (path, data, optType) {
  optType = optType || "plain/text";
  return new Promise (function (resolve, reject) {
    var leafName = AkahukuFileUtil.Path.basename (path);
    var dirName = AkahukuFileUtil.Path.dirname (path);
    AkahukuFS.getFileStorage ({name: dirName})
    .then (function (storage) {
      return storage.getPromisedFile (leafName)
      .then (function (pfile) {
        return pfile;
      }, function () {
        return storage.createPromisedFile (leafName, optType);
      });
    }).then (function (pfile) {
      var fh = pfile.open ("writeonly");
      return fh.truncate (0)
      .then (function () {
        return fh.append (data);
      }).catch (function (e) {
        fh.close ();
        throw e;
      }).then (function () {
        return fh.close ();
      });
    }).then (function () {
      // successfully finished (writen&closed)
      resolve ();
    }).catch (function (e) {
      // any error in promise chain
      reject (e);
    });
  });
};

/**
 * AkahukuFSUtil.loadNativeFileAsString
 * データをファイルから String へ読む
 * @param path String ネイティブパス
 * @return Promise<String> 読みこんだデータ
 */
AkahukuFSUtil.loadNativeFileAsString = function (path) {
  return new Promise (function (resolve, reject) {
    var leafName = AkahukuFileUtil.Path.basename (path);
    var dirName = AkahukuFileUtil.Path.dirname (path);
    AkahukuFS.getFileStorage ({name: dirName})
    .then (function (storage) {
      return storage.getPromisedFile (leafName);
    }).then (function (pfile) {
      var fh = pfile.open ("readonly");
      return fh.readAsText (-1, 0)
      .then (function (data) {
        fh.close ();
        return data;
      }).catch (function (e) {
        fh.close ();
        throw e;
      });
    }).then (function (data) {
      resolve (data);
    }).catch (function (e) {
      // any error in promise chain
      reject (e);
    });
  });
};

