/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

const nsISupports           = Components.interfaces.nsISupports;

const nsICategoryManager    = Components.interfaces.nsICategoryManager;
const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsIFactory            = Components.interfaces.nsIFactory;
const nsIModule             = Components.interfaces.nsIModule;
const nsIContentPolicy      = Components.interfaces.nsIContentPolicy;

const nsIInterfaceRequestor = Components.interfaces.nsIInterfaceRequestor;
const nsIObserverService    = Components.interfaces.nsIObserverService;
const nsIPrefBranch         = Components.interfaces.nsIPrefBranch;
const nsIPrefBranch2        = Components.interfaces.nsIPrefBranch2;
const nsIIOService          = Components.interfaces.nsIIOService;
const nsIURI                = Components.interfaces.nsIURI;
const nsIWebNavigation      = Components.interfaces.nsIWebNavigation;
const nsIWindowMediator     = Components.interfaces.nsIWindowMediator;

/**
 * 本体
 * 広告のブロック、リロードのフックを行う
 *   Inherits From: nsIContentPolicy, nsIObserver
 */
function arAkahukuContentPolicy () {
  this._init ();
}
arAkahukuContentPolicy.prototype = {
  /* nsIContentPolicy の定数 */
  TYPE_IMAGE       : nsIContentPolicy.TYPE_IMAGE,
  TYPE_OBJECT      : nsIContentPolicy.TYPE_OBJECT,
  TYPE_DOCUMENT    : nsIContentPolicy.TYPE_DOCUMENT,
  TYPE_SUBDOCUMENT : nsIContentPolicy.TYPE_SUBDOCUMENT,
  ACCEPT           : nsIContentPolicy.ACCEPT,
  REJECT_SERVER    : nsIContentPolicy.REJECT_SERVER,
  REJECT_OTHER     : nsIContentPolicy.REJECT_OTHER,
    
  /* Akahuku 側の設定 */
  _prefAllName               : "akahuku.all",
  _prefCheckName             : "akahuku.savepref",
    
  _prefReloadName            : "akahuku.reload",
  _prefReloadHookName        : "akahuku.reload.hook",
  _prefReloadHookSyncName    : "akahuku.reload.hook.sync",
    
  _prefCatalogReloadName     : "akahuku.catalog.reload",
  _prefCatalogReloadHookName : "akahuku.catalog.reload.hook",
    
  _prefDelBannerName         : "akahuku.delbanner",
  _prefDelBannerImageName    : "akahuku.delbanner.image",
  _prefDelBannerFlashName    : "akahuku.delbanner.flash",
    
  _prefDelBannerSitesImageName   : "akahuku.delbanner.sites.image",
  _prefDelBannerSitesObjectName  : "akahuku.delbanner.sites.object",
  _prefDelBannerSitesIframeName  : "akahuku.delbanner.sites.iframe",
    
  _prefP2PName               : "akahuku.p2p",
    
  _prefP2PTatelogName        : "akahuku.p2p.tatelog",

  _prefBoardExternalName         : "akahuku.board_external",
  _prefBoardExternalPatternsName : "akahuku.board_external.patterns",
  _prefBoardExternalPatterns2Name : "akahuku.board_external.patterns2",
  _prefBoardSelectName           : "akahuku.board_select",
  _prefBoardSelectExListName     : "akahuku.board_select.ex_list",
    
  _pref : null,              /* nsIPrefBranch2/nsIPrefBranch  pref サービス */
    
  _enableAll : false,        /* Boolean  全体 */
    
  _enableBlockImage : false, /* Boolean  画像のブロック有効かどうか */
  _enableBlockFlash : false, /* Boolean  Flash のブロック有効かどうか */
  _blockList : null,         /* Object  ブロックするホスト情報
                              *   <Long 種類, [String ホスト名, ...]> */
    
  _enableReloadHook        : false, /* Boolean  レス送信モードのリロードを
                                     *   フックするかどうか */
  _enableReloadHookSync    : false, /* Boolean  レス送信モードのリロードの
                                     *   フックで同期するかどうか */
  _enableCatalogReloadHook : false, /* Boolean  カタログモードのリロードを
                                     *   フックするかどうか */

  _enableP2P : false, /* Boolean  P2P モードかどうか */
  _enableP2PTatelog : false, /* Boolean  タテログのふつーモードで
                              *   P2P を使うかどうか */
    
  _enableBoardExternal : false,      /* Boolean  外部の板 */
  _boardExternalList : new Array (), /* Object  外部の板のリスト
                                      *   [[String 板名, Long フラグ], ...] */
  _enableBoardSelect : false,        /* Boolean  動作する板を指定するか */
  _boardSelectExList : new Object (),/* Object  動作しない板
                                      *   <String 板名, Boolean ダミー> */
    
  _old : false,             /* Boolean  旧バージョンかどうか */
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIContentPolicy
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIContentPolicy)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 初期化処理
   */
  _init : function () {
    /* 旧バージョンのチェック */
    this._old = "OTHER" in Components.interfaces.nsIContentPolicy;
    if (this._old) {
      /* 旧バージョンの場合、定数を取得し直す */
      this.TYPE_IMAGE = nsIContentPolicy.IMAGE;
      this.TYPE_OBJECT = nsIContentPolicy.OBJECT;
      this.TYPE_DOCUMENT = nsIContentPolicy.DOCUMENT;
      this.TYPE_SUBDOCUMENT = nsIContentPolicy.SUBDOCUMENT;
      this.ACCEPT = true;
      this.REJECT_SERVER = false;
      this.REJECT_OTHER = false;
    }
        
    /* pref サービスの取得 */
    if (nsIPrefBranch2 != undefined) {
      this._pref
      = Components.classes ["@mozilla.org/preferences-service;1"]
      .getService (nsIPrefBranch2);
    }
    else {
      this._pref
      = Components.classes ["@mozilla.org/preferences-service;1"]
      .getService (nsIPrefBranch);
    }

    if (typeof (this._pref.addObserver) === "function") {
      /* 新バージョンの場合、オブザーバを登録する */
      this._observerService
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (nsIObserverService);
            
      this._observerService.addObserver (this, "xpcom-shutdown", false);
            
      this._pref.addObserver (this._prefAllName, this, false);
      this._pref.addObserver (this._prefCheckName, this, false);
      this._pref.addObserver (this._prefP2PName, this, false);
      this._pref.addObserver (this._prefDelBannerSitesImageName, this, false);
      this._pref.addObserver (this._prefDelBannerSitesObjectName, this, false);
      this._pref.addObserver (this._prefDelBannerSitesIframeName, this, false);
      this._pref.addObserver (this._prefBoardExternalName , this, false);
      this._pref.addObserver (this._prefBoardExternalPatternsName , this, false);
      this._pref.addObserver (this._prefBoardExternalPatterns2Name , this, false);
      this._pref.addObserver (this._prefBoardSelectName , this, false);
      this._pref.addObserver (this._prefBoardSelectExListName , this, false);
    }

    this._ios
    = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (nsIIOService);
        
    // 必要なサブスクリプトのロード
    var loader
    = Components.classes ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Components.interfaces.mozIJSSubScriptLoader);
    try {
      if ("import" in Components.utils) {
        Components.utils.import("resource://akahuku/json.jsm");
      }
      else {
        loader.loadSubScript
          ("chrome://akahuku/content/mod/arAkahukuJSON.js");
      }
      if (typeof arAkahukuConfig === "undefined") {
        loader.loadSubScript
          ("chrome://akahuku/content/mod/arAkahukuConfig.js");
        // minimum initialization for arAkahukuConfig.initPref ()
        arAkahukuConfig.prefBranch = this._pref;
      }
      if (typeof arAkahukuBoard === "undefined") {
        loader.loadSubScript
          ("chrome://akahuku/content/mod/arAkahukuBoardLoader.js");
      }
    }
    catch (e) {
      Components.utils.reportError (e);
    }

    /* 設定を取得する */
    this._updateEnabled ();
    this._updateBlockList ();
  },
    
  /**
   * 設定の変更、および終了のイベント
   *   nsIObserver.observe
   *
   * @param  nsISupports subject
   *         不明
   * @param  String topic
   *         通知の対象
   * @param  String data
   *         通知の内容
   */
  observe : function (subject, topic, data) {
    if (topic == "xpcom-shutdown") {
      /* 終了の場合 */
            
      /* オブザーバの登録を削除する */
      this._observerService.removeObserver (this, "xpcom-shutdown");
      this._pref.removeObserver (this._prefAllName, this);
      this._pref.removeObserver (this._prefCheckName, this);
      this._pref.removeObserver (this._prefP2PName, this);
      this._pref.removeObserver (this._prefDelBannerSitesImageName, this, false);
      this._pref.removeObserver (this._prefDelBannerSitesObjectName, this, false);
      this._pref.removeObserver (this._prefDelBannerSitesIframeName, this, false);
      this._pref.removeObserver (this._prefBoardExternalName , this, false);
      this._pref.removeObserver (this._prefBoardExternalPatternsName , this, false);
      this._pref.removeObserver (this._prefBoardExternalPatterns2Name , this, false);
      this._pref.removeObserver (this._prefBoardSelectName , this, false);
      this._pref.removeObserver (this._prefBoardSelectExListName , this, false);
    }
    else if (topic == "nsPref:changed") {
      /* 設定の変更の場合 */
            
      /* 設定を取得する */
      this._updateEnabled ();
      this._updateBlockList ();
    }
  },
    
  /**
   * 有効かどうかの設定を取得する
   */
  _updateEnabled : function () {
    var enableAll = false;
    var enableDelBanner = false;
    var enableDelBannerImage = false;
    var enableDelBannerFlash = false;
        
    var enableReload = false;
    var enableReloadHook = false;
    var enableReloadHookSync = false;
        
    var enableCatalogReload = false;
    var enableCatalogReloadHook = false;
        
    var enableP2P = false;
    var enableP2PTatelog = false;
        
    if (this._pref.prefHasUserValue (this._prefAllName)) {
      enableAll
        = this._pref.getBoolPref (this._prefAllName);
    }
    this._enableAll = enableAll;
    if (this._pref.prefHasUserValue (this._prefDelBannerName)) {
      enableDelBanner
        = this._pref.getBoolPref (this._prefDelBannerName);
    }
    if (this._pref.prefHasUserValue (this._prefDelBannerImageName)) {
      enableDelBannerImage
      = this._pref.getBoolPref (this._prefDelBannerImageName);
    }
    if (this._pref.prefHasUserValue (this._prefDelBannerFlashName)) {
      enableDelBannerFlash
      = this._pref.getBoolPref (this._prefDelBannerFlashName);
    }
    this._enableBlockImage
    = enableAll && enableDelBanner && enableDelBannerImage;
    this._enableBlockFlash
    = enableAll && enableDelBanner && enableDelBannerFlash;
        
    if (this._pref.prefHasUserValue (this._prefReloadName)) {
      enableReload
        = this._pref.getBoolPref (this._prefReloadName);
    }
    if (this._pref.prefHasUserValue (this._prefReloadHookName)) {
      enableReloadHook
      = this._pref.getBoolPref (this._prefReloadHookName);
    }
    this._enableReloadHook = enableAll && enableReload && enableReloadHook;
        
    if (this._pref.prefHasUserValue (this._prefReloadHookSyncName)) {
      enableReloadHookSync
        = this._pref.getBoolPref (this._prefReloadHookSyncName);
    }
    this._enableReloadHookSync
    = this._enableReloadHook && enableReloadHookSync;
        
    if (this._pref.prefHasUserValue (this._prefCatalogReloadName)) {
      enableCatalogReload
        = this._pref.getBoolPref (this._prefCatalogReloadName);
    }
    if (this._pref.prefHasUserValue (this._prefCatalogReloadHookName)) {
      enableCatalogReloadHook
      = this._pref.getBoolPref (this._prefCatalogReloadHookName);
    }
    this._enableCatalogReloadHook
    = enableAll && enableCatalogReload && enableCatalogReloadHook;
        
    if (this._pref.prefHasUserValue (this._prefP2PName)) {
      enableP2P
        = this._pref.getBoolPref (this._prefP2PName);
    }

    if (this._pref.prefHasUserValue (this._prefP2PTatelogName)) {
      enableP2PTatelog
      = this._pref.getBoolPref (this._prefP2PTatelogName);
    }
        
    this._enableP2P
    = enableAll && enableP2P;

    this._enableP2PTatelog
    = enableAll && enableP2P && enableP2PTatelog;
        
    if (arAkahukuBoard) {
      arAkahukuBoard.getConfig ();
      this._enableBoardExternal
      = enableAll && arAkahukuBoard.enableExternal;
      if (this._enableBoardExternal) {
        this._boardExternalList = arAkahukuBoard.externalList;
      }

      this._enableBoardSelect
      = enableAll && arAkahukuBoard.enableSelect;
      if (this._enableBoardSelect) {
        this._boardSelectExList = arAkahukuBoard.selectExList;
      }
    }
  },
    
  /**
   * unescape の代替品
   * 旧バージョンの場合このスコープでは未定義なので使用する
   *
   * @param  String text
   *         エスケープ解除する文字列
   * @return String
   *         エスケープ解除した文字列
   */
  _unescape : function (text) {
    text
    = text.replace (/%([0-9A-Za-z][0-9A-Za-z])/g,
                    function (match, part1) {
                      return String
                      .fromCharCode (parseInt ("0x" + part1));
                    });
        
    return text;
  },
    
  /**
   * ブロックするホスト情報を設定する
   */
  _updateBlockList : function () {
    this._blockList = new Object ();
        
    this._blockList [this.TYPE_IMAGE] = new Array ();
    this._blockList [this.TYPE_SUBDOCUMENT] = new Array ();
    this._blockList [this.TYPE_OBJECT] = new Array ();
        
    this._blockList [this.TYPE_IMAGE].includesFutaba = false;
    this._blockList [this.TYPE_SUBDOCUMENT].includesFutaba = false;
    this._blockList [this.TYPE_OBJECT].includesFutaba = false;
        
    var tmp = "";
    var list = this._blockList;
    var type = this.TYPE_IMAGE;
    var ios = this._ios;
    /* String.replace 用関数 (this に注意) */
    function addMatchedToList (matched) {
      try {
        var obj = {
          count: 0,
          hostPattern : null,
          URI : null,
          isURI : /^[a-z]*:\/\//.test (matched),
        };
        if (obj.isURI) {
          obj.URI = ios.newURI (matched, "UTF-8", null);
          if (obj.URI && /\.2chan\.net$/i.test(obj.URI.host) ) {
            list [type].includesFutaba = true;
          }
        }
        else {
          /* トップレベルや .2chan.net はドメインブロックしない */
          if (! /^[^.]*$/.test (matched)
              || !/^\.?(2chan\.)?net$/i.test (matched) ) {
            var pat = matched.replace
              (/[-\[\]\/\{\}\(\)\*\+\?\.\^\$\|\\]/g, "\\$&");
            obj.hostPattern = new RegExp (pat+"$","i");
          }
          else {
          }
        }
        if (obj.hostPattern || obj.URI) {
          list [type].push (obj);
        }
      }
      catch (e) {
        Components.utils.reportError (e);
      }
      return matched;
    }
    if (this._enableBlockImage) {
      /* 画像 */
      tmp = "";
      if (this._pref.prefHasUserValue
          (this._prefDelBannerSitesImageName)) {
        tmp
          = this._pref.getCharPref
          (this._prefDelBannerSitesImageName);
        tmp = unescape (tmp);
      }
      type = this.TYPE_IMAGE;
      tmp.replace (/[^\s,;]+/g, addMatchedToList);
      /* IFRAME */
      tmp = "";
      if (this._pref.prefHasUserValue
          (this._prefDelBannerSitesIframeName)) {
        tmp
          = this._pref.getCharPref
          (this._prefDelBannerSitesIframeName);
        tmp = unescape (tmp);
      }
      type = this.TYPE_SUBDOCUMENT;
      tmp.replace (/[^\s,;]+/g, addMatchedToList);
    }
    if (this._enableBlockFlash) {
      /* FLASH などの Object */
      tmp = "";
      if (this._pref.prefHasUserValue
          (this._prefDelBannerSitesObjectName)) {
        tmp
          = this._pref.getCharPref
          (this._prefDelBannerSitesObjectName);
        tmp = unescape (tmp);
      }
      type = this.TYPE_OBJECT;
      tmp.replace (/[^\s,;]+/g, addMatchedToList);
    }
  },

  /**
   * 動作しない板かどうかを判定
   */
  _isExcludeBoard : function (uri) {
    var server, dir, name;
    if (!this._enableBoardSelect) {
      return false;
    }
    if (uri.host.match (/([^\.\/]+)\.2chan\.net/)) {
      server = RegExp.$1;
    }
    if (uri.path.match (/^\/(?:(apr|jan|feb|tmp|up|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\//)) {
      dir = (RegExp.$1 ? RegExp.$1 + "-" + RegExp.$2 : RegExp.$2);
    }
    name = server + ":" + dir;
    if (name in this._boardSelectExList) {
      return true;
    }
    return false;
  },

  /** 
   * ブラウザウィンドウを取得
   */
  _getBrowserWindow : function ()
  {
    var wm
      = Components.classes ["@mozilla.org/appshell/window-mediator;1"]
      .getService (nsIWindowMediator);
    return wm.getMostRecentWindow ("navigator:browser");
  },

  /** 
   * context に対するブラウザウィンドウを取得
   */
  _getContextBrowserWindow : function (context)
  {
    if (context instanceof Components.interfaces.nsIDOMXULElement) {
      return context.ownerDocument.defaultView.top;
    }
    else if (context instanceof Components.interfaces.nsIDOMNode) {
      var contextDocument = context;
      if (context.ownerDocument) {
        contextDocument = context.ownerDocument;
      }
      if (contextDocument.defaultView) {
        contextDocument = contextDocument.defaultView.top.document;
      }
      var entries
        = Components.classes
        ["@mozilla.org/appshell/window-mediator;1"]
        .getService (nsIWindowMediator)
        .getEnumerator ("navigator:browser");
      while (entries.hasMoreElements ()) {
        var targetWindow = entries.getNext ();
        var tabbrowser
          = targetWindow.document.getElementById ("content");
        if (tabbrowser.getBrowserForDocument (contextDocument)) {
          return targetWindow;
        }
      }
    }
    return null;
  },
    
  /**
   * ロードするかどうかのチェック
   *   nsIContentPolicy.shouldLoad
   *
   * @param  Number contentType
   *         コンテントの種類
   * @param  nsIURI contentLocation
   *         対象の URI
   * @param  nsIURI requestOrigin
   *         呼び出し元の URI
   * @param  Browser/HTMLElement context
   *         ロード先
   * @param  String mimeTypeGuess
   *         予想される MIME-Type
   * @param  nsISupports extra
   *         不明
   *
   * 旧バージョンでは
   * @param  Number contentType
   *         コンテントの種類
   * @param  nsIURI contentLocation
   *         対象の URI
   * @param  HTMLElement requestOrigin
   *         ロード先
   * @param  Window context
   *         対象のウィンドウ
   */
  shouldLoad : function (contentType, contentLocation,
                         requestOrigin, context,
                         mimeTypeGuess, extra) {
  try {
    if (!this._enableP2P) {
      if (contentLocation.scheme == "akahuku") {
        if (contentLocation.spec.match
            (/^akahuku:\/\/[^\/]*\/p2p\//)) {
          /* 全体が無効の場合には P2P なアドレスを元に戻す */
          var targetWindow = this._getBrowserWindow ();
          if (targetWindow) {
            targetWindow.arAkahukuP2P.deP2PContext
              (context,
               contentLocation.spec);
          }
                    
          return this.REJECT_OTHER;
        }
      }
    }
        
    if (contentLocation.scheme == "akahuku"
        && context.nodeName
        && context.nodeName.match (/(xul:)?browser/)
        && contentLocation.spec.match
        (/^akahuku:\/\/[^\/]*\/p2p\//)) {
      var targetWindow = this._getBrowserWindow ();
      if (targetWindow) {
        targetWindow.arAkahukuP2P.checkImage
          (context,
           context.contentDocument.location.href,
           contentLocation.spec,
           20, targetWindow, -1);
      }
            
      return this.ACCEPT;
    }

    /* http(s) 以外でも cache の処理等があるのでまだ許可しない
    if (contentLocation.scheme.substring (0, 4) != "http") {
      return this.ACCEPT;
    }
    */
        
    var swapped = false;
        
    if (this._enableAll) {
      /* 全体が有効の場合 */
            
      if (this._old) {
        /* 旧バージョンの場合引数が違うので入れ替える */
        swapped = true;
                
        var targetWindow = context;
        context = requestOrigin;
                
        requestOrigin
          = Components.classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (nsIURI);
        if (targetWindow.document.location) {
          try {
            requestOrigin.spec
              = targetWindow.document.location.href;
          }
          catch (e) {
            /* 古い Mozilla Suite の場合、許可する */
            return this.ACCEPT;
          }
        }
        else {
          /* 古い Mozilla Suite でのアンカーによる移動の場合、許可する */
          return this.ACCEPT;
        }
      }
    }
        
    if (this._enableP2P
        // http 以外もありえるため二重処理を避けて
        && contentLocation.scheme.substring (0, 4) == "http") {
      /* P2P モードが有効の場合 */

      if (this._old && !swapped) {
        /* 旧バージョンの場合引数が違うので入れ替える */
        swapped = true;
                
        var targetWindow = context;
        context = requestOrigin;
                
        requestOrigin
        = Components.classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (nsIURI);
        if (targetWindow.document.location) {
          try {
            requestOrigin.spec
              = targetWindow.document.location.href;
          }
          catch (e) {
            /* 古い Mozilla Suite の場合、許可する */
            return this.ACCEPT;
          }
        }
        else {
          /* 古い Mozilla Suite でのアンカーによる移動の場合、許可する */
          return this.ACCEPT;
        }
      }
            
      if (contentLocation.host.indexOf ("2chan.net") != -1) {
        /* 2chan.net 内の画像の場合 */
        if (!this._enableP2PTatelog
            && requestOrigin.spec.match
            (/catalog\/dat\/view.php?(.+)$/)) {
          var q = RegExp.$1;
          if (!q.match (/mode=cat2?/)) {
            /* タテログふつーモードでは動かさない */
            return this.ACCEPT;
          }
        }

        if (contentLocation.spec.match
            (/^http:\/\/dec\.2chan\.net\/up\/src\//)) {
          /* あぷでは動かさない */
          return this.ACCEPT;
        }
                
        if (contentLocation.spec.match
            (/\/(cat|thumb|src)\/([A-Za-z0-9]+)\.(jpg|png|gif)$/)) {
          /* カタログ、サムネ、元画像の場合 */
          var ext = RegExp.$3;
                    
          if (requestOrigin.scheme == "unmht") {
            return this.ACCEPT;
          }
                    
          var entries
          = Components.classes
          ["@mozilla.org/appshell/window-mediator;1"]
          .getService (nsIWindowMediator)
          .getEnumerator ("navigator:browser");
                        
          var reject = false;
                    
          if (entries.hasMoreElements ()) {
            var targetWindow = entries.getNext ();
            reject
              = targetWindow.arAkahukuP2P.enP2PContext
              (context,
               contentLocation.spec);
          }
                    
          if (reject) {
            return this.REJECT_OTHER;
          }
          else {
            return this.ACCEPT;
          }
        }
      }
      if (contentLocation.host.indexOf ("www.nijibox5.com") != -1) {
        if (contentLocation.spec.match
            (/\/tubu\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)$/)) {
          /* 塩粒の場合 */
          var ext = RegExp.$3;
                    
          var entries
          = Components.classes
          ["@mozilla.org/appshell/window-mediator;1"]
          .getService (nsIWindowMediator)
          .getEnumerator ("navigator:browser");
                        
          var reject = false;

          if (entries.hasMoreElements ()) {
            var targetWindow = entries.getNext ();
            reject
              = targetWindow.arAkahukuP2P.enP2PContext
              (context,
               contentLocation.spec);
          }
                        
          if (reject) {
            return this.REJECT_OTHER;
          }
          else {
            return this.ACCEPT;
          }
        }
      }
    }
        
    /* キャッシュページからの画像読込 */
    if (this._enableAll // eusures !this._old || swapped
        && contentType == this.TYPE_IMAGE
        && requestOrigin
        && requestOrigin.schemeIs ("akahuku")
        && /^\/(file)?cache\//.test (requestOrigin.path)) {
      if (!contentLocation.schemeIs ("akahuku")) {
        // 通常の画像読込を禁止し、必要なら cache に差し替える
        var contextWindow = this._getContextBrowserWindow (context);
        if (contextWindow) {
          var decodedOriginSpec
            = contextWindow.Akahuku.protocolHandler
            .deAkahukuURI (requestOrigin.spec);
          var policy
            = Components.classes
            ["@mozilla.org/layout/content-policy;1"]
            .getService (nsIContentPolicy);
          var shouldLoad
            = policy.shouldLoad
            (contentType, contentLocation,
             this._ios.newURI (decodedOriginSpec, "UTF-8", null),
             context, mimeTypeGuess, extra);
          if (shouldLoad != this.ACCEPT) {
            return shouldLoad;
          }
          if (context instanceof Components.interfaces.nsIDOMElement) {
            contextWindow.Akahuku.queueContextTask
              (contextWindow.Akahuku.Cache,
               "enCacheURIContext", context, contentLocation.spec);
          }
        }
        return this.REJECT_OTHER;
      }
      else {
        // 差し替えられた akahuku:///cache/ 画像は
        // 元URLに戻した上で残りの判定へ
        var targetWindow = this._getBrowserWindow ();
        if (targetWindow) {
          var decodedLocationSpec
            = targetWindow.Akahuku.protocolHandler
            .deAkahukuURI (contentLocation.spec);
          contentLocation
            = this._ios.newURI (decodedLocationSpec, "UTF-8", null);
          var decodedOriginSpec
            = targetWindow.Akahuku.protocolHandler
            .deAkahukuURI (requestOrigin.spec);
          requestOrigin
            = this._ios.newURI (decodedOriginSpec, "UTF-8", null);
        }
      }
    }

    if (contentLocation.scheme.substring (0, 4) != "http") {
      /* http(s) 以外の場合許可する */
      return this.ACCEPT;
    }
        
    if (contentType == this.TYPE_IMAGE
        || contentType == this.TYPE_SUBDOCUMENT
        || contentType == this.TYPE_OBJECT) {
      /* 画像、Flash、フレーム の場合 */
            
      if (!this._enableBlockImage && !this._enableBlockFlash) {
        /* ブロックが無効の場合許可する */
        return this.ACCEPT;
      }
            
      if (this._old && !swapped) {
        /* 旧バージョンの場合引数が違うので入れ替える */
                
        var targetWindow = context;
        context = requestOrigin;
                
        requestOrigin
        = Components.classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (nsIURI);
        if (targetWindow.document.location) {
          try {
            requestOrigin.spec
              = targetWindow.document.location.href;
          }
          catch (e) {
            /* 古い Mozilla Suite の場合、許可する */
            return this.ACCEPT;
          }
        }
        else {
          /* 古い Mozilla Suite でのアンカーによる移動の場合、許可する */
          return this.ACCEPT;
        }
      }
            
      if (!(/^(?:https?|akahuku)$/.test (requestOrigin.scheme))) {
        /* 呼出し元が http(s) akahuku 以外の場合は許可する */
        return this.ACCEPT;
      }
            
      if (requestOrigin.host.indexOf ("2chan.net") != -1) {
        /* 2chan.net からの呼び出しの場合チェックする */

        if (this._isExcludeBoard (requestOrigin)) {
          /* 動作しない板からは全て許可する */
          return this.ACCEPT;
        }
                
        if (!this._blockList [contentType].includesFutaba
            && /\.2chan\.net$/i.test (contentLocation.host)) {
          /* 2chan.net 内の場合は許可する */
          return this.ACCEPT;
        }
                
        var list = this._blockList [contentType];
        var reject = false;
        for (var i = 0; i < list.length; i ++) {
          if (list [i].isURI) {
            /* URI で判定 */
            if ("equalsExceptRef" in contentLocation
                ? contentLocation.equalsExceptRef (list [i].URI)
                : contentLocation.equals (list [i].URI)) {
              reject = true;
              list [i].count ++;
              break;
            }
          }
          else {
            /* ホスト名で判定 */
            if (list [i].hostPattern.test (contentLocation.host) ) {
              reject = true;
              list [i].count ++;
              break;
            }
          }
        }
                
        if (reject) {
          /* shouldLoad 内からの DOM 操作が許されない場合があるので
           * 後から適当なタイミングで操作するようタスク登録する */
          if (context instanceof Components.interfaces.nsIDOMElement) {
            var contextWindow = this._getContextBrowserWindow (context);
            if (contextWindow) {
              contextWindow.Akahuku.queueContextTask
                (contextWindow.arAkahukuDelBanner,
                 "deleteContextAfterBlock",
                 context, "deleteByContentPolicy");
            }
          }
                        
          /* 拒否する */
          return this.REJECT_SERVER;
        }
      }
    }
    else if (contentType == this.TYPE_DOCUMENT) {
      /* ドキュメントの場合 */
            
      var needCheck = false;
            
      if (contentLocation.host.indexOf ("2chan.net") != -1) {
        /* 2chan.net の場合チェックする */
        needCheck = true;
        if (this._isExcludeBoard (contentLocation)) {
          /* 動作しない板の場合はチェックしない */
          return this.ACCEPT;
        }
      }
      if (contentLocation.host.indexOf ("nijibox.dyndns.dk") != -1
          || contentLocation.host.indexOf ("akahuku.dw.land.to") != -1
          || contentLocation.host.indexOf ("akahuku.s278.xrea.com") != -1) {
        /* タテログ の場合チェックする */
        needCheck = true;
      }
            
      /** logch 停止 **/
      //if (contentLocation.host.indexOf ("logch.info") != -1) {
      //    /* 2chan.net の場合チェックする */
      //    needCheck = true;
      //}
            
      /* 避難所 patch */
      if (this._enableBoardExternal) {
        var href = contentLocation.spec;
        for (var i = 0; i < this._boardExternalList.length; i ++) {
          if (this._boardExternalList [i].prefix
              ? href.indexOf (this._boardExternalList [i].pattern) == 0
              : this._boardExternalList [i].pattern.test (href)) {
            needCheck = true;
            break;
          }
        }
      }
            
      if (needCheck) {
        if (this._enableReloadHook
            && (contentLocation.path.indexOf ("/res/") != -1
                || contentLocation.path.indexOf ("/2/") != -1
                || contentLocation.path.indexOf ("/b/") != -1
                || contentLocation.path.indexOf ("?res=") != -1)) {
          /* レス送信モードの場合チェックする */
                    
          var targetDocument = null;
                    
          if (this._old) {
            targetDocument = context.document;
          }
          else {
            targetDocument = context.contentDocument;
          }
                    
          if (targetDocument.location.href == contentLocation.spec) {
            /* レス送信モードからのリロードの場合中断する */
                        
            var button = targetDocument
            .getElementById ("akahuku_reload_button");
            if (button) {
              var entries
                = Components.classes
                ["@mozilla.org/appshell/window-mediator;1"]
                .getService (nsIWindowMediator)
                .getEnumerator ("navigator:browser");
                            
              while (entries.hasMoreElements ()) {
                var targetWindow = entries.getNext ();
                var param
                  = targetWindow.Akahuku.getDocumentParam
                  (targetDocument);
                                
                if (param) {
                  targetWindow.arAkahukuReload
                    .diffReloadCore
                    (targetDocument,
                     this._enableReloadHookSync, false);
                                    
                  return this.REJECT_OTHER;
                }
              }
            }
          }
        }
        if (this._enableCatalogReloadHook
            && (contentLocation.path.indexOf ("?mode=cat") != -1
                /* 避難所 patch */
                || contentLocation.path
                .indexOf ("cat.htm") != -1)) {
          /* カタログモードの場合チェックする */
                    
          var targetDocument = null;
                    
          if (this._old) {
            targetDocument = context.document;
          }
          else {
            targetDocument = context.contentDocument;
          }
                    
          if (targetDocument.location.href == contentLocation.spec) {
            /* カタログモードのからのリロードの場合中断する */
                        
            var button = targetDocument
            .getElementById ("akahuku_catalog_reload_button");
            if (button) {
              var entries
                = Components.classes
                ["@mozilla.org/appshell/window-mediator;1"]
                .getService (nsIWindowMediator)
                .getEnumerator ("navigator:browser");
                            
              while (entries.hasMoreElements ()) {
                var targetWindow = entries.getNext ();
                var param
                  = targetWindow.Akahuku.getDocumentParam
                  (targetDocument);
                                
                if (param) {
                  targetWindow.arAkahukuCatalog
                    .reloadCore (targetDocument, button);
                                    
                  return this.REJECT_OTHER;
                }
              }
            }
          }
        }
      }
    }
        
  } catch (e) { Components.utils.reportError (e); }
    return this.ACCEPT;
  },
    
  /**
   * 処理するかどうかのチェック
   *   nsIContentPolicy.shouldProcess
   *
   * @param  Number contentType
   *         コンテントの種類
   * @param  nsIURI contentLocation
   *         対象の URI
   * @param  nsIURI requestOrigin
   *         呼び出し元の URI
   * @param  Browser/HTMLElement context
   *         ロード先
   * @param  String mimeType
   *         MIME-Type
   * @param  nsISupports extra
   *         不明
   *
   * 旧バージョンでは
   * @param  Number contentType
   *         コンテントの種類
   * @param  nsIURI contentLocation
   *         対象の URI
   * @param  HTMLElement requestOrigin
   *         ロード先
   * @param  Window context
   *         対象のウィンドウ
   */
  shouldProcess : function (contentType, contentLocation, 
                            requestOrigin, context,
                            mimeTypeGuess, extra) {
    return this.ACCEPT;
  }
};

/**
 * 本体のファクトリー
 *   Inherits From: nsIFactory
 */
var arAkahukuContentPolicyFactory = {
  /**
   * 本体を生成する
   *   nsIFactory.createInstance
   *
   * @param  nsISupport outer
   *          統合する対象
   * @param  nsIIDRef iid
   *         生成する対象のインターフェース ID
   * @return arAkahukuContentPolicy
   *         本体
   */
  createInstance : function (outer, iid) {
    if (outer != null) {
      /* 統合する対象がある場合はエラー */
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }
        
    return new arAkahukuContentPolicy ().QueryInterface (iid);
  }
};

/**
 * XPCOM のモジュール
 *   Inherits From: nsIModule
 */
var arAkahukuContentPolicyModule = {
  /* 本体に関する情報 */
  CONTRACTID: "@unmht.org/akahuku-content-policy;1",
  CID: Components.ID ("{87501060-b014-4b67-9a53-aa5e5af9d52c}"),
  CNAME: "Akahuku Content Policy JS Component",
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェースID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIModule
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIModule)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 登録処理
   *   nsIModule.registerSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   * @param  String type
   *         ローダの種類
   */
  registerSelf : function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface (nsIComponentRegistrar);
    compMgr.registerFactoryLocation (this.CID,
                                     this.CNAME,
                                     this.CONTRACTID,
                                     fileSpec, location, type);
        
    var catman
    = Components.classes ["@mozilla.org/categorymanager;1"]
    .getService (nsICategoryManager);
    catman.addCategoryEntry ("content-policy",
                             this.CONTRACTID,
                             this.CONTRACTID, true, true);
  },
    
  /**
   * 登録解除処理
   *   nsIModule.unregisterSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   */
  unregisterSelf : function (compMgr, fileSpec, location) {
    compMgr = compMgr.QueryInterface (nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation (this.CID, fileSpec);
        
    var catman
    = Components.classes ["@mozilla.org/categorymanager;1"]
    .getService (nsICategoryManager);
    catman.deleteCategoryEntry ("content-policy",
                                this.CONTRACTID, true);
  },
    
  /**
   * ファクトリーオブジェクトを取得する
   *   nsIModule.getClassObject
   *
   * @param  nsIComponentManager compMgr
   * @param  nsCIDRef cid
   *         取得対象のクラス ID
   * @param  nsIIDRef iid
   *         取得対象のインターフェース ID
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   *         Components.results.NS_ERROR_NO_INTERFACE
   * @return arAkahukuContentPolicyFactory
   *         本体のファクトリー
   */
  getClassObject : function (compMgr, cid, iid) {
    if (cid.equals (this.CID)) {
      return arAkahukuContentPolicyFactory;
    }
        
    if (!iid.equals (nsIFactory)) {
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 終了できるかどうか
   *   nsIModule.canUnload
   *
   * @param  nsIComponentManager compMgr
   * @return Boolean
   *         終了できるかどうか
   */
  canUnload : function (compMgr) {
    return true;
  }
};

/**
 * モジュールを取得する
 * @param  nsIComponentManager compMgr
 * @param  nsIFile fileSpec
 *         モジュールのファイル
 * @return arAkahukuContentPolicyModule
 *         モジュール
 */
function NSGetModule (compMgr, fileSpec) {
  return arAkahukuContentPolicyModule;
}

try {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  
  arAkahukuContentPolicy.prototype.classID
    = Components.ID ("{87501060-b014-4b67-9a53-aa5e5af9d52c}");
  const NSGetFactory = XPCOMUtils.generateNSGetFactory ([arAkahukuContentPolicy]);
}
catch (e) {
}
