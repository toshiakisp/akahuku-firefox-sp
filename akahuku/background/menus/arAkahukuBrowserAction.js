'use strict';

var arAkahukuBrowserAction = {

  initialized: false,

  // menu status
  enabled: false,

  initContextMenus: function (prefChanged) {
    if (prefChanged || this.initialized) {
      // minimum update (dummy info)
      this.updateContextMenus({contexts: ['browser_action']}, null, {});
      return;
    }
    this.initialized = true;

    browser.menus.create({ // Parent group
      id: "akahuku-browser-action-menus",
      title: "\u8D64\u798F", // 赤福
      contexts: ['browser_action'],
    });

    let createBrowserAction = (createProps) => {
      browser.menus.create({
        contexts: ['browser_action'],
        parentId: "akahuku-browser-action-menus",
        ...createProps});
    };
    this.enabled = Prefs.getItem('all');
    createBrowserAction({
      id: "akahuku-browser-action-popup-all",
      // 全機能を {ON,OFF}
      title: "\u5168\u6A5F\u80FD\u3092 "
        + (this.enabled ? 'OFF' : 'ON'),
      onclick: this.switchDisabled,
    });
    createBrowserAction({
      id: "akahuku-browser-action-popup-p2p",
      title: "P2P \u3092 ON", // P2P を ON
      enabled: false, //TODO obsolete
      onclick: this.switchP2PDisabled,
    });
    createBrowserAction({
      id: "akahuku-statusbar-popup-p2p-statusbar",
      enabled: false, //TODO obsolete
      // P2P ステータスバーを ON
      title: "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 ON",
      onclick: this.switchP2PStatusbarDisabled,
    });
    createBrowserAction({
      id: "akahuku-browser-action-preferences",
      title: "\u8A2D\u5B9A", // 設定
      command: '_execute_browser_action',
    });

    createBrowserAction({
      id: "akahuku-browser-action-popup-separator1",
      type: "separator",
    });
    createBrowserAction({
      id: "akahuku-browser-action-popup-apply",
      // レス送信モードで動かす
      title: "\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9\u3067\u52D5\u304B\u3059",
      enabled: false,
      onclick: this.applyFocusedDocument,
    });
    createBrowserAction({
      id: "akahuku-browser-action-popup-external",
      title: "\u5916\u90E8\u677F\u306B\u767B\u9332", // 外部板に登録
      enabled: false,
      onclick: this.addFocusedToExternalBoards,
    });

    createBrowserAction({
      id: "akahuku-browser-action-popup-separator2",
      type: "separator",
    });
    createBrowserAction({
      id: "akahuku-browser-action-popup-sidebar",
      // 赤福サイドバー
      title : "\u8D64\u798F\u30B5\u30A4\u30C9\u30D0\u30FC",
      enabled: false,
      command: '_execute_sidebar_action',
    });

    createBrowserAction({
      id: "akahuku-browser-action-popup-respanel",
      type: "checkbox",
      enabled: false,
      title: "\u30EC\u30B9\u30D1\u30CD\u30EB\u3092\u8868\u793A", // レスパネルを表示
      onclick: this.switchResPanelShowing,
    });

    createBrowserAction({
      id: "akahuku-browser-action-popup-separator3",
      type: "separator",
    });
    createBrowserAction({
      id: "akahuku-browser-action-popup-openwebsite",
      title: "\u30B5\u30A4\u30C8\u3092\u958B\u304F", // サイトを開く
      onclick: this.openWebsite,
    });
  },

  updateContextMenus: function (info, tab, c) {
    if (!info.contexts.includes('browser_action')) {
      return false;
    }

    let enabled = Prefs.getItem('all');
    browser.menus.update('akahuku-browser-action-popup-all', {
      // 全機能を {OFF,ON}
      title: "\u5168\u6A5F\u80FD\u3092 " + (enabled ? 'OFF' : 'ON'),
    });

    browser.menus.update('akahuku-browser-action-popup-respanel', {
      enabled: enabled && c.isAkahukuApplied && c.isReplyMode,
      checked: c.isAkahukuApplied && c.isResPanelOpened,
    });

    browser.menus.update('akahuku-browser-action-popup-apply', {
      enabled: enabled && !c.isAkahukuApplied && c.isAppliable,
    });
    browser.menus.update('akahuku-browser-action-popup-external', {
      enabled: enabled && !c.isAkahukuApplied && c.isAppliable,
    });

    return true;
  },

  /**
   * 全機能の ON／OFF を切り替える
   */
  switchDisabled : function () {
    Prefs.set({all: !Prefs.getItem('all')});
  },

  /**
   * P2P の ON／OFF を切り替える
   */
  switchP2PDisabled: function () {
    Prefs.set({p2p: !Prefs.getItem('p2p')});
  },

  /**
   * P2P ステータスバーの ON／OFF を切り替える
   */
  switchP2PStatusbarDisabled: function () {
    Prefs.set({'p2p.statusbar': !Prefs.getItem('p2p.statusbar')});
  },

  /**
   * レスパネルの表示を切り替える
   */
  switchResPanelShowing: function (info, tab) {
    let msg = {name: 'arAkahukuThread', method: 'toggleResPanel', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  /**
   * サイトを開く
   */
  openWebsite: function () {
    browser.tabs.create({
      url: 'https://toshiakisp.github.io/akahuku-firefox-sp/',
    });
  },

  /**
   * フォーカスのあるドキュメントに適用する
   */
  applyFocusedDocument: function (info, tab) {
    let msg = {name: 'arAkahukuUI', method: 'applyDocument', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  /**
   * フォーカスのあるドキュメントを外部板に追加する
   */
  addFocusedToExternalBoards: function (info, tab) {
    let msg = {
      name: 'arAkahukuUI',
      method: 'addDocumentToExternalBoards', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

};
