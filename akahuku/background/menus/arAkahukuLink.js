'use strict';

/**
 * リンク管理
 *   [オートリンク]、[芝刈り]、[P2P]
 */
var arAkahukuLink = {
  initContextMenus: function () {
    let p = (key) => Prefs.getItem(key);
    let enableMenu = p('autolink') && p('all');

    let createIf = (condition, createProps) => {
      browser.menus.remove(createProps.id);
      if (enableMenu && condition)
        browser.menus.create(createProps);
    };

    createIf(p('autolink.user'), {
      id: 'akahuku-menuitem-content-separator6-1',
      type: 'separator',
      contexts: ['image'],
    });
    createIf(p('autolink.as'), {
      id: 'akahuku-menuitem-content-separator6-2',
      type: 'separator',
      contexts: ['selection'],
    });
    createIf(p('autolink.user'), {
      id: 'akahuku-menuitem-content-autolink-user-add',
      type: 'normal',
      contexts: ['image'],
      enabled: false,
      // ユーザ指定文字列に追加
      title: '\u30E6\u30FC\u30B6\u6307\u5B9A\u6587\u5B57\u5217\u306B\u8FFD\u52A0',
      onclick: arAkahukuLink.onClickAddUser,
    });
    createIf(p('autolink.as'), {
      id: 'akahuku-menuitem-content-autolink-open-as',
      type: 'normal',
      contexts: ['selection'],
      // オートリンクとして開く
      title: '\u30AA\u30FC\u30C8\u30EA\u30F3\u30AF\u3068\u3057\u3066\u958B\u304F',
      onclick: arAkahukuLink.onClickOpenAsAutoLink,
    });

    createIf(true, {
      id: 'akahuku-menuitem-content-separator7',
      type: 'separator',
      contexts: ['link'],
    });
    createIf(true, {
      id: 'akahuku-menuitem-content-autolink-ext-auto',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - 自動認識
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - \u81EA\u52D5\u8A8D\u8B58',
      onclick: arAkahukuLink.onClickSetExtAuto,
    });
    createIf(true, {
      id: 'akahuku-menuitem-content-autolink-ext-jpg',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - jpg
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - jpg',
      onclick: arAkahukuLink.onClickSetExtJPEG,
    });
    createIf(true, {
      id: 'akahuku-menuitem-content-autolink-ext-png',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - png
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - png',
      onclick: arAkahukuLink.onClickSetExtPNG,
    });
    createIf(true, {
      id: 'akahuku-menuitem-content-autolink-ext-gif',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - gif
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - gif',
      onclick: arAkahukuLink.onClickSetExtGIF,
    });
    createIf(true, {
      id: 'akahuku-menuitem-content-autolink-ext-input',
      type: 'normal',
      contexts: ['link'],
      enabled: false,
      // 拡張子を指定 - 手入力
      title: '\u62E1\u5F35\u5B50\u3092\u6307\u5B9A - \u624B\u5165\u529B',
      onclick: arAkahukuLink.onClickSetExtManual,
    });
  },

  updateContextMenus: function (info, tab, c) {
    if (!info.contexts.includes('selection')
      && !info.contexts.includes('image')
      && !info.contexts.includes('link')) {
      return false;
    }

    let isAsAutoLinkable
      = info.contexts.includes('selection')
      && c.isAkahukuApplied;

    let rules = [
      //{id:'akahuku-menuitem-content-separator6-1',
      //  update: {visible: c.isUserLinkable && isAsAutoLinkable}},
      {id:'akahuku-menuitem-content-autolink-user-add',
        update: {enabled: c.isUserLinkable}},
      // {id:'akahuku-menuitem-content-separator7',
      //   update: {visible: c.isNoExtAutolink}},
      {id:'akahuku-menuitem-content-autolink-ext-auto',
        update: {enabled: c.isNoExtAutolink && c.isNoExtAutolinkAuto}},
      {id:'akahuku-menuitem-content-autolink-ext-jpg',
        update: {enabled: c.isNoExtAutolink}},
      {id:'akahuku-menuitem-content-autolink-ext-png',
        update: {enabled: c.isNoExtAutolink}},
      {id:'akahuku-menuitem-content-autolink-ext-gif',
        update: {enabled: c.isNoExtAutolink}},
      {id:'akahuku-menuitem-content-autolink-ext-input',
        update: {enabled: c.isNoExtAutolink}},
    ];
    // Note:'visible' requires Fx63+

    let updated = false;
    for (let rule of rules) {
      if (info.menuIds.includes(rule.id)) {
        browser.menus.update(rule.id, rule.update);
        updated = true;
      }
    }
    return updated;
  },

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

};
