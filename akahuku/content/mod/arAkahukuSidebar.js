export {arAkahukuSidebar, arAkahukuSidebarParam, arAkahukuSidebarBoard, arAkahukuSidebarThread};

import {Akahuku} from '/content/akahuku.js';
import {AkahukuCentral} from '/content/akahuku-central-content.js';
import {HistoryService} from '/content/history-service-content.js';
import {Tabs} from '/content/tabs-content.js';

import {arAkahukuBoard} from '/content/mod/arAkahukuBoard.js';
import {arAkahukuCompat} from '/content/mod/arAkahukuCompat.js';
import {arAkahukuConfig} from '/content/mod/arAkahukuConfig.js';
import {arAkahukuDOM} from '/content/mod/arAkahukuDOM.js';
import {arAkahukuMergeItemCallbackList} from '/content/mod/arAkahukuCatalog.js';
import {arAkahukuP2P} from '/content/mod/arAkahukuP2P.js';
import {arAkahukuWindow} from '/content/mod/arAkahukuWindow.js';

/**
 * サイドバーのスレ情報
 */
function arAkahukuSidebarThreadData () {
}
arAkahukuSidebarThreadData.prototype = {
  num : 0,           /* Number  スレ番号 */
  comment : "",      /* String  コメント */
  commentInCatalog : "",/* String  カタログから取得したコメント */
    
  reply : 0,         /* Number  レス数 */
  lastReply : 0,     /* Number  更新前のレス数 */
  expire : "",       /* String  消滅時刻 */
  warning : "",      /* String  もうすぐ消えます */
  maxres: "",        /* String  上限 レスに達しました */
  lastNum : 0,       /* Number  最終レス番号*/
    
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

  imageSrcThumb : "",
  imageSrcCat : "",
  imageWidthCat : 0,
  imageHeightCat : 0,
  imageWidthThumb : 0,
  imageHeightThumb : 0,
    
  threadLink : "",   /* String  スレの URI */
  isVisited : false, /* Boolean  既読フラグ */
  isMarked : false,  /* Boolean  マーク */
  isExpired : false, /* Boolean  消滅フラグ */
};

function arAkahukuSidebarThread (data=null) {
  arAkahukuSidebarThreadData.call(this);
  if (data) {
    const proto = arAkahukuSidebarThreadData.prototype;
    for (const [key, value] of Object.entries(data)) {
      if (Object.hasOwn(proto, key)) {
        this[key] = value;
      }
    }
  }
}
arAkahukuSidebarThread.prototype = {
  catalogOrder : 0,  /* Number  カタログ順(保存しない) */
  node : null        /* HTMLDivElement  サイドバー上の div 要素 */
  ,
  threadLinkURLObject : null,   /* URL スレの URL */

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
      && typeof (this.maxres) === "string"
      && typeof (this.lastNum) === "number" // カタログの事情で
      && typeof (this.imageSrc) === "string"
      && (this.imageSrcType === 1 || this.imageSrcType === 2)
      && typeof (this.imageLink) === "string"
      && this.imageNum >= 0
      && this.imageWidth >= 0
      && this.imageHeight >= 0
      && this.imageBytes >= 0
      && /^(?:|jpg|gif|png|web[mp]|mp4)$/i.test (this.imageExt)
      && typeof (this.threadLink) === "string"
    if (!valid) {
      return false;
    }

    // URLチェック
    if (!this.threadLinkURLObject
        || this.threadLinkURLObject.href != this.threadLink) {
      this.threadLinkURLObject = null;
      try {
        let url = new URL(this.threadLink);
        if (this.isSafeURL(url)) {
          this.threadLinkURLObject = url;
          this.threadLink = url.href;
        }
      }
      catch (e) {
        Akahuku.debug.exception (e);
      }
    }
    valid
      = this.threadLinkURLObject
      && this.isSafeURL(this.threadLinkURLObject)
      // imageSrc, imageLink は未指定の場合もある
      && (!this.imageSrc || this.isSafeURL (this.imageSrc))
      && (!this.imageLink || this.isSafeURL (this.imageLink));
    if (!valid) {
      delete this.threadLinkURLObject;
      return false;
    }

    return true;
  },

  isSafeURL : function (url) {
    try {
      var destURL = (url instanceof URL
        ? url: new URL(url));
    }
    catch (e) {
    }
    if (!destURL) {
      return false;
    }
    try {
      // check url safety for src -> dest
      let srcURL;
      if (this.threadLinkURLObject) {
        srcURL = this.threadLinkURLObject;
      }
      else {
        srcURL = new URL('https://www.2chan.net/');
      }
      if (srcURL.origin == destURL.origin) {
        return true;// same origin : safe
      }

      let srcRelaxHost = srcURL.hostname;
      let parts = srcRelaxHost.split('.');
      if (parts.length > 2) {
        srcRelaxHost = parts.splice(1).join('.');
      }
      let destRelaxHost = destURL.hostname;
      parts = destRelaxHost.split('.');
      if (parts.length > 2) {
        destRelaxHost = parts.splice(1).join('.');
      }
      if (/^https?:/.test(srcURL.protocol)
        && /^https?:/.test(destURL.protocol)
        && srcRelaxHost == destRelaxHost) {
        // cross-origin, but in same domain in http(s)
        return true;
      }
      return false;
    }
    catch (e) { Akahuku.debug.exception (e);
      return false;
    }
  },

  toData : function () {
    const ret = {};
    const proto = arAkahukuSidebarThreadData.prototype;
    for (const [key, value] of Object.entries(this)) {
      if (Object.hasOwn(proto, key)) {
        ret[key] = value;
      }
    }
    return ret;
  },
};
Object.setPrototypeOf(arAkahukuSidebarThread.prototype, arAkahukuSidebarThreadData.prototype);

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
 * Window毎のサイドバー情報
 */
function arAkahukuSidebarParam (win) {
  this.targetWindow = win;
  this.ID = this.getWindowID (win);
  this.boards = {};
  // Document  現在対象のサイドバーのドキュメント
  this.currentSidebarDocument = null;
  this.lastFocusedPanel = '';
}
arAkahukuSidebarParam.prototype = {
  getWindowID : function (win) {
    var id = -1;
    // TODO: window id
    return id;
  },
  isTarget : function (win) {
    if (this.ID > 0) {
      return this.ID == this.getWindowID (win);
    }
    return this.targetWindow == win;
  },
};
/**
 * サイドバー管理
 *   [サイドバー]
 */
var arAkahukuSidebar = {
  enable : false,             /* Boolean  サイドバーを使用する */
  enableBackground : false,   /* Boolean  非表示の間も反映させる */
  enableWheelRefresh : false,
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
  thumbnailFit : "",
  enableThumbnailZoom : false,
  flowMode : "",
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
  enableColorScheme : true,

  _timerSetPref : null,

  params : [],
  lastSidebarParam : null,

  addSidebarParam : function (sidebarWindow) {
    if (arAkahukuSidebar.getSidebarParam (sidebarWindow)) {
      Akahuku.debug.warn ("SidebarParam already exists for a window");
      return;
    }
    var param = new arAkahukuSidebarParam (sidebarWindow);
    arAkahukuSidebar.initSidebarParam (param);
    arAkahukuSidebar.params.push (param);
    arAkahukuSidebar.lastSidebarParam = param;
  },
  deleteSidebarParam : function (sidebarWindow) {
    if (arAkahukuSidebar.lastSidebarParam
        && arAkahukuSidebar.lastSidebarParam.isTarget (sidebarWindow)) {
      arAkahukuSidebar.lastSidebarParam = null;
    }
    for (var i = 0; i < arAkahukuSidebar.params.length; i ++) {
      if (arAkahukuSidebar.params [i].isTarget (sidebarWindow)) {
        var tmp = arAkahukuSidebar.params [i];
        arAkahukuSidebar.params.splice (i, 1);
        arAkahukuSidebar.termSidebarParam (tmp);
        tmp.targetWindow = null;
        tmp = null;
        break;
      }
    }
  },
  getSidebarParam : function (sidebarWindow) {
    if (arAkahukuSidebar.lastSidebarParam
        && arAkahukuSidebar.lastSidebarParam.isTarget (sidebarWindow)) {
      return arAkahukuSidebar.lastSidebarParam;
    }
    for (var i = 0; i < arAkahukuSidebar.params.length; i ++) {
      if (arAkahukuSidebar.params [i].isTarget (sidebarWindow)) {
        var param = arAkahukuSidebar.params [i];
        arAkahukuSidebar.lastSidebarParam = param;
        return param;
      }
    }
    return null;
  },
    
  /**
   * 初期化処理
   */
  init : function () {
  },

  initSidebarParam : function (param) {
    var board = new arAkahukuSidebarBoard ();
    param.boards ["*_*"] = board;
        
    arAkahukuSidebar.getConfig ();
    if (arAkahukuSidebar.enableSave) {
      AkahukuCentral.get('storage', {name: 'sidebar.json'})
      .then((cond) => {
        if (cond.length == 0) {
          Akahuku.debug.log ('no sidebar.json data in storage');
          return;
        }
        const dataObj = cond[0];
        for (const boardName of Object.keys(dataObj.boards)) {
          if (!param.boards [boardName]) {
            // taking care for async file load
            param.boards[boardName] = new arAkahukuSidebarBoard();

          }
          let board = param.boards[boardName];
          for (const threadData of dataObj.boards[boardName]) {
            let thread = new arAkahukuSidebarThread(threadData);
            board.addThread(thread);
          }
        }
        if (arAkahukuSidebar.enableMarked) {
          arAkahukuSidebar.updateMarked (param);
        }
        if (dataObj.lastBoard) {
          const tabName = "akahuku_sidebar_tab_" + dataObj.lastBoard;
          const sidebarDocument = arAkahukuSidebar.getSidebarDocument(window);
          arAkahukuSidebar.onTabClickCore(sidebarDocument.getElementById(tabName));
        }
      })
      .catch ((e) => {
        Akahuku.debug.exception (e);
      });
    }
  },

  attachToWindow : function (window) {
    arAkahukuSidebar.addSidebarParam (window);
  },
  dettachFromWindow : function (window) {
    let sidebarDocument = arAkahukuSidebar.getSidebarDocument (window);
    try {
      arAkahukuSidebar.onSidebarUnload (sidebarDocument);
      arAkahukuSidebar.deleteSidebarParam (window);
    }
    catch (e) {
      Akahuku.debug.exception(e);
    }
  },
    
  /**
   * 終了処理
   */
  term : function () {
  },

  termSidebarParam : function (param) {
    if (arAkahukuSidebar.enableSave) {
      const dataObj = {
        name: 'sidebar.json',
        boards: {},
        lastBoard: param.lastFocusedPanel,
      };
      for (const [name, board] of Object.entries(param.boards)) {
        dataObj.boards[name] = new Array(board.threads.length)
        for (let i = 0; i < board.threads.length; i ++) {
          dataObj.boards[name][i] = board.threads[i].toData();
        }
      }
      AkahukuCentral.update('storage', {name:'sidebar.json'}, dataObj)
      .catch (function (e) {
        Akahuku.debug.exception (e);
      });
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
      arAkahukuSidebar.enableWheelRefresh
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.wheel.refresh", false);
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
      = !arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.tab", false);
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
      arAkahukuSidebar.thumbnailFit
      = arAkahukuConfig
      .initPref ("char", "akahuku.sidebar.thumbnail.fit", "");
      arAkahukuSidebar.enableThumbnailZoom
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.thumbnail.zoom", false);
      arAkahukuSidebar.flowMode
      = arAkahukuConfig
      .initPref ("char", "akahuku.sidebar.flow-mode", "");
      arAkahukuSidebar.enableSave
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.save", false);
      var value
      = arAkahukuConfig
      .initPref ("char", "akahuku.sidebar.list2", "");
      arAkahukuSidebar.list = new Array ();
      let board_list = []
      try {
        if (value) {
          board_list = JSON.parse(unescape(value));
        }
      } catch (e) {
        Akahuku.debug.exception(e);
      }
      for (let item of board_list) {
        arAkahukuSidebar.list.push (item.board);
      }

      arAkahukuSidebar.afterThreadClick
      = arAkahukuConfig
      .initPref ("char", "akahuku.sidebar.threadclick.after", "none");
            
      arAkahukuSidebar.enableShortcut
      = arAkahukuConfig
      .initPref ("bool", "akahuku.sidebar.shortcut", false);
    }
    arAkahukuSidebar.enableColorScheme
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sidebar.color-scheme", true);

    // 設定変更をその場で反映する
    arAkahukuSidebar.updateSidebarByConfig ();
  },

  onPrefChanged : function () {
    //arAkahukuSidebar.updateSidebarByConfig ();
  },

  /**
   * サイドバーのドキュメントを得る [sidebar]
   *
   * @param Window sidebarWindow
   * @return Document
   */
  getSidebarDocument : function (sidebarWindow) {
    if (typeof sidebarWindow.document === 'undefined') {
      // onload 以前に呼ばれる場合に備える
      return null;
    }
    if (sidebarWindow.location.pathname == '/sidebar/sidebar.html') {
      return sidebarWindow.document;
    }
    return null;
  },

  /**
   * スレッドを更新or追加する [sidebar/content]
   * @param Object item
   */
  updateThreadItem : function (item) {
    if (arAkahukuSidebar.params.length > 0) {
      // sidebar script
      for (var i = 0; i < arAkahukuSidebar.params.length; i ++) {
        var param = arAkahukuSidebar.params [i];
        arAkahukuSidebar.updateThreadItemFor (item, param);
      }
      return;
    }
    // content-script
    browser.runtime.sendMessage({
      'target': 'sidebar.js',
      'command': 'updateThreadItem',
      'args': [item],
    });
  },
  updateThreadItemFor : function (item, param) {
    var board = null;
    if (item.boardName in param.boards) {
      board = param.boards [item.boardName];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      param.boards [item.boardName] = board;
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
      arAkahukuSidebar.sort (item.boardName, param);
      arAkahukuSidebar.update (item.boardName, null, param);
      if (arAkahukuSidebar.enableMarked) {
        arAkahukuSidebar.sort ("*_*", param);
        arAkahukuSidebar.update ("*_*", null, param);
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
      if (typeof item.expire !== "undefined" && item.expire !== null) {
        thread.expire = item.expire;
        if (thread.expire.includes('\u65E5')) {//'日'
          // 日付が変わってすぐの時刻なら03:10->28:10等の表記にする
          const now = new Date();
          const tomorrow = new Date(now.setDate(now.getDate()+1));
          const pat = `^${tomorrow.getDate()}\u65E50([0-3])(:[0-9]{2})`;
          const res = (new RegExp(pat)).exec(thread.expire);
          if (res) {
            thread.expire = (parseInt(res[1]) + 24) + res[2];
          }
        }
      }
      if (typeof item.warning !== "undefined" && item.warning !== null) {
        thread.warning = item.warning;
      }
      if (typeof item.lastNum !== "undefined" &&
          item.lastNum >= 0) {
        thread.lastNum = item.lastNum;
      }
      if (typeof item.maxres !== "undefined" && item.maxres !== null) {
        thread.maxres = item.maxres;
      }
    }

    if (item.type === "normal") {
      thread.comment = item.comment;
      thread.imageNum = item.imageNum;
      thread.imageSrc = item.imageSrc;
      thread.imageSrcType = 1;
      // 以下はtype=normal時のみの情報
      thread.imageLink = item.imageLink;
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
      if (item.imageSrcType == 1 || item.imageSrcType == 2) {
        thread.imageSrcType = item.imageSrcType;
      }
      else {
        thread.imageSrcType = 2;
      }
      // カタログからはthumb(imageSrctype=1)の元画像サイズは不明
      // なので必要なら本来のサイズを推定(250x250 box仮定)
      if (thread.imageSrcType == 1 &&
        item.imageWidth < 250 && item.imageHeight < 250) {
        const r = item.imageWidth / item.imageHeight;
        if (1 <= r) {//横長アスペクト比 or 正方形
          item.imageWidth = 250;
          item.imageHeight = Math.round(250/r);
        } else if (0 < r && r < 1){
          item.imageWidth = Math.round(250*r);
          item.imageHeight = 250;
        }
      }
    }

    // 画像の詳細情報を設定/推測
    if (item.type === "normal" || item.type == "catalog") {
      if (thread.imageSrcType == 2) {// cat
        thread.imageSrc = item.imageSrc;
        thread.imageSrcCat = item.imageSrc;
        thread.imageWidthCat = item.imageWidth;
        thread.imageHeightCat = item.imageHeight;
        if (!thread.imageSrcThumb) {
          // サムネ画像情報を補完
          thread.imageSrcThumb = thread.imageSrc.replace('/cat/','/thumb/');
          const r = thread.imageWidthCat / thread.imageHeightCat;
          if (r >= 1) {
            thread.imageWidthThumb = 250;
            thread.imageHeightThumb = Math.round(250/r);
          } else if (r < 1 && r > 0){
            thread.imageWidthThumb = Math.round(250*r);
            thread.imageHeightThumb = 250;
          }
        }
      }
      else if (thread.imageSrcType == 1) { // thumb
        thread.imageSrc = item.imageSrc;
        thread.imageSrcThumb = item.imageSrc;
        thread.imageWidthThumb = item.imageWidth;
        thread.imageHeightThumb = item.imageHeight;
        thread.imageWidth = thread.imageWidthThumb;
        thread.imageHeight = thread.imageHeightThumb;
        if (!thread.imageSrcCat) {
          // サムネ画像情報を補完
          thread.imageSrcCat = thread.imageSrc.replace('/thumb/','/cat/');
          const r = thread.imageWidthThumb / thread.imageHeightThumb;
          if (r >= 1) {
            thread.imageWidthCat = 50;
            thread.imageHeightCat = Math.round(50/r);
          } else if (r < 1 && r > 0) {
            thread.imageWidthCat = Math.round(50*r);
            thread.imageHeightCat = 50;
          }
        }
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
    var reply, expire, warning, maxres;
    var imageSrc, imageLink, imageNum;
    var imageWidth, imageHeight, imageBytes, imageExt;
    var threadLink;
    let baseURI = targetDocument.baseURI;
        
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
        maxres = "";
                
        imageSrc = "";
        imageLink = "";
        imageNum = 0;
        imageWidth = 0;
        imageHeight = 0;
        imageBytes = 0;
        imageExt = "";
                
        threadLink = "";
                
        while (node) {// blockquoteより上の兄弟要素をチェック
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
          else if (nodeName == "small" || node.matches?.("span.cntd")) {
            if (node.innerHTML.match
                (/(([0-9]+\u5E74)?([0-9]+\u6708)?([0-9]+\u65E5)?[0-9]+:[0-9]+)\u9803\u6D88\u3048\u307E\u3059/)) {
              // /(([0-9]+年)?([0-9]+月)?([0-9]+日)?[0-9]+:[0-9]+)頃消えます/)) {
              expire = RegExp.$1;
            }
          }
          else if (node.matches?.("span.cno")
            && node.textContent.match (/No\.([0-9]+)/)) {
            num = parseInt (RegExp.$1);
          }
                    
          node = node.previousSibling;
        }
                
        node = nodes [i];

        while (node) {// blockquoteの下の兄弟要素を探索
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
              // /レス([0-9]+)件省略/
              reply = parseInt (RegExp.$1);
            }
            else if (node.innerHTML.match
                     (/<b>\u3053\u306E\u30B9\u30EC\u306F[^<]+<\/b>/i)) {
              // /<b>このスレは[^<]+<\/b>/i (古いので、もうすぐ消えます。)
              warning = node.innerHTML;
            }
          }
          else if (node.matches?.("span.maxres")) {
            if (node.innerText.match(/\u4e0a\u9650[0-9]+\u30ec\u30b9/)) {
              // /上限[0-9]+レス/  (に達しました)
              maxres = node.innerText;
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
          maxres,
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
   * カタログをロードしたイベント [sidebar/content]
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String name
   *         対象の板
   */
  onCatalogLoad : function (targetDocument, name, sidebarWindow=null) {
    var thread = null;
    var node, nodeName, node2, nodeName2;
    var threadLink;
        
    var num;
    var reply;
    var imageSrc, imageNum, imageWidth, imageHeight;
    var imageSrcType;
    var comment;

    let sortType = targetDocument.location
      ?.search.match(/[&\?]sort=([\d]+)/)?.[1] || 0;
    if (!targetDocument.location) {
      // DOMParserが作ったものにはlocationはないので内容から判断
      const href = targetDocument.body.querySelector('body>b>a[href]')?.href;
      if (href && /[\?&]mode=cat/.test(href)) {
        sortType = /[&\?]sort=([\d]+)/.exec(href)?.[1] || 0;
      }
    }
        
    var nodes = targetDocument.getElementsByTagName ("td");
    if (nodes.length > 0) {
      arAkahukuSidebar.resetCatalogOrder (name, sidebarWindow);
    }
    for (var i = 0; i < nodes.length; i ++) {
      node = nodes [i].firstChild;
            
      num = 0;
            
      reply = 0;
      imageNum = 0;
      imageSrc = "";
      imageWidth = 0; imageHeight = 0;
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
                if (node2.hasAttribute ("width"))
                  imageWidth = parseInt(node2.getAttribute ("width")) || 0;
                if (node2.hasAttribute ("height"))
                  imageHeight = parseInt(node2.getAttribute ("height")) || 0;
              }
              else if (nodeName2 == "small") {
                comment = node.textContent;
              }
              else if (nodeName2 == "font") {
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

      if (sortType == 8) {
        //そ順では表示されるのはレス数じゃない
        reply = -1;
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
        imageWidth: imageWidth,
        imageHeight: imageHeight,
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
  onThreadChange : function (name, num, {reply, expire, warning, lastNum, maxres}) {
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
      reply: reply ?? -1,
      expire: expire ?? "",
      warning: warning ?? "",
      lastNum: lastNum ?? -1,
      maxres: maxres ?? "",
    });
        
    arAkahukuSidebar.asyncUpdateVisited (name);
  },
    
  /**
   * 既読フラグを更新する [sidebar/content]
   *
   * @param  String name
   *         対象の板
   */
  asyncUpdateVisited : function (name) {
    if (arAkahukuSidebar.params.length > 0) {
      // for all sidebar windows registered
      let promises = [];
      for (let param of arAkahukuSidebar.params) {
        promises.push(arAkahukuSidebar.asyncUpdateVisitedFor (name, param).then(param => {
          arAkahukuSidebar.sort (name, param);
          arAkahukuSidebar.update (name, null, param);
          if (arAkahukuSidebar.enableMarked) {
            arAkahukuSidebar.sort ("*_*", param);
            arAkahukuSidebar.update ("*_*", null, param);
          }
          return param;
        }));
      }
      return Promise.all(promises);
    }
    // content-script
    return browser.runtime.sendMessage({
      'target': 'sidebar.js',
      'command': 'asyncUpdateVisited',
      'args': [name],
    });
  },
  asyncUpdateVisitedFor : function (name, param, callback=null) {
    let board;
    let cblist = new arAkahukuMergeItemCallbackList ();
    let threadcb = function (uri, visited) {
      this.wrappedObject.isVisited = visited;
    };
        
    if (name in param.boards) {
      board = param.boards [name];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      param.boards [name] = board;
    }
        
    for (let thread of board.threads) {
      let vc = cblist.createVisitedCallback (thread);
      vc.isVisitedHandler = threadcb;
      if (thread.threadLinkURLObject) {
        let url = thread.threadLinkURLObject.href;
        HistoryService.isVisited(url)
          .then((visited) => vc.isVisited(url, visited))
          .catch((err) => {
            Akahuku.debug.exception(err);
            vc.isVisited(url, false);
          });
      }
    }

    return new Promise((resolve, reject) => {
      cblist.asyncWaitRequests (function () {
        try {
          if (callback)
            callback (param);
        } catch (e) {
          reject(e);
        }
        resolve(param);
      });
    });
  },
    
  /**
   * ソートする
   *
   * @param  String name
   *         対象の板
   * @param  arAkahukuSidebarParam param
   */
  sort : function (name, param) {
    var board;
        
    if (name in param.boards) {
      board = param.boards [name];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      param.boards [name] = board;
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
   * 全スレのカタログ順の情報をリセットする [sidebar/content]
   */
  resetCatalogOrder : function (name, sidebarWindow=window) {
    var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
    if (param) {// sidebar
      if (!(name in param.boards)) {
        Akahuku.debug.warn('No board info in the registered param.', name);
        return;
      }
      var board = param.boards [name];
      if (board && board.threads) {
        for (var i = 0; i < board.threads.length; i ++) {
          board.threads [i].catalogOrder = 0;
        }
      }
      return;
    }
    // content script
    browser.runtime.sendMessage({
      'target': 'sidebar.js',
      'command': 'resetCatalogOrder',
      'args': [name],
    });
  },
    
  /**
   * 
   * @param arAkahukuSidebarParam param
   */
  updateMarked : function (param) {
    var markedBoard = param.boards ["*_*"];
        
    markedBoard.threads = new Array ();
    for (var name in param.boards) {
      var board = param.boards [name];
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
   * @param  Document sidebarDocuemtn
   *         (optional) 対象のサイドバードキュメント
   * @param  arAkahukuSidebarParam param
   */
  update : function (name, sidebarDocument, param) {
    if (!sidebarDocument) { // 互換性のため
      sidebarDocument
        = arAkahukuSidebar.getSidebarDocument (param.targetWindow);
    }
    if (!sidebarDocument) {
      // 赤福サイドバーを開いていない
      Akahuku.debug.error('No sidebar opened?');
      return;
    }
    var sidebarWindow = sidebarDocument.defaultView;
    var iframe
    = sidebarDocument.getElementById ("akahuku_sidebar_iframe_" + name);
    if (iframe == null) {
      Akahuku.debug.error('No sidebar iframe found for', name);
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
      ("mouseover", arAkahukuSidebar.onMouseMove, false);
      iframe.addEventListener
      ("mousedown", arAkahukuSidebar.onClick, false);
      iframe.addEventListener
      ("mouseout", arAkahukuSidebar.onMouseOut, false);
    }
        
    if (name in param.boards) {
      board = param.boards [name];
    }
    else {
      board = new arAkahukuSidebarBoard ();
      param.boards [name] = board;
    }
        
    if (targetDocument.body == null) {
      Akahuku.debug.error('No body');
      return;
    }
        
    arAkahukuSidebar.setIframeHtmlStyle (targetDocument);
    // 表示内容をクリア(nodeは残る)
    targetDocument.querySelectorAll('body>.akahuku_sidebar_thread')
      .forEach(elm => {
        elm.remove();
      });
    const upside_edge = targetDocument.querySelector('#upside_edge');
    const downside_edge = targetDocument.querySelector('#downside_edge');
        
    var hidden = 0;
    var i, j;
    for (i = 0;
         i < board.threads.length
           && i - hidden < arAkahukuSidebar.maxView;
         i ++) {
      thread = board.threads [i];
            
      aima = false;
      /*
      try {
        if (typeof chromeWindow.Aima_Aimani != "undefined") {
          if (chromeWindow.Aima_Aimani.hideNGNumberSidebarHandler) {
            hide
              = chromeWindow.Aima_Aimani.hideNGNumberSidebarHandler
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
      */
            
      var ok = true;
            
      try {
        if (thread.node == null) {
          ok = false;
        }
        else {
          div = thread.node;
                    
          div.dataset.visited = thread.isVisited;
          div.dataset.expired = thread.isExpired;
          div.dataset.marked = thread.isMarked;
          div.dataset.warning = thread.warning.length > 0;
          div.dataset.maxres = thread.maxres.length > 0;
                    
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
                  // [SECURITY] 読込はサニタイズが安全
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
                    node.style.color = "var(--incatalog-comment-color)";
                  }
                  node.style.visibility = "";
                }
              }
            }
          }
                    
          nodes = div.getElementsByTagName ("span");
          if (nodes && nodes.length >= 1) {
            for (j = 0; j < nodes.length; j ++) {
              node = nodes [j];
              if ("className" in node) {
                if (node.classList.contains("akahuku_sidebar_reply")) {
                  var text = "";
                  text += thread.reply;
                  arAkahukuDOM.setText (node, text);
                  node.classList[thread.maxres ? 'add' : 'remove']('warn');
                }
                else if (node.className == "akahuku_sidebar_reply_diff") {
                  let text = "";
                  if (thread.lastReply != -1) {
                    var diff
                      = thread.reply - thread.lastReply;
                    if (diff > 0) {
                      text += "+" + diff;
                    }
                    else if (diff < 0) {
                      text += diff;
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
                else if (node.classList.contains("akahuku_sidebar_expire")) {
                  arAkahukuDOM.setText (node, thread.expire);
                  node.classList[thread.warning ? 'add' : 'remove']('warn');
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
        const template = targetDocument.getElementById("thread_template");
        const fragment = template.content.cloneNode(true);
        div = fragment.querySelector("div.akahuku_sidebar_thread");
        div.dataset.visited = thread.isVisited;
        div.dataset.expired = thread.isExpired;
        div.dataset.marked = thread.isMarked;
        div.dataset.warning = thread.warning.length > 0;
        div.dataset.maxres = thread.maxres.length > 0;
        div.setAttribute ("__link", thread.threadLink);
        div.dataset.threadLink = thread.threadLink;
        div.setAttribute ("__num", thread.num);
                
        node = fragment.querySelector("img.akahuku_sidebar_image");
        if (thread.imageNum) {
          div.setAttribute ("__image", thread.imageSrcType);
          var src = thread.imageSrc;
          src = arAkahukuP2P.tryEnP2P (src);
          if (thread.isExpired && !arAkahukuP2P.enable) {
            src = Akahuku.protocolHandler.enAkahukuURI ("cache", src);
          }
          node.src = src;
          if (thread.imageLink) {
            node.setAttribute ("__link", thread.imageLink);
            div.dataset.imageLink = thread.imageLink;
          }
          // 表示サイズ設定に応じてブラウザが自動選択できるように(srcset,sizes)
          let srcset = [];
          if (thread.imageSrcCat) {
            srcset.push(`${thread.imageSrcCat} ${thread.imageWidthCat}w`);
          }
          if (thread.imageSrcThumb) {
            srcset.push(`${thread.imageSrcThumb} ${thread.imageWidthThumb}w`);
          }
          if (srcset.length > 0) {
            node.srcset = srcset.join(',');
            let w = arAkahukuSidebar.thumbnailSize;
            let h = w;
            const r = (thread.imageWidthThumb / thread.imageHeightThumb) ||
              (thread.imageWidthCat / thread.imageHeightCat) ||
              (thread.imageWidth / thread.imageHeight);
            if (r > 0) {
              if (arAkahukuSidebar.thumbnailFit == "contain") {
                w = Math.round(w * (r > 1 ? 1 : r));
                h = Math.round(h / (r > 1 ? r : 1));
              } else {// == "cover"
                w = Math.round(w * (r > 1 ? r : 1));
                h = Math.round(h / (r > 1 ? 1 : r));
              }
              // 実際の画像サイズはCSSなのでこれはただのヒント情報
              node.width = w;
              node.height = h;
            }
            node.sizes = `${w}px`;
          }
          // サムネズーム表示に備えた情報
          node.dataset.thumbWidth = thread.imageWidthThumb;
          node.dataset.thumbHeight = thread.imageHeightThumb;
          div.style.setProperty('--thumb-width', thread.imageWidthThumb);
          div.style.setProperty('--thumb-width-px', thread.imageWidthThumb + 'px');
          div.style.setProperty('--thumb-height', thread.imageHeightThumb + 'px');
          div.style.setProperty('--thumb-height-px', thread.imageHeightThumb + 'px');
        }
        else {
          node.remove();
          node = fragment.querySelector(".image_area");
          node?.remove();
        }
                
        if (!thread.isMarked) {
          node = fragment.querySelector("span.akahuku_sidebar_mark");
          node.style.display = "none";
        }
                
        node = fragment.querySelector("div.akahuku_sidebar_comment");
        /* thread.comment に HTML が含まれるので innerHTML を使用する  */
        // node.innerHTML = thread.comment;
        // [SECURITY] 読込はサニタイズが安全(コード実行はされないが)
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
          node.style.color = "var(--incatalog-comment-color)";
        }
                
        node = fragment.querySelector("div.akahuku_sidebar_status");
        node2 = fragment.querySelector("span.akahuku_sidebar_reply");
        var text = "";
        text += thread.reply;
        node2.classList[thread.maxres ? 'add' : 'remove']("warn");
        node2.appendChild (targetDocument.createTextNode (text));
        node2 = fragment.querySelector("span.akahuku_sidebar_reply_diff");
        text = "";
        if (thread.lastReply != -1) {
          var diff = thread.reply - thread.lastReply;
          if (diff > 0) {
            text += "+" + diff;
          }
          else if (diff < 0) {
            text += diff;
          }
        }
        node2.appendChild (targetDocument.createTextNode (text));
        if (thread.expire) {
          node2 = fragment.querySelector("span.akahuku_sidebar_expire2");
          node2.appendChild (targetDocument.createTextNode
                             (" \uFF0F "));
        }
        node2 = fragment.querySelector("span.akahuku_sidebar_expire");
        node2.classList[thread.warning ? 'add' : 'remove']('warn');
        node2.appendChild (targetDocument.createTextNode
                           (thread.expire));
        node2 = fragment.querySelector("span.akahuku_sidebar_aima");
        node2.setAttribute ("name",
                            "hide_" + server + "_" + dir
                            + "_" + thread.num + "_" + thread.imageNum);
        if (!aima) {
          node2.style.display = "none";
        }
                
        thread.node = div;
      }
            
      if (name == "*_*") {
        downside_edge.before(div.cloneNode (true));
      }
      else {
        downside_edge.before(div);
      }
    }

    // 更新時の設定保存
    targetDocument.body.setAttribute ("__sort", board._sortSign);
    targetDocument.body.setAttribute ("__maxview", arAkahukuSidebar.maxView);
  },

  setSidebarStyle : function (sidebarDocument) {
    let styleText = '';
    let style = sidebarDocument.getElementById ("akahuku_sidebar_style");
    if (!style) {
      Akahuku.debug.warn('No #akahuku_sidebar_style!');
      return;
    }
    if (arAkahukuSidebar.enableColorScheme) {
      styleText += ':root { color-scheme: light dark; }';
    }
    if (style.textContent != styleText) {
      style.textContent = styleText;
    }
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
    let fit = "contain";
    if (arAkahukuSidebar.thumbnailFit == "cover") {
      fit = "cover";
    }
    let th_font_px = 11;
    if (arAkahukuSidebar.enableColorScheme) {
      styleText += ':root { color-scheme: light dark; }\n';
    }
    styleText += `body {
      --image-size: ${size}px;
      --image-fit: ${fit};
      --thread-font-size: ${th_font_px}px;
    }`;
    style.textContent = styleText;
    if (arAkahukuSidebar.enableThumbnailZoom) {
      targetDocument.body.dataset.thumbnailZoom = true;
    } else {
      delete targetDocument.body.dataset.thumbnailZoom;
    }
    if (['row','catalog']
      .includes(arAkahukuSidebar.flowMode)) {
      targetDocument.body.dataset.flowMode = arAkahukuSidebar.flowMode;
    } else {
      delete targetDocument.body.dataset.flowMode;
    }
  },

  /**
   * 設定の変更をサイドバーに反映する
   */
  updateSidebarByConfig : function () {
    // for all attached windows
    for (var i = 0; i < arAkahukuSidebar.params.length; i ++) {
      var param = arAkahukuSidebar.params [i];
      arAkahukuSidebar.updateSidebarFor (param);
    }
  },
  updateSidebarFor : function (param) {
    var sidebarDocument
      = arAkahukuSidebar.getSidebarDocument (param.targetWindow);
    if (!sidebarDocument) {
      return;
    }
    if (!arAkahukuSidebar.enable) {
      arAkahukuSidebar.setSidebarStyle (sidebarDocument);
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

    delete sidebarDocument.body.dataset.disabled;

    // タブの見た目
    var container
    = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
    if (arAkahukuSidebar.enableTabVertical) {
      container.parentNode.style.flexDirection = "row";
      container.orient = "vertical";
      if (arAkahukuSidebar.flowMode == 'catalog') {
        container.setAttribute('compact','true');
      } else {
        container.removeAttribute('compact');
      }
    }
    else {
      container.parentNode.style.flexDirection = "column";
      container.orient = "horizontal";
      container.removeAttribute('compact');
    }
    container.hidden = arAkahukuSidebar.enableTabHidden;
    container.enableMenuButton = arAkahukuSidebar.enableTabMenu;
    arAkahukuSidebar.setSidebarStyle (sidebarDocument);

    // カタログ更新UI (更新まではしない)
    arAkahukuSidebar.updateCatalogRefreshUI (sidebarDocument);

    // ソート順UI (更新は後で)
    arAkahukuSidebar.updateSortOrderUI (sidebarDocument);

    // IframeHtml
    var sortSign = arAkahukuSidebar._getSortConfigSignature ();
    var iframes
      = sidebarDocument.getElementsByClassName ("akahuku_sidebar_iframe");
    let frameMarked = sidebarDocument.getElementById("akahuku_sidebar_iframe_*_*");
    if (frameMarked) {
      iframes = [...iframes, frameMarked];
    }
    try {
      for (var i = 0; i < iframes.length; i ++) {
        var name = iframes [i].id.replace (/^akahuku_sidebar_iframe_/, "");
        var targetDocument = iframes [i].contentDocument;
        var styleUpdated = false;
        var sorted = false;
        if (targetDocument.body.getAttribute ("__sort") != sortSign) {
          arAkahukuSidebar.sort (name, param);
          sorted = true;
        }
        if (sorted ||
            targetDocument.body.getAttribute ("__maxview")
            != arAkahukuSidebar.maxView) {
          arAkahukuSidebar.update (name, null, param);
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

  updateSortOrderUI : function (sidebarDocument) {
    if (!sidebarDocument) {
      Akahuku.debug.warn ("no sidebar!");
      return;
    }

    // ソート順選択
    let selects
      = sidebarDocument.getElementsByClassName ("sortorder_menu");
    for (const sel of selects) {
      sel.value = arAkahukuSidebar.sortType;
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
    var sidebarDocument = event.target.ownerDocument;
    var sidebarWindow = sidebarDocument.defaultView;
    var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var box = deck.selectedPanel;

    // TODO: ポップアップメニュー表示中は選択を変えない
        
    if (box.id.match (/^akahuku_sidebar_deck_(.+)$/)) {
      var name = RegExp.$1;
      var board;
            
      if (name in param.boards) {
        board = param.boards [name];
      }
      else {
        board = new arAkahukuSidebarBoard ();
        param.boards [name] = board;
      }
            
      var node = event.detail?.originalTarget || event.explicitOriginalTarget;
      var image = null;
      while (node) {
        if ("className" in node) {
          if (node.className == "image_area") {
            // 兄弟の画像ノードに情報を渡すため
            node = node.closest('.akahuku_sidebar_thread');
            node = node.querySelector('img.akahuku_sidebar_image') || node;
          }
          if (node.className == "akahuku_sidebar_thread") {
            if (node != board.lastSelected) {
              board.lastSelected = node;
            }
            break;
          }
          else if (node.className == "akahuku_sidebar_image") {
            if (node.getAttribute ("__link")) {
              if (node != board.lastSelectedImage) {
                board.lastSelectedImage = node;
              }
              image = node;
            }
            arAkahukuSidebar.updateZoomThumbProps(node);
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
   * サムネのズームのために必要なstyle varを更新する
   */
  updateZoomThumbProps : function (img) {
    let updateProp = (s, name, value) => {
      if (s.getPropertyValue(name) != value) {
        s.setProperty(name, value);
      }
    };
    const threadDiv = img.closest('div.akahuku_sidebar_thread');
    const rect = threadDiv.getClientRects()[0];
    updateProp(threadDiv.style, '--thread-left-px', rect.left + 'px');
    updateProp(threadDiv.style, '--thread-top-px', rect.top + 'px');

    const doc = img.ownerDocument;
    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    updateProp(doc.body.style, '--viewport-width', vw);
    updateProp(doc.body.style, '--viewport-height', vh);
    updateProp(doc.body.style, '--viewport-width-px', vw + 'px');
    updateProp(doc.body.style, '--viewport-height-px', vh + 'px');
  },
  /**
   * ズームしたサムネを読み込ませるよう促すためimg.sizesを更新する
   */
  updateZoomThumbSizes : function (img) {
    if (img.sizes) {
      let w = Math.max(
        arAkahukuSidebar.thumbnailSize,
        parseInt(img.dataset.thumbWidth) || 0);
      img.sizes = w + 'px';
    }
  },
    
  /**
   * マウスがフレームから出たイベント
   */
  onMouseOut : function (event) {
    if (event.eventPhase != event.AT_TARGET) {
      return;
    }
    var sidebarDocument = event.target.ownerDocument;
    // TODO: ポップアップメニュー表示中は非選択状態にはしない
    arAkahukuSidebar.unselectThread (sidebarDocument);
  },

  /**
   * スレを非選択状態にする
   */
  unselectThread : function (sidebarDocument) {
    var sidebarWindow = sidebarDocument.defaultView;
    var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var box = deck.selectedPanel;
    if (!box.id.match (/^akahuku_sidebar_deck_(.+)$/)) {
      return;
    }
    var name = RegExp.$1;
    if (!(name in param.boards)) {
      return;
    }
    var board = param.boards [name];
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
        
    var sidebarDocument = event.currentTarget.ownerDocument;
    var node = event.detail?.originalTarget || event.target;
    var nodes, div;
    var link = "";
    var i;
    const isCatalogMode = node.ownerDocument.body.dataset.flowMode == 'catalog';
        
    while (node) {
      if (node.className == "image_area") {
        // 兄弟の画像ノードに情報を渡すため
        node = node.closest('.akahuku_sidebar_thread');
        node = node.querySelector('img.akahuku_sidebar_image') || node;
      }
      if ("getAttribute" in node) {
        link = node.getAttribute ("__link");

        if (isCatalogMode) {
          // カタログモードでは画像クリックでもスレを開く
          link = node.dataset.threadLink;
        }
                
        if (link) {
          Tabs.focusByURL(link)
            .then((focused) => {
              if (!focused) {
                return Tabs.openNewTab(link, true);
              }
              // TODO:既存のスレをクリック時
              switch (arAkahukuSidebar.afterThreadClick) {
                case 'reload':
                  // force reload a content
                case 'diff':
                  // call arAkahukuReload.diffReloadCore()
                case 'sync':
                  // call arAkahukuReload.diffReloadCore() for sync
                case 'none':
              }
            })
            .catch((err) => {
                Akahuku.debug.exception(err);
            });

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
                        
            // TODO: Aima_aimani.changeNGNumberSidebarHandler(server, dir, num, imageNum, method == "hide")
                        
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
   * 0ページ/カタログで更新をクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onRefreshClick : function (event) {
    const button0 = event.target;
    const exp = /^akahuku_sidebar_refresh_(?<dest>0|catalog)_(?<name>(?<server>[^_]+)_(?<dir>.+))$/;
    const re = event.target.id.match(exp);
    if (!re) {
      return;
    }
    const {name, server, dir, dest} = re.groups;
    const sidebarDocument = event.target.ownerDocument;
    const sidebarWindow = sidebarDocument.defaultView;
    let url = `https://${server}.2chan.net/${dir}/`;
    if (dest == '0') {
      url = url + 'futaba.htm';
    } else if (dest == 'catalog') {
      url = url + 'futaba.php?mode=cat';
      let  sortType = parseInt (event.target.getAttribute ("__catSort"));
      if ((1 <= sortType && sortType <= 4) ||
        (6 <= sortType && sortType <= 9)) {
        url  += "&sort=" + sortType;
      }
      /*
      //何個のスレが入るようにするか
      let cx = 15;//カタログ横サイズ(本当は板ごとに初期値が違う)
      let cy = 5;//カタログ縦サイズ
      let numThreads  = Math.max(arAkahukuSidebar.maxView, cx*cy);
      cy = Math.ceil(numThreads/cx);
      let cl = 4;//60;//文字数
      // catサイズではなくthumbサイズ(50x50 px)を要求するか
      let largeImg = (arAkahukuSidebar.thumbnailSize > 50);
      let cm = 0;//文字位置
      //0:下(デフォルト)
      //<td><a href='*' ...><img src='*'            width=* height=* ...></a><br><small>*</small><br><font size=2>*</font></td>
      //1:右
      //<td><a href='*' ...><img src='*' align=left width=* height=* ...></a><br><small>*</small><font size=2>(*)</font></td>
      let ci = 0;//largeImg ? 1 : 0;
      let vh = 0;//見歴に追加(?)
      url += `&cxyl=${cx}x${cy}x${cl}x${vh}x${ci}`;
      */
    } else {
      Akahuku.debug.warn('Unkown destination');
    }
    arAkahukuSidebar.fetchAsDocument(url)
    .then(doc => {
      if (dest == '0') {
        arAkahukuSidebar.onNormalLoad(doc, name);
      } else if (dest == 'catalog') {
        arAkahukuSidebar.onCatalogLoad (doc, name, sidebarWindow);
      }

      const param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
      return arAkahukuSidebar.asyncUpdateVisitedFor (name, param)
        .then(param => {
          arAkahukuSidebar.sort (name, param);
          arAkahukuSidebar.update (name, sidebarDocument, param);
        });
    })
    .catch((e) => {
      Akahuku.debug.exception(e);
    })
    .finally(() => {
      // re-enable refresh buttons
      for (let btn of button0.parentElement.querySelectorAll(':scope>button')) {
        btn.removeAttribute ('disabled');
      }
    });

    // While loading...
    for (let btn of button0.parentElement.querySelectorAll(':scope>button')) {
      btn.setAttribute('disabled', 'true');
      btn.classList.remove('last_used')
    }
    button0.classList.add('last_used')
  },
    
  /**
   * 指定URLをフェッチして Document を得る
   */
  fetchAsDocument : async function (url, opts={
    credentials: 'include',
    redirect: 'follow',
    mode: 'no-cors',
  }) {
    return arAkahukuCompat.fetch(url, opts)
      .then(resp => {
        if (!resp.ok)
          throw new Error(resp.statusText);
        const charset = (resp.headers.get('content-type') || '')
          .match(/^[^;]*;\s*charset=(?<charset>[\-A-Za-z0-9_]+)/m)
          ?.groups?.charset;
        return Promise.all([resp.blob(), charset]);
      })
      .then(([blob, charset]) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => { resolve(reader.result) };
          reader.onerror = () => {
            reject(new Error('UTF-8 conversion via FileReader failed.'));
          };
          reader.readAsText(blob, charset);
        });
      })
      .then(responseText => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, 'text/html');

        // avoid baseURI == moz-extension:...
        let base = doc.head?.querySelector('base');
        let origBase = doc.head?.querySelector('base')?.href || '';
        if (!/^https?:/.test(origBase)) {
          if (!base) {
            base = doc.createElement('base');
            doc.head.appendChild(base);
          }
          base.href = url;
        }
        return doc;
      }).catch(e => {
        Akahuku.debug.exception(e);
      });
  },

  onChangeCatalogSelect : function (event) {
    const sortType = parseInt(event.target.value) || 0;
    if (arAkahukuSidebar.refreshCatalogType == sortType) {
      return;
    }
    arAkahukuSidebar.refreshCatalogType = sortType;
    arAkahukuConfig
      .setIntPref ("akahuku.sidebar.refresh.catalog.type", sortType);
    // 全タブのボタンに変更を反映
    arAkahukuSidebar.updateCatalogRefreshUI (event.target.ownerDocument);
  },

  /**
   * カタログ種類の選択を設定に合わせて更新
   */
  updateCatalogRefreshUI : function (sidebarDocument) {
    if (!sidebarDocument) {
      return;
    }
    // ポップアップメニューの選択を更新
    let label = '';
    const selects = sidebarDocument.getElementsByClassName("refresh_menu");
    for (const sel of selects) {
      if (sel.value != arAkahukuSidebar.refreshCatalogType) {
        sel.value = arAkahukuSidebar.refreshCatalogType;
      }
      if (!label) {
        label = sel.item(sel.selectedIndex).dataset.buttonLabel;
      }
    }
    var buttons
      = sidebarDocument.getElementsByClassName ("refresh_catalog");
    for (var i = 0; i < buttons.length; i ++) {
      buttons [i].textContent = label;
      buttons [i].title = label;
      buttons [i].setAttribute ("__catSort", arAkahukuSidebar.refreshCatalogType);
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
    var sidebarDocument = event.target.ownerDocument;
    var targetDocument = event.target.contentDocument;
    var param = arAkahukuSidebar.getSidebarParam (sidebarDocument.defaultView);
    if (targetDocument.location.hash) {
      var name = targetDocument.location.hash.substr (1);
      arAkahukuSidebar.asyncUpdateVisitedFor (name, param, function (param) {
        arAkahukuSidebar.sort (name, param);
        arAkahukuSidebar.update (name, sidebarDocument, param);
      });
    }

    targetDocument.body.addEventListener('animationstart', (event) => {
      if (event.animationName == 'zoomthumb') {
        arAkahukuSidebar.updateZoomThumbSizes(event.target);
      }
    }, true);

    const upside_edge = targetDocument.querySelector('#upside_edge');
    const downside_edge = targetDocument.querySelector('#downside_edge');
    const onTransitionEnd = (event) => {
      if (event.target.clientHeight >= 80) {
        let selector = 'button.refresh.last_used';
        if (arAkahukuSidebar.flowMode == 'catalog') {
          // カタログモードではカタログボタンにフォールバック
          selector += ', button.refresh_catalog';
        }
        const button = event.target
          .ownerDocument.defaultView
          .frameElement.closest('.box')
          .querySelector(selector);
        if (arAkahukuSidebar.enableWheelRefresh && !button.disabled) {
          button.click();
        }
      }
      event.target.style.removeProperty('--wheel-acu-delta-px');
    };
    upside_edge.addEventListener('transitionend', onTransitionEnd);
    downside_edge.addEventListener('transitionend', onTransitionEnd);
  },

  onIframeHtmlWheel : function (event) {
    const target = event.detail?.originalTarget || event.target;
    const targetDocument = target.ownerDocument;
    if (event.ctrlKey &&
        !event.altKey && !event.metaKey && !event.shiftKey) {
      // Ctrl-wheel でサムネサイズを変更する
      event.preventDefault ();
      event.stopPropagation ();
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
        if (arAkahukuSidebar._timerSetPref) {
          targetDocument.defaultView
            .clearTimeout (arAkahukuSidebar._timerSetPref);
          arAkahukuSidebar._timerSetPref = null;
        }
        arAkahukuSidebar._timerSetPref
          = targetDocument.defaultView
          .setTimeout (function () {
            arAkahukuConfig.setIntPref
            ("akahuku.sidebar.thumbnail.size",
             arAkahukuSidebar.thumbnailSize);
          }, 300);
      }
    }
    else if (!event.ctrlKey &&
        !event.altKey && !event.metaKey && !event.shiftKey) {
      //
      const targetWindow = target.ownerDocument.defaultView;
      const wheelDelta = (event.type === "wheel" ? event.deltaY : event.detail);
      const {scrollY, scrollMaxY} = targetWindow;
      let onEdge = false , up = false;
      if (wheelDelta > 0 && scrollY > scrollMaxY - 1) {
        // ページ下端
        onEdge = true; up = false;
      }
      else if (wheelDelta < 0 && scrollY <= 0) {
        // ページ上端
        onEdge = true; up = true;
      }
      if (onEdge) {
        let selector = 'button.refresh.last_used';
        if (arAkahukuSidebar.flowMode == 'catalog') {
          // カタログモードではカタログボタンにフォールバック
          selector += ', button.refresh_catalog';
        }
        const buttonRefresh = targetWindow.frameElement.closest('.box')
          .querySelector(selector);
        if (!arAkahukuSidebar.enableWheelRefresh ||
          !buttonRefresh || buttonRefresh.disabled) return;
        const edge = targetDocument.querySelector(up ? '#upside_edge' : '#downside_edge');
        let delta_px = edge.style.getPropertyValue('--wheel-acu-delta-px');
        if (!delta_px) {
          delta_px = - Math.abs(wheelDelta);//to set zero
         }
        let new_delta = parseInt(delta_px) + Math.abs(wheelDelta);
        if (new_delta >= 80 && edge.clientHeight >= 80) {
          new_delta = -1;
        }
        if (new_delta >= 0) {
          edge.style.setProperty('--wheel-acu-delta-px', new_delta + 'px');
          if (!up) {
            edge.scrollIntoView({block:'end'});
          }
        }
        else {
          edge.style.removeProperty('--wheel-acu-delta-px');
          buttonRefresh.click();
        }
      }
    }
  },
    
  /**
   * サイドバーをロードしたイベント
   *
   * @param  Document sidebarDocument
   *         サイドバーのドキュメント
   */
  onSidebarLoad : function (sidebarDocument) {
    if (!arAkahukuSidebar.enable) {
      let warn = sidebarDocument.getElementById('disabled_warning');
      // 設定で無効です
      warn.textContent = '\u8A2D\u5B9A\u3067\u7121\u52B9\u3067\u3059';
      return;
    }
    var param = arAkahukuSidebar.getSidebarParam (sidebarDocument.defaultView);
    // 複数は開けない
    if (param.currentSidebarDocument) {
      return;
    }
    delete sidebarDocument.body.dataset.disabled;
    param.currentSidebarDocument = sidebarDocument;
        
    var container
    = sidebarDocument.getElementById ("akahuku_sidebar_tabcontainer");
    var deck = sidebarDocument.getElementById ("akahuku_sidebar_deck");
    var tab, button, box, iframe, buttons;
    var name, tmp;
        
    container.menuEventListener = arAkahukuSidebar;
        
    if (arAkahukuSidebar.enableTabVertical) {
      container.parentNode.style.flexDirection = "row";
      container.orient = "vertical";
      if (arAkahukuSidebar.flowMode == 'catalog') {
        container.setAttribute('compact','true');
      }
    } else {
      container.parentNode.style.flexDirection = "column";
      container.orient = "horizontal";
    }
    container.hidden = arAkahukuSidebar.enableTabHidden;
    container.enableMenuButton = arAkahukuSidebar.enableTabMenu;
    arAkahukuSidebar.setSidebarStyle (sidebarDocument);
        
    sidebarDocument.addEventListener("contextmenu", (event) => {
      // arAkahukuSidebar.setContextMenu (event);
    });
    sidebarDocument.addEventListener("popuphiding", (event) => {
      // ポップアップが消えるときにスレ選択を解除する
      arAkahukuSidebar.unselectThread (event.target.ownerDocument || event.target);
    });
        
    // ソート順の選択をUIに反映
    arAkahukuSidebar.updateSortOrderUI (sidebarDocument);
        
    let setupIframeForEvents = function (iframe) {
      // iframeの境界を超えてイベントがbubblingしてこないので
      // 手動で上位フレームへ渡す
      let bubbleEventsInIframe = function (event) {
        let ev = new CustomEvent(event.type, {
          bubbles: true,
          cancelable: false,
          detail: {
            originalTarget: event.explicitOriginalTarget,
          },
        });
        if (event.type.startsWith('mouse') | event.type == 'wheel') {
          let rect = iframe.getBoundingClientRect();
          ev.clientX = event.clientX + rect.left;
          ev.clientY = event.clientY + rect.top;
          ['button','ctrlKey','metaKey','shiftKey','deltaY'].forEach(n => {
            n in event ? ev[n] = event[n] : false;
          });
        }

        if (event.type == 'wheel' && event.ctrlKey &&
            !event.altKey && !event.metaKey && !event.shiftKey) {
          // Ctrl-wheel でサムネサイズを変更する
          event.preventDefault ();
        }
        iframe.dispatchEvent(ev);
      };
      ['mousemove','mouseover','mousedown','mouseup','wheel'].forEach(n => {
        iframe.contentWindow
          .addEventListener(n, bubbleEventsInIframe, {passive: n != 'wheel'});
      });
    };
        
    /* タブを作る */
    var i = 0;
    for (i = 0; i < arAkahukuSidebar.list.length; i ++) {
      tmp = arAkahukuSidebar.list [i];
      name = tmp.replace (/:/, "_");
            
      if (name in param.boards) {
        var board, thread;
        board = param.boards [name];
        board.lastSelected = null;
        board.lastSelectedImage = null;
        for (var j = 0; j < board.threads.length; j ++) {
          thread = board.threads [j];
          thread.node = null;
        }
      }
            
      tab = sidebarDocument.createElement ("button");
      tab.id = "akahuku_sidebar_tab_" + name;
      tab.className = "tab align-center orient-vertical";
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
      var l1 = sidebarDocument.createElement ("span");
      l1.className = "label";
      l1.textContent = n1;
      tab.appendChild (l1);
      if (n2) {
        var l2 = sidebarDocument.createElement ("span");
        l2.className = "label";
        l2.textContent = n2;
        tab.appendChild (l2);
      }
      if (i == 0) {
        tab.setAttribute ("selected", "true");
      }
      tab.addEventListener
        ("click",
         function () {
          arAkahukuSidebar.onTabClick (arguments [0]);
        }, false);
      container.appendChild (tab);
            
      box = sidebarDocument.createElement ("div");
      box.id = "akahuku_sidebar_deck_" + name;
      box.className = "box orient-vertical";
      box.style.flexGlow = "1";
      buttons = sidebarDocument.createElement ("div");
      buttons.className = "buttons box";
      buttons.id = "akahuku_sidebar_buttons_" + name;
      button = sidebarDocument.createElement ("button");
      button.id = "akahuku_sidebar_refresh_0_" + name;
      button.className = "refresh";
      button.textContent = "0 \u30DA\u30FC\u30B8";
      button.addEventListener
        ("click",
         function () {
          arAkahukuSidebar.onRefreshClick (arguments [0]);
        }, false);
      buttons.appendChild (button);
      if (arAkahukuBoard.hasCatalog (tmp)) {
        button = sidebarDocument.createElement ("button");
        button.id = "akahuku_sidebar_refresh_catalog_" + name;
        button.className = "refresh refresh_catalog";
        button.textContent = "\u30AB\u30BF\u30ED\u30B0";
        button.addEventListener
          ("click",
           function () {
            arAkahukuSidebar.onRefreshClick (arguments [0]);
          }, false);
        buttons.appendChild (button);
        // カタログ種類
        let template = sidebarDocument.getElementById('akahuku-sidebar-catalog-select');
        button = template.content.firstElementChild.cloneNode(true);
        button.id =  "akahuku_sidebar_refresh_cat_menu_" + name;
        button.className = "refresh_menu";
        buttons.appendChild (button);
        button.addEventListener("change", (event) => {
          arAkahukuSidebar.onChangeCatalogSelect (event);
        });
      }
      // ソート順
      let template = sidebarDocument.getElementById('akahuku-sidebar-sortorder-select');
      button = template.content.firstElementChild.cloneNode(true);
      button.id = "akahuku_sidebar_sortorder_" + name;
      button.className = "sortorder_menu";
      button.addEventListener("click", (event) => {
        arAkahukuSidebar.onSort(event, 0, parseInt(event.target.value));
      });
      buttons.appendChild (button);
      box.appendChild (buttons);
      iframe = sidebarDocument.createElement ("iframe");
      iframe.id = "akahuku_sidebar_iframe_" + name;
      iframe.className = "akahuku_sidebar_iframe";
      iframe.setAttribute ("type", "content");//念のため制限
      iframe.addEventListener
        ("load", arAkahukuSidebar.onIframeHtmlLoad, true);
      iframe.setAttribute ("src",
                           "/sidebar/sidebar_html.html#" + name);
      iframe.style.flexGrow = "1";

      iframe.addEventListener
        ('wheel', function (ev) {
          arAkahukuSidebar.onIframeHtmlWheel (ev);
        }, false);
            
      box.appendChild (iframe);
      deck.appendChild (box);
      if (i == 0) {
        deck.selectedPanel = box;
      }
      setupIframeForEvents(iframe);
    }
    if (arAkahukuSidebar.enableMarked) {
      tmp = "*:*";
      name = tmp.replace (/:/, "_");
            
      tab = sidebarDocument.createElement ("button");
      tab.id = "akahuku_sidebar_tab_" + name;
      tab.className = "tab align-center orient-vertical";
      tab.setAttribute ("__item_label", "\u30DE\u30FC\u30AF");
      tab.setAttribute ("__item_value", tmp);
      n1 = "\u30DE\u30FC\u30AF";
      var l1 = sidebarDocument.createElement ("span");
      l1.textContent = n1;
      tab.appendChild (l1);
      if (i == 0) {
        tab.setAttribute ("selected", "true");
      }
      tab.addEventListener
      ("click",
       function () {
        arAkahukuSidebar.onTabClick (arguments [0]);
      }, false);
      container.appendChild (tab);
            
      box = sidebarDocument.createElement ("div");
      box.id = "akahuku_sidebar_deck_" + name;
      box.className = "box orient-vertical";
      box.style.flexGlow = "1";
      iframe = sidebarDocument.createElement ("iframe");
      iframe.id = "akahuku_sidebar_iframe_" + name;
      iframe.setAttribute ("type", "content"); //念のため制限
      iframe.addEventListener
        ("load", arAkahukuSidebar.onIframeHtmlLoad, true);
      iframe.setAttribute ("src",
                           "/sidebar/sidebar_html.html#" + name);
      iframe.style.flexGrow = "1";
            
      box.appendChild (iframe);
      deck.appendChild (box);
      if (i == 0) {
        deck.selectedPanel = box;
      }
      setupIframeForEvents(iframe);
    }
    var spacer = sidebarDocument.createElement ("div");
    spacer.className = "tabspace";
    spacer.style.width = "auto";
    container.appendChild (spacer);

    arAkahukuSidebar.updateCatalogRefreshUI (sidebarDocument);
    arAkahukuSidebar.updateSortOrderUI (sidebarDocument);
  },
    
  /**
   * サイドバーをアンロードしたイベント
   *
   * @param  Document sidebarDocument
   *         サイドバーのドキュメント
   */
  onSidebarUnload : function (sidebarDocument) {
    var sidebarWindow = sidebarDocument.defaultView;
    var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
    if (param.currentSidebarDocument != sidebarDocument) {
      return;
    }
    param.currentSidebarDocument = null;

    // スレッド・板情報からの DOM 参照を切断
    for (var name in param.boards) {
      var board = param.boards [name];
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
    var sidebarDocument = event.target.ownerDocument;
    var sidebarWindow = sidebarDocument.defaultView;
    var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
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
        if (name in param.boards) {
          var board = param.boards [name];
                    
          if (board.lastSelected) {
            var num = board.lastSelected.getAttribute ("__num");
            var thread = board.getThread (num);
            thread.isMarked = (sorttype == 0);
          }
        }
      }

      // ソートタイプの状態を反映
      arAkahukuSidebar.updateSortOrderUI (sidebarDocument);
            
      arAkahukuSidebar.asyncUpdateVisitedFor (name, param, function () {
        arAkahukuSidebar.sort (name, param);
        arAkahukuSidebar.update (name, sidebarDocument, param);
        if (arAkahukuSidebar.enableMarked) {
          arAkahukuSidebar.updateMarked (param);
          arAkahukuSidebar.sort ("*_*", param);
          arAkahukuSidebar.update ("*_*", sidebarDocument, param);
        }
      });
    }
  },

  markThread : function (name, num, doMark) {
    const param = arAkahukuSidebar.getSidebarParam (window);
    const sidebarDocument = window.document;
    if (!param) {
      Akahuku.debug.error('No sidebar param for window');
      return;
    }
    const thread = param.boards[name]?.getThread(num);
    if (!thread) {
      Akahuku.debug.warn(`No thread No.${num} in the board ${name}`);
      return;
    }

    thread.isMarked = doMark;

    arAkahukuSidebar.sort (name, param);
    arAkahukuSidebar.update (name, sidebarDocument, param);
    if (arAkahukuSidebar.enableMarked) {
      arAkahukuSidebar.updateMarked (param);
      arAkahukuSidebar.sort ("*_*", param);
      arAkahukuSidebar.update ("*_*", sidebarDocument, param);
    }
  },
    
  /**
   * タブをクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onTabClick : function (event) {
    let target = event.target;
    target = target.closest('button[id]') || target;
    arAkahukuSidebar.onTabClickCore (target);
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
      let tabs = container.querySelectorAll(':scope>button[id]');
      for (let tab2 of tabs) {
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
      var sidebarWindow = sidebarDocument.defaultView;
      var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
      param.lastFocusedPanel = name;
      if (iframe) {
        var targetDocument = iframe.contentDocument;
        if (targetDocument.body.getAttribute ("__sort") != sortSign) {
          arAkahukuSidebar.sort (name, param);
          arAkahukuSidebar.update (name, sidebarDocument, param);
        }
      }
    }
  },

  /**
   * サイドバーに板のタブがあるか [sidebar/content]
   *
   * @param String name
   * @param Window sidebarWindow or null
   */
  hasTabForBoard : function (name, sidebarWindow=null) {
    const param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
    if (param) {// in sidebar
      const iframe = sidebarWindow.document
        .getElementById ('akahuku_sidebar_iframe_' + name);
      return iframe !== null;
    }
    else { // content script
      // 同期的には問い合わせられないので設定から決定
      if (!arAkahukuSidebar.enable)
        return false;
      //TODO サイドバーが開いているか: いなければfalse
      for (const id of arAkahukuSidebar.list) {
        if (name == id.replace (/:/, "_")) {
          return true;
        }
      }
      return false;
    }
  },
    
  /**
   * サイドバーに板の情報があるか
   *
   * @param String name
   * @param Window sidebarWindow or null
   * @return Boolean
   */
  hasBoard : function (name, sidebarWindow) {
    var param = arAkahukuSidebar.getSidebarParam (sidebarWindow);
    if (param) {
      return (name in param.boards);
    }
    // content-script:
    // 同期的には得られないから推定
    if (!arAkahukuSidebar.enable)
      return false;
    //TODO サイドバーが開いているか:
    // いなければ非表示の間も更新する設定かどうか
    for (const id of arAkahukuSidebar.list) {
      if (name == id.replace (/:/, "_")) {
        return true;
      }
    }
    return false;
  },

  /**
   * スレの情報を得る [sidebar]
   *
   * @param String boardName
   * @param Number threadNumber
   * @return Object or null
   */
  getThread : function (boardName, threadNumber) {
    let param = arAkahukuSidebar.getSidebarParam (window);
    if (!param) {
      Akahuku.debug.error('Deprecated for content scripts');
      return null;
    }
    if (arAkahukuSidebar.hasBoard (boardName, browser)) {
      let thread = param.boards [boardName].getThread (threadNumber);
      if (thread) {
        return JSON.parse (JSON.stringify (thread));
      }
    }
    return null;
  },
  asyncGetThread : function (boardName, threadNumber) {
    let param = arAkahukuSidebar.getSidebarParam (window);
    if (param) {// sidebar script
      return Promise.resolve(arAkahukuSidebar.getThread(boardName, threadNumber));
    }
    // content script
    return browser.runtime.sendMessage({
      'target': 'sidebar.js',
      'command': 'asyncGetThread',
      'args': [boardName, threadNumber],
    });
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
        if (!arAkahukuSidebar.hasTabForBoard (name, targetDocument.defaultView)) {
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
            
      arAkahukuSidebar.asyncUpdateVisited (name)
        .catch(e => Akahuku.debug.exception(e));
    }
  }
};
