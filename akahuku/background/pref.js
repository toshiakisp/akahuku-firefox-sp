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
      else {
        keys = Object.getOwnPropertyNames(keys);
      }
      for (let key of keys) {
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
    var updated = false;
    var updates = {};
    for (let prop in keys) {
      ret[prop] = {
        oldValue: this.getItem(prop),
        newValue: keys[prop],
      };
      this.setItem(prop, keys[prop]);
      if (!updated && ret[prop].oldValue != ret[prop].newValue) {
        updated = true;
        updates[prop] = keys[prop];
      }
    }
    if (updated) {
      Prefs.onChanged.emit(updates);
      for (let port of this._observingPorts) {
        try {
          port.postMessage(updates)
        }
        catch (e) {
        }
      }
    }
    return ret;
  },

  getDefault: function (keys) {
    var ret = {};
    if (typeof keys === "string") {
      if (keys) {
        ret [keys] = this._defaultData.get(keys);
      }
    }
    else if (typeof keys == "object") {
      if (keys === null) {
        keys = this._defaultData.keys();
      }
      else {
        keys = Object.getOwnPropertyNames(keys);
      }
      for (let key of keys) {
        ret[key] = this._defaultData.get(key);
      }
    }
    else {
      throw TypeError("keys must be a null, string, array of strings, or objects")
    }
    return ret;
  },

  getUser: function (keys) {
    var ret = {};
    if (typeof keys === "string") {
      if (keys && this._userData.has(keys)) {
        ret [keys] = this._userData.get(keys);
      }
    }
    else if (typeof keys == "object") {
      if (keys === null) {
        keys = this._userData.keys();
      }
      for (var key of keys) {
        if (this._userData.has(key)) {
          ret[key] = this._userData.get(key);
        }
      }
    }
    else {
      throw TypeError("keys must be a null, string, array of strings, or objects")
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

  onChanged: {
    _listeners: [],
    addListener: function (listener) {
      if (Prefs.onChanged._listeners.indexOf(listener) < 0) {
        Prefs.onChanged._listeners.push(listener);
      }
    },
    removeListener: function (listener) {
      let i = Prefs.onChanged._listeners.indexOf(listener);
      if (i >= 0) {
        Prefs.onChanged._listeners.splice(i, 1);
      }
    },
    emit: function (obj) {
      for (let func of this._listeners) {
        try {
          func.call(null, obj);
        }
        catch (e) {
          console.error(String(e));
        }
      }
    },
  },

  // Observing connection
  _observingPorts: [],

  onConnect: function (port) {
    if (port.name == 'pref.js/observe') {
      this._observingPorts.push(port);
      port.onDisconnect.addListener((p) => {
        let i = this._observingPorts.indexOf(port);
        this._observingPorts.splice(i, 1);
      });
      // For initial handshake
      port.onMessage.addListener((m) => {
        port.postMessage({});
      });
    }
  },
};


/**
 * Message handler from content scripts to this background script
 */
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if ("target" in msg && msg.target === "pref.js") {
    switch (msg.command) {
      case "get":
        sendResponse(Prefs.get (msg.args [0]));
        break;
      case "set":
        sendResponse(Prefs.set (msg.args [0]));
        break;
      case "getDefault":
        sendResponse(Prefs.getDefault (msg.args [0]));
        break;
      case "getUser":
        sendResponse(Prefs.getUser (msg.args [0]));
        break;
    }
  }
});

browser.runtime.onConnect.addListener((port) => {
  Prefs.onConnect(port);
});

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

