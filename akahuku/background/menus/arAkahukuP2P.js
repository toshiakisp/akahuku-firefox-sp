'use strict';

var arAkahukuP2P = {

  initContextMenus : function (contextMenus) {
    let p = (key) => Prefs.getItem(key);
    let enableMenu = p('p2p') && p('all');

    let createIf = (condition, createProps) => {
      createProps = {
        contexts: ['image'],
        targetUrlPatterns: [
          'akahuku://*/p2p/*',
          'akahuku-safe://*/p2p/*',
        ],
        ...createProps,
      };
      browser.menus.remove(createProps.id);
      if (enableMenu && condition)
        browser.menus.create(createProps);
    };

    createIf(true, {
      id: 'akahuku-menuitem-content-separator8',
      type: 'separator',
    });
    createIf(true, {
      id: 'akahuku-menuitem-content-p2p-delete',
      type: 'normal',
      enabled: false,
      // この画像の P2P キャッシュを削除
      title: '\u3053\u306E\u753B\u50CF\u306E P2P \u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u524A\u9664',
      onclick: arAkahukuP2P.onClickDeleteCache,
    });
  },

  updateContextMenus : function (info, tab) {
    // no need
    return false;
  },

  onClickDeleteCache : function (info, tab) {
    let msg = {name: 'arAkahukuP2P', method: 'deleteCache', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

};
