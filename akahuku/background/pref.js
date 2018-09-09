/**
 * Extension preference background script
 *
 * DependsOn: Map, for...of, Map.prototype.keys (Firefox 20)
 * DependsOn: browser.runtime.onMessage (Firefox 45)
 * Permissions: storage
 */

"use strict";

var Prefs = {
  _defaultData: new Map(),
  _userData: new Map(),

  setDefault: function (name, defaultValue) {
    this._defaultData.set(name, defaultValue);
  },
  checkDefault: function (name) {
    return !(this._userData.has(name));
  },

  get: function (keys) {
    var ret = {};
    if (typeof keys === "string") {
      if (keys) {
        ret [keys] = this.getItem (keys);
      }
    }
    else if (typeof keys == "object") {
      if (keys === null) {
        keys = this._defaultData.keys();
      }
      for (var key of keys) {
        ret[key] = this.getItem(key);
      }
    }
    else {
      throw TypeError("keys must be a null, string, array of strings, or objects")
    }
    return ret;
  },

  set: function (keys) {
    var ret = {};
    for (var prop in keys) {
      ret[prop] = {
        oldValue: this.getItem(prop),
        newValue: keys[prop],
      };
      this.setItem(prop, keys[prop]);
    }
    return ret;
  },

  restore: function (keys) {
    for (var prop in keys) {
      if (!this._defaultData.has(prop)) {
        browser.storage.local.remove(prop);
        console.log('remove invalid pref: "' + prop + '"');
      }
      else {
        this.setItem(prop, keys[prop]);
      }
    }
  },

  getItem: function (name) {
    if (this._userData.has(name)) {
      return this._userData.get(name);
    }
    return this._defaultData.get(name);
  },
  setItem: function (name, value) {
    if (!this._defaultData.has(name)) {
      console.error("ignore invalid pref: '" + name
          + '" ("' + value + '")');
      return;
    }
    var dv = this._defaultData.get(name);
    if (dv == value) {
      this._userData.delete(name);
      browser.storage.local.remove(name);
    }
    else {
      this._userData.set(name, value);
      var keys = {};
      keys[name] = value;
      browser.storage.local.set(keys);
    }
  },
  hasItem: function (name) {
    return this._defaultData.has(name) || this._userData.has(name);
  },
};


/**
 * Message handler from content scripts to this background script
 */
function handleMessage(message, sender, sendResponse) {
  if ("target" in message && message.target === "pref.js") {
    var args = message.args;
    switch (message.command) {
      case "get":
        sendResponse (Prefs.get (args [0]));
        break;
      case "set":
        sendResponse (Prefs.set (args [0]));
        break;
    }
  }
}
browser.runtime.onMessage.addListener(handleMessage);

/**
 * declare pref entry with a default value
 */
function pref(name, defaultValue) {
  Prefs.setDefault(name, defaultValue);
}

function prefEndDeclare() {
  browser.storage.local.get(null).then (function (localPrefs) {
    for (var prop in localPrefs) {
      if (!Prefs.hasItem(prop)) {
        // browser.storage.local.remove(prop);
        console.log('remove invalid pref: "' + prop + '"');
        delete localPrefs[prop];
      }
    }
    Prefs.set (localPrefs);
  });
}

