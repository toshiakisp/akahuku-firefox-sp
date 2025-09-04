'use strict';

var arAkahukuQuote = new AkahukuContextMenu({
  common: {
    type: 'normal',
    contexts: ['selection'],
    enabled: false,
  },
  commonUpdate: (info, tab, c) => ({
    enabled: (Prefs.getItem('all')
      && Prefs.getItem('quickquote')
      && Prefs.getItem('quickquote.menu')
    ),
  }),
});

arAkahukuQuote.menuSettings =
  [
    {
      id: "akahuku-menuitem-content-quote",
      // 引用
      title: "\u5F15\u7528",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteWithMark(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.quote'),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-mail",
      // メール欄へ
      title: "\u30E1\u30FC\u30EB\u6B04\u3078",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteToMailBox(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.mail'),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-name",
      // 名前欄へ
      title: "\u540D\u524D\u6B04\u3078",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteToNameBox(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.name'),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-comment",
      // コメントへ
      title: "\u30B3\u30E1\u30F3\u30C8\u3078",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteAsComment(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.comment'),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-separator2",
      type: "separator",
      enabled: true,
      _onUpdate: (info, tab, c) => ({
        visible: (Prefs.getItem('quickquote.menu.copy')
          && Prefs.getItem('quickquote.menu.separator')),
      }),
    },
    {
      id: "akahuku-menuitem-content-quote-copy",
      // 引用付きコピー
      title: "\u5F15\u7528\u4ED8\u304D\u30B3\u30D4\u30FC",
      onclick: (i, t) => arAkahukuQuote.onClickCopyToClipboard(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.copy'),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-separator3",
      type: "separator",
      enabled: true,
      _onUpdate: (info, tab, c) => ({
        visible: (!Prefs.getItem('floatpostform')
          && Prefs.getItem('quickquote.menu.separator')
          && Prefs.getItem('quickquote.menu.cont')),
      }),
    },
    {
      id: "akahuku-menuitem-content-quote-cont",
      // 引用 - 連続
      title: "\u5F15\u7528 - \u9023\u7D9A",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteWithMarkCont(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: (!Prefs.getItem('floatpostform')
          && Prefs.getItem('quickquote.menu.quote')
          && Prefs.getItem('quickquote.menu.cont')),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-mail-cont",
      // メール欄へ - 連続
      title: "\u30E1\u30FC\u30EB\u6B04\u3078 - \u9023\u7D9A",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteToMailBoxCont(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: (!Prefs.getItem('floatpostform')
          && Prefs.getItem('quickquote.menu.mail')
          && Prefs.getItem('quickquote.menu.cont')),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-name-cont",
      // 名前欄へ - 連続
      title: "\u540D\u524D\u6B04\u3078 - \u9023\u7D9A",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteToNameBoxCont(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: (!Prefs.getItem('floatpostform')
          && Prefs.getItem('quickquote.menu.name')
          && Prefs.getItem('quickquote.menu.cont')),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-comment-cont",
      // コメントへ - 連続
      title: "\u30B3\u30E1\u30F3\u30C8\u3078 - \u9023\u7D9A",
      onclick: (i, t) => arAkahukuQuote.onClickQuoteAsCommentCont(i, t),
      _onUpdate: (info, tab, c) => ({
        visible: (!Prefs.getItem('floatpostform')
          && Prefs.getItem('quickquote.menu.comment')
          && Prefs.getItem('quickquote.menu.cont')),
        enabled: c.isAkahukuApplied,
      }),
    },
    {
      id: "akahuku-menuitem-content-separator4",
      type: "separator",
      enabled: true,
      _onUpdate: (info, tab, c) => ({
        visible: (Prefs.getItem('quickquote.menu.google.image')
          || Prefs.getItem('quickquote.menu.wikipedia')
          || Prefs.getItem('quickquote.menu.separator')),
      }),
    },
    {
      id: "akahuku-menuitem-content-google-image",
      // イメぐぐる
      title: "\u30A4\u30E1\u3050\u3050\u308B",
      onclick: (i, t) => arAkahukuQuote.onClickGoogleImage(i, t),
      enabled: true,
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.google.image'),
      }),
    },
    {
      id: "akahuku-menuitem-content-wikipedia",
      // ウィキペドる
      title: "\u30A6\u30A3\u30AD\u30DA\u30C9\u308B",
      onclick: (i, t) => arAkahukuQuote.onClickWikipedia(i, t),
      enabled: true,
      _onUpdate: (info, tab, c) => ({
        visible: Prefs.getItem('quickquote.menu.wikipedia'),
      }),
    },
  ];

Object.assign(arAkahukuQuote, {

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

});

