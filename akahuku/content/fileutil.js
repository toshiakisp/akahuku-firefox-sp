/**
 * Utilities for DOM File operations
 */
/* global Promise */

var AkahukuFileUtil = {
};

/**
 * AkahukuFileUtil.createFromFileName
 * @param String filename
 * @return Promise for File
 */
AkahukuFileUtil.createFromFileName = async function (filename) {
  return new Promise.reject(new Error('NotImplemented'));
};

/**
 * AkahukuFileUtil.getNativePathFromURLSpec
 * @param String url
 * @return String native file/directory path
 */
AkahukuFileUtil.getNativePathFromURLSpec = function (url) {
  throw new Error('NotYetImplemented');
  // (OS.Path.fromFileURI requires Firefox 29+; Bug 803188)
  return OS.Path.fromFileURI (url);
};

/**
 * AkahukuFileUtil.getURLSpecFromNativePath
 * @param String path Native file/directory path
 * @return String url
 */
AkahukuFileUtil.getURLSpecFromNativePath = function (path) {
  throw new Error('NotYetImplemented');
  // (OS.Path.toFileURI requires Firefox 29+; Bug 803188)
  return OS.Path.toFileURI (path);
};

/**
 * AkahukuFileUtil.getURLSpecFromNativeDirPath
 * @param String path Native directory path
 * @return String url ending with "/"
 */
AkahukuFileUtil.getURLSpecFromNativeDirPath = function (path) {
  throw new Error('NotYetImplemented');
  // (OS.Path.toFileURI requires Firefox 29+; Bug 803188)
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
AkahukuFileUtil.getLastModified  = function (file) {
  if (typeof file.lastModified !== "undefined") {
    return file.lastModified;
  }
  return 0;
};

/**
 * AkahukuFileUtil.exists
 * @param File file
 * @return Promise for File that exists (readable)
 */
AkahukuFileUtil.exists = async function (file) {
  return new Promise((resolve, reject) => {
    let reader =new FileReader();
    let determined = false;
    reader.onprogress = (event) => {
      if (event.loaded > 0) { // exists (readable)
        determined = true;
        resolve(file);
        reader.abort();
      }
    };
    reader.onabort = (event) => {
      if (!determined)
        reject(new Error('Aborted reading a file'));
    };
    reader.onerror = (event) => {
      reject(new Error('Error occurs in reading a file'));
    };
    reader.readAsArrayBuffer(file);
  });
};


/*
 * Minimum implementation of OS.Path for all Firefox versions
 */
var OS = {
  get Windows () {
    // lazy getter
    var isWindows = /^Win/.test(window.navigator.platform);
    delete this.Windows;
    return this.Windows = isWindows;
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
  var regexpTrimBoth = (OS.Windows ? /^\\+|\\+$/g : /^\/+|\/+$/g);
  var regexpTrimLast = (OS.Windows ? /\\+$/ : /\/+$/);
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

