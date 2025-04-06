'use strict';

(async () => {

  const targets = [
    {module: arAkahukuP2P},
    {module: arAkahukuJPEG, label: 'jpeg'},
    {module: arAkahukuQuote, label: 'quote'},
    {module: arAkahukuImage, label: 'image'},
    {module: arAkahukuLink, label: 'link'},
    // TODO arAkahukuTab,
    {module: arAkahukuBrowserAction, label: 'browser_action'},
    {module: arAkahukuSidebarMenus, label: 'sidebar', view: 'sidebar'},
  ];

  let initAllContextMenus = (prefChanged) => {
    for (let target of targets) {
      target.module.initContextMenus(prefChanged);
    }
  };
  let updateAllContextMenus = (info, tab, contentData) => {
    let updated = false;
    for (let target of targets) {
      target.view;
      if (target.view && info.viewType !== target.view) {
        continue;
      }
      let data = null;
      if (target.label) {
        data = contentData[target.label];
      }
      if (!data) {
        data = {};
      }
      try {
        const x = target.module.updateContextMenus?.(info, tab, data);
        updated ||= x;
      } catch (e) {
        console.trace(e);
      }
    }
    return updated;
  };

  await Prefs.preparing;
  initAllContextMenus();

  Prefs.onChanged.addListener((bag) => {
    initAllContextMenus(true);
  });

  browser.tabs.onActivated.addListener((activeInfo) => {
    // Rebuild menus for swiching tab
    initAllContextMenus();
  });

  // Listen for message from content scripts
  let contentData = null;
  let contentDataWatcher = null;
  browser.runtime.onMessage.addListener((msg, sender) => {
    if ('target' in msg && msg.target === 'context-menu.js') {
      if (msg.command == 'setContentData') {
        contentData = msg.args[0];
        if (contentDataWatcher) {
          contentDataWatcher(contentData != null);
        }
        if (contentData == null) {
          contentDataWatcher = null;
        }
        return;
      }
    }
  });

  let lastMenuContexts = [];
  browser.menus.onHidden.addListener(() => {
    contentData = null;
    if (contentDataWatcher) {
      contentDataWatcher(false);
      contentDataWatcher = null;
    }
    // notify menu hidden to content scripts
    ObserverService.notifyObservers(lastMenuContexts, 'menu-hidden', null);
  });

  let lastMenuInstanceId = 0;
  let nextMenuInstanceId = 1;
  browser.menus.onShown.addListener((info, tab) => {
    let menuInstanceId = nextMenuInstanceId++;
    lastMenuInstanceId = menuInstanceId;

    lastMenuContexts = [...info.contexts];
    let sbopened;

    if (info.contexts.includes('browser_action')) {
      // Request special contentData
      browser.sidebarAction.isOpen({}).then(v => {
        sbopened = v;
      });
      let msg = {
        name: 'contextmenu-content.js',
        method: 'getContentDataForBrowserAction',
        args: [],
      };
      browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId})
        .catch((e) => { // no connection (no akahuku in content)
          contentData = {
            browser_action: {
              isAppliable: tab.url.startsWith('http'),
            },
          };
          if (contentDataWatcher) {
            contentDataWatcher(true);
          }
        });
    }

    let updated = false;
    if (contentData) {
      if (menuInstanceId !== lastMenuInstanceId) {
        throw new Error('menu instance id is different');
      }
      updated = updateAllContextMenus(info, tab, contentData);
      if (updated)
        browser.menus.refresh();
      return;
    }
    else {
      if (contentDataWatcher) {
        // remove prior watcher not resolved yet
        contentDataWatcher(false);
      }
      return new Promise((resolve, reject) => {
        // asyncronously wait content data
        contentDataWatcher = (arrived) => {
          try {
            if (menuInstanceId !== lastMenuInstanceId
              || !arrived) {
              // menu was closed and show again
              // or already cleared
              reject(new Error('Unexpected abort'));
              return;
            }
            contentDataWatcher = null;
            contentData.browser_action.isSidebarOpened = sbopened;
            updated = updateAllContextMenus(info, tab, contentData);
            if (updated)
              browser.menus.refresh();
            resolve();
          }
          catch (e) {
            reject(e);
          }
        };
      });
    }
  });

})();



