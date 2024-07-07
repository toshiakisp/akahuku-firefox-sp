"use strict";

// Set dummy pref with waitable promise
let dummy = {};
dummy.preparing = new Promise((resolve, reject) => {
  dummy._resolve = resolve;
  dummy._reject = reject;
});
let Prefs = dummy;

// Async initialization
Promise.all([
  import('./pref.js').then(m => m.Prefs),
  import('./pref_default.js').then(m => m.defaultPrefs),
  browser.storage.local.get(null),
]).then(([mPrefs, defaultPrefs, localPrefs]) => {
  for (let [k, v] of defaultPrefs.entries()) {
    mPrefs.setDefault(k, v);
  }
  for (let prop in localPrefs) {
    if (!mPrefs.hasItem(prop)) {
      browser.storage.local.remove(prop);
      console.log('remove invalid pref: "' + prop + '"');
      delete localPrefs[prop];
    }
  }
  mPrefs.set (localPrefs);

  // Prefs now on ready for use
  Prefs = mPrefs;
  Prefs.preparing = Promise.resolve(Prefs);
  dummy._resolve(Prefs);

  // Start listening for future broadcasting of pref changes
  browser.runtime.onConnect.addListener((port) => {
    Prefs.onConnect(port);
  });
})
.catch((err) => {
  if (Prefs ==  dummy) {
    dummy._reject(true);
    Prefs = null;
  }
});


/**
 * Message handler from content scripts to this background script
 */
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!("target" in msg && msg.target === "pref.js")) {
    return false;
  }
  // send async response
  let v = msg.args[0];
  return Prefs.preparing.then(() => {
    switch (msg.command) {
      case "get":
        return Prefs.get(v);
      case "set":
        return Prefs.set(v);
      case "getDefault":
        return Prefs.getDefault(v);
      case "getUser":
        return Prefs.getUser(v);
    }
    return undefined;
  });
});

