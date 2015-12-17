/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/*
var arAkahukuThreadManager = {
  withThread: function(func) {
    var threadManager =
    Components.classes["@mozilla.org/thread-manager;1"]
    .getService(Components.interfaces.nsIThreadManager);
    
    var thread = threadManager.newThread(0);
    thread.dispatch(
      new arAkahukuThreadManager.ThreadType(func),
      Components.interfaces.nsIThread.DISPATCH_NORMAL);
  },
  
  withMainThread: function(func) {
    var threadManager =
    Components.classes["@mozilla.org/thread-manager;1"]
    .getService(Components.interfaces.nsIThreadManager);
    
    var thread = threadManager.mainThread;
    thread.dispatch(
      new arAkahukuThreadManager.ThreadType(func),
      Components.interfaces.nsIThread.DISPATCH_NORMAL);
  }
};
arAkahukuThreadManager.ThreadType = function(func) {
  this.func = func;
};
arAkahukuThreadManager.ThreadType.prototype = {
  run: function() {
    this.func();
  },
  
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
      return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};
*/

// arAkahukuJSON のロード
try {
  Components.utils.import("resource://akahuku/json.jsm");
}
catch (e) {
  // JavaScript Code Module が使えない環境(Fx3より前)では
  // 従来通りに赤福実装をロード
  var loader
    = Components.classes ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Components.interfaces.mozIJSSubScriptLoader);
  loader.loadSubScript
    ("chrome://akahuku/content/mod/arAkahukuJSON.js");
}

/**
 * 本体
 */
var Akahuku = {
  protocolHandler : null,        /* arIAkahukuProtocolHandler
                                  *   プロトコルハンドカ */
  documentParams : new Array (), /* Array  ドキュメントごとの情報 */
  latestParam : null,            /* arAkahukuDocumentParam
                                  *   最近使ったドキュメントごとの情報 */
    
  isOld : false,                 /* Boolean  古い Mozilla Suite か */
  isFx9 : false,
    
  initialized : false,           /* Boolean  初期化フラグ */
    
  enableAll : false,             /* Boolean  全機能の ON／OFF */
  enableAddCheckboxID : false,   /* Boolean  チェックボックスに id を付ける */

  enablePartial : false,         /* Boolean  デフォルトで最新 n 件表示 */
  partialCount : 100,            /* Number  n 件 */
  partialUp : 100,               /* Number  前に n 件ずつ戻る */

  isXPathAvailable : false,

  enableBQCache : false,
  enableBoostByXPath : false,
  enableDownloadLastDirHack : false,

  contextTasksArray : new Array (),

  /**
   * デバッグ用
   */
  debug : {
    enabled : true,
    prefix : "Akahuku debug: ",
    _consoleService : Components.classes ["@mozilla.org/consoleservice;1"]
      .getService (Components.interfaces.nsIConsoleService),

    log : function (message) {
      if (!this.enabled) return;
      this._consoleService.logStringMessage (this.prefix + message);
    },
    warn : function (message) {
      if (!this.enabled) return;
      var stack = Components.stack.caller;
      var scriptError
        = Components.classes ["@mozilla.org/scripterror;1"]
        .createInstance (Components.interfaces.nsIScriptError);
      scriptError.init
        (this.prefix + message,
         "filename" in stack ? stack.filename : null,
         null,
         "lineNumber" in stack ?  stack.lineNumber : null,
         null,
         Components.interfaces.nsIScriptError.warningFlag,
         null);
      this._consoleService.logMessage (scriptError);
    },
    error : function (message) {
      if (!this.enabled) return;
      var stack = Components.stack.caller;
      var scriptError
        = Components.classes ["@mozilla.org/scripterror;1"]
        .createInstance (Components.interfaces.nsIScriptError);
      scriptError.init
        (this.prefix + message,
         "filename" in stack ? stack.filename : null,
         null,
         "lineNumber" in stack ?  stack.lineNumber : null,
         null,
         Components.interfaces.nsIScriptError.errorFlag,
         null);
      this._consoleService.logMessage (scriptError);
    },
    exception : function (error) {
      if (!this.enabled) return;
      if (typeof error !== "object") {
        error = new Error (String (error),
          Components.stack.caller.filename,
          Components.stack.caller.lineNumber);
      }
      var message = 'exception: ' + error.message;
      //Components.utils.reportError (error);
      for (var frame = Components.stack.caller;
          frame && frame.filename; frame = frame.caller) {
        message += "\n    " + frame.toString ();
      }
      var scriptError
        = Components.classes ["@mozilla.org/scripterror;1"]
        .createInstance (Components.interfaces.nsIScriptError);
      scriptError.init
        (this.prefix + message,
         "fileName" in error ? error.fileName : null,
         null,
         "lineNumber" in error ?  error.lineNumber : null,
         "columnNumber" in error ?  error.columnNumber : null,
         Components.interfaces.nsIScriptError.warningFlag,
         null);
      this._consoleService.logMessage (scriptError);
    },
    tic : function () {
      var start = new Date ();
      start.toc = function () {
        var now = new Date ();
        var ms = now.getTime () - this.getTime ();
        this.setTime (now.getTime ());
        return ms;
      };
      return start;
    },
  },
    
  /**
   * ドキュメントごとの情報を追加する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  addDocumentParam : function (targetDocument) {
    var documentParam = new arAkahukuDocumentParam ();
    documentParam.targetDocument = targetDocument;
    Akahuku.documentParams.push (documentParam);
    Akahuku.latestParam = documentParam;
  },
    
  /**
   * ドキュメントごとの情報を削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  deleteDocumentParam : function (targetDocument) {
    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      var tmp = Akahuku.documentParams [i];
      if (tmp.targetDocument == targetDocument) {
        Akahuku.documentParams.splice (i, 1);
        tmp.targetDocument = null;
        tmp.location_info = null;
        tmp = null;
        break;
      }
    }
    Akahuku.latestParam = null;
  },

  /*
   * ドキュメントごとの情報を取得する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @return arAkahukuDocumentParam
   *         ドキュメントごとの情報
   */
  getDocumentParam : function (targetDocument) {
    var latest = Akahuku.latestParam;
    if (latest
        && latest.targetDocument == targetDocument) {
      return latest;
    }
    
    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      if (Akahuku.documentParams [i].targetDocument == targetDocument) {
        Akahuku.latestParam = Akahuku.documentParams [i];
        return Akahuku.documentParams [i];
      }
    }
    
    return null;
  },

  /**
   * URI に合致するドキュメントごとの情報を得る
   * @param  nsIURI uri
   *         対象のURI (Stringでも可)
   * @return Array
   *         [arAkahukuDocumentParam,...]
   */
  getDocumentParamsByURI : function (uri, optFirstOnly) {
    var ret = [];
    if (Akahuku.documentParams.length == 0) {
      return ret;
    }

    if (!(uri instanceof Components.interfaces.nsIURI)) {
      try {
        uri = arAkahukuUtil.newURIViaNode (uri, null);
      }
      catch (e) { Akahuku.debug.exception (e);
        return ret;
      }
    }

    var checkURI;
    if ("equalsExceptRef" in uri) { // requires Gecko 6.0+
      checkURI = function (param, uri) {
        return uri.equalsExceptRef (param.targetDocument.documentURIObject);
      };
    }
    else {
      checkURI = function (param, uri) {
        if ("documentURIObject" in param.targetDocument) {
          // requires Gecko 1.9+
          return uri.equals (param.targetDocument.documentURIObject);
        }
        else {
          return uri.spec === param.targetDocument.documentURI;
        }
      };
    }

    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      if (checkURI (Akahuku.documentParams [i], uri)) {
        ret.push (Akahuku.documentParams [i]);
        if (optFirstOnly) break;
      }
    }
    return ret;
  },

  hasDocumentParamForURI : function (uri) {
    return (Akahuku.getDocumentParamsByURI (uri, true).length > 0);
  },

  /*
   * フォーカスされているドキュメントの情報を取得する
   * (フレーム内のドキュメントでも)
   *
   * @return arAkahukuDocumentParam
   *         ドキュメントごとの情報
   */
  getFocusedDocumentParam : function () {
    var wnd = document.commandDispatcher.focusedWindow;
    if (window == wnd || !wnd) {
      wnd = window.content;
    }
    return Akahuku.getDocumentParam (wnd.document);
  },

  /**
   * 設定を読み込む
   */
  getConfig : function () {
    Akahuku.enableAll
    = arAkahukuConfig
    .initPref ("bool", "akahuku.all", true);
    Akahuku.enableAddCheckboxID
    = arAkahukuConfig
    .initPref ("bool", "akahuku.add_checkbox_id", false);
    Akahuku.enablePartial
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reload.partial.on", false);
    Akahuku.partialCount
    = arAkahukuConfig
    .initPref ("int",  "akahuku.reload.partial.count", 100);
    Akahuku.partialUp
    = arAkahukuConfig
    .initPref ("int",  "akahuku.reload.partial.up", 100);
    /* 拡張 */
    Akahuku.debug.enabled
    = arAkahukuConfig
    .initPref ("bool",  "akahuku.ext.debug", false);
    Akahuku.enableBQCache
    = arAkahukuConfig
    .initPref ("bool",  "akahuku.ext.cache_bq", true);
    Akahuku.enableBoostByXPath
    = arAkahukuConfig
    .initPref ("bool",  "akahuku.ext.boost_by_xpath", true);
    Akahuku.enableDownloadLastDirHack
    = arAkahukuConfig
    .initPref ("bool",  "akahuku.ext.download_lastdir_hack", true);
  },
    
  /**
   * ウィンドウが開かれたイベント
   */
  onLoad : function () {
    if (Akahuku.initialized) {
      return;
    }
        
    Akahuku.protocolHandler
    = Components.classes ["@mozilla.org/network/protocol;1?name=akahuku"]
    .getService (Components.interfaces.arIAkahukuProtocolHandler);
        
    var s = navigator.productSub;
    s = (s + "").substr (0, 8);
    if (parseInt (s) <= 20030621) {
      /* 古い Mozilla Suite の場合 */
      Akahuku.isOld = true;
    }
    
    Akahuku.isFx9 = arAkahukuCompat.comparePlatformVersion ("8.*") > 0;
    
    if (typeof (XPathResult) != "undefined") {
      Akahuku.isXPathAvailable = true;
    }
    
    var evalFunc = window ["eval".toString ()];

    /* ScrapBook で akahuku の保存を有効にする
     * saver.js の 638 行目 */
    try {
      if (typeof (sbContentSaver) != "undefined"
          && "download" in sbContentSaver
          && typeof (sbContentSaver.download) == "function") {
        sbContentSaver.download
        = evalFunc (("(" + sbContentSaver.download.toString () + ")")
                .replace (/\|\|[ \r\n\t]*aURL[ \r\n\t]*\.[ \r\n\t]*schemeIs[ \r\n\t]*\([ \r\n\t]*\"ftp\"[ \r\n\t]*\)/,
                          "|| aURL.schemeIs(\"ftp\") || aURL.schemeIs(\"akahuku\")"));
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    /* ThumbnailZoomPlus で akahuku のズームを有効にする
     * filterService.js の 494 行目 (ver.2.1) */
    try {
      if (typeof (ThumbnailZoomPlus) != "undefined"
          && "FilterService" in ThumbnailZoomPlus
          && "getZoomImage" in ThumbnailZoomPlus.FilterService
          && typeof (ThumbnailZoomPlus.FilterService.getZoomImage) === "function") {
        var origfunc, newfunc;
        origfunc = ThumbnailZoomPlus.FilterService.getZoomImage.toString ();
        newfunc = origfunc.replace (
            /(\bif\s*\(\s*!\s*\/\^)(\()?https\?(?!\|([^|]*\|)*akahuku)/,
            function (m,pre,par) {
              return pre + (par ?"(https?|akahuku" : "(https?|akahuku)")
            });
        if (newfunc != origfunc) {
          ThumbnailZoomPlus.FilterService.getZoomImage
          = evalFunc ("(" + newfunc + ")");
        }
        else {
          Akahuku.debug.warn ("patch for ThumbnailZoomPuls failed.")
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    /* QuickDrag で akahuku の保存を有効にする
     * quickdrag.js の 167 行目 */
    /* 新しい QuickDrag (少なくともver2.1.3.21) では
     * このパッチは機能しておらず、そもそも不要っぽい
    try {
      if (typeof (QuickDrag) != "undefined"
          && "dragdrop" in QuickDrag
          && typeof (QuickDrag.dragdrop) == "function") {
        QuickDrag.dragdrop
        = eval (("(" + QuickDrag.dragdrop.toString () + ")")
                .replace (/https\?\|ftp\|chrome\|file/,
                          "https?|ftp|chrome|file|akahuku"));
      }
    }
    catch (e) {
    }*/
    
    /* 各種サービスの初期化 */
    arAkahukuConfig.loadPrefBranch ();
    arAkahukuP2P.init ();
    arAkahukuFile.init ();
    arAkahukuSound.init ();
    arAkahukuLink.init ();
    arAkahukuCatalog.init ();
    arAkahukuConverter.init ();
    arAkahukuConfig.init ();
    arAkahukuTab.init ();
    arAkahukuBloomer.init ();
    arAkahukuImage.init ();
    arAkahukuThread.init ();
    arAkahukuMHT.init ();
    arAkahukuPostForm.init ();
        
    arAkahukuUI.init ();
    arAkahukuSidebar.init ();
    
    /* コンテンツのロードのイベントを監視 */
    var appcontent = document.getElementById ("appcontent");
    if (appcontent) {
      appcontent.addEventListener
        ("DOMContentLoaded",
         Akahuku.onDOMContentLoaded,
         false);
            
      try {
        if (typeof Aima_Aimani != "undefined") {
          /* Aima_Aimani よりも先に動くために
           * イベントの順番を入れ替える */
          appcontent.removeEventListener
            ("DOMContentLoaded",
             Aima_Aimani.onDOMContentLoaded,
             false);
          appcontent.addEventListener
            ("DOMContentLoaded",
             Aima_Aimani.onDOMContentLoaded,
             false);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    var sidebar = document.getElementById ("sidebar");
    if (sidebar) {
      sidebar.addEventListener
        ("DOMContentLoaded",
         Akahuku.onSidebarLoaded,
         false);
            
      try {
        if (typeof Aima_Aimani != "undefined") {
          /* Aima_Aimani よりも先に動くために
           * イベントの順番を入れ替える */
          appcontent.removeEventListener
            ("DOMContentLoaded",
             Aima_Aimani.onSidebarLoaded,
             false);
          appcontent.addEventListener
            ("DOMContentLoaded",
             Aima_Aimani.onSidebarLoaded,
             false);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }

    /* 画像鯖では保存場所を覚えさせないハック (Fx 7.0 以降) */
    try {
      if (Akahuku.enableDownloadLastDirHack
          && arAkahukuCompat.comparePlatformVersion ("6.*") > 0) {
        /* 保存する直前/直後を捉える方法がわからないので、やっつけ */
        gBrowser.addEventListener
          ("pageshow", Akahuku.onImageDocumentActivity, true);
        gBrowser.addEventListener
          ("pagehide", Akahuku.onImageDocumentActivity, true);
        gBrowser.addEventListener
          ("focus", Akahuku.onImageDocumentActivity, true);
        gBrowser.addEventListener
          ("blur", Akahuku.onImageDocumentActivity, true);
        gBrowser.tabContainer.addEventListener
          ("TabClose", Akahuku.onImageDocumentActivity, true);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
            
    Akahuku.initialized = true;
    Akahuku.debug.log ("initialized");
  },
    
  /**
   * ウィンドウが閉じられたイベント
   */
  onUnload : function () {
    if (!Akahuku.initialized) {
      return;
    }
        
    /* P2P のノードリストを保存 */
    if (typeof (Components.interfaces.arIAkahukuP2PServant2)
        != "undefined") {
      arAkahukuP2P.saveNodeList ();
    }
        
    arAkahukuSidebar.term ();
        
    arAkahukuConfig.term ();
        
    arAkahukuLink.term ();
    arAkahukuCatalog.term ();
        
    Akahuku.initialized = false;
  },
    
  /**
   * body の unload イベント
   * 各種データを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Event event
   *         対象のイベント
   */
  onBodyUnload : function (targetDocument, event) {
    Akahuku.clearContextTasks (targetDocument);
    /* リロード前にページトップにスクロール */
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    if (documentParam == null) {
      return;
    }
        
    arAkahukuCatalog.onBodyUnload (targetDocument, documentParam);
    arAkahukuMHT.onBodyUnload (targetDocument, documentParam);
    arAkahukuPopupQuote.onBodyUnload (targetDocument, documentParam);
    arAkahukuPostForm.onBodyUnload (targetDocument, documentParam);
    arAkahukuReload.onBodyUnload (targetDocument, documentParam);
    arAkahukuScroll.onBodyUnload (targetDocument, documentParam);
    arAkahukuThreadOperator.onBodyUnload (targetDocument, documentParam);
    arAkahukuThread.onBodyUnload (targetDocument, documentParam);
    Akahuku.Cache.onBodyUnload (targetDocument, documentParam);
        
    Akahuku.deleteDocumentParam (targetDocument);
  },
    
  /**
   * 適用するかどうかを取得する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String href
   *         アドレス
   * @return Boolean
   *         適用するかどうか
   */
  getNeedApply : function (targetDocument, href) {
    if (href.match
        (/^http:\/\/([^\/]+\/)?(tmp|up|img|cgi|zip|dat|may|nov|jun|dec|ipv6)\.2chan\.net(:[0-9]+)?\/([^\/]+)\//)
        || href.match
        (/^http:\/\/([^\/]+\/)?(www)\.2chan\.net(:[0-9]+)?\/(h|oe|b|30|31|51|junbi)\//)) {
      /* ふたばの板 */
      return true;
    }
        
    if (Akahuku.protocolHandler.isAkahukuURI (href)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (href);
      if (p.type == "cache"
          || p.type == "filecache") {
        var href2 = p.original;
        if (href2.match
            (/^http:\/\/([^\/]+\/)?(tmp|up|img|cgi|zip|dat|may|nov|jun|dec|ipv6)\.2chan\.net(:[0-9]+)?\/([^\/]+)\//)
            || href2.match
            (/^http:\/\/([^\/]+\/)?(www)\.2chan\.net(:[0-9]+)?\/(h|oe|b|30|31|51|junbi)\//)) {
          /* ふたばの板のキャッシュ */
          return true;
        }
      }
    }
        
    if (href.match
        (/^http:\/\/appsweets\.net\/catalog\/dat\/(view\.php\?mode=cat2?)/)
        || href.match
        (/^http:\/\/www\.nijibox4\.com\/akahuku\/catalog\/dat\/(view\.php\?mode=cat2?)/)
        || href.match
        (/^http:\/\/www\.nijibox\.com\/futaba\/catalog\/img\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      return true;
    }

    if (/^http:\/\/appsweets\.net\/tatelog\/(?:dat|img)\/thread\/[0-9]+$/.test (href)) {
      // タテログのログ
      return false; //まだ自動適用は無し
    }
    
    if (href.match
        (/^http:\/\/tsumanne\.net\/[a-z]+\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/)) {
      /* サッチー */
      return true;
    }
        
    /* 避難所 patch */
    if (arAkahukuBoard.enableExternal) {
      var href2 = href;
      if (Akahuku.protocolHandler.isAkahukuURI (href)) {
        var p = Akahuku.protocolHandler.getAkahukuURIParam (href);
        if (p.type == "cache" || p.type == "filecache") {
          href2 = p.original;
        }
      }
      for (var i = 0; i < arAkahukuBoard.externalList.length; i ++) {
        if (arAkahukuBoard.externalList [i].prefix) {
          if (href2.indexOf (arAkahukuBoard.externalList [i].pattern)
              == 0) {
            return true;
          }
        }
        else {
          if (href2.match (arAkahukuBoard.externalList [i].pattern)) {
            return true;
          }
        }
      }
    }
    
    if (href.match (/^unmht:\/\//)) {
      /* UnMHT の出力 */
      if (Akahuku.getMessageBQ (targetDocument).length
          != 0) {
        if (targetDocument.title
            .indexOf ("\uFF20\u3075\u305F\u3070") != -1
            || targetDocument.title.indexOf ("\u8679\u88CF") != -1) {
          /* 通常のふたばの mht
           * 赤福:非公式 Firefox 版の mht (Fx 3.0 以前) */
          return true;
        }
        else {
          var nodes = targetDocument.getElementsByTagName ("meta");
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i].getAttribute ("name") == "generator"
                && nodes [i].getAttribute ("content")
                == "akahuku") {
              /* GENMHTML の mht */
              return true;
            }
          }
          nodes = targetDocument.getElementsByTagName ("a");
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i].getAttribute ("href")
                && nodes [i].getAttribute ("href")
                .match (/http:\/\/[^\.]+\.2chan\.net\/[^\/]+\//)) {
              /* 赤福:非公式 Firefox 版の mht (Fx 3.1 以降) */
              return true;
            }
          }
          nodes = targetDocument.getElementsByTagName ("base");
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i].getAttribute ("href")
                && nodes [i].getAttribute ("href")
                .match (/http:\/\/[^\.]+\.2chan\.net\/[^\/]+\//)) {
              /* 赤福:非公式 Firefox 版の mht (Fx 3.1 以降) */
              return true;
            }
          }
        }
      }
    }
        
    return false;
  },
    
  /**
   * サイドバーで何かがロードされたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSidebarLoaded : function (event) {
    var browser = event.target.getElementById ("web-panels-browser");
        
    if (browser) {
      browser.addEventListener
        ("DOMContentLoaded",
         Akahuku.onDOMContentLoaded,
         false);
    }
  },
    
  /**
   * コンテンツがロードされたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDOMContentLoaded : function (event) {
    var targetDocument = event.target.defaultView.document;
    
    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuConfig.loadPrefBranch ();
      Akahuku.getConfig ();
    }
        
    var needApply = false;
        
    if (Akahuku.enableAll) {
      if (!arAkahukuConfig.isObserving) {
        /* 監視していない場合にのみ設定を取得する */
        arAkahukuTab.getConfig ();
        arAkahukuQuote.getConfig ();
        arAkahukuJPEG.getConfig ();
        arAkahukuBloomer.getConfig ();
        arAkahukuBoard.getConfig ();
        arAkahukuFileName.getConfig ();
      }
      
      needApply = Akahuku.getNeedApply (targetDocument,
                                        targetDocument.location.href);
      
      if (needApply) {
        /* 対象であれば適用する */
        
        Akahuku.apply(targetDocument, false);
        /*
        arAkahukuThreadManager.withThread(
          function() {
            arAkahukuThreadManager.withMainThread(
              function() {
                Akahuku.apply(targetDocument, false);
              });
          });
        */
      }
    }
        
    if (!needApply) {
      /* ホイールリロードはふたば外でも動く */
      arAkahukuWheel.apply (targetDocument, null);
    }
        
    if (Akahuku.enableAll) {
      if (targetDocument.location.href.match
          (/^http:\/\/www\.nijibox[256]\.com\/futabafiles\/(tubu|kobin|mid|001|003)\/((.+)\.html|$)/)) {
        if (arAkahukuPostForm.enablePreview) {
          arAkahukuPostForm.applyPreview (targetDocument, true);
        }
        if (arAkahukuPostForm.enableCommentboxBG) {
          arAkahukuPostForm.applyCommentboxBGSio (targetDocument);
        }
      }
    }
        
    /* 状態の変更を UnMHT に通知する */
    try {
      UnMHTBrowserProgressListener.onLocationChange ();
    }
    catch (e) {
    }
  },
  
  /**
   * 対象のドキュメントに適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean instant
   *         コンテキストメニューからの適用か
   */
  apply : function (targetDocument, instant) {
    var total_tic = Akahuku.debug.tic();
    var tic = Akahuku.debug.tic();
    var ticlog = "inside Akahku.apply()";
    var bqnodes = null;
    var targetWindow = targetDocument.defaultView;
    
    var info = new arAkahukuLocationInfo (targetDocument, instant);
    var href = targetDocument.location.href;
    ticlog += "\n  preparation "+tic.toc();
    
    info.replyFrom = 1;
    if (Akahuku.enablePartial && info.isReply
        && !info.isMht && !instant) {
      var nodes = Akahuku.getMessageBQ (targetDocument);
      bqnodes = nodes;
      var partialNode = null;
      for (var i = 0; i < nodes.length - Akahuku.partialCount; i ++) {
        var container = Akahuku.getMessageContainer (nodes [i]);
        if (container) {
          if (partialNode == null) {
            partialNode = targetDocument.createElement ("div");
            partialNode.id = "akahuku_partial_indicator";
            container.nodes [0].parentNode.insertBefore
              (partialNode, container.nodes [0]);
            bqnodes = null; // BQ再走査させるため
          }
          Akahuku.removeMessageContainer (container);
          info.replyFrom ++;
        }
      }
      if (partialNode) {
        partialNode.style.color = "#707070";
        partialNode.appendChild (targetDocument.createTextNode
                                 ("\u30EC\u30B9"));
        var skippped = targetDocument.createElement ("span");
        skippped.id = "akahuku_partial_indicator_n";
        skippped.style.fontSize = "1em";
        arAkahukuDOM.setText (skippped, info.replyFrom - 1);
        partialNode.appendChild (skippped);
        partialNode.appendChild (targetDocument.createTextNode
                                 ("\u4EF6\u7701\u7565\u3002"));
      }
    } ticlog += "\n  partialize "+tic.toc();
    
    if (Akahuku.enableAddCheckboxID) {
      var nodes = targetDocument.getElementsByTagName ("input");
      var tmp = "akahuku_dummyid_";
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].type != "checkbox") {
          continue;
        }
        if (!("id" in nodes [i])
            || !nodes [i].id) {
          nodes [i].id = tmp + i;
        }
      }
    } ticlog += "\n  addCheckboxID "+tic.toc();
    
    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuSound.getConfig ();
    }
    arAkahukuSound.apply (targetDocument, info);
        
    if (href.match (/futaba\.php$/)
        && !info.isNotFound) {
      /* スレ立て後、レス送信後、リダイレクトの場合
       * 音以外はなにもしない */
            
      /* futaba: 負荷があるだけなので外部には対応しない */
      return;
    }
    
    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuTitle.getConfig ();
      arAkahukuScroll.getConfig ();
      arAkahukuDelBanner.getConfig ();
      arAkahukuWheel.getConfig ();
      arAkahukuMHT.getConfig ();
      arAkahukuImage.getConfig ();
      arAkahukuPostForm.getConfig ();
      arAkahukuReload.getConfig ();
      arAkahukuThreadOperator.getConfig ();
      arAkahukuThread.getConfig ();
      arAkahukuLink.getConfig ();
      arAkahukuPopupQuote.getConfig ();
      arAkahukuCatalog.getConfig ();
    } ticlog += "\n  getConfig "+tic.toc();
    
    if (arAkahukuBoard.enableSelect) {
      /* 板を制限する場合はチェックする */
      var name = info.server + ":" + info.dir;
      if (name in arAkahukuBoard.selectExList) {
        Akahuku.clearContextTasks (targetDocument, true);
        /* スタイルを解除してから抜ける */
        
        arAkahukuStyle.resetStyle (targetDocument);
        
        return;
      }
    }
    
    if (Akahuku.getDocumentParam (targetDocument)) {
      /* 多重適用を避ける */
      return;
    }
    
    Akahuku.addDocumentParam (targetDocument);
    Akahuku.getDocumentParam (targetDocument).location_info
    = info;

    if (info.isReply || info.isNormal) {
      bqnodes = bqnodes || Akahuku.getMessageBQ (targetDocument);
      /* キャッシュ手動設定 (DOM変更を検知しない) */
      Akahuku.getDocumentParam (targetDocument)._messageBQCache
      = bqnodes;
    }

    targetWindow.addEventListener
    ("unload",
     function () {
      Akahuku.onBodyUnload (targetDocument, arguments [0]);
    }, true);
        
    ticlog += "\n  prepare documentParam "+tic.toc();
    arAkahukuThread.fixBug (targetDocument, info);      ticlog+="\n  arAkahukuThread.fixBug "+tic.toc();
        
    arAkahukuSidebar.apply (targetDocument, info);      ticlog+="\n  arAkahukuSidebar.apply "+tic.toc();
    arAkahukuStyle.apply (targetDocument, info);        ticlog+="\n  arAkahukuStyle.apply "+tic.toc();
    arAkahukuDelBanner.apply (targetDocument, info);    ticlog+="\n  arAkahukuDelBanner.apply "+tic.toc();
    arAkahukuPostForm.apply (targetDocument, info);     ticlog+="\n  arAkahukuPostForm.apply "+tic.toc();
    arAkahukuThread.apply (targetDocument, info);       ticlog+="\n  arAkahukuThread.apply "+tic.toc();
    arAkahukuThreadOperator.apply (targetDocument, info);ticlog+="\n  arAkahukuThreadOperator.apply "+tic.toc();
    Akahuku.Cache.apply (targetDocument, info);         ticlog+="\n  Akahuku.Cache.apply "+tic.toc();
    arAkahukuLink.apply (targetDocument, info);         ticlog+="\n  arAkahukuLink.apply "+tic.toc();
    arAkahukuTitle.apply (targetDocument, info);        ticlog+="\n  arAkahukuTitle.apply "+tic.toc();
    arAkahukuImage.apply (targetDocument, info);        ticlog+="\n  arAkahukuImage.apply "+tic.toc();
    arAkahukuP2P.apply (targetDocument, info);          ticlog+="\n  arAkahukuP2P.apply "+tic.toc();
    arAkahukuQuote.apply (targetDocument, info);        ticlog+="\n  arAkahukuQuote.apply "+tic.toc();
    arAkahukuCatalog.apply (targetDocument, info);      ticlog+="\n  arAkahukuCatalog.apply "+tic.toc();
    arAkahukuPopupQuote.apply (targetDocument, info);   ticlog+="\n  arAkahukuPopupQuote.apply "+tic.toc();
    arAkahukuMHT.apply (targetDocument, info);          ticlog+="\n  arAkahukuMHT.apply "+tic.toc();
    arAkahukuReload.apply (targetDocument, info);       ticlog+="\n  arAkahukuReload.apply "+tic.toc();
    arAkahukuScroll.apply (targetDocument, info, targetWindow);ticlog+="\n  arAkahukuScroll.apply "+tic.toc();
    arAkahukuWheel.apply (targetDocument, info);        ticlog+="\n  arAkahukuWheel.apply "+tic.toc();
    if (info.isReply || info.isNormal) {
      /* 手動でキャッシュを削除 */
      Akahuku.getDocumentParam (targetDocument)._messageBQCache = null;
    }
    Akahuku.getDocumentParam (targetDocument).wasApplied = true;
    Akahuku.runContextTasks (targetDocument);           ticlog+="\n  runContextTasks "+tic.toc();
    var t = total_tic.toc();
    if (t > 1000) {
      Akahuku.debug.log ("Akahuku.apply() total " + t + "ms\n" + ticlog);
    }
  },
    
  /**
   * メッセージの番号を取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @return Number
   *         メッセージの番号
   */
  getMessageNum : function (targetNode) {
    var node = targetNode;
    var lastText = "";
    while (node) {
      if (node.nodeName.toLowerCase () == "#text") {
        if ((node.nodeValue + lastText).match (/No\.([0-9]+)/)) {
          return parseInt (RegExp.$1);
        }
        lastText = node.nodeValue + lastText;
      }
      else if (node.nodeName.toLowerCase () != "wbr") {
        lastText = "";
      }
      
      node = node.previousSibling;
    }
        
    /* 見つからない場合より寛容に探す (改造スクリプト等) */
    node = targetNode;
    lastText = "";
    var nodeName = "";
    while (node) {
      nodeName
        = (node.nodeType == node.ELEMENT_NODE
           ? node.nodeName.toLowerCase () : "");
      if (nodeName == "br") {
        lastText = "";
      }
      else if (node.nodeType == node.TEXT_NODE || nodeName == "a") {
        lastText = node.textContent + lastText;
        if (lastText.match (/No\.([0-9]+)/)) {
          return parseInt (RegExp.$1);
        }
      }
      node = node.previousSibling;
    }

    if (Akahuku.debug.enabled) {
      Akahuku.debug.warn
        ("getMessageNum failed to parse for blockquote \""
         + targetNode.innerHTML + "\"");
    }
    return 0;
  },
    
  /**
   * メッセージの時刻を取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @return Number
   *         時刻
   */
  getMessageTime : function (targetNode) {
    var node = targetNode;
    var lastText = "";
    while (node) {
      if (node.nodeName.toLowerCase () == "a"
          || node.nodeName.toLowerCase () == "font") {
        var tmp = Akahuku.getMessageTime (node.lastChild);
        if (tmp) {
          return tmp;
        }
      }
      else if (node.nodeName.toLowerCase () == "#text") {
        if ((node.nodeValue + lastText).match
            (/([0-9]+)\/([0-9]+)\/([0-9]+)\(([^\)]+)\)([0-9]+):([0-9]+)(:([0-9]+))?/)) {
          var year = RegExp.$1;
          var month = RegExp.$2;
          var day = RegExp.$3;
          var hour = RegExp.$5;
          var min = RegExp.$6;
          var sec = "00";
          if (RegExp.$7) {
            sec = RegExp.$8;
          }
          year = parseInt (year.replace (/^0/, "")) + 2000;
          month = parseInt (month.replace (/^0/, "")) - 1;
          day = parseInt (day.replace (/^0/, ""));
          hour = parseInt (hour.replace (/^0/, ""));
          min= parseInt (min.replace (/^0/, ""));
          sec = parseInt (sec.replace (/^0/, ""));
          
          var date = new Date ();
          
          date.setYear (year);
          date.setDate (1);
          date.setMonth (month);
          date.setDate (day);
          
          date.setHours (hour);
          date.setMinutes (min);
          date.setSeconds (sec);
          
          return date.getTime ();
        }
        lastText = node.nodeValue + lastText;
      }
      else if (node.nodeName.toLowerCase () != "wbr") {
        lastText = "";
      }
            
      node = node.previousSibling;
    }
        
    return 0;
  },
  
  /**
   * サムネの番号を取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @return String
   *         サムネの番号
   */
  getThumbNum : function (targetNode) {
    var node = targetNode;
    while (node
           && node.nodeName.toLowerCase () != "hr") {
      if (node.nodeName.toLowerCase () == "a") {
        var href;
        href = node.getAttribute ("href");
        
        if (href) {
          if (href.match (/red\/([0-9]+)/)
              || href.match (/d\/([0-9]+)/)
              || href.match (/src\/([0-9]+)/)
              || href.match (/r\.php\?r=([0-9]+)/)) {
            /* 画像のリンクの場合 */
            if (node.firstChild) {
              if (node.firstChild.nodeName.toLowerCase ()
                  == "img") {
                /* 画像の場合 */
                                
                return parseInt (RegExp.$1);
              }
            }
          }
        }
      }
      node = node.previousSibling;
    }
        
    return 0;
  },
  /**
   * メッセージの IP アドレスか ID を取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @param  Boolean isId
   *         IP アドレスのかわりに ID を取得するかどうか
   * @return String
   *         メッセージの ID
   */
  getMessageIPID : function (targetNode, isId) {
    var node = targetNode;
    var lastText = "";
    var patternIP = /\bIP:([0-9]+\.[0-9]+\.[0-9]+\.|(?:[0-9]+\.){0,2}\*\([^\(\)]+\))/;
    var patternID = /\bID:([A-Za-z0-9.\/]{8})/;
    var pattern = (isId ? patternID : patternIP);
    while (node) {
      if (node.nodeName.toLowerCase () == "#text") {
        if ((node.nodeValue + lastText).match (pattern)) {
          return RegExp.$1;
        }
        lastText = node.nodeValue + lastText;
      }
      else if (node.nodeName.toLowerCase () != "wbr") {
        lastText = "";
      }
            
      if ((node.nodeName.toLowerCase () == "font"
           || node.nodeName.toLowerCase () == "a")
          && arAkahukuDOM.getInnerText (node).match (pattern)) {
        return RegExp.$1;
      }
            
      node = node.previousSibling;
    }
        
    return "";
  },
    
  /**
   * メッセージの IP アドレスを取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @return String
   *         メッセージの IP アドレス
   */
  getMessageIP : function (targetNode) {
     return this.getMessageIPID (targetNode, false);
  },
    
  /**
   * メッセージの ID を取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @return String
   *         メッセージの ID
   */
  getMessageID : function (targetNode) {
     return this.getMessageIPID (targetNode, true);
  },
    
  /**
   * 合間合間に が完了したイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onAima_Aimanied : function (targetDocument) {
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    if (documentParam) {
      var info = documentParam.location_info;
      if (info.isNotFound) {
        return;
      }
    }
    else {
      return;
    }

    if (info.isReply) {
      if (arAkahukuTitle.enable) {
        arAkahukuTitle.setTitle (targetDocument, info);
      }
      if (arAkahukuThread.enableBottomStatus
          && arAkahukuThread.enableBottomStatusHidden) {
        arAkahukuThread.updateHidden (targetDocument);
      }
      if (arAkahukuThread.enableTabIcon) {
        arAkahukuThread.checkTabIcon (targetDocument);
      }
    }
  },
    
  /**
   * 合間合間に でカタログのスレを無かった事にしたイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onHideEntireThread : function (targetDocument) {
    arAkahukuCatalog.onHideEntireThread (targetDocument);
  },
    
  /**
   * (red|d)/*.htm から元画像のアドレスを取得する
   *
   * @param  String text
   *         (red|d)/*.htm の内容
   * @param  String location
   *         (red|d)/*.htm のアドレス
   * @return Array
   *           [String 元画像のアドレス 見付からなかった場合は "",
   *            Number 待ち時間]
   */
  getSrcURL : function (text, location) {
    var srcLocation = "";
    var wait = 0;
    if (text.match (/URL=([^\"]+)\"/)) {
      srcLocation = RegExp.$1;
      var baseDir = arAkahukuUtil.newURIViaNode (location, null);
      srcLocation = baseDir.resolve (srcLocation);
    }
    else if (text.match (/<script[ \t\r\n]+(language[ \t\r\n]*=[ \t\r\n]*[\"\']?JavaScript[\"\']?)>[ \t\r\n]*(<!--)?[ \t\r\n]*(.+)[ \t\r\n]*(\/\/-->)?[ \t\r\n]*<\/script>/)) {
      var code = RegExp.$3;
      var varMap = new Object ();
      code.replace
      (/([A-Za-z_][A-Za-z_0-9]*)[ \t\r\n]*=[ \t\r\n]*[\"\']([^\"\']+)[\"\'];/g,
       function (matched, name, value) {
        varMap [name] = value;
      });
      if (code.match (/window[ \t\r\n]*\.[ \t\r\n]*open[ \t\r\n]*\(([^,\)]+)[ \t\r\n]*(,[ \t\r\n]*[\"\'][^\"\']*[\"\'][ \t\r\n]*)?\)/)) {
        var url = RegExp.$1;
        for (var n in varMap) {
          url = url.replace (n, varMap [n]);
        }
        srcLocation = url.replace (/[\"\+ \']/g, "");
        wait = 3000;
      }
    }
        
    return [srcLocation, wait];
  },
    
  /**
   * メッセージの BLOCKQUOTE 列を取得する
   * メッセージ以外で BLOCKQUOTE が使用される事があるので
   * 必ずこれを使用する
   *
   * @param  HTMLElement targetNode
   *         対象のドキュメント
   * @return Array
   *         [HTMLQuoteElement, ...]
   */
  getMessageBQ : function (targetNode) {
    /* キャッシュが利用できればそのコピーを返す */
    var documentParam = null;
    if (targetNode.nodeType == targetNode.DOCUMENT_NODE) {
      documentParam = Akahuku.getDocumentParam (targetNode);
      var nodes = Akahuku._getMessageBQCache (documentParam);
      if (nodes) {
        return nodes;
      }
    }

    var newNodes = new Array ();

    /* 可能なら XPath による高速取得を試みる */
    if (Akahuku.isXPathAvailable && Akahuku.enableBoostByXPath) {
      var doc = targetNode.ownerDocument || targetNode;
      try {
        var iterator =
          doc.evaluate
          (".//blockquote[count(ancestor::center)=0][count(ancestor::table[@border='1' or @class='ama'])=0][count(ancestor::div[@id='akahuku_respanel_content' or @class='ama'])=0]",
           targetNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        var node = iterator.iterateNext ();
        while (node) {
          newNodes.push (node);
          node = iterator.iterateNext ();
        }
        if (newNodes.length == 0) {
          /* BLOCKQUOTE ではない */
          iterator =
            doc.evaluate
            (".//div[contains(concat(' ',normalize-space(@class),' '),' re ') or contains(concat(' ',normalize-space(@class),' '),' t ')]",
             targetNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, iterator);
          node = iterator.iterateNext ();
          while (node) {
            newNodes.push (node);
            node = iterator.iterateNext ();
          }
        }
        if (newNodes.length == 0) {
          // タテログのログ対応 patch
          var xpath = ".//div[count(ancestor::div[@class='thread'])=1]";
          if (targetNode instanceof Document) {
            xpath = ".//div[@class='thread']//div";
          }
          iterator =
            doc.evaluate
            (xpath,
             targetNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, iterator);
          node = iterator.iterateNext ();
          while (node) {
            newNodes.push (node);
            node = iterator.iterateNext ();
          }
        }
        if (documentParam) {
          Akahuku._setMessageBQCache (documentParam, newNodes);
        }
        return newNodes;
      }
      catch (e) { Akahuku.debug.exception (e);
       Akahuku.enableBoostByXPath = false;
      }
    }
    
    var nodes = targetNode.getElementsByTagName ("blockquote");
    for (var i = 0; i < nodes.length; i ++) {
      if (arAkahukuDOM.findParentNode (nodes [i], "center") != null) {
        continue;
      }
      var table = arAkahukuDOM.findParentNode (nodes [i], "table");
      if (table && table.getAttribute ("border") == 1) {
        /* 広告のテーブルなので無視 */
        continue;
      }
      if (table && "className" in table
          && table.className == "ama") {
        /* 広告のテーブルなので無視 */
        continue;
      }
      var div = arAkahukuDOM.findParentNode (nodes [i], "div");
      if (div
          && div.id == "akahuku_respanel_content") {
        /* レスパネル中なので無視 */
        continue;
      }
      if (div
          && "className" in div
          && div.className == "ama") {
        /* 広告なので無視 */
        continue;
      }
      
      newNodes.push (nodes [i]);
    }
    
    if (newNodes.length == 0) {
      /* BLOCKQUOTE ではない */
      
      nodes = targetNode.getElementsByTagName ("div");
      for (var i = 0; i < nodes.length; i ++) {
        if (arAkahukuDOM.hasClassName (nodes [i], "re")
            || arAkahukuDOM.hasClassName (nodes [i], "t")) {
          newNodes.push (nodes [i]);
        }
      }
    }
    
    return newNodes;
  },
  
  _setMessageBQCache : function (documentParam, nodes) {
    if (!nodes) {
      if (documentParam
          && "_messageBQCache" in documentParam) {
        documentParam._messageBQCache = null;
      }
      return;
    }
    if (!Akahuku.enableBQCache) {
      return;
    }
    if (!("_messageBQCache" in documentParam)
        || !documentParam._messageBQCache ) {
      /* キャッシュを自動破棄するイベントハンドラを登録 */
      var observer
      = arAkahukuDOM.createMutationObserver
      (function (records) {
        function testMutation (target) {
          if (target.nodeType != target.ELEMENT_NODE
              || /^akahuku_/.test (target.id)
              || /\b(?:__)?akahuku_/.test (target.className)
              || (target.parentNode
                 && target.parentNode.id == "akahuku_ad_cell")
              || /^(?:A|BR?|I(?:FRAME)?|SPAN|FONT)$/
                 .test (target.tagName)) {
            /* 明らかにMessageBQが変化しないパターンでは破棄しない */
            return false;
          }
          return true;
        }
        function testNodes (nodes) {
          if (nodes) {
            for (var j = 0; j < nodes.length; j ++) {
              if (testMutation (nodes [j])) {
                return true;
              }
            }
          }
          return false;
        }
        var flag = false;
        for (var i = 0; i < records.length; i ++) {
          flag
            = testNodes (records [i].addedNodes)
            || testNodes (records [i].removedNodes);
          if (flag) break;
        }
        if (!flag) {
          return;
        }
        if (documentParam
            && "_messageBQCache" in documentParam) {
          documentParam._messageBQCache = null;
        }
        observer.disconnect ();
      });
      var target = documentParam.targetDocument.body;
      if (nodes.length > 0) {
        target = arAkahukuDOM.findParentNode (nodes [0], "form") || target;
      }
      observer.observe (target, {childList: true, subtree: true});
    }
    documentParam._messageBQCache = nodes.slice (0);
  },
  
  _getMessageBQCache : function (documentParam) {
    if (Akahuku.enableBQCache
        && documentParam
        && "_messageBQCache" in documentParam
        && documentParam._messageBQCache) {
      return documentParam._messageBQCache.slice (0);
    }
    return null;
  },
  
  /**
   * メッセージの BLOCKQUOTE 相当かどうかチェック
   *
   * @param  HTMLElement node
   *         対象の要素
   * @return Boolean
   *         メッセージの BLOCKQUOTE 相当かどうか
   */
  isMessageBQ : function (node) {
    if (node.nodeName.toLowerCase () == "blockquote") {
      return true;
    }
    
    if (arAkahukuDOM.hasClassName (node, "re")
        || arAkahukuDOM.hasClassName (node, "t")) {
      return true;
    }
    
    return false;
  },
  
  /**
   * レスのコンテナを返す
   *
   * @param  HTMLElement node
   *         レスのコンテナに含まれる要素
   * @return Object
   *         コンテナ
   */
  getMessageContainer : function (node) {
    var container = {};
    
    var documentParam = Akahuku.getDocumentParam (node.ownerDocument);
    if (documentParam) {
      /* 管理下のドキュメントなら高速化する */
      
      if (documentParam.layout == 1) {
        /* 従来のもの */
        
        var td = arAkahukuDOM.findParentNode (node, "td");
        if (td) {
          var table = arAkahukuDOM.findParentNode (td, "table");
          if (table) {
            container.main = td;
            container.nodes = [table];
        
            return container;
          }
        }
      }
      else if (documentParam.layout == 2) {
        /* 新レイアウト */
        
        var n = arAkahukuDOM.findParentNodeByClassName (node, "r");
        if (n) {
          var br = n;
          while (br) {
            if (br.nodeName.toLowerCase () == "br") {
              break;
            }            
            br = br.nextSibling;
          }
          
          if (br) {
            container.main = n;
            container.nodes = [n, br];
            
            return container;
          }
        }
      }
      else if (documentParam.layout == 3) {
        /* 古い方の新レイアウト */
        
        var n = arAkahukuDOM.findParentNodeByClassName (node, "r");
        if (n) {
          var s = n;
          while (s) {
            if (arAkahukuDOM.hasClassName (s, "s")) {
              break;
            }            
            s = s.previousSibling;
          }
      
          var br = n;
          while (br) {
            if (br.nodeName.toLowerCase () == "br") {
              break;
            }            
            br = br.nextSibling;
          }
          
          if (s && br) {
            container.main = n;
            container.nodes = [s, n, br];
        
            return container;
          }
        }
      }
      else {
        /* 未知なので結果を反映する */
        
        var td = arAkahukuDOM.findParentNode (node, "td");
        if (td) {
          var table = arAkahukuDOM.findParentNode (td, "table");
          if (table) {
            container.main = td;
            container.nodes = [table];
            
            documentParam.layout = 1;
            return container;
          }
        }
    
        var n = arAkahukuDOM.findParentNodeByClassName (node, "r");
        if (n) {
          var s = n;
          while (s) {
            if (arAkahukuDOM.hasClassName (s, "s")) {
              break;
            }            
            s = s.previousSibling;
          }
      
          var br = n;
          while (br) {
            if (br.nodeName.toLowerCase () == "br") {
              break;
            }            
            br = br.nextSibling;
          }
      
          if (s && br) {
            container.main = n;
            container.nodes = [s, n, br];
        
            documentParam.layout = 3;
            return container;
          }
          if (br) {
            container.main = n;
            container.nodes = [n, br];
            
            documentParam.layout = 2;
            return container;
          }
        }
      }
      
      return null;
    }
    
    /* 管理下ではないので全部試す */
    
    var td = arAkahukuDOM.findParentNode (node, "td");
    if (td) {
      var table = arAkahukuDOM.findParentNode (td, "table");
      if (table) {
        container.main = td;
        container.nodes = [table];
        
        return container;
      }
    }
    
    var n = arAkahukuDOM.findParentNodeByClassName (node, "r");
    if (n) {
      var s = n;
      while (s) {
        if (arAkahukuDOM.hasClassName (s, "s")) {
          break;
        }            
        s = s.previousSibling;
      }
      
      var br = n;
      while (br) {
        if (br.nodeName.toLowerCase () == "br") {
          break;
        }            
        br = br.nextSibling;
      }
      
      if (s && br) {
        container.main = n;
        container.nodes = [s, n, br];
        
        return container;
      }
      if (br) {
        container.main = n;
        container.nodes = [n, br];
          
        return container;
      }
    }
    
    return null;
  },
  
  /**
   * レスのコンテナを複製する
   *
   * @param  Object container
   *         対象のコンテナ
   * @return Object
   *         複製したコンテナ
   */
  cloneMessageContainer : function (container) {
    var newContainer = {};
    newContainer.nodes = [];
    
    for (var i = 0; i < container.nodes.length; i ++) {
      newContainer.nodes.push (container.nodes [i].cloneNode (true));
    }
    
    if (container.main.nodeName.toLowerCase () == "td") {
      /* 従来のスタイル */
      
      var nodes = newContainer.nodes [0].getElementsByTagName ("td");
      if (nodes.length == 1) {
        newContainer.main = nodes [0];
      }
      else {
        newContainer.main = nodes [1];
      }
    }
    else {
      /* 新しいスタイル */
      newContainer.main = newContainer.nodes [0];
    }
    
    return newContainer;
  },
  
  /**
   * レスのコンテナを削除する
   *
   * @param  Object container
   *         対象のコンテナ
   */
  removeMessageContainer : function (container) {
    for (var i = 0; i < container.nodes.length; i ++) {
      container.nodes [i].parentNode.removeChild (container.nodes [i]);
    }
  },

  getThumbnailFromBQ : function (bq)
  {
    for (var node = bq.previousSibling;
         node != null; node = node.previousSibling) {
      if (node.nodeType != node.ELEMENT_NODE) {
        continue;
      }
      if (node.nodeName.toLowerCase () == "a") {
        for (var c = node.firstChild;
             c != null; c = c.nextSibling) {
          if (c.nodeName.toLowerCase () != "img") {
            continue;
          }
          if ("className" in c) {
            if (c.className == "akahuku_saveimage_src")
              continue;
          }
          return c;
        }
      }
    }
    return null;
  },

  /**
   * 画像ドキュメントのタブのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onImageDocumentActivity : function (event) {
    var doc = event.originalTarget;
    if (event.target && "nodeName" in event.target
        && event.target.nodeName == "tab") {
      var browser = gBrowser.getBrowserForTab (event.target);
      if (browser) {
        doc = browser.contentDocument;
      }
    }
    if (!(doc instanceof ImageDocument)) {
      return;
    }

    try {
      Components.utils.import
        ("resource://gre/modules/Services.jsm");
      var aURI = doc.documentURIObject;
      try {
        var host = aURI.host;
      } catch (e) {
        return; // ie. data scheme 
      }

      if (/^(apr|feb|jan|mar|jul|aug|sep|oct|rrd|sv[a-f])\.2chan\.net$/
          .test (host)) { /* 画像鯖 */
        var doFake = false;
        if (!Akahuku.isFx9) {
          // 9.0より前はPBモード時の処理が特殊 (参考:Bug 684107)
          var pbsvc = null;
          if ("@mozilla.org/privatebrowsing;1" in Components.classes) {
            pbsvc = Components.classes ["@mozilla.org/privatebrowsing;1"]
            .getService (Components.interfaces.nsIPrivateBrowsingService);
          }
          if (pbsvc && pbsvc.privateBrowsingEnabled) {
            doFake = true;
          }
        }
        if (doFake) {
          Components.utils.import
            ("resource://gre/modules/DownloadLastDir.jsm");
          var lastdir = gDownloadLastDir.getFile ();
          var targetdir = gDownloadLastDir.getFile (aURI);
          if (lastdir && lastdir.path != targetdir.path) {
            /* 設定は消せないが最後の場所で上書きする */
            gDownloadLastDir.setFile (aURI, lastdir);
          }
        }
        else {
          /* ContentPrefs から設定を消す */
          var LAST_DIR_PREF = "browser.download.lastDir";
          var loadContext = null; // required for Firefox 19+
          try {
            loadContext
              = doc.defaultView
              .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
              .getInterface (Components.interfaces.nsIWebNavigation)
              .QueryInterface (Components.interfaces.nsILoadContext);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
          if ("nsIContentPrefService2" in Components.interfaces) {
            var cps2
              = Components.classes ["@mozilla.org/content-pref/service;1"]
              .getService (Components.interfaces.nsIContentPrefService2);
            cps2.removeByDomainAndName (aURI.spec, LAST_DIR_PREF, loadContext);
          }
          else {
            // nsIContentPrefService has been deprecated scince Gecko 20
            var group = Services.contentPrefs.grouper.group (aURI);
            if (Services.contentPrefs.hasPref (group, LAST_DIR_PREF, loadContext)) {
              Services.contentPrefs.removePref (group, LAST_DIR_PREF, loadContext);
            }
          }
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },

  /**
   * 指定されたタイプの akahuku: スキーム URL を元に戻す
   *
   * @param  String spec
   *         対象のURL
   * @param  Object types
   *         タイプ条件 (String, 複数ならArray)
   * @return String
   *         変換されたURL
   */
  deAkahukuURI : function (spec, types) {
    var param = this.protocolHandler.getAkahukuURIParam (spec);
    if (("original" in param) && ("type" in param)) {
      if (!types) {
        return param.original;
      }
      if (types && !(types instanceof Array)) {
        types = new Array (String(types));
      }
      for (var i = 0; i < types.length; i++) {
        if (types [i] == param.type) {
          return param.original;
        }
      }
    }
    return spec;
  },

  /*
   * コンテキストを処理する要求を受けつける
   *   (DOMContentLoaded 前でも)
   */
  queueContextTask : function (handlerOwner, handlerName, context)
  {
    if (!(context instanceof Components.interfaces.nsIDOMNode)) {
      Akahuku.debug.warn
        ("queueContextTasks: context is not an instance of nsIDOMNode.");
      return;
    }
    var contextDocument = context.ownerDocument || context;
    if (!(contextDocument instanceof Components.interfaces.nsIDOMDocument)) {
      Akahuku.debug.warn
        ("queueContextTasks: no nsIDOMDocument retrieved via context.");
      return;
    }
    var args = new Array (context);
    for (var i = 3; i < arguments.length; i ++) {
      args.push (arguments [i]);
    }
    var param = Akahuku.getDocumentParam (contextDocument);
    if (param && "wasApplied" in param && param.wasApplied) {
      // DOMContentLoaded 後では直に呼び出す
      try {
        handlerOwner [handlerName].apply (handlerOwner, args);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    else {
      // DOMContentLoaded 前では後で実行するようリストに入れる
      var tasks
        = Akahuku.getContextTasks (contextDocument)
        || Akahuku.addContextTasks (contextDocument);
      var task = {
        owner: handlerOwner,
        handler: handlerOwner [handlerName],
        handlerName: handlerName,
        args: args,
        context: context,
      };
      if (Akahuku.debug.enabled) {
        task.toString = function () {
          var str = "[task ";
          var props = ["context", "handlerName"];
          for (var i = 0; i < props.length; i ++) {
            str += props [i] + "=";
            try {
              str += this [props [i]] + " ";
            }
            catch (e) {
              str += "!\"" + e.message + "\" ";
            }
          }
          return str + "]";
        };
      }
      if (!task.handler) {
        Akahuku.debug.warn
          ("queueContextTasks: invalid handler \"" + handlerName + "\"");
        return;
      }
      tasks.push (task);
    }
  },

  addContextTasks : function (targetDocument)
  {
    var tasks = new Array ();
    Akahuku.contextTasksArray.push (tasks);
    // タスクリストの消去保証
    // (apply されず onBodyUnload が呼ばれない場合がある)
    targetDocument.defaultView.addEventListener
      ("unload",
       function (event) {
         Akahuku.clearContextTasks (event.target);
       }, false);
    return tasks;
  },

  getContextTasks : function (targetDocument)
  {
    for (var i = 0; i < Akahuku.contextTasksArray.length; i ++) {
      var tasks = Akahuku.contextTasksArray [i];
      if (tasks.length > 0) {
        if (tasks [0].context &&
            tasks [0].context.ownerDocument === targetDocument) {
          return tasks;
        }
      }
    }
    return null;
  },

  clearContextTasks : function (targetDocument, optForce)
  {
    for (var i = 0; i < Akahuku.contextTasksArray.length; i ++) {
      var tasks = Akahuku.contextTasksArray [i];
      if (tasks.length > 0) {
        if (tasks [0].context &&
            tasks [0].context.ownerDocument === targetDocument) {
          if (!optForce && Akahuku.debug.enabled) {
            Akahuku.debug.warn
              ("clearContextTasks clears non-empty tasklist for "
               + targetDocument.location
               + "\nlist = " + tasks);
          }
          Akahuku.contextTasksArray.splice (i, 1);
          break;
        }
      }
      else {
        Akahuku.contextTasksArray.splice (i, 1);
        i --;
      }
    }
  },

  runContextTasks : function (targetDocument, opt)
  {
    var tasks = Akahuku.getContextTasks (targetDocument);
    if (!tasks) {
      return;
    }
    var num = 0;
    for (var i = 0; i < tasks.length; i ++) {
      // opt で指定されたタスクを選別
      if (opt &&
          (("owner" in opt && tasks [i].owner != opt.owner)
           || ("context" in opt && tasks [i].context != opt.context)
           || ("handler" in opt && tasks [i].handler != opt.handler)
           || ("handlerName" in opt
               && tasks [i].handlerName != opt.handlerName)
           )) {
        continue;
      }
      var task = tasks [i];
      tasks.splice (i --, 1); // --iではダメ
      num ++;
      try {
        task.handler.apply (task.owner, task.args);
      }
      catch (e) { Akahuku.debug.exception (e);
        if (Akahuku.debug.enabled) {
          Akahuku.debug.log
            ("runContextTasks cought an error while a task " + num
             + " " + task.toString ()
             + "\n" + targetDocument.location);
        }
      }
    }
    if (tasks.length == 0) {
      Akahuku.clearContextTasks (targetDocument);
    }
  },
};

/* 古い Mozilla Suite では最初のイベントリスナが無視されるので 2 つ登録する */
window.addEventListener ("load",
                         function () {
                           Akahuku.onLoad ();
                         }, false);
window.addEventListener ("load",
                         function () {
                           Akahuku.onLoad ();
                         }, false);

window.addEventListener ("unload",
                         function () {
                           Akahuku.onUnload ();
                         }, false);
window.addEventListener ("unload",
                         function () {
                           Akahuku.onUnload ();
                         }, false);
