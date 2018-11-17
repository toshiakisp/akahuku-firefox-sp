"use strict";

var AkahukuCSSInjector = (() => {

  // Insertion mechanism (private)

  const _entries = new Map();
  const _insertedEntryRecords = new Map();

  class StyleSheetEntry {
    constructor(name, domain, code) {
      this.name = name;
      this.domain = domain;
      this.styleText = code;
    }

    get matchPattern() {
      if (this.domain)
        return '*://*.' + this.domain + '/*';
      return '<all_urls>';
    }

    match(url) {
      try {
        let u = new URL(url);
        return u.hostname.endsWith('.' + this.domain);
      }
      catch (e) {
        return false;
      }
    }

    async insertForTab(tabId, url=undefined) {
      let records = _insertedEntryRecords.get(this);
      if (!records) {
        records = new Map();
        _insertedEntryRecords.set(this, records);
      }
      let rec = records.get(tabId);
      if (!rec) {
        rec = {promising: Promise.resolve()};
        records.set(tabId, rec);
      }
      rec.url = url;
      rec.details = {
        cssOrigin: 'user',
        runAt: 'document_start',
        code: this.styleText,
      };
      await rec.promising;
      rec.promising = browser.tabs.insertCSS(tabId, rec.details);
      return rec.promising;
    }

    async insertToMatchedTabs() {
      const promises = [];
      const tabs = await browser.tabs.query({url: this.matchPattern});
      for (let tab of tabs) {
        promises.push(this.insertForTab(tab.id, tab.url));
      }
      return Promise.all(promises);
    }

    async removeFromInsertedTabs() {
      const promises = [];
      const records = _insertedEntryRecords.get(this);
      if (records) {
        for (let [tabId, info] of records) {
          info.promising = info.promising.then(() => {
            return browser.tabs.removeCSS(tabId, info.details);
          });
          promises.push(info.promising);
        }
      }
      return Promise.all(promises);
    }

    async update(newStyleText) {
      if (this.styleText == newStyleText) {
        // aborted due to no change
        return;
      }

      const promises = [];
      this.styleText = newStyleText;
      const records = _insertedEntryRecords.get(this);
      if (records) {
        for (let [tabId, info] of records) {
          info.promising = info.promising.then(() => {
            return browser.tabs.removeCSS(tabId, info.details);
          })
          .then(() => {
            this.insertForTab(tabId, info.url);
          });
          promises.push(info.promising);
        }
      }
      return Promise.all(promises);
    }
  }

  let onTabsUpdated = (tabId, changeInfo, tab) => {
    if (changeInfo.status == 'loading' && changeInfo.url) {
      // a Tab starts loading a url...
      for (let entry of _entries.values()) {
        if (entry.match(changeInfo.url)) {
          entry.insertForTab(tabId, changeInfo.url);
        }
      }
    }
  };
  browser.tabs.onUpdated.addListener(onTabsUpdated);

  let onTabsRemoved = (tabId, removeInfo) => {
    for (let entry of _entries.values()) {
      let records = _insertedEntryRecords.get(entry);
      if (records) {
        records.delete(tabId);
      }
    }
  };
  browser.tabs.onRemoved.addListener(onTabsRemoved);

  //TODO remove listener and injected css from tabs on ext unload
  //browser.tabs.onUpdated.removeListener(onTabsUpdated);

  // Public methods
  return Object.freeze ({
    register: async function (id, rule, code) {
      let entry = _entries.get(id);
      if (entry) {
        return entry.update(code);
      }
      else {
        entry = new StyleSheetEntry(id, rule, code);
        _entries.set(id, entry);
        return entry.insertToMatchedTabs();
      }
    },

    unregister: async function (id) {
      let removing;
      const entry = _entries.get(id);
      if (entry) {
        removing = entry.removeFromInsertedTabs();
        _insertedEntryRecords.delete(entry);
      }
      _entries.delete(id);
      return removing;
    },

    unregisterAll: async function () {
      const promises = [];
      for (let entry of _entries.values()) {
        promises.push(entry.removeFromInsertedTabs());
      }
      _insertedEntryRecords.clear();
      _entries.clear();
      return Promise.all(promises);
    },
  });

})();

