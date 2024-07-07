'use strict';
/* global AkahukuCSSInjector */

// require: tabs permission

const AkahukuContentLoader = {
  injectToTab: async function (tabId, abortSignal) {
    let url = 'http://www.2chan.net/b/fake/futaba.htm';// to inject forcely
    await Prefs.preparing;
    AkahukuCSSInjector.injectIfMatched(tabId, 0, url);
    return await this.injectToFrame(tabId, 0, abortSignal);
  },
  injectToFrame: async function (tabId, frameId, abortSignal) {
    // Inject multiple scripts in specified order
    let executeScripts = async (tabId, files) => {
      let results = [];
      for (let f of files) {
        if (abortSignal && abortSignal.aborted) {
          console.warn('akahuku-content-loader: Abort loading before', f);
          break;
        }
        try {
          if (!f.startsWith('/')) {
            f = '/content/' + f;
          }
          let r = await browser.tabs.executeScript(tabId, {
            file: f,
            frameId: frameId,
            runAt: 'document_start'
          });
          results.push(r);
        } catch (e) {
          if (abortSignal && abortSignal.aborted) {
            console.warn('akahuku-content-loader: Abort loading in executing', f);
            break;
          }
          throw new Error('Error in executeScript: '
            + f + ' for tab:' + tabId + ' frame:' + frameId
            + ' (' + String(e) + ')')
        }
      }
      return results;
    };

    return executeScripts(tabId, [
      'loading_end.js',
    ])
      .then((results) => {
        // console.log('loaded all content scripts successfuly.');
        return results[0].at(-1);//single frame, last script
      })
      .catch((err) => {
        console.warn('Loading error: ' + err.message)
        throw err;
      });
  },
};

let arAkahukuURLUtil;

let portListener = async (port) => {
  if (port.name !== 'content-loader') {
    return;
  }
  let tabId = port.sender.tab.id;
  let frameId = port.sender.frameId || 0;
  let url = port.sender.url;
  const t0 = performance.now();

  AkahukuCSSInjector.injectIfMatched(tabId, frameId, url);

  if (!arAkahukuURLUtil.getNeedApply(url)) {
    port.disconnect(); return;
  }
  let abortSignal = {aborted: false};
  port.onDisconnect.addListener((p) => {
    abortSignal.aborted = true;
  });

  AkahukuContentLoader.injectToFrame(tabId, frameId, abortSignal)
  .then((returned) => {
    port.disconnect();
    const t1 = performance.now();
    console.log(`Akahuku injected successfuly in ${t1 - t0} ms: ${url}`, returned);
  });
};

Promise.all([
  import('/common/arAkahukuURLUtil.js').then(m => {
    ({arAkahukuURLUtil} = m);
  }),
  Prefs.preparing,
]).then(() => {

  browser.runtime.onConnect.addListener(portListener);
});

