'use strict';

const PrefsStorage = {

  get: async function (keys) {
    return await browser.runtime.sendMessage({
      'target': 'pref.js',
      'command': 'get',
      'args': [keys]
    });
  },

  set: async function (keys) {
    return await browser.runtime.sendMessage({
      'target': 'pref.js',
      'command': 'set',
      'args': [keys]
    });
  },

  getDefault: async function (keys) {
    return await browser.runtime.sendMessage({
      'target': 'pref.js',
      'command': 'getDefault',
      'args': [keys]
    });
  },

  getUser: async function (keys) {
    return await browser.runtime.sendMessage({
      'target': 'pref.js',
      'command': 'getUser',
      'args': [keys]
    });
  },
};

// Cached Prefs for content scripts
// with synchronous APIs
const Prefs = {
  _defaultData: new Map(),
  _userData: new Map(),
  _port: null,

  getItem: function (name) {
    if (this._userData.has(name)) {
      return this._userData.get(name);
    }
    return this._defaultData.get(name);
  },

  setItem: function (name, value, noStore=false) {
    if (!this._defaultData.has(name)) {
      console.error("ignore invalid pref: '" + name
          + '" ("' + value + '")');
      return;
    }
    var dv = this._defaultData.get(name);
    if (dv == value) {
      this._userData.delete(name);
    }
    else {
      this._userData.set(name, value);
    }
    if (!noStore) {
      var keys = {};
      keys[name] = value;
      PrefsStorage.set(keys);
    }
  },

  hasItem: function (name) {
    return this._defaultData.has(name) || this._userData.has(name);
  },

  hasUserValue: function (name) {
    return !(this._userData.has(name));
  },

  clearUserValue: function (name) {
    if (!this._defaultData.has(name)) {
      console.error("ignore invalid pref: '" + name);
      return;
    }
    this._userData.delete(name);
  },

  // easy event manager
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

  //
  startObserve: async function () {
    if (this._port) {
      throw Error('already started');
    }
    let port = browser.runtime.connect({
      name: 'pref.js/observe'
    });
    this._port = port;

    var handshakeResolve = null;
    var handshakeReject = null;
    var p = new Promise((resolve, reject) => {
      handshakeResolve = resolve;
      handshakeReject = reject;
    });
    port.onDisconnect.addListener((p) => {
      if (p.error) {
        console.warn('port between pref.js is disconnected due to an error:'
          + p.error.message);
      }
      if (handshakeResolve) {
        handshakeReject(new Error('Aborted before handshake'));
        handshakeResolve = null;
        handshakeReject = null;
      }
    });
    port.onMessage.addListener((msg) => {
      if (handshakeResolve) {
        handshakeResolve();
        handshakeResolve = null;
        handshakeReject = null;
      }
      let changed = false;
      let updates = {};
      for (let key of Object.getOwnPropertyNames(msg)) {
        let cur = Prefs.getItem(key);
        if (cur !== msg[key]) {
          updates[key] = msg[key];
          Prefs.setItem(key, msg[key], true);
          changed = true;
        }
      }
      if (changed) {
        Prefs.onChanged.emit(updates);
      }
    });
    port.postMessage({});// for handshake
    return p;
  },

  initialize: async function () {
    return PrefsStorage.getDefault(null) // all prefs
      .then((bag) => {
        if (!bag) {
          throw Error("pref-content.js: no response for getDefault!");
        }
        for (let key in bag) {
          Prefs._defaultData.set(key, bag[key]);
        }
      })
      .then(() => PrefsStorage.getUser(null))
      .then((bag) => {
        if (!bag) {
          throw Error("pref-content.js: no response for getUser!");
        }
        for (let key in bag) {
          Prefs._userData.set(key, bag[key]);
        }
        return this.startObserve();
      })
      .then(() => {
        //console.log('pref-content.js: successfully initialized');
      })
      .catch((e) => {
        console.error("pref-content.js: initialize failed!", e);
        throw Error('Prefs.initialize failed: ' + e);
      });
  },
};



