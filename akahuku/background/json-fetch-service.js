
'strict mode';

let CachedFetcher, CachedJsonFetcher;
import('/common/cachedfetch.js').then(m => {
  ({CachedFetcher, CachedJsonFetcher} = m);
});

const JsonFetchService = (function () {

  // Unique fetcher collection for each url
  const fetchers = new Map();

  // public methods of module
  let exports = Object.freeze({
    fetch: async function (url, options) {
      let valid_period = 30;
      let fetcher = fetchers.get(url);
      if (!fetcher) {
        fetcher = new CachedJsonFetcher(url, valid_period);
        fetchers.set(url, fetcher);
      } else {
        fetcher.valid_period = valid_period;
      }
      return fetcher.fetch(options);
    },

    getDataFor: function (url) {
      let fetcher = fetchers.get(url);
      if (!fetcher) {
        return Promise.reject('No fetch result for specified url');
      }
      return Promise.resolve(fetcher.getData());
    },
    getStateFor: function (url) {
      let fetcher = fetchers.get(url);
      if (!fetcher) return Promise.reject('No fetcher created for specified url');
      return Promise.resolve(fetcher.getState());
    },
    invalidateCacheFor: function (url) {
      let fetcher = fetchers.get(url);
      if (!fetcher) return;
      fetcher.invalidateCache();
    },

  });

  // Listen for message from content scripts
  browser.runtime.onMessage.addListener((msg, sender) => {
    if ('target' in msg && msg.target === 'json-fetch-service.js') {
      let methods = Object.getOwnPropertyNames(exports);
      if (methods.indexOf(msg.command) != -1) {
        return exports[msg.command](...msg.args);
      } else {
        throw new Error('Unknwon command: ' + msg.command);
      }
    }
  });
  return exports;
})();

