
/* global Components */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

var EXPORTED_SYMBOLS = [
  "AkahukuConsole",
];

/**
 * デバッグ用
 */
function AkahukuConsole (optPrefix) {
  this.enabled = true;
  this.prefix = optPrefix || "Akahuku";
  this._prefixSep = ": ";
  this._cs
    = Cc ["@mozilla.org/consoleservice;1"]
    .getService (Ci.nsIConsoleService);
};
AkahukuConsole.prototype = {

  log : function () {
    if (!this.enabled) return;
    this._cs.logStringMessage (this._format (arguments));
  },

  info : function () {
    if (!this.enabled) return;
    var stack = Components.stack.caller;
    this._logMessage (arguments, stack, Ci.nsIScriptError.infoFlag);
  },

  warn : function () {
    if (!this.enabled) return;
    var stack = Components.stack.caller;
    this._logMessage (arguments, stack, Ci.nsIScriptError.warningFlag);
  },

  error : function () {
    if (!this.enabled) return;
    var stack = Components.stack.caller;
    this._logMessage (arguments, stack, Ci.nsIScriptError.errorFlag);
  },

  exception : function (error) {
    if (!this.enabled) return;
    if (typeof error !== "object") {
      error = new Error (String (error),
        Components.stack.caller.filename,
        Components.stack.caller.lineNumber);
    }
    var message = "exception: " + error.message;
    for (var frame = Components.stack.caller;
        frame && frame.filename; frame = frame.caller) {
      message += "\n    " + frame.toString ();
    }
    // この関数で補足される場合は例外を処理しているので警告にとどめる
    this._logMessage ([message], error, Ci.nsIScriptError.warningFlag);
  },

  _logMessage : function (message, stack, flag)
  {
    var filename = null;
    if (stack) {
      if ("filename" in stack) {
        filename = stack.filename;
      }
      else if ("fileName" in stack) { // Error
        filename = stack.fileName;
      }
    }
    var lineNumber = null;
    if (stack && "lineNumber" in stack) {
       lineNumber = stack.lineNumber;
    }
    var columnNumber = null;
    if ("columnNumber" in stack) { // Error
       columnNumber = stack.columnNumber;
    }
    var scriptError
      = Cc ["@mozilla.org/scripterror;1"]
      .createInstance (Ci.nsIScriptError);
    scriptError.init
      (this._format (message),
       filename, null, lineNumber, columnNumber, flag, null);
    this._cs.logMessage (scriptError);
  },

  _format : function (messages)
  {
    var str = this.prefix + this._prefixSep;
    for (var i = 0; i < messages.length; i++) {
      str += this._toString (messages [i]);
      if (i < messages.length-1) {
        str += " ";
      }
    }
    return str;
  },
  _toString : function (message)
  {
    var str = "";
    if (typeof message === "object") {
      if ("nodeName" in message) { // Node
        str += this._NodeToString (message);
      }
      else if ("cancelable" in message) { // Event
        str += this._DOMEventToString (message);
      }
      else if (message instanceof Ci.nsISupports) {
        str += String (message);
      }
      else if (typeof JSON === "object") {
        str += "[" + typeof message + "]";
        try {
          str += JSON.stringify (message);
        }
        catch (e) {
        }
      }
      else {
        str += String (message);
      }
    }
    else {
      try {
        str += String (message);
      }
      catch (e) {
        str += "[" + typeof message + "]";
      }
    }
    return str;
  },

  tic : function () {
    var start = new Date ();
    start.toc = function () {
      var now = new Date ();
      var ms = now.getTime () - this.getTime ();
      this.setTime (now.getTime ());
      return ms;
    };
    return start;
  },

  _DOMEventToString : function (event)
  {
    var str = "Event(" + event.type;
    str += " target=" + this._toString (event.target);
    if (event.originalTarget
        && event.target !== event.originalTarget) {
      str += " originalTarget=" + this._toString (event.originalTarget);
    }
    if (event.explicitOriginalTarget
        && event.target !== event.explicitOriginalTarget) {
      str += " explicitoriginalTarget=" + this._toString (event.explicitOriginalTarget);
    }
    str += " bubbles=" + event.bubbles;
    str += " cancelable=" + event.cancelable;
    str += ")";
    return str;
  },

  _NodeToString : function (node)
  {
    var str = String (node.nodeName);
    var cur = node;
    while (cur.parentNode) {
      str = cur.parentNode.nodeName + ">" + str;
      cur = cur.parentNode;
    }
    if (node.nodeType == node.DOCUMENT_NODE) {
      str += "(" + String (node.location) + ")";
    }
    return str;
  },

  nsresultToString : function (code) {
    var codeInHex = "(0x" + code.toString (16) + ")";
    var codeName = "";
    for (var name in Cr) {
      if (code === Cr [name]) {
        codeName = name + " ";
        break;
      }
    }
    return codeName + codeInHex;
  },
};

