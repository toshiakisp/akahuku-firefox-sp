
export {JsonFetchService};

import {CachedFetcher} from "/common/cachedfetch.js";

const JsonFetchService = (()=>{
  let methods = [
    'fetch',
    'getDataFor',
    'getStateFor',
    'invalidateCacheFor',
  ];

  let module = {};
  for (let m of methods) {
    module[m] = async (...args) => {
      return await browser.runtime.sendMessage({
        'target': 'json-fetch-service.js',
        'command': m,
        'args': [...args],
      });
    };
  }
  module.STATES = CachedFetcher.STATES;
  return Object.freeze(module);
})();

