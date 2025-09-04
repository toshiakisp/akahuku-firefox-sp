'use strict';

var arAkahukuP2P = new AkahukuContextMenu({
  common: {
    contexts: ['image'],
    targetUrlPatterns: [
      'akahuku://*/p2p/*',
      'akahuku-safe://*/p2p/*',
    ],
  },
  commonUpdate: (info, tab, c) => ({
    enabled: Prefs.getItem('all') && Prefs.getItem('p2p'),
  }),
  menus: [
    {
      id: 'akahuku-menuitem-content-separator8',
      type: 'separator',
    },
    {
      id: 'akahuku-menuitem-content-p2p-delete',
      type: 'normal',
      enabled: false,
      title: 'この画像の P2P キャッシュを削除',
      onclick: (info, tab, c) => {
        browser.tabs.sendMessage(tab.id, {
          name: 'arAkahukuP2P',
          method: 'deleteCache',
          args: []
        }, {frameId: info.frameId});
      },
    }
  ],
});
