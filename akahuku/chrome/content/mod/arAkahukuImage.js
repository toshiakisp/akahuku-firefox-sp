
/* global Components, Promise,
 *   Akahuku, arAkahukuConfig, arAkahukuCompat, arAkahukuImageURL,
 *   arAkahukuDOM, arAkahukuFile, arAkahukuWindow, arAkahukuConverter,
 *   arAkahukuP2P, arAkahukuSound, arAkahukuUtil
 *   AkahukuFileUtil, AkahukuFS,
 */

/**
 * 画像の保存のリスナ
 *   Inherits From: nsIWebProgressListener
 */
function arAkahukuImageListener () {
}
arAkahukuImageListener.prototype = {
  storage : null, /* Promise or FileStorage 保存先のストレージ */
  saveLeafName : "", /* String  保存先のファイル名 */
  tmpLeafName : "",
  finished : false,
  callback : null,
  expectedContentTypePattern : /^image\//,
    
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
        || iid.equals (Components.interfaces.nsIWebProgressListener)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  setFilePath : function (filePath, tmpfilePath) {
    this.saveLeafName = AkahukuFS.Path.basename (filePath);
    this.tmpLeafName = AkahukuFS.Path.basename (tmpfilePath);
    var dirname = AkahukuFS.Path.dirname (tmpfilePath);
    var that = this;
    this.storage = AkahukuFS.getFileStorage ({name: dirname})
    .then (function (value) { that.storage = value; });
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
    var httpStatus = 0;
    var httpSucceeded = false;
    if (this.finished) {
      // 既に保存済み
      return;
    }
    try {
      httpStatus
        = request.QueryInterface (Components.interfaces.nsIHttpChannel)
        .responseStatus;
      httpSucceeded = request.requestSucceeded;
    }
    catch (e) {
    }
        
    try {
    if (stateFlags
        & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
      this.finished = true;
      var that = this;
      if (httpStatus == 0) {
        /* P2P */
                
        Promise.resolve (this.storage).then (function () {
          return that.storage.get (that.tmpLeafName);
        }).then (function (file) {
          if (file.size > 0) {
            that.storage.move (that.tmpLeafName, that.saveLeafName)
            .then (function () {
              return that.storage.get (that.saveLeafName);
            }).then (function (file) {
              try {
                that.callback (true, file, that.storage, "");
              }
              catch (e) {
                Akahuku.debug.exception (e);
              }
            }).catch (function (error) {
              that.callback (false, null, null, "");
              Akahuku.debug.error (error.name + ": " + error);
            });
            return true;
          }
          else {
            that.storage.remove (that.tmpLeafName)
            .catch (function (error) {
              Akahuku.debug.error (error.name);
            });
            return Promise.reject ({name:"FileSizeIsZero"});
          }
        }).catch (function (error) {
          var msg = "";
          if (that.httpStatusAtStart == 404) {
            // "ファイルがないよ"
            msg = "\u30D5\u30A1\u30A4\u30EB\u304C\u306A\u3044\u3088";
          }
          else if (that.httpStatusAtStart > 0) {
            // 一度正常にスタートした後のエラー
            msg = "\u4FDD\u5B58\u5931\u6557" // "保存失敗"
              + "(HTTP " + that.httpStatusAtStart + ")";
          }
          that.callback (false, null, null, msg);
        });
      }
      else if (httpSucceeded) {
        if (this.expectedContentTypePattern &&
            this.expectedContentTypePattern.test (request.contentType)) {
          Promise.resolve (this.storage).then (function () {
            return that.storage.move (that.tmpLeafName, that.saveLeafName);
          }).then (function () {
            return that.storage.get (that.saveLeafName);
          }).then (function (file) {
            try {
              that.callback (true, file, that.storage, "");
            }
            catch (e) {
              Akahuku.debug.exception (e);
            }
          }).catch (function (error) {
            that.callback (false, null, null, "");
            Akahuku.debug.error (error.name + ": " + error);
          });
        }
        else {
          // 画像ではないがどうするかはコールバック次第
          Akahuku.debug.warn ("arAkahukuImageListener: "
              + "Unexpected Content-Type: " + request.contentType);
          Promise.resolve (this.storage).then (function () {
            return that.storage.get (that.tmpLeafName);
          }).then (function (file) {
            try {
              that.callback (false, file, that.storage, "");
            }
            catch (e) {
              Akahuku.debug.exception (e);
            }
          }).catch (function (error) {
            that.callback (false, null, null, "");
            Akahuku.debug.error (error.name + ": " + error);
          });
        }
      }
      else {
        Promise.resolve (this.storage).then (function () {
          return that.storage.remove (that.tmpLeafName);
        }).catch (function (error) {
          Akahuku.debug.error (error.name + ": " + error);
        });
        this.callback (false, null, null, "");
      }
    }
    else if (stateFlags
        & Components.interfaces.nsIWebProgressListener.STATE_START) {
      // 通信開始
      if (httpStatus > 0) {
        this.httpStatusAtStart = httpStatus
      }
    }

    }
    catch (e) { Akahuku.debug.exception (e);
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
 * 画像の保存
 */
var arAkahukuImage = {
  enable : false,                 /* Boolean  画像を保存 */
  baseList : new Array (),        /* Array  保存先のディレクトリ */
  
  enableLimit : false,            /* Boolean  最大サイズ指定 */
  limitWidth : 0,                 /* Boolean  最大サイズ (幅) */
  limitHeight : 0,                /* Boolean  最大サイズ (高さ) */
  limitUnit : "px",               /* Boolean  単位 */
    
  buttonSize : "",                /* String  ボタンサイズ指定 */
    
  enableAutoLinkPreview : false,  /* Boolean  オートリンクの
                                   *   プレビューにも付ける */
  enableLinkMenu : false,         /* Boolean  リンクの
                                   *   コンテキストメニューから保存 */
    
  lastID : 0,           /* Number  前回設定した ID の番号 */
    
  currentTarget : null,    /* HTMLAnchorElement  保存先選択中のボタン */
  currentNormal : false,   /* Boolean  保存先選択中のボタンが通常のボタンか */
  lastTargetDirIndex : -1, /* Number  最後に保存したディレクトリのインデックス */

  attachToWindow : function (window) {
  },
  dettachFromWindow : function (window) {
  },

  initContextMenus : function (contextMenus) {
    contextMenus.create ({
      id: "akahuku-saveimage-popup",
      contexts: ["_xul_mainpopupset"],
      title: "akahuku-saveimage-popup",
      _onshowing: arAkahukuImage.setPopup,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-separator9",
      type: "separator",
    });
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
      if (arAkahukuImage.enable) {
        style
        .addRule (".akahuku_saveimage_defmargin",
                  "margin-left: 40px !important;")
        .addRule ("a.akahuku_saveimage_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_saveimage_button2",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_deleteimage_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_thumbimage_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_srcimage_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("span.akahuku_saveimage_message",
                  "font-size: 9pt; "
                  + "color: #800000; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_saveimage_stop",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("span.akahuku_saveimage_container",
                  "font-size: 9pt;")
        .addRule ("a.akahuku_saveimage_button",
                  "font-size: " + arAkahukuImage.buttonSize + ";")
        .addRule ("a.akahuku_thumbimage_button",
                  "font-size: " + arAkahukuImage.buttonSize + ";")
        .addRule ("a.akahuku_srcimage_button",
                  "font-size: " + arAkahukuImage.buttonSize + ";")
        .addRule ("a.akahuku_deleteimage_button",
                  "font-size: " + arAkahukuImage.buttonSize + ";");
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuImage.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.saveimage", false);
    if (Components.classes ["@mozilla.org/binaryinputstream;1"]
        == undefined) {
      arAkahukuImage.enable = false;
    }
    if (arAkahukuImage.enable) {
      var list = new Array ();
      
      var value;
      
      value
      = arAkahukuConfig
      .initPref ("char", "akahuku.saveimage.base.list2", "null");
      if (value != "null") {
        list = JSON.parse (unescape (value));
        while (list.length && list [0] == undefined) {
          list.shift ();
        }
      }
      else {
        value
        = arAkahukuConfig
        .initPref ("char", "akahuku.saveimage.base.list", "");
        if (value != "") {
          var old_instantsrc
          = arAkahukuConfig
          .initPref ("bool", "akahuku.saveimage.instantsrc", true);
          var old_instantsrc_always
          = arAkahukuConfig
          .initPref ("bool", "akahuku.saveimage.instantsrc.always", false);
          
          /* 値を解析するだけなので代入はしない */
          value.replace
            (/([^&,]*)&([^&,]*)&?([^&,]*)&?([^&,]*)?&?([^&,]*)?,?/g,
             function (matched, name, dir, dialog, subdir, key) {
              var value = {};
              
              if (!dialog) {
                dialog = "xx";
              }
              if (!subdir) {
                subdir = "0";
              }
              if (subdir == "1") {
                subdir = "12";
              }
              var dialog_keep = "x";
              if (dialog.match (/(.)(.)/)) {
                dialog = RegExp.$1;
                dialog_keep = RegExp.$2;
                
                if (unescape (dialog) == "x") {
                  dialog_keep = "x";
                }
              }
              if (dialog_keep == "o") {
                subdir = "0";
              }
              
              value.name = unescape (name);
              value.dir = unescape (dir);
              value.dialog = (unescape (dialog) == "o");
              value.dialog_keep = (unescape (dialog_keep) == "o");
              value.subdir_type = "simple";
              value.key = unescape (key);
              value.instantsrc = old_instantsrc;
              value.instantsrc_always = old_instantsrc_always;
              
              subdir = parseInt (unescape (subdir));
              value.subdir_url = (subdir & 32) ? true : false;
              value.subdir_board = (subdir & 2) ? true : false;
              value.subdir_server = (subdir & 4) ? true : false;
              value.subdir_dir = (subdir & 8) ? true : false;
              value.subdir_thread = (subdir & 16) ? true : false;
              value.subdir_msg8b = (subdir & 64) ? true : false;
              
              list.push (value);
            });
        }
      }
      arAkahukuImage.baseList = list;
      
      arAkahukuImage.enableLimit
      = arAkahukuConfig
      .initPref ("bool", "akahuku.saveimage.limit", false);
      if (arAkahukuImage.enableLimit) {
        arAkahukuImage.limitWidth
          = arAkahukuConfig
          .initPref ("int",  "akahuku.saveimage.limit.width", 1024);
        arAkahukuImage.limitHeight
          = arAkahukuConfig
          .initPref ("int",  "akahuku.saveimage.limit.height", 1024);
        arAkahukuImage.limitUnit
          = arAkahukuConfig
          .initPref ("char",  "akahuku.saveimage.limit.unit", "px");
        if (["px", "view"].indexOf (arAkahukuImage.limitUnit) == -1) {
          // 不正な設定値の場合
          arAkahukuImage.limitUnit = "px";
        }
      }
            
      value
      = arAkahukuConfig
      .initPref ("char", "akahuku.saveimage.buttonsize", "1em");
      arAkahukuImage.buttonSize = unescape (value);
            
      arAkahukuImage.enableAutoLinkPreview
      = arAkahukuConfig
      .initPref ("bool", "akahuku.saveimage.autolink.preview", false);
            
      arAkahukuImage.enableLinkMenu
      = arAkahukuConfig
      .initPref ("bool", "akahuku.saveimage.linkmenu", false);
    }
  },
    
  /**
   * メニューが開かれるイベント
   * メニューの項目の表示／非表示を設定する
   *
   * @param  Event event
   *         対象のイベント
   */
  setContextMenu : function (event) {
    var popup = event.target;
    var document = event.currentTarget.ownerDocument;
    var gContextMenu = document.defaultView.gContextMenu;
    var browser = gContextMenu.browser;
    if (!browser) {
      var contentWindow = gContextMenu.target.ownerDocument.defaultView;
      browser = arAkahukuWindow.getBrowserForWindow (contentWindow);
    }
        
    var label, menuitem;
        
    menuitem = popup.firstChild;
    while (menuitem) {
      if ("className" in menuitem
          && menuitem.className == "__akahuku_saveimage") {
        var tmp = menuitem;
        menuitem = menuitem.nextSibling;
        popup.removeChild (tmp);
      }
      else {
        menuitem = menuitem.nextSibling;
      }
    }
        
    var sep;
    sep
    = document
    .getElementById ("akahuku-menuitem-content-separator9");
    if (!sep) {
      return;
    }
    sep.hidden = true;
        
    if (!arAkahukuImage.enableLinkMenu) {
      return;
    }

    var c = arAkahukuImage.getContextMenuContentData (gContextMenu.target);
    if (!c.isSaveImageLink) {
      return;
    }
        
    sep.hidden = false;
        
    for (var i = arAkahukuImage.baseList.length - 1; i >= 0; i --) {
      if (arAkahukuImage.baseList [i].name) {
        label = arAkahukuImage.baseList [i].name;
      }
      else {
        label = arAkahukuImage.baseList [i].dir;
      }
      menuitem = document.createElement ("menuitem");
      if (arAkahukuImage.baseList [i].key) {
        menuitem.setAttribute ("accesskey",
                               arAkahukuImage.baseList [i].key);
        if (!Akahuku.isRunningOnWindows) {
          label += " (" + arAkahukuImage.baseList [i].key + ")";
        }
      }
      menuitem.setAttribute ("label", label);
      menuitem.className = "__akahuku_saveimage";
      menuitem.addEventListener ("command", (function (i) {
        return function () {
          arAkahukuImage.selectSaveImageDirFromXUL (i, false, browser);
        }
      })(i), false);
      popup.insertBefore (menuitem, sep.nextSibling);
    }
  },

  lastContextMenuContentData : null,

  setContextMenuContentData : function (data) {
    arAkahukuImage.lastContextMenuContentData = data;
  },

  getContextMenuContentData : function (targetNode) {
    if (arAkahukuImage.lastContextMenuContentData) {
      // 事前にセットされていたらそれを使う (e10s)
      return arAkahukuImage.lastContextMenuContentData;
    }

    var data = {
      isSaveImageLink : false,
    };

    if (!targetNode) {
      return data;
    }

    var linkNode = targetNode;
    if (linkNode.nodeName.toLowerCase () != "a") {
      linkNode = arAkahukuDOM.findParentNode (linkNode, "a");
    }
    if (linkNode && linkNode.hasAttribute ("__akahuku_saveimage_id")) {
      var id = linkNode.getAttribute ("__akahuku_saveimage_id");
      var targetDocument = linkNode.ownerDocument;
      arAkahukuImage.currentTarget
      = targetDocument.getElementById ("akahuku_saveimage_button_" + id);
      arAkahukuImage.currentNormal
      = (linkNode.getAttribute ("__akahuku_saveimage_normal") == 1);
      if (arAkahukuImage.currentTarget &&
          arAkahukuImage.currentTarget.style.display != "none") {
        data.isSaveImageLink = true;
      }
    }

    return data;
  },
    
  /**
   * プレビューボタンに画像を保存ボタンを付ける
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLAnchorElement button
   *         プレビューボタン
   * @param  String url
   *         プレビュー対象のアドレス
   * @param  HTMLAnchorElement linkNode
   *         リンク要素
   */
  createSaveImageButton : function (targetDocument, button, url, linkNode) {
    var leafName = "";
    if (url.match (/\/([^\/]+)$/)) {
      leafName = RegExp.$1;
    }
    else {
      return;
    }
        
    var id;
    if (arAkahukuImage.enableLinkMenu) {
      id = arAkahukuImage.lastID;
      arAkahukuImage.lastID ++;
      linkNode.setAttribute ("__akahuku_saveimage_id", id);
      linkNode.setAttribute ("__akahuku_saveimage_normal", 0);
    }
        
    var button2 = targetDocument.createElement ("a");
    button2.className = "akahuku_saveimage_button2";
    button2.setAttribute ("dummyhref", url);
    button2.setAttribute ("dummyleafname", leafName);
    if (arAkahukuImage.enableLinkMenu) {
      button2.id = "akahuku_saveimage_button_" + id;
    }
    button2.addEventListener
    ("click",
     function () {
      arAkahukuImage.onSaveImageClick (arguments [0], -1, false, false);
    }, false);
    button2.appendChild (targetDocument.createTextNode
                         ("[\u4FDD\u5B58]"));
    button.appendChild (button2);
        
    button2 = targetDocument.createElement ("a");
    button2.className = "akahuku_saveimage_stop";
    button2.style.display = "none";
    button2.addEventListener
    ("click",
     function () {
      arAkahukuImage.onStop (arguments [0], false);
    }, false);
    button2.appendChild (targetDocument.createTextNode
                         ("[\u4E2D\u65AD]"));
    button.appendChild (button2);
        
    var messageNode = targetDocument.createElement ("span");
    messageNode.className = "akahuku_saveimage_message";
    button.appendChild (messageNode);
  },
    
  /**
   * マウスのボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onMouseDown : function (event) {
    if (event.button == 1) {
      var target = event.explicitOriginalTarget;
            
      if (target) {
        if (target.nodeName.toLowerCase () != "a") {
          target = arAkahukuDOM.findParentNode (target, "a");
        }
                
        if (target
            && "className" in target) {
          var ok = false;
          var normal = false;
          if (target.className == "akahuku_saveimage_button") {
            ok = true;
            normal = true;
          }
          else if (target.className == "akahuku_saveimage_button2") {
            ok = true;
            normal = false;
          }
                    
          if (ok
              && arAkahukuImage.lastTargetDirIndex
              < arAkahukuImage.baseList.length) {
            arAkahukuImage.currentTarget = target;
            arAkahukuImage.currentNormal = normal;
                        
            arAkahukuImage.onSaveImageClick
              (event, arAkahukuImage.lastTargetDirIndex,
               normal, false);
                            
            event.preventDefault ();
            event.stopPropagation ();
          }
        }
      }
    }
  },
    
  /**
   * 画像を保存ボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  Number targetDirIndex
   *         保存先のディレクトリのインデックス
   *         -1 なら自動選択
   * @param  Boolean normal
   *         通常のボタンか
   *         オートリンクのボタンなら false
   *         targetDirIndex が -1 でなければ無視される
   * @param  Boolean linkmenu
   *         リンクのコンテキストメニューからか
   */
  onSaveImageClick : function (event, targetDirIndex, normal, linkmenu) {
    var target;
        
    if (linkmenu) {
      target = arAkahukuImage.currentTarget;
      normal = arAkahukuImage.currentNormal;
            
      arAkahukuImage.lastTargetDirIndex = targetDirIndex;
    }
    else if (arAkahukuImage.baseList.length == 1) {
      target = event.explicitOriginalTarget;
      if (target.nodeName.toLowerCase () != "a") {
        target = arAkahukuDOM.findParentNode (target, "a");
      }
            
      arAkahukuImage.lastTargetDirIndex = 0;
    }
    else if (arAkahukuImage.baseList.length == 0) {
      target = event.explicitOriginalTarget;
      if (target.nodeName.toLowerCase () != "a") {
        target = arAkahukuDOM.findParentNode (target, "a");
      }
      
      arAkahukuImage.onSave
      (target, false,
       "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059", "", normal);
      return;
    }
    else {
      if (targetDirIndex != -1) {
        target = arAkahukuImage.currentTarget;
        normal = arAkahukuImage.currentNormal;
                
        arAkahukuImage.lastTargetDirIndex = targetDirIndex;
      }
      else {
        target = event.explicitOriginalTarget;
        if (target.nodeName.toLowerCase () != "a") {
          target = arAkahukuDOM.findParentNode (target, "a");
        }
                
        arAkahukuImage.currentTarget = target;
        arAkahukuImage.currentNormal = normal;

        var rect = target.getBoundingClientRect ();
        // 要素のスクリーン座標をデバイスピクセル単位で得る
        var view = target.ownerDocument.defaultView;
        rect.x = rect.x + view.mozInnerScreenX;
        rect.y = rect.y + view.mozInnerScreenY;
        try {
          var dwu = view
            .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
            .getInterface (Components.interfaces.nsIDOMWindowUtils);
          var scale = dwu.screenPixelsPerCSSPixel;
          rect.x = Math.round (rect.x * scale);
          rect.y = Math.round (rect.y * scale);
          rect.width = Math.round (rect.width * scale);
          rect.height = Math.round (rect.height * scale);
        }
        catch (e) { Akahuku.debug.exception (e);
        }
        arAkahukuImage.openXULSaveImagePopup
          (target, rect, event.screenX, event.screenY);
        return;
      }
    }
        
    var href = target.getAttribute ("dummyhref");
    var leafName = target.getAttribute ("dummyleafname");
        
    var messageNode = target;
    var stopNode = null;
    while (messageNode) {
      if ("className" in messageNode
          && messageNode.className == "akahuku_saveimage_message") {
        break;
      }
      if ("className" in messageNode
          && messageNode.className == "akahuku_saveimage_stop") {
        stopNode = messageNode;
      }
            
      messageNode = messageNode.nextSibling;
    }
    if (!messageNode || !stopNode) {
      return;
    }
        
    target.style.display = "none";
    var message = "\u4FDD\u5B58\u4E2D\u3067\u3059";
    messageNode.style.color = "#800000";
    arAkahukuDOM.setText (messageNode, message);
    stopNode.style.display = "inline";
    
    var isRedirect = false;
    if (href.match (/\/(red|d)\//)
        && !href.match (/^https?:\/\/up\.2chan\.net\/d\//)
        && !href.match (/^https?:\/\/[a-z]+\.2chan\.net\/up\/d\//)) {
      isRedirect = true;
      if (href.match (/up\.2chan\.net\/d\/src\//)) {
        isRedirect = false;
      }
    }
    
    if (isRedirect) {
      arAkahukuImage.saveRedirectImage
      (target, targetDirIndex,
       href, leafName, normal);
    }
    else {
      arAkahukuImage.saveImage
      (target, targetDirIndex,
       href, leafName, normal);
    }
  },

  openXULSaveImagePopup : function (targetContentNode, rect, screenX, screenY, window) {
    if (!window && targetContentNode) { // non-e10s
      window
        = arAkahukuWindow.getParentWindowInChrome
        (targetContentNode.ownerDocument.defaultView);
    }
    var document = window.document;
    var popup = document.getElementById ("akahuku-saveimage-popup");

    if (targetContentNode && "openPopup" in popup) {
      popup.openPopup
        (targetContentNode,
         "before_end",
         -1, -1,
         true, true);
    }
    else if (rect && "openPopupAtScreenRect" in popup) {
      popup.setAttribute ("position","after_start")
      popup.openPopupAtScreenRect
        ("after_start",
         rect.x, rect.y,
         rect.width, rect.height,
         true, false);
    }
    else {
      var parent = document.getElementById ("main-window");
      var x, y;
      x = screenX - parent.boxObject.screenX;
      y = screenY - parent.boxObject.screenY;
      document.popupNode = parent;
      popup.showPopup
      (parent,
       x + 2,
       y + 2, "popup", null, null);
    }
  },

  selectSaveImageDirFromXUL : function (targetDirIndex, linkmenu, browser) {
    arAkahukuImage.onSaveImageClick
      (null, targetDirIndex, undefined, linkmenu);
  },

  /**
   * 中段ボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  Boolean normal
   *         通常のボタンか
   *         オートリンクのボタンなら false
   */
  onStop : function (event, normal) {
    var target;
        
    target = event.explicitOriginalTarget;
    if (target.nodeName.toLowerCase () != "a") {
      target = arAkahukuDOM.findParentNode (target, "a");
    }
        
    while (target) {
      if ("className" in target
          && target.className == "akahuku_saveimage_button") {
        break;
      }
            
      target = target.previousSibling;
    }
    if (!target) {
      return;
    }
        
    arAkahukuImage.onSave
    (target, false,
     "\u4E2D\u65AD\u3057\u307E\u3057\u305F", "", normal);
    return;
  },
    
  /**
   * 画像を保存する
   *
   * @param  HTMLElement target
   *         ボタン
   * @param  Number targetDirIndex
   *         番号
   * @param  String href
   *         保存するアドレス
   * @param  String leafName
   *         ファイル名
   * @param  Boolean normal
   *         通常のボタンか
   *         オートリンクのボタンなら false
   *         targetDirIndex が -1 でなければ無視される
   */
  saveImage : function (target, targetDirIndex,
                        href, leafName, normal) {
    href = arAkahukuP2P.tryEnP2P (href);
        
    if (targetDirIndex == -1) {
      targetDirIndex = 0;
    }

    var uri = arAkahukuUtil.newURIViaNode (href, null);
        
    var targetDocument = target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var ext = "";
    if (leafName.match (/(\.[A-Za-z0-9]+)$/)) {
      ext = RegExp.$1;
    }
        
    var dirPath = arAkahukuImage.baseList [targetDirIndex].dir;
    if (!dirPath) {
      /* ベースのディレクトリが不正 */
      arAkahukuImage.onSave
      (target, false,
       "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059", "", normal);
      return;
    }
    if (arAkahukuImage.baseList [targetDirIndex].dialog) {
      var browser
        = arAkahukuWindow.getBrowserForWindow
        (target.ownerDocument.defaultView);
      arAkahukuImage.asyncOpenSaveImageFilePicker
        (browser, leafName, dirPath, function (ret, filePath, dirPath) {

        if (ret != Components.interfaces.nsIFilePicker.returnOK
            && ret != Components.interfaces.nsIFilePicker.returnReplace) {
          /* 中断 */
          arAkahukuImage.onSave
          (target, false,
           "\u4E2D\u65AD\u3057\u307E\u3057\u305F", "", normal);
          return;
        }
                
        if (arAkahukuImage.baseList [targetDirIndex].dialog_keep) {
          var newBase = dirPath;
                    
          arAkahukuImage.baseList [targetDirIndex].dir = newBase;
                    
          arAkahukuImage.saveBaseList ();
        }
                
        var path = filePath;
        var leafName = AkahukuFileUtil.Path.basename (filePath);
        if (leafName.indexOf (ext)
            != leafName.length - ext.length) {
          path = filePath + ext;
        }
        arAkahukuImage.saveImageCore (target, path, uri, leafName, normal);
      });
    }
    else {
      arAkahukuFile.createDirectory (dirPath);
            
      ; /* インデント用 */
      var dir
      = arAkahukuImage.createSubdirName
      (arAkahukuImage.baseList [targetDirIndex], info, href);
      if (dir == null) {
        /* ベースのディレクトリが不正 */
        arAkahukuImage.onSave
          (target, false,
           "\u30B9\u30EC\u756A\u53F7\u306F\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9\u3067\u3057\u304B\u4F7F\u3048\u307E\u305B\u3093", "", normal);
        return;
      }
      var dirUrl = AkahukuFileUtil.getURLSpecFromNativeDirPath (dirPath);
      if (dir) {
        dirUrl += dir + "/";
        dirPath = AkahukuFileUtil.getNativePathFromURLSpec (dirUrl);
        arAkahukuFile.createDirectory (dirPath);
      }
            
      var fileUrl = dirUrl + leafName;
      var filePath = AkahukuFileUtil.getNativePathFromURLSpec (fileUrl);
      arAkahukuImage.saveImageCore (target, filePath, uri, leafName, normal);
    }
  },
  /**
   * 保存先のファイルを選ぶ(要Chrome process)
   */
  asyncOpenSaveImageFilePicker : function (browser, leafName, dirname, callback) {
    var chromeWindow = browser.ownerDocument.defaultView.top;
    var filePicker
      = Components.classes ["@mozilla.org/filepicker;1"]
      .createInstance (Components.interfaces.nsIFilePicker);
    filePicker.init (chromeWindow,
        // "保存先のファイルを選んでください"
        "\u4FDD\u5B58\u5148\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
        Components.interfaces.nsIFilePicker.modeSave);
    filePicker.defaultString = leafName;
    filePicker.appendFilters (Components.interfaces.nsIFilePicker.filterAll);

    try {
      var dir = arAkahukuFile.initFile (dirname);
      if (!dir.exists ()) {
        arAkahukuFile.createDirectory (dir.path);
      }

      filePicker.displayDirectory = dir;
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ベースのディレクトリが不正 */
    }

    arAkahukuCompat.FilePicker.open
      (filePicker, function (ret) {
        var file = null;
        var dir = null;
        if (ret == Components.interfaces.nsIFilePicker.returnOK
            || ret == Components.interfaces.nsIFilePicker.returnReplace) {
          file = filePicker.file.path;
          dir = filePicker.file.parent.path;
        }
        callback.apply (null, [ret, file, dir]);
      });
  },

  saveRedirectImage : function (target, targetDirIndex, href, leafName, normal) {
    var uri = arAkahukuUtil.newURIViaNode (href, null);

    var filename
      = "." + new Date ().getTime ()
      + "_" + Math.floor (Math.random () * 1000);
    filename = AkahukuFileUtil.Path
      .join (arAkahukuFile.systemDirectory, filename);

    var targetDocument = target.ownerDocument;
    var isPrivate = false;
    try {
      // required for Firefox 18.0+
      var privacyContext
        = targetDocument.defaultView
        .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
        .getInterface (Components.interfaces.nsIWebNavigation)
        .QueryInterface (Components.interfaces.nsILoadContext);
      isPrivate = privacyContext.usePrivateBrowsing;
    }
    catch (e) { Akahuku.debug.exception (e);
    }

    var onFileSaved = function (success, savedFile, storage, msg) {
      var newHref = null;
      var wait = 0;
      var promise;
      if (savedFile) {
        promise = storage.getPromisedFile (savedFile.name)
        .then (function (pfile) {
          var fh = pfile.open ("readonly");
          return fh.readAsText (-1, 0)
          .then (function (data) {
            fh.close ();
            storage.remove (savedFile.name);
            return data;
          }).catch (function (e) {
            fh.close ();
            Akahuku.debug.warn (e);
            return "";
          });
        });
      }
      else {
        promise = Promise.resolve ("");
      }
      promise.then (function (text) {
        var result = Akahuku.getSrcURL (text, href);
        if (result [0]) {
          return result;
        }
        if (arAkahukuP2P.enable) {
          // P2P の場合、キャッシュからの取得を試みる
          var baseDir = arAkahukuUtil.newURIViaNode (href, null);
          var newHref = baseDir.resolve ("../src/" + leafName);
          return [newHref, 0];
        }
        else {
          arAkahukuImage.onSave
            (target, false, msg, "", normal);
          return Promise.reject (0);
        }
      }).then (function (result) {
        var newHref = result [0];
        var wait = result [1];
        targetDocument.defaultView
        .setTimeout (function () {
          arAkahukuImage.saveImage
            (target, targetDirIndex, newHref, leafName, normal);
        }, wait)
      });
    };
    arAkahukuImage.asyncSaveImageToFile
      (filename, uri, isPrivate, onFileSaved);
  },

  /**
   * 画像を保存先に保存させて表示を更新する
   *
   * @param  HTMLElement target ボタン
   * @param  String filePath 保存先のファイルパス
   * @param  nsIURI uri 保存するアドレス
   * @param  String leafName ファイル名
   * @param  Boolean normal 通常のボタンか
   */
  saveImageCore : function (target, filePath, uri, leafName, normal) {
    var targetDocument = target.ownerDocument;
    var isPrivate = false;
    try {
      // required for Firefox 18.0+
      var privacyContext
        = targetDocument.defaultView
        .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
        .getInterface (Components.interfaces.nsIWebNavigation)
        .QueryInterface (Components.interfaces.nsILoadContext);
      isPrivate = privacyContext.usePrivateBrowsing;
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    arAkahukuImage.asyncSaveImageToFile (filePath, uri, isPrivate,
        function (success, savedFile, storage, msg) {
          if (!success && savedFile) {
            storage.remove (savedFile.name);
            if (!msg || msg.length == 0) {
              // "保存失敗(Content-Type)"
              msg = "\u4FDD\u5B58\u5931\u6557(Content-Type)";
            }
          }
          if (target.style.display == "none") {
            arAkahukuImage.onSave
              (target, success, msg, leafName, normal);
          }
          else {
            if (savedFile) {
              // 中断されたため削除
              storage.remove (savedFile.name);
            }
          }
        });
  },

  /**
   * 画像を保存先に保存する
   *
   * @param  String filePath 保存先のファイルパス
   * @param  nsIURI uri 保存するアドレス
   * @param  Boolean isPrivate プライベートブラウジングか
   * @param  Function callback 保存終了時のコールバック関数
   */
  asyncSaveImageToFile : function (filePath, uri, isPrivate, callback) {
    var tmpFilePath
      = filePath
      + "." + new Date ().getTime ()
      + "_" + Math.floor (Math.random () * 1000);
    var listener = new arAkahukuImageListener ();
    listener.setFilePath (filePath, tmpFilePath);
    listener.callback = callback;

    try {
      var url = uri.QueryInterface (Components.interfaces.nsIURL);
      switch (url.fileExtension.toLowerCase ()) {
        case "jpg":
        case "jpeg":
        case "gif":
        case "png":
          listener.expectedContentTypePattern = /^image\//;
          break;
        case "webm":
        case "mp4":
          listener.expectedContentTypePattern = /^video\//;
          break;
        default:
          listener.expectedContentTypePattern = null;
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    var webBrowserPersist
    = Components.classes
    ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance (Components.interfaces.nsIWebBrowserPersist);
    var flags
    = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_NONE;
    webBrowserPersist.persistFlags = flags;
    webBrowserPersist.progressListener = listener;

    var args = {uri: uri, file: tmpFilePath, isPrivate: isPrivate};
    arAkahukuCompat.WebBrowserPersist.saveURI
      (webBrowserPersist, args);
  },
    
  saveBaseList : function () {
    arAkahukuConfig.setCharPref
    ("akahuku.saveimage.base.list2",
     escape (JSON.stringify (arAkahukuImage.baseList)));
  },

  /**
   * サブディレクトリ名を作成する
   *
   * @param  Object value
   *         ディレクトリ情報
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   * @param  String href
   *         画像の URL
   * @return String
   *         サブディレクトリ名
   *         作成しない場合は ""
   *         エラーの場合は null
   */
  createSubdirName : function (value, info, href) {
    var dir = "";
    
    if (value.subdir_type == "simple") {
      if (value.subdir_url) {
        if (dir) {
          dir += "_";
        }
        href = arAkahukuP2P.deP2P (href);
        var uri = arAkahukuUtil.newURIViaNode ("./", {baseURI: href});
        arAkahukuCompat.nsIURI.setPathQueryRef (uri,
            arAkahukuCompat.nsIURI.getPathQueryRef (uri)
            .replace (/\/(red|d)\//, "/src/"));
            
        var dirs = new Array ();
        dirs = arAkahukuCompat.nsIURI.getPathQueryRef (uri).split (/\//);
        var pathParts = [info.escapeForFilename (uri.host)];
        for (var i = 0; i < dirs.length; i ++) {
          if (dirs [i]) {
            pathParts.push (info.escapeForFilename (dirs [i]));
          }
        }
        href = AkahukuFileUtil.Path.join.apply (null, pathParts);
            
        dir += href;
      }
      if (value.subdir_board) {
        if (dir) {
          dir += "_";
        }
        dir += info.escapeForFilename (info.board);
      }
      if (value.subdir_server) {
        if (dir) {
          dir += "_";
        }
        dir += info.server;
      }
      if (value.subdir_dir) {
        if (dir) {
          dir += "_";
        }
        dir += info.dir;
      }
      if (value.subdir_thread) {
        if (info.isReply) {
          if (dir) {
            dir += "_";
          }
          dir += info.threadNumber;
        }
        else {
          return null;
        }
      }
      if (value.subdir_msg8b) {
        if (info.isReply) {
          if (dir) {
            dir += "_";
          }
          dir += info.escapeForFilename
            (arAkahukuConverter.unescapeEntity (info.message8byte));
        }
        else {
          return null;
        }
      }
    }
    else {
      href = arAkahukuP2P.deP2P (href);
      var uri = arAkahukuUtil.newURIViaNode ("./", {baseURI: href});
      arAkahukuCompat.nsIURI.setPathQueryRef (uri,
          arAkahukuCompat.nsIURI.getPathQueryRef (uri)
          .replace (/\/(red|d)\//, "/src/"));
      
      var dirs = new Array ();
      dirs = arAkahukuCompat.nsIURI.getPathQueryRef (uri).split (/\//);
      href = info.escapeForFilename (uri.host);
      for (var i = 0; i < dirs.length; i ++) {
        if (dirs [i]) {
          href
            += "<separator />"
            + dirs [i];
        }
      }
      
      var tmp
      = info.escapeForFilename
      (arAkahukuConverter.unescapeEntity
       (info.format (value.subdir_format + "&separator;"))
       .replace (/<url ?\/>/, href),
       true);
      dir = tmp [0];
    }
    
    return dir;
  },
  
  /**
   * ポップアップメニューの内容を設定する
   */
  setPopup : function (event) {
    var popup = event.target;
    var document = event.currentTarget.ownerDocument;
    var browser;
    var w = document.commandDispatcher.focusedWindow;
    if (w && !(w instanceof Components.interfaces.nsIDOMChromeWindow)) {
      browser = arAkahukuWindow.getBrowserForWindow (w);
    }
    else { // for e10s
      browser = document.commandDispatcher.focusedElement;
      w = null;
    }
        
    var label, menuitem;
        
    while (popup.firstChild) {
      popup.removeChild (popup.firstChild);
    }
        
    for (var i = 0; i < arAkahukuImage.baseList.length; i ++) {
      if (arAkahukuImage.baseList [i].name) {
        label = arAkahukuImage.baseList [i].name;
      }
      else {
        label = arAkahukuImage.baseList [i].dir;
      }
      menuitem = document.createElement ("menuitem");
      if (arAkahukuImage.baseList [i].key) {
        menuitem.setAttribute ("accesskey",
                               arAkahukuImage.baseList [i].key);
        if (!Akahuku.isRunningOnWindows) {
          label += " (" + arAkahukuImage.baseList [i].key + ")";
        }
      }
      menuitem.setAttribute ("label", label);
      menuitem.addEventListener ("command", (function (i) {
        return function () {
          arAkahukuImage.selectSaveImageDirFromXUL (i, false, browser);
        }
      })(i), false);
      popup.appendChild (menuitem);
    }
  },
    
  /**
   * サムネボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onThumbImageClick : function (event) {
    var target = event.explicitOriginalTarget;
    if (target.nodeName.toLowerCase () != "a") {
      target = arAkahukuDOM.findParentNode (target, "a");
    }
        
    arAkahukuImage.updateContainer (target.parentNode, true, false);
    arAkahukuImage.changeImage (target, false);
  },
    
  /**
   * 元画像ボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSrcImageClick : function (event) {
    var target = event.explicitOriginalTarget;
    if (target.nodeName.toLowerCase () != "a") {
      target = arAkahukuDOM.findParentNode (target, "a");
    }
        
    arAkahukuImage.updateContainer (target.parentNode, true, true);
    arAkahukuImage.changeImage (target, true);
  },
    
  /**
   * 画像を削除ボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDeleteImageClick : function (event) {
    var target = event.explicitOriginalTarget;
    if (target.nodeName.toLowerCase () != "a") {
      target = arAkahukuDOM.findParentNode (target, "a");
    }
    var targetDocument = target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    
    var leafName = target.getAttribute ("dummyleafname");
    var href = target.getAttribute ("dummyhref");
        
    arAkahukuImage.asyncCheckImageFileExist (target, leafName)
      .then (function (result) {
        var dir = AkahukuFS.Path.dirname (result.path);
        return AkahukuFS.getFileStorage ({name: dir})
        .then (function (storage) {
          return [storage, result.file];
        });
      }, function () {
        throw new Error ("No file for " +  leafName);
      }).then (function (args) {
        var [storage, file] = args;
        return storage.remove (file.name);
      }).then (function () {
        arAkahukuImage.updateContainer (target.parentNode,
                                        false, false);
        arAkahukuImage.changeImage (target, false);
      }).catch (function (e) {
        Akahuku.debug.exception (e);
      });
  },
    
  /**
   * 画像の保存ボタンが完了した, もしくは失敗したイベント
   *
   * @param  HTMLAnchorElement target
   *         画像を保存ボタン
   * @param  Boolean saved
   *         保存したか
   * @param  String message
   *         表示するメッセージ
   * @param  String leafName
   *         保存したファイルの本来のファイル名
   * @param  Boolean normal
   *         通常のボタンか
   *         オートリンクのボタンなら false
   */
  onSave : function (target, saved, message, leafName, normal) {
    var messageNode = target;
    var stopNode = null;
    while (messageNode) {
      if ("className" in messageNode
          && messageNode.className == "akahuku_saveimage_message") {
        break;
      }
      if ("className" in messageNode
          && messageNode.className == "akahuku_saveimage_stop") {
        stopNode = messageNode;
      }
            
      messageNode = messageNode.nextSibling;
    }
    if (!messageNode || !stopNode) {
      return;
    }
        
    var targetDocument = target.ownerDocument;
    
    if (saved) {
      if (normal) {
        arAkahukuImage.asyncCheckImageFileExist (target, leafName)
          .then (function (result) {
            // file exists
            var instantsrc = arAkahukuImage
              .baseList [result.baseListId].instantsrc;
            stopNode.style.display = "none";
            arAkahukuDOM.setText (messageNode, null);
            arAkahukuImage.updateContainer
              (target.parentNode, true,
               instantsrc);
            if (instantsrc) {
              arAkahukuImage.changeImage (target, true, result.path);
            }
          }, function (values) {
            // no file exist
            stopNode.style.display = "none";
            arAkahukuDOM.setText
              (messageNode,
               "\u4FDD\u5B58\u3057\u307E\u3057\u305F");
            if (normal) {
              arAkahukuImage.updateContainer
                (target.parentNode, false, false);
            }
            else {
              target.style.display = "";
            }
            targetDocument.defaultView.setTimeout
              (function (messageNode) {
                arAkahukuDOM.setText (messageNode, null);
              }, 5000, messageNode);
          });
      }
      else {
        stopNode.style.display = "none";
        arAkahukuDOM.setText
          (messageNode,
           "\u4FDD\u5B58\u3057\u307E\u3057\u305F");
        target.style.display = "";
        targetDocument.defaultView.setTimeout
          (function (messageNode) {
            arAkahukuDOM.setText (messageNode, null);
          }, 5000, messageNode);
      }

      arAkahukuSound.playSaveImage ();
            
      return;
    }
        
    if (normal) {
      arAkahukuImage.updateContainer (target.parentNode, false, false);
    }
    else {
      target.style.display = "";
    }
        
    if (message == "") {
      message = "\u4FDD\u5B58\u5931\u6557"; // "保存失敗"
    }
        
    messageNode.style.color = "#ff0000";
    arAkahukuDOM.setText (messageNode, message);
    stopNode.style.display = "none";
        
    arAkahukuSound.playSaveImageError ();
        
    targetDocument.defaultView.setTimeout
    (function (messageNode) {
      arAkahukuDOM.setText (messageNode, null);
    }, 5000, messageNode);
  },

  /**
   * 保存ディレクトリのどれかに保存されているか調べる
   * @param  HTMLAnchorElement target 画像を保存ボタン
   * @param  String leafName ファイル名(だけ)
   * @return Promise
   */
  asyncCheckImageFileExist : function (target, leafName) {
    var targetDocument = target.ownerDocument;
    var info = Akahuku.getDocumentParam (targetDocument).location_info;
    var href = target.getAttribute ("dummyhref");

    var dirCandidates = [];
    var promises = [];
    for (var i = 0; i < arAkahukuImage.baseList.length; i ++) {
      var pathParts = [];
      var filename = arAkahukuImage.baseList [i].dir;
      dirCandidates.push (String (filename));
      pathParts.push (filename);
      var dir
        = arAkahukuImage.createSubdirName
        (arAkahukuImage.baseList [i], info, href);
      if (dir == null) {
        continue;
      }
      if (dir) {
        pathParts.push (dir);
      }
      dirCandidates [i] = AkahukuFileUtil.Path.join.apply (null, pathParts);
      filename = AkahukuFileUtil.Path.join (dirCandidates [i], leafName);
      let index = i;
      var promise = AkahukuFileUtil
        .createFromFileName (filename)
        .then (function (file) {
          return Promise.reject ({i: index, file: file});
        }, function (reason) {
          return Promise.resolve (true);
        });
      promises.push (promise);
    }
    return Promise.all (promises)
    .then (function (values) {
      return Promise.reject ("no file exist");
    }, function (result) {
      // file exists
      var dir = dirCandidates [result.i];
      var value = {
        baseListId: result.i,
        basedir: dir,
        path: AkahukuFileUtil.Path.join (dir, leafName),
        file: result.file,
      };
      return Promise.resolve (value);
    });
  },
    
  /**
   * サムネ／元画像を入れ替える
   *
   * @param  HTMLAnchorElement target
   *         サムネ／元画像 ボタン
   * @param  Boolean isSrc
   *         元画像か
   * @param  String optFilePath ファイル名(既知の場合)
   */
  changeImage : function (target, isSrc, optFilePath) {
    var href = target.getAttribute ("dummyhref");
    var leafName = target.getAttribute ("dummyleafname");
        
    var targetDocument = target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var uinfo = arAkahukuImageURL.parse (href, false, true);
    
    /* 新しいレイアウトには関係ない */
    var table = arAkahukuDOM.findParentNode (target, "table");
    if (table) {
      if (isSrc) {
        /* 元画像表示の場合スレ画像の横にあるとマズいので
         * スレ画像の下に持ってくる */
        table.style.clear = "left";
      }
      else {
        table.style.clear = "";
      }
    }

    var attr_href2 = "__akahuku_saveimage_href";
    var pattern = /\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z]+)$/;
    
    var image = null;
    var blockquote = null
    var node = target.parentNode;
    while (node) {
      if (node.nodeName.toLowerCase () == "a"
          && (pattern.test (node.href)
              || pattern.test (node.getAttribute (attr_href2))
              || (node.hasAttribute ("__unmht_href")
                  && node.getAttribute ("__unmht_href").match (/\/[^\/]+\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z]+)$/)))) {
        var nodes = node.querySelectorAll ("img, .akahuku_saveimage_src");
        if (nodes.length > 0) {
          if (image == null) {
            image = nodes [0];
            if (blockquote) {
              break;
            }
          }
        }
      }
      if (Akahuku.isMessageBQ (node)) {
        if (blockquote == null) {
          blockquote = node;
          if (image) {
            break;
          }
        }
      }
      
      if (info.isMonaca && !node.nextSibling
          && node.parentNode.nodeName.toLowerCase () == "span"
          && node.parentNode.className == "s10") {
        node = node.parentNode;
      }

      node = node.nextSibling;
    }
    
    if (!image) {
      if (!blockquote || !isSrc) {
        return;
      }
      
      var anchor = targetDocument.createElement ("a");
      anchor.target = "_blank";
      anchor.href = href;
      anchor.setAttribute ("__akahuku_saveimage_anchor", "1");
            
      if (!uinfo.isVideo) {
        image = targetDocument.createElement ("img");
        image.setAttribute ("hspace", "20");
        image.setAttribute ("border", "0");
        image.setAttribute ("align", "left");
      }
      else {
        image = targetDocument.createElement ("video");
        image.style.cssFloat = "left";
        image.style.marginLeft = "20px";
        image.style.marginRight = "20px";
        image.preload = "metadata";
        image.controls = true;
      }
            
      anchor.appendChild (image);
                                
      blockquote.parentNode.insertBefore (anchor, blockquote);
    }
    
    if ("className" in image
        && image.className == "akahuku_saveimage_src") {
      /* 元画像が表示中 */
      if (isSrc) {
        return;
      }
      if (blockquote) {
        arAkahukuDOM.removeClassName
        (blockquote,
         "akahuku_saveimage_defmargin");
      }
      
      if (image.parentNode.hasAttribute ("__akahuku_saveimage_anchor")) {
        image.parentNode.parentNode.removeChild
        (image.parentNode);
        return;
      }

      // (video) 元の href を復元
      var hrefOriginal = image.parentNode.getAttribute (attr_href2);
      if (hrefOriginal) {
        image.parentNode.setAttribute ("href", hrefOriginal);
        image.parentNode.removeAttribute (attr_href2);
      }
      
      var thumbImage = image.nextSibling;
            
      image.parentNode.removeChild (image);
            
      thumbImage.style.display = "";
      thumbImage.removeAttribute ("__akahuku_saveimage_thumb");
    }
    else {
      /* 元画像が未表示 */
      if (!isSrc) {
        return;
      }
      
      if (blockquote) {
        arAkahukuDOM.addClassName
        (blockquote,
         "akahuku_saveimage_defmargin");
      }
      
      var srcImage;
      if (!uinfo.isVideo) {
        srcImage = image.cloneNode (false);
        srcImage.removeAttribute ("id");
        srcImage.removeAttribute ("width");
        srcImage.removeAttribute ("height");
        srcImage.style.width = "";
        srcImage.style.height = "";
      }
      else {
        srcImage = targetDocument.createElement ("video");
        if (image.align) {
          srcImage.style.cssFloat = image.align;
        }
        if (image.hspace > 0) {
          srcImage.style.marginLeft = image.hspace + "px";
          srcImage.style.marginRight = image.hspace + "px";
        }
        srcImage.preload = "metadata";
        srcImage.controls = true;
        srcImage.addEventListener ('ended', function () {
          // 再生後に巻き戻す (再生前と同じフレームを表示)
          srcImage.currentTime = 0;
        });
      }
      srcImage.className = "akahuku_saveimage_src";
            
      if (arAkahukuImage.enableLimit) {
        var unitW = arAkahukuImage.limitUnit;
        var unitH = unitW;
        var limitWidth = arAkahukuImage.limitWidth;
        var limitHeight = arAkahukuImage.limitHeight;
        if (arAkahukuImage.limitUnit === "view") {
          // requires Gecko 19.0+
          unitW = "vw";
          unitH = "vh";
          if (arAkahukuCompat.comparePlatformVersion ("18.*") <= 0) {
            // vw,vh 非対応環境では静的な計算値で模擬
            unitW = unitH = "px";
            limitWidth *= targetDocument.documentElement.clientWidth / 100;
            limitHeight *= targetDocument.documentElement.clientHeight / 100;
          }
        }
        srcImage.style.maxWidth = limitWidth + unitW;
        srcImage.style.maxHeight = limitHeight + unitH;
      }
            
      image.style.display = "none";
      image.setAttribute ("__akahuku_saveimage_thumb", "1");

      if (uinfo.isVideo) {
        // ふたばのインライン再生ハンドラを回避するため href を退避
        var hrefOriginal = image.parentNode.getAttribute ("href");
        image.parentNode.removeAttribute ("href");
        image.parentNode.setAttribute (attr_href2, hrefOriginal);
      }
            
      var url = "";
      if (arAkahukuP2P.enable
          && uinfo && uinfo.isImage && !uinfo.isIp) {
        url
          = uinfo.scheme + "://" + uinfo.server + ".2chan.net" + uinfo.port
          + "/" + uinfo.dir + "/" + uinfo.type
          + "/" + uinfo.leafNameExt;
        url = arAkahukuP2P.enP2P (url);
      }
      else if (optFilePath) {
        url = AkahukuFileUtil.getURLSpecFromNativePath (optFilePath);
        url = Akahuku.protocolHandler.enAkahukuURI ("local", url);
      }
      else {
        url = null;
        arAkahukuImage.asyncCheckImageFileExist (target, leafName)
          .then (function (result) {
            var url = AkahukuFileUtil.getURLSpecFromNativePath (result.path);
            url = Akahuku.protocolHandler.enAkahukuURI ("local", url);
            srcImage.src = url;
          }, function () {
            Akahuku.debug.warn ("no file exist for: " + leafName);
          });
      }
            
      srcImage.addEventListener
      ("load",
       function () {
        /* ロードが完了したらアニメーションを最初から開始する */
        try {
          srcImage.QueryInterface (Components.interfaces.nsIImageLoadingContent).getRequest (0).image.resetAnimation ();
          srcImage.QueryInterface (Components.interfaces.nsIImageLoadingContent).getRequest (0).image.startAnimation ();
        }
        catch (e) {
        }
      }, true);
      if (url) {
        srcImage.src = url;
      }
      image.parentNode.insertBefore (srcImage, image);
    }
  },
    
  /**
   * 対象のノード以下に画像を保存ボタンを付ける
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applySaveImageCore : function (targetDocument, targetNode) {
    var node = targetNode;
    var linkNode = null;
    var leafName = "";
    var ext = "";
    var linkNodes = new Array ();
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    while (node
           && node.nodeName.toLowerCase () != "hr") {
      if (info.isMonaca &&
          node.nodeName.toLowerCase () == "span" && node.className == "s10" && node.lastChild) {
        node = node.lastChild;
      }
      if (node.nodeName.toLowerCase () == "a"
          && (node.href.match (/\/[^\/]+\/[^\/]+\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z]+)$/)
              || (node.hasAttribute ("__unmht_href")
                  && node.getAttribute ("__unmht_href").match (/\/[^\/]+\/[^\/]+\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z]+)$/)))) {
        linkNode = node;
        linkNodes.push (node);
                
        var text = arAkahukuDOM.getInnerText (node);
        if (text.match
            (/^([0-9]+)\.([a-z]+)$/)) {
          leafName = RegExp.$1;
          ext = RegExp.$2;
        }
      }
            
      node = node.previousSibling;
    }
        
    if (linkNode && leafName && ext) {
      leafName = leafName + "." + ext;
      var container = targetDocument.createElement ("span");
      container.className = "akahuku_saveimage_container";
      
      var id;
      if (arAkahukuImage.enableLinkMenu) {
        id = arAkahukuImage.lastID;
        arAkahukuImage.lastID ++;
        for (var i = 0; i < linkNodes.length; i ++) {
          linkNodes [i].setAttribute
            ("__akahuku_saveimage_id", id);
          linkNodes [i].setAttribute
            ("__akahuku_saveimage_normal", 1);
        }
      }
            
      var srcButton;
      var thumbButton;
            
      var button = targetDocument.createElement ("a");
      button.className = "akahuku_saveimage_button";
      button.setAttribute ("dummyhref", linkNode.href);
      button.setAttribute ("dummyleafname", leafName);
      if (arAkahukuImage.enableLinkMenu) {
        button.id = "akahuku_saveimage_button_" + id;
      }
      button.addEventListener
      ("click",
       function () {
        arAkahukuImage.onSaveImageClick
        (arguments [0], -1, true, false);
      }, false);
      button.appendChild (targetDocument.createTextNode
                          ("[\u4FDD\u5B58]"));
      container.appendChild (button);
            
      button = targetDocument.createElement ("a");
      button.className = "akahuku_thumbimage_button";
      button.setAttribute ("dummyhref", linkNode.href);
      button.setAttribute ("dummyleafname", leafName);
      if (arAkahukuImage.enableLinkMenu) {
        button.id = "akahuku_thumbimage_button_" + id;
      }
      button.addEventListener
      ("click",
       function () {
        arAkahukuImage.onThumbImageClick (arguments [0]);
      }, false);
      button.appendChild (targetDocument.createTextNode
                          ("[\u30B5\u30E0\u30CD]"));
      container.appendChild (button);
      thumbButton = button;
            
      button = targetDocument.createElement ("a");
      button.className = "akahuku_srcimage_button";
      button.setAttribute ("dummyhref", linkNode.href);
      button.setAttribute ("dummyleafname", leafName);
      button.addEventListener
      ("click",
       function () {
        arAkahukuImage.onSrcImageClick (arguments [0]);
      }, false);
      button.appendChild (targetDocument.createTextNode
                          ("[\u5143\u753B\u50CF]"));
      container.appendChild (button);
      srcButton = button;
            
      button = targetDocument.createElement ("a");
      button.className = "akahuku_deleteimage_button";
      button.setAttribute ("dummyhref", linkNode.href);
      button.setAttribute ("dummyleafname", leafName);
      button.addEventListener
      ("click",
       function () {
        arAkahukuImage.onDeleteImageClick (arguments [0]);
      }, false);
      button.appendChild (targetDocument.createTextNode
                          ("[\u524A\u9664]"));
      container.appendChild (button);
            
      button = targetDocument.createElement ("a");
      button.className = "akahuku_saveimage_stop";
      button.style.display = "none";
      button.addEventListener
      ("click",
       function () {
        arAkahukuImage.onStop (arguments [0]);
      }, false);
      button.appendChild (targetDocument.createTextNode
                          ("[\u4E2D\u65AD]"));
      container.appendChild (button);
            
      var messageNode = targetDocument.createElement ("span");
      messageNode.className = "akahuku_saveimage_message";
      container.appendChild (messageNode);
            
      var textNode = targetDocument.createTextNode ("\uFF1A");
      container.appendChild (textNode);
            
      linkNode.parentNode.insertBefore (container, linkNode);

      if (info.isMonaca) {
        textNode = container.previousSibling;
        if (textNode && textNode.nodeType === textNode.TEXT_NODE
            && textNode.parentNode.nodeName.toLowerCase () == "span"
            && textNode.parentNode.className == "s10" // 画像レス
            && textNode.nodeValue == //"画像ファイル名："
            "\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u540D\uFF1A") {
          linkNode.parentNode.removeChild (textNode);
        }
      }
            
      arAkahukuImage.updateContainer (container, false, false);
            
      arAkahukuImage.asyncCheckImageFileExist (srcButton, leafName)
        .then (function (result) {
          var base = arAkahukuImage.baseList [result.baseListId];
          arAkahukuImage.updateContainer (container, true, false);
          if (base.instantsrc && base.instantsrc_always) {
            arAkahukuImage.changeImage (srcButton, true, result.path);
            arAkahukuImage.updateContainer (container, true, true);
          }
        }, function () {
          // no file, no reaction
        });
    }
  },
    
  /**
   * コンテナの内容を更新する
   *
   * @param  HTMLSpanElement container
   *         コンテナ
   * @param  Boolean exists
   *         画像が存在するか
   * @param  Boolean src
   *         元画像を表示しているか
   */
  updateContainer : function (container, exists, src) {
    var node = container.firstChild;
        
    while (node) {
      if ("className" in node) {
        if (node.className == "akahuku_saveimage_button") {
          node.style.display = !exists ? "" : "none";
        }
        else if (node.className == "akahuku_saveimage_button2") {
          node.style.display = !exists ? "" : "none";
        }
        else if (node.className == "akahuku_deleteimage_button") {
          node.style.display = exists ? "" : "none";
        }
        else if (node.className == "akahuku_thumbimage_button") {
          node.style.display = (exists && src) ? "" : "none";
        }
        else if (node.className == "akahuku_srcimage_button") {
          node.style.display = (exists && !src) ? "" : "none";
        }
      }
            
      node = node.nextSibling;
    }
  },
    
  /**
   * 対象のノード以下に画像を保存ボタンを付ける
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applySaveImage : function (targetDocument, targetNode) {
    var nodes = Akahuku.getMessageBQ (targetNode);
        
    for (var i = 0; i < nodes.length; i ++) {
      arAkahukuImage.applySaveImageCore (targetDocument, nodes [i]);
    }
  },
    
  /**
   * [保存用に整形] ボタン、[mht で保存] ボタンを追加する
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
        
    if (info.isNormal || info.isReply) {
      if (arAkahukuImage.enable) {
        arAkahukuImage.applySaveImage (targetDocument,
                                       targetDocument);

        targetDocument.defaultView.addEventListener
          ("mousedown", function (ev) {
            arAkahukuImage.onMouseDown (ev);
          }, true);
      }
    }
  }
};
