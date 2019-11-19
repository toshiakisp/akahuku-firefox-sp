
/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter, arAkahukuCompat,
 *          arAkahukuDocumentParam, arAkahukuDOM, arAkahukuFile,
 *          arAkahukuP2P, arAkahukuReload, arAkahukuScroll,
 *          arAkahukuStyle, arAkahukuSound, arAkahukuThread,
 *          arAkahukuUI, arAkahukuWindow, arAkahukuBoard
 */

/**
 * 送信フォーム管理のデータ
 *   Inherits From: nsIWebProgressListener
 */
function arAkahukuPostFormParam (doc) {
  this.targetDocument = doc;
}
arAkahukuPostFormParam.prototype = {
  submitterLockingTimerID : null, /* Number  送信ボタンをロックする
                                   *   タイマー ID */
  formHidden : false,             /* Boolean  フォームを隠したか */
  busyTimerID : null,             /* Number  応答があるまで待つタイマー ID */
  commentWatchTimerID : null,     /* Number  コメント欄監視のタイマー ID */
  lastPreviewTime : 0,            /* Number   */
  blink : false,                  /* Boolean  警告の点滅状態 */
  lastCommentboxRows : 0,         /* Number  前回のコメント欄の行数 */
  lastCommentboxByteLength : 0,   /* Number  前回のコメント欄のバイト数 */
  lastMailboxByteLength : 0,      /* Number  前回のコメント欄のバイト数 */
  error : "",                     /* String  レス送信のエラー */
  cursorWasInForm : false,        /* Boolean  カーソルが固定したフォームに
                                   *   入ったか */
  clickInForm : false,            /* Boolean  フォーム内でクリックしたか */
  changeTimerID : null,           /* Number  固定したフォームの状態を変える
                                   *   タイマー ID */
  changeShow : 0,                 /* Number  次のフォームの表示状態 */
  changeAlpha : 0,                /* Number  次のフォームの透明状態 */
  waitForFocus : 0,               /* Number  フォーカス待ちの遅延
                                   *   2: 半透明 */
  targetDocument : null,          /* HTMLDocument  対象のドキュメント */
  commentboxId : null,            /* String  コメントボックスノードのID */
  targetURL : "",                 /* String  フォームの送信先の URL */
  added : false,                  /* Boolean  リスナに登録したか */
    
  upfile : "",                    /* String  添付ファイル */
    
  bottomFormAlignTimerID : null,  /* Number  末尾位置フォームの整形タイマー ID */
    
  attachableExt :
    ["jpg","jpeg","png","gif"],   /* Array  添付可能拡張子のリスト */
  attachableExtRegExp : null,     /* Regexp 添付可能拡張子かどうかの正規表現  */

  /**
   * データを開放する
   */
  destruct : function () {
    var window = this.targetDocument.defaultView;
    if (this.submitterLockingTimerID != null) {
      window.clearInterval (this.submitterLockingTimerID);
      this.submitterLockingTimerID = null;
    }
    if (this.busyTimerID != null) {
      window.clearInterval (this.busyTimerID);
      this.busyTimerID = null;
    }
    if (this.commentWatchTimerID != null) {
      window.clearInterval (this.commentWatchTimerID);
      this.commentWatchTimerID = null;
    }
    if (this.changeTimerID != null) {
      window.clearInterval (this.changeTimerID);
      this.changeTimerID = null;
    }
    if (this.bottomFormAlignTimerID != null) {
      window.clearInterval (this.bottomFormAlignTimerID);
      this.bottomFormAlignTimerID = null;
    }
        
    this.targetDocument = null;
  },
    
  /**
   * 添付可能ファイル拡張子かどうかの判定
   */
  testAttachableExt : function (filepath) {
    if (!this.attachableExtRegExp) {
      var pat = "\.(?:";
      for (var i =0; i < this.attachableExt.length; i ++) {
        if (i != 0)
          pat += '|';
        pat += this.attachableExt [i];
      }
      pat += ")$";
      this.attachableExtRegExp = new RegExp (pat);
    }
    return this.attachableExtRegExp.test (filepath);
  },

  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIWebProgressListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsIWebProgressListener)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 監視ウィンドウのロケーションが変わった時のイベント
   *   nsIWebProgressListener.onLocationChange
   * 未使用
   */
  onLocationChange : function (webProgress, request, location) {
  },
    
  /**
   * 進行状況が変わった時のイベント
   *   nsIWebProgressListener.onProgressChange
   * 未使用
   */
  onProgressChange: function (webProgress , request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
  },
    
  /**
   * プロトコルのセキュリティ設定が変わった時のイベント
   *   nsIWebProgressListener.onSecurityChange
   * 未使用
   */
  onSecurityChange : function (webProgress, request, state) {
  },
    
  /**
   * 状況が変わった時のイベント
   *   nsIWebProgressListener.onStateChange
   * 終了したらファイルを展開する
   *
   * @param  nsIWebProgress webProgress
   *         呼び出し元
   * @param  nsIRequest request
   *         状況の変わったリクエスト
   * @param  Number stateFlags
   *         変わった状況のフラグ
   * @param  nsresult status
   *         エラーコード
   */
  onStateChange : function (webProgress, request, stateFlags, status) {
    if (request.name == this.targetURL
        && stateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP
        && stateFlags & Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK) {
      try {
        var param
        = Akahuku.getDocumentParam (this.targetDocument).reload_param;
                
        if (param.replying) {
          var iframe
            = this.targetDocument.getElementById
            ("akahuku_reply_target_frame");
          arAkahukuPostForm.onIFrameLoad
            (iframe, this.targetDocument, true);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        /* 閉じている場合 */
      }
    }
  },
    
  /**
   * ステータスバーに表示するメッセージが変わった時のイベント
   *   nsIWebProgressListener.onStatusChange
   * 未使用
   */
  onStatusChange : function (webProgress, request, status, message) {
  }
};
/**
 * 送信フォーム管理
 *   [フォーム]
 */
var arAkahukuPostForm = {
  enableMailboxSageButton : false,    /* Boolean  sage ボタン */
  enableMailboxSageButtonKey : false, /* Boolean  ショートカットキー */
  mailboxSageButtonKeyKeycode : 0,            /* Number  ショートカットキー
                                               *   のキーコード */
  mailboxSageButtonKeyModifiersAlt : false,   /* Boolean  ショートカットキー
                                               *   の Alt */
  mailboxSageButtonKeyModifiersCtrl : false,  /* Boolean  ショートカットキー
                                               *   の Ctrl */
  mailboxSageButtonKeyModifiersMeta : false,  /* Boolean  ショートカットキー
                                               *   の Meta */
  mailboxSageButtonKeyModifiersShift : false, /* Boolean  ショートカットキー
                                               *   の Shift */
  enableMailboxExtend : false,        /* Boolean  メール欄の幅を 1.5 倍 */
  enableMailboxMemory : false,        /* Boolean  通常の送信で内容を保持する */
  enableMailboxClear : false,         /* Boolean  連携の送信で内容を消す */
  enableMailboxClearSage : false,     /* Boolean  sage は残す */
    
  enableCommentboxStatus : false,      /* Boolean  コメントの行数監視 */
  enableCommentboxStatusBytes : false, /* Boolean  バイト数も監視する */
  enableCommentboxStatusLimit : false, /* Boolean  オーバーしたら送信しない */
  enableCommentboxStatusSize : false,  /* Boolean  スクロールバーが出ないように
                                        *   拡張する */
  enableCommentboxSetRows : false,     /* Boolean  コメント欄の行数を指定する */
  commentboxSetRowsCount : 4,          /* Number  行数 */
  enableCommentboxScroll : false,      /* Boolean  コメント欄内から
                                        *   スクロールする */
  enableCommentboxIME : false,         /* Boolean  IME をオンにする */
  enableCommentboxBG : false,          /* Boolean  背景画像を表示する */
  enableCommentboxBGFrame : false,     /* Boolean  文字の影を白くする */
  enableCommentboxBGCustom : "no",     /* Boolean  カスタム */
  enableCommentboxPreview : false,     /* Boolean  画像をプレビュー */
  commentboxPreviewSize : 64,          /* Number  サイズ */
    
  enableCommentboxShortcut : false,         /* Boolean  コメント欄
                                             *   のショートカット */
  commentboxShortcutKeycode : 0,            /* Number  ショートカットキー
                                             *   のキーコード */
  commentboxShortcutModifiersAlt : false,   /* Boolean  ショートカットキー
                                             *   の Alt */
  commentboxShortcutModifiersCtrl : false,  /* Boolean  ショートカットキー
                                             *   の Ctrl */
  commentboxShortcutModifiersMeta : false,  /* Boolean  ショートカットキー
                                             *   の Meta */
  commentboxShortcutModifiersShift : false, /* Boolean  ショートカットキー
                                             *   の Shift */
  enableCommentboxSubmitShortcut : false,   /* Boolean  コメント欄内から
                                             *   Shift-Enterで送信 */
    
  enableNormalHide : false,         /* Boolean  フォームをデフォルトで
                                     *   閉じる */
  enableNormalNewTab : false,       /* Boolean  スレを新しいウィンドウに
                                     *   表示 */
  enableNormalPurgeHistory : false, /* Boolean  スレを立てたら
                                     *   戻れなくする */
  enableReplyHide : false,          /* Boolean  フォームをデフォルトで
                                     *   閉じる */
  enableReplyThread : false,        /* Boolean  スレを立てられるように
                                     *   する */
    
  enableReplySendClose : false,    /* Boolean  送信すると閉じる */
    
  enableFloat : false,            /* Boolean  フォームを固定 */
  enableFloatHideButton : false,  /* Boolean  [消す] ボタン */
  enableFloatMinimize : false,    /* Boolean  閉じる時にアイコンにする */
  enableFloatAlpha : false,       /* Boolean  半透明 */
  enableFloatClickOpen : false,   /* Boolean  クリックで開閉 */
  enableFloatClickClose : false,  /* Boolean  外をクリックで閉じる */
  floatPosition : "bottomright",  /* String  固定する位置
                                   *   "topleft":     左上
                                   *   "topright":    右上
                                   *   "bottomleft":  左下
                                   *   "bottomright": 右下 */
  floatPositionX : 0,             /* Number  x 座標 [px] */
  floatPositionY : 0,             /* Number  y 座標 [px] */
  floatWidth : "50%",             /* String  幅 */
    
  enablePreview : false, /* Boolean  添付ファイルをプレビュー */
  previewSize : 250,     /* Boolean  プレビューのサイズ */
    
  enableSaveAttachment : false, /* Boolean  添付ファイルを再起動時に保持 */
    
  enablePasteImageFromClipboard : false, /* Boolean  クリップボードから添付画像貼り付け */

  enableShimonkin : false,   /* Boolean  送信ボタンを変える */
  shimonkinType : "shimon",  /* String  ボタンの種類 */
  enableDelformHide : false, /* Boolean  削除フォームを消す */
  enableDelformLeft : false, /* Boolean  削除フォームを左に */
    
  enableBottom : false,      /* Boolean  ページ末尾に置く */
  enableBottomFormOnly : false,      /* Boolean  ページ末尾にフォームだけを置く */
    
  attachToWindow : function (window) {
    window.addEventListener
    ("keydown", arAkahukuPostForm.onKeyDown, true);
  },
  dettachFromWindow : function (window) {
    window.removeEventListener
    ("keydown", arAkahukuPostForm.onKeyDown, true);
  },
    
  /**
   * フォームにスクロールする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象の要素
   */
  focus : function (targetDocument, targetNode) {
    var param
    = Akahuku.getDocumentParam (targetDocument);
    if (!param) {
      if (targetNode) {
        if (targetNode.nodeName.toLowerCase () != "form") {
          targetNode
            = arAkahukuDOM.findParentNode (targetNode, "form");
        }
        if (targetNode) {
          targetNode.scrollIntoView ();
        }
      }
    }
    else if (!targetDocument
        .getElementById ("akahuku_floatpostform_container")) {
      if (arAkahukuPostForm.enableBottom) {
        var postform
        = targetDocument.getElementById ("akahuku_postform");
        if (arAkahukuPostForm.enableBottomFormOnly) {
          postform
          = targetDocument.getElementById ("akahuku_posttable");
        }
        postform.scrollIntoView (false);
      }
      else {
        targetDocument.defaultView.scrollTo (0, 0);
      }
    }
  },
    
  /**
   * キーが押されたイベント [XUL]
   *
   * @param  Event event
   *         対象のイベント
   */
  onKeyDown : function (event) {
    var document = event.currentTarget.document;
    if (arAkahukuPostForm.enableCommentboxShortcut) {
      if (arAkahukuPostForm.commentboxShortcutKeycode
          == event.keyCode
          && arAkahukuPostForm.commentboxShortcutModifiersAlt
          == event.altKey
          && arAkahukuPostForm.commentboxShortcutModifiersCtrl
          == event.ctrlKey
          && arAkahukuPostForm.commentboxShortcutModifiersMeta
          == event.metaKey
          && arAkahukuPostForm.commentboxShortcutModifiersShift
          == event.shiftKey) {
        var browser = document.getElementById ("content").selectedBrowser;
        if (Akahuku.getDocumentParamForBrowser (browser)) {
          browser.focus ();
          arAkahukuPostForm.focusCommentboxForBrowser (browser);
          event.preventDefault ();
        }
        else {
          Akahuku.debug.log ("no AkahukuDocumentParam on", browser);
        }
        return;
      }
    }
    if (arAkahukuPostForm.enableMailboxSageButtonKey) {
      if (arAkahukuPostForm.mailboxSageButtonKeyKeycode
          == event.keyCode
          && arAkahukuPostForm.mailboxSageButtonKeyModifiersAlt
          == event.altKey
          && arAkahukuPostForm.mailboxSageButtonKeyModifiersCtrl
          == event.ctrlKey
          && arAkahukuPostForm.mailboxSageButtonKeyModifiersMeta
          == event.metaKey
          && arAkahukuPostForm.mailboxSageButtonKeyModifiersShift
          == event.shiftKey) {
        var browser = document.getElementById ("content").selectedBrowser;
        if (Akahuku.getDocumentParamForBrowser (browser)) {
          arAkahukuPostForm.toggleSageButtonForBrowser (browser);
          event.preventDefault ();
        }
        else {
          Akahuku.debug.log ("no AkahukuDocumentParam on", browser);
        }
        return;
      }
    }
  },

  focusCommentboxForBrowser : function (browser) {
    // non-e10s
    if (!browser.contentDocument) {
      Akahuku.debug.error ("no contentDocument on", browser);
      return;
    }
    arAkahukuPostForm.focusCommentbox (browser.contentDocument);
  },
  focusCommentbox : function (targetDocument) {
    // content
    var target = arAkahukuPostForm.findCommentbox (targetDocument);
    if (!target) {
      Akahuku.debug.warn ("no commentbox found.");
      return;
    }

    arAkahukuPostForm.ensureDispPostForm (targetDocument);
    if (!arAkahukuPostForm.enableCommentboxStatusSize) {
      if (arAkahukuPostForm.enableCommentboxSetRows) {
        target.rows = arAkahukuPostForm.commentboxSetRowsCount;
        target.style.height = "auto";
      }
      else {
        target.rows = "8";
      }
    }

    target.setSelectionRange
      (target.value.length, target.value.length);
    target.focus ();

    // 必要ならフォームにスクロールする
    arAkahukuPostForm.focus (targetDocument, target);
  },

  toggleSageButtonForBrowser : function (browser) {
    // non-e10s
    if (!browser.contentDocument) {
      Akahuku.debug.error ("no contentDocument on", browser);
      return;
    }
    arAkahukuPostForm.toggleSageButton (browser.contentDocument);
  },
  toggleSageButton : function (targetDocument) {
    // content
    var target
      = targetDocument.getElementById ("akahuku_sagebutton");
    if (!target) {
      return;
    }
    arAkahukuPostForm.onSageButtonClickCore (targetDocument);
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
    if (info.isNormal || info.isReply) {
      /* 通常モード、レス送信モード共通 */
            
      if (arAkahukuPostForm.enableShimonkin) {
        var type = "";
        var base
        = "chrome://akahuku/content/images/";
                
        var types = [];
        if (arAkahukuPostForm.shimonkinType == "shimon") {
          types = ["shimon"];
        }
        else if (arAkahukuPostForm.shimonkinType == "shimon2") {
          types = ["shimon2"];
        }
        else if (arAkahukuPostForm.shimonkinType == "aka") {
          types = ["shimon_aka"];
        }
        else if (arAkahukuPostForm.shimonkinType == "sage") {
          types = ["shimon_sage"];
        }
        else if (arAkahukuPostForm.shimonkinType == "all") {
          types = ["shimon", "shimon2", "shimon_aka", "shimon_sage"];
        }
        else if (arAkahukuPostForm.shimonkinType == "custom") {
          types = ["submit"];
          base
          = arAkahukuFile.getURLSpecFromDirname
          (arAkahukuFile.systemDirectory);
        }
        type = types [parseInt (Math.random () * types.length)];
        var ext = ".png";
        if (type == "shimon2") {
          ext = ".gif";
        }
                
        var normal
        = Akahuku.protocolHandler.enAkahukuURI
        ("local", base + type + "" + ext);
        var hover
        = Akahuku.protocolHandler.enAkahukuURI
        ("local", base + type + "_hover" + ext);
        var push
        = Akahuku.protocolHandler.enAkahukuURI
        ("local", base + type + "_push" + ext);
        var disabled
        = Akahuku.protocolHandler.enAkahukuURI
        ("local", base + type + "_disabled" + ext);
                
        style
        .addRule ("form[enctype=\"multipart/form-data\"] input[type=\"submit\"]",
                  "-moz-appearance: none; "
                  + "-moz-box-sizing: content-box; "
                  + "-moz-binding: none; "
                  + "width: 48px; "
                  + "height: 36px; "
                  + "margin: 0px; "
                  + "padding: 0px; "
                  + "font-size: 0px; "
                  + "border: 0px; "
                  + "vertical-align: middle; "
                  + "cursor: default; "
                  + "background-color: transparent; "
                  + "background-image: url(\"" + normal + "\"); ")
        .addRule ("form[enctype=\"multipart/form-data\"] input[type=\"submit\"]:hover",
                  "-moz-appearance: none; "
                  + "-moz-box-sizing: content-box; "
                  + "-moz-binding: none; "
                  + "width: 48px; "
                  + "height: 36px; "
                  + "margin: 0px; "
                  + "padding: 0px; "
                  + "font-size: 0px; "
                  + "border: 0px; "
                  + "vertical-align: middle; "
                  + "cursor: default; "
                  + "background-color: transparent; "
                  + "background-image: url(\"" + hover + "\"); ")
        .addRule ("form[enctype=\"multipart/form-data\"] input[type=\"submit\"]:active",
                  "-moz-appearance: none; "
                  + "-moz-box-sizing: content-box; "
                  + "-moz-binding: none; "
                  + "width: 48px; "
                  + "height: 36px; "
                  + "margin: 0px; "
                  + "padding: 0px; "
                  + "font-size: 0px; "
                  + "border: 0px; "
                  + "vertical-align: middle; "
                  + "cursor: default; "
                  + "background-color: transparent; "
                  + "background-image: url(\"" + push + "\"); ")
        .addRule ("form[enctype=\"multipart/form-data\"] input[type=\"submit\"][disabled]",
                  "-moz-appearance: none; "
                  + "-moz-box-sizing: content-box; "
                  + "-moz-binding: none; "
                  + "width: 48px; "
                  + "height: 36px; "
                  + "margin: 0px; "
                  + "padding: 0px; "
                  + "font-size: 0px; "
                  + "border: 0px; "
                  + "vertical-align: middle; "
                  + "cursor: default; "
                  + "background-color: transparent; "
                  + "background-image: url(\"" + disabled + "\"); ")
        .addRule ("form[enctype=\"multipart/form-data\"] input[type=\"submit\"][disabled]:hover",
                  "-moz-appearance: none; "
                  + "-moz-box-sizing: content-box; "
                  + "-moz-binding: none; "
                  + "width: 48px; "
                  + "height: 36px; "
                  + "margin: 0px; "
                  + "padding: 0px; "
                  + "font-size: 0px; "
                  + "border: 0px; "
                  + "vertical-align: middle; "
                  + "cursor: default; "
                  + "background-color: transparent; "
                  + "background-image: url(\"" + disabled + "\"); ")
        .addRule ("form[enctype=\"multipart/form-data\"] input[type=\"submit\"][disabled]:active",
                  "-moz-appearance: none; "
                  + "-moz-box-sizing: content-box; "
                  + "-moz-binding: none; "
                  + "width: 48px; "
                  + "height: 36px; "
                  + "margin: 0px; "
                  + "padding: 0px; "
                  + "font-size: 0px; "
                  + "border: 0px; "
                  + "vertical-align: middle; "
                  + "cursor: default; "
                  + "background-color: transparent; "
                  + "background-image: url(\"" + disabled + "\"); ");
      }
            
      style
      .addRule ("#akahuku_commentbox_status",
                "padding: 4px 0 2px 0;")
      .addRule ("#akahuku_commentbox_status_commentbox_rows",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("#akahuku_commentbox_status_commentbox_bytes",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("#akahuku_commentbox_status_mailbox_bytes",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("#akahuku_commentbox_status_resize",
                "font-size: 9pt; "
                + "cursor: pointer; "
                + "color: #0040ee; "
                + "background-color: inherit;")
      .addRule ("#akahuku_commentbox_status_resize:hover",
                "font-size: 9pt; "
                + "cursor: pointer; "
                + "color: #ff4000; "
                + "background-color: inherit;")
      .addRule ("#akahuku_commentbox_status_warning",
                "font-size: 9pt; "
                + "color: #ff0000; "
                + "background-color: inherit;")
      .addRule ("#akahuku_sagebutton",
                "cursor: pointer; "
                + "color: #0040ee; "
                + "background-color: inherit;")
      .addRule ("#akahuku_sagebutton:hover",
                "cursor: pointer; "
                + "color: #ff4000; "
                + "background-color: inherit;")
      .addRule ("#akahuku_nodebutton",
                "cursor: pointer; "
                + "color: #0040ee; "
                + "background-color: inherit;")
      .addRule ("#akahuku_nodebutton:hover",
                "cursor: pointer; "
                + "color: #ff4000; "
                + "background-color: inherit;")
      .addRule ("#akahuku_postform_preview_status_width",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("#akahuku_postform_preview_status_height",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("#akahuku_postform_preview_status_appendix",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;")
      .addRule ("#akahuku_postform_preview_status_bytes",
                "font-size: 10pt; "
                + "vertical-align: text-bottom;");
            
      if (arAkahukuPostForm.enableFloat) {
        style
          .addRule ("#akahuku_floatpostform_container",
                    arAkahukuStyle.getFixedStyle
                    (arAkahukuPostForm.floatPosition,
                     "position: fixed; "
                     + "margin: 0; "
                     + "padding: 0; "
                     + "border: solid 2px #eeaa88; "
                     + "-moz-box-sizing: content-box; "
                     + "z-index: 300; ",
                     arAkahukuPostForm.floatPositionX,
                     arAkahukuPostForm.floatPositionY))
          .addRule ("#akahuku_floatpostform_container #akahuku_postform",
                    "margin: 0; "
                    + "padding: 4px; "
                    + "border: none; "
                    + "border-bottom: 1px solid #eeaa88;")
          .addRule ("#akahuku_floatpostform_container table",
                    "width: 100%; "
                    + "margin: 0; "
                    + "padding: 0;")
          .addRule ("#akahuku_floatpostform_container td",
                    "padding: 0; "
                    + "font-size: 9pt;")
          .addRule ("#akahuku_floatpostform_header",
                    "padding: 2px; "
                    + "background-color: #e04000; "
                    + "text-align: center;");
      }
      else {
        style
        .addRule ("#akahuku_postform_opener",
                  "text-align: center; "
                  + "width: 20%; "
                  + "padding: 2px; "
                  + "margin: 8px auto 8px auto; "
                  + "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: #eeaa88;")
        .addRule ("#akahuku_postform_opener:hover",
                  "text-align: center; "
                  + "width: 20%; "
                  + "padding: 2px; "
                  + "margin: 8px auto 8px auto; "
                  + "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: #eeaa88;");
      }

      style
      .addRule ("a.akahuku_postform_upfile_extrabuttons, "
                + "a.akahuku_postform_upfile_extrabuttons:hover",
                "cursor: pointer; "
                + "color: #0040ee; "
                + "background-color: inherit;")
            
      /* 避難所 patch */
      if (info.isMonaca) {
        style
        .addRule ("#akahuku_postform",
                  "text-align:center; ")
        .addRule ("#akahuku_posttable",
                  "border:none; "
                  + "border-collapse: separate; "
                  + "margin: 1em auto 0em auto; "
                  + "text-align: left; "
                  + "color: #800000;")
        .addRule ("#akahuku_posttable th",
                  "background-color: #eeaa88; "
                  + "border:none; "
                  + "text-align: left; "
                  + "font-weight: bold; "
                  + "padding: 3px; "
                  + "color: #800000;")
        .addRule ("#akahuku_posttable td",
                  "border:none; "
                  + "text-align: left; "
                  + "padding: 0px; " // ふたばと同じスタイルに
                  + "color: #800000;");
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
    if ((arAkahukuPostForm.enableNormalHide
         && arAkahukuPostForm.enableReplyHide)
        || arAkahukuPostForm.enableFloat) {
      style
      .addRule ("center > form[enctype=\"multipart/form-data\"]",
                "display: none;");
    }
  },
    
  /**
   * スタイルファイルのスタイルを解除する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  resetStyleFile : function (style) {
    if ((arAkahukuPostForm.enableNormalHide
         && arAkahukuPostForm.enableReplyHide)
        || arAkahukuPostForm.enableFloat) {
      style
      .addRule ("center > form[enctype=\"multipart/form-data\"]",
                "display: block;");
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuPostForm.enableMailboxSageButton
    = arAkahukuConfig
    .initPref ("bool", "akahuku.mailbox.sagebutton", true);
    if (arAkahukuPostForm.enableMailboxSageButton) {
      arAkahukuPostForm.enableMailboxSageButtonKey
        = arAkahukuConfig
        .initPref ("bool", "akahuku.mailbox.sagebutton.key", true);
      if (arAkahukuPostForm.enableMailboxSageButtonKey) {
        var value
          = arAkahukuConfig
          .initPref ("char", "akahuku.mailbox.sagebutton.key.keycode",
                     "VK_S");
        value
          = unescape (value);
        arAkahukuPostForm.mailboxSageButtonKeyKeycode
          = Components.interfaces.nsIDOMKeyEvent ["DOM_" + value];
                
        var defAlt, defCtrl, defMeta, defShift;
        defAlt = false;
        defCtrl = false;
        defMeta = false;
        defShift = false;
        if (Akahuku.isRunningOnMac) {
          defCtrl = true;
        }
        else if (Akahuku.isRunningOnWindows) {
          defAlt = true;
          defShift = true;
        }
        else {
          defCtrl = true;
          defShift = true;
        }
        arAkahukuPostForm.mailboxSageButtonKeyModifiersAlt
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.mailbox.sagebutton.key.modifiers.alt",
                     defAlt);
        arAkahukuPostForm.mailboxSageButtonKeyModifiersCtrl
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.mailbox.sagebutton.key.modifiers.ctrl",
                     defCtrl);
        arAkahukuPostForm.mailboxSageButtonKeyModifiersMeta
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.mailbox.sagebutton.key.modifiers.meta",
                     defMeta);
        arAkahukuPostForm.mailboxSageButtonKeyModifiersShift
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.mailbox.sagebutton.key.modifiers.shift",
                     defShift);
      }
    }
    arAkahukuPostForm.enableMailboxExtend
    = arAkahukuConfig
    .initPref ("bool", "akahuku.mailbox.extend", false);
    arAkahukuPostForm.enableMailboxMemory
    = arAkahukuConfig
    .initPref ("bool", "akahuku.mailbox.memory", false);
    arAkahukuPostForm.enableMailboxClear
    = arAkahukuConfig
    .initPref ("bool", "akahuku.mailbox.clear", false);
    arAkahukuPostForm.enableMailboxClearSage
    = arAkahukuConfig
    .initPref ("bool", "akahuku.mailbox.clear.sage", false);
        
    arAkahukuPostForm.enableCommentboxStatus
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.status", true);
    if (arAkahukuPostForm.enableCommentboxStatus) {
      arAkahukuPostForm.enableCommentboxStatusBytes
        = arAkahukuConfig
        .initPref ("bool", "akahuku.commentbox.status.bytes", true);
      arAkahukuPostForm.enableCommentboxStatusLimit
        = arAkahukuConfig
        .initPref ("bool", "akahuku.commentbox.status.limit", true);
      arAkahukuPostForm.enableCommentboxStatusSize
        = arAkahukuConfig
        .initPref ("bool", "akahuku.commentbox.status.size", false);
    }
    arAkahukuPostForm.enableCommentboxSetRows
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.setrows", false);
    arAkahukuPostForm.commentboxSetRowsCount
    = arAkahukuConfig
    .initPref ("int",  "akahuku.commentbox.setrows.count", 4);
    arAkahukuPostForm.enableCommentboxScroll
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.scroll", false);
    arAkahukuPostForm.enableCommentboxIME
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.ime", false);
    arAkahukuPostForm.enableCommentboxBG
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.bg", true);
    arAkahukuPostForm.enableCommentboxBGFrame
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.bg.frame", false);
    arAkahukuPostForm.enableCommentboxBGCustom
    = arAkahukuConfig
    .initPref ("char", "akahuku.commentbox.bg.custom", "no");
    arAkahukuPostForm.enableCommentboxPreview
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.preview", false);
    arAkahukuPostForm.commentboxPreviewSize
    = arAkahukuConfig
    .initPref ("int", "akahuku.commentbox.preview.size", 64);
        
    arAkahukuPostForm.enableCommentboxShortcut
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.shortcut", false);
    if (arAkahukuPostForm.enableCommentboxShortcut) {
      var value
        = arAkahukuConfig
        .initPref ("char", "akahuku.commentbox.shortcut.keycode",
                   "VK_C");
      value
        = unescape (value);
      arAkahukuPostForm.commentboxShortcutKeycode
        = Components.interfaces.nsIDOMKeyEvent ["DOM_" + value];
                
      arAkahukuPostForm.commentboxShortcutModifiersAlt
        = arAkahukuConfig
        .initPref ("bool",
                   "akahuku.commentbox.shortcut.modifiers.alt",
                   false);
      arAkahukuPostForm.commentboxShortcutModifiersCtrl
        = arAkahukuConfig
        .initPref ("bool",
                   "akahuku.commentbox.shortcut.modifiers.ctrl",
                   false);
      arAkahukuPostForm.commentboxShortcutModifiersMeta
        = arAkahukuConfig
        .initPref ("bool",
                   "akahuku.commentbox.shortcut.modifiers.meta",
                   true);
      arAkahukuPostForm.commentboxShortcutModifiersShift
        = arAkahukuConfig
        .initPref ("bool",
                   "akahuku.commentbox.shortcut.modifiers.shift",
                   true);
    }
    arAkahukuPostForm.enableCommentboxSubmitShortcut
    = arAkahukuConfig
    .initPref ("bool", "akahuku.commentbox.submit_shortcut", false);
        
    arAkahukuPostForm.enableNormalHide
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.normal.hide", false);
    arAkahukuPostForm.enableNormalNewTab
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.normal.newtab", false);
    arAkahukuPostForm.enableNormalPurgeHistory
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.normal.purge_history", false);
        
    arAkahukuPostForm.enableReplyHide
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.reply.hide", false);
    arAkahukuPostForm.enableReplyThread
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.reply.thread", false);
        
    var value;
    value
    = arAkahukuConfig
    .initPref ("bool", "akahuku.floatpostform.sendclose", true);
    arAkahukuPostForm.enableReplySendClose
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.reply.sendclose", value);
        
    arAkahukuPostForm.enableFloat
    = arAkahukuConfig
    .initPref ("bool", "akahuku.floatpostform", false);
    if (arAkahukuPostForm.enableFloat) {
      arAkahukuPostForm.enableFloatHideButton
        = arAkahukuConfig
        .initPref ("bool", "akahuku.floatpostform.hidebutton", false);
      arAkahukuPostForm.enableFloatMinimize
        = arAkahukuConfig
        .initPref ("bool", "akahuku.floatpostform.minimize", true);
      arAkahukuPostForm.enableFloatAlpha
        = arAkahukuConfig
        .initPref ("bool", "akahuku.floatpostform.alpha", false);
      arAkahukuPostForm.enableFloatClickOpen
        = arAkahukuConfig
        .initPref ("bool", "akahuku.floatpostform.clickopen", true);
      arAkahukuPostForm.enableFloatClickClose
        = arAkahukuConfig
        .initPref ("bool", "akahuku.floatpostform.clickclose", true);
      arAkahukuPostForm.floatPosition
        = arAkahukuConfig
        .initPref ("char", "akahuku.floatpostform.position",
                   "bottomright");
      arAkahukuPostForm.floatPositionX
        = arAkahukuConfig
        .initPref ("int",  "akahuku.floatpostform.position.x", 0);
      arAkahukuPostForm.floatPositionY
        = arAkahukuConfig
        .initPref ("int",  "akahuku.floatpostform.position.y", 0);
      value
        = arAkahukuConfig
        .initPref ("char", "akahuku.floatpostform.width", "50%");
      arAkahukuPostForm.floatWidth
        = unescape (value);
    }
        
    arAkahukuPostForm.enablePreview
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.preview", false);
    if (arAkahukuPostForm.enablePreview) {
      arAkahukuPostForm.previewSize
        = arAkahukuConfig
        .initPref ("int",  "akahuku.postform.preview.size", 250);
    }
        
    arAkahukuPostForm.enableSaveAttachment = false;
    if (arAkahukuCompat.comparePlatformVersion ("1.9.1b1") < 0) {
      arAkahukuPostForm.enableSaveAttachment
      = arAkahukuConfig
      .initPref ("bool", "akahuku.postform.save_attachment", false);
    }

    arAkahukuPostForm.enablePasteImageFromClipboard
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.paste_image_from_clipboard", false);

    arAkahukuPostForm.enableShimonkin
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.shimonkin", false);
    arAkahukuPostForm.shimonkinType
    = arAkahukuConfig
    .initPref ("char", "akahuku.postform.shimonkin.type", "all");
    arAkahukuPostForm.enableDelformHide
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.delform.hide", false);
    arAkahukuPostForm.enableDelformLeft
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.delform.left", false);
        
    arAkahukuPostForm.enableBottom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.postform.bottom", false);
        
    if (arAkahukuPostForm.enableBottom) {
      arAkahukuPostForm.enableFloat = false;
      arAkahukuPostForm.enableBottomFormOnly
      = arAkahukuConfig
      .initPref ("bool", "akahuku.postform.bottom_formonly", false);
    }
  },
    
  /**
   * 送信フォームを表示する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  ensureDispPostForm : function (targetDocument) {
    try {
      var postform = targetDocument.getElementById ("akahuku_postform");
      if (postform) {
        var opener
          = targetDocument.getElementById ("akahuku_postform_opener");
        if (opener) {
          arAkahukuPostForm.onCreateThreadClickCore
            (opener, true);
        }
        else if (arAkahukuPostForm.enableFloat) {
          var waitForFocus = 0;
                
          var postformContainer
            = targetDocument
            .getElementById ("akahuku_floatpostform_container");
          if (!postformContainer) {
            return;
          }
                    
          if (arAkahukuPostForm.enableFloatAlpha
              && postformContainer.style.opacity == "0.3") {
            /* 半透明の状態 = カーソルはフォームの外
             * なので、フォーカス待ちにする */
            waitForFocus |= 2;
          }
                    
          arAkahukuPostForm.changeFloatPostFormStatus
            (targetDocument, 1, 1, 0);
          if (waitForFocus) {
            var param
              = Akahuku.getDocumentParam (targetDocument)
              .postform_param;
            param.waitForFocus = waitForFocus;
          }
                
          return;
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * フォームを送信する
   *
   * @param  String formElementId
   *         form 要素の id
   * @param  String target
   *         開く先
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  submit : function (formElementId, target, info, targetDocument) {
    var formElement = targetDocument.getElementById (formElementId);
    if (!formElement) {
      return;
    }
        
    var commentbox = arAkahukuPostForm.findCommentbox (targetDocument);
        
    var div = targetDocument.getElementById ("akahuku_reply_status");
    if (div) {
      div.parentNode.removeChild (div);
    }
        
    div = targetDocument.getElementById ("akahuku_reply_status2");
    if (div) {
      div.parentNode.removeChild (div);
    }
        
    /* アップするファイルをチェック */
    var textonly = targetDocument.getElementsByName ("textonly");
    var filebox = targetDocument.getElementsByName ("upfile");
    if (textonly && textonly [0]
        && filebox && filebox [0]) {
      var filename = filebox [0].value;
            
      if (!textonly [0].checked && filename) {
        /* ファイルをアップする設定の場合 */
        if (filename.match (/^file:/)) {
          try {
            filename
              = arAkahukuFile.getFilenameFromURLSpec (filename);
          }
          catch (e) {
            /* ファイル名が不正 */
            filename = "";
          }
        }
                
        if (filename) {
          var file = arAkahukuFile.initFile (filename);
          if (!file) {
            /* ファイルが存在しない */
            filename = "";
          }
        }
                
        if (filename == "") {
          /* ファイルが存在しない場合中断する */
          filebox [0].style.border = "2px solid red";
          return;
        }
      }
      filebox [0].style.border = "";
    }
        
    if (arAkahukuReload.enable
        && arAkahukuReload.enableReply
        && target == "_self"
        && info.isReply) {
      /* レス送信と [続きを読む] の連携 */
            
      formElement.target = "akahuku_reply_target_frame";
            
      var iframe;
            
      iframe
      = targetDocument.getElementById ("akahuku_reply_target_frame");
      if (iframe) {
        iframe.parentNode.removeChild (iframe);
      }
            
      /* インラインフレーム内に送信する */
      iframe = targetDocument.createElement ("iframe");
      iframe.id = "akahuku_reply_target_frame";
      iframe.name = "akahuku_reply_target_frame";
      iframe.scrolling = "no";
      iframe.addEventListener
      ("load",
       function () {
        var event = arguments [0];
        arAkahukuPostForm.onIFrameLoad (event.currentTarget,
                                        targetDocument, false);
      }, false);
            
      var param
      = Akahuku.getDocumentParam (targetDocument).postform_param;
      if (!param.added) {
        param.targetURL = formElement.action;
        param.added = true;
                
        var webProgress
          = arAkahukuWindow.getWebProgressForWindow
          (targetDocument.defaultView);
        webProgress.addProgressListener
          (param, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
      }
            
      targetDocument.body.insertBefore (iframe,
                                        targetDocument.body.firstChild);
            
      if (arAkahukuReload.enableReplyScroll) {
        /* [続きを読む] のアンカーの位置にスクロール */
        var anchor
          = targetDocument.getElementById ("akahuku_reload_button");
        if (anchor) {
          anchor.scrollIntoView (true);
          anchor.focus ();
          anchor.blur ();
        }
      }
            
      arAkahukuPostForm.lockSubmitter (targetDocument, true);
      arAkahukuReload.setStatus
      ("\u30EC\u30B9\u9001\u4FE1\u4E2D...",
       true, targetDocument);
            
      /* [続きを読む] をロックする */
      var param
      = Akahuku.getDocumentParam (targetDocument).reload_param;
      if (param) {
        param.replying = true;
      }
            
      formElement.submit ();
    }
    else {
      /* 通常の送信 */
      arAkahukuScroll.setCurrentReply (targetDocument, info);
      if (info.isReply) {
        arAkahukuSound.setReplying (targetDocument);
      }
            
      if (arAkahukuPostForm.enableMailboxMemory) {
        var mailbox = targetDocument.getElementById ("akahuku_mailbox");
        if (mailbox) {
          var browser
            = arAkahukuWindow.getBrowserForWindow
            (targetDocument.defaultView);
          if (browser) {
            browser.__akahuku_mailbox_memory = mailbox.value;
          }
        }
      }
      formElement.target = target;
            
      arAkahukuPostForm.lockSubmitter (targetDocument, false);
      formElement.submit ();
            
      if (target == "_blank") {
        var commentbox
          = arAkahukuPostForm.findCommentbox (targetDocument);
        if (commentbox) {
          commentbox.value = "";
          commentbox.style.width = "100%";
          if (arAkahukuPostForm.enableCommentboxSetRows) {
            commentbox.style.height = "auto";
          }
          else {
            commentbox.style.height = "";
          }
        }
                
        var filebox = targetDocument.getElementsByName ("upfile");
        if (filebox && filebox [0]) {
          filebox [0].value = "";
          arAkahukuPostForm.onPreviewChangeCore (targetDocument);
        }
      }
    }
  },
    
  /**
   * レス送信のインラインフレームのロードが完了したイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean forceStop
   *         中止したか
   */
  onIFrameLoad : function (iframe, targetDocument, forceStop) {
    if (!forceStop
        && iframe.contentDocument.location.href == "about:blank") {
      return;
    }
        
    var window = targetDocument.defaultView;
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
    
    var baseform = targetDocument.getElementById ("baseform");
    if (baseform) {
      baseform.value = "";
    }
    var oe = targetDocument.getElementById ("oe3");
    if (oe) {
      window.setTimeout
        (function (oe) {
          oe.style.display = "none";
          window.setTimeout
            (function (oe) {
              oe.style.display = "";
            }, 100, oe);
        }, 1000, oe);
    }
    
    if (param.busyTimerID != null) {
      /* 送信完了したので応答待ちのタイマーを解除する */
      window.clearTimeout (param.busyTimerID);
      param.busyTimerID = null;
    }
        
    var div = targetDocument.getElementById ("akahuku_reply_status2");
    if (div) {
      div.parentNode.removeChild (div);
    }
        
    param
    = Akahuku.getDocumentParam (targetDocument).reload_param;
    /* [続きを読む] をロック解除する */
    if (param) {
      param.replying = false;
    }
        
    /* リフレッシュを解除する */
    iframe.contentDocument.defaultView
    .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
    .getInterface (Components.interfaces.nsIWebNavigation)
    .QueryInterface (Components.interfaces.nsIRefreshURI)
    .cancelRefreshURITimers ();
        
    /* 送信の結果をチェック */
        
    var result = "";
    var i;
        
    if (!forceStop) {
      var nodes = iframe.contentDocument.getElementsByTagName ("meta");
      for (i = 0; i < nodes.length; i ++) {
        if (nodes [i].httpEquiv == "refresh") {
          if (nodes [i].content.indexOf ("res") != -1
              || nodes [i].content.indexOf ("URL=2/") != -1
              || nodes [i].content.indexOf ("URL=b/") != -1) {
            result = "OK";
          }
          else if (nodes [i].content.indexOf ("futaba.htm") != -1) {
            /* 0 ページに飛ばされた場合 */
                        
            /* アク禁されなくても 0 ページに飛ぶ板がある */
            /* futaba: ふたば固有の問題なので外部には対応しない */
            result = "OK";
          }
          break;
        }
      }
    }
        
    if (result == "OK") {
      /* 送信成功 */
            
      arAkahukuReload.setStatus ("\u30EC\u30B9\u9001\u4FE1\u4E2D...",
                                 true, targetDocument);
            
      /* コメント欄のプレビューを消す */
      if (arAkahukuPostForm.enableCommentboxPreview) {
        var preview
          = targetDocument
          .getElementById ("akahuku_commentbox_preview");
        arAkahukuDOM.setText (preview, null);
      }
            
      window.setTimeout
      (arAkahukuPostForm.diffReloadAfterIFrameLoad,
       1000,
       targetDocument, iframe);
    }
    else {
      /* 送信失敗 */
            
      arAkahukuPostForm.focus (targetDocument, null);
            
      var full = false;
            
      div = targetDocument.createElement ("div");
      div.id = "akahuku_reply_status";
      var form = targetDocument.getElementById ("akahuku_postform");
      var reply_status_container
      = targetDocument.getElementById ("akahuku_reply_status_container");
      if (reply_status_container) {
        reply_status_container.appendChild (div);
      }
      else {
        form.parentNode.insertBefore (div, form);
      }
            
      div.appendChild
      (targetDocument.createTextNode
       ("\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
      div.appendChild (targetDocument.createElement ("br"));
      div.appendChild
      (targetDocument.createTextNode
       ("\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8: "));
            
      var span, span2, a, error = null;
      span = targetDocument.createElement ("span");
      span.style.fontSize = "12pt";
      span.style.backgroundColor = "inherit";
      span.style.color = "#ff0000";
      span2 = null;
            
      if (forceStop) {
        span.appendChild (targetDocument.createTextNode
                          ("\u4E2D\u6B62\u3057\u307E\u3057\u305F"));
                
        error = targetDocument.createElement ("div");
        error.style.fontSize = "10pt";
        error.style.backgroundColor = "inherit";
        error.style.color = "#ff0000";
        error.id = "akahuku_response_error";
        error.appendChild (targetDocument.createTextNode
                           ("\u30EC\u30B9\u81EA\u4F53\u306F\u6210\u529F\u3057\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059"));
      }
      else if (iframe.contentDocument.body.innerHTML
               .match (/<font color=\"?red\"? size=\"?5\"?><b>([^<]*)<br>(([^<]*)<br>)?/)
               || iframe.contentDocument.body.innerHTML
               .match (/<font size=\"?5\"? color=\"?red\"?><b>([^<]*)<br>(([^<]*)<br>)?/)) {
        var message = RegExp.$1;
        var r2 = RegExp.$2;
        var r3 = RegExp.$3;
        if (message.match (/\u6E80\u54E1\u3067\u3059/)) {
          /* 満員 */
          full = true;
        }
        span.appendChild (targetDocument.createTextNode (message));
                
        if (r2 && r3) {
          span2 = targetDocument.createElement ("span");
          span2.style.fontSize = "12pt";
          span2.style.backgroundColor = "inherit";
          span2.style.color = "#ff0000";
          span2.appendChild (targetDocument.createTextNode (r3));
        }
      }
      else if (iframe.contentDocument.body.innerHTML
               .match (/^([^<]*)$/)) {
        var message = RegExp.$1;
        if (message.match (/\u6E80\u54E1\u3067\u3059/)) {
          /* 満員 */
          full = true;
        }
        span.appendChild (targetDocument.createTextNode (message));
      }
      else if (iframe.contentDocument.body.innerHTML
               .match (/Warning.*mysql/)) {
        span.appendChild (targetDocument.createTextNode
                          ("\u30B5\u30FC\u30D0\u5074\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"));
      }
      /* 避難所 patch */
      else if (iframe.contentDocument.body.innerHTML
               .match (/<pre>([^<]*)<\/pre>/)) {
        span.appendChild (targetDocument.createTextNode (RegExp.$1));
      }
      else {
        span.appendChild (targetDocument.createTextNode
                          ("\u4E0D\u660E "));
                
        a = targetDocument.createElement ("a");
        a.style.fontSize = "9pt";
        a.id = "akahuku_response_error_button";
        a.appendChild (targetDocument.createTextNode
                       ("[\u8A73\u7D30]"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuPostForm.onResponseErrorClick (arguments [0]);
        }, false);
        span.appendChild (a);
                
        error = targetDocument.createElement ("pre");
        error.id = "akahuku_response_error";
        error.style.textAlign = "left";
        error.style.backgroundColor = "#ffffff";
        error.style.color = "#000000";
        error.style.borderStyle = "solid";
        error.style.borderColor = "#000000";
        error.style.borderWidth = "1px";
        error.style.fontSize = "9pt";
        error.style.overflow = "auto";
        error.style.display = "none";
        error.style.maxHeight = "130px";
                
        var s = "";
        if ("outerHTML" in iframe.contentDocument.documentElement) {
          s = iframe.contentDocument.documentElement.outerHTML;
        }
        else {
          s = "<html>\n"
            + iframe.contentDocument.documentElement.innerHTML
            + "\n</html>";
        }
                
        error.appendChild (targetDocument.createTextNode (s));
      }
      div.appendChild (span);
      if (span2) {
        div.appendChild (targetDocument.createElement ("br"));
        div.appendChild (span2);
      }
            
      if (error) {
        div.appendChild (error);
      }
            
      if (!full) {
        arAkahukuPostForm.unlockSubmitter (targetDocument, 2);
      }
      else {
        window.setTimeout (function (targetDocument) {
            arAkahukuPostForm.unlockSubmitter
            (targetDocument, 2);
          }, 5000, targetDocument);
      }
      arAkahukuReload.setStatus ("", true, targetDocument);
            
      arAkahukuPostForm.ensureDispPostForm (targetDocument);
            
      window.setTimeout
      (arAkahukuPostForm.removeIFrame,
       1000,
       targetDocument, iframe);
            
      arAkahukuSound.playReplyFail ();
    }
        
    window.setTimeout (function (targetDocument) {
        try {
          var history
          = targetDocument.defaultView
          .QueryInterface (Components.interfaces
                           .nsIInterfaceRequestor)
          .getInterface (Components.interfaces
                         .nsIWebNavigation)
          .sessionHistory;
          if (history.count > 1) {
            history.PurgeHistory (history.count - 1);
          }
          else {
            return;
          }
          // no e10s support bellow because of no need for recent firefox
          var w = arAkahukuWindow
          .getParentWindowInChrome (targetDocument.defaultView);
          var backCommand
          = w.document.getElementById ("Browser:Back");
          if (backCommand) {
            backCommand.setAttribute ("disabled", "true");
          }
        }
        catch (e) { Akahuku.debug.exception (e);
        }
      }, 1000, targetDocument);
        
    iframe.contentDocument.location.href = "about:blank";
  },
    
  /**
   * インラインフレームへのレス送信完了後に続きを読む
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLIFrameElement iframe
   *         送信対象の iframe 要素
   */
  diffReloadAfterIFrameLoad : function (targetDocument, iframe) {
    /* 続きを読む */
    arAkahukuReload.diffReloadCore (targetDocument, false, true);
        
    /* コメント欄を消す */
    var commentbox = arAkahukuPostForm.findCommentbox (targetDocument);
    if (commentbox) {
      commentbox.value = "";
      commentbox.style.width = "100%";
      if (arAkahukuPostForm.enableCommentboxSetRows) {
        commentbox.style.height = "auto";
      }
      else {
        commentbox.style.height = "";
      }
    }
        
    if (arAkahukuPostForm.enableMailboxClear) {
      /* メル欄を消す */
      var mailbox = targetDocument.getElementById ("akahuku_mailbox");
      if (mailbox) {
        if (arAkahukuPostForm.enableMailboxClearSage
            && mailbox.value.match (/(sage ?)/)) {
          mailbox.value = RegExp.$1;
        }
        else {
          mailbox.value = "";
        }
      }
    }
        
    /* アップするファイルの欄を消す */
    var filebox = targetDocument.getElementsByName ("upfile");
    if (filebox && filebox [0]) {
      filebox [0].value = "";
      if (arAkahukuPostForm.enablePreview) {
        arAkahukuPostForm.onPreviewChangeCore (targetDocument);
      }
    }
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    /* 固定したフォームを閉じる */
    if (arAkahukuPostForm.enableReplySendClose) {
      if (targetDocument.getElementById
          ("akahuku_floatpostform_container")
          && targetDocument.getElementById ("akahuku_postform")
          && arAkahukuPostForm.enableFloatClickOpen) {
        var ok = true;
        var clipper
          = targetDocument.getElementById
          ("akahuku_floatpostform_clipper");
        if (clipper && !clipper.checked) {
          ok = false;
        }
                
        if (ok) {
          arAkahukuPostForm.changeFloatPostFormStatus
            (targetDocument, 2, 2, 0);
        }
      }
            
      var opener
        = targetDocument.getElementById ("akahuku_postform_opener");
      if (opener) {
        arAkahukuPostForm.onCreateThreadClickCore
          (opener, false);
      }
    }
        
    iframe.parentNode.removeChild (iframe);
  },
    
  /**
   * インラインフレームへのレス送信失敗後にインラインフレームを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLIFrameElement iframe
   *         送信対象の iframe 要素
   */
  removeIFrame : function (targetDocument, iframe) {
    iframe.parentNode.removeChild (iframe);
  },
    
  /**
   * インラインフレームに対するレス送信の応答が
   * エラーだった時の詳細を表示するボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onResponseErrorClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var n = targetDocument.getElementById ("akahuku_response_error");
    if (n) {
      if (n.style.display !== "none") {
        n.style.display = "none";
      }
      else {
        n.style.display = "block";
      }
    }
  },
    
  /**
   * レス送信後に送信ボタンをロックする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean checkBusy
   *         サーバの応答をチェックするか
   */
  lockSubmitter : function (targetDocument, checkBusy) {
    var window = targetDocument.defaultView;
    var submitter
    = targetDocument.getElementById ("akahuku_postform_submitter");
    if (submitter) {
      submitter.disabled = "disabled";
      var param
        = Akahuku.getDocumentParam (targetDocument).postform_param;
      param.submitterLockingTimerID
        = window.setTimeout (arAkahukuPostForm.unlockSubmitter,
                      1000 * 15,
                      targetDocument, 0);
      if (checkBusy) {
        param.busyTimerID
          = window.setTimeout (arAkahukuPostForm.unlockSubmitter,
                        1000 * 120,
                        targetDocument, 1);
      }
      else {
        param.busyTimerID = null;
      }
    }
  },
    
  /**
   * レス送信後、一定時間後に送信ボタンを解除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Number type
   *         解除の種類
   *           0: 送信完了しており、送信から 15 秒経った
   *           1: 送信完了しておらず、送信から 60 秒経った
   *           2: 送信失敗した
   */
  unlockSubmitter : function (targetDocument, type) {
    var window = targetDocument.defaultView;
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
        
    if (type == 0) {
      if (param.busyTimerID != null) {
        param.submitterLockingTimerID = null;
        return;
      }
    }
        
    var submitter
    = targetDocument.getElementById ("akahuku_postform_submitter");
    if (submitter) {
      submitter.removeAttribute ("disabled");
    }
    if (param.submitterLockingTimerID != null) {
      /* 送信失敗して一定時間前に解除された場合、タイマーも解除する */
      window.clearTimeout (param.submitterLockingTimerID);
      param.submitterLockingTimerID = null;
    }
    if (param.busyTimerID != null) {
      /* 送信失敗して一定時間前に解除された場合、タイマーも解除する */
      window.clearTimeout (param.busyTimerID);
      param.busyTimerID = null;
    }
    if (type == 1) {
      var div = targetDocument.createElement ("div");
      div.id = "akahuku_reply_status2";
      var form = targetDocument.getElementById ("akahuku_postform");
      var reply_status_container
      = targetDocument.getElementById ("akahuku_reply_status_container");
      if (reply_status_container) {
        reply_status_container.appendChild (div);
      }
      else {
        form.parentNode.insertBefore (div, form);
      }
            
      var span = targetDocument.createElement ("span");
      span.style.fontSize = "12pt";
      span.style.backgroundColor = "inherit";
      span.style.color = "#ff0000";
      span.appendChild (targetDocument.createTextNode
                        ("\u30B5\u30FC\u30D0\u304B\u3089\u5FDC\u7B54\u304C\u3042\u308A\u307E\u305B\u3093"));
      div.appendChild (span);
            
      div.appendChild (targetDocument.createElement ("br"));
            
      span = targetDocument.createElement ("span");
      span.style.fontSize = "12pt";
      span.style.backgroundColor = "inherit";
      span.style.color = "#ff0000";
      span.appendChild (targetDocument.createTextNode
                        ("\u30EC\u30B9\u81EA\u4F53\u306F\u6210\u529F\u3057\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059"));
      div.appendChild (span);
    }
  },
    
  /**
   * 通常モード、レス送信モードの通常のフォーム送信のイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onNormalPostFormSubmit : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    event.preventDefault ();
        
    if (arAkahukuPostForm.checkCommentbox (targetDocument, false)) {
      return;
    }
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var target = event.target;
    if (target.nodeName.toLowerCase () != "form") {
      target = arAkahukuDOM.findParentNode (target, "form");
    }
        
    if (arAkahukuPostForm.enableNormalPurgeHistory
        && info.isNormal) {
      var browser
      = arAkahukuWindow.getBrowserForWindow
      (targetDocument.defaultView);
      if (browser) {
        browser.__akahuku_create_thread = "1";
      }
    }
        
    arAkahukuPostForm.submit (target.id,
                              arAkahukuPostForm.enableNormalNewTab
                              && info.isNormal ? "_blank" : "_self",
                              info, targetDocument);
  },
    
  /**
   * レス送信モードで、新規スレッドのラヂオボタンがある時のフォーム送信のイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onReplyPostFormSubmit : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
            
      if (arAkahukuPostForm.checkCommentbox (targetDocument, false)) {
        return;
      }
            
      var info
      = Akahuku.getDocumentParam (targetDocument).location_info;
            
      if (targetDocument
          .getElementById ("akahuku_postmode_reply").checked) {
        /* レス送信 */
                
        var row
          = targetDocument.getElementById ("akahuku_post_file_row");
        if (row) {
          if (row.parentNode
              && row.parentNode.nodeName.match (/tbody/i)) {
            /* 添付ファイルの input 要素を削除 */
            var rowparent = row.parentNode;
            rowparent.removeChild (row);
          }
        }
                
        var target = event.target;
        if (target.nodeName.toLowerCase () != "form") {
          target = arAkahukuDOM.findParentNode (target, "form");
        }
 
        try {
          arAkahukuPostForm.submit (target.id,
                                    "_self",
                                    info, targetDocument);
        }
        finally {
          /* 添付ファイルの input 要素を追加 */
          if (row) {
            var pwd = targetDocument.getElementsByName ("pwd") [0];
            var pwdTr = null;
            if (pwd) {
              pwdTr = arAkahukuDOM.findParentNode (pwd, "tr");
            }
            rowparent.insertBefore (row,
                                    pwdTr);
          }
        }
      }
      else if (targetDocument.
               getElementById ("akahuku_postmode_thread").checked) {
        /* スレを立てる */
                
        /* 確認 */
        var confirm = function (msg) {
          return targetDocument.defaultView.confirm (msg);
        };
        if (!confirm
            ("\u30B9\u30EC\u7ACB\u3066\u3061\u3083\u3046\u3088\uFF1F\n"
             + "\u305D\u308C\u3067\u3082\u3044\u3044\u306E\uFF1F")) {
          event.preventDefault ();
          return;
        }
                
        /* レス送信先の input 要素を削除 */
        var resto = targetDocument.getElementsByName ("resto");
        if (resto && resto.length == 1 && resto [0].parentNode) {
          resto = resto [0];
          var restoparent = resto.parentNode;
          restoparent.removeChild (resto);
        }
        else {
          event.preventDefault ();
          return;
        }
                
        var target = event.target;
        if (target.nodeName.toLowerCase () != "form") {
          target = arAkahukuDOM.findParentNode (target, "form");
        }
                
        try {
          arAkahukuPostForm.submit (target.id,
                                    "_blank",
                                    info, targetDocument);
        }
        finally {
          /* レス送信先の input 要素を追加 */
          restoparent.appendChild (resto);
        }
      }
    }
    finally {
      /* レス送信モードにする */
      var reply
      = targetDocument.getElementById ("akahuku_postmode_reply");
      reply.checked = "checked";
      var thread
      = targetDocument.getElementById ("akahuku_postmode_thread");
      thread.removeAttribute ("checked");
      arAkahukuPostForm.onPostModeClickCore (reply);
      event.preventDefault ();
    }
  },
    
  /**
   * レス送信モードで、送信モードのラヂオボタンを変更したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onPostModeClick : function (event) {
    var target = event.target;
        
    if (target.nodeName.toLowerCase () != "input") {
      target = arAkahukuDOM.findParentNode (target, "input");
    }
        
    arAkahukuPostForm.onPostModeClickCore (target);
  },
    
  /**
   * レス送信モードで、送信モードのラヂオボタンを変更したイベント
   *
   * @param  HTMLInputElement target
   *         対象の input 要素
   */
  onPostModeClickCore : function (target) {
    var targetDocument = target.ownerDocument;
    arAkahukuPostForm.ensureDispPostForm (targetDocument);
        
    var row = targetDocument.getElementById ("akahuku_post_file_row");
    var form = targetDocument.getElementById ("akahuku_postform");
    var table = targetDocument.getElementById ("akahuku_posttable");
    var header
    = targetDocument.getElementById ("akahuku_floatpostform_header");
    var header2
    = targetDocument.getElementById ("akahuku_postform_header");
    switch (target.id) {
      case "akahuku_postmode_reply":
        if (form) {
          form.style.backgroundColor = "transparent";
        }
        if (table) {
          table.style.backgroundColor = "";
        }
        if (row) {
          row.style.display = "none";
        }
        if (header) {
          header.style.backgroundColor = "";
        }
        if (header2) {
          header2.style.backgroundColor = "";
        }
        break;
      case "akahuku_postmode_thread":
        if (form) {
          form.style.backgroundColor = "#f0e0d6";
        }
        if (table) {
          table.style.backgroundColor = "#f0e0d6";
        }
        if (row) {
          row.style.display = "";
        }
        if (header) {
          header.style.backgroundColor = "#0080ff";
        }
        if (header2) {
          header2.style.backgroundColor = "#0080ff";
        }
        break;
    }
  },
    
  /**
   * [スレを立てる] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCreateThreadClick : function (event) {
    arAkahukuPostForm.onCreateThreadClickCore (event.target, false);
    event.preventDefault ();
  },
    
  /**
   * [スレを立てる] ボタンのイベント
   *
   * @param  HTMLAnchorElement target
   *         対象の a 要素
   * @param  Boolean forceOpen
   *         必ず開くかどうか
   */
  onCreateThreadClickCore : function (target, forceOpen) {
    var targetDocument = target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
    
    var postform = targetDocument.getElementById ("akahuku_postform");
    if (!postform) {
      return;
    }
    var appendix
    = targetDocument.getElementById ("akahuku_postform_opener_appendix");
    if (param.formHidden) {
      arAkahukuPostForm.setFormHidden (targetDocument, postform, false);
      arAkahukuDOM.setText (target, "\u9589\u3058\u308B");
      if (appendix) {
        appendix.style.display = "none";
      }
    }
    else {
      if (forceOpen) {
        return;
      }
      arAkahukuPostForm.setFormHidden (targetDocument, postform, true);
      if (info.isNormal) {
        arAkahukuDOM.setText (target, "\u30B9\u30EC\u7ACB\u3066\u308B");
      }
      else {
        arAkahukuDOM.setText (target, "\u30EC\u30B9\u66F8\u304F");
      }
            
      if (appendix) {
        appendix.style.display = "";
      }
    }
  },
  
  /**
   * フォームの表示状態を変更する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement postform
   *         対象のフォーム
   * @param  Boolean hide
   *         隠すかどうか
   */
  setFormHidden : function (targetDocument, postform, hide) {
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
    param.formHidden = hide;
    var oe = targetDocument.getElementById ("oe3");
    var commentbox = arAkahukuPostForm.findCommentbox (targetDocument);
    var status1
    = targetDocument.getElementById ("akahuku_reply_status");
    var status2
    = targetDocument.getElementById ("akahuku_reply_status2");
    
    if (hide) {
      postform.style.overflow = "hidden";
      if (oe) {
        oe.style.visibility = "hidden";
      }
      postform.style.width = "0px";
      postform.style.height = "0px";
      postform.style.visibility = "hidden";
      postform.style.padding = "0px";
      if (status1) {
        status1.style.display = "none";
      }
      if (status2) {
        status2.style.display = "none";
      }
    }
    else {
      postform.style.overflow = "";
      if (oe) {
        if (commentbox) {
          if (commentbox.style.visibility == "hidden") {
            oe.style.visibility = "visible";
          }
        }
      }
      postform.style.width = "";
      postform.style.height = "";
      postform.style.padding = "";
      postform.style.display = "block";
      postform.style.visibility = "visible";
      if (status1) {
        status1.style.display = "block";
      }
      if (status2) {
        status2.style.display = "block";
      }
    }
  },
    
  /**
   * [sage] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSageButtonClick : function (event) {
    var targetDocument = event.target.ownerDocument;
    arAkahukuPostForm.onSageButtonClickCore (targetDocument);
    event.preventDefault ();
  },
        
  /**
   * [sage] ボタンのイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onSageButtonClickCore : function (targetDocument) {
    var n = targetDocument.getElementById ("akahuku_mailbox");
    if (n) {
      arAkahukuPostForm.ensureDispPostForm (targetDocument);
            
      n.focus ();
            
      if (n.value.match (/\bsage\b/)) {
        n.value = n.value.replace (/\s*\bsage\b\s*/g, "");
      }
      else {
        n.value = "sage " + n.value;
      }
            
      n.setSelectionRange (n.value.length, n.value.length);
    }
  },
    
  /**
   * [node] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onNodeButtonClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    if (arAkahukuP2P.enableNoAccept) {
      return;
    }
        
    var n = targetDocument.getElementById ("akahuku_mailbox");
    if (n) {
      n.focus ();
            
      if (n.value.match (/=AKA[^=]+=/)) {
        n.value = n.value.replace (/\s*=AKA[^=]+=\s*/g, "");
      }
      else {
        var {arAkahukuP2PService}
        = Components.utils.import ("resource://akahuku/p2p-service.jsm", {});
        var nodeName = arAkahukuP2PService.servant
          .encodeNodeName (arAkahukuP2P.address, arAkahukuP2P.port);
        n.value = nodeName + " " + n.value;
      }
            
      n.setSelectionRange (n.value.length, n.value.length);
    }
        
    event.preventDefault ();
  },
    
  /**
   * コメント欄、メル欄の行数、バイト数を返す
   *
   * @param  HTMLTextAreaElement/HTMLInputElement element
   *         コメント欄、もしくはメル欄
   * @return Array
   *         ステータス
   *           [Number 行数, Number バイト数]
   */
  getTextStatus : function (element) {
    var text = element.value;
    var rows = 0, byteLength = 0;
        
    var lines = text.split (/[\r\n]/);
        
    if (lines.length >= 1 && lines [lines.length - 1].match (/^\s*$/)) {
      lines.length --;
    }
        
    rows = lines.length;
        
    if (arAkahukuPostForm.enableCommentboxStatusBytes) {
      byteLength = arAkahukuConverter.getSJISLength (element.value, 2);
    }
        
    return [rows, byteLength];
  },
    
  /**
   * 15 行制限の文字列を返す
   *
   * @return Number type
   *         種類
   *           0: 通常
   *           1: 15 行
   *           2: グリーンダヨー
   * @return Array
   *         文字列
   *           [String 文字列, String オプション]
   */
  getOverflowText : function (type) {
    var overflow = [];
        
    if (type == 0 || type == 1 || type == 2) {
      overflow
        = overflow.concat
        ([
          ["\u305D\u3093\u306A\u6C7A\u3081\u65B9\u3067\u3044\u3044\u306E\u304B\uFF01\uFF01\uFF1F", ""],
          ["\u3046\u308B\u305B\u3048\uFF01\uFF01", ""],
          ["\u30E2\u30EB\u30C0\u30FC\u3042\u306A\u305F\u75B2\u308C\u3066\u3044\u308B\u306E\u3088", ""],
          ["\u305D\u308C\u4EE5\u4E0A\u3044\u3051\u306A\u3044", ""],
          ["\u3061\u304F\u3057\u3087\u3046\u3001\u8AB0\u304C\u3053\u3093\u306A\u3053\u3068\u3092\uFF01", ""],
          ["\u3053\u306E\u307E\u307E\u3058\u3083\u304A\u3055\u307E\u308A\u304C\u3064\u304B\u306A\u3044\u3093\u3060\u3088\u306A", ""],
          ["\u3054\u3081\u3093\u7121\u7406", ""]
          ]);
    }
    if (type == 1 || type == 2) {
      overflow
      = overflow.concat
      ([
        ["\u6539\u884C\u3067\u304D\u306A\u3044\u306E\u304C\u304A\u3081\u3047\u3067\u672C\u5F53\u306B\u3088\u304B\u3063\u305F", ""],
        ["15\u884C\u3092\u8D85\u3048\u3066\u308B\u306E\u3082\u30B4\u30EB\u30B4\u30E0\u306E\u4ED5\u696D\u3060\uFF01", ""],
        ["\u6539\u884C\u3055\u308C\u306A\u3044\u306A\u3093\u3066\u3072\u3069\u3044\u3067\u3059\u30FC", ""],
        ["\u6539\u884C\u3055\u308C\u306A\u3044\u306E\u3082\u5B54\u660E\u306E\u7F60\u3060\uFF01", ""],
        ["\u5B89\u897F\u5148\u751F\u3082\u304615\u884C\u8D8A\u3048\u308B\u306E\u306F\u5ACC\u3067\u3059\u2026\u2026", ""],
        ["\u5B89\u897F\u5148\u751F\u2026\u6539\u884C\u3057\u305F\u3044\u3067\u3059\u2026", ""],
        ["\u300C15\u884C\u8D8A\u3048\u3066\u308B\u304B\u3089\u6539\u884C\u3055\u308C\u306A\u3044\u3093\u3060\u3088\uFF01\uFF01\u300D\u300C\uFF85\uFF64\uFF85\uFF9D\uFF80\uFF9E\uFF6F\uFF83\uFF70\uFF01\uFF1F\u300D", ""],
        ["\u6539\u884C\u3059\u308B\u306E\u3081\u3069\u3044\u3067\u3059", ""],
        ["15\u884C\u3001\u8D85\u3048\u3066\u3066\u3001\u3084\u3079\u3047\u3093\u3060\u3002", ""],
        ["\u306F\u3041\u2026\u306A\u3093\u3067\u4FFA\u306E\u604B\u6587\u306F15\u884C\u8D8A\u3048\u3061\u3083\u3046\u3093\u3060\u308D\u3046\u2026", ""],
        ["15\u884C\u8D85\u3048\u3066\u308B\u3068\u8A00\u3063\u305F\u306E\u3060\u611A\u304B\u8005\u3081\uFF01", ""]
        ]);
    }
    if (type == 2) {
      overflow
      = overflow.concat
      ([
        ["\uFF78\uFF9E\uFF98\uFF70\uFF9D\uFF80\uFF9E\uFF96\uFF70", "g"],
        ["\u7DD1\u306F\u76EE\u306B\u512A\u3057\u3044", "g"]
        ]);
    }
        
    var index
    = parseInt (Math.random () * overflow.length);
    if (index
        >= overflow.length) {
      index = 0;
    }
        
    var overflowText = overflow [index];
        
    return overflowText;
  },
    
  /**
   * コメント欄監視のタイマーイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean forceResize
   *         強制的にリサイズするか
   * @return Boolean
   *         オーバーしているかどうか
   */
  checkCommentbox : function (targetDocument, forceResize) {
    var commentboxRows = 0, commentboxByteLength = 0, mailboxByteLength = 0;
    var result;
    var node;
        
    if (!Akahuku.getDocumentParam (targetDocument)) {
      return false;
    }
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
        
    var statusdiv
    = targetDocument.getElementById ("akahuku_commentbox_status");
    if (!statusdiv) {
      return false;
    }
        
    var commentbox = arAkahukuPostForm.findCommentbox (targetDocument);
    if (commentbox) {
      var now = new Date ().getTime ();
      if (arAkahukuPostForm.enableCommentboxPreview
          && now > param.lastPreviewTime + 5000) {
        var preview
          = targetDocument
          .getElementById ("akahuku_commentbox_preview");
                
        var tmpNode = targetDocument.createElement ("div");
        arAkahukuDOM.setText (tmpNode, commentbox.value);
                
        arAkahukuLink.linkify
          (targetDocument,
           tmpNode.firstChild,
           true, false, true, false);

        var nodes = tmpNode.getElementsByTagName ("a");
        var urls = new Array ();
        for (var i = 0; i < nodes.length; i ++) {
          if ("className" in nodes [i]
              && (nodes [i].className == "akahuku_saveimage_button2"
                  || nodes [i].className == "akahuku_saveimage_stop")) {
            continue;
          }
          var url = nodes [i].getAttribute ("dummyhref");
          if (url.match (/\.(jpe?g|gif|png|bmp)(\?.*)?$/i)) {
            var text = arAkahukuDOM.getInnerText (nodes [i]);
            urls.push (new Array (url, text));
          }
        }
                
        var node = preview.firstChild;
        while (node) {
          var nextSibling = node.nextSibling;
          var ok = 0;
          for (var i = 0; i < urls.length; i ++) {
            if (node.getAttribute ("dummyhref") == urls [i][0]) {
              ok = 1;
              urls.splice (i, 1);
              i --;
            }
          }
          if (!ok) {
            node.parentNode.removeChild (node);
          }
          else {
                        
          }
          node = nextSibling;
        }
                
        for (var i = 0; i < urls.length; i ++) {
          node = targetDocument.createElement ("div");
          node.setAttribute ("dummyhref", urls [i][0]);
          var nobr = targetDocument.createElement ("span");
          nobr.style.whiteSpace = "nowrap";
                    
          var imgNode = targetDocument.createElement ("img");
          imgNode.style.maxWidth
            = arAkahukuPostForm.commentboxPreviewSize + "px";
          imgNode.style.maxHeight
            = arAkahukuPostForm.commentboxPreviewSize + "px";
          imgNode.style.verticalAlign = "middle";
                    
          var src = urls [i][0];
                    
          if (Akahuku.protocolHandler.isAkahukuURI (src)
              && Akahuku.protocolHandler.getAkahukuURIParam (src).type == "p2p") {
            src = src;
          }
          else if (arAkahukuP2P.enable
                   && src.match
                   (/^http:\/\/www\.(nijibox)5\.com\/futabafiles\/(tubu)\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
            src = arAkahukuP2P.enP2P (src);
          }
          else if (src.match (/\.(jpe?g|gif|png|bmp)$/i)) {
            src
              = Akahuku.protocolHandler.enAkahukuURI
              ("preview", src);
          }
                    
          imgNode.src = src;
          nobr.appendChild (imgNode);
                    
          var filename = urls [i][1];
          if (filename.match (/\/([^\/]+)$/)) {
            filename = RegExp.$1;
          }
                    
          var textNode = targetDocument.createElement ("span");
          arAkahukuDOM.setText (textNode, filename);
          textNode.style.fontSize = "12pt";
          textNode.style.color = "#a05050";
          textNode.style.verticalAlign = "middle";
                    
          nobr.appendChild (textNode);
                    
          node.appendChild (nobr);
                    
          preview.appendChild (node);
          param.lastPreviewTime = now;
        }
      }
            
      if (arAkahukuPostForm.enableCommentboxStatusSize) {
        /* コメント欄のサイズを変更する */
        if (commentbox.clientWidth && commentbox.clientHeight) {
          var modify = false;
                    
          if (!arAkahukuPostForm.enableFloat) {
            if (commentbox.clientWidth < commentbox.scrollWidth
                || forceResize) {
              var w
                = commentbox.scrollWidth
                + (commentbox.offsetWidth
                   - commentbox.clientWidth) + 8;
                            
              var tr
                = arAkahukuDOM.findParentNode (commentbox,
                                               "tr");
              var td = tr.getElementsByTagName ("td");
              var maxWidth
                = targetDocument.defaultView.innerWidth
                - td [0].clientWidth - 64;
              if (w > maxWidth) {
                /* ウィンドウの幅を越えないようにする */
                w = maxWidth;
              }
              if (commentbox.style.width != w + "px") {
                commentbox.style.width = w + "px";
                modify = true;
              }
            }
          }
          
          if (commentbox.clientHeight < commentbox.scrollHeight
              || forceResize) {
            var h
              = commentbox.scrollHeight
              + (commentbox.offsetHeight
                 - commentbox.clientHeight) + 8;
            var maxHeight
              = targetDocument.defaultView.innerHeight - 16;
                        
            var container;
            container
              = targetDocument
              .getElementById ("akahuku_floatpostform_header");
            if (container) {
              maxHeight -= container.offsetHeight;
            }
            container
              = targetDocument
              .getElementById ("akahuku_floatpostform_footer");
            if (container) {
              maxHeight -= container.offsetHeight;
            }
            container
              = targetDocument
              .getElementById ("akahuku_floatpostform_list");
            if (container) {
              maxHeight -= container.offsetHeight;
            }
            container
              = targetDocument
              .getElementById ("akahuku_posttable");
            if (container) {
              maxHeight
                -= container.offsetHeight
                - commentbox.offsetHeight;
            }
            if (arAkahukuPostForm.enableFloat) {
              /* スレッド操作パネルと重ならないようにする */
              container
                = targetDocument.getElementById
                ("akahuku_throp_thumbnail_container");
              if (container) {
                maxHeight -= container.offsetHeight;
              }
              container
                = targetDocument.getElementById
                ("akahuku_throp_header_container");
              if (container) {
                maxHeight -= container.offsetHeight;
              }
            }
            if (h > maxHeight) {
              /* ウィンドウの高さを越えないようにする */
              h = maxHeight;
            }
            if (commentbox.style.height != h + "px") {
              if (parseInt (commentbox.style.height) > h) {
                commentbox.style.minHeight = "";
              }
              commentbox.style.height = h + "px";
              modify = true;
            }
          }
          
          if (modify) {
            var button
              = targetDocument.getElementById
              ("akahuku_commentbox_status_resize");
            button.style.visibility = "visible";
          }
        }
      }
            
      var r, g, b;
      result = arAkahukuPostForm.getTextStatus (commentbox);
      commentboxRows = result [0];
      commentboxByteLength = result [1];
            
      if (param.lastCommentboxRows != commentboxRows) {
        param.lastCommentboxRows = commentboxRows;
                
        node
          = targetDocument.getElementById
          ("akahuku_commentbox_status_commentbox_rows");
        if (commentboxRows <= 15) {
          r = 128 + 127 * commentboxRows / 15;
          g = 128 * commentboxRows / 15;
          b = 0;
        }
        else {
          r = 255;
          g = 0;
          b = 0;
        }
        node.style.color
          = "rgb("
          + parseInt (r) + ","
          + parseInt (g) + ","
          + parseInt (b) + ")";
        arAkahukuDOM.setText (node, commentboxRows);
      }
            
      if (param.lastCommentboxByteLength != commentboxByteLength) {
        param.lastCommentboxByteLength = commentboxByteLength;
                
        node
          = targetDocument.getElementById
          ("akahuku_commentbox_status_commentbox_bytes");
        if (commentboxByteLength <= 1000) {
          r = 128 + 127 * commentboxByteLength / 1000;
          g = 128 * commentboxByteLength / 1000;
          b = 0;
        }
        else {
          r = 255;
          g = 0;
          b = 0;
        }
        node.style.color
          = "rgb("
          + parseInt (r) + ","
          + parseInt (g) + ","
          + parseInt (b) + ")";
        arAkahukuDOM.setText (node, commentboxByteLength);
      }
    }
        
    if (arAkahukuPostForm.enableCommentboxStatusBytes) {
      var mailbox = targetDocument.getElementById ("akahuku_mailbox");
      if (mailbox) {
        result = arAkahukuPostForm.getTextStatus (mailbox);
        mailboxByteLength = result [1];
                
        if (param.lastMailboxByteLength != mailboxByteLength) {
          param.lastMailboxByteLength = mailboxByteLength;
                    
          node
            = targetDocument.getElementById
            ("akahuku_commentbox_status_mailbox_bytes");
          if (mailboxByteLength <= 100) {
            r = 128 + 127 * mailboxByteLength / 100;
            g = 128 * mailboxByteLength / 100;
            b = 0;
          }
          else {
            r = 255;
            g = 0;
            b = 0;
          }
          node.style.color
            = "rgb("
            + parseInt (r) + ","
            + parseInt (g) + ","
            + parseInt (b) + ")";
          arAkahukuDOM.setText (node, mailboxByteLength);
        }
      }
    }
        
    var result = false;
        
    node
    = targetDocument.getElementById ("akahuku_commentbox_status_warning");
    if (commentboxRows > 15
        || commentboxByteLength > 1000
        || mailboxByteLength > 100) {
      if (node.style.display != "inline") {
        node.style.display = "inline";
                
        var type = 0;
        if (commentboxRows > 15) {
          type = 1;
          if (commentbox.value.substr (0, 1) == ">") {
            type = 2;
          }
        }
                
        var overflowText = arAkahukuPostForm.getOverflowText (type);
        if (overflowText [1] == "g") {
          node.style.color = "#789922";
        }
        else {
          node.style.color = "";
        }
        arAkahukuDOM.setText (node, overflowText [0]);
      }
      if (param.blink) {
        node.style.visibility = "hidden";
      }
      else {
        node.style.visibility = "visible";
      }
            
      param.blink = !param.blink;
            
      if (arAkahukuPostForm.enableCommentboxStatusLimit) {
        var submitter
          = targetDocument.getElementById
          ("akahuku_postform_submitter");
        if (submitter
            && !submitter.disabled) {
          submitter.disabled = "disabled";
        }
                
        result = true;
      }
    }
    else {
      if (node.style.display != "none") {
        node.style.display = "none";
      }
            
      if (arAkahukuPostForm.enableCommentboxStatusLimit) {
        var submitter
        = targetDocument.getElementById
        ("akahuku_postform_submitter");
        if (submitter
            && submitter.disabled
            && param.submitterLockingTimerID == null
            && param.busyTimerID == null) {
          submitter.removeAttribute ("disabled");
        }
      }
            
    }
        
    if (arAkahukuPostForm.enablePreview) {
      arAkahukuPostForm.onPreviewChangeCore
      (targetDocument);
    }
        
    return result;
  },
    
  /**
   * コメント欄でキーを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCommentKeyPress : function (event) {
    var ke = Components.interfaces.nsIDOMKeyEvent;
    if (arAkahukuPostForm.enableCommentboxSubmitShortcut) {
      if (event.keyCode == ke.DOM_VK_RETURN && event.shiftKey) {
        var targetDocument = event.target.ownerDocument;
        if (arAkahukuPostForm.checkCommentbox (targetDocument, false)) {
          return;
        }
        var form = arAkahukuDOM.findParentNode (event.target, "form");
        if (form) {
          var submitter
            = targetDocument.getElementById ("akahuku_postform_submitter");
          if (submitter && submitter.hasAttribute ("onclick")) {
            var clickEvent = targetDocument.createEvent ("MouseEvents");
            clickEvent.initEvent ("click", true, true);
            submitter.dispatchEvent (clickEvent);
          }
          else if (submitter) {
            var submitEvent = targetDocument.createEvent ("HTMLEvents");
            submitEvent.initEvent ("submit", false, true);
            form.dispatchEvent (submitEvent);
          }
          else {
            var info = Akahuku.getDocumentParam (targetDocument).location_info;
            arAkahukuPostForm.submit (form.id, "_self", info, targetDocument);
          }
          event.preventDefault ();
          event.stopPropagation ();
          return;
        }
      }
    }
    if (arAkahukuPostForm.enableCommentboxScroll) {
      try {
        var targetDocument = event.target.ownerDocument;
        var targetWindow = targetDocument.defaultView;
        var scrolled = true;
        switch (event.keyCode) {
          case ke.DOM_VK_PAGE_UP:
            targetWindow.scrollByPages (-1);
            break;
          case ke.DOM_VK_PAGE_DOWN:
            targetWindow.scrollByPages (1);
            break;
          case ke.DOM_VK_HOME:
            targetWindow.scrollTo (0, 0);
            break;
          case ke.DOM_VK_END:
            targetWindow.scrollTo
              (0, targetDocument.documentElement.scrollHeight);
            break;
          default:
            scrolled = false;
        }
        if (scrolled) {
          event.preventDefault ();
          event.stopPropagation ();
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        /* ドキュメントが閉じられた場合など */
      }
    }
  },
    
  /**
   * コメント欄にフォーカスが移ったイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCommentFocus : function (event) {
    try {
      if (event
          && event.target
          && event.target.ownerDocument) {
        var targetDocument = event.target.ownerDocument;
        var window = targetDocument.defaultView;
        var param
        = Akahuku.getDocumentParam (targetDocument).postform_param;
                
        if (arAkahukuPostForm.enableCommentboxStatus) {
          var commentbox
            = arAkahukuPostForm.findCommentbox (targetDocument);
          if (commentbox) {
            if (param.commentWatchTimerID == null) {
              param.blink = true;
              arAkahukuPostForm.checkCommentbox (targetDocument,
                                                 false);
                            
              param.commentWatchTimerID
                = window.setInterval
                (function () {
                  arAkahukuPostForm.checkCommentbox
                  (targetDocument, false);
                }, 600);
            }
          }
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * コメント欄がフォーカスを失なったイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCommentBlur : function  (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var window = targetDocument.defaultView;
      var param
      = Akahuku.getDocumentParam (targetDocument).postform_param;
            
      if (param.waitForFocus) {
        var postformContainer
          = targetDocument
          .getElementById ("akahuku_floatpostform_container");
        if (postformContainer) {
          var show = 0;
          var alpha = 0;
          if (arAkahukuPostForm.enableFloatAlpha
              && param.waitForFocus & 2) {
            alpha = 2;
          }
          param.waitForFocus = 0;
          if (show || alpha) {
            arAkahukuPostForm.changeFloatPostFormStatus
              (targetDocument,
               show, alpha, 200);
          }
        }
      }
            
      if (arAkahukuPostForm.enableCommentboxStatus) {
        var commentbox
          = arAkahukuPostForm.findCommentbox (targetDocument);
        if (commentbox) {
          if (param.commentWatchTimerID != null) {
            window.clearInterval (param.commentWatchTimerID);
            param.commentWatchTimerID = null;
            param.blink = true;
                        
            arAkahukuPostForm.checkCommentbox (targetDocument,
                                               false);
          }
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  onPasteFromClipboard : function (event) {
    if (!arAkahukuPostForm.enablePasteImageFromClipboard) {
      return;
    }
    var targetDocument = event.target.ownerDocument;
    var filebox = targetDocument.getElementsByName ("upfile")[0];
    if (!filebox) {
      return;
    }
    var param = Akahuku.getDocumentParam (targetDocument);
    if (!param) { /* ドキュメントが閉じられた場合 */
      return;
    }
    param = param.postform_param;
    if ("clipboardData" in event
        && event.clipboardData.types.length != 0) {
      var typesText = "";
      for (var i=0; i < event.clipboardData.types.length; i ++) {
        if (Akahuku.debug.enabled) {
          typesText += event.clipboardData.types [i] + ",";
        }
        if (event.clipboardData.types [i] === "text/plain") {
          return; // テキスト貼付け可能時は何もしない
        }
        else if (event.clipboardData.types [i] === "application/x-moz-file") {
          // 画像ファイルの貼り付け時はそのまま添付ファイルへ設定
          var file = event.clipboardData.mozGetDataAt ("application/x-moz-file", i);
          if (filebox && file instanceof Components.interfaces.nsIFile) {
            if (param.testAttachableExt (file.path)) {
              arAkahukuCompat.HTMLInputElement.mozSetFile (filebox, file, function () {
                if (arAkahukuPostForm.enablePreview) {
                  arAkahukuPostForm.onPreviewChangeCore (targetDocument);
                }
              });
              return; // 貼り付け成功時はそこで終了
            }
          }
        }
      }
      if (Akahuku.debug.enabled) {
        Akahuku.debug.log
          ("event.clipboardData.types.length = "
           + event.clipboardData.types.length+": "+typesText);
      }
    }

    var file = arAkahukuClipboard.getFile ();
    if (file) {
      if (param.testAttachableExt (file.path)) {
        arAkahukuCompat.HTMLInputElement.mozSetFile (filebox, file, function () {
          if (arAkahukuPostForm.enablePreview) {
            arAkahukuPostForm.onPreviewChangeCore (targetDocument);
          }
        });
        return; // 貼り付け成功時はそこで終了
      }
    }

    var flavor = "image/jpg";
    var imageBin = arAkahukuClipboard.getImage (flavor);
    if (imageBin === null) {
      Akahuku.debug.warn ("no " + flavor + " data in clipboard");
      return;
    }

    filebox.value = "";
    if (arAkahukuPostForm.enablePreview) {
      arAkahukuPostForm.onPreviewChangeCore (targetDocument);
    }

    // 一時フォルダにユニークなファイル名で画像保存して添付する
    var filename
      = arAkahukuFile.getDirectory ("TmpD")
      + arAkahukuFile.separator + "akahuku-clip.jpg";
    var file
      = arAkahukuFile.createUnique
      (filename, arAkahukuFile.NORMAL_FILE_TYPE, 420/*0o644*/);
    filename = file.path;
    arAkahukuFile.asyncCreateFile (filename, imageBin, function (code) {
      if (!Components.isSuccessCode (code)) {
        Akahuku.debug.error (arAkahukuUtil.resultCodeToString (code)
          + "in saving " + filename);
        return;
      }
      var filebox = targetDocument.getElementsByName ("upfile")[0];
      if (filebox) {
        arAkahukuCompat.HTMLInputElement.mozSetFile (filebox, file, function () {
          if (arAkahukuPostForm.enablePreview) {
            arAkahukuPostForm.onPreviewChangeCore (targetDocument);
          }
        });
      }
    });
  },

  /*
   * 要素への drop イベントで添付ファイルを設定する
   */
  onDropToAttatchFile : function (event) {
    var type = "application/x-moz-file";
    if (event.dataTransfer.types.contains (type)) {
      event.preventDefault ();
    }
    var targetDocument = event.target.ownerDocument;
    var filebox = targetDocument.getElementsByName ("upfile") [0];
    var file = null;
    // Try HTML5 way
    try {
      var dt = event.dataTransfer;
      if ("items" in dt) { // DataTransferItemList (Fx50+)
        for (var n=0; n < dt.items.length && !file; n ++) {
          if (dt.items [n].kind == "file") {
            file = dt.items [n].getAsFile (); // DOM File
            event.preventDefault ();
            break;
          }
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      file = null;
    }
    // Classical way
    for (var n=0; n < event.dataTransfer.mozItemCount && !file; n ++) {
      var types = event.dataTransfer.mozTypesAt (n);
      for (var i=0; i < types.length && !file; i ++) {
        if (types [i] === type) {
          file = event.dataTransfer.mozGetDataAt (types [i], n);
          try {
            file = file.QueryInterface (Components.interfaces.nsIFile);
          }
          catch (e) { // this may cause in a content process (e10s)
            file = null;
          }
        }
        else if (types [i] === "text/x-moz-url") {
          // fail safe for e10s
          var url = event.dataTransfer.mozGetDataAt (types [i], n);
          file = arAkahukuFile.initFile
            (arAkahukuFile.getFilenameFromURLSpec (url));
        }
      }
    }
    if (filebox && file) {
      arAkahukuCompat.HTMLInputElement.mozSetFile (filebox, file, function () {
        if (arAkahukuPostForm.enablePreview) {
          arAkahukuPostForm.onPreviewChangeCore (targetDocument);
        }
      });
    }
  },

  checkForDropToAttatchFile : function (event) {
    if (event.dataTransfer.types.contains ("application/x-moz-file")) {
      event.preventDefault (); // ドロップ受け入れ
    }
  },

  addDropEventsListenersTo : function (element) {
    element.addEventListener ("dragover", function (event) {
      arAkahukuPostForm.checkForDropToAttatchFile (event);
    }, false);
    element.addEventListener ("dragenter", function (event) {
      arAkahukuPostForm.checkForDropToAttatchFile (event);
    }, false);
    element.addEventListener ("drop", function (event) {
      arAkahukuPostForm.onDropToAttatchFile (event);
    }, false);
  },

  /**
   * 固定したフォームの [閉じる] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onFloatPostFormCloseClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuPostForm.changeFloatPostFormStatus (targetDocument,
                                                 2, 0, 0);
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * 固定したフォームの表示／非表示を変更する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Number show
   *         表示するか
   *           0: 変更しない
   *           1: 表示する
   *           2: 非表示にする
   * @param  Number alpha
   *         半透明にするか
   *           0: 変更しない
   *           1: 不透明にする
   *           2: 半透明にする
   * @param  Number delay
   *         遅延 [ms]
   */
  changeFloatPostFormStatus : function (targetDocument, show, alpha, delay) {
    var window = targetDocument.defaultView;
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
        
    if (param.changeTimerID != null) {
      if (delay > 0
          && show == param.changeShow
          && alpha == param.changeAlpha) {
        /* 同じ状態への遅延はキャンセルする */
        return;
      }
      window.clearInterval (param.changeTimerID);
      param.changeTimerID = null;
    }
        
    var postformContainer
    = targetDocument.getElementById ("akahuku_floatpostform_container");
    if (!postformContainer) {
      return;
    }

    var commentFocused = false;
        
    var focusedElement = targetDocument.activeElement;
    var form = arAkahukuDOM.findParentNode (focusedElement, "form");
    if (form
        && "id" in form
        && form.id == "akahuku_postform") {
      commentFocused = true;
    }
        
    if (delay == 0) {
      if (commentFocused) {
        /* フォーカス待ちにする */
        var waitForFocus = 0;
                
        if (alpha == 2) {
          waitForFocus |= 2;
        }
                
        if (waitForFocus) {
          param.waitForFocus = waitForFocus;
        }
      }
      else {
        param.waitForFocus = 0;
                
        if (alpha == 1) {
          postformContainer.style.removeProperty ("opacity");
        }
        else if (arAkahukuPostForm.enableFloatAlpha && alpha == 2) {
          postformContainer.style.opacity = "0.3";
        }
      }
    }
    else {
      param.changeShow = show;
      param.changeAlpha = alpha;
      param.changeTimerID
      = window.setTimeout (arAkahukuPostForm.changeFloatPostFormStatus,
                    delay,
                    targetDocument, show, alpha, 0);
            
      return;
    }
        
    var postform = targetDocument.getElementById ("akahuku_postform");
    if (postform) {
      if (show == 1 && !param.formHidden) {
        return;
      }
      if (show == 2 && param.formHidden) {
        return;
      }
    }
        
    if (show && postform) {
      var clipper
      = targetDocument.getElementById ("akahuku_floatpostform_clipper");
      if (clipper && !clipper.checked) {
        return;
      }
            
      var postformHeader
      = targetDocument.getElementById ("akahuku_floatpostform_header");
      var postformFooterContent
      = targetDocument
      .getElementById ("akahuku_floatpostform_footer_content");
      var postformFooterIcon
      = targetDocument
      .getElementById ("akahuku_floatpostform_footer_icon");
      var close
      = targetDocument.getElementById ("akahuku_floatpostform_close");
      var commentbox = arAkahukuPostForm.findCommentbox (targetDocument);
      var info
      = Akahuku.getDocumentParam (targetDocument).location_info;
            
      if (!param.formHidden && show == 2) {
        /* フォーム内の要素からフォーカスを外す */
                
        try {
          focusedElement.blur ();
        }
        catch (e) {
        }
                
        if (commentbox) {
          commentbox.blur ();
        }
        var nodes = postform.getElementsByTagName ("input");
        for (var i = 0; i < nodes.length; i ++) {
          if (nodes [i].type.toLowerCase () != "hidden") {
            nodes [i].blur ();
          }
        }
        
        arAkahukuPostForm.setFormHidden (targetDocument, postform, true);
        
        if (postformHeader) {
          postformHeader.style.display = "none";
        }
        if (close) {
          close.style.visibility = "hidden";
        }
                
        if (arAkahukuPostForm.enableFloatMinimize) {
          if (postformFooterIcon) {
            postformFooterIcon.style.display = "block";
          }
          if (postformFooterContent) {
            postformFooterContent.style.display = "none";
          }
          if (postformContainer) {
            postformContainer.style.width = "27px";
          }
        }
      }
      else if (param.formHidden && show == 1) {
        if (close) {
          close.style.visibility = "visible";
        }
                
        if (arAkahukuPostForm.enableFloatMinimize) {
          if (postformFooterIcon) {
            postformFooterIcon.style.display = "none";
          }
          if (postformFooterContent) {
            postformFooterContent.style.display = "";
          }
          if (postformContainer) {
            postformContainer.style.width
            = arAkahukuPostForm.floatWidth;
          }
        }
                
        arAkahukuPostForm.setFormHidden (targetDocument, postform, false);
        
        if (postformHeader && info.isReply
            && arAkahukuPostForm.enableReplyThread) {
          postformHeader.style.display = "block";
        }
                
        var commentbox
          = arAkahukuPostForm.findCommentbox (targetDocument);
        if (commentbox) {
          commentbox.value = commentbox.value;
          commentbox.focus ();
        }
      }
    }
  },
    
  /**
   * マウスが動いたイベント
   * 固定したフォーム上にマウスが入ったら表示する
   * 固定したフォーム上からマウスが出たら消す
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyMouseMove : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var param = Akahuku.getDocumentParam (targetDocument);
      if (!param) {
        /* ドキュメントが閉じられた場合 */
        return;
      }
      param = param.postform_param;
            
      if (arAkahukuUI.contextMenuShown) {
        /* コンテキストメニューが表示されていたら何もしない */
        return;
      }
            
      var container
      = targetDocument.getElementById ("akahuku_floatpostform_container");
      if (!container) {
        return;
      }
            
      if (event.clientX >= container.offsetLeft
          && event.clientX < container.offsetLeft + container.offsetWidth
          && event.clientY >= container.offsetTop
          && event.clientY < container.offsetTop
          + container.offsetHeight) {
        /* 固定したフォーム上にマウスが居る */
                
        param.cursorWasInForm = true;
                
        if (arAkahukuPostForm.enableFloatClickOpen) {
          /* クリックで開くので、開かない */
          /* 透明度だけ変える */
          arAkahukuPostForm.changeFloatPostFormStatus
          (targetDocument, 0, 1, 0);
        }
        else {
          /* 開く */
          arAkahukuPostForm.changeFloatPostFormStatus
          (targetDocument, 1, 1, 200);
        }
      }
      else {
        /* 固定したフォーム外にマウスが居る */
                
        if (param.cursorWasInForm) {
          /* 閉じてから現在までの間に固定したフォーム内にマウスが居た */
          param.cursorWasInForm = false;
                    
          var form
          = targetDocument.getElementById ("akahuku_postform");
          if (form) {
            if (arAkahukuPostForm.enableFloatClickOpen) {
              /* クリックで閉じるので、閉じない */
              if (arAkahukuPostForm.enableFloatAlpha) {
                /* 透明度だけ変える */
                arAkahukuPostForm.changeFloatPostFormStatus
                  (targetDocument,
                   0, 2, 200);
              }
            }
            else {
              /* 閉じる */
              arAkahukuPostForm.changeFloatPostFormStatus
                (targetDocument,
                 2, 2, 200);
            }
          }
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * クリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyMouseDown : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var param
      = Akahuku.getDocumentParam (targetDocument).postform_param;
            
      if ("id" in event.target
          && (event.target.id == "akahuku_sagebutton"
              || event.target.id == "akahuku_nodebutton")) {
        /* アクセスキーから何故か呼ばれる */
        return;
      }
            
      if (event.target.nodeName.toLowerCase () == "input") {
        /* ボタンのキー操作から何故か呼ばれる */
        return;
      }
            
      var container
      = targetDocument.getElementById ("akahuku_floatpostform_container");
      if (!container) {
        return;
      }
            
      if (event.clientX >= container.offsetLeft
          && event.clientX < container.offsetLeft + container.offsetWidth
          && event.clientY >= container.offsetTop
          && event.clientY < container.offsetTop
          + container.offsetHeight) {
        /* 固定したフォーム上にマウスが居る */
        param.clickInForm = true;
      }
      else {
        /* 固定したフォーム外にマウスが居る */
        param.clickInForm = false;
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * クリックしたイベント
   * 固定したフォームの表示状態を変更する
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyClick : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var param
      = Akahuku.getDocumentParam (targetDocument).postform_param;
            
      if ("id" in event.target
          && (event.target.id == "akahuku_sagebutton"
              || event.target.id == "akahuku_nodebutton")) {
        /* アクセスキーから何故か呼ばれる */
        return;
      }
            
      if (event.target.nodeName.toLowerCase () == "input") {
        /* ボタンのキー操作から何故か呼ばれる */
        return;
      }
            
      var container
      = targetDocument.getElementById ("akahuku_floatpostform_container");
      if (!container) {
        return;
      }
            
      if (event.clientX >= container.offsetLeft
          && event.clientX < container.offsetLeft + container.offsetWidth
          && event.clientY >= container.offsetTop
          && event.clientY < container.offsetTop
          + container.offsetHeight) {
        /* 固定したフォーム上にマウスが居る */
        /* 開く */
        arAkahukuPostForm.changeFloatPostFormStatus
        (targetDocument,
         1, 0, 0);
      }
      else {
        /* 固定したフォーム外にマウスが居る */
                
        if (!param.clickInForm) {
          /* 外でボタンを押して外で離した場合 */
          var form
          = targetDocument.getElementById ("akahuku_postform");
          if (form) {
            if (arAkahukuPostForm.enableFloatClickOpen
                && !arAkahukuPostForm.enableFloatClickClose) {
              /* 閉じるボタンで閉じるので、閉じない */
              /* 透明度だけ変える */
              arAkahukuPostForm.changeFloatPostFormStatus
                (targetDocument,
                 0, 2, 0);
            }
            else {
              /* 閉じる */
              arAkahukuPostForm.changeFloatPostFormStatus
                (targetDocument,
                 2, 2, 0);
            }
          }
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * 固定したフォームの [デフォルトで閉じる] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onFloatPostFormClipperCheck : function (event) {
    var targetDocument = event.target.ownerDocument;
    var clipper
    = targetDocument.getElementById ("akahuku_floatpostform_clipper");
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    if (clipper) {
      if (info.isReply) {
        arAkahukuConfig
          .setBoolPref ("akahuku.postform.reply.hide",
                        clipper.checked);
        arAkahukuPostForm.enableReplyHide = clipper.checked;
      }
      else {
        arAkahukuConfig
          .setBoolPref ("akahuku.postform.normal.hide",
                        clipper.checked);
        arAkahukuPostForm.enableNormalHide = clipper.checked;
      }
    }
  },
    
  /**
   * 固定したフォームの [消す] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onFloatPostFormHideButtonClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var postformContainer
    = targetDocument.getElementById ("akahuku_floatpostform_container");
    if (postformContainer) {
      postformContainer.style.display = "none";
    }
    event.preventDefault ();
  },
    
  /**
   * 添付ファイルが変更されたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onPreviewChange : function (event) {
    arAkahukuPostForm.onPreviewChangeCore (event.target.ownerDocument);
        
    if (arAkahukuPostForm.enableSaveAttachment) {
      try {
        var target = event.currentTarget;
        
        var panel
          = arAkahukuWindow.getBrowserForWindow
          (target.ownerDocument.defaultView).parentNode;
            
        arAkahukuPostForm.saveTextData (panel, target);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
  },
    
  /**
   * テキストデータをセッションに保存
   *
   * @param  XULElement panel
   *         対象のタブ
   * @param  HTMLElement element
   *         対象の要素
   */
  saveTextData : function (panel, element) {
    var wrappedElement = XPCNativeWrapper (element);
    var id = wrappedElement.name;
        
    if (!panel.__SS_text) {
      panel.__SS_text = [];
      panel.__SS_text._refs = [];
    }
        
    var ix = panel.__SS_text._refs.indexOf (element);
    if (ix == -1) {
      panel.__SS_text._refs.push (element);
      ix = panel.__SS_text.length;
    }
    else if (!panel.__SS_text [ix].cache) {
      return false;
    }
    
    var content = wrappedElement.ownerDocument.defaultView;
    while (content != content.top) {
      var frames = content.parent.frames;
      for (var i = 0; i < frames.length && frames [i] != content; i++) {
      }
      id = i + "|" + id;
      content = content.parent;
    }
    
    panel.__SS_text [ix] = {
      id : id,
      element : wrappedElement
    };
    
    return true;
  },
    
  /**
   * 添付ファイルが変更されたイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onPreviewChangeCore : function (targetDocument) {
    var filebox = targetDocument.getElementsByName ("upfile");
    if (!filebox || !filebox [0]) {
      filebox = targetDocument.getElementsByName ("up");
    }
        
    if (filebox && filebox [0]) {
      filebox = filebox [0];
      var filename = filebox.value;
            
      var documentParam = Akahuku.getDocumentParam (targetDocument);
      if (documentParam) {
        var param = documentParam.postform_param;
        if (param.upfile == filename) {
          /* ファイルが変わってない場合は何もしない */
          return;
        }
      }
            
      var mimeType = "";
      if (filename.match (/\.jpe?g$/i)) {
        mimeType = "image/jpeg";
      }
      else if (filename.match (/\.gif/i)) {
        mimeType = "image/gif";
      }
      else if (filename.match (/\.png/i)) {
        mimeType = "image/png";
      }
      else if (filename.match (/\.webm$/i)) {
        mimeType = "video/webm";
      }

      if (!param.testAttachableExt (filename)) {
        // 添付可能なファイル以外はプレビュー無し
        mimeType = "";
      }
      else if (!mimeType) {
        // 添付可能判定だが想定外のファイルは適当に判断
        if (/\.(mp4|m4v|ogg|ogv)$/i.test (filename)) {
          mimeType = "video/*";
        }
        else if (/\.(bmp|ico|svg|svgz)$/i.test (filename)) {
          mimeType = "image/*";
        }
      }
            
      var container
      = targetDocument
      .getElementById ("akahuku_postform_preview_container");
      var preview
      = targetDocument.getElementById ("akahuku_postform_preview");
      var previewV
      = targetDocument.getElementById ("akahuku_postform_video_preview");
      var bytes
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_bytes");
      var width
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_width");
      var times
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_times");
      var height
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_height");
      var slash
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_slash");
      var appendix
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_appendix");
            
      if (container && preview && bytes) {
        if (documentParam && param) {
          // 以下で処理することになる添付ファイル名を記憶する
          param.upfile = filename;
        }
        var {AkahukuFileUtil}
        = Components.utils.import ("resource://akahuku/fileutil.jsm", {});
        AkahukuFileUtil.createFromFileName (filename)
        .then (function (file) {
          try {
            var readableSize
              = arAkahukuPostForm.getReadableSize (file.size || file.fileSize);
                        
            preview.setAttribute ("__size", readableSize);
                        
            arAkahukuDOM.setText (bytes, readableSize);
            arAkahukuDOM.setText (appendix, "");
                        
            if (mimeType) {
              width.style.display = "";
              times.style.display = "";
              height.style.display = "";
              slash.style.display = "";
                            
              var previewT = preview;
              var previewO = previewV;
              if (/^video/.test (mimeType)) {
                previewT = previewV;
                previewO = preview;
              }

              previewT.style.display = "";
              previewO.style.display = "none";
              previewO.removeAttribute ("src");

              previewT.style.maxWidth
                = arAkahukuPostForm.previewSize + "px";
              previewT.style.maxHeight
                = arAkahukuPostForm.previewSize + "px";

              previewT.src
                = Akahuku.protocolHandler.enAkahukuURI
                ("local",
                 arAkahukuFile.getURLSpecFromFilename
                 (filename));
            }
            else {
              width.style.display = "none";
              times.style.display = "none";
              height.style.display = "none";
              slash.style.display = "none";
                            
              preview.style.display = "none";
              preview.removeAttribute ("src");
              previewV.style.display = "none";
              previewV.removeAttribute ("src");

              // "添付不可?"
              arAkahukuDOM.setText (appendix, " \u6DFB\u4ED8\u4E0D\u53EF?");
            }
            previewV.load ();
            container.style.display = "";
            return;
          }
          catch (e) { Akahuku.debug.exception (e);
          }
          container.style.display = "none";
        }, function (reason) {// not exist
          /* ファイル名が不正 (含クリア) */
          container.style.display = "none";
          preview.removeAttribute ("__size");
          preview.removeAttribute ("src");
          previewV.removeAttribute ("src");
          previewV.load (); // リソース解放に必要
          arAkahukuDOM.setText (bytes, "");
          arAkahukuDOM.setText (width, "");
          arAkahukuDOM.setText (height, "");
          arAkahukuDOM.setText (appendix, "");
        });
      }
    }
  },
    
  /**
   * ファイルサイズを "," で区切る
   *
   * @param  Number size
   *         ファイルサイズ
   * @return String
   *         "," で区切られたファイルサイズ
   */
  getReadableSize : function (size) {
    var readableSize = "" + size;
        
    if (readableSize.length > 3) {
      readableSize
        = arAkahukuPostForm.getReadableSize
        (readableSize
         .substr (0, readableSize.length - 3))
        + "," + readableSize.substr (readableSize.length - 3);
    }
        
    return readableSize;
  },
    
  /**
   * プレビューがロード完了したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onPreviewLoad : function (event) {
    try {
      var targetDocument = event.currentTarget.ownerDocument;
            
      var preview
      = targetDocument.getElementById ("akahuku_postform_preview");
      var previewV
      = targetDocument.getElementById ("akahuku_postform_video_preview");
      var width
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_width");
      var height
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_height");
      var bytes
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_bytes");
      var appendix
      = targetDocument.getElementById
      ("akahuku_postform_preview_status_appendix");
            
      var size = preview.getAttribute ("__size");
            
      arAkahukuDOM.setText (bytes, size);
            
      if (event.target == preview
          && preview.naturalWidth
          && preview.naturalHeight) {
        arAkahukuDOM.setText (width, preview.naturalWidth);
        arAkahukuDOM.setText (height, preview.naturalHeight);
        if (preview.naturalWidth < arAkahukuPostForm.previewSize
            && preview.naturalHeight < arAkahukuPostForm.previewSize) {
          preview.setAttribute ("width", preview.naturalWidth);
          preview.setAttribute ("height", preview.naturalHeight);
        }
        else {
          if (preview.naturalWidth > preview.naturalHeight) {
            preview.width = arAkahukuPostForm.previewSize;
            preview.height
              = arAkahukuPostForm.previewSize
              * preview.naturalHeight
              / preview.naturalWidth;
          }
          else {
            preview.width
              = arAkahukuPostForm.previewSize
              * preview.naturalWidth
              / preview.naturalHeight;
            preview.height = arAkahukuPostForm.previewSize;
          }
        }
      }

      if (event.target == previewV) {
        arAkahukuDOM.setText (width, previewV.videoWidth);
        arAkahukuDOM.setText (height, previewV.videoHeight);
        var appendix_text = " \uFF0F "; // " ／ "
        // 再生時間
        var dur = previewV.duration;
        // "00:00" のように0埋めする
        var t_min = ("0" + Math.floor (dur / 60)).slice (-2);
        var t_sec = ("0" + Math.round (dur % 60)).slice (-2);
        appendix_text += t_min + ":" + t_sec;
        // 音声の有無
        if (typeof previewV.mozHasAudio === "undefined") {
          appendix_text += " ?";
        }
        else if (previewV.mozHasAudio) {
          appendix_text += " \u266A"; // " ♪"
        }
        arAkahukuDOM.setText (appendix, appendix_text);
      }
            
      arAkahukuPostForm.checkCommentbox (targetDocument, true);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
    
  /**
   * コメントボックスのサイズを再計算するボタンが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCommentboxStatusResizeClick : function (event) {
    var targetDocument = event.target.ownerDocument;
    var param
    = Akahuku.getDocumentParam (targetDocument).postform_param;
        
    var commentbox = arAkahukuPostForm.findCommentbox (targetDocument);
    if (commentbox) {
      commentbox.style.width = "100%";
      if (arAkahukuPostForm.enableCommentboxSetRows) {
        commentbox.style.height = "auto";
      }
      else {
        commentbox.style.height = "";
      }
    }
        
    var button
    = targetDocument.getElementById ("akahuku_commentbox_status_resize");
    button.style.visibility = "hidden";
        
    arAkahukuPostForm.checkCommentbox (targetDocument, false);
  },
    
  /**
   * body の unload イベント
   * 各種データを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  onBodyUnload : function (targetDocument, documentParam) {
    var param;
        
    param = documentParam.postform_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.postform_param = null;
  },
    
  /**
   * フォームを修正する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean sio
   *         塩辛瓶か
   */
  applyPreview : function (targetDocument, sio) {
    var window = targetDocument.defaultView;
    var filebox = targetDocument.getElementsByName ("upfile");
    if (!filebox || !filebox [0]) {
      filebox = targetDocument.getElementsByName ("up");
    }
    if (filebox && filebox [0]) {
      filebox = filebox [0];
                    
      var container = targetDocument.createElement ("div");
      container.id = "akahuku_postform_preview_container";
      container.style.display = "none";
      arAkahukuPostForm.addDropEventsListenersTo (container);
                    
      var preview = targetDocument.createElement ("img");
      preview.id = "akahuku_postform_preview";
      preview.style.maxWidth
      = arAkahukuPostForm.previewSize + "px";
      preview.style.maxHeight
      = arAkahukuPostForm.previewSize + "px";
                    
      preview.addEventListener
      ("load",
       function () {
        arAkahukuPostForm.onPreviewLoad (arguments [0]);
      }, false);
      container.appendChild (preview);

      var previewV = targetDocument.createElement ("video");
      previewV.id = "akahuku_postform_video_preview";
      previewV.style.maxWidth
      = arAkahukuPostForm.previewSize + "px";
      previewV.style.maxHeight
      = arAkahukuPostForm.previewSize + "px";
      previewV.style.display = "none";
      previewV.controls = true;
      // 無音ループ再生でプレビュー
      previewV.autoplay = true;
      previewV.loop = true;
      previewV.muted = true;
      previewV.addEventListener
      ("loadedmetadata",
       function () {
        arAkahukuPostForm.onPreviewLoad (arguments [0]);
      }, false);

      container.appendChild (previewV);
                    
      var br = targetDocument.createElement ("br");
      container.appendChild (br);
                    
      var span = targetDocument.createElement ("span");
      span.id = "akahuku_postform_preview_status_width";
      span.appendChild (targetDocument.createTextNode
                        ("0"));
      container.appendChild (span);
            
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.id = "akahuku_postform_preview_status_times";
      span.appendChild (targetDocument.createTextNode
                        ("\u00D7"));
      container.appendChild (span);
                    
      span = targetDocument.createElement ("span");
      span.id = "akahuku_postform_preview_status_height";
      span.appendChild (targetDocument.createTextNode
                        ("0"));
      container.appendChild (span);
                    
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.id = "akahuku_postform_preview_status_slash";
      span.appendChild (targetDocument.createTextNode
                        (" \uFF0F "));
      container.appendChild (span);
                    
                    
      span = targetDocument.createElement ("span");
      span.id = "akahuku_postform_preview_status_bytes";
      span.appendChild (targetDocument.createTextNode
                        ("0"));
      container.appendChild (span);
                    
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.appendChild (targetDocument.createTextNode
                        ("\u30D0\u30A4\u30C8"));
      container.appendChild (span);

      span = targetDocument.createElement ("span");
      span.id = "akahuku_postform_preview_status_appendix";
      container.appendChild (span);
            
      var form = arAkahukuDOM.findParentNode (filebox, "form");
      if (sio) {
        form.appendChild (container);
      }
      else {
        filebox.parentNode.appendChild (container);
      }
                    
      filebox.addEventListener
      ("change",
       function () {
        arAkahukuPostForm.onPreviewChange (arguments [0]);
      }, false);
                    
      filebox.addEventListener
      ("click",
       function () {
        arAkahukuPostForm.onPreviewChange (arguments [0]);
      }, false);
                    
      if (form) {
        form.addEventListener
        ("reset",
         function () {
           window.setTimeout
           (function () {
              arAkahukuPostForm.onPreviewChange (arguments [0]);
           }, 100, arguments [0]);
        }, false);
      }
                    
      if (filebox.value) {
        arAkahukuPostForm.onPreviewChangeCore
          (targetDocument);
      }
      else {
        window.setTimeout (function () {
            arAkahukuPostForm.onPreviewChangeCore
            (targetDocument);
          }, 1000);
      }
    }
  },

  applyUpfileExtraButton : function (targetDocument, id, label, handler)
  {
    var filebox = targetDocument.getElementsByName ("upfile");
    if (!filebox || !filebox [0]) {
      filebox = targetDocument.getElementsByName ("up");
    }
    if (!filebox || !filebox [0]) {
      return;
    }
    filebox = filebox [0];

    var btn = targetDocument.getElementById (id);
    if (btn) {
      Akahuku.debug.warn ("#" + id + " alrady exist.");
      return;
    }

    var container = targetDocument.createElement ("span");
    container.id = id + "_container";
    container.appendChild (targetDocument.createTextNode (" ["));

    btn = targetDocument.createElement ("a");
    btn.id = id;
    btn.className = "akahuku_postform_upfile_extrabuttons";
    btn.addEventListener ("click", handler, false);
    btn.appendChild (targetDocument.createTextNode (label));
    container.appendChild (btn);

    container.appendChild (targetDocument.createTextNode ("]"));

    filebox.parentNode.appendChild (container);
  },
  
  /**
   * フォームを固定、非表示にした際の注意書き等から要らない要素を削除
   *
   * @param  HTMLElement node
   *         対象の要素
   */
  cleanup : function (node) {
    if (node.nodeName.toLowerCase () == "table") {
      return;
    }
    if (node.firstChild) {
      arAkahukuPostForm.cleanup (node.firstChild);
    }
    if (node.nextSibling) {
      arAkahukuPostForm.cleanup (node.nextSibling);
    }
    if (node.nodeName.toLowerCase () == "br") {
      if (node.hasAttribute ("__akahuku_no_cleanup")) {
        node.removeAttribute ("__akahuku_no_cleanup");
      }
      else {
        node.parentNode.removeChild (node);
      }
    }
  },
    
  /**
   * コメント欄の背景画像のアドレスを決定する
   *
   * @param  String original
   *         板のアドレス
   * @return Promise 決まったurlへ解決される(""の場合も)
   */
  asyncGetCommentboxBGImageURL : function (location, callback) {
    var board = "";
        
    var url = "";
        
    if (arAkahukuPostForm.enableCommentboxBGCustom == "mix"
        || arAkahukuPostForm.enableCommentboxBGCustom == "only") {
      var uinfo = arAkahukuImageURL.parse (location);
      if (uinfo) {
        board = uinfo.board;
            
        var {AkahukuFileUtil}
          = Components.utils.import ("resource://akahuku/fileutil.jsm", {});
        var path
          = arAkahukuFile.systemDirectory
          + arAkahukuFile.separator
          + "bg_" + board + ".png";
        var promise
          = AkahukuFileUtil.createFromFileName (path)
          .then (function (file) {
            return arAkahukuFile.getURLSpecFromFilename (path);
          }, function (reason) {// not exist
            path
              = arAkahukuFile.systemDirectory
              + arAkahukuFile.separator
              + "bg_default.png";
            return AkahukuFileUtil.createFromFileName (path)
            .then (function (file) {
              return arAkahukuFile.getURLSpecFromFilename (path);
            }, function (reason) {
              return "";
            });
          })
          .then (function (url) {
            if (arAkahukuPostForm.enableCommentboxBGCustom == "mix"
                && (url == "" || Math.random () > 0.5)) {
              url
                = arAkahukuP2P.getImageURL
                (location, parseInt (Math.random () * 10000));
              url = url.replace (/\/p2p_/, "/bg_");
            }
            if (url) {
              url = Akahuku.protocolHandler.enAkahukuURI ("local", url);
            }
            return url;
          });
        return promise;
      }
    }
        
    if (arAkahukuPostForm.enableCommentboxBGCustom == "no"
        || arAkahukuPostForm.enableCommentboxBGCustom == "mix") {
      url = arAkahukuP2P.getImageURL
        (location, parseInt (Math.random () * 10000));
      url = url.replace (/\/p2p_/, "/bg_");
    }
        
    if (url != "") {
      url = Akahuku.protocolHandler.enAkahukuURI ("local", url);
    }

    var {Promise}
      = Components.utils
      .import ("resource://akahuku/promise-polyfill.jsm", {});
    return Promise.resolve (url);
  },
    
  /**
   * 塩辛瓶のコメント欄の背景を設定する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  applyCommentboxBGSio : function (targetDocument) {
    var commentbox = targetDocument.getElementById ("comment");
    if (commentbox == null) {
      return;
    }
        
    arAkahukuPostForm.asyncGetCommentboxBGImageURL
    ("http://www.nijibox5.com/futabafiles/tubu/")
    .then (function (url) {
      commentbox.style.backgroundImage = "url(\'" + url + "\')";
      commentbox.style.backgroundRepeat = "no-repeat";
      commentbox.style.backgroundPosition = "right 35%";
    });
  },

  /**
   *  レス削除フォームを取得する
   */
  findUsrDelTable : function (targetDocument) {
    var delTable = null;
    var info = Akahuku.getDocumentParam (targetDocument).location_info;
    if (info.isMonaca) {
      delTable = targetDocument.getElementById ("t1");
      if (delTable) {
        return delTable;
      }
    }
    var nodes = targetDocument.getElementsByName ("mode");
    for (var i = nodes.length - 1; i >= 0 ; i --) {
      if (nodes [i].value == "usrdel"
          && nodes [i].type == "hidden"
          && nodes [i].nodeName.toLowerCase () == "input") {
        delTable
          = arAkahukuDOM.findParentNode (nodes [i], "table");
        if (!delTable) {
          delTable
          = arAkahukuDOM.findParentNode (nodes [i], "div");
        }
        break;
      }
    }
    return delTable;
  },

  /**
   *  送信フォームのコメントボックスを取得する
   */
  findCommentbox : function (targetDocument) {
    try {
      var id
        = Akahuku.getDocumentParam (targetDocument)
        .postform_param.commentboxId
      return targetDocument.getElementById (id);
    }
    catch (e) { Akahuku.debug.exception (e);
      return null;
    }
  },
    
  /**
   * フォームを修正する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound) {
      return;
    }
    var window = targetDocument.defaultView;
    
    if (info.isReply) {
      if (arAkahukuPostForm.enableNormalPurgeHistory) {
        var browser
        = arAkahukuWindow.getBrowserForWindow
        (targetDocument.defaultView);
        if (browser
            && "__akahuku_create_thread" in browser
            && browser.__akahuku_create_thread == "1") {
          browser.__akahuku_create_thread = "0";
          delete browser.__akahuku_create_thread;
          browser.removeAttribute ("__akahuku_create_thread");
                    
          window.setTimeout (function (targetDocument) {
              try {
                var history
                  = targetDocument.defaultView
                  .QueryInterface (Components.interfaces
                                   .nsIInterfaceRequestor)
                  .getInterface (Components.interfaces
                                 .nsIWebNavigation)
                  .sessionHistory;
                if (history.count > 1) {
                  history.PurgeHistory (history.count - 1);
                }
                else {
                  return;
                }
                // no e10s support bellow because of no need for recent firefox
                var w = arAkahukuWindow
                .getParentWindowInChrome (targetDocument.defaultView);
                var backCommand
                = w.document.getElementById ("Browser:Back");
                if (backCommand) {
                  backCommand.setAttribute ("disabled", "true");
                }
              }
              catch (e) { Akahuku.debug.exception (e);
              }
            }, 1000, targetDocument);
        }
      }
    }
    if (info.isNormal || info.isReply) {
      var param = new arAkahukuPostFormParam (targetDocument);
      Akahuku.getDocumentParam (targetDocument).postform_param = param;
            
      var form = null;
            
      for (var i = 0,
             nodes = targetDocument.getElementsByTagName ("form");
           i < nodes.length; i ++) {
        if (nodes [i].action.match (/\.php(\?.+)?$/)
            && nodes [i].method.toLowerCase () == "post"
            && nodes [i].enctype.toLowerCase ()
            == "multipart/form-data") {
          if (info.isFutaba) {
            // Skip a search form since 2018/11/15
            if (nodes [i].id == "searchfm") {
              continue;
            }
          }
          form = nodes [i];
          break;
        }
      }
      
      window.setTimeout (function (targetDocument) {
          var oebtn = targetDocument.getElementById ("oebtn");
          if (oebtn) {
            oebtn.addEventListener
              ("click",
               (function (targetDocument) {
                 if (targetDocument.getElementById ("akahuku_floatpostform_container")) {
                   // フォームを固定で手書きを表示する場合に
                   // テーブルサイズが oe3 のサイズを反映するようにする
                   return function () {
                     var oe = targetDocument.getElementById ("oe3");
                     var textarea
                       = arAkahukuPostForm.findCommentbox (targetDocument);
                     if (oe && textarea) {
                       if (oe.style.visibility == "visible") {
                         oe.style.width = "";
                         oe.style.height = "";
                         oe.style.position = "relative";
                         textarea.style.display = "none";
                       }
                       else {
                         oe.style.position = "absolute";
                         textarea.style.display = "";
                       }
                     }
                   };
                 }
                 return function () {
                   var oe = targetDocument.getElementById ("oe3");
                   if (oe) {
                     if (oe.style.visibility == "visible") {
                       oe.style.width = "";
                       oe.style.height = "";
                     }
                     else {
                       oe.style.width = "0px";
                       oe.style.height = "0px";
                     }
                   }
                 };
               })(targetDocument), false);
          }
        }, 100, targetDocument);
      
      var hidePostForm 
      = (info.isNormal && arAkahukuPostForm.enableNormalHide)
      || (info.isReply && arAkahukuPostForm.enableReplyHide);
      var enableFloat = arAkahukuPostForm.enableFloat;
            
      if (info.server == "dec"
          && (info.dir == "up"
              || info.dir == "up2")) {
        hidePostForm = false;
        enableFloat = false;
      }
            
      if (hidePostForm && arAkahukuPostForm.enableBottom
          && arAkahukuPostForm.enableBottomFormOnly) {
        hidePostForm = false;
      }
            
      if (form) {
        form.id = "akahuku_postform";
        if (form.getElementsByTagName ("table") [0]) {
          form.getElementsByTagName ("table") [0].id
            = "akahuku_posttable";
        }
        
        if (hidePostForm) {
          arAkahukuPostForm.setFormHidden (targetDocument, form, true);
        }
                
        for (var j = 0,
               nodes = form.getElementsByTagName ("input");
             j < nodes.length; j ++) {
          if (nodes [j].type.toLowerCase () == "submit") {
            nodes [j].id = "akahuku_postform_submitter";
            if (arAkahukuPostForm.enableShimonkin) {
              nodes [j].style.fontSize = "0px";
            }
            break;
          }
        }
      }
            
      var addSubmitListener = false;
            
      var floatPostFormAppendix = new Array ();
            
            
      var nodes;
      if (form && arAkahukuPostForm.enableBottom
          && !arAkahukuPostForm.enableBottomFormOnly) {
        var delTable = arAkahukuPostForm.findUsrDelTable (targetDocument);
        if (!delTable) {
          // New layout 2019/11/18~ (no usrdel)
          delTable = targetDocument.getElementById ("ufm");
        }
        if (delTable) {
          var marker = targetDocument.createElement ("div");
          marker.id = "akahuku_postform_bottom_marker";
          marker.style.display = "none";
          form.parentNode.insertBefore (marker, form);
                    
          form.parentNode.removeChild (form);
          nodes = form.getElementsByTagName ("table");
          if (nodes.length > 0) {
            nodes [0].style.marginLeft = "auto";
            nodes [0].style.marginRight = "auto";
          }
          delTable.parentNode.insertBefore (form, delTable);
        }
      }
      else if (form && arAkahukuPostForm.enableBottom
               && arAkahukuPostForm.enableBottomFormOnly) {
        /* フォーム位置切替と同じ方法でフォームを下に表示 */
        var ufm = targetDocument.getElementById ("ufm");
        if (!ufm) {
          // 旧CGI でも div#ufm を適切な場所に作って模擬させる
          var delTable = arAkahukuPostForm.findUsrDelTable (targetDocument);
          if (delTable) {
            ufm = targetDocument.createElement ("div");
            ufm.id = "ufm";
            node = delTable;
            while ((node = node.nextSibling) != null) {
              if (node.nodeType != node.ELEMENT_NODE) {
                continue;
              }
              if (node.nodeName.toLowerCase () == "center"
                  || node.getAttribute ("align") == "center") {
                break;
              }
            }
            if (!node) {
              delTable.parentNode.appendChild (ufm);
            }
            else {
              node.parentNode.insertBefore (ufm, node);
            }
          }
        }
        var table
          = targetDocument.getElementById ("akahuku_posttable");
        if (ufm && table && param) {
          table.style.visibility = "hidden";
          table.style.position = "absolute";
        }
        window.setTimeout
        (function (ufm, table, param){
          /* 全 apply 処理の後でレイアウトを決定する */
          if (!ufm || !table || !param) {
            return;
          }
          ufm.style.height = table.offsetHeight + "px";
          ufm.style.width = table.offsetWidth + "px";
          ufm.innerHTML = "&nbsp;";
          table.style.left = "50%";
          table.style.marginLeft = "-" + parseInt(table.offsetWidth/2) + "px";
          table.style.top
            = (ufm.ownerDocument.body.offsetTop + ufm.offsetTop) + "px";
          table.style.visibility = "visible"; //レイアウトを終えてから
          param.bottomFormAlignTimerID
            = window.setInterval
            (function (ufm, table) {
              /* サイズ変更を反映 */
              if (table.offsetTop != ufm.offsetTop) {
                table.style.top
                  = (ufm.ownerDocument.body.offsetTop + ufm.offsetTop) + "px";
              }
              if (ufm.style.width != table.offsetWidth + "px") {
                table.style.marginLeft = "-" + (table.offsetWidth/2) + "px";
                ufm.style.width = table.offsetWidth + "px";
              }
              if (table.offsetHeight != ufm.offsetHeight) {
                ufm.style.height = table.offsetHeight + "px";
              }
            }, 300, ufm, table);
        }, 300, ufm, table, param);
      }
            
      if (form) {
        if (hidePostForm) {
          if (!enableFloat) {
            var opener = targetDocument.createElement ("div");
            opener.id = "akahuku_postform_opener";
            opener.addEventListener
            ("click",
             function () {
              arAkahukuPostForm.onCreateThreadClick
                (arguments [0]);
            }, false);
            /* ファイルなどのD&D時にフォームを表示する */
            opener.addEventListener
            ("dragenter",
             function () {
              arAkahukuPostForm.ensureDispPostForm
                (arguments [0].target.ownerDocument);
              return true; /* true; ドロップを許可しない */
            }, false);
            if (info.isNormal) {
              opener.appendChild
                (targetDocument.createTextNode
                 ("\u30B9\u30EC\u7ACB\u3066\u308B"));
            }
            else {
              opener.appendChild (targetDocument.createTextNode
                                  ("\u30EC\u30B9\u66F8\u304F"));
            }
                        
            form.parentNode.insertBefore (opener, form);
          }
        }
                
        /* 保持数を更新する */
        var i, nodes2;
                
        nodes2 = form.getElementsByTagName ("li");
        for (i = 0; i < nodes2.length; i ++) {
          if (nodes2 [i].innerHTML.match
              (/\u3053\u306E\u677F\u306E\u4FDD\u5B58\u6570\u306F([0-9]+)\u4EF6\u3067\u3059/)) {
            var name = info.server + ":" + info.dir;
            if (!arAkahukuBoard.knows (name)) {
              Akahuku.debug.log
                ("Unknown server (" + name 
                 + ") \u306E\u4FDD\u5B58\u6570" + RegExp.$1);
            }
            else if (arAkahukuBoard.getMaxNum (name) != RegExp.$1) {
              Akahuku.debug.log
                (arAkahukuBoard.getServerName (name)
                 + "(" + name + ")"
                 + "\u306E\u4FDD\u5B58\u6570 "
                 + arAkahukuBoard.getMaxNum (name) + " => " + RegExp.$1);
            }
            arAkahukuBoard.setMaxNum (name, parseInt (RegExp.$1));
            break;
          }
        }
                
        // 最低保持時間を更新する
        // "1スレッド最大2000レス,最低1時間保持テスト中."
        nodes2 = form.getElementsByTagName ("li");
        for (i = 0; i < nodes2.length; i ++) {
          if (nodes2 [i].innerHTML.match
              (/\u6700\u4f4e([0-9]+)\u6642\u9593\u4fdd\u6301/)) {
            // /最低([0-9]+)時間保持/
            var name = info.server + ":" + info.dir;
            var min = 60*parseInt (RegExp.$1);
            var minOld = arAkahukuBoard.getPreserveMin (name);
            if (min != minOld) {
              arAkahukuBoard.setPreserveMin (name, min);
              Akahuku.debug.log
                ("PreserveMin of "
                 + arAkahukuBoard.getServerName (name)
                 + "(" + name + ")"
                 + " changes " + minOld + " => " + min);
            }
            break;
          }
        }

        /* 添付可能を確認する */
        var attachable = "";
        for (i = 0; i < nodes2.length; i ++) {
          if (nodes2 [i].innerHTML.match
              (/^\u6DFB\u4ED8\u53EF\u80FD[:\uFF1A](.*)$/)) {
            // "添付可能[：:]"
            attachable = RegExp.$1;
            break;
          }
        }
        if (attachable.length > 0) {
          var attachable_ext = attachable.match(/[a-zA-Z0-9]+/g);
          for (i = 0; i < attachable_ext.length; i ++) {
            if (/^[0-9]+KB$/.test (attachable_ext [i]))
              break; // 2000KB 等より後ろはもう形式ではない
            switch (attachable_ext [i]) {
              case "JPG":
              case "GIF":
              case "PNG":
                // 標準の画像形式は既に許可済
                break;
              case "WEBM":
                param.attachableExt.push ('webm');
                break;
              default:
                Akahuku.debug.warn ("Unknwon format for attach: " + attachable_ext [i]);
                param.attachableExt.push (attachable_ext [i].toLowerCase ());
            }
          }
        }

        if ((hidePostForm || enableFloat)) {
          var div;
          
          var viewer = targetDocument.createElement ("div");
          viewer.id = "akahuku_postform_opener_appendix";
          viewer.style.textAlign = "center";
          viewer.style.fontSize = "9pt";
          
          /* 見ている人数、カタログへのリンク、準備板へのリンクをコピーする */
          var added = false;
          var ul = null;
          nodes2 = form.getElementsByTagName ("li");
          for (i = 0; i < nodes2.length; i ++) {
            ul = nodes2 [i].parentNode;
            if (nodes2 [i].innerHTML.match
                (/\u6DFB\u4ED8\u53EF\u80FD/)) { // 添付可能
              try {
                var nodes3
                  = nodes2 [i].getElementsByTagName ("a");
                for (var j = 0; j < nodes3.length; j ++) {
                  if (nodes3 [j].href.match
                      (/futaba\.php\?mode=cat/)) {
                    if (added) {
                      var br;
                      br
                        = targetDocument.createElement
                        ("br");
                      br.setAttribute
                        ("__akahuku_no_cleanup", 1);
                      viewer.appendChild (br);
                    }
                    added = true;
                                        
                    var n
                      = targetDocument.createElement
                      ("small");
                    n.appendChild (nodes3 [j]);
                    viewer.appendChild (n);
                  }
                }
              }
              catch (e) { Akahuku.debug.exception (e);
              }
              floatPostFormAppendix.push (nodes2 [i]);
            }
            else {
              if (added) {
                var br;
                br = targetDocument.createElement ("br");
                br.setAttribute ("__akahuku_no_cleanup", 1);
                viewer.appendChild (br);
              }
              added = true;
                            
              var a = viewer.getElementsByTagName ("br");
              var alength = a.length;
              if (nodes2 [i].hasAttribute ("style")) {
                /* li自体のスタイルをコピー */
                var span = targetDocument.createElement ("span");
                span.setAttribute ("style", nodes2 [i].getAttribute ("style"));
                viewer.appendChild (span);
                arAkahukuDOM.copyChildren (nodes2 [i], span);
              }
              else {
                arAkahukuDOM.copyChildren (nodes2 [i], viewer);
              }
              if (nodes2 [i].innerHTML.match
                  (/\u524A\u9664\u5BFE\u8C61/)) {
                var b = viewer.getElementsByTagName ("br");
                var lastb = null;
                for (var j = alength; j < b.length; j ++) {
                  if (lastb
                      && b [j].previousSibling
                      && b [j].previousSibling.nodeName.toLowerCase () == "#text"
                      && b [j].previousSibling.nodeValue.replace (/[ \t\r\n]+/, "").length > 0) {
                    lastb.setAttribute
                      ("__akahuku_no_cleanup", 1);
                  }
                  lastb = b [j];
                }
              }
              else if (nodes2 [i].textContent.match
                       (/^\u677F\u306E\u8A2D\u5B9A\u5909\u66F4/)) { //板の設定変更
                var b = viewer.getElementsByTagName ("br");
                for (var j = alength; j < b.length; j ++) {
                  if (b [j].nextSibling) {
                    b [j].setAttribute
                      ("__akahuku_no_cleanup", 1);
                  }
                }
              }
            }
          }
          if (ul) {
            var ns = [];
            var adtable = null;
            if (ul.nodeName.toLowerCase () == "ul") {
              node = ul.nextSibling;
            }
            else {
              node = ul.firstChild;
            }
            while (node) {
              var nextSibling = node.nextSibling;
              if (node.nodeName.toLowerCase () == "table") {
                adtable = node;
                viewer.appendChild (node);
              }
              if (node.nodeName.toLowerCase () == "a"
                  || node.nodeName.toLowerCase () == "br"
                  || node.nodeName.toLowerCase () == "div") {
                ns.push (node);
              }
              
              node = nextSibling;
            }
            
            if (!adtable) {
              adtable = targetDocument.createElement ("table");
              var tb, tr, td;
              tb = targetDocument.createElement ("tb");
              tr = targetDocument.createElement ("tr");
              td = targetDocument.createElement ("td");
              adtable.appendChild (tb);
              tb.appendChild (tr);
              tr.appendChild (td);
              for (var k = 0; k < ns.length; k ++) {
                td.appendChild (ns [k]);
              }
              viewer.appendChild (adtable);
            }
          }
          arAkahukuPostForm.cleanup (viewer);

          // カタログへのリンクを装飾
          if (arAkahukuThread.enableCatalogNew) {
            nodes2 = viewer.getElementsByTagName ("a");
            for (i = 0; i < nodes2.length; i ++) {
              // same as Akahuku.collectLinks
              if (/(\?mode=cat|cat\.htm)$/.test (nodes2 [i].href)) {
                arAkahukuThread.makeAnchorOpenInBlank (nodes2 [i], "catalog");
                break;
              }
            }
          }
          
          var node = viewer.firstChild;
          while (node) {
            var nextSibling = node.nextSibling;
            if (node.nodeName.toLowerCase () == "table") {
              node.id
                = "akahuku_postform_opener_appendix_banner";
              node.style.marginLeft = "auto";
              node.style.marginRight = "auto";
            }
            if (node.nodeName.toLowerCase () == "small"
                && node.innerHTML.match (/up\u9BD6\u518D\u69CB\u7BC9\u4E2D/)) {
              node.id
                = "akahuku_postform_opener_appendix_up";
            }
            node = nextSibling;
          }
          form.parentNode.insertBefore (viewer, form);
        }
      }
            
      /* メール欄を修正する */
      var mailbox = targetDocument.getElementsByName ("email") [0];
      if (mailbox
          && mailbox.nodeName.toLowerCase () == "input"
          && mailbox.type.toLowerCase () == "text") {
        mailbox.id = "akahuku_mailbox";
                
        if (arAkahukuPostForm.enableMailboxExtend) {
          mailbox.size = parseInt (parseInt (mailbox.size) * 1.5);
        }
                
        if (arAkahukuPostForm.enableMailboxMemory) {
          var browser
            = arAkahukuWindow.getBrowserForWindow
            (targetDocument.defaultView);
          if (browser) {
            if ("__akahuku_mailbox_memory" in browser
                && browser.__akahuku_mailbox_memory) {
              mailbox.value = browser.__akahuku_mailbox_memory;
                            
              browser
                .removeAttribute ("__akahuku_mailbox_memory");
            }
          }
        }
                
        if (arAkahukuPostForm.enableMailboxSageButton) {
          mailbox.parentNode.appendChild
            (targetDocument.createTextNode
             (" ["));
          var sagebutton = targetDocument.createElement ("a");
          sagebutton.id = "akahuku_sagebutton";
          sagebutton.addEventListener
            ("click",
             function () {
              arAkahukuPostForm.onSageButtonClick (arguments [0]);
            }, false);
          sagebutton.appendChild (targetDocument.createTextNode
                                  ("sage"));
          mailbox.parentNode.appendChild (sagebutton);
          mailbox.parentNode.appendChild
            (targetDocument.createTextNode
             ("]"));
        }
        if (arAkahukuP2P.enable
            && !arAkahukuP2P.enableNoAccept) {
          mailbox.parentNode.appendChild
            (targetDocument.createTextNode
             (" ["));
          var nodebutton = targetDocument.createElement ("a");
          nodebutton.id = "akahuku_nodebutton";
          nodebutton.accessKey = "n";
          nodebutton.addEventListener
            ("click",
             function () {
              arAkahukuPostForm.onNodeButtonClick
                (arguments [0]);
            }, false);
          nodebutton.appendChild (targetDocument.createTextNode
                                  ("node"));
          mailbox.parentNode.appendChild (nodebutton);
          mailbox.parentNode.appendChild
            (targetDocument.createTextNode
             ("]"));
        }
      }
      else {
        mailbox = null;
      }
            
      /* コメント欄を修正する */
      var commentbox = targetDocument.getElementsByName ("com") [0];
      if (commentbox
          && commentbox.nodeName.toLowerCase () == "textarea") {
        if (!commentbox.id) {
          commentbox.id = "akahuku_commentbox";
        }
        param.commentboxId = commentbox.id;
        commentbox.style.width = "100%";
        if (arAkahukuPostForm.enableCommentboxSetRows) {
          commentbox.rows = arAkahukuPostForm.commentboxSetRowsCount;
          commentbox.style.height = "auto";
        }
        
        if (arAkahukuPostForm.enableCommentboxBG) {
          arAkahukuPostForm.asyncGetCommentboxBGImageURL
          (targetDocument.location.href)
          .then (function (url) {
            commentbox.style.backgroundImage
              = "url(\'" + url + "\')";
            commentbox.style.backgroundRepeat = "no-repeat";
            commentbox.style.backgroundPosition = "right bottom";
            commentbox.style.minHeight = "150px";
          });
          if (arAkahukuPostForm.enableCommentboxBGFrame) {
            try {
              commentbox.style.textShadow = "#ffffff 1px 1px 0px";
            }
            catch (e) { Akahuku.debug.exception (e);
            }
          }
        }
                
        if (arAkahukuPostForm.enableCommentboxIME) {
          try {
            commentbox.style.imeMode = "active";
          }
          catch (e) { Akahuku.debug.exception (e);
            /* imeMode がサポートされていない */
          }
        }
                
        if (arAkahukuPostForm.enableCommentboxPreview) {
          var newNode = targetDocument.createElement ("div");
          newNode.id = "akahuku_commentbox_preview";
          if (commentbox.nextSibling) {
            commentbox.parentNode.insertBefore
              (newNode, commentbox.nextSibling);
          }
          else {
            commentbox.parentNode.appendChild (newNode);
          }
        }
      }
      else {
        commentbox = null;
      }
            
      if (commentbox
          && (arAkahukuPostForm.enableCommentboxScroll
            || arAkahukuPostForm.enableCommentboxSubmitShortcut)) {
        commentbox.addEventListener
        ("keypress",
         function () {
          arAkahukuPostForm.onCommentKeyPress (arguments [0]);
        }, false);
      }

      if (commentbox) {
        commentbox.addEventListener
        ("paste", function () {
          arAkahukuPostForm.onPasteFromClipboard (arguments [0]);
        }, false);
      }

      /* コメント欄へのファイルD&Dで添付 */
      var filebox = targetDocument.getElementsByName ("upfile") [0];
      if (commentbox && filebox) {
        arAkahukuPostForm.addDropEventsListenersTo (commentbox);
      }
            
      /* コメント欄、メール欄を監視する */
      if (arAkahukuPostForm.enableCommentboxStatus
          && commentbox && mailbox) {
        commentbox.addEventListener
        ("focus",
         function () {
          arAkahukuPostForm.onCommentFocus (arguments [0]);
        }, false);
        commentbox.addEventListener
        ("blur",
         function () {
          arAkahukuPostForm.onCommentBlur (arguments [0]);
        }, false);
                
        mailbox.addEventListener
        ("focus",
         function () {
          arAkahukuPostForm.onCommentFocus (arguments [0]);
        }, false);
        mailbox.addEventListener
        ("blur",
         function () {
          arAkahukuPostForm.onCommentBlur (arguments [0]);
        }, false);
                
        if (arAkahukuPostForm.enableCommentboxStatus) {
          var span;
          var status = targetDocument.createElement ("div");
          status.id = "akahuku_commentbox_status";
                    
          span = targetDocument.createElement ("span");
          span.id = "akahuku_commentbox_status_commentbox_rows";
          span.appendChild (targetDocument.createTextNode ("0"));
          status.appendChild (span);
                    
          span = targetDocument.createElement ("span");
          span.className = "akahuku_status_suffix";
          span.appendChild (targetDocument.createTextNode
                            ("\u884C"));
          status.appendChild (span);
                    
          if (arAkahukuPostForm.enableCommentboxStatusBytes) {
            span = targetDocument.createElement ("span");
            span.className = "akahuku_status_suffix";
            span.appendChild (targetDocument.createTextNode
                              (" \uFF0F "));
                        
            status.appendChild (span);
            span = targetDocument.createElement ("span");
            span.id = "akahuku_commentbox_status_commentbox_bytes";
            span.appendChild (targetDocument.createTextNode ("0"));
            status.appendChild (span);
                        
            span = targetDocument.createElement ("span");
            span.className = "akahuku_status_suffix";
            span.appendChild (targetDocument.createTextNode
                              ("\uFF0B"));
            status.appendChild (span);
                        
            span = targetDocument.createElement ("span");
            span.id = "akahuku_commentbox_status_mailbox_bytes";
            span.appendChild (targetDocument.createTextNode ("0"));
            status.appendChild (span);
                        
            span = targetDocument.createElement ("span");
            span.className = "akahuku_status_suffix";
            span.appendChild (targetDocument.createTextNode
                              ("\u30D0\u30A4\u30C8"));
            status.appendChild (span);
          }
                    
          status.appendChild (targetDocument.createTextNode (" "));
                    
          if (arAkahukuPostForm.enableCommentboxStatusSize) {
            span = targetDocument.createElement ("span");
            span.id = "akahuku_commentbox_status_resize";
            span.style.visibility = "hidden";
            span.appendChild (targetDocument.createTextNode
                              ("[\u623B]"));
            span.addEventListener
              ("click",
               function () {
                arAkahukuPostForm.onCommentboxStatusResizeClick
                  (arguments [0]);
              }, false);
            status.appendChild (span);
          }
                    
          status.appendChild (targetDocument.createTextNode (" "));
                    
          span = targetDocument.createElement ("span");
          span.id = "akahuku_commentbox_status_warning";
          span.style.display = "none";
          span.style.visibility = "hidden";
          status.appendChild (span);
                    
          commentbox.parentNode.appendChild (status);
                    
          arAkahukuPostForm.checkCommentbox (targetDocument, false);
        }
      }
            
      if (arAkahukuPostForm.enableDelformHide
          || arAkahukuPostForm.enableDelformLeft) {
        var table = arAkahukuPostForm.findUsrDelTable (targetDocument);
        if (table) {
          if (arAkahukuPostForm.enableDelformHide) {
            table.style.display = "none";
          }
          else {
            if (table.nodeName.toLowerCase () == "div") {
              table.style.position = "static";
              table.style.clear = "left";
              table.style.cssFloat = "left";
            }
            else {
              table.setAttribute ("align", "left");
            }
          }
        }
      }
            
      if (info.isReply) {
        nodes = targetDocument.getElementsByTagName ("font");
        for (var i = 0; i < nodes.length; i ++) {
          if (nodes [i].innerHTML
              != "\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9") {
            continue;
          }
                    
          nodes [i].id = "akahuku_postmode_container";
          if (nodes [i].parentNode.nodeName.toLowerCase () == "th") {
            nodes [i].parentNode.id = "akahuku_postform_header";
          }
                    
          if (arAkahukuPostForm.enableReplyThread) {
            var label, input, span;
                        
            arAkahukuDOM.setText (nodes [i], null);
                        
            label = targetDocument.createElement ("label");
            label.setAttribute ("for", "akahuku_postmode_reply");
                        
            input = targetDocument.createElement ("input");
            input.id = "akahuku_postmode_reply";
            input.type = "radio";
            input.name = "akahuku_postmode";
            input.checked = "checked";
            input.addEventListener
              ("click",
               function () {
                arAkahukuPostForm.onPostModeClick
                  (arguments [0]);
              }, false);
                        
            label.appendChild (input);
            label.appendChild
              (targetDocument.createTextNode
               ("\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9"));
                        
            nodes [i].appendChild (label);
            nodes [i].appendChild (targetDocument.createTextNode
                                   (" "));
                        
            label = targetDocument.createElement ("label");
            label.setAttribute ("for", "akahuku_postmode_thread");
                        
            input = targetDocument.createElement ("input");
            input.id = "akahuku_postmode_thread";
            input.type = "radio";
            input.name = "akahuku_postmode";
            input.addEventListener
              ("click",
               function () {
                arAkahukuPostForm.onPostModeClick
                  (arguments [0]);
              }, false);
                        
            span = targetDocument.createElement ("span");
            span.style.fontSize = "9pt";
            span.style.fontWeight = "bold";
            span.appendChild
              (targetDocument.createTextNode
               ("\u65B0\u898F\u30B9\u30EC\u30C3\u30C9\u4F5C\u6210"));
                        
            label.appendChild (input);
            label.appendChild (span);
                        
            nodes [i].appendChild (label);
                        
            var table
              = targetDocument
              .getElementById ("akahuku_posttable");
            if (table
                && targetDocument.getElementsByName ("upfile")
                .length == 0) {
              var rows
                = table.getElementsByTagName ("tbody") [0]
                .getElementsByTagName ("tr");
              var tr = targetDocument.createElement ("tr");
              tr.id = "akahuku_post_file_row";
              tr.style.display = "none";
                            
              var td = targetDocument.createElement ("td");
              td.bgColor = "#eeaa88";
              var b;
              b = targetDocument.createElement ("b");
              b.appendChild (targetDocument.createTextNode
                             ("\u6DFB\u4ED8File"));
              td.appendChild (b);
              tr.appendChild (td);
                            
              var td = targetDocument.createElement ("td");
                            
              input = targetDocument.createElement ("input");
              input.id = "akahuku_post_file";
              input.type = "file";
              input.name = "upfile";
              input.size = "35";
                            
              td.appendChild (input);
              td.appendChild (targetDocument.createTextNode
                              (" "));
                            
              label = targetDocument.createElement ("label");
              label.setAttribute ("for", "akahuku_post_textonly");
                            
              input = targetDocument.createElement ("input");
              input.id = "akahuku_post_textonly";
              input.type = "checkbox";
              input.name = "textonly";
              input.value = "on";
                            
              label.appendChild (targetDocument.createTextNode
                                 ("["));
              label.appendChild (input);
              label.appendChild (targetDocument.createTextNode
                                 ("\u753B\u50CF\u306A\u3057]"));
                            
              td.appendChild (label);
                            
              tr.appendChild (td);
                            
              var pwd
                = targetDocument.getElementsByName ("pwd") [0];
              var pwdTr = null;
              if (pwd) {
                pwdTr = arAkahukuDOM.findParentNode (pwd, "tr");
              }
                            
              table.getElementsByTagName ("tbody") [0]
                .insertBefore (tr,
                               pwdTr);
            }
            if (form) {
              addSubmitListener = true;
              form.addEventListener
                ("submit",
                 function () {
                  arAkahukuPostForm.onReplyPostFormSubmit
                    (arguments [0]);
                }, false);
            }
          }
                    
          break;
        }
      }
            
      /* フォームを固定する */
      if (form && enableFloat) {
        var minimizePostForm
        = arAkahukuPostForm.enableFloatMinimize && hidePostForm;
                
        var div = targetDocument.createElement ("div");
        div.id = "akahuku_floatpostform_container";
        if (targetDocument.body.hasAttribute ("bgColor")) {
          div.style.backgroundColor = targetDocument.body.bgColor;
        }
        else {
          div.style.backgroundColor = "#ffffee";
        }
        div.style.width
        = minimizePostForm ? "27px" : arAkahukuPostForm.floatWidth;
        param.waitForFocus = 0;
        if (arAkahukuPostForm.enableFloatAlpha) {
          div.style.opacity = "0.3";
        }
                
        targetDocument.body.addEventListener
        ("mousemove",
         function () {
          arAkahukuPostForm.onBodyMouseMove (arguments [0]);
        }, false);
        targetDocument.body.addEventListener
        ("click",
         function () {
          arAkahukuPostForm.onBodyClick (arguments [0]);
        }, false);
        targetDocument.body.addEventListener
        ("mousedown",
         function () {
          arAkahukuPostForm.onBodyMouseDown (arguments [0]);
        }, false);
                
        /* ファイルなどのD&D時にフォームを表示する */
        div.addEventListener
        ("dragenter",
         function () {
          arAkahukuPostForm.ensureDispPostForm
            (arguments [0].target.ownerDocument);
          return true; /* true; ドロップを許可しない */
        }, false);
                
        var postmodeContainer
        = targetDocument.getElementById ("akahuku_postmode_container");
        if (postmodeContainer) {
          var postmodeIndicator
            = targetDocument.createElement ("font");
          postmodeIndicator.style.fontWeight = "bold";
          postmodeIndicator.style.color = "#ffffff";
          postmodeIndicator.appendChild
            (targetDocument.createTextNode
             ("\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9"));
          postmodeContainer.parentNode
            .replaceChild (postmodeIndicator, postmodeContainer);
                    
          var floatFormHeader = targetDocument.createElement ("div");
          floatFormHeader.id = "akahuku_floatpostform_header";
          floatFormHeader.style.display
            = (hidePostForm
               || !arAkahukuPostForm.enableReplyThread)
            ? "none" : "block";
          floatFormHeader.appendChild (postmodeContainer);
          div.appendChild (floatFormHeader);
        }
                
        if (form) {
          form.parentNode.removeChild (form);
          if (hidePostForm) {
            arAkahukuPostForm.setFormHidden (targetDocument, form, true);
          }
          div.appendChild (form);
                    
          var nodes = form.getElementsByTagName ("tr");
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i].firstChild.colSpan == "2") {
              nodes [i].removeChild (nodes [i].firstChild);
            }
          }
                    
          /* 避難所 patch */
          if (info.isMonaca) {
            var nodes = form.getElementsByTagName ("table");
            for (var i = 0; i < nodes.length; i ++) {
              if ("id" in nodes [i]
                  && nodes [i].id == "postnotice") {
                nodes [i].parentNode.removeChild (nodes [i]);
              }
            }
          }
                    
          if (floatPostFormAppendix.length > 0) {
            var ul = targetDocument.createElement ("ul");
            ul.id = "akahuku_floatpostform_list";
            ul.style.marginTop = "0px";
            ul.style.marginBottom = "0px";
            ul.style.fontSize = "9pt";
            ul.style.paddingLeft = "2em";
            ul.style.textAlign = "left";
            form.appendChild (ul);
            for (i = 0; i < floatPostFormAppendix.length; i ++) {
              var node
                = floatPostFormAppendix [i].cloneNode (true);
              ul.appendChild (node);
                            
              node = node.firstChild;
              while (node) {
                var nextSibling = node.nextSibling;
                if (node.nodeName.toLowerCase () == "table") {
                  node.parentNode.removeChild (node);
                }
                node = nextSibling;
              }
            }
          }
        }
                
        var floatFormFooter = targetDocument.createElement ("div");
        floatFormFooter.id = "akahuku_floatpostform_footer";
                
        var table, tbody, tr, td, img, a, small, label, input;
                
        table = targetDocument.createElement ("table");
        table.id = "akahuku_floatpostform_footer_content";
        if (minimizePostForm) {
          table.style.display = "none";
        }
                
        tbody = targetDocument.createElement ("tbody");
                
        tr = targetDocument.createElement ("tr");
                
        td = targetDocument.createElement ("td");
        td.id = "akahuku_floatpostform_footer_content_1";
                
        if (info.isNormal) {
          var maxpages = parseInt (info.normalPageNumber);
          var nodes = targetDocument.getElementsByTagName ("a");
                    
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i].href
                .match (/\/([^\/]+)\/([0-9]+)\.htm([#\?].*)?$/)) {
              if (RegExp.$1 == info.dir) {
                var page = parseInt (RegExp.$2);
                if (page > maxpages) {
                  maxpages = page;
                }
              }
            }
          }
                    
          if (maxpages > 10) {
            maxpages = 10;
          }
                    
          for (var i = 0; i <= maxpages; i ++) {
            a = targetDocument.createElement ("a");
            a.href = (((i == 0) ? "futaba" : i) + ".htm");
            a.appendChild (targetDocument.createTextNode
                           ("[" + i + "]"));
            td.appendChild (a);
            td.appendChild (targetDocument.createTextNode (" "));
          }
        }
        else {
          a = arAkahukuThread.createBackAnchor (targetDocument);
          td.appendChild (targetDocument.createTextNode
                          ("["));
          td.appendChild (a);
          td.appendChild (targetDocument.createTextNode
                          ("] "));
                    
          a = arAkahukuThread.createCatalogAnchor (targetDocument);
          if (a) {
            td.appendChild (targetDocument.createTextNode
                            ("["));
            td.appendChild (a);
            td.appendChild (targetDocument.createTextNode
                            ("] "));
          }
        }
        var linkCell = td;
                
        tr.appendChild (td);
                
        td = targetDocument.createElement ("td");
        td.style.textAlign = "right";
                
        if (arAkahukuPostForm.enableFloatHideButton) {
          small = targetDocument.createElement ("small");
                    
          small.appendChild (targetDocument.createTextNode ("["));
                    
          a = targetDocument.createElement ("a");
          a.id = "akahuku_floatpostform_hidebutton";
          a.appendChild (targetDocument.createTextNode
                         ("\u6D88\u3059"));
          if (arAkahukuPostForm.enableFloatHideButton) {
            a.addEventListener
              ("click",
               function () {
                arAkahukuPostForm.onFloatPostFormHideButtonClick
                  (arguments [0]);
              }, false);
          }
          small.appendChild (a);
                    
          small.appendChild (targetDocument.createTextNode ("]"));
                    
          td.appendChild (small);
        }
                
        if (arAkahukuPostForm.enableFloatClickOpen) {
          small = targetDocument.createElement ("small");
          small.id = "akahuku_floatpostform_close";
          if (hidePostForm) {
            small.style.visibility = "hidden";
          }
                        
          small.appendChild (targetDocument.createTextNode ("["));
                    
          a = targetDocument.createElement ("a");
          a.id = "akahuku_floatpostform_close_button";
          a.appendChild (targetDocument.createTextNode
                         ("\u9589\u3058\u308B"));
          a.addEventListener
          ("click",
           function () {
            arAkahukuPostForm.onFloatPostFormCloseClick
              (arguments [0]);
          }, false);
          small.appendChild (a);
                        
          small.appendChild (targetDocument.createTextNode ("]"));
                    
          if (arAkahukuPostForm.floatPosition == "topleft"
              || arAkahukuPostForm.floatPosition == "bottomleft") {
            if (linkCell.firstChild) {
              linkCell.insertBefore (small, linkCell.firstChild);
            }
            else {
              linkCell.appendChild (small);
            }
          }
          else {
            td.appendChild (small);
          }
        }
        else {
          label = targetDocument.createElement ("label");
          label.setAttribute ("for", "akahuku_floatpostform_clipper");
                    
          input = targetDocument.createElement ("input");
          input.id = "akahuku_floatpostform_clipper";
          input.type = "checkbox";
          if (hidePostForm) {
            input.checked = "checked";
          }
          input.addEventListener
          ("click",
           function () {
            arAkahukuPostForm.onFloatPostFormClipperCheck
            (arguments [0]);
          }, false);
                    
          label.appendChild (input);
          label.appendChild
          (targetDocument.createTextNode
           ("\u30C7\u30D5\u30A9\u30EB\u30C8\u3067\u9589\u3058\u308B"));
                    
          td.appendChild (label);
        }
                
        tr.appendChild (td);
        tbody.appendChild (tr);
        table.appendChild (tbody);
                
        floatFormFooter.appendChild (table);
                
        img = targetDocument.createElement ("img");
        img.className = "akahuku_generated";
        img.id = "akahuku_floatpostform_footer_icon";
        img.src
        = Akahuku.protocolHandler.enAkahukuURI
        ("local", "chrome://akahuku/content/images/floatpostform.png");
                
        img.width = "27";
        img.height = "27";
        if (minimizePostForm) {
          img.style.display = "block";
        }
        else {
          img.style.display = "none";
        }
                
        floatFormFooter.appendChild (img);
                
        if (arAkahukuPostForm.floatPosition == "topleft"
            || arAkahukuPostForm.floatPosition == "topright") {
          div.insertBefore (floatFormFooter, div.firstChild);
        }
        else {
          div.appendChild (floatFormFooter);
        }
                
        targetDocument.body
        .insertBefore (div, targetDocument.body.firstChild);
      }

      /* 下部のフォームにスレ立てラヂオスイッチを移動させる */
      if (info.isReply && form
          && arAkahukuPostForm.enableReplyThread
          && arAkahukuPostForm.enableBottom) {
        var postmodeContainer
        = targetDocument.getElementById ("akahuku_postmode_container");
        var postformHeader
        = targetDocument.getElementById ("akahuku_postform_header");
        var table
        = targetDocument.getElementById ("akahuku_posttable");
        if (postmodeContainer && postformHeader && table) {
          var postmodeIndicator
            = targetDocument.createElement ("font");
          postmodeIndicator.style.fontWeight = "bold";
          postmodeIndicator.style.color = "#ffffff";
          postmodeIndicator.appendChild
            (targetDocument.createTextNode
             ("\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9"));
          postmodeContainer.parentNode
            .replaceChild (postmodeIndicator, postmodeContainer);
                    
          table.style.tableLayout = "auto";
          var tbody = table.getElementsByTagName ("tbody") [0];
          var tr = targetDocument.createElement ("tr");
          var td = targetDocument.createElement ("td");
          td.style.textAlign = "center";
          td.setAttribute ("colspan", 2);
          td.setAttribute
            ("bgcolor",
             postformHeader.getAttribute ("bgcolor") || "#e04000");
          postformHeader.removeAttribute ("id");
          td.id = "akahuku_postform_header";
          tr.appendChild (td);
          td.appendChild (postmodeContainer);
          tbody.insertBefore (tr, tbody.firstChild);
          if (arAkahukuPostForm.enableBottomFormOnly) {
            var tr2 = targetDocument.createElement ("tr");
            td = targetDocument.createElement ("td");
            td.id = "akahuku_reply_status_container";
            td.setAttribute ("colspan", 2);
            tr2.appendChild (td);
            tbody.insertBefore (tr2, tr.nextSibling);
          }
        }
      }

      if (arAkahukuPostForm.enablePasteImageFromClipboard) {
        arAkahukuPostForm.applyUpfileExtraButton
          (targetDocument,
           "akahuku_postform_pastebutton",
           "\u8CBC\u308A\u4ED8\u3051", // 貼り付け
           function () {
             var targetDocument = arguments [0].target.ownerDocument;
             var comment = arAkahukuPostForm.findCommentbox (targetDocument);
             if (comment) {
               var ev = targetDocument.createEvent ("HTMLEvents")
               ev.initEvent ("paste", false, true);
               comment.dispatchEvent (ev);
             }
           });
        arAkahukuPostForm.applyUpfileExtraButton
          (targetDocument,
           "akahuku_postform_clearbutton",
           "\u30AF\u30EA\u30A2", // クリア
           function () {
             var targetDocument = arguments [0].target.ownerDocument;
             var filebox = targetDocument.getElementsByName ("upfile");
             if (filebox && filebox [0]) {
               filebox [0].value = "";
               if (arAkahukuPostForm.enablePreview) {
                 arAkahukuPostForm.onPreviewChangeCore (targetDocument);
               }
             }
           });
      }
            
      if (arAkahukuPostForm.enablePreview) {
        arAkahukuPostForm.applyPreview (targetDocument, false);
      }
            
      if (!addSubmitListener) {
        if (form) {
          form.addEventListener
          ("submit",
           function () {
            arAkahukuPostForm.onNormalPostFormSubmit
            (arguments [0]);
          }, false);
        }
      }
    }
  }
};
