
'strict mode';

const Downloads = (()=>{
  let methods = [
    'download',
    'downloadBlob',
    'removeFile',
    'eraseById',
  ];

  let module = {};
  for (let m of methods) {
    module[m] = async (...args) => {
      return await browser.runtime.sendMessage({
        'target': 'downloads.js',
        'command': m,
        'args': [...args],
      });
    };
  }
  return Object.freeze(module);
})();

