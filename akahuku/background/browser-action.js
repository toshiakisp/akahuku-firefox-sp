'use strict';

browser.browserAction.onClicked.addListener((tab) => {
  browser.runtime.openOptionsPage();
});

