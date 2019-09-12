'use strict';
/* global AkahukuCSSInjector */

// require: tabs permission

const AkahukuContentLoader = {
  injectToTab: async function (tabId, abortSignal) {
    let url = 'http://www.2chan.net/b/fake/futaba.htm';// to inject forcely
    AkahukuCSSInjector.injectIfMatched(tabId, 0, url);
    return await this.injectToFrame(tabId, 0, abortSignal);
  },
  injectToFrame: async function (tabId, frameId, abortSignal) {
    // Inject multiple scripts in specified order
    let executeScripts = async (tabId, files) => {
      for (let f of files) {
        if (abortSignal && abortSignal.aborted) {
          console.warn('akahuku-content-loader: Abort loading before', f);
          break;
        }
        try {
          if (!f.startsWith('/')) {
            f = '/content/' + f;
          }
          await browser.tabs.executeScript(tabId, {
            file: f,
            frameId: frameId,
            runAt: 'document_start'
          });
        } catch (e) {
          throw new Error('Error in executeScript: '
            + f + ' for tab:' + tabId + ' frame:' + frameId
            + ' (' + String(e) + ')')
        }
      }
    };

    return executeScripts(tabId, [
      'loading_begin.js',
      'port-observer-handler.js',
      'observer-service-content.js',
      'history-service-content.js',
      'pref-content.js',
      'akahuku-central-content.js',
      'tabs-content.js',
      'downloads-content.js',
      '/common/text-encoding/encoding-indexes.js',
      '/common/text-encoding/encoding.js',
      '/common/arAkahukuURLUtil.js',
      'fileutil.js',
      // 
      'version.js',
      'mod/arAkahukuCompat.js',
      'mod/arAkahukuUtil.js',
      'mod/arAkahukuDOM.js',
      'mod/arAkahukuClipboard.js',
      'mod/arAkahukuWindow.js',
      'mod/arAkahukuConverter.js',
      'mod/arAkahukuFile.js',
      'mod/arAkahukuConfig.js',
      'mod/arAkahukuStyle.js',
      'mod/arAkahukuSound.js',
      'mod/arAkahukuDocumentParam.js',
      '/common/arAkahukuServerName.js',
      'mod/arAkahukuBoard.js',
      'mod/arAkahukuTitle.js',
      'mod/arAkahukuFileName.js',
      'mod/arAkahukuP2P.js',
      'mod/arAkahukuLocationInfo.js',
      'mod/arAkahukuDelBanner.js',
      'mod/arAkahukuThread.js',
      'mod/arAkahukuImage.js',
      'mod/arAkahukuLink.js',
      'mod/arAkahukuPopupQuote.js',
      'mod/arAkahukuCatalog.js',
      'mod/arAkahukuScroll.js',
      'mod/arAkahukuPostForm.js',
      'mod/arAkahukuUI.js',
      'mod/arAkahukuQuote.js',
      'mod/arAkahukuPopup.js',
      'mod/arAkahukuThreadOperator.js',
      'mod/arAkahukuReload.js',
      'mod/arAkahukuWheel.js',
      'mod/arAkahukuMHT.js',
      'mod/arAkahukuBloomer.js',
      'mod/arAkahukuJPEG.js',
      'mod/arAkahukuTab.js',
      'mod/arAkahukuSidebar.js',
      'akahuku.js',
      'mod/arAkahukuCache.js',
      'console.js',
      'contextmenu-content.js',
      'loading_end.js',
    ])
      .then(() => {
        // console.log('loaded all content scripts successfuly.');
      })
      .catch((err) => {
        console.warn('Loading error: ' + err.message)
        throw err;
      });
  },
};

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== 'content-loader') {
    return;
  }
  let tabId = port.sender.tab.id;
  let frameId = port.sender.frameId || 0;
  let url = port.sender.url;

  AkahukuCSSInjector.injectIfMatched(tabId, frameId, url);

  if (!arAkahukuURLUtil.getNeedApply(url)) {
    return;
  }
  let abortSignal = {aborted: false};
  port.onDisconnect.addListener((p) => {
    abortSignal.aborted = true;
  });
  AkahukuContentLoader.injectToFrame(tabId, frameId, abortSignal);
});

