
/**
 * 画像の保存のリスナ
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

  setFilePath : function (filePath, tmpfilePath) {
    this.saveLeafName = AkahukuFileUtil.Path.basename (filePath);
    this.tmpLeafName = AkahukuFileUtil.Path.basename (tmpfilePath);
    var dirname = AkahukuFileUtil.Path.dirname (tmpfilePath);
    var that = this;
    this.storage = Promise.reject(new Error('Deprecated (filesystem)'));
    /*
    this.storage = AkahukuFS.getFileStorage ({name: dirname})
    .then (function (value) { that.storage = value; });
    */
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
      httpStatus = request.responseStatus;
      httpSucceeded = request.requestSucceeded;
    }
    catch (e) {
    }
        
    const STATE_STOP = 0x00000010;// dummy
    const STATE_START = 0x00000001;// dummy

    try {
    if (stateFlags & STATE_STOP) {
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
    else if (stateFlags & STATE_START) {
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
                  "font-size: " + arAkahukuImage.buttonSize + ";")
        .addRule ("#akahuku_saveimage_menu",
                  "display: flex; "
                  + "position: absolute; "
                  + "flex-direction: column; "
                  + "flex-wrap: nowrap;"
                  + "z-index: 999;"
                  + "border: solid 1px gray;"
                  + "box-shadow: 2px 2px 4px gray;"
                  + "font-size: " + arAkahukuImage.buttonSize + ";"
                  + "color: #800000;"
                  + "background-color: #ffffee;")
        .addRule ("#akahuku_saveimage_menu > label",
                  "cursor: pointer; "
                  + "padding: 2px 1ex;"
                  + "color: #800000;")
        .addRule ("#akahuku_saveimage_menu > input[type='radio']",
                  "position: absolute;"
                  + "width: 1px;"
                  + "height: 1px;"
                  + "border: 0;"
                  + "padding: 0;"
                  + "overflow: hidden;"
                  + "clip: rect(0,0,0,0);")
        .addRule ("#akahuku_saveimage_menu input[type='radio']:checked + label",
                  "background-color: #f0e0d6;"
                  + "color: #800000;")
        ;
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
    
  getContextMenuContentData : function (targetNode) {
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
        //"保存先のディレクトリ設定が異常です"
        "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059",
        normal);
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

        arAkahukuImage.openSaveImagePopup (target);
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

  openSaveImagePopup : function (target) {
    var targetDocument = target.ownerDocument;
    var menuId = "akahuku_saveimage_menu";
    var menu = targetDocument.getElementById (menuId);
    if (!menu) {
      menu = targetDocument.createElement ("form");
      menu.id = menuId;
      menu.action = "";
      menu.style.display = "none";
      targetDocument.body.appendChild (menu);
      menu.addEventListener ("keydown", (event) => {
        let v = -1;
        if (event.keyCode == KeyboardEvent.DOM_VK_RETURN) {
          for (let r of menu.elements ["akahuku_saveimage_menuitem"]) {
            if (r.checked) {
              v = Number (r.value);
              break;
            }
          }
        }
        else if (event.keyCode == KeyboardEvent.DOM_VK_ESCAPE) {
          event.target.blur ();
          menu.style.display = "none";
          return;
        }
        else if (event.keyCode == KeyboardEvent.DOM_VK_UP
          ||event.keyCode == KeyboardEvent.DOM_VK_DOWN) {
          // don't prevent default
          return;
        }
        else {
          for (let r of menu.elements ["akahuku_saveimage_menuitem"]) {
            if (event.keyCode == r.getAttribute ("__accesskeycode")) {
              v = Number (r.value);
              break;
            }
          }
        }
        event.preventDefault ();
        event.stopPropagation ();
        if (v >= 0) {
          event.target.blur ();
          menu.style.display = "none";
          arAkahukuImage.onSaveImageClick (null, v, undefined, false);
        }
      }, false);

      let mouseDowning = false;
      menu.addEventListener ("focusout", (event) => {
        if ((event.relatedTarget && !menu.contains (event.relatedTarget))
          || (!event.relatedTarget && !mouseDowning) ) {
          menu.style.display = "none";
        }
      }, false);
      menu.addEventListener ("mousedown", (event) => {
        mouseDowning = true;
        event.preventDefault ();
      }, false);
      menu.addEventListener ("mouseup", (event) => {
        mouseDowning = false;
      }, false);
      menu.addEventListener ("mouseleave", (event) => {
        mouseDowning = false;
      }, false);

      // dummy input element for none-selected state
      let input = targetDocument.createElement ("input");
      input.type = "radio";
      input.name = "akahuku_saveimage_menuitem";
      input.value = -1;
      input.id = "akahuku_saveimage_menuitem_dummy";
      menu.appendChild (input);

      for (let i = 0; i < arAkahukuImage.baseList.length; i ++) {
        let label = arAkahukuImage.baseList [i].dir;
        if (arAkahukuImage.baseList [i].name) {
          label = arAkahukuImage.baseList [i].name;
        }
        let input = targetDocument.createElement ("input");
        input.type = "radio";
        input.name = "akahuku_saveimage_menuitem";
        input.value = i;
        input.id = "akahuku_saveimage_menuitem_" + i;
        let key = arAkahukuImage.baseList [i].key;
        if (key) {
          input.setAttribute ("accesskey", key);
          let code = KeyboardEvent ["DOM_VK_"+key.toUpperCase ()];
          if (code > 0) {
            input.setAttribute ("__accesskeycode", code);
          }
          label += " (" + key.toUpperCase () + ")";
        }
        menu.appendChild (input);
        let menuitem = targetDocument.createElement ("label");
        menuitem.for = "akahuku_saveimage_menuitem_" + i;
        menuitem.appendChild (targetDocument.createTextNode (label));
        menu.appendChild (menuitem);
        menuitem.addEventListener ("click", (event) => {
          menu.style.display = "none";
          event.target.ownerDocument.activeElement.blur ();
          arAkahukuImage.onSaveImageClick (null, i, undefined, false);
        }, false);
        menuitem.addEventListener ("mouseenter", (event) => {
          input.checked = true;
        }, false);
        menuitem.addEventListener ("mouseleave", (event) => {
          input.checked = false;
        }, false);
      }
    }
    var rect = target.getBoundingClientRect();
    menu.style.left = (rect.left + targetDocument.defaultView.scrollX) + "px";
    menu.style.top = (rect.top + rect.height + targetDocument.defaultView.scrollY) + "px";
    menu.style.display = "";
    // start from dummy radio button on the top
    menu.firstChild.checked = true;
    menu.firstChild.focus ();
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
      //"中断しました"
      "\u4E2D\u65AD\u3057\u307E\u3057\u305F", normal);
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

    var targetDocument = target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var ext = "";
    if (leafName.match (/(\.[A-Za-z0-9]+)$/)) {
      ext = RegExp.$1;
    }
        
    let dirPref = arAkahukuImage.baseList [targetDirIndex];
    var dirPath = dirPref.dir;
    if (!dirPath) {
      // "保存先のディレクトリ設定が異常です"
      arAkahukuImage.onSave
      (target, false,
       "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059", normal);
      return;
    }

    let subdir = arAkahukuImage.createSubdirName (dirPref, info, href);
    if (subdir == null) {
      arAkahukuImage.onSave (target, false,
        // "スレ番号はレス送信モードでしか使えません"
        "\u30B9\u30EC\u756A\u53F7\u306F\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9\u3067\u3057\u304B\u4F7F\u3048\u307E\u305B\u3093", normal);
      return;
    }
    if (subdir) {
      dirPath = AkahukuFileUtil.Path.join(dirPath, subdir);
    }
    let filePath = AkahukuFileUtil.Path.join(dirPath, leafName);
    arAkahukuImage.saveImageCore (target, filePath, href, normal, targetDirIndex);
  },

  saveRedirectImage : function (target, targetDirIndex, href, leafName, normal) {
    var targetDocument = target.ownerDocument;
    window.fetch(href, {
      redirect: 'follow',
    })
      .then((resp) => resp.blob())
      .then((blob) => {
        return new Promise((resolve, reject) => {
          let reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsBinaryString(blob,
            {type: 'application/octet-stream'});
        })
      })
      .then((text) => {
        var result = Akahuku.getSrcURL (text, href);
        if (result [0]) {
          return result;
        }
        if (arAkahukuP2P.enable) {
          // P2P の場合、キャッシュからの取得を試みる
          let newHref = (new URL('../src/' + leafName, href)).href;
          return [newHref, 0];
        }
        else {
          arAkahukuImage.onSave
            (target, false,
              // "元画像アドレス取得失敗"
              "\u5143\u753B\u50CF\u30A2\u30C9\u30EC\u30B9\u53D6\u5F97\u5931\u6557",
              normal);
          return Promise.reject (0);
        }
      })
      .then ((result) => {
        var newHref = result [0];
        var wait = result [1];
        targetDocument.defaultView
        .setTimeout (function () {
          arAkahukuImage.saveImage
            (target, targetDirIndex, newHref, leafName, normal);
        }, wait)
      })
      .catch((err) => {
        Akahuku.debug.exception(err);
      });
  },

  /**
   * 画像を保存先に保存させて表示を更新する
   *
   * @param  HTMLElement target ボタン
   * @param  String filePath 保存先のファイルパス
   * @param  String uri 保存するアドレス
   * @param  Boolean normal 通常のボタンか
   * @param  Number targetDirIndex
   */
  saveImageCore : function (target, filePath, uri, normal, targetDirIndex) {
    Downloads.download({
      url: uri,
      conflictAction: 'overwrite',
      filename: filePath,
      saveAs: arAkahukuImage.baseList [targetDirIndex].dialog,
    })
      .then((result) => {
        try {
          if (arAkahukuImage.baseList [targetDirIndex].dialog_keep) {
            var newBase = AkahukuFileUtil.Path.dirname(result.filename);
            /* FIXME: Change into relative path in the download folder
            arAkahukuImage.baseList [targetDirIndex].dir = newBase;
            arAkahukuImage.saveBaseList ();
            */
          }
          if (target.style.display == "none") {
            let dirPref = arAkahukuImage.baseList [targetDirIndex]
            let props = {
              instantsrc: dirPref.instantsrc,
              downloadId: result.id,
              filename: result.filename,
            };
            arAkahukuImage.onSave
              (target, result.success, result.state, normal, props);
          }
          else { // Save action was aborted by the stop button
            if (result.success) {
              Downloads.removeFile(result.id)
                .then(() => Downloads.eraseById(result.id));
            }
          }
        }
        catch (e) {
          Akahuku.debug.exception(e);
        }
      })
      .catch((err) => {
        arAkahukuImage.onSave
          (target, false, err.message, normal);
      });
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
        let url = new URL('./', href);
        url.pathname = url.pathname.replace(/\/(red|d)\//, '/src/');
        let dirs = url.pathname.split(/\//);
        let pathParts = [info.escapeForFilename(url.host)];
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
      let url = new URL('./', href);
      url.pathname = url.pathname.replace(/\/(red|d)\//, '/src/');
      let dirs = url.pathname.split(/\//);
      href = info.escapeForFilename(url.host);
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
    var href = target.getAttribute ("dummyhref");
    let id = Number(target.dataset.downloadId);
    let filename = target.dataset.downloadFilename;
    if (!Number.isNaN(id)) {
      Downloads.removeFile(id)
        .then(() => {
          arAkahukuImage.updateContainer(target.parentNode, false, false);
          arAkahukuImage.changeImage(target, false);
          try {
            Downloads.eraseById(id);
          }
          catch (e) {
            Akahuku.debug.exception(e);
          }
        })
        .catch((err) => {
          Akahuku.debug.exception(err);
        });
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
   * @param  Boolean normal
   *         通常のボタンか
   *         オートリンクのボタンなら false
   */
  onSave : function (target, saved, message, normal, savedProps) {
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
        var instantsrc = savedProps ? savedProps.instantsrc : false;
        stopNode.style.display = "none";
        arAkahukuDOM.setText (messageNode, null);
        arAkahukuImage.updateContainer
          (target.parentNode, true,
           instantsrc, savedProps);
        if (instantsrc) {
          let src = target.getAttribute('dummyhref');
          arAkahukuImage.changeImage (target, true, src);
        }
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
   * サムネ／元画像を入れ替える
   *
   * @param  HTMLAnchorElement target
   *         サムネ／元画像 ボタン
   * @param  Boolean isSrc
   *         元画像か
   * @param  String optSrcUrl 元画像URL
   */
  changeImage : function (target, isSrc, optSrcUrl) {
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
    
    if (arAkahukuDOM.hasClassName (image, "akahuku_saveimage_src")) {
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
      else if (optSrcUrl) {
        url = optSrcUrl;
      }
      else {
        url = href;
      }
            
      srcImage.addEventListener
      ("load",
       function () {
        //TODO: ロードが完了したらアニメーションを最初から開始する
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
          && (node.href.match (/\/[^\/]+\/[^\/]+\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z0-9]+)$/)
              || (node.hasAttribute ("__unmht_href")
                  && node.getAttribute ("__unmht_href").match (/\/[^\/]+\/[^\/]+\/(red|src|d)\/([A-Za-z0-9]+)\.([a-z0-9]+)$/)))) {
        linkNode = node;
        linkNodes.push (node);
                
        var text = arAkahukuDOM.getInnerText (node);
        if (text.match
            (/^([0-9]+)\.([a-z0-9]+)$/)) {
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
  updateContainer : function (container, exists, src, optSavedProps) {
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
          if (optSavedProps) {
            if (optSavedProps.downloadId)
              node.dataset.downloadId = optSavedProps.downloadId;
            if (optSavedProps.filename)
              node.dataset.downloadFilename = optSavedProps.filename;
          }
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
