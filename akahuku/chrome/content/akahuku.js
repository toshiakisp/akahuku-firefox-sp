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
  isFx36 : false,                /* Boolean  Firefox 3.6 以降か */
    
  initialized : false,           /* Boolean  初期化フラグ */
    
  enableAll : false,             /* Boolean  全機能の ON／OFF */
  enableAddCheckboxID : false,   /* Boolean  チェックボックスに id を付ける */

  enablePartial : false,         /* Boolean  デフォルトで最新 n 件表示 */
  partialCount : 100,            /* Number  n 件 */
  partialUp : 100,               /* Number  前に n 件ずつ戻る */
    
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
    
    try {
      var faviconService
      = Components.classes ["@mozilla.org/browser/favicon-service;1"]
      .getService (Components.interfaces.nsIFaviconService);
      if ("expireAllFavicons" in faviconService) {
        Akahuku.isFx36 = true;
      }
    }
    catch (e) {
    }
    
    /* ScrapBook で akahuku の保存を有効にする
     * saver.js の 638 行目 */
    try {
      if (typeof (sbContentSaver) != "undefined"
          && "download" in sbContentSaver
          && typeof (sbContentSaver.download) == "function") {
        sbContentSaver.download
        = eval (("(" + sbContentSaver.download.toString () + ")")
                .replace (/\|\|[ \r\n\t]*aURL[ \r\n\t]*\.[ \r\n\t]*schemeIs[ \r\n\t]*\([ \r\n\t]*\"ftp\"[ \r\n\t]*\)/,
                          "|| aURL.schemeIs(\"ftp\") || aURL.schemeIs(\"akahuku\")"));
      }
    }
    catch (e) {
    }
        
    /* QuickDrag で akahuku の保存を有効にする
     * quickdrag.js の 167 行目 */
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
    }
    
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
    arAkahukuHistory.init ();
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
      catch (e) {
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
      catch (e) {
      }
    }
            
    Akahuku.initialized = true;
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
        (/^http:\/\/nijibox\.dyndns\.dk\/akahuku\/catalog\/dat\/(view.php\?mode=cat2?)/)
        || href.match
        (/^http:\/\/appsweets\.net\/catalog\/dat\/(view\.php\?mode=cat2?)/)
        || href.match
        (/^http:\/\/www\.nijibox4\.com\/akahuku\/catalog\/dat\/(view\.php\?mode=cat2?)/)
        || href.match
        (/^http:\/\/www\.nijibox\.com\/futaba\/catalog\/img\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      return true;
    }
    
    if (href.match
        (/^http:\/\/tsumanne\.net\/[a-z]+\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/)) {
      /* サッチー */
      return true;
    }
        
    /* 避難所 patch */
    if (arAkahukuBoard.enableExternal) {
      for (var i = 0; i < arAkahukuBoard.externalList.length; i ++) {
        if (arAkahukuBoard.externalList [i].prefix) {
          if (href.indexOf (arAkahukuBoard.externalList [i].pattern)
              == 0) {
            return true;
          }
        }
        else {
          if (href.match (arAkahukuBoard.externalList [i].pattern)) {
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
    
    if (Components.interfaces.nsIPrefBranch2 == undefined) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuConfig.loadPrefBranch ();
      Akahuku.getConfig ();
    }
        
    var needApply = false;
        
    if (Akahuku.enableAll) {
      if (Components.interfaces.nsIPrefBranch2 == undefined) {
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
          (/^http:\/\/www\.nijibox[25]\.com\/futabafiles\/(tubu|kobin|001|003)\/((.+)\.html|$)/)) {
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
    var targetWindow = targetDocument.defaultView;
    
    var info = new arAkahukuLocationInfo (targetDocument, instant);
    var href = targetDocument.location.href;
    
    info.replyFrom = 1;
    if (Akahuku.enablePartial && info.isReply
        && !info.isMht && !instant) {
      var nodes = Akahuku.getMessageBQ (targetDocument);
      var partialNode = null;
      for (var i = 0; i < nodes.length - Akahuku.partialCount; i ++) {
        var container = Akahuku.getMessageContainer (nodes [i]);
        if (container) {
          if (partialNode == null) {
            partialNode = targetDocument.createElement ("div");
            partialNode.id = "akahuku_partial_indicator";
            container.nodes [0].parentNode.insertBefore
              (partialNode, container.nodes [0]);
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
    }
    
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
    }
    
    if (Components.interfaces.nsIPrefBranch2 == undefined) {
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
    
    if (Components.interfaces.nsIPrefBranch2 == undefined) {
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
    }
    
    if (arAkahukuBoard.enableSelect) {
      /* 板を制限する場合はチェックする */
      var name = info.server + ":" + info.dir;
      if (name in arAkahukuBoard.selectExList) {
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
    
    targetWindow.addEventListener
    ("unload",
     function () {
      Akahuku.onBodyUnload (targetDocument, arguments [0]);
    }, true);
        
    arAkahukuThread.fixBug (targetDocument, info);
        
    arAkahukuSidebar.apply (targetDocument, info);
    arAkahukuStyle.apply (targetDocument, info);
    arAkahukuDelBanner.apply (targetDocument, info);
    arAkahukuPostForm.apply (targetDocument, info);
    arAkahukuThread.apply (targetDocument, info);
    arAkahukuThreadOperator.apply (targetDocument, info);
    arAkahukuLink.apply (targetDocument, info);
    arAkahukuTitle.apply (targetDocument, info);
    arAkahukuImage.apply (targetDocument, info);
    arAkahukuP2P.apply (targetDocument, info);
    arAkahukuQuote.apply (targetDocument, info);
    arAkahukuCatalog.apply (targetDocument, info);
    arAkahukuPopupQuote.apply (targetDocument, info);
    arAkahukuMHT.apply (targetDocument, info);
    arAkahukuReload.apply (targetDocument, info);
    arAkahukuScroll.apply (targetDocument, info, targetWindow);
    arAkahukuWheel.apply (targetDocument, info);
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
   * メッセージの IP アドレスを取得する
   *
   * @param  HTMLQuoteElement targetNode
   *         対象のメッセージの blockquote 要素
   * @return String
   *         メッセージの IP アドレス
   */
  getMessageIP : function (targetNode) {
    var node = targetNode;
    var lastText = "";
    while (node) {
      if (node.nodeName.toLowerCase () == "#text") {
        if ((node.nodeValue + lastText)
            .match (/IP:([0-9]+\.[0-9]+\.[0-9]+\.)/)) {
          return RegExp.$1;
        }
        lastText = node.nodeValue + lastText;
      }
      else if (node.nodeName.toLowerCase () != "wbr") {
        lastText = "";
      }
            
      if ((node.nodeName.toLowerCase () == "font"
           || node.nodeName.toLowerCase () == "a")
          && arAkahukuDOM.getInnerText (node).match
          (/IP:([0-9]+\.[0-9]+\.[0-9]+\.)/)) {
        return RegExp.$1;
      }
            
      node = node.previousSibling;
    }
        
    return "";
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
                            
      var baseDir
        = Components
        .classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (Components.interfaces.nsIURI);
      baseDir.spec = location;
            
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
    var newNodes = new Array ();
    
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
  }
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
