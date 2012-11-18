/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuDOM, arAkahukuFile,
 *          arAkahukuP2P, arAkahukuSound
 */

/**
 * 画像の保存のリスナ
 *   Inherits From: nsIWebProgressListener
 */
function arAkahukuImageListener () {
}
arAkahukuImageListener.prototype = {
  target : null, /* HTMLAnchorElement  画像を保存ボタン */
  file : null,   /* nsILocalFile  保存先のファイル */
  leafName : "", /* String  保存元の本来のファイル名 */
  saveLeafName : "", /* String  保存先のファイル名 */
  normal : false, /* Boolean  保存中のボタンが通常のボタンか */
    
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
    try {
      httpStatus
        = request.QueryInterface (Components.interfaces.nsIHttpChannel)
        .responseStatus;
    }
    catch (e) {
    }
        
    if (stateFlags
        & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
      if (httpStatus == 0) {
        /* P2P */
                
        if (this.file
            && this.file.exists ()
            && this.file.fileSize > 0) {
          if (this.target.style.display == "none") {
            this.file.moveTo (null, this.saveLeafName);
            arAkahukuImage.onSave (this.target, true, "",
                                   this.leafName, this.normal);
          }
          else {
            this.file.remove (true);
          }
        }
        else {
          if (this.file
              && this.file.exists ()) {
            this.file.remove (true);
          }
          if (this.target.style.display == "none") {
            arAkahukuImage.onSave (this.target, false, "", "",
                                   this.normal);
          }
        }
      }
      else if (httpStatus < 400) {
        var data = arAkahukuFile.readFile (this.file.path);
        if (data.length > 1
            && data.substr (0, 1) == "<") {
          if (this.file
              && this.file.exists ()) {
            this.file.remove (true);
          }
                    
          if (this.target.style.display == "none") {
            arAkahukuImage.onSave (this.target, false, "", "",
                                   this.normal);
          }
        }
        else {
          if (this.target.style.display == "none") {
            this.file.moveTo (null, this.saveLeafName);
            arAkahukuImage.onSave (this.target, true, "",
                                   this.leafName, this.normal);
          }
          else {
            if (this.file
                && this.file.exists ()) {
              this.file.remove (true);
            }
          }
        }
      }
      else {
        if (this.file
            && this.file.exists ()) {
          this.file.remove (true);
        }
                
        if (this.target.style.display == "none") {
          arAkahukuImage.onSave (this.target, false, "", "",
                                 this.normal);
        }
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
 * リダイレクトの保存のリスナ
 *   Inherits From: nsIWebProgressListener
 */
function arAkahukuRedirectListener () {
}
arAkahukuRedirectListener.prototype = {
  target : null,       /* HTMLElement  ボタン */
  index : 0,           /* Number  番号 */
  href : "",           /* String  保存するアドレス */
  leafName : "",       /* String  ファイル名 */
  stopNode : null,     /* HTMLElement  メッセージの要素 */
  normal : false,      /* Boolean  通常のボタンか
                        * オートリンクのボタンなら false
                        * targetDirIndex が -1 でなければ無視される */
  file : null,         /* nsILocalFile  保存先のファイル */
  filename : "",       /* String  リダイレクトのファイル名 */

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
    try {
      httpStatus
        = request.QueryInterface (Components.interfaces.nsIHttpChannel)
        .responseStatus;
    }
    catch (e) {
    }
        
    if (stateFlags
        & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
      var text = "";
            
      if (httpStatus < 400) {
        text = arAkahukuFile.readFile (this.filename);
      }
            
      if (this.file
          && this.file.exists ()) {
        this.file.remove (true);
      }
            
      var result = Akahuku.getSrcURL (text, this.href);
      var wait = 0;
      if (result [0]) {
        this.href = result [0];
        wait = result [1];
      }
      else {
        if (arAkahukuP2P.enable) {
          /* P2P の場合、キャッシュからの取得を試みる */
                    
          var baseDir
          = Components
          .classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
          baseDir.spec = this.href;
          this.href = baseDir.resolve ("../src/" + this.leafName);
        }
        else {
          if (this.target.style.display == "none") {
            arAkahukuImage.onSave
            (this.target, false, "", "", this.normal);
          }
          return;
        }
      }
            
      setTimeout
      (function (self) {
        arAkahukuImage.saveImage
        (self.target, self.index,
         self.href, self.leafName, self.normal);
      }, wait, this);
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
    
  buttonSize : "",                /* String  ボタンサイズ指定 */
    
  enableAutoLinkPreview : false,  /* Boolean  オートリンクの
                                   *   プレビューにも付ける */
  enableLinkMenu : false,         /* Boolean  リンクの
                                   *   コンテキストメニューから保存 */
    
  lastID : 0,           /* Number  前回設定した ID の番号 */
    
  currentTarget : null,    /* HTMLAnchorElement  保存先選択中のボタン */
  currentNormal : false,   /* Boolean  保存先選択中のボタンが通常のボタンか */
  lastTargetDirIndex : -1, /* Number  最後に保存したディレクトリのインデックス */

  /**
   * 初期化処理
   */
  init : function () {
    window.addEventListener
    ("mousedown",
     function () {
      arAkahukuImage.onMouseDown (arguments [0]);
    }, true);
        
    var popup;
    popup = document.getElementById ("akahuku-saveimage-popup");
    if (!popup) {
      /* Mozilla Suite では mainPopupSet が無いためオーバーレイできない */
            
      var mainWindow = document.getElementById ("main-window");
      if (mainWindow) {
        var targetDocument = mainWindow.ownerDocument;
        var popupset = targetDocument.createElement ("popupset");
                
        var label, command;
                
        popup = targetDocument.createElement ("popup");
        popup.id = "akahuku-saveimage-popup";
        popup.setAttribute ("position", "after_start");
        popup.setAttribute ("onpopupshowing",
                            "arAkahukuImage.setPopup ();");
                
        popupset.appendChild (popup);
                
        mainWindow.appendChild (popupset);
      }
    }
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
        list = arAkahukuJSON.decode (unescape (value));
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
                subdir_type = "s";
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

      if (!arAkahukuImage.enableLinkMenu) {
        var sep
          = document
          .getElementById ("akahuku-menuitem-content-separator9");
        if (sep) {
          sep.hidden = true;
        }
        var popup = document.getElementById ("contentAreaContextMenu");
        
        var menuitem;
        
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
      }
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
    if (!arAkahukuImage.enableLinkMenu) {
      return;
    }
        
    var popup = document.getElementById ("contentAreaContextMenu");
        
    var label, command, menuitem;
        
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
        
    var target = document.popupNode;
    var linkNode = target;
    if (linkNode.nodeName.toLowerCase () != "a") {
      linkNode = arAkahukuDOM.findParentNode (linkNode, "a");
      if (!linkNode) {
        return;
      }
    }
    if (!linkNode.hasAttribute ("__akahuku_saveimage_id")) {
      return;
    }
        
    var id = linkNode.getAttribute ("__akahuku_saveimage_id");
    var tabbrowser = document.getElementById ("content");
    var targetDocument = tabbrowser.contentDocument;
    arAkahukuImage.currentTarget
    = targetDocument.getElementById ("akahuku_saveimage_button_" + id);
    arAkahukuImage.currentNormal
    = (linkNode.getAttribute ("__akahuku_saveimage_normal") == 1);
        
    if (arAkahukuImage.currentTarget.style.display == "none") {
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
      command
        = "arAkahukuImage.onSaveImageClick (null, " + i + ", true, true);";
      menuitem = document.createElement ("menuitem");
      if (arAkahukuImage.baseList [i].key) {
        menuitem.setAttribute ("accesskey",
                               arAkahukuImage.baseList [i].key);
        if (navigator.oscpu.indexOf ("Windows") == -1) {
          label += " (" + arAkahukuImage.baseList [i].key + ")";
        }
      }
      menuitem.setAttribute ("label", label);
      menuitem.className = "__akahuku_saveimage";
      menuitem.setAttribute ("oncommand", command);
      popup.insertBefore (menuitem, sep.nextSibling);
    }
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
        var popup = document.getElementById ("akahuku-saveimage-popup");
                
        if ("openPopup" in popup) {
          document.popupNode = target;
          popup.openPopup
            (target,
             "before_end",
             -1, -1,
             true, true);
        }
        else {
          var parent = document.getElementById ("main-window");
          var x, y;
          x = event.screenX - parent.boxObject.screenX;
          y = event.screenY - parent.boxObject.screenY;
          document.popupNode = parent;
          popup.showPopup
          (parent,
           x + 2,
           y + 2, "popup", null, null);
        }
                
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
        && !href.match (/^http:\/\/up\.2chan\.net\/d\//)
        && !href.match (/^http:\/\/[a-z]+\.2chan\.net\/up\/d\//)) {
      isRedirect = true;
      if (href.match (/up\.2chan\.net\/d\/src\//)) {
        isRedirect = false;
      }
    }
    
    if (isRedirect) {
      var uri
        = Components.classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (Components.interfaces.nsIURI);
      uri.spec = href;
            
      var filename
        = arAkahukuFile.systemDirectory
        + arAkahukuFile.separator
        + "." + new Date ().getTime ()
        + "_" + Math.floor (Math.random () * 1000);
      var file
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (Components.interfaces.nsILocalFile);
      file.initWithPath (filename);
      
      var listener = new arAkahukuRedirectListener ();
      listener.target = target;
      listener.index = targetDirIndex;
      listener.href = href;
      listener.leafName = leafName;
      listener.normal = normal;
      listener.file = file;
      listener.filename = filename;
            
      var webBrowserPersist
        = Components.classes
        ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
        .createInstance (Components.interfaces.nsIWebBrowserPersist);
      var flags = 0;
      webBrowserPersist.persistFlags = flags;
      webBrowserPersist.progressListener = listener;
            
      var args = {uri: uri, file: file};
      try {
        // required for Firefox 18.0+
        args.privacyContext
          = targetDocument.defaultView
          .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
          .getInterface (Components.interfaces.nsIWebNavigation)
          .QueryInterface (Components.interfaces.nsILoadContext);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      arAkahukuCompat.WebBrowserPersist.saveURI
        (webBrowserPersist, args);
    }
    else {
      arAkahukuImage.saveImage
      (target, targetDirIndex,
       href, leafName, normal);
    }
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

    var ios
      = Components.classes ["@mozilla.org/network/io-service;1"]
      .getService (Components.interfaces.nsIIOService);
    var uri = ios.newURI (href, null, null);
        
    var file;
        
    var targetDocument = target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var ext = "";
    if (leafName.match (/(\.[A-Za-z0-9]+)$/)) {
      ext = RegExp.$1;
    }
        
    if (arAkahukuImage.baseList [targetDirIndex].dialog) {
      var filePicker
      = Components.classes ["@mozilla.org/filepicker;1"]
      .createInstance (Components.interfaces.nsIFilePicker);
      filePicker.init (window,
                       "\u4FDD\u5B58\u5148\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
                       Components.interfaces.nsIFilePicker.modeSave);
      filePicker.defaultString = leafName;
      filePicker.appendFilters (Components.interfaces.nsIFilePicker
                                .filterAll);
            
      try {
        var dir
          = Components.classes ["@mozilla.org/file/local;1"]
          .createInstance (Components.interfaces.nsILocalFile);
        dir.initWithPath (arAkahukuImage.baseList [targetDirIndex].dir);
                
        filePicker.displayDirectory = dir;
      }
      catch (e) {
        /* ベースのディレクトリが不正 */
        arAkahukuImage.onSave
        (target, false,
         "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059", "", normal);
        return;
      }
            
      if (!dir.exists ()) {
        dir.create (Components.interfaces.nsIFile.DIRECTORY_TYPE,
                    493/* 0755 */);
      }
            
      arAkahukuCompat.FilePicker.open
        (filePicker, function (ret) {
      if (ret == Components.interfaces.nsIFilePicker.returnOK
          || ret == Components.interfaces.nsIFilePicker.returnReplace) {
        file = filePicker.file;
                
        if (arAkahukuImage.baseList [targetDirIndex].dialog_keep) {
          var newBase = file.parent.path;
                    
          arAkahukuImage.baseList [targetDirIndex].dir = newBase;
                    
          arAkahukuImage.saveBaseList ();
        }
                
        if (file.leafName.indexOf (ext)
            != file.leafName.length - ext.length) {
          var path = file.path + ext;
          file
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (Components.interfaces.nsILocalFile);
          file.initWithPath (path);
        }
      }
      else {
        /* 中断 */
        arAkahukuImage.onSave
        (target, false,
         "\u4E2D\u65AD\u3057\u307E\u3057\u305F", "", normal);
        return;
      }
      arAkahukuImage.saveImageCore (target, file, uri, leafName, normal);
        });
    }
    else {
      file
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
      try {
        file.initWithPath (arAkahukuImage.baseList [targetDirIndex].dir);
      }
      catch (e) {
        /* ベースのディレクトリが不正 */
        arAkahukuImage.onSave
        (target, false,
         "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059", "", normal);
        return;
      }
            
      if (!file.exists ()) {
        file.create (Components.interfaces.nsIFile.DIRECTORY_TYPE,
                     493/* 0755 */);
      }
            
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
      if (dir) {
        file.appendRelativePath (dir);
      }
      if (!file.exists ()) {
        file.create (Components.interfaces.nsIFile.DIRECTORY_TYPE,
                     493/* 0755 */);
      }
            
      file.appendRelativePath (leafName);
      arAkahukuImage.saveImageCore (target, file, uri, leafName, normal);
    }
  },

  saveImageCore : function (target, file, uri, leafName, normal) {
    var targetDocument = target.ownerDocument;
    var listener = new arAkahukuImageListener ();
    listener.target = target;
    listener.file = file;
    listener.leafName = leafName;
    listener.saveLeafName = file.leafName;
    listener.normal = normal;
        
    file.initWithPath (file.path
                       + "." + new Date ().getTime ()
                       + "_" + Math.floor (Math.random () * 1000));
        
    var webBrowserPersist
    = Components.classes
    ["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance (Components.interfaces.nsIWebBrowserPersist);
    var flags
    = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_NONE;
    webBrowserPersist.persistFlags = flags;
    webBrowserPersist.progressListener = listener;

    var args = {uri: uri, file: file};
    try {
      // required for Firefox 18.0+
      args.privacyContext
        = targetDocument.defaultView
        .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
        .getInterface (Components.interfaces.nsIWebNavigation)
        .QueryInterface (Components.interfaces.nsILoadContext);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    arAkahukuCompat.WebBrowserPersist.saveURI
      (webBrowserPersist, args);
  },
    
  saveBaseList : function () {
    arAkahukuConfig.prefBranch.setCharPref
    ("akahuku.saveimage.base.list2",
     escape (arAkahukuJSON.encode (arAkahukuImage.baseList)));
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
        var uri
          = Components
          .classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
        uri.spec
          = href
          .replace (/\/[^\/]*$/, "/")
          .replace (/\/(red|d)\//, "/src/");
            
        var dirs = new Array ();
        dirs = uri.path.split (/\//);
        href = info.escapeForFilename (uri.host);
        for (var i = 0; i < dirs.length; i ++) {
          if (dirs [i]) {
            href
              += arAkahukuFile.separator
              + info.escapeForFilename (dirs [i]);
          }
        }
            
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
          dir += info.escapeForFilename (info.message8byte);
        }
        else {
          return null;
        }
      }
    }
    else {
      href = arAkahukuP2P.deP2P (href);
      var uri
      = Components
      .classes ["@mozilla.org/network/standard-url;1"]
      .createInstance (Components.interfaces.nsIURI);
      uri.spec
      = href
      .replace (/\/[^\/]*$/, "/")
      .replace (/\/(red|d)\//, "/src/");
      
      var dirs = new Array ();
      dirs = uri.path.split (/\//);
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
  setPopup : function () {
    var popup = document.getElementById ("akahuku-saveimage-popup");
        
    var label, command, menuitem;
        
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
      command
      = "arAkahukuImage.onSaveImageClick (null, " + i + ", true, false);";
      menuitem = document.createElement ("menuitem");
      if (arAkahukuImage.baseList [i].key) {
        menuitem.setAttribute ("accesskey",
                               arAkahukuImage.baseList [i].key);
        if (navigator.oscpu.indexOf ("Windows") == -1) {
          label += " (" + arAkahukuImage.baseList [i].key + ")";
        }
      }
      menuitem.setAttribute ("label", label);
      menuitem.setAttribute ("oncommand", command);
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
        
    var file
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (Components.interfaces.nsILocalFile);
    try {
      for (var i = 0; i < arAkahukuImage.baseList.length; i ++) {
        var filename = arAkahukuImage.baseList [i].dir
          + arAkahukuFile.separator;
        var dir
          = arAkahukuImage.createSubdirName
          (arAkahukuImage.baseList [i], info, href);
        if (dir == null) {
          continue;
        }
        if (dir) {
          filename += dir + arAkahukuFile.separator;
        }
        filename += leafName;
        file.initWithPath (filename);
        if (file.exists ()) {
          file.remove (true);
        }
        arAkahukuImage.updateContainer (target.parentNode,
                                        false, false);
        arAkahukuImage.changeImage (target, false);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
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
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var href = target.getAttribute ("dummyhref");
    
    if (saved) {
      var exists = false;
      var instantsrc = false;
            
      if (normal) {
        var file
          = Components.classes ["@mozilla.org/file/local;1"]
          .createInstance (Components.interfaces.nsILocalFile);
        try {
          for (var i = 0; i < arAkahukuImage.baseList.length; i ++) {
            var filename = arAkahukuImage.baseList [i].dir
              + arAkahukuFile.separator;
            var dir
              = arAkahukuImage.createSubdirName
              (arAkahukuImage.baseList [i], info, href);
            if (dir == null) {
              continue;
            }
            if (dir) {
              filename += dir + arAkahukuFile.separator;
            }
            filename += leafName;
            file.initWithPath (filename);
            if (file.exists ()) {
              exists = true;
              instantsrc = arAkahukuImage.baseList [i].instantsrc;
              break;
            }
          }
        }
        catch (e) { Akahuku.debug.exception (e);
        }
      }
            
      stopNode.style.display = "none";
      if (exists) {
        arAkahukuDOM.setText (messageNode, null);
        arAkahukuImage.updateContainer
          (target.parentNode, true,
           instantsrc);
        if (instantsrc) {
          arAkahukuImage.changeImage (target, true);
        }
      }
      else {
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
                
        setTimeout
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
      message = "\u30D5\u30A1\u30A4\u30EB\u304C\u306A\u3044\u3088";
    }
        
    messageNode.style.color = "#ff0000";
    arAkahukuDOM.setText (messageNode, message);
    stopNode.style.display = "none";
        
    arAkahukuSound.playSaveImageError ();
        
    setTimeout
    (function (messageNode) {
      arAkahukuDOM.setText (messageNode, null);
    }, 5000, messageNode);
  },
    
  /**
   * サムネ／元画像を入れ替える
   *
   * @param  HTMLAnchorElement target
   *         サムネ／元画像 ボタン
   * @param  Boolean isSrc
   *         元画像か
   */
  changeImage : function (target, isSrc) {
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
    
    var image = null;
    var blockquote = null
    var node = target.parentNode;
    while (node) {
      if (node.nodeName.toLowerCase () == "a"
          && (node.href.match (/\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z]+)$/)
              || (node.hasAttribute ("__unmht_href")
                  && node.getAttribute ("__unmht_href").match (/\/[^\/]+\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z]+)$/)))) {
        var nodes = node.getElementsByTagName ("img");
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
            
      image = targetDocument.createElement ("img");
      image.setAttribute ("hspace", "20");
      image.setAttribute ("border", "0");
      image.setAttribute ("align", "left");
            
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
      
      var srcImage = image.cloneNode (false);
      srcImage.removeAttribute ("id");
      srcImage.className = "akahuku_saveimage_src";
      srcImage.removeAttribute ("width");
      srcImage.removeAttribute ("height");
            
      srcImage.style.width = "";
      srcImage.style.height = "";
            
      if (arAkahukuImage.enableLimit) {
        srcImage.style.maxWidth = arAkahukuImage.limitWidth + "px";
        srcImage.style.maxHeight = arAkahukuImage.limitHeight + "px";
      }
            
      image.style.display = "none";
      image.setAttribute ("__akahuku_saveimage_thumb", "1");
            
      var url = "";
      if (arAkahukuP2P.enable
          && uinfo && uinfo.isImage && !uinfo.isIp) {
        url
          = "http://" + uinfo.server + ".2chan.net" + uinfo.port
          + "/" + uinfo.dir + "/" + uinfo.type
          + "/" + uinfo.leafNameExt;
        url = arAkahukuP2P.enP2P (url);
      }
      else {
        var filename;
        for (var i = 0; i < arAkahukuImage.baseList.length; i ++) {
          filename = arAkahukuImage.baseList [i].dir
            + arAkahukuFile.separator;
          var subdir
            = arAkahukuImage.createSubdirName
            (arAkahukuImage.baseList [i], info, href);
          if (subdir == null) {
            continue;
          }
          if (subdir) {
            filename += subdir + arAkahukuFile.separator;
          }
          filename += leafName;
          var file
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (Components.interfaces.nsILocalFile);
          try {
            file.initWithPath (filename);
            if (file.exists ()) {
              break;
            }
          }
          catch (e) {
          }
        }
                
        url = arAkahukuFile.getURLSpecFromFilename (filename);
        url = Akahuku.protocolHandler.enAkahukuURI ("preview", url);
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
      srcImage.src = url;
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
            
      var exists = false;
      var instantsrc = false;
      var instantsrc_always = false;
            
      var file
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
      try {
        for (var i = 0; i < arAkahukuImage.baseList.length; i ++) {
          var filename = arAkahukuImage.baseList [i].dir
            + arAkahukuFile.separator;
          var subdir
            = arAkahukuImage.createSubdirName
            (arAkahukuImage.baseList [i], info, linkNode.href);
          if (subdir == null) {
            continue;
          }
          if (subdir) {
            filename += subdir + arAkahukuFile.separator;
          }
          filename += leafName;
          file.initWithPath (filename);
          if (file.exists ()) {
            exists = true;
            instantsrc = arAkahukuImage.baseList [i].instantsrc;
            instantsrc_always = arAkahukuImage.baseList [i].instantsrc_always;
            break;
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
            
      arAkahukuImage.updateContainer (container, exists, false);
            
      if (exists
          && instantsrc
          && instantsrc_always) {
        arAkahukuImage.changeImage (srcButton, true);
        arAkahukuImage.updateContainer (container, exists, true);
      }
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
      }
    }
  }
};
