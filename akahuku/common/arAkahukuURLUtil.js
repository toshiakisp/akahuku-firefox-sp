
/* global Prefs */

var arAkahukuURLUtil = {
  protocolHandler : {
    // Dummy definitions
    enAkahukuURI: function (type, uri) {
      if (type == 'local') {
        if (uri.startsWith('chrome://akahuku/content/')) {
          // Convert to web_accessible_resource (moz-extension://)
          return browser.extension.getURL(uri.substring(17));
        }
      }
      return uri;
    },
    isAkahukuURI: function (uri) {
      return false;
    },
    getAkahukuURIParam: function (uri) {
      return {};
    },
  },

  get enableExternal() {
    return Prefs.getItem('board_external');
  },
  _externalList: null,
  get externalList() {
    if (this._externalList === null) {
      // lazy init & start observing
      const prefName = 'board_external.patterns2';
      this._setExternalList(Prefs.getItem(prefName));
      Prefs.onChanged.addListener((updates) => {
        if (prefName in updates) {
          this._setExternalList(updates[prefName]);
        }
      });
    }
    return this._externalList;
  },

  _setExternalList: function (value) {
    if (value != 'null') {
      this._externalList = JSON.parse(unescape(value));
      while (this._externalList.length
             && this._externalList[0] == undefined) {
        this._externalList.shift();
      }
      for (let item of this._externalList) {
        if (!item.prefix)
          item.pattern = new RegExp(item.pattern);
      }
    }
    else {
      this._externalList = [];
    }
  },

  /**
   * 適用するかどうかを取得する
   *
   * @param  String href
   *         アドレス
   * @return Boolean
   *         適用するかどうか
   */
  getNeedApply : function (href) {
    if (href.match
        (/^https?:\/\/([^\/]+\/)?(tmp|up|img|cgi|zip|dat|may|nov|jun|dec|ipv6)\.2chan\.net(:[0-9]+)?\/([^\/]+)\//)
        || href.match
        (/^https?:\/\/([^\/]+\/)?(www)\.2chan\.net(:[0-9]+)?\/(h|oe|b|30|31|51|junbi|hinan)\//)) {
      // ふたばの板
      if (href.match (/\.2chan\.net(:[0-9]+)?\/bin\//)) {
        // 広告用リソースなど
        return false;
      }
      return true;
    }

    if (this.protocolHandler.isAkahukuURI (href)) {
      var p = this.protocolHandler.getAkahukuURIParam (href);
      if (p.type == "cache"
          || p.type == "filecache") {
        var href2 = p.original;
        if (href2.match
            (/^https?:\/\/([^\/]+\/)?(tmp|up|img|cgi|zip|dat|may|nov|jun|dec|ipv6)\.2chan\.net(:[0-9]+)?\/([^\/]+)\//)
            || href2.match
            (/^https?:\/\/([^\/]+\/)?(www)\.2chan\.net(:[0-9]+)?\/(h|oe|b|30|31|51|junbi|hinan)\//)) {
          /* ふたばの板のキャッシュ */
          return true;
        }
      }
    }

    if (href.match
        (/^https?:\/\/appsweets\.net\/catalog\/dat\/(view\.php\?mode=cat2?)/)
        || href.match
        (/^https?:\/\/www\.nijibox4\.com\/akahuku\/catalog\/dat\/(view\.php\?mode=cat2?)/)
        || href.match
        (/^https?:\/\/www\.nijibox\.com\/futaba\/catalog\/img\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      return true;
    }

    if (/^https?:\/\/appsweets\.net\/tatelog\/(?:dat|img)\/thread\/[0-9]+$/.test (href)) {
      // タテログのログ
      return false; //まだ自動適用は無し
    }

    if (href.match
        (/^https?:\/\/(?:[^\.\/]+\.)?tsumanne\.net\/[a-z]+\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/)) {
      /* サッチー */
      return true;
    }

    /* 避難所 patch */
    if (this.enableExternal) {
      var href2 = href;
      if (this.protocolHandler.isAkahukuURI (href)) {
        var p = this.protocolHandler.getAkahukuURIParam (href);
        if (p.type == "cache" || p.type == "filecache") {
          href2 = p.original;
        }
      }
      for (let i = 0; i < this.externalList.length; i ++) {
        if (this.externalList[i].prefix) {
          if (href2.indexOf (this.externalList[i].pattern)
              == 0) {
            return true;
          }
        }
        else {
          if (href2.match (this.externalList[i].pattern)) {
            return true;
          }
        }
      }
    }

    return false;
  },

  /**
   * 外部板に追加できるか
   */
  isAbleToAddExternal : function (href) {
    try {
      var base = String (href);

      base = base
      .replace (/\/res\/([0-9]+)\.html?$/, "/")
      .replace (/\/(([^\.\/]+)\.php)?([#\?].*)?$/, "/")
      .replace (/\/(([^\.\/]+)\.html?)?([#\?].*)?$/, "/");

      if (!/\/$/.test (base)) {
        return false;
      }

      return true;
    }
    catch (e) {
      return false;
    }
  },

};

