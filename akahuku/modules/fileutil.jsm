/**
 * Utilities for privilege DOM File operations
 */
/* global Components, Promise, File, FileReader */

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
      // Polyfill via input element from hidden DOM window
      var that = this;
      this.FilePolyfill = function (path) {
        createNsiFile (path).fileSize; // Check file existence
        var doc = hiddenDOMWindow.document;
        var input = doc.createElement ("input");
        input.setAttribute ("type", "file");
        input.value = that.getURLSpecFromNativePath (path);
        var file = input.files [0];
        input.value = "";
        input = null;
        return file;
      };
      if (typeof this.File !== "function") {
        // before Firefox 7?, no File ctor.
        this.File = this.FilePolyfill
        this.FilePolyfill = null; // no futher falldown
      }
    }
  },
  _prepareFileReader : function () {
    if (this.FileReader) {
      return;
    }
    if (typeof FileReader !== "undefined") {
      this.FileReader = FileReader;
    }
    else {
      this.FileReader = function () {
        return Cc ["@mozilla.org/files/filereader;1"]
          .createInstance (Ci.nsIDOMFileReader);
      };
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
    this._prepareFileReader ();
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
      if (!file.mozFullPath) {
        // ESR17 is OK, but ESR24 or higher cause this problem.
        // ESR31+: allows mozFullPath only from nsIFile
        var nsfile = createNsiFile (filename);
        file = new this.File (nsfile);
        file.fileSize;
        if (!file.mozFullPath) { // ESR24
          if (this.FilePolyfill) {
            // fallback to polyfill using hidden input element
            this.File = this.FilePolyfill;
            this.FilePolyfill = null;// once
            file = new this.File (filename);
            file.fileSize;
          }
          else {
            Cu.reportError ("File lacks mozFullPath");
          }
        }
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

/**
 * AkahukuFileUtil.exists
 * @param File file
 * @return Promise for File that exists (readable)
 */
FileUtilP.exists  = function (file) {
  try {
    this._prepareGlobals ();
    var reader = new this.FileReader ();
    return new this.Promise (function (resolve, reject) {
      var callbacked = false;
      reader.onprogress = function (event) {
        if (event.loaded > 0) {
          reader.abort (); // no more data needed
        }
      };
      reader.onloadend = function (event) {
        if (callbacked) return;
        callbacked = true;
        resolve (file);
      };
      reader.onerror = function (event) {
        if (callbacked) return;
        callbacked = true;
        var error = {name: ""};
        if (typeof reader.error.code != "undefined") {
          switch (reader.error.code) {
            case 1: // FileError.NOT_FOUND_ERR
              error.name = "NotFoundError";
              break;
            default:
              error.name = "SecurityError";
          }
        }
        else {
          error.name = reader.error.name;
        }
        reject (error);
      };
      try {
        reader.readAsText (file);
      }
      catch (e) {
        var error = {name: "UnknownError"};
        switch (e.name) {
          case "NS_ERROR_FILE_NOT_FOUND":
            error.name = "NotFoundError";
            break;
          case "NS_ERROR_FILE_ACCESS_DENIED":
          case "NS_ERROR_FILE_IS_LOCKED":
            error.name = "SecurityError";
            break;
          default:
            Cu.reportError (e);
        }
        return reject (error);
      }
    });
  }
  catch (e) {
    Cu.reportError (e);
    var error = {name: "UnknownError"};
    return this.Promise.reject (error);
  }
};
FileUtilPDef.exists = {
  pref: {async: true, promise: true},
};
FileUtilC.exists = function () {
  return this.IPC.sendAsyncCommand ("FileUtil/exists", arguments);
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


/*
 * Minimum implementation of OS.Path for all Firefox versions
 */
var OS = {
  Windows : function () {
    // lazy build
    var xulRuntime
      = Components.classes ["@mozilla.org/xre/app-info;1"]
      .getService (Components.interfaces.nsIXULRuntime);
    this.Windows = /^WIN/.test (xulRuntime.OS);
    return this.Windows;
  },
};

OS.Path = {};
OS.Path.basename = function (path) {
  if (OS.Windows) {
    // "C:\path_to_dir\basename", "C:basename",
    // "\path...", "\\host\path..." (UNC path)
    // "path_to_dir\basename", "basename", (relative path)
    var index = path.lastIndexOf ("\\");
    if (path.charAt (0) == "\\") {
      if (index == 1) { // "\\host"
        return "";
      }
      return path.slice (index + 1);
    }
    if (index < 0) { // "C:basename" or "basename"
      return path.slice (path.lastIndexOf (":") + 1);
    }
    else { // "C:\path..."
      return path.slice (index + 1);
    }
  }
  else { // Unix (Mac)
    return path.slice (path.lastIndexOf ("/") + 1);
  }
};
OS.Path.dirname = function (path) {
  if (OS.Windows) {
    var index = path.lastIndexOf ("\\");
    if (index == -1) { // "C:basename", "C:", or "basename"
      index = path.lastIndexOf (":");
      if (index == -1) {
        return ".";
      }
      return path.slice (0, index + 1);
    }
    if (index == 1 && path.charAt (0) == "\\") { // "\\host"
      return path;
    }
    // ensure that the number of final "\\" is 1
    --index;
    while (index >= 0 && path [index] == "\\") {
      --index;
    }
    return path.slice (0, index + 1);
  }
  else { // Unix (Mac)
    var index = path.lastIndexOf ("/");
    if (index < 0) { // "basename"
      return ".";
    }
    // ensure that the number of final "/" is 1
    --index;
    while (index >= 0 && path [index] == "/") {
      --index;
    }
    return path.slice (0, index + 1);
  }
};
OS.Path.join = function () {
  var paths = [];
  var regexpTrimLast = (OS.Windows ? /^\\+|\\+$/g : /^\/+|\/+$/g);
  var regexpTrimBoth = (OS.Windows ? /\\+$/ : /\/+$/);
  for (var i = 0; i < arguments.length; i ++) {
    var subpath = arguments [i];
    if (!subpath) {
      continue;
    }
    if (paths.length > 0) {
      subpath = subpath.replace (regexpTrimBoth, "");
    }
    else {
      subpath = subpath.replace (regexpTrimLast, "");
    }
    paths.push (subpath);
  }
  return OS.Windows ? paths.join ("\\") : paths.join ("/");
};

AkahukuFileUtil.Path = OS.Path;

