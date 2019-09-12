
'strict mode';

const Downloads = (function () {

  // public methods of module
  let exports = Object.freeze({
    download: async function (props) {
      let ret = {success: false, id: null, state:'', canceled: false, filename:''};
      try {
        ret.id = await browser.downloads.download(props);
      }
      catch (e) {
        if (e.message == 'Download canceled by the user') {
          // 中断しました
          ret.state = '\u4E2D\u65AD\u3057\u307E\u3057\u305F';
          ret.canceled = true;
        }
        else {
          ret.state = 'Error: ' + e.message;
        }
        return ret;
      }
      await new Promise((resolve, reject) => {
        ret.filename = props.filename;
        let listener = (delta) => {
          if (delta.id != ret.id)
            return;
          if (delta.state) {
            if (delta.state.current === 'complete') {
              // Successfully downloaded
              browser.downloads.onChanged.removeListener(listener);
              ret.success = true;
              resolve(ret);
            }
            else if (delta.state.current === 'interrupt') {
              ret.state = 'interrupt';
              reject(ret);
            }
          }
          if (delta.filename) {
            ret.filename = delta.filename.current;
          }
        };
        browser.downloads.onChanged.addListener(listener);
      });
      let results = await browser.downloads.search({id: ret.id});
      if (results.length > 0) {
        ret.filename = results[0].filename;
      }
      return ret;
    },
    downloadBlob: async function (blob, props) {
      let blobURL = window.URL.createObjectURL(blob);
      props.url = blobURL;
      let ret = await this.download(props);
      window.URL.revokeObjectURL(blobURL);
      return ret;
    },
    removeFile: async function (id) {
      await browser.downloads.removeFile(id);
    },
    eraseById: async function (id) {
      let results = await browser.downloads.erase({id: id});
      if (results.length == 0) {
        throw new Error('No download item with specified id');
      }
      return id;
    },
  });

  // Listen for message from content scripts
  browser.runtime.onMessage.addListener((msg, sender) => {
    if ('target' in msg && msg.target === 'downloads.js') {
      let methods = Object.getOwnPropertyNames(exports);
      if (methods.indexOf(msg.command) != -1) {
        return exports[msg.command](...msg.args);
      }
      else {
        console.warn('downloads.js', 'unknown command', msg.command);
      }
    }
  });

  return exports;
})();

