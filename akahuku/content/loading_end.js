/**
 * Akahuku's bootstrap content script injected by executeScript()
 */

// for debug
let prof = {
  status: '',
  tDeltaAll: -1,
  s:[], t: [], d:[],
  tOrigin: performance.timeOrigin,
  tDeltas: [],
  add (state) {
    this.status = state;
    this.s.push(state);
    this.t.push(performance.now());
    this.d.push(document.readyState);
  },
  stats () {
    this.tDeltaAll = this.t.at(-1) - this.t[0];
    let t_pre = 0;
    for (let t of this.t) {
      this.tDeltas.push(t - t_pre)
      t_pre = t;
    }
    return this;
  }
};
prof.add('start');

// start importing modules
const content = browser.runtime.getURL('/content/');

let loading = Promise.all([
  import(content+'loading_begin.js').then(l => {
    l.Loader.initialize(document);
    return l;
  }),
  import(content+'akahuku.js'),
]).then(([l, ak]) => {
  let {Loader} = l, {Akahuku} = ak;
  prof.add('imported')

  Akahuku.init();

  Loader.addEventListener('DOMContentLoaded', (event) => {
    prof.add('beforeloaded');
    try {
      Akahuku.onDOMContentLoaded(event);
      prof.add('afterloaded');
    } catch (e) {
      prof.add('errorloaded');
      Akahuku.debug.exception(e);
    }
  });
  prof.add('initialized');

  Loader.pumpEvents();
  prof.add('ready');
  return prof;
})
.catch((err) => {
  prof.add('error');
  console.trace(err);
  return prof;
});

// last value returns to background
loading.then(()=>{
  return prof.stats();
});
