
/**
 * Require: arAkahukuConfig, arAkahukuDOM, arAkahukuCompat,
 *          arAkahukuBoard
 */

/**
 * サイドバーのスレ情報
 */
function arAkahukuSidebarThread () {
}
arAkahukuSidebarThread.prototype = {
  num : 0,           /* Number  スレ番号 */
  comment : "",      /* String  コメント */
  commentInCatalog : "",/* String  カタログから取得したコメント */
    
  reply : 0,         /* Number  レス数 */
  lastReply : 0,     /* Number  更新前のレス数 */
  expire : "",       /* String  消滅時刻 */
  warning : "",      /* String  もうすぐ消えます */
  lastNum : 0,       /* Number  最終レス番号*/
  catalogOrder : 0,  /* Number  カタログ順(保存しない) */
    
  imageSrc : "",     /* String  画像の URI */
  imageSrcType : 0,  /* Number  画像の種類
                      * 1: サムネ
                      * 2: カタログ */
  imageLink : "",    /* String  元画像の URI */
  imageNum : 0,      /* Number  画像の番号 */
  imageWidth : 0,    /* Number  画像の幅 */
  imageHeight : 0,   /* Number  画像の高さ */
  imageBytes : 0,    /* Number  画像のバイト数 */
  imageExt : "",     /* String  画像の拡張子 */
    
  threadLink : "",   /* String  スレの URI */
  isVisited : false, /* Boolean  既読フラグ */
  isMarked : false,  /* Boolean  マーク */
  isExpired : false, /* Boolean  消滅フラグ */
  node : null        /* HTMLDivElement  サイドバー上の div 要素 */
  ,
  threadLinkURIObject : null,   /* nsIURI スレの URI */

  isValid : function ()
  {
    // 基本的なチェック
    var valid
      =  this.num > 0 
      && typeof (this.comment) === "string"
      && this.reply >= 0
      && this.lastReply >= -1
      //&& this.lastReply <= this.reply // レス削除の場合逆転する
      && typeof (this.expire) === "string"
      && typeof (this.warning) === "string"
      && typeof (this.lastNum) === "number" // カタログの事情で
      && typeof (this.imageSrc) === "string"
      && (this.imageSrcType === 1 || this.imageSrcType === 2)
      && typeof (this.imageLink) === "string"
      && this.imageNum >= 0
      && this.imageWidth >= 0
      && this.imageHeight >= 0
      && this.imageBytes >= 0
      && /^(?:|jpg|gif|png)$/i.test (this.imageExt)
      && typeof (this.threadLink) === "string"
    if (!valid) {
      return false;
    }

    // URLチェック
    if (!this.threadLinkURIObject
        || this.threadLinkURIObject.spec != this.threadLink) {
      this.threadLinkURIObject = null;
      var uri = this.makeURI (this.threadLink);
      if (uri && this.isSafeURL (uri)) {
        this.threadLinkURIObject = uri;
        this.threadLink = uri.spec;
      }
    }
    valid
      = this.threadLinkURIObject
      && this.isSafeURL (this.threadLinkURIObject)
      // imageSrc, imageLink は未指定の場合もある
      && (!this.imageSrc || this.isSafeURL (this.imageSrc))
      && (!this.imageLink || this.isSafeURL (this.imageLink));
    if (!valid) {
      delete this.threadLinkURIObject;
      return false;
    }

    return true;
  },

  makeURI : function (uriStr) {
    var ios
      = Components.classes ["@mozilla.org/network/io-service;1"]
      .getService (Components.interfaces.nsIIOService);
    try {
      var uri = ios.newURI (uriStr, null, null);
    }
    catch (e if e.result == Components.results.NS_ERROR_MALFORMED_URI) {
      return null;
    }
    return uri;
  },
  isSafeURL : function (url) {
    var destURI
      = (url instanceof  Components.interfaces.nsIURI
         ? url : makeURI (url)); 
    if (!destURI) {
      return false;
    }
    try {
      var secMan
        = Components.classes ["@mozilla.org/scriptsecuritymanager;1"]
        .getService (Components.interfaces.nsIScriptSecurityManager);
      var flags
        = Components.interfaces.nsIScriptSecurityManager.DISALLOW_SCRIPT;
      var principal
        = Components.classes ["@mozilla.org/nullprincipal;1"]
        .createInstance (Components.interfaces.nsIPrincipal);
      if (this.threadLinkURIObject) {
        secMan.checkLoadURIWithPrincipal
          (principal, this.threadLinkURIObject, destURI, flags);
      }
      else {
        secMan.checkLoadURIStrWithPrincipal
          (principal, "http://www.2chan.net/", destURI.spec, flags);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      return false;
    }
    return true;
  },
};
/**
 * サイドバーの板情報
 */
function arAkahukuSidebarBoard () {
  this.threads = new Array ();
}
arAkahukuSidebarBoard.prototype = {
  threads : null,           /* Array  スレ情報の配列
                             *   [arAkahukuSidebarThread, ...] */
  lastSelected : null,      /* HTMLDivElement  最後にカーソルが
                             *   載っていた div 要素 */
  lastSelectedImage : null, /* HTMLDivElement  最後にカーソルが
                             *   載っていた img 要素 */
    
  /**
   * スレを追加する
   *
   * @param  arAkahukuSidebarThread thread
   *         追加するスレ
   */
  addThread : function (thread) {
    // thread の妥当性をチェック
    if (!thread.isValid ()) {
      if (Akahuku.debug.enabled) {
        Akahuku.debug.warn
          ("arAkahukuSidebarBoard rejects an invalid thread entry;\n"
           + JSON.stringify (thread));
      }
      return;
    }
    this.threads.push (thread);
  },
    
  /**
   * スレを検証する (不正なら排除)
   *
   * @param  Number num
   *         検証するスレの番号
   */
  validateThread : function (num) {
    var thread;
    for (var i = 0; i < this.threads.length; i ++) {
      if (this.threads [i].num == num) {
        thread = this.threads [i];
        break;
      }
    }
    if (thread && !thread.isValid ()) {
      if (Akahuku.debug.enabled) {
        Akahuku.debug.warn
          ("arAkahukuSidebarBoard drops an invalid thread entry;\n"
           + JSON.stringify (thread));
      }
      this.threads.splice (i, 1);
    }
  },
    
  /**
   * スレを取得する
   *
   * @param  Number num
   *         取得するスレの番号
   * @return arAkahukuSidebarThread
   *         スレ情報
   *         存在しなかった場合には null
   */
  getThread : function (num) {
    for (var i = 0; i < this.threads.length; i ++) {
      if (this.threads [i].num == num) {
        return this.threads [i];
      }
    }
    return null;
  }
};
/**
 * サイドバー管理
 *   [サイドバー]
 */
var arAkahukuSidebar = {
  currentSidebarDocument : null, /* XULDocument  現在対象のサイドバーの
                                  *   ドキュメント */
    
  boards : new Object (), /* Object  板情報の配列
                  *   <String 板名, arAkahukuSidebarBoard> */
    
  enable : false,             /* Boolean  サイドバーを使用する */
  enableBackground : false,   /* Boolean  非表示の間も反映させる */
  enableCheckNormal : true,   /* Boolean  通常 (モードをチェックする) */
  enableCheckReply: true,     /* Boolean  レス送信モード (をチェックする) */
  enableCheckCatalog : false, /* Boolean  カタログをチェックする */
  refreshCatalogType : 0,     /* Number   (更新ボタンの)カタログ種類 */
  enableTabVertical : false,  /* Boolean  タブを縦に表示する */
  enableTabHidden : false,    /* Boolean  タブを表示しない */
  enableTabMenu : false,    /* Boolean  タブメニューを表示する */
  enableSortVisited : false,  /* Boolean  既読のスレを上に持ってくる */
  enableSortMarked : false,   /* Boolean  マークしたスレを上に持ってくる */
  maxView : 30,               /* Number  表示する数 */
  maxCache : 100,             /* Number  内部で保持する数 */
  thumbnailSize : 64,         /* Number  サムネのサイズ [px] */
  sortType : 0,               /* Number  ソートの方法
                               *   0: スレの新しい順
                               *   1: 最終レス番号順
                               *   2: スレの古い順
                               *   3: レスの多い順
                               *   4: レスの少ない順
                               *   5: カタログ順
                               *   6: レスの増加数順 */
  sortInvert : false,         /* Boolean  ソートを反転 */
  enableSave : false,         /* Boolean  サイドバーの内容を保存する */
  list : new Array (),        /* Array  表示する板
                               *   [String 板名, ...] */
    
  enableMarked : false,       /* Boolean  マークしたスレのタブを作る */

  afterThreadClick : "none",   /* String  既存のスレをクリック時 */
    
  shortcutKeycode : 0,              /* Number  ショートカットキーのキーコード */
  shortcutModifiersAlt : false,     /* Boolean  ショートカットキーの Alt */
  shortcutModifiersCtrl : false,    /* Boolean  ショートカットキーの Ctrl */
  shortcutModifiersMeta : false,    /* Boolean  ショートカットキーの Meta */
  shortcutModifiersShift : false,   /* Boolean  ショートカットキーの Shift */
    
  /**
   * 初期化処理
   */
  init : function () {
    var board = new arAkahukuSidebarBoard ();
    arAkahukuSidebar.boards ["*_*"] = board;
        
    arAkahukuSidebar.getConfig ();
    if (arAkahukuSidebar.enableSave) {
      var filename
        = arAkahukuFile.systemDirectory
        + arAkahukuFile.separator + "sidebar.txt";
            
      var text = arAkahukuFile.readFile (filename);
      var currentBoard = "";
            
      text.replace
        (/([^\n\r]+)[\r\n]+/g,
         function (matched, line) {
          if (line.indexOf (",") == -1) {
            currentBoard = line;
            board = new arAkahukuSidebarBoard ();
            arAkahukuSidebar.boards [currentBoard] = board;
          }
          else {
            var values = line.split (/,/);
            var i = 0;
                        
            var thread = new arAkahukuSidebarThread ();
                        
            thread.num = parseInt (unescape (values [i]));
            i ++;
            thread.comment = unescape (values [i]);
            i ++;
            thread.reply = parseInt (unescape (values [i]));
            i ++;
            thread.lastReply = parseInt (unescape (values [i]));
            i ++;
            thread.expire = unescape (values [i]);
            i ++;
            thread.warning = unescape (values [i]);
            i ++;
            thread.lastNum = parseInt (unescape (values [i]));
            i ++;
            thread.imageSrc = unescape (values [i]);
            i ++;
            thread.imageSrcType = parseInt (unescape (values [i]));
            i ++;
            thread.imageLink = unescape (values [i]);
            i ++;
            thread.imageNum = parseInt (unescape (values [i]));
            i ++;
            thread.imageWidth = parseInt (unescape (values [i]));
            i ++;
            thread.imageHeight = parseInt (unescape (values [i]));
            i ++;
            thread.imageBytes = parseInt (unescape (values [i]));
            i ++;
            thread.imageExt = unescape (values [i]);
            i ++;
            thread.threadLink = unescape (values [i]);
            i ++;
            thread.isVisited = unescape (values [i]) == "true";
            i ++;
            thread.isMarked = unescape (values [i]) == "true";
            i ++;
            thread.isExpired = unescape (values [i]) == "true";
            i ++;
            arAkahukuSidebar.boards [currentBoard].addThread
              (thread);
          }
        });
      if (arAkahukuSidebar.enableMarked) {
        arAkahukuSidebar.updateMarked ();
      }
    }
  },

  initForXUL : function () {
    window.addEventListener
    ("keydown", arAkahukuSidebar.onKeyDown, true);
  },

  /**
   * キーが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onKeyDown : function (event) {
    if (Akahuku.enableAll
        && arAkahukuSidebar.enable
        && arAkahukuSidebar.enableShortcut) {
      if (arAkahukuSidebar.shortcutKeycode == event.keyCode
          && arAkahukuSidebar.shortcutModifiersAlt == event.altKey
          && arAkahukuSidebar.shortcutModifiersCtrl == event.ctrlKey
          && arAkahukuSidebar.shortcutModifiersMeta == event.metaKey
          && arAkahukuSidebar.shortcutModifiersShift == event.shiftKey) {
        var window = event.currentTarget;
        arAkahukuCompat.toggleSidebar ("viewAkahukuSidebar", false, window);
        event.preventDefault ();
      }
    }
  },
    
  /**
   * 終了処理
   */
  term : function () {
    if (arAkahukuSidebar.enableSave) {
      var filename
      = arAkahukuFile.systemDirectory
      + arAkahukuFile.separator + "sidebar.txt";
      var text = "";
      var name, board, thread;
            
      for (name in arAkahukuSidebar.boards) {
        board = arAkahukuSidebar.boards [name];
                
        text += name + "\n";
        for (var i = 0; i < board.threads.length; i ++) {
          thread = board.threads [i];
                    
          text +=
            escape (thread.num)
            + "," + escape (thread.comment)
            + "," + escape (thread.reply)
            + "," + escape (thread.lastReply)
            + "," + escape (thread.expire)
            + "," + escape (thread.warning)
            + "," + escape (thread.lastNum)
            + "," + escape (thread.imageSrc)
            + "," + escape (thread.imageSrcType)
            + "," + escape (thread.imageLink)
            + "," + escape (thread.imageNum)
            + "," + escape (thread.imageWidth)
            + "," + escape (thread.imageHeight)
            + "," + escape (thread.imageBytes)
            + "," + escape (thread.imageExt)
            + "," + escape (thread.threadLink)
            + "," + escape (thread.isVisited)
            + "," + escape (thread.isMarked)
            + "," + escape (thread.isExpired)
            + "\n";
        }
      }
            
      arAkahukuFile.createFile (filename, text);
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuSidebar.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sidebar", false);
    if (arAkahukuSidebar.enable) {
      arAkahukuSidebar.enableBackground
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.background", false);
      arAkahukuSidebar.enableCheckNormal
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.check.normal", true);
      arAkahukuSidebar.enableCheckReply
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.check.reply", true);
      arAkahukuSidebar.enableCheckCatalog
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.check.catalog", true);
      arAkahukuSidebar.refreshCatalogType
      = arAkahukuConfig
      .initPref ("int",  "akahuku.sidebar.refresh.catalog.type", 0);
      arAkahukuSidebar.enableTabVertical
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.tab.vertical", false);
      arAkahukuSidebar.enableTabHidden
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.tab.hidden", false);
      arAkahukuSidebar.enableTabMenu
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.tab.menu", false);
      arAkahukuSidebar.enableSortVisited
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.sort.visited", false);
      arAkahukuSidebar.enableSortMarked
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.sort.marked", true);
      arAkahukuSidebar.sortType
      = arAkahukuConfig
      .initPref ("int",  "akahuku.sidebar.sort.type", 1);
      arAkahukuSidebar.sortInvert
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.sort.invert", false);
      arAkahukuSidebar.enableMarked
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.markedtab", true);
      arAkahukuSidebar.maxView
      = arAkahukuConfig
      .initPref ("int",  "akahuku.sidebar.max.view", 50);
      arAkahukuSidebar.maxCache
      = arAkahukuConfig
      .initPref ("int",  "akahuku.sidebar.max.cache", 100);
      arAkahukuSidebar.thumbnailSize
      = arAkahukuConfig
      .initPref ("int",  "akahuku.sidebar.thumbnail.size", 64);
      arAkahukuSidebar.enableSave
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.save", false);
      var value
      = arAkahukuConfig
      .initPref ("char", "akahuku.sidebar.list", "");
      arAkahukuSidebar.list = new Array ();
            
      if (value) {
        /* 値を解析するだけなので代入はしない */
        value.replace
          (/([^,]+),?/g,
           function (matched, part1) {
            arAkahukuSidebar.list.push (unescape (part1));
            return "";
          });
      }

      arAkahukuSidebar.afterThreadClick
      = arAkahukuConfig
      .initPref ("char", "akahuku.sidebar.threadclick.after", "none");
            
      arAkahukuSidebar.enableShortcut
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.shortcut", false);
      if (arAkahukuSidebar.enableShortcut) {
        var value
          = arAkahukuConfig
          .initPref ("char", "akahuku.sidebar.shortcut.keycode",
                     "VK_S");
        value
          = unescape (value);
        arAkahukuSidebar.shortcutKeycode
          = Components.interfaces.nsIDOMKeyEvent ["DOM_" + value];
                
        arAkahukuSidebar.shortcutModifiersAlt
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.sidebar.shortcut.modifiers.alt",
                     false);
        arAkahukuSidebar.shortcutModifiersCtrl
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.sidebar.shortcut.modifiers.ctrl",
                     false);
        arAkahukuSidebar.shortcutModifiersMeta
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.sidebar.shortcut.modifiers.meta",
                     true);
        arAkahukuSidebar.shortcutModifiersShift
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.sidebar.shortcut.modifiers.shift",
                     true);
      }
    }

    // 設定変更をその場で反映する
    arAkahukuSidebar.updateSidebarByConfig ();
  },
    
  /**
   * サイドバーを取得する
   *
   * @return XULElement
   *         サイドバー
   */
  getSidebar : function () {
    var sidebar = null;
        
    var mediator
    = Components.classes ["@mozilla.org/appshell/window-mediator;1"]
    .getService (Components.interfaces.nsIWindowMediator);
    var sidebarWindow = mediator.getMostRecentWindow ("mozilla:sidebar");
        
    if (sidebarWindow) {
      /* 拡張でサイドバーが切り離されている場合 */
      sidebar = sidebarWindow.document.getElementById ("sidebar");
    }
        
    if (!sidebar) {
      sidebar = document.getElementById ("sidebar");
    }
        
    return sidebar;
  },

  /**
   * サイドバーのドキュメントを得る [XUL]
   *
   * @param String targetId (optional) 確認したいID
   * @return XULDocument
   */
  getSidebarDocument : function (targetId) {
    if (typeof document === "undefined") {
      // onload 以前に呼ばれる場合に備える
      return null;
    }
    if (targetId) {
      var menuitem = document.getElementById (targetId);
      if (!menuitem ||
          menuitem.getAttribute ("checked") != "true") {
        if (!menuitem) Akahuku.debug.warn ("Sidebar: no " + targetId);
        return null;
      }
    }
    var sidebar = arAkahukuSidebar.getSidebar ();
    if (!sidebar.docShell) {
      return null;
    }
    var sidebarDocument;
    try {
      sidebarDocument = sidebar.contentDocument;
    }
    catch (e) {
      sidebarDocument = arAkahukuSidebar.currentSidebarDocument;
    }
    return sidebarDocument;
  },

  /**
   * イベント発生時に iframe 内外のドキュメントを取得する
   *
   * @param  Event event
   *         対象のイベント
   * @return Object
   *         sidebar: iframe の親の XULDocument,
   *         content: iframe 内 HTMLDocument,
   */
  _getDocumentsOnEvent : function (event)
  {
    var documents = {content: null, sidebar: null};

    var target = event.target;
    if (target instanceof Components.interfaces.nsIDOMXULElement) {
      documents.sidebar = target.ownerDocument;
      if (target.nodeName == "iframe") {
        // iframe 自身に event が dispatch された場合 (chrome://)
        documents.content = target.contentDocument;
      }
    }
    else { // HTMLElement
      documents.content = target.ownerDocument || target;
      var parentWindow
        = arAkahukuWindow.getParentWindowInChrome
        (documents.content.defaultView);
      if (parentWindow) {
        documents.sidebar = parentWindow.document;
      }
      else {
        // トップダウン的にサイドバーを取得する
        // (サイドバー以外にロードされていると辿り着けない)
        var sidebar = arAkahukuSidebar.getSidebar ();
        if (!sidebar.docShell) {
          Akahuku.debug.warn ("arAkahukuSidebar._getDocumentsOnEvent: return no sidebar;"
              + " founded sidebar dose not have docShell.");
          documents.sidebar = null;
        }
        else {
          documents.sidebar = sidebar.contentDocument;
        }
      }
    }

    // 正しいサイドバーに辿り着けたか
    try {
      if (documents.sidebar.documentURI.indexOf
          ("chrome://akahuku/content/sidebar.xul") != 0) {
        Akahuku.debug.warn ("arAkahukuSidebar._getDocumentsOnEvent: return no sidebar;"
            + " founded sidebar is not chrome://akahuku/content/sidebar.xul"
            + ", but " + documents.sidebar.location.href);
        documents.sidebar = null;
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      documents.sidebar = null;
    }

    return documents;
  },

  /**
   * スレッドを更新or追加する [XUL]
   */
  updateThreadItem : function (item) {
    var board = null;
    if (item.boardName in arAkahukuSidebar.boards) {
      board = arAkahukuSidebar.boards [item.boardName];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      arAkahukuSidebar.boards [item.boardName] = board;
    }

    var append = false;
    var thread = board.getThread (item.num);
    if (thread == null) {
      if (item.type === "expired" || item.type === "changed") {
        return;
      }
      append = true;
      thread = new arAkahukuSidebarThread ();
    }
    else if (item.type === "expired") {
      thread.isExpired = true;
      thread.warning = ""; // 消滅後は赤字にしない
      arAkahukuSidebar.sort (name);
      arAkahukuSidebar.update (name);
      if (arAkahukuSidebar.enableMarked) {
        arAkahukuSidebar.sort ("*_*");
        arAkahukuSidebar.update ("*_*");
      }
      return;
    }

    thread.num = item.num;

    if (typeof item.threadLink !== "undefined") {
      thread.threadLink = item.threadLink;
    }
    if (typeof item.reply !== "undefined" &&
        item.reply >= 0) {
      if (append) {
        thread.lastReply = -1;
      }
      else {
        thread.lastReply = thread.reply;
      }
      thread.reply = item.reply;
    }

    if (item.type === "normal" || item.type === "changed") {
      if (typeof item.expire !== "undefined") {
        thread.expire = item.expire;
      }
      if (typeof item.warning !== "undefined") {
        thread.warning = item.warning;
      }
      if (typeof item.lastNum !== "undefined" &&
          item.lastNum >= 0) {
        thread.lastNum = item.lastNum;
      }
    }

    if (item.type === "normal") {
      thread.comment = item.comment;
      thread.imageNum = item.imageNum;
      thread.imageSrc = item.imageSrc;
      thread.imageSrcType = 1;
      thread.imageLink = item.imageLink;
      thread.imageWidth = item.imageWidth;
      thread.imageHeight = item.imageHeight;
      thread.imageBytes = item.imageBytes;
      thread.imageExt = item.imageExt;
    }
    else if (item.type === "catalog") {
      if (thread.lastNum <= 0) {
        thread.lastNum = item.lastNum;
      }
      thread.catalogOrder = item.catalogOrder;
      // カタログからもコメントを取得する
      thread.commentInCatalog = item.comment;
      thread.imageNum = item.imageNum;
      if (thread.imageSrcType != 1) {
        thread.imageSrc = item.imageSrc;
        thread.imageSrcType = item.imageSrcType;
      }
    }

    if (append) {
      board.addThread (thread);
    }
    else {
      board.validateThread (thread.num);
    }
  },

  /**
   * ソート順ボタンのラベル名を得る
   */
  getSortTypeLabel : function (sortType) {
    sortType = sortType || arAkahukuSidebar.sortType;
    switch (sortType) {
      case 0: // "スレ新順"
        return "\u30B9\u30EC\u65B0\u9806";
      case 1: // "最終レス順"
        return "\u6700\u7D42\u30EC\u30B9\u9806";
      case 2: // "スレ古順"
        return "\u30B9\u30EC\u53E4\u9806";
      case 3: // "レス多順"
        return "\u30EC\u30B9\u591A\u9806";
      case 4: // "レス少順"
        return "\u30EC\u30B9\u5C11\u9806";
      case 5: // "カタログ順"
        return "\u30AB\u30BF\u30ED\u30B0\u9806";
      case 6: // "レス増順"
        return "\u30EC\u30B9\u5897\u9806";
    }
    return "??\u9806";
  },

  /**
   * カタログ種類のボタンのラベル名を得る
   */
  getRefreshCatalogTypeLabel : function (type) {
    type = type || arAkahukuSidebar.refreshCatalogType;
    switch (type) {
      case 0: // "カタログ"
        return "\u30AB\u30BF\u30ED\u30B0";
      case 1: // "新順"
        return "\u65B0\u9806";
      case 2: // "古順"
        return "\u53E4\u9806";
      case 3: // "多順"
        return "\u591A\u9806";
      case 4: // "少順"
        return "\u5C11\u9806";
    }
    return "??\u9806";
  },
    
  /**
   * 通常モードをロードしたイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String name
   *         対象の板
   */
  onNormalLoad : function (targetDocument, name) {
    var thread = null;
    var node, nodeName;
    var lastReply = null;
    var num, comment;
    var reply, expire, warning;
    var imageSrc, imageLink, imageNum;
    var imageWidth, imageHeight, imageBytes, imageExt;
    var threadLink;
        
    var nodes = Akahuku.getMessageBQ (targetDocument);
    for (var i = 0; i < nodes.length; i ++) {
      var container = Akahuku.getMessageContainer (nodes [i]);
      
      if (!container) {
        /* スレ */
                
        if (lastReply && thread) {
          node = lastReply;
          lastReply = null;
          while (node) {
            nodeName = node.nodeName.toLowerCase ();
                        
            if (nodeName == "#text") {
              if (node.nodeValue.indexOf ("No.") != -1
                  && node.nodeValue.match (/No\.([0-9]+)/)) {
                /* レス番号の場合 */
                thread.lastNum = parseInt (RegExp.$1);
                break;
              }
            }
                        
            node = node.previousSibling;
          }
          arAkahukuSidebar.updateThreadItem (thread);
          thread = null;
        }
                
        node = nodes [i];
                
        num = 0;
        comment = node.innerHTML;
                
        reply = 0;
        expire = "";
        warning = "";
                
        imageSrc = "";
        imageLink = "";
        imageNum = 0;
        imageWidth = 0;
        imageHeight = 0;
        imageBytes = 0;
        imageExt = "";
                
        threadLink = "";
                
        while (node) {
          nodeName = node.nodeName.toLowerCase ();
          if (nodeName == "hr") {
            break;
          }
                    
          if (nodeName == "#text") {
            if (num == 0
                && node.nodeValue.indexOf ("No.") != -1
                && node.nodeValue.match (/No\.([0-9]+)/)) {
              /* スレ番号の場合 */
              num = parseInt (RegExp.$1);
            }
          }
          else if (nodeName == "a") {
            var href;
            href = node.getAttribute ("href");
                        
            if (href) {
              if (href.match (/^res\/([0-9]+)\.html?$/)
                  || href.match (/^2\/([0-9]+)\.html?$/)
                  || href.match (/^b\/([0-9]+)\.html?$/)
                  || href.match (/\?res=([0-9]+)$/)) {
                /* スレへのリンク */
                threadLink = node.href;
              }
              else if (href.match (/red\/([0-9]+)/)
                       || href.match (/d\/([0-9]+)/)
                       || href.match (/src\/([0-9]+)/)
                       || href.match (/r\.php\?r=([0-9]+)/)) {
                /* 画像のリンクの場合 */
                imageLink = node.href;
                imageNum = parseInt (RegExp.$1);
                                
                if (node.firstChild) {
                  if (node.firstChild.nodeName.toLowerCase ()
                      == "img") {
                    /* 画像の場合 */
                                        
                    imageSrc = node.firstChild.src;
                                        
                    imageWidth = node.firstChild.width;
                    imageHeight = node.firstChild.height;
                    if ("alt" in node.firstChild
                        && node.firstChild.alt
                        .match (/([0-9]*)/)) {
                      imageBytes = parseInt (RegExp.$1);
                    }
                    else {
                      imageBytes = 0;
                    }
                  }
                  else if (node.firstChild.nodeValue
                           && node.firstChild.nodeValue
                           .match (/[0-9]+\.(.+)$/)) {
                    /* 画像のファイル名の場合 */
                    imageExt = RegExp.$1;
                  }
                }
              }
            }
          }
          else if (nodeName == "small") {
            if (node.innerHTML.match
                (/(([0-9]+\u5E74)?([0-9]+\u6708)?([0-9]+\u65E5)?[0-9]+:[0-9]+)\u9803\u6D88\u3048\u307E\u3059/)) {
              expire = RegExp.$1;
            }
          }
                    
          node = node.previousSibling;
        }
                
        node = nodes [i];

        while (node) {
          nodeName = node.nodeName.toLowerCase ();
          
          if (nodeName == "hr"
              || nodeName == "table"
              || (nodeName == "div"
                  && "className" in node
                  && arAkahukuDOM.hasClassName (node, "s"))) {
            break;
          }
                    
          if (nodeName == "font") {
            if (node.innerHTML.match
                (/\u30EC\u30B9([0-9]+)\u4EF6\u7701\u7565/)) {
              reply = parseInt (RegExp.$1);
            }
            else if (node.innerHTML.match
                     (/<b>\u3053\u306E\u30B9\u30EC\u306F[^<]+<\/b>/i)) {
              warning = node.innerHTML;
            }
          }
                    
          node = node.nextSibling;
        }
                
        if (name.match (/cgi_(b|9|10)/)
            && imageSrc) {
          imageSrc = imageSrc.replace (/img\.2chan\.net/,
                                       "cgi.2chan.net");
        }
                
        if (threadLink == "") {
          threadLink = targetDocument.location.href;
        }
                
        thread = {
          type: "normal",
          boardName: name,
          num: num,
          reply: reply,
          threadLink: threadLink,
          imageSrc: imageSrc,
          imageSrcType: 1,
          imageNum: imageNum,
          imageLink: imageLink,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
          imageBytes: imageBytes,
          imageExt: imageExt,
          comment: comment,
          expire: expire,
          warning: warning,
          lastNum: num,
        };
      }
      else {
        /* レス */
        if (thread) {
          thread.reply ++;
                    
          lastReply = nodes [i];
        }
      }
    }
        
    if (lastReply && thread) {
      node = lastReply;
      lastReply = null;
      while (node) {
        nodeName = node.nodeName.toLowerCase ();
                
        if (nodeName == "#text") {
          if (node.nodeValue.indexOf ("No.") != -1
              && node.nodeValue.match (/No\.([0-9]+)/)) {
            /* レス番号の場合 */
            thread.lastNum = parseInt (RegExp.$1);
            break;
          }
        }
                
        node = node.previousSibling;
      }
    }
    if (thread) {
      arAkahukuSidebar.updateThreadItem (thread);
    }
  },
    
  /**
   * レス送信モードをロードしたイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String name
   *         対象の板
   */
  onReplyLoad : function (targetDocument, name) {
    arAkahukuSidebar.onNormalLoad (targetDocument, name);
  },
    
  /**
   * カタログをロードしたイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String name
   *         対象の板
   */
  onCatalogLoad : function (targetDocument, name) {
    var thread = null;
    var node, nodeName, node2, nodeName2;
    var threadLink;
        
    var num;
    var reply;
    var imageSrc, imageNum;
    var imageSrcType;
    var comment;
        
    var nodes = targetDocument.getElementsByTagName ("td");
    if (nodes.length > 0) {
      arAkahukuSidebar.resetCatalogOrder (name);
    }
    for (var i = 0; i < nodes.length; i ++) {
      node = nodes [i].firstChild;
            
      num = 0;
            
      reply = 0;
      imageNum = 0;
      imageSrc = "";
      comment = "";
            
      threadLink = "";
            
      while (node) {
        nodeName = node.nodeName.toLowerCase ();
                
        if (nodeName == "a") {
          var href;
          href = node.getAttribute ("href");
          if (href
              && (href.match (/res\/([0-9]+)/)
                  || href.match (/2\/([0-9]+)/)
                  || href.match (/b\/([0-9]+)/))) {
            num = parseInt (RegExp.$1);
            threadLink = node.href;
                        
            node2 = node.firstChild;
                        
            while (node2) {
              nodeName2 = node2.nodeName.toLowerCase ();
                            
              if (nodeName2 == "img") {
                if (node2.getAttribute ("src")
                    .match (/cat\/([0-9]+)/)) {
                  imageNum = parseInt (RegExp.$1);
                  imageSrc = node2.src;
                  imageSrcType = 2;
                }
                else if (node2.getAttribute ("src")
                    .match (/\/thumb\/([0-9]+)/)) {
                  // 画像サイズ大(含1-5)
                  imageNum = parseInt (RegExp.$1);
                  imageSrc = node2.src;
                  imageSrcType = 1;
                }
              }
              if (nodeName2 == "font") {
                if (node2.innerHTML.match (/^(?:(\d+)|\((\d+)\))$/)) {
                  reply = parseInt (RegExp.$1 || RegExp.$2);
                }
              }
                            
              node2 = node2.nextSibling;
            }
          }
        }
        else if (nodeName == "small") {
          if (!comment) {
            // 合間合間に等の追加要素で上書きされないように
            comment = node.textContent;
          }
        }
        else if (nodeName == "font") {
          if (node.innerHTML.match (/^(?:(\d+)|\((\d+)\))$/)) {
            reply = parseInt (RegExp.$1 || RegExp.$2);
          }
        }
                
        node = node.nextSibling;
      }

      // amazon 広告の td 避け
      if (num == 0) {
        continue;
      }
            
      arAkahukuSidebar.updateThreadItem ({
        type: "catalog",
        boardName: name,
        num: num,
        reply: reply,
        threadLink: threadLink,
        imageSrc: imageSrc,
        imageSrcType: imageSrcType,
        imageNum: imageNum,
        comment: comment,
        lastNum: num,
        catalogOrder: i + 1, // 1...N
      });
    }
  },
    
  /**
   * スレが消滅したイベント
   *
   * @param  String name
   *         対象の板
   * @param  Number num
   *         スレの番号
   */
  onThreadExpired : function (name, num) {
    var thread = null;
    var board = null;
        
    var exists = false;
    for (var i = 0; i < arAkahukuSidebar.list.length; i ++) {
      if (name == arAkahukuSidebar.list [i].replace (/:/, "_")) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      return;
    }
        
    arAkahukuSidebar.updateThreadItem ({
      type: "expired",
      boardName: name,
      num: num,
    });
  },
    
  /**
   * スレを更新したイベント
   *
   * @param  String name
   *         対象の板
   * @param  Number num
   *         スレの番号
   * @param  Number reply
   *         レス数
   *         null ならば変更ナシ
   * @param  String expire
   *         消滅時刻
   *         null ならば変更ナシ
   * @param  String warning
   *         消滅情報
   *         null ならば変更ナシ
   * @param  Number lastNum
   *         最終レス番号
   *         null ならば変更ナシ
   */
  onThreadChange : function (name, num, reply, expire, warning, lastNum) {
    var thread = null;
    var board = null;
        
    var exists = false;
    for (var i = 0; i < arAkahukuSidebar.list.length; i ++) {
      if (name == arAkahukuSidebar.list [i].replace (/:/, "_")) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      return;
    }
        
    arAkahukuSidebar.updateThreadItem ({
      type: "changed",
      boardName: name,
      num: num,
      reply: reply || -1,
      expire: expire || "",
      warning: warning || "",
      lastNum: lastNum || -1,
    });
        
    arAkahukuSidebar.asyncUpdateVisited (name, function () {
      arAkahukuSidebar.sort (name);
      arAkahukuSidebar.update (name);
      if (arAkahukuSidebar.enableMarked) {
        arAkahukuSidebar.sort ("*_*");
        arAkahukuSidebar.update ("*_*");
      }
    });
  },
    
  /**
   * 既読フラグを更新する
   *
   * @param  String name
   *         対象の板
   * @param  Function callback
   */
  asyncUpdateVisited : function (name, callback) {
    var board, thread, vc;
    var cblist = new arAkahukuMergeItemCallbackList ();
    var threadcb = function (uri, visited) {
      this.wrappedObject.isVisited = visited;
    };
        
    if (name in arAkahukuSidebar.boards) {
      board = arAkahukuSidebar.boards [name];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      arAkahukuSidebar.boards [name] = board;
    }
        
    for (var i = 0; i < board.threads.length; i ++) {
      thread = board.threads [i];
      vc = cblist.createVisitedCallback (thread);
      vc.isVisitedHandler = threadcb;
      arAkahukuCompat.AsyncHistory
        .isURIVisited (thread.threadLinkURIObject, vc);
    }

    cblist.asyncWaitRequests (callback);
  },
    
  /**
   * ソートする
   *
   * @param  String name
   *         対象の板
   */
  sort : function (name) {
    var board;
        
    if (name in arAkahukuSidebar.boards) {
      board = arAkahukuSidebar.boards [name];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      arAkahukuSidebar.boards [name] = board;
    }
        
    if (name != "*_*") {
      var max = 0;
      for (var i = 0; i < board.threads.length; i ++) {
        if (board.threads [i].num > max) {
          max = board.threads [i].num;
        }
      }
      // 板全体の最新のレスを反映・更新する
      var infoName = name.replace (/_/, ":");
      arAkahukuBoard.updateNewestNum (infoName, max);
      max = arAkahukuBoard.getNewestNum (infoName) || max;
      // 板の保存数を考慮して自動的に expired フラグを立てる
      var savedNum
        = (arAkahukuBoard.knows (infoName)
        ? arAkahukuBoard.getMaxNum (infoName) : 10000);
      var reddenNum = max - 0.9 * savedNum;
      var expireNum = max - savedNum;
      for (var i = 0; i < board.threads.length; i ++) {
        if (board.threads [i].num < expireNum) {
          if (!board.threads [i].isExpired) {
            board.threads [i].isExpired = true;
            board.threads [i].warning = ""; // 消滅後は赤字にしない
          }
        }
        else if (board.threads [i].num < reddenNum) {
          // 赤字が出ていそうなスレを自動的に赤く
          if (!board.threads [i].warning) {
            board.threads [i].warning = "?";//なんでもいい
            if (!board.threads [i].expire) {
              //消滅時刻は不明だが赤字
              board.threads [i].expire = "??:??";
            }
          }
        }
      }
    }
        
    board.threads.sort (function (x, y) {
        var result = 0;
        /* 消えたスレは後にする */
        if (x.isExpired && !y.isExpired) {
          result += 100;
        }
        else if (!x.isExpired && y.isExpired) {
          result += -100;
        }
        if (arAkahukuSidebar.enableSortVisited) {
          /* 既読のスレを先頭に持ってくるか */
          if (x.isVisited && !y.isVisited) {
            result += -1;
          }
          else if (!x.isVisited && y.isVisited) {
            result += 1;
          }
        }
        if (arAkahukuSidebar.enableSortMarked) {
          /* マークしたスレを先頭に持ってくるか */
          if (x.isMarked && !y.isMarked) {
            result += -10;
          }
          else if (!x.isMarked && y.isMarked) {
            result += 10;
          }
        }
        if (result) {
          return result;
        }
        ; /* switch のインデント用 */
        switch (arAkahukuSidebar.sortType) {
          case 0:
            return (y.num - x.num);
          case 1:
            return (y.lastNum - x.lastNum);
          case 2:
            return -(y.num - x.num);
          case 3:
            return (y.reply - x.reply);
          case 4:
            return -(y.reply - x.reply);
          case 5:
            if (!y.catalogOrder && !x.catalogOrder) return 0;
            if (!y.catalogOrder) return -1;
            if (!x.catalogOrder) return 1;
            return -(y.catalogOrder - x.catalogOrder);
          case 6:
            if (y.lastReply == -1 && x.lastReply == -1) return 0;
            if (y.lastReply == -1) return -1;
            if (x.lastReply == -1) return 1;
            return ((y.reply - y.lastReply) - (x.reply - x.lastReply));
        }
        return 0;
      });
        
    if (board.threads.length > arAkahukuSidebar.maxCache) {
      board.threads.splice (arAkahukuSidebar.maxCache);
    }
        
    if (arAkahukuSidebar.sortInvert) {
      board.threads = board.threads.reverse ();
    }

    board._sortSign = arAkahukuSidebar._getSortConfigSignature ();
  },

  _getSortConfigSignature : function () {
    return "sort"
      + arAkahukuSidebar.sortType
      + (arAkahukuSidebar.sortInvert ? "1" : "0")
      + (arAkahukuSidebar.enableSortVisited ? "1" : "0")
      + (arAkahukuSidebar.enableSortMarked  ? "1" : "0");
  },

  /**
   * 全スレのカタログ順の情報をリセットする
   */
  resetCatalogOrder : function (name) {
    if (!(name in arAkahukuSidebar.boards)) {
      return;
    }
    var board = arAkahukuSidebar.boards [name];
    if (board && board.threads) {
      for (var i = 0; i < board.threads.length; i ++) {
        board.threads [i].catalogOrder = 0;
      }
    }
  },
    
  /**
   * 
   */
  updateMarked : function () {
    var markedBoard = arAkahukuSidebar.boards ["*_*"];
        
    markedBoard.threads = new Array ();
    for (var name in arAkahukuSidebar.boards) {
      var board = arAkahukuSidebar.boards [name];
      for (var i = 0; i < board.threads.length; i ++) {
        var thread = board.threads [i];
        if (thread.isMarked) {
          markedBoard.threads.push (thread);
        }
      }
    }
  },
    
  /**
   * サイドバーを更新する
   *
   * @param  String name
   *         対象の板
   * @param  XULDocuemtn sidebarDocuemtn
   *         (optional) 対象のサイドバードキュメント
   */
  update : function (name, sidebarDocument) {
    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuConfig.loadPrefBranch ();
      arAkahukuSidebar.getConfig ();
    }
        
    if (!sidebarDocument) { // 互換性のため
      sidebarDocument
        = arAkahukuSidebar.getSidebarDocument ("viewAkahukuSidebar");
    }
    if (!sidebarDocument) {
      Akahuku.debug.log ("Sidebar.update: no sidebar document");
      return;
    }
    var iframe
    = sidebarDocument.getElementById ("akahuku_sidebar_iframe_" + name);
    if (iframe == null) {
      return;
    }
    var div;
    var node, node2, nodes;
    var targetDocument = iframe.contentDocument;
    var board, thread;
    var server, dir, hide, aima;
        
    if (name.match (/^([^_]+)_(.+)$/)) {
      server = RegExp.$1;
      dir = RegExp.$2;
    }
        
    if (iframe.getAttribute ("__modified") != "true") {
      /* 最初の更新でクリックをフックする */
      iframe.setAttribute ("__modified", "true");
      iframe.addEventListener
      ("mousemove", arAkahukuSidebar.onMouseMove, false);
      iframe.addEventListener
      ("mousedown", arAkahukuSidebar.onClick, false);
      iframe.addEventListener
      ("mouseout", arAkahukuSidebar.onMouseOut, false);
    }
        
    if (name in arAkahukuSidebar.boards) {
      board = arAkahukuSidebar.boards [name];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      arAkahukuSidebar.boards [name] = board;
    }
        
    if (targetDocument.body == null) {
      return;
    }

    function getBGColorForThread (thread) {
      if (thread.isVisited) {
        return thread.isExpired ? "#cc9977" : "#eeaa88";
      }
      else {
        return thread.isExpired ? "#99bbdd" : "#aaccff";
      }
    }
        
    arAkahukuSidebar.setIframeHtmlStyle (targetDocument);
    arAkahukuDOM.setText (targetDocument.body, null);
        
    var hidden = 0;
    var i, j;
    for (i = 0;
         i < board.threads.length
           && i - hidden < arAkahukuSidebar.maxView;
         i ++) {
      thread = board.threads [i];
            
      aima = false;
      try {
        if (typeof Aima_Aimani != "undefined") {
          if (Aima_Aimani.hideNGNumberSidebarHandler) {
            hide
              = Aima_Aimani.hideNGNumberSidebarHandler
              (server, dir,
               thread.num,
               thread.comment,
               thread.imageNum,
               thread.imageWidth, thread.imageHeight,
               thread.imageBytes, thread.imageExt);
            if (hide == 1) {
              hidden ++;
              continue;
            }
            else if (hide == 2) {
              aima = true;
            }
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
            
      var ok = true;
            
      try {
        if (thread.node == null) {
          ok = false;
        }
        else {
          div = thread.node;
                    
          div.style.borderColor = getBGColorForThread (thread);
                    
          nodes = div.getElementsByTagName ("img");
          if (nodes && nodes.length >= 1) {
            node = nodes [0];
            node.style.visibility = "";
            var src = thread.imageSrc;
            src = arAkahukuP2P.tryEnP2P (src);
            if (thread.isExpired && !arAkahukuP2P.enable) {
              src = Akahuku.protocolHandler.enAkahukuURI ("cache", src);
            }
            if (node.src != src
                || !node.complete) {
              node.src = src;
            }
                        
            if (thread.imageLink) {
              node.setAttribute ("__link", thread.imageLink);
            }
          }
                    
          nodes = div.getElementsByTagName ("div");
          if (nodes && nodes.length >= 1) {
            for (j = 0; j < nodes.length; j ++) {
              node = nodes [j];
              if ("className" in node) {
                if (node.className
                    == "akahuku_sidebar_comment") {
                  /* thread.comment に HTML が含まれるので
                   * innerHTML を使用する  */
                  // node.innerHTML = thread.comment;
                  // [SECURITY] chrome への読込はサニタイズが必要
                  if (thread.comment) {
                    arAkahukuDOM.setInnerHTMLSafely (node, thread.comment);
                    node.style.removeProperty ("color");
                    // リンクは不要 ([広告]対策)
                    (function (node) {
                      var nodes = node.getElementsByTagName ("a");
                      for (var i = 0; i < nodes.length; i ++) {
                        nodes [i].removeAttribute ("href");
                      }
                    })(node);
                  }
                  else if (thread.commentInCatalog) {
                    node.textContent = thread.commentInCatalog;
                    node.style.color = "#aa8888";
                  }
                  node.style.visibility = "";
                }
                else if (node.className
                         == "akahuku_sidebar_status") {
                  node.style.backgroundColor
                    = getBGColorForThread (thread);
                }
              }
            }
          }
                    
          nodes = div.getElementsByTagName ("span");
          if (nodes && nodes.length >= 1) {
            for (j = 0; j < nodes.length; j ++) {
              node = nodes [j];
              if ("className" in node) {
                if (node.className == "akahuku_sidebar_reply") {
                  var text = "";
                  text += thread.reply + " \u30EC\u30B9";
                  if (thread.lastReply != -1) {
                    var diff
                      = thread.reply - thread.lastReply;
                    if (diff > 0) {
                      text += "(+" + diff + ")";
                    }
                    else if (diff < 0) {
                      text += "(" + diff + ")";
                    }
                  }
                  arAkahukuDOM.setText (node, text);
                }
                else if (node.className
                         == "akahuku_sidebar_expire2") {
                  if (thread.expire) {
                    arAkahukuDOM.setText (node, " \uFF0F ");
                  }
                }
                else if (node.className
                         == "akahuku_sidebar_expire") {
                  arAkahukuDOM.setText (node, thread.expire);
                  if (thread.warning) {
                    node.style.fontWeight = "bold";
                    node.style.color = "#ff0000";
                  }
                  else {
                    node.style.removeProperty ("font-weight");
                    node.style.removeProperty ("color");
                  }
                }
                else if (node.className
                         == "akahuku_sidebar_aima") {
                  if (aima) {
                    arAkahukuDOM.setText (node, " [\u6D88]");
                    node.style.display = "";
                  }
                  else {
                    node.style.display = "none";
                  }
                }
                else if (node.className
                         == "akahuku_sidebar_mark") {
                  if (thread.isMarked) {
                    node.style.display = "";
                  }
                  else {
                    node.style.display = "none";
                  }
                }
              }
            }
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        ok = false;
      }
            
      if (!ok) {
        div = targetDocument.createElement ("div");
        div.className = "akahuku_sidebar_thread";
        div.style.borderColor = getBGColorForThread (thread);
        div.setAttribute ("__link", thread.threadLink);
        div.setAttribute ("__num", thread.num);
                
        if (thread.imageNum) {
          div.setAttribute ("__image", thread.imageSrcType);
          node = targetDocument.createElement ("img");
          node.className = "akahuku_sidebar_image";
          var src = thread.imageSrc;
          src = arAkahukuP2P.tryEnP2P (src);
          if (thread.isExpired && !arAkahukuP2P.enable) {
            src = Akahuku.protocolHandler.enAkahukuURI ("cache", src);
          }
          node.src = src;
          if (thread.imageLink) {
            node.setAttribute ("__link", thread.imageLink);
          }
          div.appendChild (node);
        }
                
        node = targetDocument.createElement ("span");
        node.className = "akahuku_sidebar_mark";
        node.appendChild (targetDocument.createTextNode ("orz"));
        if (!thread.isMarked) {
          node.style.display = "none";
        }
        div.appendChild (node);
                
        node = targetDocument.createElement ("div");
        node.className = "akahuku_sidebar_comment";
        /* thread.comment に HTML が含まれるので innerHTML を使用する  */
        // node.innerHTML = thread.comment;
        // [SECURITY] chrome への読込はサニタイズが必要
        if (thread.comment) {
          arAkahukuDOM.setInnerHTMLSafely (node, thread.comment);
          node.style.removeProperty ("color");
          // リンクは不要 ([広告]対策)
          (function (node) {
            var nodes = node.getElementsByTagName ("a");
            for (var i = 0; i < nodes.length; i ++) {
              nodes [i].removeAttribute ("href");
            }
          })(node);
        }
        else if (thread.commentInCatalog) {
          node.textContent = thread.commentInCatalog;
          node.style.color = "#aa8888";
        }
        div.appendChild (node);
                
        node = targetDocument.createElement ("div");
        node.className = "akahuku_sidebar_status";
        node.style.backgroundColor = getBGColorForThread (thread);
        node2 = targetDocument.createElement ("span");
        node2.className = "akahuku_sidebar_reply";
        var text = "";
        text += thread.reply + " \u30EC\u30B9";
        if (thread.lastReply != -1) {
          var diff = thread.reply - thread.lastReply;
          if (diff > 0) {
            text += "(+" + diff + ")";
          }
          else if (diff < 0) {
            text += "(" + diff + ")";
          }
        }
        node2.appendChild (targetDocument.createTextNode (text));
        node.appendChild (node2);
        node2 = targetDocument.createElement ("span");
        node2.className = "akahuku_sidebar_expire2";
        if (thread.expire) {
          node2.appendChild (targetDocument.createTextNode
                             (" \uFF0F "));
        }
        node.appendChild (node2);
        node2 = targetDocument.createElement ("span");
        node2.className = "akahuku_sidebar_expire";
        if (thread.warning) {
          node2.style.fontWeight = "bold";
          node2.style.color = "#ff0000";
        }
        node2.appendChild (targetDocument.createTextNode
                           (thread.expire));
        node.appendChild (node2);
        node2 = targetDocument.createElement ("span");
        node2.className = "akahuku_sidebar_aima";
        node2.setAttribute ("name",
                            "hide_" + server + "_" + dir
                            + "_" + thread.num + "_" + thread.imageNum);
        node2.style.color = "#627f29";
        node2.appendChild (targetDocument.createTextNode (" [\u6D88]"));
        if (!aima) {
          node2.style.display = "none";
        }
        node.appendChild (node2);
        div.appendChild (node);
                
        thread.node = div;
      }
            
      if (name == "*_*") {
        targetDocument.body.appendChild (div.cloneNode (true));
      }
      else {
        targetDocument.body.appendChild (div);
      }
    }

    // 更新時の設定保存
    targetDocument.body.setAttribute ("__sort", board._sortSign);
    targetDocument.body.setAttribute ("__maxview", arAkahukuSidebar.maxView);
  },

  /**
   * スレ一覧のスタイルを更新
   *
   * @param Document 対象iframeのcontentDocument
   */
  setIframeHtmlStyle : function (targetDocument) {
    var style = targetDocument.getElementById ("headstyle");
    if (!style) {
      Akahuku.debug.error ("no #headstyle in " + targetDocument);
      return;
    }
    var styleText = "";
    var size = arAkahukuSidebar.thumbnailSize;
    styleText += "div.akahuku_sidebar_thread {"
      + "height: " + (size + 2) + "px;"
      + "}\n";
    styleText += "div.akahuku_sidebar_comment {"
      + "height: " + (size - 10) + "px;"
      + "}\n";
    styleText += "div.akahuku_sidebar_thread[__image]"
      + " div.akahuku_sidebar_comment ,"
      + "div.akahuku_sidebar_thread[__image]"
      + " div.akahuku_sidebar_status {"
      + "margin-left: " + (size + 2) + "px;"
      + "}\n";
    styleText += "img.akahuku_sidebar_image {"
      + "max-width: " + size + "px;"
      + "max-height: " + size + "px;"
      + "}\n";
    style.textContent = styleText;
  },

  /**
   * 設定の変更をサイドバーに反映する [XUL]
   */
  updateSidebarByConfig : function () {
    var sidebarDocument
      = arAkahukuSidebar.getSidebarDocument ("viewAkahukuSidebar");
    if (!sidebarDocument) {
      return;
    }
    if (!arAkahukuSidebar.enable) {
      var container
      = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
      if (container) {
        // !enable に変更された
        sidebarDocument.location.reload ();
        return;
      }
      return;
    }
    else {
      var container
      = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
      if (!container) {
        // !enable で開かれて内容が空
        sidebarDocument.location.reload ();
        return;
      }
    }

    // タブ増減・順序変更は再読み込みで対応
    var markedTab
      = sidebarDocument.getElementById ("akahuku_sidebar_tab_*_*");
    if ((markedTab && !arAkahukuSidebar.enableMarked) ||
        (!markedTab && arAkahukuSidebar.enableMarked)) {
      sidebarDocument.location.reload ();
      return;
    }
    var tabs = sidebarDocument.getElementsByClassName ("tab");
    for (var i = 0; i < arAkahukuSidebar.list.length; i ++) {
      var name = arAkahukuSidebar.list [i].replace (/:/, "_");
      if (!(i < tabs.length) ||
          tabs [i].id !== "akahuku_sidebar_tab_" + name) {
        sidebarDocument.location.reload ();
        return;
      }
    }
    for (var i = 0; i < tabs.length; i ++) {
      if (tabs [i].id == "akahuku_sidebar_tab_*_*") continue;
      var name = tabs [i].id
        .replace (/^akahuku_sidebar_tab_([^_]+)_([^_]+)$/, "$1:$2");
      if (arAkahukuSidebar.list.indexOf (name) == -1) {
        // タブが削除された
        sidebarDocument.location.reload ();
        return;
      }
    }

    // タブの見た目
    var container
    = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
    if (arAkahukuSidebar.enableTabVertical) {
      container.parentNode.orient = "horizontal";
      container.orient = "vertical";
    }
    else {
      container.parentNode.orient = "vertical";
      container.orient = "horizontal";
    }
    container.hidden = arAkahukuSidebar.enableTabHidden;
    container.enableMenuButton = arAkahukuSidebar.enableTabMenu;

    // カタログ更新UI (更新まではしない)
    arAkahukuSidebar.updateCatalogRefreshUI ();

    // ソート順UI (更新は後で)
    arAkahukuSidebar.updateSortOrderUI ();

    // IframeHtml
    var sortSign = arAkahukuSidebar._getSortConfigSignature ();
    var iframes
      = sidebarDocument.getElementsByClassName ("akahuku_sidebar_iframe");
    try {
      for (var i = 0; i < iframes.length; i ++) {
        var name = iframes [i].id.replace (/^akahuku_sidebar_iframe_/, "");
        var targetDocument = iframes [i].contentDocument;
        var styleUpdated = false;
        var sorted = false;
        if (targetDocument.body.getAttribute ("__sort") != sortSign) {
          arAkahukuSidebar.sort (name);
          sorted = true;
        }
        if (sorted ||
            targetDocument.body.getAttribute ("__maxview")
            != arAkahukuSidebar.maxView) {
          arAkahukuSidebar.update (name);
          styleUpdated = true;
        }
        if (!styleUpdated) {
          arAkahukuSidebar.setIframeHtmlStyle (targetDocument);
        }
      }
    }
    catch (e) {
      Akahuku.debug.exception (e);
    }
  },

  updateSortOrderUI : function () {
    var sidebarDocument
      = arAkahukuSidebar.getSidebarDocument ("viewAkahukuSidebar");
    if (!sidebarDocument) {
      Akahuku.debug.warn ("no sidebar!");
      return;
    }

    // ソート順選択表示のラベル
    var buttons
      = sidebarDocument.getElementsByClassName ("sortorder_menu");
    for (var i = 0; i < buttons.length; i ++) {
      buttons [i].label = arAkahukuSidebar.getSortTypeLabel ();
    }

    // コンテクストメニューの選択
    var ids = [
      "akahuku-sidebar-popup-sort-num",
      "akahuku-sidebar-popup-sort-lastnum",
      "akahuku-sidebar-popup-sort-old",
      "akahuku-sidebar-popup-sort-reply-most",
      "akahuku-sidebar-popup-sort-reply-least",
      "akahuku-sidebar-popup-sort-catalog-order",
      "akahuku-sidebar-popup-sort-reply-delta-most",
    ];
    var id = ids [arAkahukuSidebar.sortType];
    if (id) {
      var item = sidebarDocument.getElementById (id);
      if (item) {
        item.setAttribute ("checked", "true");
      }
    }

    // ソート順ポップアップの選択
    var ids = [
      "akahuku-sidebar-sortorder-popup-num",
      "akahuku-sidebar-sortorder-popup-lastnum",
      "akahuku-sidebar-sortorder-popup-old",
      "akahuku-sidebar-sortorder-popup-reply-most",
      "akahuku-sidebar-sortorder-popup-reply-least",
      "akahuku-sidebar-sortorder-popup-catalog-order",
      "akahuku-sidebar-sortorder-popup-reply-delta-most",
    ];
    var id = ids [arAkahukuSidebar.sortType];
    if (id) {
      var item = sidebarDocument.getElementById (id);
      if (item) {
        item.setAttribute ("checked", "true");
      }
    }
  },
    
  /**
   * マウスが動いたイベント
   *   スレの上にあれば色を変える
   *
   * @param  Event event
   *         対象のイベント
   */
  onMouseMove : function (event) {
    var sidebarDocument
      = arAkahukuSidebar._getDocumentsOnEvent (event).sidebar;
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var box = deck.selectedPanel;

    // ポップアップメニュー表示中は選択を変えない
    var popup = sidebarDocument.getElementById ("akahuku-sidebar-popup");
    if ("state" in popup ? popup.state == "open" : popup.open) {
      return
    }
        
    if (box.id.match (/^akahuku_sidebar_deck_(.+)$/)) {
      var name = RegExp.$1;
      var board;
            
      if (name in arAkahukuSidebar.boards) {
        board = arAkahukuSidebar.boards [name];
      }
      else {
        board = new arAkahukuSidebarBoard ();
        arAkahukuSidebar.boards [name] = board;
      }
            
      var node = event.explicitOriginalTarget;
      var image = null;
      while (node) {
        if ("className" in node) {
          if (node.className == "akahuku_sidebar_thread") {
            if (node != board.lastSelected) {
              if (board.lastSelected) {
                board.lastSelected.style.backgroundColor
                  = "transparent";
              }
              board.lastSelected = node;
              node.style.backgroundColor = "#d4e5f6";
            }
            break;
          }
          else if (node.className == "akahuku_sidebar_image"
                   && node.getAttribute ("__link")) {
            if (node != board.lastSelectedImage) {
              if (board.lastSelectedImage) {
                board.lastSelectedImage.style.borderColor
                  = "transparent";
              }
              board.lastSelectedImage = node;
              node.style.borderColor = "#0000ff";
            }
            image = node;
          }
        }
        node = node.parentNode;
      }
            
      if (image == null) {
        if (board.lastSelectedImage) {
          board.lastSelectedImage.style.borderColor = "transparent";
          board.lastSelectedImage = null;
        }
      }
    }
  },
    
  /**
   * マウスがフレームから出たイベント
   */
  onMouseOut : function (event) {
    if (event.eventPhase != Event.AT_TARGET) {
      return;
    }
    var sidebarDocument
      = arAkahukuSidebar._getDocumentsOnEvent (event).sidebar;

    // ポップアップメニュー表示中は非選択状態にはしない
    var popup = sidebarDocument.getElementById ("akahuku-sidebar-popup");
    if ("state" in popup ? popup.state == "open" : popup.open) {
      return
    }
    arAkahukuSidebar.unselectThread (sidebarDocument);
  },

  /**
   * スレを非選択状態にする
   */
  unselectThread : function (sidebarDocument) {
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var box = deck.selectedPanel;
    if (!box.id.match (/^akahuku_sidebar_deck_(.+)$/)) {
      return;
    }
    var name = RegExp.$1;
    if (!(name in arAkahukuSidebar.boards)) {
      return;
    }
    var board = arAkahukuSidebar.boards [name];
    if (board.lastSelected) {
      board.lastSelected.style.removeProperty ("background-color");
      board.lastSelected = null;
    }
    if (board.lastSelectedImage) {
      board.lastSelectedImage.style.removeProperty ("border-color");
      board.lastSelectedImage = null;
    }
  },
    
  /**
   * スレをクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onClick : function (event) {
    // カーソル下のスレを選択
    arAkahukuSidebar.onMouseMove (event);
    if (event.button != 0 && event.button != 1) {
      return;
    }
        
    var node = event.target;
    var nodes, div;
    var link = "";
    var i;
        
    while (node) {
      if ("getAttribute" in node) {
        link = node.getAttribute ("__link");
                
        if (link) {
          var targetBrowser = null;
          var tab = null;
          var tabbrowser = document.getElementById ("content");
          if ("tabs" in tabbrowser) {
            /* Firefox4/Gecko2.0 */
            for (i =0; i < tabbrowser.tabs.length; i++) {
              tab = tabbrowser.tabs [i];
              var browser = tabbrowser.getBrowserForTab (tab);
              if (browser.currentURI.spec == link) {
                targetBrowser = browser;
                break;
              }
              tab = null;
            }
          }
          else if (tabbrowser.mTabContainer) {
            for (i = 0;
                 i < tabbrowser.mTabContainer.childNodes.length;
                 i ++) {
              tab = tabbrowser.mTabContainer.childNodes [i];
              var targetDocument
                = tab.linkedBrowser.contentDocument;
              if (targetDocument.location.href == link) {
                targetBrowser = tab.linkedBrowser;
                break;
              }
              tab = null;
            }
          }
          if (tab == null) {
            tab = tabbrowser.addTab (link);
            tabbrowser.selectedTab = tab;
          }
          else if (targetBrowser) {
            setTimeout (function () {
              // click イベント終了後にタブ切替をしないと
              // visibilitychange が生じない
              tabbrowser.selectedTab = tab;
              arAkahukuSidebar.updateThreadForBrowser
                (targetBrowser, arAkahukuSidebar.afterThreadClick);
            }, 0);
          }
          break;
        }
      }
      if ("className" in node) {
        if (node.className == "akahuku_sidebar_aima") {
          var method, server, dir, num, imageNum, name;
                    
          name = node.getAttribute ("name");
          if (name
              && name
              .match (/^([^_]+)_([^_]+)_([^_]+)_([^_]+)_(.+)$/)) {
            method = RegExp.$1;
            server = RegExp.$2;
            dir = RegExp.$3;
            num = parseInt (RegExp.$4);
            imageNum = parseInt (RegExp.$5);
                        
            div = node;
            while (div) {
              if ("className" in div
                  && div.className == "akahuku_sidebar_thread") {
                break;
              }
              div = div.parentNode;
            }
            if (!div) {
              return;
            }
                        
            try {
              if (typeof Aima_Aimani != "undefined") {
                if (Aima_Aimani.changeNGNumberSidebarHandler) {
                  Aima_Aimani.changeNGNumberSidebarHandler
                    (server, dir,
                     num, imageNum, method == "hide");
                }
              }
            }
            catch (e) { Akahuku.debug.exception (e);
            }
                        
            if (method == "hide") {
              node.setAttribute ("name",
                                 "show_" + server + "_" + dir
                                 + "_" + num + "_" + imageNum);
              arAkahukuDOM.setText (node, " [\u89E3]");
                            
              nodes = div.getElementsByTagName ("img");
              if (nodes && nodes.length >= 1) {
                node = nodes [0];
                node.style.visibility = "hidden";
                node.removeAttribute ("__link");
              }
                            
              nodes = div.getElementsByTagName ("div");
              if (nodes && nodes.length >= 1) {
                node = nodes [0];
                while (node) {
                  if (node.className
                      == "akahuku_sidebar_comment") {
                    node.style.visibility = "hidden";
                  }
                  node = node.nextSibling;
                }
              }
            }
            else {
              node.setAttribute ("name",
                                 "hide_" + server + "_" + dir
                                 + "_" + num + "_" + imageNum);
              arAkahukuDOM.setText (node, " [\u6D88]");
                            
              nodes = div.getElementsByTagName ("img");
              if (nodes && nodes.length >= 1) {
                node = nodes [0];
                node.style.visibility = "";
              }
                            
              nodes = div.getElementsByTagName ("div");
              if (nodes && nodes.length >= 1) {
                node = nodes [0];
                while (node) {
                  if (node.className
                      == "akahuku_sidebar_comment") {
                    node.style.visibility = "";
                  }
                  node = node.nextSibling;
                }
              }
            }
                        
            break;
          }
        }
      }
      node = node.parentNode;
    }
  },

  /**
   * スレを更新する
   */
  updateThreadForBrowser : function (browser, type) {
    switch (type) {
      case "reload":
        try {
          var flag
            = Components.interfaces
            .nsIWebNavigation.LOAD_FLAGS_NONE;
          browser.webNavigation.reload (flag)
        }
        catch (e if e.result == 0x805e000a) {
          // NS_ERROR_CONTENT_BLOCKED
          // (maybe by arAkahukuReload.enableHook)
        }
        catch (e) { Akahuku.debug.exception (e);
        }
        break;
      case "diff":
        arAkahukuReload.diffReloadForBrowser (browser, false);
        break;
      case "sync":
        arAkahukuReload.diffReloadForBrowser (browser, true);
        break;
      case "none":
      default:
    }
  },
    
  /**
   * 0 ページで更新をクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onRefresh0 : function (event) {
    if (event.target.id.match (/^akahuku_sidebar_refresh_0_(.+)$/)) {
      var name = RegExp.$1;
      var server, dir;
      if (name.match (/^([^_]+)_(.+)$/)) {
        server = RegExp.$1;
        dir = RegExp.$2;
      }
      var sidebarDocument = event.target.ownerDocument;
            
      var iframe
      = sidebarDocument
      .getElementById ("akahuku_sidebar_iframe2_" + name);
      //onload で about:blank へ戻す処理が失敗していたら
      if (iframe.getAttribute ("src") != "about:blank")
      iframe.setAttribute ("src", "about:blank");
      iframe.setAttribute ("src",
                           "http://" + server + ".2chan.net/"
                           + dir + "/futaba.htm");
      /* futaba: ふたば内でしか動作しないので外部には対応しない */
            
      var button;
      button
      = sidebarDocument
      .getElementById ("akahuku_sidebar_refresh_0_" + name);
      if (button) {
        button.setAttribute ("disabled", "true");
      }
      button
      = sidebarDocument
      .getElementById ("akahuku_sidebar_refresh_catalog_" + name);
      if (button) {
        button.setAttribute ("disabled", "true");
      }
    }
  },
    
  /**
   * カタログで更新をクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onRefreshCatalog : function (event) {
    if (event.target.id.match (/^akahuku_sidebar_refresh_catalog_(.+)$/)) {
      var name = RegExp.$1;
      var server, dir;
      if (name.match (/^([^_]+)_(.+)$/)) {
        server = RegExp.$1;
        dir = RegExp.$2;
      }
      var sidebarDocument = event.target.ownerDocument;
            
      var iframe
      = sidebarDocument
      .getElementById ("akahuku_sidebar_iframe2_" + name);
      //onload で about:blank へ戻す処理が失敗していたら
      if (iframe.getAttribute ("src") != "about:blank")
      iframe.setAttribute ("src", "about:blank");
      var param = "";
      var sortType = parseInt (event.target.getAttribute ("__catSort"));
      if (sortType > 0 && sortType <= 4) {
        param += "&sort=" + sortType;
      }
      iframe.setAttribute ("src",
                           "http://" + server + ".2chan.net/"
                           + dir + "/futaba.php?mode=cat" + param);
      /* futaba: ふたば内でしか動作しないので外部には対応しない */
            
      var button;
      button
      = sidebarDocument
      .getElementById ("akahuku_sidebar_refresh_0_" + name);
      if (button) {
        button.setAttribute ("disabled", "true");
      }
      button
      = sidebarDocument
      .getElementById ("akahuku_sidebar_refresh_catalog_" + name);
      if (button) {
        button.setAttribute ("disabled", "true");
      }
    }
  },

  onCommandCatalogPopup : function (event) {
    var menuitem = event.target;
    var type = menuitem.id.replace (/^akahuku-sidebar-catalog-popup-/, "");
    var sortType = 0;
    if (type == "cat") {
      sortType = 0;
    }
    else if (type.match (/^sort(\d+)$/)) {
      var num = parseInt (RegExp.$1) || 0;
      sortType = num;
    }
    else {
      Akahuku.debug.error ("unknwon sort type: " + type);
      return;
    }
    arAkahukuSidebar.refreshCatalogType = sortType;
    arAkahukuConfig
      .setIntPref ("akahuku.sidebar.refresh.catalog.type", sortType);
    // 全タブのボタンに変更を反映
    arAkahukuSidebar.updateCatalogRefreshUI ();
  },

  /**
   * カタログ種類の選択を設定に合わせて更新
   */
  updateCatalogRefreshUI : function () {
    var label = arAkahukuSidebar.getRefreshCatalogTypeLabel ();
    if (label.length == 2) {
      label = "\u30AB\u30BF" + label; // "カタ" +
    }
    var sidebarDocument = arAkahukuSidebar.getSidebarDocument ();
    if (!sidebarDocument) {
      return;
    }
    var buttons
      = sidebarDocument.getElementsByClassName ("refresh_catalog");
    for (var i = 0; i < buttons.length; i ++) {
      buttons [i].label = label;
      buttons [i].setAttribute ("__catSort", arAkahukuSidebar.refreshCatalogType);
    }
    // ポップアップメニューの選択を更新 (type="radio" autocheck="true")
    var ids = [
      "akahuku-sidebar-catalog-popup-cat",
      "akahuku-sidebar-catalog-popup-sort1",
      "akahuku-sidebar-catalog-popup-sort2",
      "akahuku-sidebar-catalog-popup-sort3",
      "akahuku-sidebar-catalog-popup-sort4",
    ];
    var id = ids [arAkahukuSidebar.refreshCatalogType];
    if (id) {
      var item = sidebarDocument.getElementById (id);
      if (item) {
        item.setAttribute ("checked", "true");
      }
    }
  },
    
  /**
   * スレ一覧用のフレームが読み込み完了したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onIframeHtmlLoad : function (event) {
    event.stopPropagation ();
    var docs = arAkahukuSidebar._getDocumentsOnEvent (event);
    var targetDocument = docs.content;
    var sidebarDocument = docs.sidebar;
    if (targetDocument.location.hash) {
      var name = targetDocument.location.hash.substr (1);
      arAkahukuSidebar.asyncUpdateVisited (name, function () {
        arAkahukuSidebar.sort (name);
        arAkahukuSidebar.update (name, sidebarDocument);
      });
    }
  },

  onIframeHtmlWheel : function (event) {
    if (event.target instanceof Components.interfaces.nsIDOMXULElement) {
      // Iframe 内要素を期待
      return;
    }
    if (event.ctrlKey &&
        !event.altKey && !event.metaKey && !event.shiftKey) {
      // Ctrl-wheel でサムネサイズを変更する
      event.preventDefault ();
      event.stopPropagation ();
      var targetDocument = event.target.ownerDocument;
      var nodes
        = targetDocument
        .getElementsByClassName ("akahuku_sidebar_thread");
      if (nodes.length == 0) {
        // 表示が変化しないので中止
        return;
      }
      var wheelDelta = (event.type === "wheel"
          ? event.deltaY
          : event.detail); // DOMMouseScroll
      var presize = arAkahukuSidebar.thumbnailSize;
      if (wheelDelta < 0) {
        arAkahukuSidebar.thumbnailSize += 2;
        if (arAkahukuSidebar.thumbnailSize > 250) {
          arAkahukuSidebar.thumbnailSize = 250;
        }
      }
      else if (wheelDelta > 0) {
        arAkahukuSidebar.thumbnailSize -= 2;
        if (arAkahukuSidebar.thumbnailSize < 8) {
          arAkahukuSidebar.thumbnailSize = 8;
        }
      }
      if (presize != arAkahukuSidebar.thumbnailSize) {
        arAkahukuSidebar.setIframeHtmlStyle (targetDocument);
        // 設定に保存(デバウンス)
        if (typeof arguments.callee._timerId !== "undefined") {
          targetDocument.defaultView
            .clearTimeout (arguments.callee._timerId);
        }
        arguments.callee._timerId
          = targetDocument.defaultView
          .setTimeout (function () {
            arAkahukuConfig.setIntPref
            ("akahuku.sidebar.thumbnail.size",
             arAkahukuSidebar.thumbnailSize);
          }, 300);
      }
    }
  },
    
  /**
   * 更新用のフレームが読み込み完了したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onIframe2Load : function (event) {
    event.stopPropagation (); //サイドバー以外で開いた場合対策
    var docs = arAkahukuSidebar._getDocumentsOnEvent (event);
    var targetDocument = docs.content;
    var sidebarDocument = docs.sidebar;
    if (!sidebarDocument) {
      return;
    }
    if (targetDocument.location.href.match
        (/^https?:\/\/([^\/]+\/)?([^\.\/]+)\.2chan\.net(:[0-9]+)?\/([^\/]+)\/(.*)$/)) {
      var server = RegExp.$2;
      var dir = RegExp.$4;
      var name = server + "_" + dir;
      var path = RegExp.$5;
            
      if (path.match (/^((futaba|[0-9]+)\.htm)?([#\?].*)?$/)) {
        /* futaba: ふたば内でしか動作しないので外部には対応しない */
        arAkahukuSidebar.onNormalLoad (targetDocument, name);
      }
      else if (path.match (/\?mode=cat/)) {
        arAkahukuSidebar.onCatalogLoad (targetDocument, name);
      }
            
      arAkahukuSidebar.asyncUpdateVisited (name, function () {
        arAkahukuSidebar.sort (name);
        arAkahukuSidebar.update (name, sidebarDocument);

        var button;
        button
          = sidebarDocument
          .getElementById ("akahuku_sidebar_refresh_0_" + name);
        if (button) {
          button.removeAttribute ("disabled");
        }
        button
          = sidebarDocument
          .getElementById ("akahuku_sidebar_refresh_catalog_" + name);
        if (button) {
          button.removeAttribute ("disabled");
        }
      });

      // DOMを解放する
      setTimeout (function () {
        targetDocument.location.href = "about:blank";
      }, 10);
    }
  },
    
  /**
   * サイドバーをロードしたイベント
   *
   * @param  XULDocument sidebarDocument
   *         サイドバーのドキュメント
   */
  onSidebarLoad : function (sidebarDocument) {
    if (!arAkahukuSidebar.enable) {
      return;
    }
    // 複数は開けない
    if (arAkahukuSidebar.currentSidebarDocument) {
      return;
    }
    arAkahukuSidebar.currentSidebarDocument = sidebarDocument;
        
    var container
    = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var tab, button, box, iframe, buttons;
    var name, tmp;
        
    container.menuEventListener = arAkahukuSidebar;
        
    if (arAkahukuSidebar.enableTabVertical) {
      container.parentNode.orient = "horizontal";
      container.orient = "vertical";
    }
    if (arAkahukuSidebar.enableTabHidden) {
      container.hidden = "true";
    }
    container.enableMenuButton = arAkahukuSidebar.enableTabMenu;
        
    var sort_num
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 0); };
    var sort_lastnum
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 1); };
    var sort_old
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 2); };
    var sort_reply_most
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 3); };
    var sort_reply_least
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 4); };
    var sort_cat
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 5); };
    var sort_reply_delta_most
      = function () { arAkahukuSidebar.onSort (arguments [0], 0, 6); };

    var popup = sidebarDocument.getElementById ("akahuku-sidebar-popup");
    if (popup) {
      popup.addEventListener
        ("popupshowing", 
         function () {
          arAkahukuSidebar.setContextMenu (arguments [0]);
        }, false);
      // ポップアップが消えるときにスレ選択を解除する
      popup.addEventListener
        ("popuphiding", 
         function (event) {
          var sidebarDocument
            = arAkahukuSidebar._getDocumentsOnEvent (event).sidebar;
          arAkahukuSidebar.unselectThread (sidebarDocument);
        }, false);
            
      var item;
            
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-num");
      if (item) {
        item.addEventListener ("command", sort_num, false);
      }
            
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-lastnum");
      if (item) {
        item.addEventListener ("command", sort_lastnum, false);
      }

      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-old");
      if (item) {
        item.addEventListener ("command", sort_old, false);
      }
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-reply-most");
      if (item) {
        item.addEventListener ("command", sort_reply_most, false);
      }
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-reply-least");
      if (item) {
        item.addEventListener ("command", sort_reply_least, false);
      }
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-catalog-order");
      if (item) {
        item.addEventListener ("command", sort_cat, false);
      }
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-reply-delta-most");
      if (item) {
        item.addEventListener ("command", sort_reply_delta_most, false);
      }
            
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-visited");
      if (item) {
        item.addEventListener
          ("command", 
           function () {
            arAkahukuSidebar.onSort (arguments [0], 1, 0);
          }, false);
      }
            
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-marked");
      if (item) {
        item.addEventListener
          ("command", 
           function () {
            arAkahukuSidebar.onSort (arguments [0], 2, 0);
          }, false);
      }
            
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-invert");
      if (item) {
        item.addEventListener
          ("command", 
           function () {
            arAkahukuSidebar.onSort (arguments [0], 3, 0);
          }, false);
      }
            
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-mark");
      if (item) {
        item.addEventListener
          ("command", 
           function () {
            arAkahukuSidebar.onSort (arguments [0], 10, 0);
          }, false);
      }
      item
        = sidebarDocument
        .getElementById ("akahuku-sidebar-popup-sort-unmark");
      if (item) {
        item.addEventListener
          ("command", 
           function () {
            arAkahukuSidebar.onSort (arguments [0], 10, 1);
          }, false);
      }
    }
        
    // カタログ種類の選択ポップアップ
    popup = sidebarDocument.getElementById ("akahuku-sidebar-catalog-popup");
    if (popup) {
      popup.addEventListener
        ("command",
         function (event) {
           arAkahukuSidebar.onCommandCatalogPopup (event);
        }, false);
    }

    // ソート順ポップアップ
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-num");
    if (item) {
      item.addEventListener ("command", sort_num, false);
    }
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-lastnum");
    if (item) {
      item.addEventListener ("command", sort_lastnum, false);
    }
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-old");
    if (item) {
      item.addEventListener ("command", sort_old, false);
    }
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-reply-most");
    if (item) {
      item.addEventListener ("command", sort_reply_most, false);
    }
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-reply-least");
    if (item) {
      item.addEventListener ("command", sort_reply_least, false);
    }
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-catalog-order");
    if (item) {
      item.addEventListener ("command", sort_cat, false);
    }
    item = sidebarDocument
      .getElementById ("akahuku-sidebar-sortorder-popup-reply-delta-most");
    if (item) {
      item.addEventListener ("command", sort_reply_delta_most, false);
    }

    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuSidebar.getConfig ();
    }
        
    // ソート順の選択をUIに反映
    arAkahukuSidebar.updateSortOrderUI ();
        
    function setupIframeDocShell (iframe, allow) {
      // chrome:// で開くと browser に関連づけられてしまうので戻す
      iframe.docShell.chromeEventHandler = iframe;
      // スレ一覧表示用 iframe は画像だけ読めれば十分
      iframe.docShell.allowImages = allow;
      iframe.docShell.allowPlugins = false;
      iframe.docShell.allowSubframes = allow; //for <link type="text/css"> (Firefox 3.6)
      iframe.docShell.allowJavascript = false;
      iframe.docShell.allowAuth = false;
      iframe.docShell.allowMetaRedirects = false;
    }
        
    /* タブを作る */
    var i = 0;
    for (i = 0; i < arAkahukuSidebar.list.length; i ++) {
      tmp = arAkahukuSidebar.list [i];
      name = tmp.replace (/:/, "_");
            
      if (name in arAkahukuSidebar.boards) {
        var board, thread;
        board = arAkahukuSidebar.boards [name];
        board.lastSelected = null;
        board.lastSelectedImage = null;
        for (var j = 0; j < board.threads.length; j ++) {
          thread = board.threads [j];
          thread.node = null;
        }
      }
            
      tab = sidebarDocument.createElement ("button");
      tab.id = "akahuku_sidebar_tab_" + name;
      tab.className = "tab";
      tab.orient = "vertical";
      tab.align = "center";
      var n1 = arAkahukuBoard.getServerName (tmp, "short");
      tab.setAttribute ("__item_label", n1);
      tab.setAttribute ("__item_value", tmp);
      var n2 = "";
      if (n1.length > 4) {
        if (n1.match (/^([^A-Za-z ]+)([A-Za-z]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
        else if (n1.match (/^([\u3041-\u3093\u30FC]+)([^\u3041-\u3093\u30FC]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
        else if (n1.match (/^([\u30A1-\u30F6\u30FC]+)([^\u30A1-\u30F6\u30FC]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
        else if (n1.match (/^([^\u3041-\u3093\u30FC]+)([\u3041-\u3093\u30FC]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
        else if (n1.match (/^([^\u30A1-\u30F6\u30FC]+)([\u30A1-\u30F6\u30FC]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
        else if (n1.match (/^(.+) ([A-Za-z]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
        else if (n1.match (/^([^A-Za-z][^A-Za-z][^A-Za-z])([^A-Za-z]+)$/)) {
          n1 = RegExp.$1;
          n2 = RegExp.$2;
        }
      }
      var l1 = sidebarDocument.createElement ("label");
      l1.setAttribute ("value", n1);
      tab.appendChild (l1);
      if (n2) {
        var l2 = sidebarDocument.createElement ("label");
        l2.setAttribute ("value", n2);
        tab.appendChild (l2);
      }
      if (i == 0) {
        tab.setAttribute ("selected", "true");
      }
      tab.addEventListener
        ("command",
         function () {
          arAkahukuSidebar.onTabClick (arguments [0]);
        }, false);
      container.appendChild (tab);
            
      box = sidebarDocument.createElement ("box");
      box.id = "akahuku_sidebar_deck_" + name;
      box.setAttribute ("flex", "1");
      box.setAttribute ("orient", "vertical");
      buttons = sidebarDocument.createElement ("box");
      buttons.className = "buttons";
      buttons.id = "akahuku_sidebar_buttons_" + name;
      button = sidebarDocument.createElement ("button");
      button.id = "akahuku_sidebar_refresh_0_" + name;
      button.className = "refresh";
      button.setAttribute ("label", "0 \u30DA\u30FC\u30B8");
      button.addEventListener
        ("command",
         function () {
          arAkahukuSidebar.onRefresh0 (arguments [0]);
        }, false);
      buttons.appendChild (button);
      if (arAkahukuBoard.hasCatalog (tmp)) {
        button = sidebarDocument.createElement ("button");
        button.id = "akahuku_sidebar_refresh_catalog_" + name;
        button.className = "refresh refresh_catalog";
        button.setAttribute ("label", "\u30AB\u30BF\u30ED\u30B0");
        button.addEventListener
          ("command",
           function () {
            arAkahukuSidebar.onRefreshCatalog (arguments [0]);
          }, false);
        buttons.appendChild (button);
        // カタログ種類
        button = sidebarDocument.createElement ("button");
        button.id = "akahuku_sidebar_refresh_cat_menu_" + name;
        button.className = "refresh_menu";
        button.setAttribute ("type", "menu");
        button.setAttribute ("popup", "akahuku-sidebar-catalog-popup");
        buttons.appendChild (button);
      }
      // ソート順
      button = sidebarDocument.createElement ("button");
      button.id = "akahuku_sidebar_sortorder_" + name;
      button.className = "sortorder_menu";
      button.setAttribute ("label", arAkahukuSidebar.getSortTypeLabel ());
      button.setAttribute ("tooltiptext", "\u30BD\u30FC\u30C8\u9806");
      button.setAttribute ("type", "menu");
      button.setAttribute ("popup", "akahuku-sidebar-sortorder-popup");
      buttons.appendChild (button);
      iframe = sidebarDocument.createElement ("iframe");
      iframe.setAttribute ("type", "content");// 明示的に権限制限
      var iframe2 = iframe; // 後でdocShellの設定をするため保管
      iframe.id = "akahuku_sidebar_iframe2_" + name;
      iframe.collapsed = true; // 完全に非表示にする
      iframe.addEventListener
        ("DOMContentLoaded",
         function () {
          arAkahukuSidebar.onIframe2Load (arguments [0]);
        }, false);
      iframe.addEventListener
        ("load",
         function () {
          arAkahukuSidebar.onIframe2Load (arguments [0]);
        }, false);
      buttons.appendChild (iframe);
      box.appendChild (buttons);
      iframe = sidebarDocument.createElement ("iframe");
      iframe.id = "akahuku_sidebar_iframe_" + name;
      iframe.className = "akahuku_sidebar_iframe";
      iframe.setAttribute ("type", "content");//念のため制限
      iframe.addEventListener
        ("load", arAkahukuSidebar.onIframeHtmlLoad, true);
      iframe.setAttribute ("src",
                           "chrome://akahuku/content/sidebar_html.html#" + name);
      iframe.setAttribute ("flex", "1");

      var wheelEventName = "wheel";
      if (!(wheelEventName in iframe)) {
        wheelEventName = "DOMMouseScroll";
      }
      iframe.addEventListener
        (wheelEventName, function (ev) {
          arAkahukuSidebar.onIframeHtmlWheel (ev);
        }, false);
            
      box.appendChild (iframe);
      deck.appendChild (box);
      if (i == 0) {
        deck.selectedPanel = box;
      }
      // docShell 設定 (DOM ツリー追加後でないと不可)
      setupIframeDocShell (iframe, "allowImages");
      setupIframeDocShell (iframe2); //リモート読込用は画像も不要
    }
    if (arAkahukuSidebar.enableMarked) {
      tmp = "*:*";
      name = tmp.replace (/:/, "_");
            
      tab = sidebarDocument.createElement ("button");
      tab.id = "akahuku_sidebar_tab_" + name;
      tab.className = "tab";
      tab.orient = "vertical";
      tab.align = "center";
      tab.setAttribute ("__item_label", "\u30DE\u30FC\u30AF");
      tab.setAttribute ("__item_value", tmp);
      n1 = "\u30DE\u30FC\u30AF";
      var l1 = sidebarDocument.createElement ("label");
      l1.setAttribute ("value", n1);
      tab.appendChild (l1);
      if (i == 0) {
        tab.setAttribute ("selected", "true");
      }
      tab.addEventListener
      ("command",
       function () {
        arAkahukuSidebar.onTabClick (arguments [0]);
      }, false);
      container.appendChild (tab);
            
      box = sidebarDocument.createElement ("box");
      box.id = "akahuku_sidebar_deck_" + name;
      box.setAttribute ("flex", "1");
      box.setAttribute ("orient", "vertical");
      iframe = sidebarDocument.createElement ("iframe");
      iframe.id = "akahuku_sidebar_iframe_" + name;
      iframe.setAttribute ("type", "content"); //念のため制限
      iframe.addEventListener
        ("load", arAkahukuSidebar.onIframeHtmlLoad, true);
      iframe.setAttribute ("src",
                           "chrome://akahuku/content/sidebar_html.html#" + name);
      iframe.setAttribute ("flex", "1");
            
      box.appendChild (iframe);
      deck.appendChild (box);
      if (i == 0) {
        deck.selectedPanel = box;
      }
      setupIframeDocShell (iframe, "allowImages");
    }
    var spacer = sidebarDocument.createElement ("spacer");
    spacer.className = "tabspace";
    spacer.setAttribute ("flex", "1");
    container.appendChild (spacer);

    arAkahukuSidebar.updateCatalogRefreshUI ();
  },
    
  /**
   * サイドバーをアンロードしたイベント
   *
   * @param  XULDocument sidebarDocument
   *         サイドバーのドキュメント
   */
  onSidebarUnload : function (sidebarDocument) {
    if (arAkahukuSidebar.currentSidebarDocument != sidebarDocument) {
      return;
    }
    arAkahukuSidebar.currentSidebarDocument = null;

    // スレッド・板情報からの DOM 参照を切断
    for (var name in arAkahukuSidebar.boards) {
      var board = arAkahukuSidebar.boards [name];
      board.lastSelected = null;
      board.lastSelectedImage = null;
      for (var j = 0; j < board.threads.length; j ++) {
        board.threads [j].node = null;
      }
    }
  },
    
  /**
   * タブのメニュー項目が選択されたイベント
   *
   * @param  String value
   *         メニュー項目に対応するタブ
   */
  onSelectItem : function (tab) {
    arAkahukuSidebar.onTabClickCore (tab);
  },
    
  /**
   * メニューが開かれるイベント
   * メニューの項目の表示／非表示を設定する
   *
   * @param  Event event
   *         対象のイベント
   */
  setContextMenu : function (event) {
    var sidebarDocument
      = arAkahukuSidebar._getDocumentsOnEvent (event).sidebar;
    var item;
        
    // 念のため
    arAkahukuSidebar.updateSortOrderUI ();
        
    item
    = sidebarDocument.getElementById ("akahuku-sidebar-popup-sort-visited");
    if (item) {
      item.setAttribute ("checked", arAkahukuSidebar.enableSortVisited);
    }
        
    item
    = sidebarDocument.getElementById ("akahuku-sidebar-popup-sort-marked");
    if (item) {
      item.setAttribute ("checked", arAkahukuSidebar.enableSortMarked);
    }
        
    item
    = sidebarDocument.getElementById ("akahuku-sidebar-popup-sort-invert");
    if (item) {
      item.setAttribute ("checked", arAkahukuSidebar.sortInvert);
    }
        
    var deck
    = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var box = deck.selectedPanel;
        
    if (box.id.match (/^akahuku_sidebar_deck_(.+)$/)) {
      var name = RegExp.$1;
      var board;
            
      if (name in arAkahukuSidebar.boards) {
        board = arAkahukuSidebar.boards [name];
      }
      else {
        board = new arAkahukuSidebarBoard ();
        arAkahukuSidebar.boards [name] = board;
      }
            
      if (board.lastSelected) {
        var num = board.lastSelected.getAttribute ("__num");
        var thread = board.getThread (num);
                
        item
          = sidebarDocument
          .getElementById ("akahuku-sidebar-popup-sort-mark");
        if (item) {
          if (thread.isMarked) {
            item.setAttribute ("hidden", "true");
          }
          else {
            item.removeAttribute ("hidden");
          }
        }
                
        item
          = sidebarDocument
          .getElementById ("akahuku-sidebar-popup-sort-unmark");
        if (item) {
          if (!thread.isMarked) {
            item.setAttribute ("hidden", "true");
          }
          else {
            item.removeAttribute ("hidden");
          }
        }
                
        item
          = sidebarDocument
          .getElementById ("akahuku-sidebar-popup-separator1");
        if (item) {
          item.removeAttribute ("hidden");
        }
      }
      else {
        item
          = sidebarDocument
          .getElementById ("akahuku-sidebar-popup-sort-mark");
        if (item) {
          item.setAttribute ("hidden", "true");
        }
        item
          = sidebarDocument
          .getElementById ("akahuku-sidebar-popup-sort-unmark");
        if (item) {
          item.setAttribute ("hidden", "true");
        }
        item
          = sidebarDocument
          .getElementById ("akahuku-sidebar-popup-separator1");
        if (item) {
          item.setAttribute ("hidden", "true");
        }
      }
    }
  },
    
  /**
   * ソートするイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  String type
   *         イベントの種類
   *           0: ソート
   *           1: 既読のスレを上に持ってくる
   *           2: マークしたスレを上に持ってくる
   *           3: ソートを反転
   *           10: マークを変更
   * @param  String sorttype
   *         ソートの種類
   *           or
   *         マークの状態
   *           0: マークする
   *           1: マークを外す
   */
  onSort : function (event, type, sorttype) {
    var sidebarDocument
      = arAkahukuSidebar._getDocumentsOnEvent (event).sidebar;
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var box = deck.selectedPanel;
        
    if (box.id.match (/^akahuku_sidebar_deck_(.+)$/)) {
      var name = RegExp.$1;
            
      if (type == 0) {
        arAkahukuSidebar.sortType = sorttype;
        arAkahukuConfig
          .setIntPref ("akahuku.sidebar.sort.type",
                       arAkahukuSidebar.sortType);
      }
      else if (type == 1) {
        arAkahukuSidebar.enableSortVisited
          = !arAkahukuSidebar.enableSortVisited;
        arAkahukuConfig
          .setBoolPref ("akahuku.sidebar.sort.visited",
                        arAkahukuSidebar.enableSortVisited);
      }
      else if (type == 2) {
        arAkahukuSidebar.enableSortMarked
          = !arAkahukuSidebar.enableSortMarked;
                
        arAkahukuConfig
          .setBoolPref ("akahuku.sidebar.sort.marked",
                        arAkahukuSidebar.enableSortMarked);
      }
      else if (type == 3) {
        arAkahukuSidebar.sortInvert = !arAkahukuSidebar.sortInvert;
        arAkahukuConfig
          .setBoolPref ("akahuku.sidebar.sort.invert",
                        arAkahukuSidebar.sortInvert);
      }
      else if (type == 10) {
        if (name in arAkahukuSidebar.boards) {
          var board = arAkahukuSidebar.boards [name];
                    
          if (board.lastSelected) {
            var num = board.lastSelected.getAttribute ("__num");
            var thread = board.getThread (num);
            thread.isMarked = (sorttype == 0);
          }
        }
      }

      // ソートタイプの状態を反映
      arAkahukuSidebar.updateSortOrderUI ();
            
      arAkahukuSidebar.asyncUpdateVisited (name, function () {
        arAkahukuSidebar.sort (name);
        arAkahukuSidebar.update (name, sidebarDocument);
        if (arAkahukuSidebar.enableMarked) {
          arAkahukuSidebar.updateMarked ();
          arAkahukuSidebar.sort ("*_*");
          arAkahukuSidebar.update ("*_*", sidebarDocument);
        }
      });
    }
  },
    
  /**
   * タブをクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onTabClick : function (event) {
    arAkahukuSidebar.onTabClickCore (event.target);
  },
    
  /**
   * タブをクリックしたイベント
   *
   * @param  XULElement tab
   *         対象のタブ
   */
  onTabClickCore : function (tab) {
    if (tab.id.match (/^akahuku_sidebar_tab_(.+)$/)) {
      var sidebarDocument = tab.ownerDocument;
            
      var container
      = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
      for (var tab2 = container.firstChild; tab2;
           tab2 = tab2.nextSibling) {
        if (tab2 == tab) {
          tab2.setAttribute ("selected", "true");
        }
        else {
          tab2.removeAttribute ("selected");
        }
      }
            
      var name = RegExp.$1;
      var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
      var box
      = sidebarDocument.getElementById ("akahuku_sidebar_deck_" + name);
      deck.selectedPanel = box;

      // 現設定に応じてソートしていない場合はソート
      var sortSign = arAkahukuSidebar._getSortConfigSignature ();
      var iframe
      = sidebarDocument.getElementById ("akahuku_sidebar_iframe_" + name);
      if (iframe) {
        var targetDocument = iframe.contentDocument;
        if (targetDocument.body.getAttribute ("__sort") != sortSign) {
          arAkahukuSidebar.sort (name);
          arAkahukuSidebar.update (name, sidebarDocument);
        }
      }
    }
  },

  /**
   * サイドバーに板のタブがあるか [XUL]
   *
   * @param String name
   */
  hasTabForBoard : function (name) {
    var sidebarDocument = arAkahukuSidebar.getSidebarDocument ();
    if (!sidebarDocument) {
      return false;
    }
    var iframe
      = sidebarDocument
      .getElementById ("akahuku_sidebar_iframe_" + name);
    if (iframe == null) {
      return false;
    }
    return true;
  },
    
  /**
   * サイドバーに板の情報があるか [XUL]
   *
   * @param String name
   * @return Boolean
   */
  hasBoard : function (name) {
    return (name in arAkahukuSidebar.boards);
  },

  /**
   * スレの情報を得る [XUL]
   *
   * @param String boardName
   * @param Number threadNumber
   * @return Object or null
   */
  getThread : function (boardName, threadNumber) {
    if (arAkahukuSidebar.hasBoard (boardName)) {
      var thread = arAkahukuSidebar.boards [boardName].getThread (threadNumber);
      if (thread) {
        return JSON.parse (JSON.stringify (thread));
      }
    }
    return null;
  },

  /**
   * サイドバーを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (arAkahukuSidebar.enable
        && info.isFutaba) {
      var name = info.server + "_" + info.dir;
            
      if (!arAkahukuSidebar.enableBackground) {
        if (!arAkahukuSidebar.hasTabForBoard (name)) {
          return;
        }
      }
            
      var exists = false;
      for (var i = 0; i < arAkahukuSidebar.list.length; i ++) {
        if (name == arAkahukuSidebar.list [i].replace (/:/, "_")) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        return;
      }
            
      if (info.isNormal) {
        if (!arAkahukuSidebar.enableCheckNormal) {
          return;
        }
        arAkahukuSidebar.onNormalLoad (targetDocument, name);
      }
      else if (info.isReply) {
        if (!arAkahukuSidebar.enableCheckReply) {
          return;
        }
        if (info.isNotFound) {
          var name;
          name = info.server + "_" + info.dir;
          arAkahukuSidebar.onThreadExpired (name, info.threadNumber);
        }
        else {
          arAkahukuSidebar.onReplyLoad (targetDocument, name);
        }
      }
      else if (info.isCatalog) {
        if (!arAkahukuSidebar.enableCheckCatalog) {
          return;
        }
        arAkahukuSidebar.onCatalogLoad (targetDocument, name);
      }
            
      arAkahukuSidebar.asyncUpdateVisited (name, function () {
        arAkahukuSidebar.sort (name);
        arAkahukuSidebar.update (name);
        if (arAkahukuSidebar.enableMarked) {
          arAkahukuSidebar.sort ("*_*");
          arAkahukuSidebar.update ("*_*");
        }
      });
    }
  }
};
