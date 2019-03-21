
'strict mode';

const Downloads = (()=>{
  let methods = [
    'download',
    'removeFile',
    'eraseById',
  ];

  let module = {};
  for (let m of methods) {
    module[m] = async (...args) => {
      return browser.runtime.sendMessage({
        'target': 'downloads.js',
        'command': m,
        'args': [...args],
      });
    };
  }
  return Object.freeze(module);
})();

