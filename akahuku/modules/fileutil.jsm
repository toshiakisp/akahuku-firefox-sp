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
    file = new this.File (filename);
    promise = this.Promise.resolve (file);
  }
  else {
    promise = this.File.createFromFileName (filename);
    if (promise instanceof File) {
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
  var fileProtocolHandler
    = Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService)
    .getProtocolHandler ("file")
    .QueryInterface (Ci.nsIFileProtocolHandler);
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
  var fileProtocolHandler
    = Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService)
    .getProtocolHandler ("file")
    .QueryInterface (Ci.nsIFileProtocolHandler);
  var nsfile
    = Cc ["@mozilla.org/file/local;1"]
    .createInstance (Ci.nsILocalFile);
  nsfile.initWithPath (path);
  return fileProtocolHandler.getURLSpecFromFile (nsfile);
};
FileUtilC.getURLSpecFromNativePath = function (path) {
  // Use OS.Path to not create nsIFile in content processes
  // (OS.Path.toFileURI requires Firefox 29+; Bug 803188)
  const {OS} = Cu.import ("resource://gre/modules/osfile.jsm", {});
  return OS.Path.toFileURI (path);
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

