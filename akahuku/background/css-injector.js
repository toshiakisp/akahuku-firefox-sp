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

    match(url) {
      try {
        let u = new URL(url);
        return u.hostname.endsWith('.' + this.domain);
      }
      catch (e) {
        return false;
      }
    }

    async insertForFrame(tabId, frameId, url=undefined) {
      let records = _insertedEntryRecords.get(this);
      if (!records) {
        records = new Map();
        _insertedEntryRecords.set(this, records);
      }
      let tabrecords = records.get(tabId);
      if (!tabrecords) {
        tabrecords = new Map();
        records.set(tabId, tabrecords);
      }
      let rec = tabrecords.get(frameId);
      if (!rec) {
        rec = {promising: Promise.resolve()};
        tabrecords.set(frameId, rec);
      }
      rec.url = url;
      rec.details = {
        cssOrigin: 'user',
        runAt: 'document_start',
        frameId: frameId,
        code: this.styleText,
      };
      await rec.promising;
      rec.promising = browser.tabs.insertCSS(tabId, rec.details);
      return rec.promising;
    }

    async insertToMatchedFrames() {
      const promises = [];
      const tabs = await browser.tabs.query({});
      for (let tab of tabs) {
        let getting = browser.webNavigation.getAllFrames({tabId:tab.id})
          .then((allframes) => {
            const promises = [];
            for (let frame of allframes) {
              if (this.match(frame.url)) {
                promises.push(this.insertForFrame(tab.id, frame.frameId, frame.url));
              }
            }
            return Promise.all(promises);
          });
        promises.push(getting);
      }
      return Promise.all(promises);
    }

    async removeFromInsertedFrames() {
      const promises = [];
      const records = _insertedEntryRecords.get(this);
      if (records) {
        for (let [tabId, tabrecords] of records) {
          for (let [frameId, info] of tabrecords) {
            info.promising = info.promising.then(() => {
              return browser.tabs.removeCSS(tabId, info.details);
            });
            promises.push(info.promising);
          }
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
        for (let [tabId, tabrecords] of records) {
          for (let [frameId, info] of tabrecords) {
            info.promising = info.promising.then(() => {
              return browser.tabs.removeCSS(tabId, info.details);
            })
            .then(() => {
              this.insertForFrame(tabId, frameId, info.url);
            });
            promises.push(info.promising);
          }
        }
      }
      return Promise.all(promises);
    }
  }

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
        return entry.insertToMatchedFrames();
      }
    },

    unregister: async function (id) {
      let removing;
      const entry = _entries.get(id);
      if (entry) {
        removing = entry.removeFromInsertedFrames();
        _insertedEntryRecords.delete(entry);
      }
      _entries.delete(id);
      return removing;
    },

    unregisterAll: async function () {
      const promises = [];
      for (let entry of _entries.values()) {
        promises.push(entry.removeFromInsertedFrames());
      }
      _insertedEntryRecords.clear();
      _entries.clear();
      return Promise.all(promises);
    },

    injectIfMatched: async function (tabId, frameId, url) {
      const promises = [];
      for (let entry of _entries.values()) {
        if (entry.match(url)) {
          promises.push(entry.insertForFrame(tabId, frameId, url));
        }
      }
      return Promise.all(promises);
    },
  });

})();

