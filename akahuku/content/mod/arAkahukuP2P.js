
/**
 * P2P
 */
var arAkahukuP2P = {
  enable : false,            /* Boolean  画像を P2P 経由で取得する */
  address : "",              /* String  自分の IP アドレス */
  port : 0,                  /* Number  自分のポート番号 */
  enableNoAccept : false,    /* Boolean  襲い攻め、襲い受け のみかどうか */
  enableDynamic : false,     /* Boolean  IP アドレスを自動更新するか */
  cacheCheckInterval : 0,    /* Number  キャッシュチェックの間隔 */
  cacheSrcLimit : 0,         /* Number  src キャッシュの最大個数 */
  cacheThumbLimit : 0,       /* Number  thumb キャッシュの最大個数 */
  cacheCatLimit : 0,         /* Number  cat キャッシュの最大個数 */
  cacheBase : "",            /* String  キャッシュのディレクトリ
                              *   "" ならばデフォルト */
  transferLimit : 128,       /* Boolean  送信帯域制限 [KBytes/s] */
  enableTreatAsSame : false, /* Boolean  feb, apr のキャッシュをまとめる */
  enableStatusbar : false,   /* Boolean  ステータスバーに状況を表示する */
  enableNoCat : false,       /* Boolean  カタログ画像は P2P を経由しない */
  enablePrefetchSrc : false, /* Boolean  src 画像を P2P からプリフェッチする */
  acceptSlot : 0,            /* Number  最大誘い人数 [分] */
  illegalAddress : false,    /* Boolean  アドレスがおかしい */
    
  prefetchedList : new Object (), /* Object  最近プリフェッチを試行したもの
                                   *   <String パス, Number 時間>*/
    
  prefetchList : new Array (), /* Array  プリフェッチするもの
                                *   [String パス] */
  prefetchTimer : null,      /* Number  プリフェッチ用タイマー */
    
  shortcutKeycode : 0,              /* Number  ショートカットキーのキーコード */
  shortcutModifiersAlt : false,     /* Boolean  ショートカットキーの Alt */
  shortcutModifiersCtrl : false,    /* Boolean  ショートカットキーの Ctrl */
  shortcutModifiersMeta : false,    /* Boolean  ショートカットキーの Meta */
  shortcutModifiersShift : false,   /* Boolean  ショートカットキーの Shift */
    
  service : null,

  /**
   * 初期化処理
   */
  init : function () {
  },

  term : function () {
  },

  /**
   * キーが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onKeyDown : function (event) {
    if (Akahuku.enableAll
        && arAkahukuP2P.enable
        && arAkahukuP2P.enableShortcut) {
      if (arAkahukuP2P.shortcutKeycode == event.keyCode
          && arAkahukuP2P.shortcutModifiersAlt == event.altKey
          && arAkahukuP2P.shortcutModifiersCtrl == event.ctrlKey
          && arAkahukuP2P.shortcutModifiersMeta == event.metaKey
          && arAkahukuP2P.shortcutModifiersShift == event.shiftKey) {
        var window = event.currentTarget;
        arAkahukuCompat.toggleSidebar ("viewAkahukuP2PSidebar", false, window);
        event.preventDefault ();
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuP2P.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.p2p", false);
    if (arAkahukuP2P.enable) {
      arAkahukuP2P.address
      = arAkahukuConfig
      .initPref ("char", "akahuku.p2p.address", "");
            
      arAkahukuP2P.port
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.port", 12545);
            
      arAkahukuP2P.enableNoAccept
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.port.zero", true);
            
      arAkahukuP2P.enableDynamic
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.dynamic", true);
            
      arAkahukuP2P.cacheCheckInterval
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.cache.check_interval", 0);
            
      arAkahukuP2P.cacheSrcLimit
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.cache.src_limit", 0);
      if (arAkahukuP2P.cacheSrcLimit != 0
          && arAkahukuP2P.cacheSrcLimit < 200) {
        arAkahukuP2P.cacheSrcLimit = 200;
      }
            
      arAkahukuP2P.cacheThumbLimit
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.cache.thumb_limit", 0);
      if (arAkahukuP2P.cacheThumbLimit != 0
          && arAkahukuP2P.cacheThumbLimit < 200) {
        arAkahukuP2P.cacheThumbLimit = 200;
      }
            
      arAkahukuP2P.cacheCatLimit
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.cache.cat_limit", 0);
      if (arAkahukuP2P.cacheCatLimit != 0
          && arAkahukuP2P.cacheCatLimit < 200) {
        arAkahukuP2P.cacheCatLimit = 200;
      }
            
      arAkahukuP2P.cacheBase
      = arAkahukuConfig
      .initPref ("char", "akahuku.p2p.cache.base", "");
            
      arAkahukuP2P.transferLimit
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.transfer.limit", 128);
      if (arAkahukuP2P.transferLimit < 10) {
        arAkahukuP2P.transferLimit = 10;
      }
            
      arAkahukuP2P.enableTreatAsSame
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.treat_as_same", false);
            
      arAkahukuP2P.enableStatusbar
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.statusbar", true);
            
      arAkahukuP2P.enableNoCat
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.nocat", false);
            
      arAkahukuP2P.enablePrefetchSrc
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.prefetch.src", false);
            
      arAkahukuP2P.acceptSlot
      = arAkahukuConfig
      .initPref ("int",  "akahuku.p2p.accept_slot", 3);
      if (arAkahukuP2P.acceptSlot < 3) {
        arAkahukuP2P.acceptSlot = 3;
      }
      else if (arAkahukuP2P.acceptSlot > 29) {
        arAkahukuP2P.acceptSlot = 29;
      }
            
      arAkahukuP2P.cacheBase = unescape (arAkahukuP2P.cacheBase);
      if (arAkahukuP2P.cacheBase == "") {
        arAkahukuP2P.cacheBase
          = arAkahukuFile.systemDirectory;
      }
      arAkahukuP2P.cacheBase
        = AkahukuFileUtil.Path.join (arAkahukuP2P.cacheBase, "p2p");
            
      arAkahukuP2P.enableShortcut
      = arAkahukuConfig
      .initPref ("bool", "akahuku.p2p.sidebar.shortcut", false);
      if (arAkahukuP2P.enableShortcut) {
        var value
          = arAkahukuConfig
          .initPref ("char", "akahuku.p2p.sidebar.shortcut.keycode",
                     "VK_S");
        value
          = unescape (value);
        arAkahukuP2P.shortcutKeycode
          = KeyEvent ["DOM_" + value];
                
        arAkahukuP2P.shortcutModifiersAlt
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.p2p.sidebar.shortcut.modifiers.alt",
                     false);
        arAkahukuP2P.shortcutModifiersCtrl
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.p2p.sidebar.shortcut.modifiers.ctrl",
                     false);
        arAkahukuP2P.shortcutModifiersMeta
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.p2p.sidebar.shortcut.modifiers.meta",
                     true);
        arAkahukuP2P.shortcutModifiersShift
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.p2p.sidebar.shortcut.modifiers.shift",
                     true);
      }
            
      arAkahukuP2P.illegalAddress = false;
      if (!arAkahukuP2P.enableDynamic) {
        if (!arAkahukuP2P.address.match
            (/^[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$/)) {
          /* 固定のアドレスがおかしい場合は 襲い攻め、襲い受け のみにする */
          arAkahukuP2P.illegalAddress = true;
          arAkahukuP2P.address = "";
          arAkahukuP2P.enableNoAccept = true;
        }
        if (arAkahukuP2P.address.match
            (/^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/)) {
          /* IP アドレス */
          var n1 = parseInt (RegExp.$1);
          var n2 = parseInt (RegExp.$2);
          var n3 = parseInt (RegExp.$3);
          var n4 = parseInt (RegExp.$4);
          if (n1 == 10
              || (n1 == 172 && n2 >= 16 && n2 <= 31)
              || (n1 == 192 && n2 == 168)
              || (n1 == 127 && n2 == 0 && n3 == 0 && n4 == 1)
              || (n1 == 169 && n2 == 254)) {
            /* プライベートアドレス、
             * リンクローカルアドレスの場合 襲い攻め、襲い受け のみにする */
            arAkahukuP2P.illegalAddress = true;
            arAkahukuP2P.address = "";
            arAkahukuP2P.enableNoAccept = true;
          }
        }
        else if (arAkahukuP2P.address.match (/^[0-9\.]+$/)) {
          /* IP アドレスが完結していない場合は
           * 襲い攻め、襲い受け のみにする */
          arAkahukuP2P.illegalAddress = true;
          arAkahukuP2P.address = "";
          arAkahukuP2P.enableNoAccept = true;
        }
      }
    }
  },
    
  /**
   * P2P のアドレスに変換する
   *
   * @param  String uri
   *         対象の URI
   * @return String
   *         双助の URI
   */
  enP2P : function (uri) {
    if (!/^https?:/.test (uri)) {
      return uri;
    }
    
    return Akahuku.protocolHandler.enAkahukuURI ("p2p", uri);
  },
    
  /**
   * 必要なら P2P のアドレスに変換する
   *
   * @param  String uri
   *         対象の URI
   * @return String
   *         双助の URI
   */
  tryEnP2P : function (uri) {
    if (arAkahukuP2P.enable) {
      var uinfo = arAkahukuImageURL.parse (uri, true);
      if (uinfo
          && uinfo.isImage
          && !uinfo.isIp
          && uinfo.ext.match (/(jpg|png|gif)/)) {
        uri = arAkahukuP2P.enP2P (uri);
      }
    }
    return uri;
  },
    
  /**
   * P2P のアドレスから逆変換する
   *
   * @param  String uri
   *         P2P の URI
   * @return String
   *         元の URI
   */
  deP2P : function (uri) {
    if (Akahuku.protocolHandler.isAkahukuURI (uri)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (uri);
      if (p.type == "p2p") {
        return p.original;
      }
    }
        
    return uri;
  },
    
  /**
   * 画像要素を P2P のアドレスに変換する
   *
   * @param  HTMLElement context
   *         呼び出し元
   * @param  String contentLocation
   *         対象の URI
   * @return Boolean
   *         変換したか
   */
  enP2PContext : function (context, contentLocation) {
    var src = arAkahukuP2P.enP2P (contentLocation);
        
    /* ScrapBook には干渉しない */
    if ("id" in context
        && context.id == "sbCaptureBrowser") {
      return false;
    }
    
    if (!context.ownerDocument) {
      context.defaultView.setTimeout
      (function (node, src) {
        try {
          node.setAttribute ("src", src);
          node.setAttribute ("__akahuku_p2p", "1");
        }
        catch (e) {
        }
      }, 100, context, src);
    }
    else if (context.ownerDocument.defaultView != null) {
      context.ownerDocument.defaultView.setTimeout
      (function (node, src) {
        try {
          node.setAttribute ("src", src);
          node.setAttribute ("__akahuku_p2p", "1");
        }
        catch (e) {
        }
      }, 100, context, src);
    }
        
    return true;
  },
    
  /**
   * 画像要素を P2P のアドレスから元に戻す
   *
   * @param  HTMLElement context
   *         呼び出し元
   * @param  String contentLocation
   *         対象の URI
   */
  deP2PContext : function (context, contentLocation) {
    var src = arAkahukuP2P.deP2P (contentLocation);
        
    context.ownerDocument.defaultView.setTimeout
    (function (node, src) {
      node.setAttribute ("src", src);
      node.removeAttribute ("__akahuku_p2p");
    }, 100, context, src);
  },
    

  /**
   * キャッシュファイルを取得する
   *
   * @param  String uri
   *         対象の URI
   * @return nsIFile
   *         キャッシュファイル
   *         ない場合は null
   */
  getCacheFile : function (uri) {
    return arAkahukuP2P.service.utils.getCacheFileIfExists (uri);
  },
  
  /**
   * P2P のキャッシュを削除する
   */
  deleteCache : function (target) {
    var isP2P = false;
    var src = "";
        
    if (target
        && target.nodeName.toLowerCase ()
        == "img") {
      if ("src" in target) {
        if (target.src.match
            (/^akahuku(-safe)?:\/\/[^\/]+\/p2p\//)) {
          src = target.src;
          isP2P = true;
        }
      }
    }
        
    if (!isP2P) {
      return;
    }

    arAkahukuP2P.service.utils.deleteCache (src);
  },
    
  /**
   * 自分の IP アドレスが更新されたイベント
   *
   * @param  String address
   *         自分の IP アドレス
   */
  updateAddress : function (address) {
    arAkahukuP2P.address = address;
    arAkahukuConfig.setCharPref
    ("akahuku.p2p.address",
     address);
  },

  /**
   * P2P の状態を更新する
   */
  update : function () {
    Akahuku.debug.error('NotYetImplemented');
    /*
    arAkahukuIPC.sendAsyncCommand
      ("P2P/update", arguments);
    */
  },

  updatePanelForWindow : function (window) {
    if (typeof window.arAkahukuP2P_statusbarTimer !== "undefined"
        && window.arAkahukuP2P_statusbarTimer != null) {
      window.clearInterval (window.arAkahukuP2P_statusbarTimer);
      window.arAkahukuP2P_statusbarTimer = null;
    }

    var param = arAkahukuP2P.getStatusPanelParamForWindow (window);
    if (!param.panel) {
      return;
    }

    if (Akahuku.enableAll
        && arAkahukuP2P.enable
        && (param.statusPlace == "toolbarpanel"
            || arAkahukuP2P.enableStatusbar)) {
      param.panel.hidden = false;
    }
    else {
      param.panel.hidden = true;
    }

    var text = param.panel.getAttribute ("tooltiptext");
    if (text.indexOf (AkahukuVersion) == -1) {
      param.panel.setAttribute
        ("tooltiptext", text + " " + AkahukuVersion);
    }

    var node = param.panel.firstChild;
    while (node) {
      text = node.getAttribute ("tooltiptext");
      if (text.indexOf (AkahukuVersion) == -1) {
        node.setAttribute
          ("tooltiptext", text + " " + AkahukuVersion);
      }
      node = node.nextSibling;
    }

    if (Akahuku.enableAll && arAkahukuP2P.enable) {
      window.arAkahukuP2P_statusbarTimer
        = window.setInterval
        (function () {
          arAkahukuP2P.updateStatusbar (param);
        }, 1000);
    }
  },

  /**
   * Window別のパネル情報を取得する
   * @param  Window targetWindow
   *         対象の Chrome ウィンドウ
   */
  getStatusPanelParamForWindow : function (targetWindow) {
    var doc = targetWindow.document;
    var param = {
      panel : null,
      statusPlace : "toolbarpanel",
      nodeLabel : null,
      sep0Label : null,
      sendLabel : null,
      sep1Label : null,
      recvLabel : null,
      sep2Label : null,
      relayLabel : null,
      sep3Label : null,
      futabLabel : null,
      // properties for updateStatusbar
      sendLast : -1,
      recvLast : -1,
      relayLast : -1,
      futabaLast : -1,
      sendLastTime : -1,
      recvLastTime : -1,
      relayLastTime : -1,
      futabaLastTime : -1,
      redLabel : false,
      labelR : -1,
      labelG : -1,
      labelB : -1,
    };
    var l;

    var panel = doc.getElementById ("akahuku-toolbarbutton-p2pstatus");
    if (panel) {
      param.panel = panel;
      param.statusPlace = "toolbarpanel";
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-node");
      param.nodeLabel = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-sep0");
      param.sep0Label = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-send");
      param.sendLabel = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-sep1");
      param.sep1Label = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-recv");
      param.recvLabel = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-sep2");
      param.sep2Label = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-relay");
      param.relayLabel = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-sep3");
      param.sep3Label = l;
      l = doc.getElementById ("akahuku-toolbarpanel-p2p-futaba");
      param.futabaLabel = l;

      return param;
    }

    param.statusPlace = "statusbarpanel";
    panel = doc.getElementById ("akahuku-statusbarpanel-p2p");
    param.panel = panel;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-node");
    param.nodeLabel = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-sep0");
    param.sep0Label = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-send");
    param.sendLabel = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-sep1");
    param.sep1Label = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-recv");
    param.recvLabel = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-sep2");
    param.sep2Label = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-relay");
    param.relayLabel = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-sep3");
    param.sep3Label = l;
    l = doc.getElementById ("akahuku-statusbarpanel-p2p-futaba");
    param.futabaLabel = l;

    return param;
  },
    
  /**
   * ノードリストを保存する
   */
  saveNodeList : function () {
    var servant = arAkahukuP2P.service.servant;
    var nodeList = servant.getNodeList ();
    if (nodeList) {
      arAkahukuConfig.setCharPref
        ("akahuku.p2p.nodelist",
         nodeList);
    }
  },
    
  /**
   * P2P ステータスバーを更新する
   */
  updateStatusbar : function (param) {
    Akahuku.debug.error('NotYetImplemented');
    /*
    arAkahukuIPC.sendAsyncCommand
      ("P2P/updateStatusbar", arguments);
    */
  },
   
  /**
   * 対象のノード以下の P2P のノードを追加する
   * 画像への直接のリンクを書き換える
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   * @param  Boolean prefetchOnly
   *         プリフェッチのみ
   * @return Array
   *           [Number 発見した画像数, Number 保存済みの画像数,
   *            Number キューにあった数, Number キューに突っ込んだ個数]
   */
  applyP2P : function (targetDocument, targetNode, prefetchOnly) {
    var servant = arAkahukuP2P.service.servant;
    if (!servant) {
      Akahuku.debug.warn ("no p2p servant available!")
      return [-1, -1, -1, -1];
    }
        
    var nodes, i;
    nodes = targetNode.getElementsByTagName ("a");
        
    var now = (new Date ()).getTime ();
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var boardList = "";
    if (info.isFutaba) {
      boardList = info.server + "/" + info.dir + ";";
    }
        
    if (prefetchOnly
        || arAkahukuP2P.enablePrefetchSrc) {
      for (var p in arAkahukuP2P.prefetchedList) {
        var t = arAkahukuP2P.prefetchedList [p];
        if (now > t + 10 * 60 * 1000) {
          /* 10 分間立ったらリストから削除する */
          delete arAkahukuP2P.prefetchedList [p];
        }
      }
    }
        
    var found = 0, saved = 0, waiting = 0, pushed = 0;
        
    for (var i = 0; i < nodes.length; i ++) {
      var isSrcLink = false;
      var leafName = "";
            
      var uinfo = arAkahukuImageURL.parse (nodes [i].href, false, true);
      if (uinfo && uinfo.isImage && !uinfo.isIp) {
        /* カタログ、サムネ、元画像の場合 */
        var href2 = arAkahukuP2P.enP2P (nodes [i].href);
        if (nodes [i].href != href2) {
          nodes [i].href = href2;
          nodes [i].setAttribute ("__akahuku_p2p", "1");
        }
        if (uinfo.type == "src") {
          isSrcLink = true;
          leafName = uinfo.leafNameExt;
        }
      }
      if (uinfo && uinfo.isRedirect) {
        /* リダイレクトの場合 */
        var dummy = arAkahukuDOM.getInnerText (nodes [i]);
        if (dummy.match (/^[0-9]+\.(jpg|png|gif)/)) {
          isSrcLink = true;
          leafName = dummy;
        }
      }
            
      if ((prefetchOnly
           || arAkahukuP2P.enablePrefetchSrc)
          && isSrcLink) {
        var path;
        path = "/" + info.server + "/" + info.dir + "/src/" + leafName;
                    
        found ++;
                
        var targetFileName
          = AkahukuFileUtil.Path
          .join (arAkahukuP2P.cacheBase,
                 uinfo.server, uinfo.dir, "src", leafName);
                
        var targetFile = arAkahukuFile.initFile (targetFileName);
        if (targetFile.exists ()) {
          saved ++;
          continue;
        }
                
        if (path in arAkahukuP2P.prefetchedList) {
          /* リストに入っている場合は放置 */
          if (prefetchOnly) {
            var t = arAkahukuP2P.prefetchedList [path];
            if (now > t + 30 * 1000) {
              /* プリフェッチのみの場合には 30 秒で解除 */
              delete arAkahukuP2P.prefetchedList [path];
            }
            else {
              waiting ++;
              continue;
            }
          }
          else {
            waiting ++;
            continue;
          }
        }
                
        arAkahukuP2P.prefetchedList [path] = now;
        arAkahukuP2P.prefetchList.push ({
          path: path,
          ownerDocument: targetDocument,
        });
        pushed ++;
      }
            
      if (!prefetchOnly) {
        if (nodes [i].href.match (/^mailto:/)) {
          var mail = nodes [i].href.replace (/^mailto:/, "");
                
          if (mail.match (/(=AKA[^=]+=)/)) {
            servant.addNode (RegExp.$1,
                             false, parseInt (now / 1000),
                             boardList);
          }
        }
      }
    }
        
    if (arAkahukuP2P.prefetchList.length > 0
        && arAkahukuP2P.prefetchTimer == null) {
      arAkahukuP2P.prefetchTimer
      = arAkahukuUtil.setTimeout (function () {
        arAkahukuP2P.prefetchNotify ();
      }, 500);
    }
        
    return [found, saved, waiting, pushed];
  },
    
  /**
   * プリフェッチする
   */
  prefetchNotify : function () {
    if (arAkahukuP2P.prefetchList.length > 0) {
      var target = arAkahukuP2P.prefetchList.shift ();
      // 既に閉じたドキュメントからのプリフェッチ要求はスキップ
      while (target &&
          arAkahukuCompat.isDeadWrapper (target.ownerDocument)) {
        target = arAkahukuP2P.prefetchList.shift ();
      }
      if (!target) { // no target left
        arAkahukuP2P.prefetchTimer = null;
        return;
      }
      var path = target.path;
      var servant = arAkahukuP2P.service.servant;
      servant.prefetchFile (path, null);
    }
        
    if (arAkahukuP2P.prefetchList.length > 0) {
      arAkahukuP2P.prefetchTimer
      = arAkahukuUtil.setTimeout (function () {
        arAkahukuP2P.prefetchNotify ();
      }, 500);
    }
    else {
      arAkahukuP2P.prefetchTimer = null;
    }
  },
    
  /**
   * 板用の画像のアドレスを返す
   *
   * @param  String original
   *         板のアドレス
   * @param  Number index
   *         添字
   * @return String
   *         画像のアドレス
   */
  getImageURL : function (original, index) {
    var board = "";
        
    var uinfo = arAkahukuImageURL.parse (original);
    if (!uinfo) {
      return "";
    }
        
    board = uinfo.board;
        
    var n = 0;
    var images = new Array ();
    var ns = new Array ();
    n += 1; ns.push (n);
    images.push ("chrome://akahuku/content/images/p2p_aka.png");
    n += 10; ns.push (n);
    images.push ("chrome://akahuku/content/images/p2p_age.png");
    n += 10; ns.push (n);
    images.push ("chrome://akahuku/content/images/p2p_sage.png");
    
    if (board == "img_b") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_img_b.png");
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_img_b_2.png");
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_b_2.png");
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_b_3.png");
    }
    else if (board == "dat_b") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_b.png");
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_b_2.png");
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_b_3.png");
    }
    else if (board == "cgi_b") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_cgi_b.png");
      n += 10; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_img_b.png");
    }
    else if (board == "may_b"
             || board == "may_b") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_may_b.png");
    }
    else if (board == "may_id") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_may_id.png");
    }
    else if (board == "dat_16") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_16.png");
    }
    else if (board == "dat_20") {
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_20.png");
      n += 30; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_dat_20_2.png");
    }
    else if (board == "jun_30") {
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_jun_30.png");
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_jun_30_2.png");
      n += 20; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_jun_30_3.png");
    }
    else if (board == "nijibox_tubu") {
      n = 0;
      images = new Array ();
      ns = new Array ();
      n += 1; ns.push (n);
      images.push ("chrome://akahuku/content/images/p2p_tubu.png");
    }
    var n_index = parseInt (index * n / 10000);
    var ind = 0;
    for (var j = 0; j < ns.length; j ++) {
      if (n_index < ns [j]) {
        ind = j;
        break;
      }
    }
        
    return images [ind];
  },
    
  /**
   * 画像のロード待ち表示
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String targetURI
   *         対象の画像の URI
   */
  addWaiting : function (targetDocument, targetURI, index) {
    var status = targetDocument.getElementById ("akahuku_p2p_status");
    if (status) {
      var nodes = status.getElementsByTagName ("img");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].complete) {
          nodes [i].src = nodes [i].src;
        }
      }
            
      return;
    }
        
    status = targetDocument.createElement ("div");
    status.id = "akahuku_p2p_status";
    status.style.position = "absolute";
    status.style.top = "0px";
    status.style.left = "0px";
    status.style.backgroundColor = "#ffffff";
        
    var node = targetDocument.createElement ("img");
    node.src
    = Akahuku.protocolHandler.enAkahukuURI
    ("preview", "chrome://akahuku/content/images/p2p_title.png");
    node.style.marginLeft = "8px";
    node.style.marginTop = "8px";
    status.appendChild (node);

    node = targetDocument.createElement ("br");
    status.appendChild (node);
        
    node = targetDocument.createElement ("img");
    var board = "";
    var original = Akahuku.protocolHandler.deAkahukuURI (targetURI);
        
    var url = arAkahukuP2P.getImageURL (original, index);
        
    node.src = Akahuku.protocolHandler.enAkahukuURI
    ("preview", url);
    node.style.marginLeft = "160px";
    status.appendChild (node);
        
    targetDocument.body.appendChild (status);
  },
    
  /**
   * 画像のロード完了イベント
   *
   * @param  HTMLElement image
   *         対象の IMG 要素
   * @param  Boolean error
   *         エラーになったか
   */
  onImageLoad : function (image, error) {
    var targetDocument = image.ownerDocument;
    var status = targetDocument.getElementById ("akahuku_p2p_status");
    if (error) {
      var f = function () {
        if (image.naturalWidth != 0
            && image.naturalHeight != 0) {
          return;
        }
                        
        var node = targetDocument.getElementById ("akahuku_p2p_error");
        if (!node) {
          node = targetDocument.createElement ("div");
          node.id = "akahuku_p2p_error";
          arAkahukuDOM.setText
            (node, "\u753B\u50CF\u304C\u306A\u3044\u3088");
          image.parentNode.appendChild (node);
        }
      };
            
      targetDocument.defaultView.setTimeout (f, 1000);
    }
        
    if (status) {
      status.parentNode.removeChild (status);
    }
  },
    
  /**
   * 画像のロードを監視する
   *
   * @param  XULElement context
   *         対象のブラウザ
   * @param  String originalURI
   *         ロード前の URI
   * @param  String targetURI
   *         対象の画像の URI
   * @param  Number limit
   *         残り時間
   * @param  Window targetWindow
   *         対象の Chrome ウィンドウ
   * @param  Number index
   *         ランダムの番号
   */
  checkImage : function (context, originalURI, targetURI,
                         limit, targetWindow, index) {
    try {
      if (index == -1) {
        index = parseInt (Math.random () * 10000);
      }
            
      var targetDocument = context.contentDocument;
            
      if (targetDocument.location.href == targetURI) {
        var nodes = targetDocument.getElementsByTagName ("img");
        if (nodes.length > 0) {
          var image = nodes [0];
          if (image.complete && image.naturalWidth == 0) {
            /* ロード失敗 */
            arAkahukuP2P.onImageLoad (image, true);
          }
          else if (!image.complete) {
            /* ロード中 */
                        
            try {
              arAkahukuP2P.addWaiting
                (targetDocument, targetURI, index);
            }
            catch (e) {
            }
                        
            image.addEventListener
              ("error",
               function () {
                /* ロード失敗 */
                arAkahukuP2P.onImageLoad (image, true);
              }, false);
            image.addEventListener
              ("load",
               function () {
                /* ロード成功 */
                arAkahukuP2P.onImageLoad (image, false);
              }, false);
          }
        }
        else if (limit > 0) {
          targetWindow.setTimeout
            (arAkahukuP2P.checkImage,
             1000, context, originalURI, targetURI,
             limit - 1, targetWindow, index);
        }
      }
      else if (targetDocument.location.href == originalURI) {
        if (targetDocument.location.href == "about:blank"
            || targetDocument.location.href
            .match (/\/(red|d)\/[0-9]+\.[a-z]+/)
            || targetDocument.location.href
            .match (/^http:\/\/www\.nijibox5\.com\/futabafiles\/tubu\/src\/[a-z0-9]+\.[a-z]+\.html$/)) {
          try {
            arAkahukuP2P.addWaiting (targetDocument, targetURI, index);
          }
          catch (e) {
          }
                    
          targetWindow.setTimeout
          (arAkahukuP2P.checkImage,
           100, context, originalURI, targetURI,
           limit - 1, targetWindow, index);
        }
        else if (limit > 0) {
          targetWindow.setTimeout
          (arAkahukuP2P.checkImage,
           500, context, originalURI, targetURI,
           limit - 1, targetWindow, index);
        }
      }
    }
    catch (e) {
    }
  },
    
  /**
   * ノードを収集する、画像への直リンを変更する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound) {
      return;
    }
        
    if (arAkahukuP2P.enable
        && !info.isMht) {
      arAkahukuP2P.applyP2P (targetDocument,
                             targetDocument,
                             false);
    }
  }
};
