/**
 * Akahuku's content CSS injection manager
 */

const Cc = Components.classes;
const Ci = Components.interfaces;

var EXPORTED_SYMBOLS = [
  "AkahukuCSSInjector"
];

this.AkahukuCSSInjector = Object.freeze ({
  register : function (id, rule, code, callback) {
    var entry = this._getEntryOfId (id);
    if (entry) {
      entry.unregister (function () {
        entry.setCode (rule, code);
        entry.register (function () {
          if (callback)
            callback.call ();
        });
      });
    }
    else {
      entry = new XPCOMStyleSheetServiceEntry (id, rule, code);
      this._setEntryOfId (id, entry);
      entry.register (function () {
        if (callback)
          callback.call ();
      });
    }
  },

  unregister : function (id, callback) {
    var entry = this._getEntryOfId (id);
    if (entry) {
      var _this = this;
      entry.unregister (function () {
        _this._deleteEntryOfId (id);
        if (callback) {
          callback.call ();
        }
      });
    }
    else {
      if (callback) {
        callback.call ();
      }
    }
  },

  unregisterAll : function (callback) {
    var count = 0;
    var waiting = false;
    for (var id in this._entries) {
      if (!this._entries.hasOwnProperty (id)) {
        continue;
      }
      var entry = this._entries [id];
      count ++;
      entry.unregister (function () {
        count --;
        if (waiting && count == 0) {
          callback.call ();
        }
      });
    }
    if (count == 0) {
      callback.call ();
    }
    else {
      waiting = true;
    }
  },

  _entries : {},

  _getEntryOfId : function (id) {
    if (this._entries.hasOwnProperty (id)) {
      return this._entries [id];
    }
    return null;
  },
  _setEntryOfId : function (id, entry) {
    this._entries [id] = entry;
    return this;
  },
  _deleteEntryOfId : function (id) {
    if (this._entries.hasOwnProperty (id)) {
      delete this._entries [id];
      return true;
    }
    return false;
  },
});


/**
 * スタイルシートエントリ
 * (XPCOM nsIStyleSheetService使用、ファイルI/O無し)
 */
function XPCOMStyleSheetServiceEntry (name, rule, code) {
  this.name = name;
  this.documentRule = rule;
  this.styleText = code;
  this._registeredData = null;
}
XPCOMStyleSheetServiceEntry.prototype = {
  _type : Ci.nsIStyleSheetService.USER_SHEET,
  _getStyleSheetService : function () {
    return Cc ["@mozilla.org/content/style-sheet-service;1"]
      .getService (Ci.nsIStyleSheetService);
  },
  register : function (callback) {
    var code = "@-moz-document " + this.documentRule +
      " {" + this.styleText + "}";
    var uriStr = getDataURIForCSSCode (code, this.name);
    var ios
      = Cc ["@mozilla.org/network/io-service;1"]
      .getService (Ci.nsIIOService);
    var uri = ios.newURI (uriStr, null, null);

    if (this._registeredData) {
      if (this._registeredData.uri.equals (uri) &&
          this._registeredData.type == this._type) {
        // the same css is already registered
        if (callback)
          callback.call ();
        return;
      }
      else {
        this.unregister ();
      }
    }

    this._registeredData = {uri: uri, type: this._type};
    var sss = this._getStyleSheetService ();
    sss.loadAndRegisterSheet (uri, this._type);
    if (callback) {
      callback.call ();
    }
  },
  unregister : function (callback) {
    if (this._registeredData) {
      var sss = this._getStyleSheetService ();
      var uri = this._registeredData.uri;
      var type = this._registeredData.type;
      if (sss.sheetRegistered (uri, type)) {
        sss.unregisterSheet (uri, type);
      }
      this._registeredData = null;
    }
    if (callback) {
      callback.call ();
    }
  },
  setCode : function (rule, code) {
    this.documentRule = rule;
    this.styleText = code;
  },
};

function getDataURIForCSSCode (code, name) {
  name = name ? "/*" + name.replace (/(\*\/|#)/,"") + "*/": "";
  return "data:text/css," + name + encodeURIComponent (code);
}

