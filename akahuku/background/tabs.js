
'strict mode';

const Tabs = (function () {

  // public methods of module
  let exports = Object.freeze({
    focusByURL: async function (url, optProps, optTab) {
      // query central first and get actual url of thread
      const breakNoThread = new Error('No thread with url');
      return AkahukuCentral.getParamsByURL(url)
        .then((params) => {
          if (params.length == 0) {
            throw breakNoThread;
          }
          // TODO: optProps.reloadOnDemand
          return params[0].url;
        })
        .then((url) => browser.tabs.query({url: url}))
        .then((tabs) => {
          if (tabs.length == 0) {
            throw new Error('tabs.js: no tab for ' + url);
          }
          if (!tabs[0].active) {
            return browser.tabs.update(tabs[0].id, {active: true});
          }
          return tabs[0];
        })
        .then((tab) => {
          return browser.windows.update(tab.windowId, {focused: true});
        })
        .then(() => {
          return true; // focused
        })
        .catch((err) => {
          if (err === breakNoThread) {
            return false; // not focused
          }
          console.error('tabs.js: focusByURL() causes error', err.message);
          throw err;
        });
    },
    openNewTab: async function (url, focus, optTab) {
      return browser.tabs.create({
        url: url,
        active: focus,
      });
    },
  });

  // Listen for message from content scripts
  browser.runtime.onMessage.addListener((msg, sender) => {
    let tabArgs = [{tab: sender.tab, frameId: sender.frameId}];
    if ('target' in msg && msg.target === 'tabs.js') {
      let methods = Object.getOwnPropertyNames(exports);
      if (methods.indexOf(msg.command) != -1) {
        return exports[msg.command](...msg.args, ...tabArgs);
      }
      else {
        console.warn('tabs.js', 'unknown command', msg.command);
      }
    }
  });

  return exports;
})();

