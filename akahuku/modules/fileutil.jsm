/**
 * Utilities for privilege DOM File operations
 */
/* global Components, Promise, File */

var EXPORTED_SYMBOLS = [
  "AkahukuFileUtil",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var FileUtilP = {
  File : null,
  Promise : null,

  _prepareFile : function () {
    if (this.File) {
      return;
    }
    if (typeof Cu.importGlobalProperties !== "undefined") {
      // Firefox 27.0+
      try {
        // "File" is available for Firefox 35.0+
        // 27-35 causes "Unknown property name: File"
        Cu.importGlobalProperties (["File"]);
        if (typeof File !== "undefined") {
          this.File = File;
        }
      }
      catch (e) {
        Cu.reportError (e);
      }
    }
    if (!this.File) { // -34.*
      var scope = {};
      try {
        // requires Firefox 4.0+
        Cu.import ("resource://gre/modules/Services.jsm", scope);
        if (typeof scope.File !== "undefined") {
          this.File = scope.File;
          return;
        }
      }
      catch (e) {
        if (e.result !== Components.results.NS_ERROR_FILE_NOT_FOUND) {
          Cu.reportError (e);
        }
      }
      var hiddenDOMWindow
        = Cc ["@mozilla.org/appshell/appShellService;1"]
        .getService (Ci.nsIAppShellService)
        .hiddenDOMWindow;
      this.File = hiddenDOMWindow.File;
      if (typeof this.File !== "function") {
        // before Firefox 7?, no File ctor.
        // Use trick via input element from hidden DOM window
        var that = this;
        this.File = function (path) {
          var doc = hiddenDOMWindow.document;
          var input = doc.createElement ("input");
          input.setAttribute ("type", "file");
          input.value = that.getURLSpecFromNativePath (path);
          var file = input.files [0];
          input.value = "";
          input = null;
          return file;
        };
      }
    }
  },
  _preparePromise : function () {
    if (this.Promise) {
      return;
    }
    var scope = {};
    Cu.import ("resource://akahuku/promise-polyfill.jsm", scope);
    this.Promise = scope.Promise;
  },
  _prepareGlobals : function () {
    this._prepareFile ();
    this._preparePromise ();
  },
};

var FileUtilC = {};
var FileUtilPDef = {};

function getFileProtocolHandler () {
  return Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService)
    .getProtocolHandler ("file")
    .QueryInterface (Ci.nsIFileProtocolHandler);
}

function createNsiFile (path) {
  var nsIFile = ("nsILocalFile" in Ci ? Ci.nsILocalFile : Ci.nsIFile);
  var nsfile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (nsIFile);
  nsfile.initWithPath (path);
  return nsfile;
}

/**
 * AkahukuFileUtil.createFromFileName
 * @param String filename
 * @return Promise for File
 */
FileUtilP.createFromFileName = function (filename) {
  this._prepareGlobals ();
  var file, promise;
  if (typeof this.File.createFromFileName !== "function") {
    // Firefox 8.0-51.0
    try {
      file = new this.File (filename);
      // Ensure file existence by accessing the property
      // for old implementation (at most Firefox 6.*)
      if (typeof file.fileSize !== "undefined"
          && file.fileSize > 0) {
      }
      promise = this.Promise.resolve (file);
    }
    catch (e) {
      if (e.result !== Components.results.NS_ERROR_FILE_NOT_FOUND) {
        Cu.reportError (e);
      }
      promise = this.Promise.reject (e);
    }
  }
  else {
    if (!filename) {
      return this.Promise.reject (new Error ("no filename specified"));
    }
    try {
      promise = this.File.createFromFileName (filename);
    }
    catch (e) {
      return this.Promise.reject (e);
    }
    if (promise instanceof this.File) {
      // Firefox 52.0-53.0
      file = promise;
      promise = this.Promise.resolve (file);
    }
  }
  return promise;
};
FileUtilPDef.createFromFileName = {
  pref: {async: true, promise: true},
};
FileUtilC.createFromFileName = function () {
  return this.IPC
    .sendAsyncCommand ("FileUtil/createFromFileName", arguments);
};

/**
 * AkahukuFileUtil.getNativePathFromURLSpec
 * @param String url
 * @return String native file/directory path
 */
FileUtilP.getNativePathFromURLSpec = function (url) {
  // classic way depending on nsIFile
  var fileProtocolHandler = getFileProtocolHandler ();
  var nsfile = fileProtocolHandler.getFileFromURLSpec (url);
  return nsfile.path;
};
FileUtilC.getNativePathFromURLSpec = function (url) {
  // Use OS.Path to not create nsIFile in content processes
  // (OS.Path.fromFileURI requires Firefox 29+; Bug 803188)
  const {OS} = Cu.import ("resource://gre/modules/osfile.jsm", {});
  return OS.Path.fromFileURI (url);
};

/**
 * AkahukuFileUtil.getURLSpecFromNativePath
 * @param String path Native file/directory path
 * @return String url
 */
FileUtilP.getURLSpecFromNativePath = function (path) {
  // classic way depending on nsIFile
  var fileProtocolHandler = getFileProtocolHandler ();
  var nsfile = createNsiFile (path);
  return fileProtocolHandler.getURLSpecFromFile (nsfile);
};
FileUtilC.getURLSpecFromNativePath = function (path) {
  // Use OS.Path to not create nsIFile in content processes
  // (OS.Path.toFileURI requires Firefox 29+; Bug 803188)
  const {OS} = Cu.import ("resource://gre/modules/osfile.jsm", {});
  return OS.Path.toFileURI (path);
};

/**
 * AkahukuFileUtil.getURLSpecFromNativeDirPath
 * @param String path Native directory path
 * @return String url ending with "/"
 */
FileUtilP.getURLSpecFromNativeDirPath = function (path) {
  // classic way depending on nsIFile
  var fileProtocolHandler = getFileProtocolHandler ();
  var nsfile = createNsiFile (path);
  return fileProtocolHandler.getURLSpecFromDir (nsfile);
};
FileUtilC.getURLSpecFromNativeDirPath = function (path) {
  // Use OS.Path to not create nsIFile in content processes
  // (OS.Path.toFileURI requires Firefox 29+; Bug 803188)
  const {OS} = Cu.import ("resource://gre/modules/osfile.jsm", {});
  var dir = OS.Path.toFileURI (path);
  if (!(/\/$/.test (dir))) {
    dir += "/";
  }
  return dir;
};

/**
 * AkahukuFileUtil.getLastModified
 * @param File file
 * @return Number last modified time
 */
FileUtilP.getLastModified  = function (file) {
  if (typeof file.lastModified !== "undefined") {
    return file.lastModified;
  }
  if (typeof file.lastModifiedDate !== "undefined") {
    // 15+, deprecated since Fx49
    return file.lastModifiedDate.getTime ();
  }
  // for old implementation without lastModified[Date] (-14.* ?)
  if (typeof file.mozFullPath !== "undefined") {
    try {
      var path = file.mozFullPath;
      var nsfile = createNsiFile (path);
      return nsfile.lastModifiedTime;
    }
    catch (e) {
      Cu.reportError (e);
      return 0;
    }
  }
  return 0;
};


const {AkahukuIPCManager} = Cu.import ("resource://akahuku/ipc.jsm", {});
var AkahukuFileUtil = AkahukuIPCManager.createAndRegisterModule ({
  root: "FileUtil",
  defaultIPCModuleName: "FileUtil",
  parentModule: FileUtilP,
  parentDefinitions: FileUtilPDef,
  childModule: FileUtilC,
  childDefinitions: {}, // no child-process listener
});

