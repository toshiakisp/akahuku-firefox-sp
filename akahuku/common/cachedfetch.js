/**
 * fetch manager with self cache (period-base access control)
 *
 * - safer request for the same url
 */

export {CachedFetcher, CachedJsonFetcher};

class CachedFetcher {
  static STATES = Object.freeze({
    READY: 0, //ready to fetch
    WIP: 1, //fetching in progress
    CACHED: 2, //cache is fresh
    FETCHED: 3, //fresh data is coming now
    ERRORED: 4, //an error occured in fetching
  });

  url;
  valid_period;
  #state;
  #cache = null;
  #lastfetched;
  #fetching = null;

  constructor(url, valid_period_sec=60) {
    this.url = url;
    this.valid_period = valid_period_sec;
    this.#state = CachedFetcher.STATES.READY;
    this.#lastfetched = Date.now();
  }

  fetch(options={}) {
    if (this.#state == CachedFetcher.STATES.CACHED) {
      let elapsed = Date.now() - this.#lastfetched;
      if (0 <= elapsed && elapsed < this.valid_period*1000) {
        return Promise.resolve(this.#state);
      }
      this.#state = CachedFetcher.STATES.READY;
    }
    if (this.#state == CachedFetcher.STATES.WIP) {
      // 別処理が走っている場合は、終了待ちをしてキャッシュ済み後の処理だけに進む
      return Promise.resolve(this.#fetching).then(state => {
        if (state == CachedFetcher.STATES.FETCHED) {
          return CachedFetcher.STATES.CACHED;
        }
        return state;
      });
    }
    if (this.#state == CachedFetcher.STATES.FETCHED) {
      this.#state = CachedFetcher.STATES.CACHED;
      return Promise.resolve(this.#state);
    }

    // (this.#state == CachedFetcher.STATES.READY)
    this.#state = CachedFetcher.STATES.WIP;

    const usedOpts = {
      method: options.method,
      mode: options.mode,
      body: options.body,
      cache: options.cache || 'reload',
      headers: options.headers,
      credentials: options.credentials,
      redirect: options.redirect,
      referrer: options.referrer,
      referrerPolicy: options.referrerPolicy,
      // no priority (Fx132+)
      // no signal (no need)
      // no keepalive (Fx133+, no need)
    };
    this.#fetching = window.fetch(this.url, usedOpts).then(res => {
      if (res.ok) {
        return this.queryForResponse(res);
      } else {
        throw new Error('Invalid response: ' + res.status + ' ' + res.statusText);
      }
    }).then(data => {
      this.#cache = data;
      this.#state = CachedFetcher.STATES.CACHED;
      this.#lastfetched = Date.now();
      this.#fetching = null;
      return CachedFetcher.STATES.FETCHED;
    }).catch(err => {
      console.log(err);
      this.#state = CachedFetcher.STATES.READY;
      this.#fetching = null;
      return CachedFetcher.STATES.ERRORED;
    });
    return this.#fetching;
  }

  queryForResponse(res) {
    return res.blob();
  }

  invalidateCache() {
    if (this.#state == CachedFetcher.STATES.CACHED) {
      this.#state = CachedFetcher.STATES.READY;
    }
  }

  getData() {
    return this.#cache;
  }

  getState() {
    return this.#state;
  }
}

class CachedJsonFetcher extends CachedFetcher {
  constructor() {
    super(...arguments);
    this.data = {};
  }
  queryForResponse(res) {
    return res.json();
  }
}

