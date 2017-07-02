
/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter,
 *          (arAkahukuDocumentParam), arAkahukuDOM, arAkahukuP2P,
 *          arAkahukuWindow, arAkahukuBoard,
 *          arAkahukuUtil, arAkahukuTitle,
 */

/**
 * レスパネル管理データ
 */
function arAkahukuResPanelParam () {
}
arAkahukuResPanelParam.prototype = {
  frame : null,
  content : null,
  header: null,
  resizer: null,
  scroll : null,
  bar : null,
    
  mousedown : 0,
  lastX : 0,
  lastY : 0,
    
  width : 480,
  height: 320,
  left : 32,
  top : 32,
    
  offset : 1,
  bartop : 0,
    
  diff : 0,
    
  startLeft : 0,
  startTop : 0,
  startWidth : 0,
  startHeight: 0,
  startBartop : 0,
    
  res : null,
    
  /**
   * データを開放する
   */
  destruct : function () {
    this.frame = null;
    this.header = null;
    this.resizer = null;
    this.scroll = null;
    this.bar = null;
  }
};
/**
 * 最後のレスの情報
 *
 * @param  Object container
 *         コンテナ
 * @param  Number num
 *         最後のレスのレス番号
 */
function arAkahukuLastReplyInfo (container, num) {
  this.container = container;
  this.num = num;
}
arAkahukuLastReplyInfo.prototype = {
  container : null, /* Object  最後のレスのコンテナ */
  num : null        /* Number  最後のレスのレス番号 */
};
/**
 * スレッド管理データ
 */
function arAkahukuThreadParam (targetDocument) {
  this.stylesSaved = new Array ();
  this.targetDocument = targetDocument;
}
arAkahukuThreadParam.prototype = {
  stylesSaved : null, /* String mht で保存する際に復帰させるスタイル */
  targetDocument : null,

  saveStyle : function (styleNode)
  {
    var ss = {
      type: styleNode.getAttribute ("type"),
      media: styleNode.getAttribute ("media"),
      title: styleNode.getAttribute ("title"),
      disabled: styleNode.getAttribute ("disabled"),
      text: styleNode.innerHTML,
    };
    this.stylesSaved.push (ss);
  },
  clearSavedStyles : function ()
  {
    this.stylesSaved.splice (0);
  },
  restoreSavedStyles : function (targetDocument)
  {
    var head = targetDocument.getElementsByTagName ("head") [0];
    var ss, style;
    while (this.stylesSaved.length > 0) {
      ss = this.stylesSaved.shift ();
      style = targetDocument.createElement ("style");
      style.textContent = ss.text;
      if (ss.type) style.setAttribute ("type", ss.type);
      if (ss.media) style.setAttribute ("media", ss.media);
      if (ss.title) style.setAttribute ("title", ss.title);
      if (ss.disabled) style.setAttribute ("disabled", ss.disabled);
      head.appendChild (style);
    }
  },

  /**
   * タブ間連携用オブザーバー登録
   */
  registerObserver : function () {
    var os
    = Components.classes ["@mozilla.org/observer-service;1"]
    .getService (Components.interfaces.nsIObserverService);
    os.addObserver (this, "arakahuku-thread-replynum-changed", false);
    this._observing = true;
  },
  unregisterObserver : function () {
    if (!this._observing) return;
    try {
      var os
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
      os.removeObserver (this, "arakahuku-thread-replynum-changed", false);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
  /**
   * nsIObserver.observe
   */
  observe : function (subject, topic, data) {
    try {
      switch (topic) {
        case "arakahuku-thread-replynum-changed":
          subject.QueryInterface (Components.interfaces.nsISupportsString);
          var decoded = JSON.parse (subject.data);
          this.onNotifiedThreadReplyNumChanged (decoded);
          break;
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
  /**
   * レス数変更通知
   *   (see arAkahukuThread.asyncNotifyReplyNumber)
   */
  onNotifiedThreadReplyNumChanged : function (data) {
    var param = Akahuku.getDocumentParam (this.targetDocument);
    var info = param.location_info;
    if (info.server != data.server ||
        info.dir != data.dir ||
        info.threadNumber != data.threadNumber) {
      // 他のスレの通知
      return;
    }
    if (info.replyCount < data.replyCount) {
      var delta = (data.replyCount - info.replyCount);
      if (info.incomingReply < delta) {
        // レス増加数を更新しタイトル再設定
        info.incomingReply = delta;
        if (arAkahukuTitle.enable) {
          arAkahukuTitle.setTitle (this.targetDocument, info);
        }
      }
    }
  },

  /**
   * データを開放する
   */
  destruct : function () {
    this.stylesSaved = null;
    this.targetDocument = null;
    this.unregisterObserver ();
  }
};
/**
 * スレッド管理
 *   [返信] リンクを新しいタブで開く]、[ページ末尾に [掲示板に戻る] を付ける]
 *   [[カタログ] リンクを新しいタブで開く]
 *   [末尾のステータスを表示]、[レス番号を n まで振る]
 */
var arAkahukuThread = {
  enableTabIcon : false,     /* Boolean  タブのアイコンを変更する */
  enableTabIconSize : false, /* Boolean  サイズを n px にする */
  tabIconSizeMax : 24,       /* Number   サイズ [px]  */
  enableTabIconAsFavicon : false,   /* Boolean  favicon として登録する */
    
  enableReloadOnBottom : false,     /* Boolean  通常モード末尾に
                                     *   リロードボタン */
  enableNewTab : false,             /* Boolean  [返信] リンクを新しいタブで
                                     *   開く */
  enableDelInline : false,          /* Boolean  del フォームを
                                     *   インラインで開く */
  enableDelNewTab : false,          /* Boolean  del を新しいタブで開く */
  enableBackOnBottom : false,       /* Boolean  ページの末尾に [掲示板に戻る]
                                     *   を付ける */
  enableBackNew : false,            /* Boolean  [掲示板に戻る] リンクを
                                     *   新しいタブで開く */
  enableCatalogOnBottom : false,    /* Boolean  ページの末尾に [カタログ]
                                     *   を付ける */
  enableCatalogNew : false,         /* Boolean  [カタログ] リンクを
                                     *   新しいタブで開く */
  enableNumbering : false,          /* Boolean  レス番号を n まで振る */
  numberingMax : 100,               /* Number  n まで */
  enableBottomStatus : false,       /* Boolean  末尾にステータス表示 */
  enableBottomStatusDiff : false,   /* Boolean  スレが消えるまでの時間を表示 */
  enableBottomStatusHidden : false, /* Boolean  非表示になったレス数を表示 */
  enableBottomStatusNum : false,    /* Boolean  スレ番号 + 保持数 - 最終レス番号
                                     *   を表示 */
  enableBottomStatusNumRandom : false,  /* Boolean  ランダム */
  enableBottomStatusNumShort : false,   /* Boolean  短かいのだけ */
  enableBottomStatusNumEntire : false,  /* Boolean  板全体の最新レスを
                                         *   反映する */
    
  enableCuteFont : false, /* Boolean  フォント変更 */
  cuteFontFamily : "",    /* String  フォント名 */
    
  enableStyleIgnoreDefault : false,     /* Boolean  デフォルトのスタイルを
                                         *   無視する */
  enableStyleIgnoreDefaultFont : false, /* Boolean  文字のサイズを
                                         *   n pt にする */
  styleIgnoreDefaultFontSize : false,   /* Number n pt */
  enableStyleIgnoreDefaultMinumumRes : true, /* Boolean  最低限のレスのスタイルを追加 */
    
  enableReplyLimitWidth : false,     /* Boolean  横長のレスを途中で消す */
  enableReplyAvoidWrap : false,      /* Boolean  Firefox 3 で不要な折り返しを
                                      *   回避する */
  enableReplyMarginBottom : false,   /* Boolean  レスの下にマージンをとる */
  enableReplyNoMarginTop : false,    /* Boolean  レスの上のマージンを消す */
  enableReplyNoMarginBottom : false, /* Boolean  レスの下のマージンを消す */
    
  enableAlertGIF : false, /* Boolean  GIF 画像を赤字で表示 */

  enableStyleBodyFont : false, /* Boolean  基準となる文字のサイズを n pt にする */
  styleBodyFontSize : false,   /* Number n pt */
    
  maxImageRetries : 0,  /* Number エラー画像の再試行回数 */
    
  enableMoveButton : false, /* Boolean  前後に移動ボタン */
    
  /**
   * 初期化処理
   */
  initForXUL : function () {
    /* タブの移動のイベントを監視 */
    window.addEventListener
    ("TabMove",
     function () {
      arAkahukuThread.onTabMove (arguments [0]);
    }, true);
  },

  /**
   * ドキュメントのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  setStyle : function (style, targetDocument, info) {
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param;
    if (!("thread_param" in documentParam)) {
      documentParam.thread_param = new arAkahukuThreadParam (targetDocument);
    }
    param = documentParam.thread_param;
    if (arAkahukuThread.enableStyleIgnoreDefault) {
      /* デフォルトのスタイルを無視する */
      var nodes = targetDocument.getElementsByTagName ("style");
      for (var i = 0; i < nodes.length;) {
        if (nodes [i].innerHTML.indexOf ("layer-background-color")
            == -1) {
          /* 双助の style 要素 */
          param.saveStyle (nodes [i]);
          nodes [i].parentNode.removeChild (nodes [i]);
        }
        else {
          i ++;
        }
      }
            
      if (arAkahukuThread.enableStyleIgnoreDefaultFont) {
        style
        .addRule ("*",
                  "font-size:"
                  + arAkahukuThread.styleIgnoreDefaultFontSize
                  + "pt;");
      }

      if (arAkahukuThread.enableStyleIgnoreDefaultMinumumRes) {
        // 2016/05/31レイアウトでは無視すると崩れすぎるレスのスタイルを追加
        style
        .addRule ("td.rtd",
                  "background-color: #F0E0D6;")
        .addRule ("td.rts",
                  "text-align: right;"
                  +"vertical-align: top;");
      }
            
      style.addRule ("a:hover",
                     "color: #dd0000;");
    }
        
    /* 掲示板に戻るのリンク */
    if (arAkahukuThread.enableBackNew) {
      style
      .addRule ("span.akahuku_thread_back_new",
                "font-size: 9pt;");
    }
        
    if (info.isNormal || info.isReply) {
      /* 通常モード、レス送信モード共通 */
            
      if (arAkahukuThread.enableMoveButton) {
        style
        .addRule ("a.akahuku_move_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_move_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;");
      }
            
      /* カタログのリンク */
      if (arAkahukuThread.enableCatalogNew) {
        style
        .addRule ("span.akahuku_thread_catalog_new",
                  "font-size: 9pt;")
      }
            
      /* レス番号 */
      if (arAkahukuThread.enableNumbering) {
        style
        .addRule ("span.akahuku_replynumber",
                  "font-size: 10pt; "
                  + "margin-left: 4px");
      }
      /* 末尾のステータス */
      if (arAkahukuThread.enableBottomStatus) {
        style
        .addRule ("span.akahuku_bottom_status_number",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("span.akahuku_bottom_status_viewer",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("span.akahuku_bottom_status_expire",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("span.akahuku_bottom_status_expire_diff",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("span.akahuku_bottom_status_expire_num",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("span.akahuku_bottom_status_delcount",
                  "font-size: 10pt; "
                  + "color: #f00000; "
                  + "vertical-align: text-bottom;")
        .addRule ("span.akahuku_bottom_status_alert",
                  "font-size: 9pt; "
                  + "color: #f00000; "
                  + "background-color: inherit;");
      }
      
      if (!info.isFutaba || info.isFutasuke) {
        /* ユーザースタイルシートが効かないので指定しなおす */
        var s;
                
        if (arAkahukuThread.enableCuteFont) {
          s
            = " font-family: "
            + arAkahukuThread.cuteFontFamily + "; ";
          
          style
            .addRule ("blockquote", s);
          style
            .addRule ("div.t", s);
          style
            .addRule ("div.akahuku_popup_content_blockquote", s);
        }
                
        s = "";
        if (arAkahukuThread.enableReplyMarginBottom) {
          s += "margin-bottom: 1em;";
        }
        if (arAkahukuThread.enableReplyNoMarginTop) {
          s += "margin-top: 0em;";
        }
        if (arAkahukuThread.enableReplyNoMarginBottom) {
          s += "margin-bottom: 0em;";
        }
        if (s) {
          style
          .addRule ("blockquote", s);
          style
          .addRule ("div.t", s);
          style
          .addRule ("div.akahuku_popup_content_blockquote", s);
        }
        
        if (arAkahukuThread.enableReplyLimitWidth) {
          /* 避難所 patch */
          if (info.isMonaca) {
            style
            .addRule ("body > form > table",
                      "display: table;"
                      + "overflow: visible;")
            .addRule ("#d7 > blockquote",
                      "overflow: -moz-hidden-unscrollable;")
            .addRule ("#threadsbox > table",
                      "display: block; "
                      + "overflow: -moz-hidden-unscrollable;");
          }
          else {
            style
            .addRule ("body > form > blockquote",
                      "overflow: -moz-hidden-unscrollable;")
            .addRule ("body > form > div.t",
                      "overflow: -moz-hidden-unscrollable;")
            .addRule ("body > form > table",
                      "display: block; "
                      + "overflow: -moz-hidden-unscrollable;")
            .addRule ("body > form > div.r",
                      "overflow: -moz-hidden-unscrollable;")
          }
          
          style
          .addRule ("img",
                    "position: relative; "
                    + "z-index: 99;");
          /* -moz-hidden-unscrollable を設定すると
           *  z-index が img より上になってクリックできなくなるので
           * スレ画像の img の z-index をさらに上にする */
        }
      }
    }
        
    if (info.isReply) {
      /* レス送信モード */
      if (arAkahukuThread.enableBackOnBottom
          || arAkahukuThread.enableCatalogOnBottom) {
        style
        .addRule ("#akahuku_links_on_bottom",
                  "float: left;");
      }
    }
  },
    
  /**
   * スタイルファイルのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  setStyleFile : function (style) {
    var s;
    if (arAkahukuThread.enableCuteFont) {
      var font;
      font
        = arAkahukuConverter.convertToUTF8
        (arAkahukuThread.cuteFontFamily);
      s = "font-family: " + font + ";";
            
      style
        .addRule ("blockquote", s);
      style
        .addRule ("div.t", s);
      style
        .addRule ("div.akahuku_popup_content_blockquote", s);
    }

    if (arAkahukuThread.enableStyleBodyFont) {
      s = "font-size:" + arAkahukuThread.styleBodyFontSize + "pt !important;"
      style.addRule ("body", s);
    }
        
    var s = "";
    if (arAkahukuThread.enableReplyMarginBottom) {
      s += "margin-bottom: 1em;";
    }            
    if (arAkahukuThread.enableReplyNoMarginTop) {
      s += "margin-top: 0em;";
    }
    if (arAkahukuThread.enableReplyNoMarginBottom) {
      s += "margin-bottom: 0em;";
    }
        
    if (s) {
      style
      .addRule ("blockquote", s);
      style
      .addRule ("div.t", s);
      style
      .addRule ("div.akahuku_popup_content_blockquote", s);
    }
            
    if (arAkahukuThread.enableReplyLimitWidth) {
      style
      .addRule ("body > form > blockquote",
                "overflow: -moz-hidden-unscrollable;")
      .addRule ("body > form > div.t",
                "overflow: -moz-hidden-unscrollable;")
      .addRule ("body > form > table",
                "display: block;"
                + "overflow: -moz-hidden-unscrollable;")
      .addRule ("body > form > div.r",
                "overflow: -moz-hidden-unscrollable;")
    }
        
    if (arAkahukuThread.enableReplyLimitWidth) {
      style
      .addRule ("img",
                "position: relative; z-index: 99;");
      /* -moz-hidden-unscrollable を設定すると
       *  z-index が img より上になってクリックできなくなるので
       * スレ画像の img の z-index をさらに上にする */
    }
  },
    
  /**
   * スタイルファイルのスタイルを解除する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  resetStyleFile : function (style) {
    if (arAkahukuThread.enableCuteFont) {
      var s = "font-family: inherit;";
            
      style
      .addRule ("blockquote", s);
      style
      .addRule ("div.t", s);
      style
      .addRule ("div.akahuku_popup_content_blockquote", s);
    }
        
    if (arAkahukuThread.enableReplyMarginBottom
        || arAkahukuThread.enableReplyNoMarginTop
        || arAkahukuThread.enableReplyNoMarginBottom) {
      var s = "margin: 1em 40px;";
            
      style
      .addRule ("blockquote", s);
      style
      .addRule ("div.t", s);
      style
      .addRule ("div.akahuku_popup_content_blockquote", s);
    }
        
    if (arAkahukuThread.enableReplyLimitWidth) {
      style
      .addRule ("body > form",
                "overflow: visible;");
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuThread.enableTabIcon
    = arAkahukuConfig
    .initPref ("bool", "akahuku.tabicon", true);
    if (arAkahukuThread.enableTabIcon) {
      arAkahukuThread.enableTabIconSize
        = arAkahukuConfig
        .initPref ("bool", "akahuku.tabicon.size", true);
      arAkahukuThread.tabIconSizeMax
        = arAkahukuConfig
        .initPref ("int",  "akahuku.tabicon.size.max", 24);
      arAkahukuThread.enableTabIconAsFavicon
        = arAkahukuConfig
        .initPref ("bool", "akahuku.tabicon.asfavicon", false);
    }
        
    arAkahukuThread.enableReloadOnBottom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reload_on_bottom", false);
    
    arAkahukuThread.enableNewTab
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.newtab", false);
    arAkahukuThread.enableDelNewTab
    = arAkahukuConfig
    .initPref ("bool", "akahuku.del.newtab", false);
    arAkahukuThread.enableDelInline
    = arAkahukuConfig
    .initPref ("bool", "akahuku.del.inline", false);
    
    if (arAkahukuThread.enableDelInline) {
      arAkahukuThread.enableDelNewTab = true;
    }
    
    arAkahukuThread.enableBackOnBottom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.back_on_bottom", false);
    arAkahukuThread.enableBackNew
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.back_new", false);
    arAkahukuThread.enableCatalogOnBottom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.catalog_on_bottom", false);
    arAkahukuThread.enableCatalogNew
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.catalog_new", false);
        
    arAkahukuThread.enableNumbering
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.numbering", true);
    if (arAkahukuThread.enableNumbering) {
      arAkahukuThread.numberingMax
        = arAkahukuConfig
        .initPref ("int",  "akahuku.thread.numbering.max", 100);
    }
    arAkahukuThread.enableMoveButton
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.move_button", false);
    arAkahukuThread.enableBottomStatus
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status", true);
    arAkahukuThread.enableBottomStatusDiff
    = arAkahukuThread.enableBottomStatus && arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status.diff", false);
    arAkahukuThread.enableBottomStatusHidden
    = arAkahukuThread.enableBottomStatus && arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status.hidden", false);
    arAkahukuThread.enableBottomStatusNum
    = arAkahukuThread.enableBottomStatus && arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status.num", false);
    arAkahukuThread.enableBottomStatusNumRandom
    = arAkahukuThread.enableBottomStatusNum && arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status.num.random", true);
    arAkahukuThread.enableBottomStatusNumShort
    = arAkahukuThread.enableBottomStatusNum && arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status.num.short", false);
    arAkahukuThread.enableBottomStatusNumEntire
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread.bottom_status.num.entire", false);
    arAkahukuThread.enableCuteFont
    = arAkahukuConfig
    .initPref ("bool", "akahuku.cutefont", false);
    arAkahukuThread.cuteFontFamily
    = unescape
    (arAkahukuConfig
     .initPref ("char", "akahuku.cutefont.family",
                escape
                ("\"\u3053\u3068\u308A\u3075\u3049\u3093\u3068\","
                 + " \"\u3042\u304F\u3042\u30D5\u30A9\u30F3\u30C8\"")));
        
    arAkahukuThread.enableStyleIgnoreDefault
    = arAkahukuConfig
    .initPref ("bool", "akahuku.style.ignore_default", false);
    if (arAkahukuThread.enableStyleIgnoreDefault) {
      arAkahukuThread.enableStyleIgnoreDefaultFont
        = arAkahukuConfig
        .initPref ("bool", "akahuku.style.ignore_default.font", false);
      if (arAkahukuThread.enableStyleIgnoreDefaultFont) {
        arAkahukuThread.styleIgnoreDefaultFontSize
          = arAkahukuConfig
          .initPref ("int", "akahuku.style.ignore_default.font.size",
                     12);
        if (arAkahukuThread.styleIgnoreDefaultFontSize < 8) {
          arAkahukuThread.styleIgnoreDefaultFontSize = 8;
        }
        if (arAkahukuThread.styleIgnoreDefaultFontSize > 24) {
          arAkahukuThread.styleIgnoreDefaultFontSize = 24;
        }
      }

      arAkahukuThread.enableStyleIgnoreDefaultMinumumRes
        = arAkahukuConfig
        .initPref ("bool", "akahuku.style.ignore_default.minimum_res", true);
    }

    arAkahukuThread.enableStyleBodyFont
      = arAkahukuConfig
      .initPref ("bool", "akahuku.style.body_font", false);
    if (arAkahukuThread.enableStyleBodyFont) {
      arAkahukuThread.styleBodyFontSize
        = arAkahukuConfig
        .initPref ("int", "akahuku.style.body_font.size",
                   12);
      if (arAkahukuThread.styleBodyFontSize < 8) {
        arAkahukuThread.styleBodyFontSize = 8;
      }
      if (arAkahukuThread.styleBodyFontSize > 24) {
        arAkahukuThread.styleBodyFontSize = 24;
      }
    }
    if (arAkahukuThread.enableStyleIgnoreDefaultFont) {
      arAkahukuThread.enableStyleBodyFont = false;
    }
        
    arAkahukuThread.enableReplyLimitWidth
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reply.limitwidth", true);
    arAkahukuThread.enableReplyAvoidWrap
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reply.avoidwrap", false);
    arAkahukuThread.enableReplyMarginBottom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reply.marginbottom", false);
    arAkahukuThread.enableReplyNoMarginTop
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reply.nomargintop", false);
    arAkahukuThread.enableReplyNoMarginBottom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reply.nomarginbottom", false);
    arAkahukuThread.enableAlertGIF
    = arAkahukuConfig
    .initPref ("bool", "akahuku.alertgif", false);
    arAkahukuThread.maxImageRetries
    = arAkahukuConfig
    .initPref ("int", "akahuku.ext.maximageretries", 0);
  },

  /**
   * 無視したデフォルトのスタイルを復元する
   * (enableStyleIgnoreDefault 設定)
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLDocument optAppendDocument
   *         追加する対象のドキュメント(省略時はtargetDocumentに復元)
   */
  restoreIgnoredStyles : function (targetDocument, optAppendDocument)
  {
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param = documentParam.thread_param;
    param.restoreSavedStyles (optAppendDocument || targetDocument);
    param.clearSavedStyles ();
  },
    
  /**
   * 最後のレスを取得する
   *   [続きを読む]
   *   [レスの送信時に最新位置へ]
   *   [レス送信モードでリロード時に最新位置へ]
   *   の 3 つから呼び出される
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @return arAkahukuLastReplyInfo
   *           最後のレスの情報
   *           取得できなければ null
   */
  getLastReply : function (targetDocument) {
    var node;
    var nodes = Akahuku.getMessageBQ (targetDocument);
    if (nodes && nodes.length > 0) {
      node = nodes [nodes.length - 1];
      
      var container = Akahuku.getMessageContainer (node);
      var num = Akahuku.getMessageNum (node);
      
      return new arAkahukuLastReplyInfo (container, num);
    }
    return null;
  },
    
  /**
   * 現在のレス数を取得
   *   [続きを読む]
   *   から呼び出される
   *
   * @param  HTMLDocument targetDocument 
   *         対象のドキュメント
   */
  updateReplyNumber : function (targetDocument) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var nodes = Akahuku.getMessageBQ (targetDocument);
    info.replyCount = info.replyFrom - 1 + nodes.length - 1;

    // 新着レス数をリセット
    info.incomingReply = 0;

    // 他のタブに通知
    arAkahukuThread.asyncNotifyReplyNumber (info, info.threadNumber, info.replyCount);
  },

  /**
   * 現在のレス数を表示
   *   [続きを読む]
   *   からも呼び出される
   *
   * @param  HTMLDocument targetDocument 
   *         対象のドキュメント
   */
  displayReplyNumber : function (targetDocument) {
    var elements = [
      "akahuku_bottom_status_number",
      "akahuku_throp_number"
      ];
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    for (var i = 0; i < elements.length; i ++) {
      var element = targetDocument.getElementById (elements [i]);
      if (element) {
        arAkahukuDOM.setText (element, info.replyCount);
      }
    }
  },
    
  /**
   * 返信のテーブルの最初の文字を取得する
   *   [続きを読む]
   *   からも呼び出される
   *
   * @param  Object container
   *         取得に用いるコンテナ
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  updateReplyPrefix : function (container, info) {
    if (info.replyPrefix == "") {
      /* 避難所 patch */
      if (info.isMonaca) {
        var table = arAkahukuDOM.findParentNode (container.main, "table");
        if (table) {
          var cells = table.getElementsByTagName ("th");
          if (cells [0]) {
            info.replyPrefix
              = arAkahukuDOM.getInnerText (cells [0]);
          }
          else {
            info.replyPrefix = "\u2026";
          }
        }
      }
      else {
        var table = arAkahukuDOM.findParentNode (container.main, "table");
        if (table) {
          cells = table.getElementsByTagName ("td");
          if (cells [0]) {
            info.replyPrefix
              = arAkahukuDOM.getInnerText (cells [0]);
          }
          else {
            info.replyPrefix = "\u2026";
          }
        }
        else {
          info.replyPrefix = "\u2026";
        }
      }
      
      var tbc
      = container.main.ownerDocument
      .getElementById ("akahuku_bottom_container");
      if (tbc) {
        var td = tbc.getElementsByTagName ("td") [0];
        
        var tmp = arAkahukuConverter.unescapeEntity (info.replyPrefix);
        arAkahukuDOM.setText (td, tmp);
      }
    }
  },
    
  /**
   * レスが増えた時の 「ここから〜」 を作る
   *   [続きを読む]
   *   [レスの送信時に最新位置へ]
   *   [レス送信モードでリロード時に最新位置へ]
   *   の 3 つから呼び出される
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean zeroheight
   *         ズレないようにするか
   * @param  Boolean useRandom
   *         ランダム
   * @return HTMLDivElement
   *         「ここから〜」 を含む div 要素
   */
  createNewReplyHeader : function (targetDocument, zeroheight, useRandom) {
    var container = null;
    if (zeroheight) {
      container = targetDocument.createElement ("span");
      container.style.border = "2px solid #eeaa88";
      container.style.position = "relative";
      container.style.padding = "4px";
      container.style.top = "-7pt";
      container.style.left = "-8pt";
      container.style.fontSize = "10pt";
      container.style.lineHeight = "normal"; //避難所対策
      container.style.color = "#800000";
      container.style.backgroundColor = "#ffffee";
    }
    else {
      container = targetDocument.createElement ("div");
      container.id = "akahuku_new_reply_header";
      container.style.fontSize = "9pt";
      container.style.borderTop = "1px solid #eeaa88";
      container.style.margin = "8px 0 8px 0";
      container.style.padding = "4px 0 4px 0";
    }
        
    var span;
        
    var newReplyPS = arAkahukuThread.getNewReplyPrefixSuffix (useRandom);
        
    span = targetDocument.createElement ("span");
    span.className = "akahuku_status_suffix";
    span.appendChild (targetDocument.createTextNode
                      (newReplyPS [0]));
    container.appendChild (span);
        
    var span = targetDocument.createElement ("span");
    span.id = "akahuku_new_reply_header_number";
    container.appendChild (span);
        
    span = targetDocument.createElement ("span");
    span.className = "akahuku_status_suffix";
    span.appendChild (targetDocument.createTextNode
                      (newReplyPS [1]));
    container.appendChild (span);
        
    if (zeroheight) {
      var div = targetDocument.createElement ("div");
      div.id = "akahuku_new_reply_header";
      div.style.margin = "0px 0px 0px 20px";
      div.style.padding = "0px";
      div.style.height = "0px";
            
      var div2 = targetDocument.createElement ("div");
      div2.style.borderTop = "2px solid #eeaa88";
      div2.style.position = "relative";
      div2.style.zOrder = "90";
      div2.style.top = "-1pt";
      div2.style.left = "0pt";
      div2.style.margin = "0px";
      div2.style.padding = "0px";
      div2.style.height = "0px";
      div2.style.fontSize = "9pt";
      div2.style.textAlign = "right";
            
      div2.appendChild (container);
      div.appendChild (div2);
            
      container = div;
    }
            
    return container;
  },
    
  /**
   * スレの消滅情報、[続きを読む] のコンテナを作る
   *
   * @param  Boolean id
   *         id を振るかどうか
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   * @return HTMLTableElement
   *         コンテナの table 要素
   */
  createThreadBottomContainer : function (id, targetDocument, info) {
    var table = targetDocument.createElement ("table");
    var tbody = targetDocument.createElement ("tbody");
    var tr = targetDocument.createElement ("tr");
        
    table.style.margin = "0";
    table.appendChild (tbody);
    tbody.appendChild (tr);
        
    var td = targetDocument.createElement ("td");
    td.style.paddingTop = "0";
    td.style.visibility = "hidden";
    if (id) {
      td.id = "akahuku_bottom_container_head";
    }
    if (info.replyPrefix != "") {
      var tmp = arAkahukuConverter.unescapeEntity (info.replyPrefix);
      arAkahukuDOM.setText (td, tmp);
    }
    tr.appendChild (td);
        
    td = targetDocument.createElement ("td");
    td.style.paddingTop = "0";
    td.style.backgroundColor = "inherit"; // 避難所 patch
    tr.appendChild (td);
    
    if (id) {
      table.id = "akahuku_bottom_container";
    }
        
    return table;
  },
    
  /**
   * スレの消滅情報を作る
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Number threadNumber
   *         スレ番号
   * @param  Number lastReplyNumber
   *         最終レス番号
   * @param  Number number
   *         レス数
   * @param  String expire
   *         消滅時刻
   * @param  String expireWarning
   *         消滅情報
   * @param  Boolean isDel
   *         del (スレに対する削除依頼が出ているかどうか)
   * @param  Boolean id
   *         id を付けるかどうか
   * @return HTMLDivElement
   *         スレの消滅情報を含む div 要素
   */
  createThreadStatus : function (targetDocument, threadNumber,
                                 lastReplyNumber,
                                 number, expire, expireWarning,
                                 isDel, id) {
    if (number == -1) {
      var nodes = Akahuku.getMessageBQ (targetDocument);
      number = nodes.length - 1;
    }
        
    var div = targetDocument.createElement ("div");
    if (id) {
      div.id = "akahuku_bottom_status";
      if (expire == "") {
        var node
          = targetDocument
          .getElementById ("akahuku_thread_deletetime");
        if (node) {
          expire = node.innerHTML;
        }
      }
    }
        
    expire = expire.replace (/\u9803\u6D88\u3048\u307E\u3059/, "");
        
    var span;
    span = targetDocument.createElement ("span");
    if (id) {
      span.id = "akahuku_bottom_status_number";
    }
    span.className = "akahuku_bottom_status_number";
    span.appendChild (targetDocument.createTextNode (number));
    div.appendChild (span);
        
    if (id && arAkahukuThread.enableBottomStatusHidden) {
      span = targetDocument.createElement ("span");
      span.id = "akahuku_bottom_status_number_hidden";
      span.className = "akahuku_bottom_status_number";
      span.appendChild (targetDocument.createTextNode (""));
      div.appendChild (span);
    }
        
    span = targetDocument.createElement ("span");
    span.className = "akahuku_status_suffix";
    span.appendChild (targetDocument.createTextNode
                      ("\u30EC\u30B9"));
    div.appendChild (span);
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    if (info.isReply && info.viewer) {
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.appendChild (targetDocument.createTextNode
                        (" \uFF0F "));
            
      div.appendChild (span);
      span = targetDocument.createElement ("span");
      if (id) {
        span.id = "akahuku_bottom_status_viewer";
      }
      span.className = "akahuku_bottom_status_viewer";
      span.appendChild (targetDocument.createTextNode (info.viewer));
      div.appendChild (span);
            
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.appendChild (targetDocument.createTextNode
                        ("\u4EBA\u304F\u3089\u3044"));
      div.appendChild (span);
    }
        
    var expireNum
    = arAkahukuThread.getExpireNum (targetDocument, info,
                                    threadNumber, lastReplyNumber);
    if (expire
        || (arAkahukuThread.enableBottomStatusNum && expireNum)) {
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.appendChild (targetDocument.createTextNode
                        (" \uFF0F "));
      div.appendChild (span);
            
      if (expire) {
        span = targetDocument.createElement ("span");
        if (id) {
          span.id = "akahuku_bottom_status_expire";
        }
        span.className = "akahuku_bottom_status_expire";
        span.appendChild (targetDocument.createTextNode (expire));
        div.appendChild (span);
            
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          ("\u9803\u6D88\u3048\u307E\u3059"));
        div.appendChild (span);
      }
            
      if (!info.isMht
          && ((arAkahukuThread.enableBottomStatusDiff && expire)
              || (arAkahukuThread.enableBottomStatusNum && expireNum))) {
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          ("("));
        div.appendChild (span);
      }
            
      if (!info.isMht
          && arAkahukuThread.enableBottomStatusDiff && expire) {
        var expireDiff;
                
        expireDiff
          = arAkahukuThread.getExpireDiff (targetDocument, expire);
                
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          ("\u3042\u3068"));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        if (id) {
          span.id = "akahuku_bottom_status_expire_diff";
        }
        span.className = "akahuku_bottom_status_expire_diff";
        span.appendChild (targetDocument.createTextNode (expireDiff));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          ("\u304F\u3089\u3044"));
        div.appendChild (span);
      }
      if (!info.isMht
          && arAkahukuThread.enableBottomStatusNum && expireNum) {
        if (arAkahukuThread.enableBottomStatusDiff && expire) {
          span = targetDocument.createElement ("span");
          span.className = "akahuku_status_suffix";
          span.appendChild (targetDocument.createTextNode
                            ("\u3001"));
          div.appendChild (span);
        }
        var numPS
          = arAkahukuThread.getExpireNumPrefixSuffix (targetDocument,
                                                      info,
                                                      threadNumber,
                                                      lastReplyNumber);
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        if (id) {
          span.id = "akahuku_bottom_status_expire_num_prefix";
        }
        span.appendChild (targetDocument.createTextNode
                          (numPS [0]));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        if (id) {
          span.id = "akahuku_bottom_status_expire_num";
        }
        span.className = "akahuku_bottom_status_expire_num";
        span.appendChild (targetDocument.createTextNode (expireNum));
        var expireMax
          = arAkahukuThread.getExpireNum (targetDocument, info,
                                          0, 0);
        if (expireNum < expireMax / 10
            && !expireWarning) {
          span.style.fontSize = "12pt";
          span.style.color = "#ff0000";
        }
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        if (id) {
          span.id = "akahuku_bottom_status_expire_num_suffix";
        }
        span.appendChild (targetDocument.createTextNode
                          (numPS [1]));
        div.appendChild (span);
      }
      if (!info.isMht
          && ((arAkahukuThread.enableBottomStatusDiff && expire)
              || (arAkahukuThread.enableBottomStatusNum && expireNum))) {
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          (")"));
        div.appendChild (span);
      }
    }
    
    span = targetDocument.createElement ("span");
    if (id) {
      span.id = "akahuku_bottom_status_delcount_sep";
    }
    var sep = span;
    span.className = "akahuku_status_suffix";
    div.appendChild (span);
    span = targetDocument.createElement ("span");
    if (id) {
      span.id = "akahuku_bottom_status_delcount";
    }
    span.className = "akahuku_bottom_status_delcount";
    div.appendChild (span);
    
    if (isDel) {
      sep.appendChild (targetDocument.createTextNode
                       (" \uFF0F "));
      span.appendChild (targetDocument.createTextNode ("del"));
    }
    
    div.appendChild (targetDocument.createElement ("br"));
    span = targetDocument.createElement ("span");
    if (id) {
      span.id = "akahuku_bottom_status_alert";
    }
    span.className = "akahuku_bottom_status_alert";
    span.appendChild (targetDocument.createTextNode (expireWarning));
    div.appendChild (span);
        
    return div;
  },
    
  /**
   * 消滅時刻までの時間を算出する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String expire
   *         消滅時刻
   * @return String
   *         消滅時刻までの時間
   */
  getExpireDiff : function (targetDocument, expire) {
    var nodes;
    var nodes = Akahuku.getMessageBQ (targetDocument);
    var info = Akahuku.getDocumentParam (targetDocument).location_info;
    var estimatedTime = 0;
        
    if (nodes.length >= 2
        && arAkahukuBoard.knows (info)) {
      /* 書き込みが 2 つ以上あるので予測をする */
      var firstTime = Akahuku.getMessageTime (nodes [0]);
      var firstNum = Akahuku.getMessageNum (nodes [0]);
      var lastTime = Akahuku.getMessageTime (nodes [nodes.length - 1]);
      var lastNum = Akahuku.getMessageNum (nodes [nodes.length - 1]);
      
      if (firstTime != 0
          && lastTime != 0) {
        estimatedTime
          = firstTime
          + (lastTime - firstTime)
          * arAkahukuBoard.getMaxNum (info)
          / (lastNum - firstNum);
      }
    }
        
    if (expire.match
        (/(([0-9]+)\u5E74)?(([0-9]+)\u6708)?(([0-9]+)\u65E5)?(([0-9]+):([0-9]+))?/) &&
        RegExp.lastMatch.length > 0) {
      var specLevel = 0;
      var day_uncert = false;
      var date = new Date ();
      var year = date.getYear () + 1900;
      var mon;
      var day;
      var mon_rep = false;
      if (RegExp.$1) {
        year = parseInt (RegExp.$2);
        if (year < 100) {
          year += 2000;
        }
        specLevel = 1;
      }
      if (RegExp.$3) {
        mon = RegExp.$4;
        mon_rep = true;
        specLevel = 2;
      }
      else {
        mon = date.getMonth ();
      }
      if (RegExp.$5) {
        day = RegExp.$6;
        specLevel = 3;
      }
      else if (RegExp.$7) {
        day = date.getDate ();
        day_uncert = true;
      }
      else {
        day = 28; //省略時は月末頃
      }
      var hour = RegExp.$8 || "00";
      var min = RegExp.$9 || "00";
      if (RegExp.$7) {
        specLevel = 4;
      }
      if (mon_rep) {
        mon = parseInt (mon.replace (/^0/, "")) - 1;
      }
      else if (day < date.getDate ()) {
        mon ++;
        if (mon == 12) {
          mon = 0;
          year ++;
        }
      }
      var now = date.getTime ();
      date.setYear (year);
      date.setDate (1);
      date.setMonth (mon);
      date.setDate (day);
            
      date.setHours (hour);
      date.setMinutes (min);
      var expireTime = date.getTime ();
      
      if (estimatedTime > 0) {
        if (day_uncert && !info.isFutaba &&
            expireTime < estimatedTime - 12 * 60 * 60 * 1000) {
          // 消滅予告日が不確かな際には予想消滅時刻を考慮して日単位でずらす
          // (ふたばではこの問題はもうないはずなので補正しない)
          expireTime
            += Math.ceil ((estimatedTime - expireTime
                           - 12 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000))
            * (24 * 60 * 60 * 1000);
        }
      }
      
      var expireDiff = parseInt ((expireTime - now) / 1000 / 60);
      if (expireDiff < 0) {
        expireDiff = 0;
      }
            
      var text = "";
      var dayExist = 0;
      if (specLevel <= 2 && expireDiff >= 30 * 60 * 24) {
        text += parseInt (expireDiff / (30 * 60 * 24));
        text += "\u30F6\u6708"; // "ヶ月"
        expireDiff = 0; // 細かい残り時間は表示しない
      }
      if (expireDiff >= 60 * 24) {
        text += parseInt (expireDiff / (60 * 24));
        text += "\u65E5"; // "日"
        expireDiff %= 60 * 24;
        dayExist = 1;
      }
      if (specLevel < 4) {
        // 消滅時刻までわかってない場合は時間差までは表示しない
        expireDiff = 0;
      }
      if (expireDiff >= 60) {
        if (dayExist) {
          text += "\u3068"; // "と"
          dayExist = 0;
        }
        text += parseInt (expireDiff / 60);
        text += "\u6642\u9593"; // "時間"
        expireDiff %= 60;
      }
      if (text == "" || expireDiff > 0) {
        if (dayExist) {
          text += "\u3068"; // "と"
          dayExist = 0;
        }
        text += expireDiff;
        text += "\u5206"; // "分"
      }
            
      return text;
    }
        
    return "???";
  },
    
  /**
   * 消滅時刻までの番号を算出する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   * @param  Number threadNumber
   *         スレ番号
   * @param  Number lastReplyNumber
   *         最終レス番号
   * @return String
   *         消滅時刻までの番号
   */
  getExpireNum : function (targetDocument, info,
                           threadNumber, lastReplyNumber) {
    var name = info.server + ":" + info.dir;
    if (!info.isMht && arAkahukuBoard.knows (name)) {
      if (threadNumber == 0
          || lastReplyNumber == 0) {
        return arAkahukuBoard.getMaxNum (name);
      }
      if (arAkahukuThread.enableBottomStatusNumEntire) {
        lastReplyNumber = arAkahukuBoard.getNewestNum (name);
        // newestNum の更新は既に済んでいる
      }
      else {
        lastReplyNumber = Math.max (threadNumber, lastReplyNumber || 0);
      }
      var n = (threadNumber + arAkahukuBoard.getMaxNum (name) - lastReplyNumber);
      if (n < 0) {
        n = 0;
      }
            
      return n;
    }
    else {
      return null;
    }
  },
    
  /**
   * 消滅時刻までの言葉を返す
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   * @param  Number threadNumber
   *         スレ番号
   * @param  Number lastReplyNumber
   *         最終レス番号
   * @return Array
   *         言葉
   *           [String プレフィックス, String サフィックス]
   */
  getExpireNumPrefixSuffix : function (targetDocument, info,
                                       threadNumber, lastReplyNumber) {
    var suffixes = [
      ["\u3042\u3068", "\u793C"],
      ["\u3042\u3068", "\u30DA\u30C9"],
      ["\u6065\u4E18\u6EC5\u4EA1\u307E\u3067\u3042\u3068", "\u65E5"],
      ["\u3042\u3068", "\u30B9\u30B8"],
      ["\u3042\u3068", "\u30EC\u30B9"],
      ["\u793C\u62DD\u307E\u3067\u3042\u3068", "\u30EC\u30B9"],
      ["\u3042\u3068", "orz"],
      ["\u874B\u71ED", "\u672C"],
      ["\u6B8B\u308A", "\u30B9\u30B8"],
      ["\u3042\u3068", "\u4E07\u5186"],
      ["\u3042\u3068", "\u672C"],
      ["\u3042\u3068", "\u30AF\u30FC\u30EB"],
      ["\u3042\u3068", "\u3053\u3059\u308A"],
      ["\u305F\u3060\u306E\u30D3\u30BF\u30DF\u30F3\u5264", "g"],
      ["\u3071\u3093\u3064\u3082\u3084\u308F\u3089\u304B\u7DBF", "%"],
      ["\u3042\u3068", "\u767A"],
      ["\u6BDB\u6B8B\u308A", "\u672C"],
      ["\u30B9\u30EC\u306EHP ", "/xxx1"],
      ["\u3054\u3081\u3093\u306A\u3055\u3044\u3001\u3053\u3053\u306F\u3082\u3046\u3042\u3068xxx2\u30EC\u30B9\u2026\u3044\u3084\u3001\u3069\u3046\u8A70\u3081\u3066\u3082", "\u30EC\u30B9\u307E\u3067\u3067\u3059"],
      ["\u3042\u3068", "\u306C\u3075\u3045"],
      ["\u3042\u3068", "\u767A\u3067\u8131\u7AE5\u8C9E"],
      ["\u30B9\u30A5\u30FC\u3000\u30D0\u30B7\u30FC\u30F3^", ""]
      ];
    var index;
        
    if (!arAkahukuThread.enableBottomStatusNumRandom) {
      suffixes = [["\u3042\u3068", "\u756A"]];
    }
    else if (arAkahukuThread.enableBottomStatusNumShort) {
      suffixes = [
        ["\u3042\u3068", "\u793C"],
        ["\u3042\u3068", "\u30DA\u30C9"],
        ["\u3042\u3068", "\u30B9\u30B8"],
        ["\u3042\u3068", "\u30EC\u30B9"],
        ["\u3042\u3068", "orz"],
        ["\u874B\u71ED", "\u672C"],
        ["\u6B8B\u308A", "\u30B9\u30B8"],
        ["\u3042\u3068", "\u4E07\u5186"],
        ["\u3042\u3068", "\u672C"],
        ["\u3042\u3068", "\u30AF\u30FC\u30EB"],
        ["\u3042\u3068", "\u3053\u3059\u308A"],
        ["\u3042\u3068", "\u767A"],
        ["\u3042\u3068", "\u306C\u3075\u3045"],
        ["\u3042\u3068", "\u767A\u3067\u8131\u7AE5\u8C9E"]
        ];
    }
        
    var expireNum
    = arAkahukuThread.getExpireNum (targetDocument, info,
                                    threadNumber, lastReplyNumber);
    var max
    = arAkahukuThread.getExpireNum (targetDocument, info,
                                    0, 0);
        
    index
    = parseInt (Math.random () * suffixes.length);
    if (index
        >= suffixes.length) {
      index = 0;
    }
        
    var numSP = suffixes [index];
    var n2 = expireNum - 1;
    if (n2 < 0) {
      n2 = 0;
    }
    numSP [0] = numSP [0].replace (/xxx2/, n2);
    numSP [1] = numSP [1].replace (/xxx1/, max);
        
    return numSP;
  },
    
  /**
   * 新着レスの言葉を返す
   *
   * @param  Boolean useRandom
   *         ランダム
   * @return Array
   *         言葉
   *           [String プレフィックス, String サフィックス]
   */
  getNewReplyPrefixSuffix : function (useRandom) {
    var suffixes = [
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u7121\u8077\u7AE5\u8C9E"],
      ["\u3053\u3053\u304B\u3089", "\u30EC\u30B9\u304C\u9ED2\u6B74\u53F2\u30CE\u30FC\u30C8"],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u30AA\u30E1\u30A7\u3067\u3088\u304B\u3063\u305F"],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u30D5\u30E5\u30FC\u30B8\u30E7\u30F3\uFF01"],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u793C\u62DD\u3057\u3066\u307E\u3059"],
      ["YES\uFF01\u30D7\u30EA\u30AD\u30E5\u30A2", ""],
      ["\u8077\u6B74", "\u5E74\u7A7A\u767D"],
      ["\u7F6A\u72B6\u7121\u8077\u3067\u61F2\u5F79", "\u5E74\u306B\u51E6\u3059"],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u5E8A\u30AA\u30CA\u6D3E"],
      ["\u6B8B\u6A5F\u00D7", ""],
      ["", "\u6B21\u5143\u3078\u306E\u6249\u304C\u958B\u304F\uFF01"],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u80A1\u9593\u3092\u307E\u3055\u3050\u308A\u5408\u3046\u540C\u4EBA\u8A8C\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3092\u5E0C\u671B\u3057\u307E\u3059"],
      ["\u3053\u3053\u306F", "\u4EBA\u3067\u98DF\u3044\u6B62\u3081\u308B\uFF01\u304A\u524D\u306F\u5148\u306B\u884C\u3051\uFF01"],
      ["\u3084\u3081\u3066\uFF01\u30B9\u30EC\u300C\u300D\u306E\uFF28\uFF30\u306F\u3082\u3046", "\u3088\uFF01"],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u30C9\u30F3\u30BF\u30B3\u30B9"],
      ["\u3053\u3053\u304B\u3089\u4E0B\u304C\u30C0\u30A4\u30E9\u30AC\u30FC", ""],
      ["\u3053\u3053\u304B\u3089", "\u4EBA\u304C\u91CE\u5782\u308C\u6B7B\u306B"],
      ["\u672C\u65E5", "\u56DE\u76EE\u306E\u30AA\u30CA\u30CB\u30FC"],
      ["", "\u6642\u304B\u3089\u5AC1\u306E\u30A8\u30ED\u7D75\u796D\u308A\uFF01"],
      ["\u3053\u3053\u304B\u3089", "\u57FA\u306E\u30A4\u30AA\u30F3\u30AD\u30E3\u30CE\u30F3\u304C\u5897\u8A2D"],
      ["\u304A\u3044\u304A\u524D\u3089\u3001\u306A\u3093\u304B", "\u4EBA\u591A\u304F\u306A\u3044\u304B\uFF1F\u2026\u3044\u3084\u6C17\u306E\u305B\u3044\u304B"]
      ];
        
    if (!useRandom) {
      suffixes = [
        ["\u65B0\u7740\u30EC\u30B9", "\u4EF6"]
        ];
    }
        
    var index;
        
    index
    = parseInt (Math.random () * suffixes.length);
    if (index
        >= suffixes.length) {
      index = 0;
    }
        
    var newReplySP = suffixes [index];
    return newReplySP;
  },

  /**
   * スレッドのレス数の変化を通知する(非同期)
   *
   * @param  arAkahukuLocationInfo
   * @param  number スレ番号
   * @param  number レス数
   */
  asyncNotifyReplyNumber : function (info, threadNum, replyNum) {
    var data = {
      server: info.server,
      dir: info.dir,
      threadNumber: parseInt (threadNum),
      replyCount: parseInt (replyNum)};
    var subject = Components.classes ["@mozilla.org/supports-string;1"]
    .createInstance (Components.interfaces.nsISupportsString);
    subject.data = JSON.stringify (data);
    arAkahukuUtil.executeSoon (function (subject) {
      var os = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
      os.notifyObservers (subject, "arakahuku-thread-replynum-changed", null);
    }, [subject]);
  },
    
  /**
   * body の unload イベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  onBodyUnload : function (targetDocument, documentParam) {
    var param;
        
    try {
      arAkahukuThread.resetTabIcon (targetDocument);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    param = documentParam.thread_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.thread_param = null;

    param = documentParam.respanel_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.respanel_param = null;

    try {
      var info = documentParam.location_info;
      if (info.isReply) {
        var os
          = Components.classes ["@mozilla.org/observer-service;1"]
          .getService (Components.interfaces.nsIObserverService);
        var subject
          = Components.classes ["@mozilla.org/supports-string;1"]
          .createInstance (Components.interfaces.nsISupportsString);
        subject.data
          = JSON.stringify ({
            URL: targetDocument.location.href,
            server: info.server,
            dir: info.dir,
            threadNumber: info.threadNumber,
          });
        os.notifyObservers (subject, "arakahuku-thread-unload", null);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },

  /**
   * タブのアイコンを元に戻す
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   * @param  HTMLElement thumbnail
   *         サムネ
   */
  setTabIcon : function (targetDocument, info, thumbnail) {
    if (arAkahukuThread.enableTabIcon) {
      /* タブのアイコンをサムネにする */
      if (thumbnail == null) {
        thumbnail = targetDocument.getElementById ("akahuku_thumbnail");
      }
      if (thumbnail) {
        var src = thumbnail.src;
        try {
          src = arAkahukuP2P.deP2P (src);
        }
        catch (e) { Akahuku.debug.exception (e);
        }
        
        if (info.isMht) {
          /* サムネが mht 内に存在するかどうかチェック */
          var urlUnmht = arAkahukuCompat.UnMHT
            .getMHTFileURI (src, targetDocument.location.href);
          if (urlUnmht) {
            src = urlUnmht;
          }
        }
        
        src = arAkahukuP2P.tryEnP2P (src);
        
        arAkahukuThread.setTabIconForWindow
          (targetDocument.defaultView, {
            src: src,
            thumbnailWidth: thumbnail.getAttribute ("width"),
            thumbnailHeight: thumbnail.getAttribute ("height"),
          });
      }
    }
  },
  setTabIconForWindow : function (targetWindow, prop) {
    // shim for e10s
    var targetBrowser = arAkahukuWindow.getBrowserForWindow (targetWindow);
    arAkahukuThread.setTabIconForBrowser (targetBrowser, prop);
  },
  setTabIconForBrowser : function (targetBrowser, prop) {
    // run only in XUL overlay
    var src = prop.src;
    if (arAkahukuThread.enableTabIcon) {
      var tab
      = arAkahukuWindow.getTabForBrowser (targetBrowser);
      if (tab) {
        var tabbrowser
          = targetBrowser.ownerDocument.getElementById ("content");
        tabbrowser = arAkahukuWindow.unwrapXPCNative (tabbrowser);
        
        if ("setIcon" in tabbrowser
            && arAkahukuThread.enableTabIconAsFavicon) {
          tabbrowser.setIcon (tab, src);
        }
        else // いつのバージョン用のコード?
        if ("updateIcon" in tabbrowser) {
          tab.linkedBrowser.mIconURL = src;
          tabbrowser.updateIcon (tab);
        }
        else {
          tab.setAttribute ("image", src);

          // favicon.ico 等に上書きされてしまったら元に戻す
          var tabIconUpdater = (function (tab, src, taburi) {
            return function () {
              if (tab.getAttribute ("image") == src) {
                return;
              }
              tab.removeEventListener ("load", tabIconUpdater);
              if (taburi !== tab.linkedBrowser.currentURI) {
                return; // 別ページへ遷移した後
              }
              tab.setAttribute ("image", src);
            };
          })(tab, src, tab.linkedBrowser.currentURI);
          tab.addEventListener ("load", tabIconUpdater, false);
        }
                    
        if (arAkahukuThread.enableTabIconSize) {
          var max = arAkahukuThread.tabIconSizeMax;
          var width
            = parseInt (prop.thumbnailWidth);
          var height
            = parseInt (prop.thumbnailHeight);
                        
          if (width > height) {
            height = max * height / width;
            width = max;
          }
          else if (width < height) {
            width = max * width / height;
            height = max;
          }
          else {
            width = max;
            height = max;
          }
                    
          var node
            = targetBrowser.ownerDocument.getAnonymousElementByAttribute
            (tab, "class", "tab-icon");
          var tabIcon = node;
          if (node) {
            try {
              node.style.width = width + "px";
              node.style.height = height + "px";
              var diff    
                = node.parentNode.boxObject.height - height;
              if (diff < 0) {
                node.style.marginTop = (diff / 2) +  "px";
                node.style.marginBottom = (diff / 2) + "px";
              }
            }
            catch (e) {
              /* Wazilla では style がサポートされていない */
            }
          }
          node
            = targetBrowser.ownerDocument.getAnonymousElementByAttribute
            (tab, "class", "tab-icon-image");
          if (node) {
            if (tabIcon && node.parentNode == tabIcon) {
              /* tab-icon-image が tab-icon 内にある
               * 1. Mac のスタイル
               * 2. TabMixPlus の改造
               * 
               * 2 の場合マージンの位置がおかしいので
               * 修正しなければならない
               */
              try {
                var s, e, style;
                style = targetBrowser.ownerDocument.defaultView
                  .getComputedStyle (node, "");
                s = style.getPropertyCSSValue ("margin-left").getFloatValue (CSSPrimitiveValue.CSS_PX) + "px";
                e = style.getPropertyCSSValue ("margin-right").getFloatValue (CSSPrimitiveValue.CSS_PX) + "px";
                node.style.MozMarginStart = "0px";
                node.style.MozMarginEnd = "0px";
                tabIcon.style.MozMarginStart = s;
                tabIcon.style.MozMarginEnd = e;
              }
              catch (e) { Akahuku.debug.exception (e);
              }
            }
            try {
              node.style.width = width + "px";
              node.style.height = height + "px";
                            
              var diff    
                = node.parentNode.boxObject.height - height;
              if (diff < 0) {
                node.style.marginTop = (diff / 2) +  "px";
                node.style.marginBottom = (diff / 2) + "px";
              }
            }
            catch (e) {
              /* Wazilla では style がサポートされていない */
            }
          }
        }
      }
    }
  },
    
  /**
   * タブのアイコンを変更するかチェックする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  checkTabIcon : function (targetDocument) {
    var nodes = Akahuku.getMessageBQ (targetDocument);
    if (nodes.length == 0) {
      arAkahukuThread.resetTabIcon (targetDocument);
    }
  },
    
  /**
   * タブのアイコンを元に戻す
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  resetTabIcon : function (targetDocument) {
    if (arAkahukuThread.enableTabIcon) {
      arAkahukuThread.resetTabIconForWindow (targetDocument.defaultView);
    }
  },
  resetTabIconForWindow : function (targetWindow) {
    // shim for e10s
    var targetBrowser = arAkahukuWindow.getBrowserForWindow (targetWindow);
    arAkahukuThread.resetTabIconForBrowser (targetBrowser);
  },
  resetTabIconForBrowser : function (targetBrowser) {
    if (arAkahukuThread.enableTabIcon) {
      var tab
      = arAkahukuWindow.getTabForBrowser (targetBrowser);
      if (tab) {
        var tabbrowser = targetBrowser.ownerDocument
          .getElementById ("content");
        tabbrowser = arAkahukuWindow.unwrapXPCNative (tabbrowser);
        
        if ("setIcon" in tabbrowser) {
          tabbrowser.setIcon (tab, "");
        }
        else
        if ("_updateAppTabIcons" in tabbrowser) {
          tab.setAttribute ("image", "");
          tabbrowser._updateAppTabIcons(tab);
        }
        else if ("updateIcon" in tabbrowser) {
          tab.linkedBrowser.mIconURL = "";
          tabbrowser.updateIcon (tab);
        }
        else {
          tab.setAttribute ("image", "");
        }
                
        if (arAkahukuThread.enableTabIconSize) {
          var node
            = targetBrowser.ownerDocument
            .getAnonymousElementByAttribute
            (tab, "class", "tab-icon");
          if (node) {
            try {
              node.style.width = "";
              node.style.height = "";
              node.style.marginTop = "";
              node.style.marginBottom = "";
            }
            catch (e) {
              /* Wazilla では style がサポートされていない */
            }
          }
          node
            = targetBrowser.ownerDocument
            .getAnonymousElementByAttribute
            (tab, "class", "tab-icon-image");
          if (node) {
            try {
              node.style.width = "";
              node.style.height = "";
            }
            catch (e) {
              /* Wazilla では style がサポートされていない */
            }
          }
        }
      }
    }
  },
    
  /**
   * タブを移動したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onTabMove : function (event) {
    var document = event.currentTarget.document;
    if (arAkahukuThread.enableTabIcon
        && arAkahukuThread.enableTabIconSize) {
      /* タブのアイコンをサムネにする */
            
      var tabbrowser = document.getElementById ("content");
                
      function setTabIconForDocument (targetDocument) {
        var thumbnail
          = targetDocument.getElementById ("akahuku_thumbnail");
        if (thumbnail) {
          var info
            = Akahuku.getDocumentParam (targetDocument)
            .location_info;
          arAkahukuThread.setTabIcon
            (targetDocument, info, thumbnail);
        }
      }

      if ("visibleTabs" in tabbrowser) {
        /* Firefox4/Gecko2.0 */
        var numTabs = tabbrowser.visibleTabs.length;
        for (var i = 0; i < numTabs; i ++) {
          var tab = tabbrowser.visibleTabs [i];
          var targetDocument
            = tabbrowser.getBrowserForTab (tab).contentDocument;
          setTabIconForDocument (targetDocument);
        }
      }
      else if ("mTabContainer" in tabbrowser) {
        var tab = tabbrowser.mTabContainer.firstChild;
        while (tab) {
          var targetDocument = tab.linkedBrowser.contentDocument;
          setTabIconForDocument (targetDocument);
          tab = tab.nextSibling;
        }
      }
    }
  },
    
  /**
   * 対象のノード以下のGIF画像or動画へのリンクを赤字で表示
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyAlertGIF : function (targetDocument, targetNode) {
    var nodes, i;
        
    nodes = targetNode.getElementsByTagName ("a");
        
    for (i = 0; i < nodes.length; i ++) {
      var text = arAkahukuDOM.getInnerText (nodes [i]);
      if (/\.(gif|webm|mp4)$/.test (text)) {
        nodes [i].style.color = "red";
        nodes [i].setAttribute ("__akahuku_alertgif", "true");
      }
    }
  },
    
  /**
   * 対象のノード以下のメール欄を表示する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyInlineDel : function (targetDocument, targetNode) {
    var nodes, i;
        
    nodes = targetNode.getElementsByTagName ("a");
        
    for (i = 0; i < nodes.length; i ++) {
      if ("className" in nodes [i]
          && nodes [i].className == "del") {
        var state = {opened: false};
        
        nodes [i].addEventListener
          ("click",
           (function (node, state) {
             return function (event) {
               if (state.opened) {
                 state.div.parentNode.removeChild (state.div);
                 state.opened = false;
                 state.iframe = null;
                 state.div = null;
               }
               else {
                 var div = targetDocument.createElement ("div");
                 div.className = "__akahuku_delframe";
                 div.style.display = "inline";
                 div.style.position = "absolute";
                 div.style.width = "1px";
                 div.style.height = "1px";
                 targetDocument.body.appendChild (div);
                 var rect = node.getBoundingClientRect ();
                 div.style.left
                   = (rect.left + rect.width
                      + targetDocument.body.scrollLeft
                      + targetDocument.documentElement.scrollLeft) + "px";
                 div.style.top
                   = (rect.top + rect.height
                      + targetDocument.body.scrollTop
                      + targetDocument.documentElement.scrollTop) + "px";
                 var iframe = targetDocument.createElement ("iframe");
                 iframe.src = node.getAttribute ("dummyhref") || node.href; 
                 iframe.style.position = "absolute";
                 iframe.style.zIndex = "200";
                 iframe.style.right = "0px";
                 iframe.style.top = "0px";
                 iframe.style.width = "320px";
                 iframe.style.height = "600px";
                 iframe.style.backgroundColor = "#ffffff";
                 div.appendChild (iframe);
                 iframe.addEventListener
                   ("load",
                    function () {
                     var href = iframe.contentDocument.location.href;
                     if (href.match (/del\.php(\?guid=on)?$/)) {
                       targetDocument.defaultView.setTimeout
                         (function () {
                           state.div.parentNode.removeChild (state.div);
                           state.opened = false;
                           state.iframe = null;
                           state.div = null;
                         }, 500);
                     }
                   }, false);
                 
                 state.div = div;
                 state.iframe = iframe;
                 state.opened = true;
               }
               event.preventDefault ();
               event.stopPropagation ();
             };
             })(nodes [i], state), true);
      }
    }
  },
  
  /**
   * 題名のバグ, Firefox3 の改行バグを修正する
   *
   * @param  HTMLElement targetNode
   *         対象のノード
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  fixBug : function (targetNode, info) {
    if (info.isNotFound) {
      return;
    }
    var targetDocument = targetNode.ownerDocument || targetNode;
        
    var node, nodes, tmp;
        
    if (info.isNormal || info.isReply) {
      if (arAkahukuThread.enableReplyAvoidWrap) {
        nodes = Akahuku.getMessageBQ (targetNode);
        for (var i = 0; i < nodes.length; i ++) {
          var container = Akahuku.getMessageContainer (nodes [i]);
          if (!container) {
            continue;
          }
          
          var a = nodes [i].previousSibling;
          if (a && a.nodeName.toLowerCase () == "#text") {
            a = a.previousSibling;
          }
          if (a && a.nodeName.toLowerCase () == "a") {
            var img = a.firstChild;
            if (img && img.nodeName.toLowerCase () == "img") {
              /* レス画像 */
              if (!nodes [i].hasAttribute ("__akahuku_margin_left")) {
                if (nodes [i].style.marginLeft) {
                  nodes [i].setAttribute ("__akahuku_margin_left_original",
                                          nodes [i].style.marginLeft);
                }
                nodes [i].setAttribute ("__akahuku_margin_left", 1);
              }
              
              nodes [i].style.marginLeft
                = (img.width + 40) + "px";
              nodes [i].style.display = "none";
              targetDocument.defaultView.setTimeout
                ((function (node) {
                    return function () {
                      node.style.display = "";
                    };
                  })(nodes [i]), 10);
            }
          }
          else if (a && a.nodeName.toLowerCase () == "div") {
            /* オートリンクのプレビュー */
            nodes [i].style.marginLeft = a.offsetWidth + "px";
            nodes [i].style.display = "none";
            targetDocument.defaultView.setTimeout
              ((function (node) {
                  return function () {
                    node.style.display = "";
                  };
                })(nodes [i]), 10);
          }
        }
      }
      
      nodes = targetNode.getElementsByTagName ("font");
      for (var i = 0; i < nodes.length; i ++) {
        node = nodes [i];
        if ((node.getAttribute ("color") == "#cc1105"
             || node.getAttribute ("color") == "#117743")
            && node.nextSibling
            && node.nextSibling.nodeName.toLowerCase () == "b") {
          /* 題名がバグっている */
          node = node.nextSibling;
          while (node.firstChild) {
            tmp = node.firstChild;
            node.removeChild (tmp);
            node.parentNode.insertBefore (tmp, node);
          }
          tmp = node;
          node = tmp.nextSibling;
          tmp.parentNode.removeChild (tmp);
          
          if (node
              && Akahuku.isMessageBQ (node)
              && node.firstChild
              && node.firstChild.nodeName.toLowerCase () == "b") {
            node = node.firstChild;
            while (node.firstChild) {
              tmp = node.firstChild;
              node.removeChild (tmp);
              node.parentNode.insertBefore (tmp, node);
            }
            tmp = node;
            tmp.parentNode.removeChild (tmp);
          }
        }
      }
    }
  },
    
  /**
   * 合間で非表示になったレスを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateHidden : function (targetDocument) {
    var hiddenCount = 0;
    var nodes = Akahuku.getMessageBQ (targetDocument);
    var node;
    var i;
    
    for (i = 0; i < nodes.length; i ++) {
      var container = Akahuku.getMessageContainer (nodes [i]);
      if (container
          && container.main.style.display == "none") {
        hiddenCount ++;
      }
    }
    
    node
    = targetDocument.getElementById ("akahuku_bottom_status_number_hidden");
    if (node) {
      if (hiddenCount) {
        arAkahukuDOM.setText (node, "-" + hiddenCount);
      }
      else {
        arAkahukuDOM.setText (node, "");
      }
    }
    
    node
    = targetDocument.getElementById ("akahuku_throp_number_hidden");
    if (node) {
      if (hiddenCount) {
        arAkahukuDOM.setText (node, "-" + hiddenCount);
      }
      else {
        arAkahukuDOM.setText (node, "");
      }
    }
  },
    
  /**
   * 移動ボタンが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  Boolean prev
   *         前に戻るか
   */
  onMove : function (event, prev) {
    var targetDocument = event.target.ownerDocument;
    var target = event.target;
        
    if (target.nodeName.toLowerCase () != "div") {
      target = arAkahukuDOM.findParentNode (target, "div");
    }
        
    if ("id" in target
        && target.id
        && target.id.match (/akahuku_move_button_([0-9]+)/)) {
      var n = parseInt (RegExp.$1);
      if (prev) {
        n --;
      }
      else {
        n ++;
      }
            
      target
      = targetDocument.getElementById ("akahuku_move_button_" + n);
            
      if (target) {
        var y = -32;
        for (var tmp = target; tmp; tmp = tmp.offsetParent) {
          y += tmp.offsetTop;
        }
                
        targetDocument.defaultView.scrollTo (0, (y < 0) ? 0 : y);
        event.preventDefault ();
      }
    }
  },
    
  /**
   * del を新しいタブで開くようにする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyDelNewTab : function (targetDocument, targetNode) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    
    var nodes = targetNode.getElementsByTagName ("a");
    var i;
    var hrefbase = "/del.php?b=" + info.dir + "&d=";
    for (i = 0; i < nodes.length; i ++) {
      var onclick = nodes [i].getAttribute ("onclick");
      if (onclick && onclick.match (/del\(([0-9]+)\);/)) {
        var Num = RegExp.$1;
        nodes [i].removeAttribute ("onclick");
        if (arAkahukuThread.enableDelInline) {
          nodes [i].setAttribute("dummyhref",hrefbase + Num);
          continue;
        }
        nodes [i].href = hrefbase + Num;
        nodes [i].target = "_blank";
        nodes [i].setAttribute ("__akahuku_newtab", "1");
        continue;
      }
            
      var href = nodes [i].getAttribute ("href");
      if (href && /del\.php\?/.test(href)) {
        nodes [i].target = "_blank";
        nodes [i].setAttribute ("__akahuku_newtab", "1");
      }
    }
  },
    
  /**
   * レスパネルのマウスイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onResPanelMouseMove : function (event) {
    var targetDocument = event.target.ownerDocument;
    var param = Akahuku.getDocumentParam (targetDocument).respanel_param;
    if (param == null) {
      return;
    }
        
    var frame = param.frame;
    var scroll = param.scroll;
    var content = param.content;
    var bar = param.bar;
    var header = param.header;
                
    if (param.mousedown == 1) {
      var x = event.clientX;
      var y = event.clientY;
                    
      param.left = param.startLeft + x - param.lastX;
      param.top = param.startTop + y - param.lastY;
            
      frame.style.left = param.left + "px";
      frame.style.top = param.top + "px";
                    
      event.preventDefault ();
    }
    else if (param.mousedown == 2) {
      var x = event.clientX;
      var y = event.clientY;
            
      param.width = param.startWidth + x - param.lastX;
      param.height = param.startHeight + y - param.lastY;
      if (param.width < 64) {
        param.width = 64;
      }
      if (param.height < 64) {
        param.height = 64;
      }
            
      frame.style.width = param.width + "px";
      frame.style.height = param.height + "px";
            
      scroll.style.height = (param.height - 32) + "px";
            
      content.style.width = (param.width - 16) + "px";
      content.style.height = param.height + param.diff + "px";
            
      arAkahukuThread.updateResPanel (targetDocument);
      arAkahukuThread.updateResPanelBar (targetDocument);
            
      event.preventDefault ();
    }
    else if (param.mousedown == 3) {
      var y = event.clientY;
                    
      param.bartop = param.startBartop + y - param.lastY;
      if (param.bartop < 0) {
        param.bartop = 0;
      }
      else if (param.bartop > param.height - 64) {
        param.bartop = param.height - 64;
      }
            
      var nodes = Akahuku.getMessageBQ (targetDocument);
      var resCount = nodes.length - 1;
            
      if (resCount > 1) {
        param.offset
          = 1
          + param.bartop * (resCount - 1) / (param.height - 64);
      }
      else {
        param.offset = 1;
      }
            
      bar.style.top = param.bartop + "px";
                    
      arAkahukuThread.updateResPanel (targetDocument);
            
      event.preventDefault ();
    }
  },
    
  /**
   * レスパネルのスクロールバーを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateResPanelBar : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument).respanel_param;
    if (!param) {
      return;
    }
        
    var bar = param.bar;
        
    var nodes = Akahuku.getMessageBQ (targetDocument);
    var resCount = nodes.length - 1;
        
    if (resCount > 1) {
      param.bartop
        = (param.offset - 1)
        * (param.height - 64) / (resCount - 1);
      param.bartop = parseInt (param.bartop);
    }
    else {
      param.bartop = 0;
    }
        
    bar.style.top = param.bartop + "px";
  },
    
  /**
   * レスパネルを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateResPanel : function (targetDocument) {
    var document_param
    = Akahuku.getDocumentParam (targetDocument);
    var param = document_param.respanel_param;
    if (!param) {
      return;
    }
    
    var content = param.content;
    
    /* 今表示しているものを削除 */
    var node = content.firstChild;
    while (node) {
      if (node.nodeName.toLowerCase () == "table"
          || (node.nodeName.toLowerCase () == "div"
              && (arAkahukuDOM.hasClassName (node, "s")
                  || arAkahukuDOM.hasClassName (node, "r")))
          || node.nodeName.toLowerCase () == "br") {
        var nextSibling = node.nextSibling;
        content.removeChild (node);
        node = nextSibling;
      }
      else {
        node = node.nextSibling;
      }
    }
    
    var nodes = Akahuku.getMessageBQ (targetDocument);
        
    var offset = parseInt (param.offset);
    for (var i = 0; i < 10 && offset + i < nodes.length; i ++) {
      node = nodes [offset + i];
      var num = Akahuku.getMessageNum (node);
      var newContainer;
      if (num in param.res) {
        newContainer = param.res [num];
      }
      else {
        var container = Akahuku.getMessageContainer (node);
        if (!container) {
          continue;
        }
        
        var newContainer
          = Akahuku.cloneMessageContainer
          (container, {
            excludeClasses : [
            "akahuku_saveimage_container",
            "akahuku_saveimage_button2",
            "akahuku_saveimage_stop",
            "aima_aimani_generated",
            ],
            noMediaAutoPlay : true,
            stripId : true,
          });
        param.res [num] = newContainer;
      }
      var offsetHeight = 0;
      var offsetBottom = 0;
      for (var j = 0; j < newContainer.nodes.length; j ++) {
        content.appendChild (newContainer.nodes [j]);
        
        if (newContainer.nodes [j].offsetHeight > offsetHeight) {
          offsetHeight = newContainer.nodes [j].offsetHeight;
        }
        if (newContainer.nodes [j].offsetTop
            + newContainer.nodes [j].offsetHeight > offsetBottom) {
          offsetBottom
            = newContainer.nodes [j].offsetTop
            + newContainer.nodes [j].offsetHeight;
        }
      }
      
      if (i == 0) {
        param.diff = (param.offset - offset) * offsetHeight;
        param.diff = parseInt (param.diff); /* px は整数 */
      }
      if (offsetBottom > param.height + param.diff) {
        break;
      }
    }
        
    content.style.top = (16 - param.diff) + "px";
    content.style.height = param.height + param.diff + "px";
  },
    
  /**
   * レスパネルを表示
   */
  showResPanel : function (targetDocument) {
    var frame, header, content, button, resizer, scroll, bar;
        
    var params = Akahuku.getDocumentParam (targetDocument);
    if (!params) {
      return;
    }
        
    if (!params.location_info.isReply) {
      /* レス送信モードではない */
      return;
    }
        
    if (params.respanel_param) {
      /* 表示済み */
      return;
    }
        
    var param = new arAkahukuResPanelParam ();
    params.respanel_param = param;
        
    param.res = new Object ();
            
    frame = targetDocument.createElement ("div");
    frame.id = "akahuku_respanel";
    frame.style.zIndex = "200";
    frame.style.position = "fixed";
    frame.style.left = param.left + "px";
    frame.style.top = param.top + "px";
    frame.style.width = param.width + "px";
    frame.style.height = param.height + "px";
    frame.style.border = "1px solid #eeaa88";
    frame.style.backgroundColor = "#ffffee";
    frame.style.overflow = "hidden";
            
    header = targetDocument.createElement ("div");
    header.id = "akahuku_respanel_header";
    header.style.position = "absolute";
    header.style.left = "0px";
    header.style.top = "0px";
    header.style.width = "100%";
    header.style.height = "16px";
    header.style.backgroundColor = "#eeaa88";
    header.style.zIndex = "202";
    frame.appendChild (header);

    button = targetDocument.createElement ("img");
    button.style.position = "absolute";
    button.style.left = "0px";
    button.style.top = "0px";
    button.style.width = "16px";
    button.style.height = "16px";
    button.src
    = Akahuku.protocolHandler.enAkahukuURI
    ("preview", "chrome://akahuku/content/images/check_x.png");
    header.appendChild (button);
    
    content = targetDocument.createElement ("div");
    content.id = "akahuku_respanel_content";
    content.style.zIndex = "201";
    content.style.position = "absolute";
    content.style.left = "0px";
    content.style.top = "16px";
    content.style.width = (param.width - 16) + "px";
    content.style.height = param.height + param.diff + "px";
    content.style.overflow = "hidden";
    frame.appendChild (content);
        
    resizer = targetDocument.createElement ("div");
    resizer.id = "akahuku_respanel_resizer";
    resizer.style.position = "absolute";
    resizer.style.right = "0px";
    resizer.style.bottom = "0px";
    resizer.style.width = "16px";
    resizer.style.height = "16px";
    resizer.style.backgroundColor = "#eeaa88";
    resizer.style.zIndex = "202";
    resizer.style.cursor = "se-resize";
    frame.appendChild (resizer);
            
    scroll = targetDocument.createElement ("div");
    scroll.id = "akahuku_respanel_scroll";
    scroll.style.position = "absolute";
    scroll.style.right = "0px";
    scroll.style.bottom = "16px";
    scroll.style.width = "16px";
    scroll.style.height = (param.height - 32) + "px";
    scroll.style.backgroundColor = "#ccccbb";
    scroll.style.zIndex = "202";
    frame.appendChild (scroll);
            
    bar = targetDocument.createElement ("div");
    bar.id = "akahuku_respanel_bar";
    bar.style.position = "absolute";
    bar.style.top = param.bartop + "px";
    bar.style.left = "0px";
    bar.style.width = "12px";
    bar.style.height = "28px";
    bar.style.backgroundColor = "#ffffee";
    bar.style.border = "2px solid #eeaa88";
    bar.style.zIndex = "202";
    scroll.appendChild (bar);
            
    param.frame = frame;
    param.header = header;
    param.resizer = resizer;
    param.content = content;
    param.scroll = scroll;
    param.bar = bar;
            
    header.addEventListener
    ("mousedown",
     function () {
      var event = arguments [0];
      var targetDocument = event.target.ownerDocument;
                
      var param
        = Akahuku.getDocumentParam (targetDocument).respanel_param;
      var x = event.clientX;
      var y = event.clientY;
                
      param.mousedown = 1;
      param.startLeft = param.left;
      param.startTop = param.top;
      param.lastX = x;
      param.lastY = y;
                
      event.preventDefault ();
    }, true);
        
    button.addEventListener
    ("click",
     function () {
      var event = arguments [0];
      var targetDocument = event.target.ownerDocument;
      arAkahukuThread.closeResPanel (targetDocument);
      event.preventDefault ();
    }, true);
        
    resizer.addEventListener
    ("mousedown",
     function () {
      var event = arguments [0];
      var targetDocument = event.target.ownerDocument;
                
      var param
        = Akahuku.getDocumentParam (targetDocument).respanel_param;
      var x = event.clientX;
      var y = event.clientY;
                
      param.mousedown = 2;
      param.startWidth = param.width;
      param.startHeight = param.height;
      param.lastX = x;
      param.lastY = y;
                
      event.preventDefault ();
    }, true);
            
    bar.addEventListener
    ("mousedown",
     function () {
      var event = arguments [0];
      var targetDocument = event.target.ownerDocument;
                
      var param
        = Akahuku.getDocumentParam (targetDocument).respanel_param;
      var x = event.clientX;
      var y = event.clientY;
                
      param.mousedown = 3;
      param.startBartop = param.bartop;
      param.lastX = x;
      param.lastY = y;
                
      event.preventDefault ();
    }, true);
            
    targetDocument.body.addEventListener
    ("mouseup",
     function () {
      var event = arguments [0];
      var targetDocument = event.target.ownerDocument;
                
      var param
        = Akahuku.getDocumentParam (targetDocument).respanel_param;
      if (param == null) {
        return;
      }
            
      param.mousedown = 0;
            
      event.preventDefault ();
    }, true);
            
    targetDocument.body.addEventListener
    ("mousemove",
     function () {
      var event = arguments [0];
      arAkahukuThread.onResPanelMouseMove (event);
    }, true);
            
    arAkahukuThread.updateResPanel (targetDocument);
            
    targetDocument.body.appendChild (frame);
  },
  showResPanelForBrowser : function (targetBrowser) {
    var targetDocument = targetBrowser.contentDocument;
    arAkahukuThread.showResPanel (targetDocument);
  },
    
  /**
   * レスパネルを閉じる
   */
  closeResPanel : function (targetDocument) {
    var document_param = Akahuku.getDocumentParam (targetDocument);
    if (!document_param || !document_param.respanel_param) {
      return;
    }
        
    var param = document_param.respanel_param;
    try {
      param.frame.parentNode.removeChild (param.frame);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    finally {
      param.destruct ();
      document_param.respanel_param = null;
    }
  },
  closeResPanelForBrowser : function (targetBrowser) {
    var targetDocument = targetBrowser.contentDocument;
    arAkahukuThread.closeResPanel (targetDocument);
  },
    
  /**
   * 画像読み込みの失敗イベントで一度だけ再読込
   *
   * @param  Event event
   *         対象のイベント
   */
  captureImageErrorToReload : function (event) {
    var imageStatus
      = arAkahukuUtil.getImageStatus (event.target);
    if (!imageStatus.isImage || !imageStatus.isErrored
        || imageStatus.isBlocked
        // 赤福キャッシュ&プレビューURI
        || (imageStatus.requestURI 
            && (imageStatus.requestURI.schemeIs ("akahuku")
              || imageStatus.requestURI.schemeIs ("akahuku-safe"))
            && /^\/(?:(?:file)?cache\/|preview\.)/.test (imageStatus.requestURI.path))
       ){ // 即リロードするべき対象・状態では無い
      return;
    }
    if (!imageStatus.requestURI) {
      arAkahukuThread._captureImageErrorToReload2 (event, imageStatus);
      return;
    }
    var that = this;
    Akahuku.Cache.asyncGetHttpCacheStatus
      ({url: imageStatus.requestURI.spec,
        triggeringNode: event.target},
       false,
       function (cacheStatus) {
        if (cacheStatus.isExist
            && cacheStatus.httpStatusCode [0] != "2") {
          // 非エラーのキャッシュが有る場合
          return;
        }
        arAkahukuThread._captureImageErrorToReload2 (event, imageStatus);
       });
  },
  _captureImageErrorToReload2 : function (event, imageStatus) {
    var count = parseInt (event.target.getAttribute
        ("__akahuku_img_error") || 0);
    event.target.setAttribute ("__akahuku_img_error", ++count);
    if (count > arAkahukuThread.maxImageRetries) {
      // 上限数以上のエラーは無視する
      return;
    }
    if (Akahuku.debug.enabled) {
      Akahuku.debug.log
        ("captureImageErrorToReload takes care of "
         + imageStatus.requestURI.spec
         + " (status=" + imageStatus.requestImageStatus
         + " , count=" + count + ")"
         //+ "\n" + JSON.stringify (imageStatus)
         + "\n" + event.target.ownerDocument.location.href);
    }
    try {
      event.target
        .QueryInterface (Components.interfaces.nsIImageLoadingContent)
        .forceReload ();
      event.stopPropagation ();
      event.preventDefault ();
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },

  /**
   * 掲示板に戻るのリンクを作る
   * @param  HTMLDocument
   * @param  arAkahukuDocumentParam
   */
  createBackAnchor : function (targetDocument, documentParam) {
    if (!documentParam) {
      documentParam = Akahuku.getDocumentParam (targetDocument);
    }
    var a = targetDocument.createElement ("a");
    a.href = documentParam.links.back || "futaba.htm";
    // "掲示板に戻る"
    var text = "\u63B2\u793A\u677F\u306B\u623B\u308B";
    a.appendChild (targetDocument.createTextNode (text));
    if (arAkahukuThread.enableBackNew) {
      arAkahukuThread.makeAnchorOpenInBlank  (a, "back");
    }
    return a;
  },

  /**
   * カタログのリンクを作る
   * @param  HTMLDocument
   * @param  arAkahukuDocumentParam
   */
  createCatalogAnchor : function (targetDocument, documentParam) {
    if (!documentParam) {
      documentParam = Akahuku.getDocumentParam (targetDocument);
    }
    if (!documentParam.links.catalog) {
      return null;
    }
    var a = targetDocument.createElement ("a");
    a.href = documentParam.links.catalog;
    // "カタログ"
    var text = "\u30AB\u30BF\u30ED\u30B0";
    a.appendChild (targetDocument.createTextNode (text));
    if (arAkahukuThread.enableCatalogNew) {
      arAkahukuThread.makeAnchorOpenInBlank  (a, "catalog");
    }
    return a;
  },

  /**
   * アンカーを新しいタブでリンク先を開くようにする
   * @param  HTMLAnchorElement
   * @param  String "back" or "catalog"
   */
  makeAnchorOpenInBlank : function (a, type) {
    var targetDocument = a.ownerDocument;
    var span = targetDocument.createElement ("span");
    span.className = "akahuku_thread_" + type + "_new";
    span.appendChild (targetDocument.createTextNode ("*"));
    a.appendChild (span);
    a.target = "_blank";
  },
    
  /**
   * レス番号を振る、スレの消滅情報を追加する、[続きを読む] ボタンを追加する
   * ページの末尾に [掲示板に戻る] を追加する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound) {
      info.notifyUpdate ("thread-applied");
      return;
    }

    var param = Akahuku.getDocumentParam (targetDocument);

    if (info.isReply) {
      if (!("thread_param" in param)) {
        param.thread_param = new arAkahukuThreadParam (targetDocument);
      }
      param.thread_param.registerObserver ();
    }
    
    if ((info.isNormal || info.isReply)) {
      if (arAkahukuThread.enableDelNewTab) {
        arAkahukuThread.applyDelNewTab (targetDocument, targetDocument);
      }
    }
    
    if (info.isNormal || info.isReply) {
      var moveButtonIndex = 1;
      
      /**
       * 移動ボタンを作る
       *
       * @return HTMLDivElement
       *         移動ボタン
       */
      function createMoveButton () {
        var div, a;
        div = targetDocument.createElement ("div");
        div.id
          = "akahuku_move_button_" + moveButtonIndex;
        moveButtonIndex ++;
        div.style.cssFloat = "right";
        div.appendChild (targetDocument.createTextNode
                         ("["));
        a = targetDocument.createElement ("a");
        a.className = "akahuku_move_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u524D"));
        a.addEventListener
          ("click",
           function () {
            arAkahukuThread.onMove
              (arguments [0], true);
          }, true);
        div.appendChild (a);
        div.appendChild (targetDocument.createTextNode
                         ("\uFF0F"));
        a = targetDocument.createElement ("a");
        a.className = "akahuku_move_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u6B21"));
        a.addEventListener
          ("click",
           function () {
            arAkahukuThread.onMove
              (arguments [0], false);
          }, true);
        div.appendChild (a);
        div.appendChild (targetDocument.createTextNode
                         ("]"));
                
        return div;
      }
      
      /**
       * レスの末尾にスレの消滅情報を追加する
       *
       * @param  HTMLQuoteElement node
       *         最後の blockquote 要素
       */
      function addStatus (node) {
        // enableBottomStatus に関わらず最新レス番号を更新する
        var lastReplyNumber
          = lastReply ? Akahuku.getMessageNum (lastReply) : 0;
        var newestNumber = Math.max (threadNumber, lastReplyNumber);
        if (newestNumber > 0) { // is a valid number
          arAkahukuBoard.updateNewestNum (info, newestNumber);
        }

        if (info.isReply) {
          arAkahukuThread.displayReplyNumber (targetDocument);
        }
        
        var threadBottomContainer
        = arAkahukuThread.createThreadBottomContainer
        (info.isReply,
         targetDocument,
         info);
        
        var container = Akahuku.getMessageContainer (node);
        
        if (container) {
          /* レスがある場合 */
          var lastNode = container.nodes [container.nodes.length - 1];
          
          lastNode.parentNode.insertBefore (threadBottomContainer,
                                            lastNode.nextSibling);
          
          if (arAkahukuThread.enableBottomStatus) {
            threadBottomContainer.getElementsByTagName ("td") [1]
              .appendChild (arAkahukuThread.createThreadStatus
                            (targetDocument,
                             threadNumber,
                             lastReplyNumber,
                             replyNumber,
                             expire,
                             expireWarning,
                             isDel,
                             info.isReply));
          }

          // レス数を他タブへ通知
          arAkahukuThread.asyncNotifyReplyNumber (info, threadNumber, replyNumber);
        }
        else if (node) {
          /* レスが無い場合 */
          node.parentNode.insertBefore (threadBottomContainer,
                                        node.nextSibling);
                    
          if (arAkahukuThread.enableBottomStatus) {
            threadBottomContainer.getElementsByTagName ("td") [1]
              .appendChild (arAkahukuThread.createThreadStatus
                            (targetDocument,
                             threadNumber,
                             threadNumber,
                             replyNumber,
                             expire,
                             expireWarning,
                             isDel,
                             info.isReply));
          }
        }
        isDel = false;
      }
            
      var nodes = Akahuku.getMessageBQ (targetDocument);
      var node, nodeName;
      
      var isDel = false;
      var replyNumber = info.replyFrom - 1;
      var threadNumber = 0;
      var lastReply = null;
      var expire = "", expireWarning = "";
      var lastNode = null;
      var i;
            
      for (i = 0; i < nodes.length; i ++) {
        var container = Akahuku.getMessageContainer (nodes [i]);
        if (container) {
          /* レスの場合 */
          arAkahukuThread.updateReplyPrefix (container, info);
          
          if (info.isReply && (!arAkahukuThread.enableNumbering
               || replyNumber > arAkahukuThread.numberingMax)) {
            /* 返信モードでは全てをスキャンする必要は無い */
            replyNumber = nodes.length - 1;
            lastReply = nodes [replyNumber];
            lastNode = lastReply;
            break;
          }
          
          /* レス */
          replyNumber ++;
                    
          lastReply = nodes [i];
                    
          if (arAkahukuThread.enableNumbering
              && (info.isNormal
                  || replyNumber <= arAkahukuThread.numberingMax)) {
            var numbered = false;
            if (info.isMht) {
              if (container.main.innerHTML
                  .match (/^(&nbsp;|\xa0)?[0-9]+/)) {
                /* Ver.1.0.9 以前の番号付け */
                numbered = true;
              }
              else if (container.main.firstChild
                       && container.main.firstChild.nodeName.toLowerCase ()
                       == "span") {
                /* Ver.1.1.0 以降の番号付け */
                numbered = true;
              }
              else if (container.main.firstChild
                       && container.main.firstChild.nodeName.toLowerCase ()
                       == "div"
                       && "className" in container.main.firstChild
                       && container.main.firstChild.className == "s"
                       && container.main.firstChild.nextSibling
                       && container.main.firstChild.nextSibling.nodeName
                       .toLowerCase () == "span") {
                /* Ver.1.1.0 以降の番号付け + レイアウト板 */
                numbered = true;
              }
            }
            
            if (!numbered) {
              var span = targetDocument.createElement ("span");
              span.className = "akahuku_replynumber";
              span.appendChild (targetDocument.createTextNode
                                (replyNumber));
              
              if (arAkahukuDOM.hasClassName (container.main.firstChild, "s")) {
                container.main
                  .insertBefore (span,
                                 container.main.firstChild.nextSibling);
              }
              else {
                container.main
                  .insertBefore (span,
                                 container.main.firstChild);
              }
            }
          }
        }
        else {
          /* スレ本文 */
          if (lastNode != null) {
            addStatus (lastNode);
          }
          
          lastReply = null;
          replyNumber = info.replyFrom - 1;
          threadNumber = 0;
          expire = "";
          expireWarning = "";
          
          node = nodes [i];
                    
          if (info.isReply) {
            node.id = "akahuku_thread_text";
          }
          
          /* 消滅時刻、スレ番号を取得 */
          var lastText = "";
          node = node.previousSibling;
          var startNode = node;
          var isAmazon = false;
          while (node) {
            nodeName = node.nodeName.toLowerCase ();
            if (nodeName == "hr") {
              if (info.isNormal
                  && arAkahukuThread.enableMoveButton) {
                node.parentNode.insertBefore
                  (createMoveButton (), node.nextSibling);
              }
              break;
            }
            
            if (nodeName == "small"
                /* 避難所 patch */
                || nodeName == "span") {
              if (node.innerHTML.match
                  (/(([0-9]+\u5E74)?([0-9]+\u6708)?([0-9]+\u65E5)?([0-9]+:[0-9]+)?)\u9803\u6D88\u3048\u307E\u3059/)) {
                // /(([0-9]+年)?([0-9]+月)?([0-9]+日)?([0-9]+:[0-9]+)?)頃消えます/
                expire = RegExp.$1;
                if (info.isReply) {
                  info.expire = expire;
                  node.id = "akahuku_thread_deletetime";
                }
              }
            }
            else if (nodeName == "a") {
              var href;
              href = node.getAttribute ("href");
                            
              if (href.match (/^(\/[^\/]+\/)?res\/([0-9]+)\.html?$/)
                  || href.match (/^(\/[^\/]+\/)?2\/([0-9]+)\.html?$/)
                  || href.match (/^(\/[^\/]+\/)?b\/([0-9]+)\.html?$/)
                  || href.match (/\?res=([0-9]+)$/)) {
                /* 返信へのリンクの場合 */
                                
                if (href.match (/futaba\.php\?res=([0-9]+)$/)
                    && info.isNijiura
                    && info.server != "cgi") {
                  /* 二次裏で php を呼び出すアドレスを変更する */
                  /* futaba: ふたば固有の問題なので
                   * 外部には対応しない */
                  href
                    = href.replace
                    (/futaba\.php\?res=([0-9]+)$/,
                     "res/$1.htm");
                  node.setAttribute ("href", href);
                }
                                
                if (arAkahukuThread.enableNewTab) {
                  node.appendChild
                    (targetDocument.createTextNode ("*"));
                  node.target = "_blank";
                }
              }
              else if (href.match
                       (/http:\/\/www\.amazon\.co\.jp\//)) {
                /* Amazon */
                isAmazon = true;
                break;
              }
            }
            
            if (nodeName == "#text") {
              if ((node.nodeValue + lastText).match
                  (/No\.([0-9]+)/)) {
                threadNumber = parseInt (RegExp.$1);
                if (!info.isNormal
                    || !arAkahukuThread.enableMoveButton) {
                  break;
                }
              }
              lastText = node.nodeValue + lastText;
            }
            else if (nodeName != "wbr") {
              lastText = "";
            }
                        
            node = node.previousSibling;
          }
          if (isAmazon) {
            continue;
          }
          if (!node) {
            if (info.isNormal
                && arAkahukuThread.enableMoveButton) {
              startNode.parentNode.insertBefore
                (createMoveButton (),
                 startNode.parentNode.firstChild);
            }
          }
          
          /* 消滅情報、レス数を取得 */
          node = nodes [i];
          node = node.nextSibling;
          while (node) {
            nodeName = node.nodeName.toLowerCase ();
            
            if (nodeName == "hr") {
              break;
            }
            if (nodeName == "table") {
              break;
            }
            if (nodeName == "div"
                && arAkahukuDOM.hasClassName (node, "s")) {
              break;
            }
                        
            if (nodeName == "font"
                /* 避難所 patch */
                || nodeName == "span") {
              if (node.innerHTML.match
                  (/\u30EC\u30B9([0-9]+)\u4EF6\u7701\u7565/)) {
                replyNumber = parseInt (RegExp.$1);
              }
              else if (node.innerHTML.match
                       (/(<b>)?(\u3053\u306E\u30B9\u30EC\u306F[^<]+)(<\/b>)?/i)) {
                expireWarning = RegExp.$2;
                if (info.isReply) {
                  info.expireWarning = expireWarning;
                  info.isOld = true;
                  node.id = "akahuku_thread_warning";
                }
              }
              else if (node.innerHTML.match
                       (/\u3053\u306E\u30B9\u30EC\u306B\u5BFE\u3059\u308B\u524A\u9664\u4F9D\u983C/i)) {
                isDel = true;
                if (info.isReply) {
                  info.isDel = isDel;
                  node.id = "akahuku_thread_delcount";
                }
              }
            }
                        
            node = node.nextSibling;
          }
        }
        lastNode = nodes [i];
      }
            
      if (lastNode != null) {
        addStatus (lastNode);
      }
    }
    
    if (info.isReply) {
      /* スレ画像のサムネに id を付ける */
      var nodes = targetDocument.getElementsByTagName ("img");
      for (var i = 0; i < nodes.length; i ++) {
        var container = Akahuku.getMessageContainer (nodes [i]);
        if (container) {
          /* レスなので無視 */
          continue;
        }
        
        var ok = false;
        if (nodes [i].parentNode
            && nodes [i].parentNode.nodeName.toLowerCase ()
            == "a") {
          if (info.isFutaba) {
            /* サムネかどうかアドレスでチェック */
            if ("src" in nodes [i]) {
              var src = nodes [i].src;
              var uinfo
                = arAkahukuImageURL.parse (src);
              
              if (uinfo && uinfo.isImage && !uinfo.isAd) {
                ok = true;
              }
            }
          }
          else  {
            /* アドレスでチェックできないので状況から判断 */
            if ("hspace" in nodes [i]
                && nodes [i].hspace == "20"
                && nodes [i].parentNode.parentNode) {
              if (nodes [i].parentNode.parentNode
                  .nodeName.toLowerCase () == "form"
                  /* 避難所 patch */
                  || nodes [i].parentNode.parentNode
                  .nodeName.toLowerCase () == "div") {
                ok = true;
              }
            }
          }
        }
        
        if (ok) {
          nodes [i].id = "akahuku_thumbnail";
          break;
        }
      }
            
      arAkahukuThread.setTabIcon (targetDocument, info, null);
    }
        
    var backLink = null;
    var catalogLink = null;
    if ((info.isReply && arAkahukuThread.enableCatalogOnBottom)
        || arAkahukuThread.enableCatalogNew
        || arAkahukuThread.enableBackNew) {
      catalogLink = param.links.catalogAnchors [0];
      backLink = param.links.backAnchors [0];
    }
    
    if (info.isNormal
        && arAkahukuThread.enableReloadOnBottom) {
      /* 削除フォームを探す */
      var nodes = targetDocument.getElementsByTagName ("input");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].type == "hidden"
            && nodes [i].name == "mode"
            && nodes [i].value == "usrdel") {
          var table
            = arAkahukuDOM.findParentNode (nodes [i], "table");
          if (!table) {
            table
              = arAkahukuDOM.findParentNode (nodes [i], "div");
          }
          if (table) {
            var div = targetDocument.createElement ("div");
            div.id = "akahuku_links_on_bottom";
            div.style.clear = "left";
            div.style.paddingTop = "4px";
                
            div.appendChild (targetDocument.createTextNode ("["));
                    
            a = targetDocument.createElement ("a");
            a.href = targetDocument.location.href;
                    
            a.appendChild (targetDocument.createTextNode
                           ("\u30EA\u30ED\u30FC\u30C9"));
            div.appendChild (a);
                    
            div.appendChild (targetDocument.createTextNode ("]"));
                
            table.parentNode.insertBefore (div, table.nextSibling);
          }
        }
      }
    }
        
    if (info.isReply
        && (arAkahukuThread.enableBackOnBottom
            || (arAkahukuThread.enableCatalogOnBottom && catalogLink))) {
      nodes = targetDocument.getElementsByTagName ("hr");
      if (nodes.length > 0) {
        node = nodes [nodes.length - 1];
                
        var div = targetDocument.createElement ("div");
        div.id = "akahuku_links_on_bottom";
        var a;
        var span;
                
        if (arAkahukuThread.enableBackOnBottom) {
          div.appendChild (targetDocument.createTextNode ("["));
                    
          a = arAkahukuThread.createBackAnchor (targetDocument, param);
          div.appendChild (a);
                    
          div.appendChild (targetDocument.createTextNode ("]"));
        }
                
        if (arAkahukuThread.enableBackOnBottom
            && arAkahukuThread.enableCatalogOnBottom && catalogLink) {
          div.appendChild (targetDocument.createElement ("br"));
        }
                
        if (arAkahukuThread.enableCatalogOnBottom && catalogLink) {
          div.appendChild (targetDocument.createTextNode ("["));
                
          a = targetDocument.createElement ("a");
          a.href = param.links.catalog;
          a.appendChild (targetDocument.createTextNode
                         ("\u30AB\u30BF\u30ED\u30B0"));
          if (arAkahukuThread.enableCatalogNew) {
            span = targetDocument.createElement ("span");
            span.className = "akahuku_thread_catalog_new";
            span.appendChild (targetDocument.createTextNode ("*"));
            a.appendChild (span);
            a.target = "_blank";
          }
          div.appendChild (a);
                
          div.appendChild (targetDocument.createTextNode ("]"));
        }
                
        node.parentNode.insertBefore (div, node.nextSibling);
      }
    }
    
    if (arAkahukuThread.enableCatalogNew && catalogLink) {
      for (var i = 0; i < param.links.catalogAnchors.length; i ++) {
        arAkahukuThread.makeAnchorOpenInBlank
          (param.links.catalogAnchors [i], "catalog");
      }
    }
    
    if (arAkahukuThread.enableBackNew && backLink) {
      for (var i = 0; i < param.links.backAnchors.length; i ++) {
        arAkahukuThread.makeAnchorOpenInBlank
          (param.links.backAnchors [i], "back");
      }
    }
        
    if (arAkahukuThread.enableAlertGIF) {
      arAkahukuThread.applyAlertGIF (targetDocument, targetDocument);
    }
        
    Akahuku.getDocumentParam (targetDocument).respanel_param = null;
    
    if (arAkahukuThread.enableDelInline) {
      arAkahukuThread.applyInlineDel (targetDocument, targetDocument);
    }

    if (info.isReply || info.isNormal || info.isCatalog) {
      /* 画像ロード失敗時に再チャレンジ */
      targetDocument.body.addEventListener
        ("error", arAkahukuThread.captureImageErrorToReload, true);
    }

    if (info.isReply) {
      info.notifyUpdate ("thread-applied");
    }
  }
};
