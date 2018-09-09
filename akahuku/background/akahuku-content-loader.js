'use strict';

// require: tabs permission


browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // ignore a prior event with 'loading' with no url 
  if (changeInfo.status == 'loading' && changeInfo.url) {
    if (!(/^https?:\/\/[a-z]+\.2chan\.net(:[0-9]+)?\/[^\/]+/.test(tab.url))) {
      return;
    }

    // Inject multiple scripts in specified order
    async function executeScripts(tabId, files) {
      for (let f of files) {
        try {
          if (!f.startsWith('/')) {
            f = '/content/' + f;
          }
          await browser.tabs.executeScript(tabId, {
            file: f,
            runAt: 'document_start'
          });
        } catch (e) {
          throw new Error('Error in executeScript: '
            + f + ' (' + String(e) + ')')
        }
      }
    }

    executeScripts(tabId, [
      'loading_begin.js',
      'port-observer-handler.js',
      'observer-service-content.js',
      'history-service-content.js',
      'pref-content.js',
      'akahuku-central-content.js',
      'tabs-content.js',
      '/common/text-encoding/encoding-indexes.js',
      '/common/text-encoding/encoding.js',
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
      });
  }
  else {
    //console.log(tabId, changeInfo)
  }
})
