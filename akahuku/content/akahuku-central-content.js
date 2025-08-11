
export const AkahukuCentral = (()=>{
  let methods = [
    'register',
    'unregister',
    'get',
    'getId',
    'update',
    'getParamsByURL',
    'isURLOpened',
  ];

  let module = {};
  for (let m of methods) {
    module[m] = async (...args) => {
      return await browser.runtime.sendMessage({
        'target': 'akahuku-central.js',
        'command': m,
        'args': [...args],
      });
    };
  }
  return Object.freeze(module);
})();

