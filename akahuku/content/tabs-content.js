
'strict mode';

const Tabs = (()=>{
  let methods = [
    'focusByURL',
    'openNewTab',
  ];

  let module = {};
  for (let m of methods) {
    module[m] = async (...args) => {
      return await browser.runtime.sendMessage({
        'target': 'tabs.js',
        'command': m,
        'args': [...args],
      });
    };
  }
  return Object.freeze(module);
})();

