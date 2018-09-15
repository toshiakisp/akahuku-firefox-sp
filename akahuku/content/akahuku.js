
/**
 * 本体 (Content)
 */
var Akahuku = {
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
    deAkahukuURI: function (uri) {
      return uri;
    },
    getAkahukuURIParam: function (uri) {
      return {};
    },
  },

  latestParam : null,            /* arAkahukuDocumentParam
                                  *   最近使ったドキュメントごとの情報 */
  managedEventHandlers : [],
    
  isRunningOnWindows : false,
  isRunningOnMac : false,
    
  initialized : false,           /* Boolean  初期化フラグ */
    
  enableAll : false,             /* Boolean  全機能の ON／OFF */
  enableAddCheckboxID : false,   /* Boolean  チェックボックスに id を付ける */

  enablePartial : false,         /* Boolean  デフォルトで最新 n 件表示 */
  partialCount : 100,            /* Number  n 件 */
  partialUp : 100,               /* Number  前に n 件ずつ戻る */

  useFrameScript : false,
  useCSSTransition : true,

  isXPathAvailable : true,

  enableBQCache : false,
  enableBoostByXPath : false,
  enableDownloadLastDirHack : false,

  contextTasksArray : new Array (),
    
  /**
   * ドキュメントごとの情報を追加する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  addDocumentParam : function (targetDocument, info) {
    var documentParam = new arAkahukuDocumentParam ();
    documentParam.targetDocument = targetDocument;
    documentParam.url = targetDocument.documentURI;
    if (info) {
      documentParam.location_info = info;
    }
    Akahuku.collectLinks (documentParam);
    Akahuku.latestParam = documentParam;

    let cleanParam = JSON.parse(JSON.stringify(documentParam));
    AkahukuCentral.register('param', cleanParam)
      .then((res) => {
        documentParam.id = res.id;
      })
      .catch((e) => Akahuku.debug.exception(e));
  },
    
  /**
   * ドキュメントごとの情報を削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  deleteDocumentParam : function (targetDocument) {
    let documentParam = Akahuku.latestParam;
    AkahukuCentral.unregister('param', {id: documentParam.id});
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
    return this.latestParam;
  },

  /**
   * URI に合致するドキュメントごとの情報を得る
   * @param  String uri
   *         対象のURI
   * @return Array
   *         [arAkahukuDocumentParam,...]
   */
  getDocumentParamsByURI : function (uri, optFirstOnly) {
    var ret = [];
    if (this.latestParam.url == uri) {
      ret.push(this.latestParam);
    }
    return ret;
  },

  hasDocumentParamForURI : function (uri) {
    return (Akahuku.getDocumentParamsByURI (uri, true).length > 0);
  },

  /**
   * 関連するドキュメントへのリンクを収集する
   * @param arAkahukuDocumentParam
   */
  collectLinks : function (documentParam)
  {
    var homeLinks = [];
    var backLinks = [];
    var catalogLinks = [];
    try {
      var targetDocument = documentParam.targetDocument;
      var nodes = targetDocument.getElementsByTagName ("a");
      for (var i = 0; i < nodes.length; i ++) {
        if (!nodes [i].hasAttribute ("href") ||
            /(^javascript:|\.(jpg|gif|png|webm|mp4)$)/i
            .test (nodes [i].href)) {
          // 無駄な検索を省く
          continue;
        }
        if (/(\?mode=cat|cat\.htm)$/.test (nodes [i].href)) {
          // cat\.htm$ : 避難所 patch
          catalogLinks.push (nodes [i]);
          if (!documentParam.links.catalog) {
            documentParam.links.catalog = nodes [i].href;
          }
        }
        else if (/\?mode=cat(&.*)$/.test (nodes [i].href)) {
          // catalogLinks.push (nodes [i]);
        }
        var text = arAkahukuDOM.getInnerText (nodes [i]);
        if (/\u63B2\u793A\u677F\u306B\u623B\u308B/.test (text) &&
            // /掲示板に戻る/
            /futaba\.htm$/.test (nodes [i].href)) {
          backLinks.push (nodes [i]);
          if (backLinks.length == 1) {
            documentParam.links.back = nodes [i].href;
          }
        }
        if ("\u30DB\u30FC\u30E0" === text) {
            // "ホーム"
          homeLinks.push (nodes [i]);
          if (homeLinks.length == 1) {
            documentParam.links.home = nodes [i].href;
          }
        }
      }
      documentParam.links.homeAnchors = homeLinks;
      documentParam.links.backAnchors = backLinks;
      documentParam.links.catalogAnchors = catalogLinks;
    }
    catch (e) { Akahuku.debug.exception (e);
      documentParam.links.home = "http://www.2chan.net/";
      documentParam.links.back = "";
      documentParam.links.catalog = "";
    }
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
   * 初期化
   */
  init : function () {
    if (Akahuku.initialized) {
      return;
    }

    // 各種サービスの初期化
    arAkahukuFile.init ();
    arAkahukuSound.init ();
    arAkahukuLink.init ();
    arAkahukuCatalog.init ();
    arAkahukuBoard.init ();
    arAkahukuConverter.init ();
    arAkahukuP2P.init ();
    arAkahukuConfig.init ();
    arAkahukuStyle.init ();
    arAkahukuSidebar.init ();

    Akahuku.initContextMenus ();

    this.initialized = true;
  },

  /**
   * 終了
   */
  term : function () {
    if (!Akahuku.initialized) {
      return;
    }

    // For terminating applied documenets
    Akahuku.removeAllManagedEventHandlers ();
    if (Akahuku.latestParam) {
      try {
        var target = Akahuku.latestParam.targetDocument;
        if (target && target.nodeType == 9) {  // 9 == DOCUMENT_TYPE
          Akahuku.onBodyUnload (target, {})
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    Akahuku.latestParam = null;

    arAkahukuSidebar.term ();
    arAkahukuStyle.term ();
    arAkahukuConfig.term ();
    arAkahukuP2P.term ();
    arAkahukuConverter.term ();
    arAkahukuBoard.term ();
    arAkahukuCatalog.term ();
    arAkahukuLink.term ();
    arAkahukuSound.term ();
    arAkahukuFile.term ();

    Akahuku.protocolHandler = {};

    Akahuku.initialized = false;
  },

  initContextMenus : function () {
    /*
    try {
      var cm = AkahukuContextMenus;
      arAkahukuQuote.initContextMenus (cm);
      arAkahukuJPEG.initContextMenus (cm);
      arAkahukuP2P.initContextMenus (cm);
      arAkahukuLink.initContextMenus (cm);
      arAkahukuImage.initContextMenus (cm);

      arAkahukuTab.initContextMenus (cm);
      arAkahukuUI.initContextMenus (cm);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    */
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
    Akahuku.removeAllManagedEventHandlers (targetDocument);
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
    arAkahukuLink.onBodyUnload (targetDocument, documentParam);
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
    var frame = targetDocument.defaultView.frameElement;
    if (frame && frame.nodeName.toLowerCase () == "iframe"
        && !frame.hasAttribute ("src")) {
      // src の無い iframe の中には適用しない
      // (親ドキュメントの href と同じに見えてしまう)
      return false;
    }
    if (href.match
        (/^https?:\/\/([^\/]+\/)?(tmp|up|img|cgi|zip|dat|may|nov|jun|dec|ipv6)\.2chan\.net(:[0-9]+)?\/([^\/]+)\//)
        || href.match
        (/^https?:\/\/([^\/]+\/)?(www)\.2chan\.net(:[0-9]+)?\/(h|oe|b|30|31|51|junbi|hinan)\//)) {
      /* ふたばの板 */
      if (href.match (/\.2chan\.net(:[0-9]+)?\/bin\//)) {
        // 広告用リソースなど
        return false;
      }
      return true;
    }
        
    if (Akahuku.protocolHandler.isAkahukuURI (href)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (href);
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
                .match (/https?:\/\/[^\.]+\.2chan\.net\/[^\/]+\//)) {
              /* 赤福:非公式 Firefox 版の mht (Fx 3.1 以降) */
              return true;
            }
          }
          nodes = targetDocument.getElementsByTagName ("base");
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i].getAttribute ("href")
                && nodes [i].getAttribute ("href")
                .match (/https?:\/\/[^\.]+\.2chan\.net\/[^\/]+\//)) {
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
   * コンテンツがロードされたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDOMContentLoaded : function (event) {
    var targetDocument = event.target.defaultView.document;
    var needApply = false;
        
    if (Akahuku.enableAll) {
      needApply = Akahuku.getNeedApply (targetDocument,
                                        targetDocument.documentURI);
      
      if (needApply) {
        /* 対象であれば適用する */

        // カスタムイベント: 赤福より前に動きたい他の拡張機能をトリガー
        var ev = targetDocument.createEvent ("Events");
        ev.initEvent ("AkahukuContentBeforeApplied", true, false);
        targetDocument.dispatchEvent (ev);
        
        Akahuku.apply(targetDocument, false);

        // カスタムイベント: 赤福より後に動きたい他の拡張機能をトリガー
        ev = targetDocument.createEvent ("Events");
        ev.initEvent ("AkahukuContentApplied", true, false);
        targetDocument.dispatchEvent (ev);
      }
    }
        
    if (!needApply) {
      /* ホイールリロードはふたば外でも動く */
      //arAkahukuWheel.apply (targetDocument, null);
    }
        
    if (Akahuku.enableAll) {
      if (targetDocument.documentURI.match
          (/^https?:\/\/www\.nijibox[256]\.com\/futabafiles\/(tubu|kobin|mid|001|003)\/((.+)\.html|$)/)) {
        if (arAkahukuPostForm.enablePreview) {
          arAkahukuPostForm.applyPreview (targetDocument, true);
        }
        if (arAkahukuPostForm.enableCommentboxBG) {
          arAkahukuPostForm.applyCommentboxBGSio (targetDocument);
        }
      }
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
    
    arAkahukuSound.apply (targetDocument, info);
        
    if (href.match (/futaba\.php$/)
        && !info.isNotFound) {
      /* スレ立て後、レス送信後、リダイレクトの場合
       * 音以外はなにもしない */
            
      /* futaba: 負荷があるだけなので外部には対応しない */
      return;
    }
    
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
    
    Akahuku.addDocumentParam (targetDocument, info);

    if (info.isReply || info.isNormal) {
      bqnodes = bqnodes || Akahuku.getMessageBQ (targetDocument);
      /* キャッシュ手動設定 (DOM変更を検知しない) */
      Akahuku.getDocumentParam (targetDocument)._messageBQCache
      = bqnodes;
    }

    Akahuku.addEventListener
    (targetWindow, "unload",
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
    arAkahukuScroll.apply (targetDocument, info);       ticlog+="\n  arAkahukuScroll.apply "+tic.toc();
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

    if (targetNode.nodeType == targetNode.DOCUMENT_NODE &&
        documentParam && documentParam.location_info &&
        documentParam.location_info.isFutaba &&
        documentParam.location_info.isReply) {
      // ふたばで全BQ取得時には div.thre 内のみに対象が絞れる可能性
      // (レイアウト 2016/05/31~)
      var divThre = targetNode.querySelector ("body>form>div.thre");
      targetNode = (divThre ? divThre : targetNode);
    }

    var newNodes = new Array ();

    /* 可能なら XPath による高速取得を試みる */
    var doc = targetNode.ownerDocument || targetNode;
    if (Akahuku.isXPathAvailable && Akahuku.enableBoostByXPath
        && doc.defaultView) {
      try {
        var itType = XPathResult.ORDERED_NODE_ITERATOR_TYPE;
        var iterator =
          doc.evaluate
          (".//blockquote[count(ancestor::center)=0][count(ancestor::table[@border='1' or @class='ama'])=0][count(ancestor::div[@id='akahuku_respanel_content' or @class='ama'])=0]",
           targetNode, null, itType, null);
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
             targetNode, null, itType, iterator);
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
             targetNode, null, itType, iterator);
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
      }, documentParam.targetDocument);
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
   * @param  Object conf
   *         挙動の詳細設定
   * @return Object
   *         複製したコンテナ
   */
  cloneMessageContainer : function (container, conf) {
    var newContainer = {};
    newContainer.nodes = [];
    var cloneNodeConf = {
      excludeClasses : conf.excludeClasses || [],
      excludeIds : conf.excludeIds || [],
      stripId : conf.stripId || false,
      noMediaAutoPlay : conf.noMediaAutoPlay || false,
    };
    if (conf.skipMainInner) {
      // main の子孫は複製させない
      cloneNodeConf.stopNodes = [container.main];
    }
    
    for (var i = 0; i < container.nodes.length; i ++) {
      var dupNode = arAkahukuDOM
        .cloneNodeCustom (container.nodes [i], true, cloneNodeConf);
      if (dupNode) {
        newContainer.nodes.push (dupNode);
      }
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
    if (!(context instanceof Node)) {
      Akahuku.debug.warn
        ("queueContextTasks: context is not an instance of Node.");
      return;
    }
    var contextDocument = context.ownerDocument || context;
    if (!(contextDocument instanceof Document)) {
      Akahuku.debug.warn
        ("queueContextTasks: no Document retrieved via context.");
      return;
    }
    var args = new Array (context);
    for (var i = 3; i < arguments.length; i ++) {
      args.push (arguments [i]);
    }
    var param = Akahuku.getDocumentParam (contextDocument);
    // traverse iframe ancestors to handle tasks from content policy
    while (!param && contextDocument.defaultView.frameElement
        && contextDocument.defaultView.frameElement.nodeName == "IFRAME") {
      contextDocument = contextDocument.defaultView.frameElement.ownerDocument;
      param = Akahuku.getDocumentParam (contextDocument);
    }
    if (param && "wasApplied" in param && param.wasApplied) {
      // DOMContentLoaded 後では直後に呼び出す
      // (content-policyからでは直接では早すぎることがある)
      arAkahukuUtil.executeSoon (function (owner, name, args){
        owner [name].apply (owner, args);
      }, [handlerOwner, handlerName, args]);
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
    Akahuku.addEventListener
      (targetDocument.defaultView, "unload",
       function (event) {
         Akahuku.clearContextTasks (event.target);
       }, false);
    return tasks;
  },

  addEventListener : function (target, name, handler, flag) {
    target.addEventListener (name, handler, flag);
    // taretDocument = target.ownerDocument || target;
    Akahuku.managedEventHandlers.push ({
      node: target,
      name: name,
      handler: handler,
      flag: flag,
    });
  },

  popManagedEventHandlersForDocument : function (targetDocument) {
    var list = []
    for (var i = 0; i < Akahuku.managedEventHandlers.length; i ++) {
      try {
        var entry = Akahuku.managedEventHandlers [i];
        var ownerDocument = entry.node.ownerDocument || entry.node;
        if (ownerDocument == targetDocument) {
          list.push (entry);
          Akahuku.managedEventHandlers.splice (i, 1);
          i --;
        }
      }
      catch (e) {
        // TypeError: can't access dead object
        // などが起こったらそのエントリーは破棄
        Akahuku.managedEventHandlers.splice (i, 1);
        i --;
      }
    }
    return list;
  },

  removeAllManagedEventHandlers : function (targetDocument) {
    var e;
    if (targetDocument) {
      e = Akahuku.popManagedEventHandlersForDocument (targetDocument);
    }
    else { // All
      e = Akahuku.managedEventHandlers.splice (0, Akahuku.managedEventHandlers.length);
    }
    for (var i = 0; i < e.length; i ++) {
      try {
        e [i].node.removeEventListener (e [i].name, e [i].handler, e [i].flag);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
  },

  onUnloadForContextTasks : function (event) {
    Akahuku.clearContextTasks (event.target);
  },

  getContextTasks : function (targetDocument)
  {
    for (var i = 0; i < Akahuku.contextTasksArray.length; i ++) {
      var tasks = Akahuku.contextTasksArray [i];
      try {
        if (tasks.length > 0 &&
            tasks [0].context &&
            tasks [0].context.ownerDocument === targetDocument) {
          return tasks;
        }
      }
      catch (e) {
        // TypeError: can't access dead object
        // などが起こったらそのエントリーは破棄
        Akahuku.debug.warn
          ("getContextTasks drops a errored tasklist; " + e.message);
        Akahuku.contextTasksArray.splice (i, 1);
        i --;
      }
    }
    return null;
  },

  clearContextTasks : function (targetDocument, optForce)
  {
    for (var i = 0; i < Akahuku.contextTasksArray.length; i ++) {
      var tasks = Akahuku.contextTasksArray [i];
      try {
        if (tasks.length == 0) {
          throw Error ("empty");
        }
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
      catch (e) {
        if (tasks.length != 0) {
          Akahuku.debug.warn
            ("clearContextTasks drops a errored tasklist; " + e.message);
        }
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

