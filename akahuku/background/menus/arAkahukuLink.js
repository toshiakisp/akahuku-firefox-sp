'use strict';

/**
 * リンク管理
 *   [オートリンク]、[芝刈り]、[P2P]
 */
var arAkahukuLink = new AkahukuContextMenu({
  common: {
    visible: false,
  },
  commonUpdate: () => ({
    visible: (Prefs.getItem('all')
      && Prefs.getItem('autolink')),
  }),
  menus: [
    {
      id: 'akahuku-menuitem-content-separator6-1',
      type: 'separator',
      contexts: ['image'],
      _onUpdate: (i, t, c) => ({
        visible: Prefs.getItem('autolink.user'),
      }),
    },
    {
      id: 'akahuku-menuitem-content-separator6-2',
      type: 'separator',
      contexts: ['selection'],
      _onUpdate: (i, t, c) => ({
        visible: Prefs.getItem('autolink.as'),
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-user-add',
      type: 'normal',
      contexts: ['image'],
      enabled: false,
      // ユーザ指定文字列に追加
      title: '\u30E6\u30FC\u30B6\u6307\u5B9A\u6587\u5B57\u5217\u306B\u8FFD\u52A0',
      onclick: (i, t) => arAkahukuLink.onClickAddUser(i, t),
      _onUpdate: (i, t, c) => ({
        visible: Prefs.getItem('autolink.user') && c.isUserLinkable,
        enabled: c.isUserLinkable,
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-open-as',
      type: 'normal',
      contexts: ['selection'],
      // オートリンクとして開く
      title: '\u30AA\u30FC\u30C8\u30EA\u30F3\u30AF\u3068\u3057\u3066\u958B\u304F',
      onclick: (i, t) => arAkahukuLink.onClickOpenAsAutoLink(i, t),
      _onUpdate: (i, t, c) => ({
        visible: Prefs.getItem('autolink.as'),
      }),
    },

    {
      id: 'akahuku-menuitem-content-separator7',
      type: 'separator',
      contexts: ['link'],
      visible: true,
    },
    {
      id: 'akahuku-menuitem-content-autolink-ext-auto',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - 自動認識
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - \u81EA\u52D5\u8A8D\u8B58',
      onclick: (i, t) => arAkahukuLink.onClickSetExtAuto(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isNoExtAutolink,
        enabled: c.isNoExtAutolink && c.isNoExtAutolinkAuto,
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-ext-jpg',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - jpg
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - jpg',
      onclick: (i, t) => arAkahukuLink.onClickSetExtJPEG(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isNoExtAutolink,
        enabled: c.isNoExtAutolink,
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-ext-png',
      type: 'normal',
      contexts: ['link'],
      // 拡張子を指定 - png
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - png',
      onclick: (i, t) => arAkahukuLink.onClickSetExtPNG(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isNoExtAutolink,
        enabled: c.isNoExtAutolink,
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-ext-gif',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - gif
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - gif',
      onclick: (i, t) => arAkahukuLink.onClickSetExtGIF(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isNoExtAutolink,
        enabled: c.isNoExtAutolink,
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-ext-input',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - 手入力
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - \u624B\u5165\u529B',
      onclick: (i, t) => arAkahukuLink.onClickSetExtManual(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isNoExtAutolink,
        enabled: c.isNoExtAutolink,
      }),
    },
    {
      id: 'akahuku-menuitem-content-autolink-test-anon',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // リンク先を調査
      title: '\u30EA\u30F3\u30AF\u5148\u3092\u8ABF\u67FB',
      onclick: (i, t) => arAkahukuLink.onClickTestLinkAnon(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isAutolink,
        enabled: c.isAutolink,
      }),
    },
  ],
});

Object.assign(arAkahukuLink, {

  onClickSetExt: function (info, tab, type, ext) {
    let msg = {
      name: 'arAkahukuLink', method: 'setExt',
      args: [type, ext],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },
  onClickSetExtAuto: function (info, tab) {
    arAkahukuLink.onClickSetExt (info, tab, 2, '');
  },
  onClickSetExtJPEG: function (info, tab) {
    arAkahukuLink.onClickSetExt (info, tab, 0, 'jpg');
  },
  onClickSetExtPNG: function (info, tab) {
    arAkahukuLink.onClickSetExt (info, tab, 0, 'png');
  },
  onClickSetExtGIF: function (info, tab) {
    arAkahukuLink.onClickSetExt (info, tab, 0, 'gif');
  },
  onClickSetExtManual: function (info, tab) {
    arAkahukuLink.onClickSetExt (info, tab, 1, '');
  },
  onClickTestLinkAnon: function (info, tab) {
    let msg = {
      name: 'arAkahukuLink', method: 'testLinkAnon',
      args: [],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  onClickAddUser: function (info, tab) {
    let msg = {name: 'arAkahukuLink', method: 'addUser', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  onClickOpenAsAutoLink: function (info, tab) {
    let msg = {
      name: 'arAkahukuLink', method: 'openAsAutoLink',
      args: [null, info.modifiers.includes('Shift')],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

});
