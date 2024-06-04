
'strict mode';

const Downloads = (()=>{
  let methods = [
    'download',
    'downloadBlob',
    'removeFile',
    'eraseById',
    'fetch',
  ];

  let module = {};
  for (let m of methods) {
    module[m] = async (...args) => {
      let ret = await browser.runtime.sendMessage({
        'target': 'downloads.js',
        'command': m,
        'args': [...args],
      });
      if (m == 'fetch') {
        if (ret.status < 0) {
          throw new Error(ret.statusText);
        }
        ret = new Response(ret.blob, {
          status: ret.status,
          statusText: ret.statusText,
          headers: new Headers(ret.headers),
        });
      }
      return ret;
    };
  }
  return Object.freeze(module);
})();

