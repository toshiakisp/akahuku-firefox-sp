
/* global Components, arAkahukuConfig */

var EXPORTED_SYMBOLS = [
  "arAkahukuContentPolicy",
];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

const TYPE_IMAGE = Ci.nsIContentPolicy.TYPE_IMAGE;
const TYPE_SUBDOCUMENT = Ci.nsIContentPolicy.TYPE_SUBDOCUMENT;
const TYPE_OBJECT = Ci.nsIContentPolicy.TYPE_OBJECT;
const TYPE_SCRIPT = Ci.nsIContentPolicy.TYPE_SCRIPT;
const TYPE_STYLESHEET = Ci.nsIContentPolicy.TYPE_STYLESHEET;
const ACCEPT = Ci.nsIContentPolicy.ACCEPT;
const REJECT_SERVER = Ci.nsIContentPolicy.REJECT_SERVER;
const REJECT_OTHER = Ci.nsIContentPolicy.REJECT_OTHER;

/**
 * 本体
 * 広告のブロック、リロードのフックを行う
 *   Inherits From: nsIContentPolicy, nsIObserver
 */
function arAkahukuContentPolicy () {
  this._init ();
}
arAkahukuContentPolicy.prototype = {
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
  _board : null,

  // required for XPCOM registration by XPCOMUtils
  classDescription: "Akahuku Content Policy JS Component",
  classID : Components.ID ("{87501060-b014-4b67-9a53-aa5e5af9d52c}"),
  contractID : "@unmht.org/akahuku-content-policy;1",
  _xpcom_categories : [
    {category: "content-policy",
      entry: "arAkahukuContentPolicy",
    },
  ],
  _xpcom_factory : {
    /**
     * 本体を生成する
     *   nsIFactory.createInstance
     */
    createInstance : function (outer, iid) {
      if (outer != null) {
        /* 統合する対象がある場合はエラー */
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      return new arAkahukuContentPolicy ().QueryInterface (iid);
    }
  },

  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Cr.NS_NOINTERFACE
   * @return nsIContentPolicy
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIContentPolicy)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 初期化処理
   */
  _init : function () {
    /* pref サービスの取得 */
    if (typeof Ci.nsIPrefBranch2 !== "undefined") {
      this._pref
      = Cc ["@mozilla.org/preferences-service;1"]
      .getService (Ci.nsIPrefBranch2);
    }
    else {
      this._pref
      = Cc ["@mozilla.org/preferences-service;1"]
      .getService (Ci.nsIPrefBranch);
    }

    if (typeof (this._pref.addObserver) === "function") {
      this._observerService
      = Cc ["@mozilla.org/observer-service;1"]
      .getService (Ci.nsIObserverService);
            
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
    = Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService);
        
    // 必要なサブスクリプトのロード
    var loader
    = Cc ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Ci.mozIJSSubScriptLoader);
    try {
      var {AkahukuConsole}
      = Cu.import ("resource://akahuku/console.jsm", {});
      this.console = new AkahukuConsole ();
      this.console.prefix = "Akahuku debug ContentPolicy";
      var appinfo
        = Cc ["@mozilla.org/xre/app-info;1"]
        .getService (Ci.nsIXULRuntime);
      if (appinfo.processType !== appinfo.PROCESS_TYPE_DEFAULT) {
        this.console.prefix += "(child)";
      }
      if (typeof arAkahukuConfig === "undefined") {
        loader.loadSubScript
          ("chrome://akahuku/content/mod/arAkahukuConfig.js");
        // minimum initialization for arAkahukuConfig.initPref ()
        arAkahukuConfig.prefBranch = this._pref;
      }
      var {arAkahukuBoard} = Cu.import ("resource://akahuku/board.jsm", {});
      this._board = arAkahukuBoard;
    }
    catch (e) {
      Cu.reportError (e);
      if (!this.console) {
        // minimum equivalent
        this.console = {
          prefix : "Akahuku debug ContentPolicy: ",
          log : function (e) {},
          warn : function (e) { Cu.reportError (this.prefix+e); },
          error : function (e) { Cu.reportError (this.prefix+e); },
          exception : function (e) { Cu.reportError (e); },
        };
      }
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
        
    if (this._board) {
      this._board.getConfig ();
      this._enableBoardExternal
      = enableAll && this._board.enableExternal;
      if (this._enableBoardExternal) {
        this._boardExternalList = this._board.externalList;
      }

      this._enableBoardSelect
      = enableAll && this._board.enableSelect;
      if (this._enableBoardSelect) {
        this._boardSelectExList = this._board.selectExList;
      }
    }
  },
    
  /**
   * ブロックするホスト情報を設定する
   */
  _updateBlockList : function () {
    this._blockList = new Object ();
        
    this._blockList [TYPE_IMAGE] = [];
    this._blockList [TYPE_SUBDOCUMENT] = [];
    this._blockList [TYPE_OBJECT] = [];
        
    this._blockList [TYPE_IMAGE].includesFutaba = false;
    this._blockList [TYPE_SUBDOCUMENT].includesFutaba = false;
    this._blockList [TYPE_OBJECT].includesFutaba = false;
        
    var tmp = "";
    var list = this._blockList;
    var type = TYPE_IMAGE;
    var ios = this._ios;
    /* String.replace 用関数 (this に注意) */
    function addMatchedToList (matched) {
      try {
        var obj = {
          count: 0,
          hostPattern : null,
          urlPattern : null,
          URI : null,
          isURI : /^[^:]+:\/\//.test (matched),
          isProtocolRelative : false,
          isFutaba : false,
        };
        if (matched.indexOf ("*") != -1) {
          // ワイルドカード(*)によるURL指定
          var pat = matched.replace
            (/[-:\[\]\/\{\}\(\)\+\?\.\^\$\|\\]/g, "\\$&")
            .replace (/\*/g, ".*");
          if (obj.isURI) {
            obj.urlPattern = new RegExp ("^"+pat+"$");
            obj.isURI = false;
            if (/^[^:]*:\/\/[^\/]*\.2chan\.net\//.test (matched)) {
              // http://*.2chan.net/some_file や
              // http://www.2chan.net/ad/* などの場合は
              // 2chan.net 内のURLに対しても評価する必要がある
              list [type].includesFutaba = true;
              obj.isFutaba = true;
            }
          }
          else if (/^\/\/./.test (matched)) {
            obj.isProtocolRelative = true;
            obj.urlPattern = new RegExp ("^[^:]+:"+pat+"$");
            if (/^\/\/[^\/]*\.2chan\.net\//.test (matched)) {
              list [type].includesFutaba = true;
              obj.isFutaba = true;
            }
          }
          else if (/\*\.[^*]+$/.test (matched)) {
            // ホスト部のみのパターン
            obj.hostPattern = new RegExp (pat+"$","i");
          }
        }
        else if (obj.isURI) {
          obj.URI = ios.newURI (matched, "UTF-8", null);
          if (obj.URI && /\.2chan\.net$/i.test(obj.URI.host) ) {
            list [type].includesFutaba = true;
            obj.isFutaba = true;
          }
        }
        else if (/^\/\/./.test (matched)) {
          obj.isProtocolRelative = true;
          var pat = matched.replace
            (/[-:\[\]\/\{\}\(\)\+\?\.\^\$\|\\]/g, "\\$&");
          obj.urlPattern = new RegExp ("^[^:]+:"+pat+"$");
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
        if (obj.hostPattern || obj.URI || obj.urlPattern) {
          list [type].push (obj);
        }
        else {
          Cu.reportError ("invalid pattern: " + matched);
        }
      }
      catch (e) {
        Cu.reportError (e);
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
      type = TYPE_IMAGE;
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
      type = TYPE_SUBDOCUMENT;
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
      type = TYPE_OBJECT;
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
    var path = uri.pathQueryRef || uri.path;
    if (path.match (/^\/(?:(apr|jan|feb|tmp|up|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\//)) {
      dir = (RegExp.$1 ? RegExp.$1 + "-" + RegExp.$2 : RegExp.$2);
    }
    name = server + ":" + dir;
    if (name in this._boardSelectExList) {
      return true;
    }
    return false;
  },

  /**
   * context がトップレベルかどうか(タブで直接開いているか)を判定
   */
  _checkToplevelContext : function (context) {
    if (!(context instanceof Ci.nsIDOMChromeWindow)
      && context instanceof Ci.nsIDOMWindow) {
      // e10s, old-fx: context can be a Window
      return true;
    }
    else if (context instanceof Ci.nsIDOMXULElement) {
      if (/^(xul:)?browser/.test (context.nodeName)) {
        // context can be a xul:browser
        return true;
      }
    }
    return false;
  },

  /**
   * context に対する Document を取得
   */
  _getDocumentForContext : function (context) {
    var targetDocument = null;
    if (!(context instanceof Ci.nsIDOMChromeWindow)
      && context instanceof Ci.nsIDOMWindow) {
      // e10s, old-fx: context can be a Window
      targetDocument = context.document;
    }
    else if (context instanceof Ci.nsIDOMXULElement) {
      if (/^(xul:)?browser/.test (context.nodeName)) {
        // context can be a xul:browser
        targetDocument = context.contentDocument;
      }
    }
    else if (context instanceof Ci.nsIDOMElement) {
      targetDocument = context.ownerDocument;
    }
    else if (context instanceof Ci.nsIDOMDocument) {
      targetDocument = context;
    }

    if (targetDocument
        && !(targetDocument instanceof Ci.nsIDOMXULDocument)
        && targetDocument instanceof Ci.nsIDOMDocument) {
      return targetDocument;
    }
    else {
      this.console.error ("no document from context = "+context);
      return null;
    }
  },


  /**
   * context に対して操作できる Akahuku のスコープを取得
   */
  _getAkahukuScopeForContext : function (context)
  {
    if (context instanceof Ci.nsIDOMXULElement) {
      // context can be a xul:browser for TYPE_DOCUMENT
      var chromeWindow = context.ownerDocument.defaultView.top;
      if ("Akahuku" in chromeWindow) {
        return chromeWindow;
      }
      this.console.error ("No Akahuku scope for " + context);
      return null;
    }

    if (context instanceof Ci.nsIDOMWindow) {
      // possible in e10s for TYPE_DOCUMENT
      context = context.document;
    }

    if (context instanceof Ci.nsIDOMNode) {
      var contentWindow = (context.ownerDocument || context).defaultView;
      while (contentWindow && contentWindow.frameElement) {
        contentWindow = contentWindow.frameElement.ownerDocument.defaultView;
      }
      if (!contentWindow) {
        this.console.warn ("No Akahuku scope for " + context);
        return null;
      }
      var chromeEventHandler = contentWindow
        .QueryInterface (Ci.nsIInterfaceRequestor)
        .getInterface (Ci.nsIWebNavigation)
        .QueryInterface (Ci.nsIDocShell)
        .chromeEventHandler;
      if (chromeEventHandler.parentNode) {
        // non-e10s: xul:browser that locates in the XLU DOM tree
        var chromeWindow = chromeEventHandler.ownerDocument.defaultView.top;
        if ("Akahuku" in chromeWindow) {
          return chromeWindow;
        }
        else if ("Akahuku" in chromeWindow.wrappedJSObject) {
          // older firefox (at least 3.6.x)
          return chromeWindow.wrappedJSObject;
        }
        else {
          // bootstrap.js (no Akahuku in chromeWindow)
          var scope = {};
          try {
            Cu.import ("resource://akahuku/akahuku.jsm", scope);
            return scope;
          }
          catch (e) { this.console.exception (e);
          }
        }
      }
      else { // e10s: WindowRoot that is the top of a content frame
        // content-policy's process is the same with context,
        // JSM Akahuku to be imported is identical.
        var scope = {};
        try {
          Cu.import ("resource://akahuku/akahuku.jsm", scope);
          return scope;
        }
        catch (e) { this.console.exception (e);
        }
      }
    }
    this.console.error ("No Akahuku scope for " + context);
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
   *         呼び出し元の URI (or null)
   * @param  Browser/HTMLElement context
   *         ロード先
   * @param  String mimeTypeGuess
   *         予想される MIME-Type
   * @param  nsISupports extra
   */
  shouldLoad : function (contentType, contentLocation,
                         requestOrigin, context,
                         mimeTypeGuess, extra) {
  try {
    if (!this._enableP2P) {
      if (contentLocation.schemeIs ("akahuku") ||
          contentLocation.schemeIs ("akahuku-safe")) {
        if (contentLocation.spec.match
            (/^akahuku(-safe)?:\/\/[^\/]*\/p2p\//)) {
          /* 全体が無効の場合には P2P なアドレスを元に戻す */
          try {
            var scope = this._getAkahukuScopeForContext (context);
            scope.arAkahukuP2P.deP2PContext
              (context, contentLocation.spec);
          }
          catch (e) { this.console.exception (e);
          }
                    
          return REJECT_OTHER;
        }
      }
    }
        
    if ((contentLocation.schemeIs ("akahuku") ||
          contentLocation.schemeIs ("akahuku-safe"))
        && this._checkToplevelContext (context)
        && contentLocation.spec.match
        (/^akahuku(-safe)?:\/\/[^\/]*\/p2p\//)) {
      try {
        var scope = this._getAkahukuScopeForContext (context);
        var contextDocument = this._getDocumentForContext (context);
        scope.arAkahukuP2P.checkImage
          (context,
           contextDocument.location.href,
           contentLocation.spec,
           20, scope, -1);
      }
      catch (e) { this.console.exception (e);
      }
            
      return ACCEPT;
    }

    if (this._enableP2P &&
        (contentLocation.schemeIs ("http") ||
         contentLocation.schemeIs ("https"))) {
      /* P2P モードが有効の場合 */

      if (contentLocation.host.indexOf ("2chan.net") != -1) {
        /* 2chan.net 内の画像の場合 */
        if (!this._enableP2PTatelog
            && requestOrigin
            && requestOrigin.spec.match
            (/catalog\/dat\/view.php?(.+)$/)) {
          var q = RegExp.$1;
          if (!q.match (/mode=cat2?/)) {
            /* タテログふつーモードでは動かさない */
            return ACCEPT;
          }
        }

        if (contentLocation.spec.match
            (/^https?:\/\/dec\.2chan\.net\/up\/src\//)) {
          /* あぷでは動かさない */
          return ACCEPT;
        }
                
        if (contentLocation.spec.match
            (/\/(cat|thumb|src)\/([A-Za-z0-9]+)\.(jpg|png|gif)$/)) {
          /* カタログ、サムネ、元画像の場合 */
          var ext = RegExp.$3;
                    
          if (requestOrigin && requestOrigin.schemeIs ("unmht")) {
            return ACCEPT;
          }
                    
          var reject = false;
          try {
            var scope = this._getAkahukuScopeForContext (context);
            reject = scope.arAkahukuP2P.enP2PContext
              (context, contentLocation.spec);
          }
          catch (e) { this.console.exception (e);
          }
                    
          if (reject) {
            return REJECT_OTHER;
          }
          else {
            return ACCEPT;
          }
        }
      }
      if (contentLocation.host.indexOf ("www.nijibox5.com") != -1) {
        if (contentLocation.spec.match
            (/\/tubu\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)$/)) {
          /* 塩粒の場合 */
          var ext = RegExp.$3;
                    
          var reject = false;
          try {
            var scope = this._getAkahukuScopeForContext (context);
            reject = scope.arAkahukuP2P.enP2PContext
              (context, contentLocation.spec);
          }
          catch (e) { this.console.exception (e);
          }
                        
          if (reject) {
            return REJECT_OTHER;
          }
          else {
            return ACCEPT;
          }
        }
      }
    }
        
    /* キャッシュページからの読込 */
    if (this._enableAll &&
        (contentType == TYPE_IMAGE ||
         contentType == TYPE_SCRIPT ||
         contentType == TYPE_STYLESHEET ||
         contentType == TYPE_OBJECT ||
         contentType == TYPE_SUBDOCUMENT) &&
        requestOrigin &&
        (requestOrigin.schemeIs ("akahuku") ||
         requestOrigin.schemeIs ("akahuku-safe")) &&
        /^\/(file)?cache\//.test (requestOrigin.path)) {
      if (contentLocation.schemeIs ("akahuku-local")) {
        // ローカルリソース
        return ACCEPT;
      }
      if (!contentLocation.schemeIs ("akahuku") &&
          !contentLocation.schemeIs ("akahuku-safe")) {
        // 通常の読込を禁止し、必要なら cache に差し替える
        try {
          var scope = this._getAkahukuScopeForContext (context);
          var decodedOriginSpec
            = scope.Akahuku.protocolHandler
            .deAkahukuURI (requestOrigin.spec);
          var policy
            = Cc ["@mozilla.org/layout/content-policy;1"]
            .getService (Ci.nsIContentPolicy);
          var shouldLoad
            = policy.shouldLoad
            (contentType, contentLocation,
             this._ios.newURI (decodedOriginSpec, "UTF-8", null),
             context, mimeTypeGuess, extra);
          if (shouldLoad != ACCEPT) {
            return shouldLoad;
          }
          if (context instanceof Ci.nsIDOMElement) {
            scope.Akahuku.queueContextTask
              (scope.Akahuku.Cache,
               "enCacheURIContext", context, contentLocation.spec);
          }
        }
        catch (e) { this.console.exception (e);
        }
        return REJECT_OTHER;
      }
      else {
        // 差し替えられた akahuku://*/cache/* は
        // 元URLに戻した上で残りの判定へ
        try {
          var scope = this._getAkahukuScopeForContext (context);
          var decodedLocationSpec
            = scope.Akahuku.protocolHandler
            .deAkahukuURI (contentLocation.spec);
          contentLocation
            = this._ios.newURI (decodedLocationSpec, "UTF-8", null);
          var decodedOriginSpec
            = scope.Akahuku.protocolHandler
            .deAkahukuURI (requestOrigin.spec);
          requestOrigin
            = this._ios.newURI (decodedOriginSpec, "UTF-8", null);
        }
        catch (e) { this.console.exception (e);
        }
      }
    }

    if (!contentLocation.schemeIs ("http") &&
        !contentLocation.schemeIs ("https")) {
      /* http(s) 以外の場合許可する */
      return ACCEPT;
    }
        
    if (contentType == TYPE_IMAGE ||
        contentType == TYPE_SUBDOCUMENT ||
        contentType == TYPE_OBJECT) {
      /* 画像、Flash、フレーム の場合 */
            
      if (!this._enableBlockImage && !this._enableBlockFlash) {
        /* ブロックが無効の場合許可する */
        return ACCEPT;
      }

      if (requestOrigin
          && !(/^(?:https?|akahuku)$/.test (requestOrigin.scheme))) {
        /* 呼出し元が http(s) akahuku 以外の場合は許可する */
        return ACCEPT;
      }
            
      if (requestOrigin
          && requestOrigin.host.indexOf ("2chan.net") != -1) {
        /* 2chan.net からの呼び出しの場合チェックする */

        if (this._isExcludeBoard (requestOrigin)) {
          /* 動作しない板からは全て許可する */
          return ACCEPT;
        }
                
        if (!this._blockList [contentType].includesFutaba
            && /\.2chan\.net$/i.test (contentLocation.host)) {
          /* 2chan.net 内の場合は許可する */
          return ACCEPT;
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
          else if (list [i].urlPattern) {
            // URLで判定(ワイルドカード展開)
            //   *.2chan.net/* に対してはふたば内部向けパターン
            //   のみを評価対象とする。
            //   広範囲除外パターン(http://*等)でREJECTされないように。
            if ((!/\.2chan\.net$/i.test (contentLocation.host)
                  || list [i].isFutaba)
                && (!list [i].isProtocolRelative ||
                  contentLocation.scheme == requestOrigin.scheme)
                && list [i].urlPattern.test (contentLocation.spec)) {
              reject = true;
              list [i].count ++;
              break;
            }
          }
          else {
            // ホスト名で判定
            //   (*.2chan.netはホスト名レベルでは除外できない)
            if (!/\.2chan\.net$/i.test (contentLocation.host)
                && list [i].hostPattern.test (contentLocation.host) ) {
              reject = true;
              list [i].count ++;
              break;
            }
          }
        }
                
        if (reject) {
          /* shouldLoad 内からの DOM 操作が許されない場合があるので
           * 後から適当なタイミングで操作するようタスク登録する */
          if (context instanceof Ci.nsIDOMElement) {
            try {
              var scope = this._getAkahukuScopeForContext (context);
              scope.Akahuku.queueContextTask
                (scope.arAkahukuDelBanner,
                 "deleteContextAfterBlock",
                 context, "deleteByContentPolicy");
            }
            catch (e) { this.console.exception (e);
            }
          }
                        
          /* 拒否する */
          return REJECT_SERVER;
        }
      }
    }
    else if (contentType == Ci.nsIContentPolicy.TYPE_DOCUMENT) {
      /* ドキュメントの場合 */
            
      var needCheck = false;
            
      if (contentLocation.host.indexOf ("2chan.net") != -1) {
        /* 2chan.net の場合チェックする */
        needCheck = true;
        if (this._isExcludeBoard (contentLocation)) {
          /* 動作しない板の場合はチェックしない */
          return ACCEPT;
        }
      }
            
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
                    
          var targetDocument = this._getDocumentForContext (context);
                    
          if (targetDocument
              && targetDocument.location.href == contentLocation.spec) {
            /* レス送信モードからのリロードの場合中断する */
                        
            var button = targetDocument
            .getElementById ("akahuku_reload_button");
            if (button) {
              try {
                var scope = this._getAkahukuScopeForContext (context);
                var param
                  = scope.Akahuku.getDocumentParam
                  (targetDocument);
                                
                if (param) {
                  scope.arAkahukuReload
                    .diffReloadCore
                    (targetDocument,
                     this._enableReloadHookSync, false);
                                    
                  return REJECT_OTHER;
                }
              }
              catch (e) { this.console.excption (e);
              }
            }
            else {
              this.console.warn ("no akahuku_reload_button in content document.");
            }
          }
        }
        if (this._enableCatalogReloadHook
            && (contentLocation.path.indexOf ("?mode=cat") != -1
                /* 避難所 patch */
                || contentLocation.path
                .indexOf ("cat.htm") != -1)) {
          /* カタログモードの場合チェックする */
                    
          var targetDocument = this._getDocumentForContext (context);
                    
          if (targetDocument
              && targetDocument.location.href == contentLocation.spec) {
            /* カタログモードのからのリロードの場合中断する */
                        
            var button = targetDocument
            .getElementById ("akahuku_catalog_reload_button");
            if (button) {
              try {
                var scope = this._getAkahukuScopeForContext (context);
                var param
                  = scope.Akahuku.getDocumentParam
                  (targetDocument);
                                
                if (param) {
                  scope.arAkahukuCatalog
                    .reloadCore (targetDocument, button);
                                    
                  return REJECT_OTHER;
                }
              }
              catch (e) { this.console.exception (e);
              }
            }
            else {
              this.console.warn ("no akahuku_reload_button in content document.");
            }
          }
        }
      }
    }
        
  } catch (e) { Cu.reportError (e); }
    return ACCEPT;
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
   */
  shouldProcess : function (contentType, contentLocation, 
                            requestOrigin, context,
                            mimeTypeGuess, extra) {
    return ACCEPT;
  }
};

