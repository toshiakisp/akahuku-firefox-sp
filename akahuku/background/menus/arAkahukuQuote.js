'use strict';

var arAkahukuQuote = {

  initContextMenus: function () {
    let p = (key) => Prefs.getItem(key);
    let enableMenu
      =  p('quickquote.menu')
      && p('quickquote')
      && p('all');

    let createIf = (condition, createProps) => {
      browser.menus.remove(createProps.id);
      if (enableMenu && condition)
        browser.menus.create(createProps);
    };

    createIf(p('quickquote.menu.quote'), {
      id: "akahuku-menuitem-content-quote",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // 引用
      title: "\u5F15\u7528",
      onclick: arAkahukuQuote.onClickQuoteWithMark,
    });
    createIf(p('quickquote.menu.mail'), {
      id: "akahuku-menuitem-content-mail",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // メール欄へ
      title: "\u30E1\u30FC\u30EB\u6B04\u3078",
      onclick: arAkahukuQuote.onClickQuoteToMailBox,
    });
    createIf(p('quickquote.menu.name'), {
      id: "akahuku-menuitem-content-name",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // 名前欄へ
      title: "\u540D\u524D\u6B04\u3078",
      onclick: arAkahukuQuote.onClickQuoteToNameBox,
    });
    createIf(p('quickquote.menu.comment'), {
      id: "akahuku-menuitem-content-comment",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // コメントへ
      title: "\u30B3\u30E1\u30F3\u30C8\u3078",
      onclick: arAkahukuQuote.onClickQuoteAsComment,
    });
    createIf(p('quickquote.menu.copy') && p('quickquote.menu.separator'), {
      id: "akahuku-menuitem-content-separator2",
      type: "separator",
      contexts: ['selection'],
    });
    createIf(p('quickquote.menu.copy'), {
      id: "akahuku-menuitem-content-quote-copy",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // 引用付きコピー
      title: "\u5F15\u7528\u4ED8\u304D\u30B3\u30D4\u30FC",
      onclick: arAkahukuQuote.onClickCopyToClipboard,
    });
    createIf(!p('floatpostform') && p('quickquote.menu.separator') && p('quickquote.menu.cont'), {
      id: "akahuku-menuitem-content-separator3",
      type: "separator",
      contexts: ['selection'],
    });
    createIf(!p('floatpostform') && p('quickquote.menu.quote') && p('quickquote.menu.cont'), {
      id: "akahuku-menuitem-content-quote-cont",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // 引用 - 連続
      title: "\u5F15\u7528 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteWithMarkCont,
    });
    createIf(!p('floatpostform') && p('quickquote.menu.mail') && p('quickquote.menu.cont'), {
      id: "akahuku-menuitem-content-mail-cont",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // メール欄へ - 連続
      title: "\u30E1\u30FC\u30EB\u6B04\u3078 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteToMailBoxCont,
    });
    createIf(!p('floatpostform') && p('quickquote.menu.name') && p('quickquote.menu.cont'), {
      id: "akahuku-menuitem-content-name-cont",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // 名前欄へ - 連続
      title: "\u540D\u524D\u6B04\u3078 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteToNameBoxCont,
    });
    createIf(!p('floatpostform') && p('quickquote.menu.comment') && p('quickquote.menu.cont'), {
      id: "akahuku-menuitem-content-comment-cont",
      type: "normal",
      contexts: ['selection'],
      enabled: false, //isAkahukuApplied
      // コメントへ - 連続
      title: "\u30B3\u30E1\u30F3\u30C8\u3078 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteAsCommentCont,
    });
    createIf((p('quickquote.menu.google.image') || p('quickquote.menu.wikipedia')) && p('quickquote.menu.separator'), {
      id: "akahuku-menuitem-content-separator4",
      type: "separator",
      contexts: ['selection'],
    });
    createIf(p('quickquote.menu.google.image'), {
      id: "akahuku-menuitem-content-google-image",
      type: "normal",
      contexts: ['selection'],
      // イメぐぐる
      title: "\u30A4\u30E1\u3050\u3050\u308B",
      onclick: arAkahukuQuote.onClickGoogleImage,
    });
    createIf(p('quickquote.menu.wikipedia'), {
      id: "akahuku-menuitem-content-wikipedia",
      type: "normal",
      contexts: ['selection'],
      // ウィキペドる
      title: "\u30A6\u30A3\u30AD\u30DA\u30C9\u308B",
      onclick: arAkahukuQuote.onClickWikipedia,
    });
  },

  updateContextMenus: function (info, tab, c) {
    if (!info.contexts.includes('selection')) {
      return false;
    }
    console.log('isAkahukuApplied',c.isAkahukuApplied);

    let rules = [
      {id: 'akahuku-menuitem-content-quote',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-mail',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-name',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-comment',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-quote-cont',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-mail-cont',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-name-cont',
        update: {enabled: c.isAkahukuApplied}},
      {id: 'akahuku-menuitem-content-comment-cont',
        update: {enabled: c.isAkahukuApplied}},
      {id: "akahuku-menuitem-content-quote-copy",
        update: {enabled: c.isAkahukuApplied}},
    ];

    let updated = false;
    for (let rule of rules) {
      if (info.menuIds.includes(rule.id)) {
        browser.menus.update(rule.id, rule.update);
        updated = true;
      }
    }
    return updated;
  },

  onClickQuote: function (info, tab, addQuotePrefix, focusTextArea) {
    let msg = {
      name: 'arAkahukuQuote', method: 'quote',
      args: [addQuotePrefix, focusTextArea],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },
  onClickQuoteWithMark: function (info, tab) {
    arAkahukuQuote.onClickQuote(info, tab, true, true);
  },
  onClickQuoteAsComment: function (info, tab) {
    arAkahukuQuote.onClickQuote(info, tab, false, true);
  },
  onClickQuoteWithMarkCont: function (info, tab) {
    arAkahukuQuote.onClickQuote(info, tab, true, false);
  },
  onClickQuoteAsCommentCont: function (info, tab) {
    arAkahukuQuote.onClickQuote(info, tab, false, false);
  },

  onClickQuoteToMailBoxCore: function (info, tab, focusMailBox) {
    let msg = {
      name: 'arAkahukuQuote', method: 'quoteToMailBox',
      args: [focusMailBox],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },
  onClickQuoteToMailBox: function (info, tab) {
    arAkahukuQuote.onClickQuoteToMailBoxCore(info, tab, true);
  },
  onClickQuoteToMailBoxCont: function (info, tab) {
    arAkahukuQuote.onClickQuoteToMailBoxCore(info, tab, false);
  },

  onClickQuoteToNameBoxCore: function (info, tab, focusNameBox) {
    let msg = {
      name: 'arAkahukuQuote', method: 'quoteToNameBox',
      args: [focusNameBox],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },
  onClickQuoteToNameBox: function (info, tab) {
    arAkahukuQuote.onClickQuoteToNameBoxCore(info, tab, true);
  },
  onClickQuoteToNameBoxCont: function (info, tab) {
    arAkahukuQuote.onClickQuoteToNameBoxCore(info, tab, false);
  },

  onClickCopyToClipboard: function (info, tab) {
    let msg = {name: 'arAkahukuQuote', method: 'copyToClipboard', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  onClickGoogleImage: function (info, tab) {
    let msg = {name: 'arAkahukuQuote', method: 'googleImage', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId})
    .catch((e) => { // no content script response
      console.error(e.message);
      const urlBase = 'http://www.google.com/images?hl=ja&q=';
      browser.tabs.create({
        url: urlBase + encodeURIComponent(info.selectionText),
        active: Prefs.getItem('quickquote.focus'),
      });
    });
  },

  onClickWikipedia: function (info, tab) {
    let msg = {name: 'arAkahukuQuote', method: 'wikipedia', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId})
    .catch((e) => { // no content script response
      console.error(e.message);
      const urlBase = 'http://ja.wikipedia.org/wiki/%E7%89%B9%E5%88%A5:Search?search=';
      const urlEnd = '&go=%E8%A1%A8%E7%A4%BA';
      browser.tabs.create({
        url: urlBase + encodeURIComponent(info.selectionText) + urlEnd,
        active: Prefs.getItem('quickquote.focus'),
      });
    });
  },

};

