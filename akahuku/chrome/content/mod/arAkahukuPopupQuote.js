/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/** 
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter,
 *          arAkahukuDocumentParam, arAkahukuDOM, arAkahukuLink,
 *          arAkahukuThread
 */

/**
 * 引用元のデータ
 *
 * @param  Number index
 *         引用元の blockquote 要素のインデックス
 * @param  HTMLQoteElement node
 *         引用元の blockquote 要素
 */
function arAkahukuQuoteOriginal (index, node) {
  this.index = index;
  this.node = node;
}
arAkahukuQuoteOriginal.prototype = {
  index : 0,  /* Number  引用元の blockquote 要素のインデックス */
  node : null /* HTMLQoteElement  引用元の blockquote 要素 */
};
/**
 * 引用のポップアップ管理データ
 */
function arAkahukuPopupQuoteParam () {
  this.popups = new Array ();
}
arAkahukuPopupQuoteParam.prototype = {
  timerID : null,        /* Number  タイマーの ID */
  pageX : 0,             /* Number  カーソルの X 座標 */
  pageY : 0,             /* Number  カーソルの Y 座標 */
  target : null,         /* HTMLElement  イベントの対象 */
  popups : null,         /* Array  現在表示しているボップアップ
                          * [HTMLDivElement, ...] */
  targetDocument : null, /* HTMLDocument 対象のドキュメント */
  
  currentPopup : null,   /* HTMLDivElement  ドラッグ中のポップアップ */
  dragX : 0,             /* Number  直前の x 座標 */
  dragY : 0,             /* Number  直前の y 座標 */
  isDragMode : false,    /* Boolean  ポップアップをドラッグ中か */
  
  /**
   * データを開放する
   */
  destruct : function () {
    if (this.timerID != null) {
      clearInterval (this.timerID);
      this.timerID = null;
    }
    this.target = null;
    this.popups = null;
    this.targetDocument = null;
  }
};
/**
 * 引用のポップアップ管理
 *   [引用のポップアップ]
 */
var arAkahukuPopupQuote = {
  enable : false,          /* Boolean  引用のポップアップ */
  delayShow : 300,         /* Number  表示まで [ms] */
  enableClickHide : false, /* Boolean  ポップアップ以外をクリックで
                            *   即非表示 */
  enableImage : false,     /* Boolean  画像も含める */
  imageSize : 2,           /* Number  サイズ
                            *   0: フルサイズ
                            *   1: ハーフ
                            *   2: クオーター */
  enableNearest : false,   /* Boolean  現在のレスから近い方を表示 */
  enableBottomUp : false,  /* Boolean  ポップアップを上に延ばす */
    
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
    if (info.isReply) {
      /* レス送信モード */
            
      /* 引用のポップアップ */
      if (arAkahukuPopupQuote.enable) {
        style
        .addRule ("div.akahuku_reply_popup",
                  "position: absolute; "
                  + "border: 1px solid #eeaa88; "
                  + "padding: 2px; "
                  + "background-color: #ffffee; "
                  + "z-index: 402;")
        .addRule ("div.akahuku_reply_popup th",
                  "font-size: 9pt; "
                  + "font-weight: normal; "
                  + "vertical-align: top;")
        .addRule ("div.akahuku_reply_popup td",
                  "font-size: 9pt; "
                  + "padding: 2px 2px 2px 4px;")
        .addRule ("div.akahuku_reply_popup div.r",
                  "font-size: 9pt; "
                  + "padding: 2px 2px 2px 4px;")
        .addRule ("div.akahuku_reply_popup "
                  + "div.akahuku_popup_content_blockquote",
                  "margin: 1em 1em 1em 1em;")
        .addRule ("div.akahuku_reply_popup small",
                  "font-size: 9pt;")
        .addRule ("div.akahuku_reply_popup font",
                  "font-size: 9pt;")
        .addRule ("div.akahuku_reply_popup .akahuku_preview",
                  "margin: 0 4px 4px 4px;")
        .addRule ("div.akahuku_reply_popup "
                  + "a.akahuku_popup_content_button",
                  "text-decoration: underline; "
                  + "cursor: pointer; "
                  + "color: #0040ee;")
        .addRule ("div.akahuku_reply_popup "
                  + "a.akahuku_popup_content_button:hover",
                  "text-decoration: underline; "
                  + "cursor: pointer; "
                  + "color: #ff4000;");
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuPopupQuote.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.popupquote", true);
    if (arAkahukuPopupQuote.enable) {
      arAkahukuPopupQuote.delayShow
        = arAkahukuConfig
        .initPref ("int",  "akahuku.popupquote.delay", 300);
      arAkahukuPopupQuote.enableClickHide
        = arAkahukuConfig
        .initPref ("bool", "akahuku.popupquote.clickhide", true);
      arAkahukuPopupQuote.enableImage
        = arAkahukuConfig
        .initPref ("bool", "akahuku.popupquote.image", true);
      arAkahukuPopupQuote.imageSize
        = arAkahukuConfig
        .initPref ("int",  "akahuku.popupquote.image.size", 2);
      arAkahukuPopupQuote.enableNearest
        = arAkahukuConfig
        .initPref ("bool", "akahuku.popupquote.nearest", false);
      arAkahukuPopupQuote.enableBottomUp
        = arAkahukuConfig
        .initPref ("bool", "akahuku.popupquote.bottomup", false);
    }
  },
    
  /**
   * ポップアップを削除する
   *
   * @param  arAkahukuPopupQuoteParam param
   *         引用のポップアップ管理データ
   * @param  HTMLDivElement currentPopup
   *         削除しないポップアップ
   */
  removePopup : function (param, currentPopup) {
    var i = param.popups.length - 1;
    while (i >= 0) {
      if (param.popups [i] == currentPopup) {
        break;
      }
      
      var node = param.popups [i];
      try {
        param.targetDocument.body.removeChild (node);
        param.popups.splice (i, 1);
      }
      catch (e) {
      }
            
      i --;
    }
  },
    
  /**
   * マウスをクリックしたイベント
   * ポップアップの外ならばポップアップを削除する
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyClick : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var param
      = Akahuku.getDocumentParam (targetDocument).popupquote_param;
            
      if (param.popups.length > 0) {
        var div
          = arAkahukuDOM.findParentNodeByClassName
          (event.target, "akahuku_reply_popup");
        if (div) {
          return;
        }
        arAkahukuPopupQuote.removePopup (param);
      }
    }
    catch (e) {
    }
  },
    
  /**
   * マウスを動かしたイベント
   * 引用の上ならばポップアップを表示する
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyMouseMove : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var param
      = Akahuku.getDocumentParam (targetDocument).popupquote_param;
      
      if (param.isDragMode) {
        var x = parseInt (param.currentPopup.style.left);
        var y = parseInt (param.currentPopup.style.top);
        x += event.pageX - param.dragX;
        y += event.pageY - param.dragY;
        param.currentPopup.style.left = x + "px";
        param.currentPopup.style.top = y + "px";
        param.dragX = event.pageX;
        param.dragY = event.pageY;
        return;
      }

      if (param.timerID != null) {
        if (param.target == event.explicitOriginalTarget) {
          /* 対象が同じで表示待ちの場合、抜ける */
          param.pageX = event.pageX;
          param.pageY = event.pageY;
          return;
        }
        clearTimeout (param.timerID);
        param.timerID = null;
      }
            
      param.target = event.explicitOriginalTarget;
      param.targetDocument = param.target.ownerDocument;
      param.pageX = event.pageX;
      param.pageY = event.pageY;
      param.timerID
      = setTimeout (arAkahukuPopupQuote.onPopupWaitTimeout,
                    arAkahukuPopupQuote.delayShow,
                    param);
    }
    catch (e) {
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * ポップアップでマウスボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  HTMLDivElement popup
   *         対象のポップアップ
   */
  onPopupMouseDown : function (event, popup) {
    if (event.layerX < 16) {
      var targetDocument = event.target.ownerDocument;
      var param
        = Akahuku.getDocumentParam (targetDocument).popupquote_param;
      
      param.isDragMode = true;
      param.currentPopup = popup;
      param.dragX = event.pageX;
      param.dragY = event.pageY;
      event.preventDefault ();
    }
  },
    
  /**
   * マウスボタンを離したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyMouseUp : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var param
      = Akahuku.getDocumentParam (targetDocument).popupquote_param;
      param.isDragMode = false;
    }
    catch (e) {
    }
  },
  
  /**
   * レス番号をクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onNumberClick : function (event) {
    event.preventDefault ();
        
    try {
      var targetDocument = event.target.ownerDocument;
      var param
        = Akahuku.getDocumentParam (targetDocument).popupquote_param;  
            
      var target = event.explicitOriginalTarget;
      if (target.nodeName.toLowerCase () != "a") {
        target = arAkahukuDOM.findParentNode (target, "a");
      }
      var num = target.getAttribute ("name").match (/([0-9]+)/) [1];
            
      target = null;
      var nodes = Akahuku.getMessageBQ (targetDocument);
      for (var i = 0; i < nodes.length; i ++) {
        var num2 = Akahuku.getMessageNum (nodes [i]);
                
        if (num2 == num) {
          target = nodes [i];
          break;
        }
      }
            
      if (target) {
        target.style.backgroundColor = "Highlight";
        target.style.color = "HighlightText";
                
        var y = -64;
        for (var tmp = target; tmp; tmp = tmp.offsetParent) {
          y += tmp.offsetTop;
        }
        if (y
            < targetDocument.body.scrollTop
            + targetDocument.documentElement.scrollTop) {
          targetDocument.defaultView.scrollTo (0, (y < 0) ? 0 : y);
        }
                
        arAkahukuPopupQuote.removePopup (param);
                
        setTimeout
          (function () {
            try {
              target.style.backgroundColor = "transparent";
              target.style.color = "";
            }
            catch (e) {
              /* ドキュメントが閉じられた場合など */
            }
          }, 2000,
            target);
      }
    }
    catch (e) {
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   *  マウスを動かしてから指定時間経ったイベント
   *
   * @param  arAkahukuPopupQuoteParam param
   *         引用のポップアップ管理データ
   */
  onPopupWaitTimeout : function (param) {
    try {
      param.timerID = null;
            
      var i;
      var targetDocument = param.targetDocument;
      var info
      = Akahuku.getDocumentParam (targetDocument).location_info;
            
      if (targetDocument.defaultView.getSelection ().toString () != "") {
        /* 選択中は出さない */
        return;
      }
      
      /**
       * スレ／レスの内容をコピーする
       *
       * @param  HTMLQuoteElement blockquote
       *         スレ／レスの blockquote 要素
       * @param  HTMLTableCellElement td
       *         コピー先の td 要素
       * @param  Boolean isReply
       *         レスか
       */
      function copyPopup (blockquote, td, isReply) {
        var lastText = "";
        var result = "";
        for (var node = blockquote; node; node = node.previousSibling) {
          if (arAkahukuPopupQuote.enableImage) {
            if (node.nodeName.toLowerCase () == "hr") {
              break;
            }
          }
          else {
            if (node.nodeName.toLowerCase () == "input"
                && node.type == "checkbox") {
              break;
            }
          }
          
          var newNode;
          if (Akahuku.isMessageBQ (node)) {
            newNode = targetDocument.createElement ("div");
            arAkahukuDOM.copyChildren (node, newNode);
            arAkahukuDOM.addClassName
              (newNode, "akahuku_popup_content_blockquote");
            if (!isReply) {
              var delnode = targetDocument.getElementById ("akahuku_thread_delcount");
              if (delnode) {
                td.appendChild (delnode.cloneNode (true));
              }
            }
          }
          else if (node.nodeName.toLowerCase () == "a"
                   && node.firstChild
                   && node.firstChild.nodeName.toLowerCase ()
                   == "img") {
            if (arAkahukuPopupQuote.enableImage) {
              newNode = node.cloneNode (true);
              var s = Math.pow (2, arAkahukuPopupQuote.imageSize);
              newNode.firstChild.width
                = parseInt (node.firstChild.width / s);
              newNode.firstChild.height
                = parseInt (node.firstChild.height / s);
              newNode.firstChild.hspace = 4;
              newNode.firstChild.style.cssFloat = "left";
              newNode.firstChild.style.border
                = "0px solid #ffffee";
            }
            else {
              continue;
            }
          }
          else if (node.nodeName.toLowerCase () == "small") {
            if (node.innerHTML.match
                (/[0-9]+:[0-9]+\u9803\u6D88\u3048\u307E\u3059/)) {
              /* 消滅時刻 */
              continue;
            }
          }
          else if (node.nodeName.toLowerCase () == "input") {
            continue;
          }
          else if (node.nodeName.toLowerCase () == "span") {
            continue;
          }
          else {
            newNode = node.cloneNode (true);
          }
                    
          if (node.nodeName.toLowerCase () == "#text") {
            if ((node.nodeValue + lastText).match
                (/No\.([0-9]+)/)) {
              while (td.firstChild
                     && (td.firstChild.nodeName.toLowerCase ()
                         == "#text"
                         || td.firstChild.nodeName.toLowerCase ()
                         == "wbr")) {
                td.removeChild (td.firstChild);
              }
                            
              newNode = targetDocument.createTextNode
                (RegExp.rightContext);
              td.insertBefore (newNode, td.firstChild);
                            
              var num = RegExp.$1;
              newNode = targetDocument.createElement ("a");
              newNode.className = "akahuku_popup_content_button";
              newNode.setAttribute ("name", "No." + num);
              newNode.addEventListener
                ("click",
                 function () {
                  arAkahukuPopupQuote.onNumberClick
                    (arguments [0]);
                }, false);
              arAkahukuDOM.setText (newNode, "No." + num);
              td.insertBefore (newNode, td.firstChild);
                            
              newNode = targetDocument.createTextNode
                (RegExp.leftContext);
              td.insertBefore (newNode, td.firstChild);
                            
              lastText = "";
              continue;
            }
            else {
              lastText = node.nodeValue + lastText;
            }
          }
          else if (node.nodeName.toLowerCase () != "wbr") {
            lastText = "";
          }
          
          if (td.firstChild) {
            td.insertBefore (newNode, td.firstChild);
          }
          else {
            td.appendChild (newNode);
          }
        }
      }
            
      /**
       * 引用対象を取得する
       *
       * @param  HTMLElement quoted
       *         引用かメル欄の font 要素、span 要素、もしくは text
       * @param  HTMLQuoteElement currentBlockQuote
       *         quoted と同じレスの blockquote 要素
       * @param  HTMLTableCellElement currentTd
       *         quoted と同じレスの td 要素
       * @param  Number type
       *         quoted の種類
       *           0: 引用
       *           1: メル欄
       *           2: テキスト
       * @param  arAkahukuLocationInfo info
       *         アドレス情報
       * @return arAkahukuQuoteOriginal
       *         引用元
       *         見付からなかった場合は null
       */
      function getQuoteOriginal (quoted, currentBlockQuote,
                                 currentTd, type, info) {
        var innerText = arAkahukuDOM.getInnerText2 (quoted);
        var index = -1;
        var nodes;
        var targetIndex;
        
        nodes = Akahuku.getMessageBQ (targetDocument);
        
        var div = arAkahukuDOM.findParentNodeByClassName
        (currentBlockQuote, "akahuku_reply_popup");
        if (div) {
          /* ポップアップ中 */
          index
            = parseInt (div.getAttribute
                        ("__akahuku_reply_popup_index"));
        }
        else if (currentTd) {
          /* レス */
          for (var i = 0; i < nodes.length; i ++) {
            if (nodes [i] == currentBlockQuote) {
              index = i;
              break;
            }
          }
        }
        else {
          /* スレ本文 */
          index = 0;
        }
                
        if (index == -1) {
          return null;
        }
                
        var quotedNo = -1;
        var i;
                
        switch (type) {
          case 0:
            if (innerText.match (/^(&gt;)*[ \t\r\n]*(No\.)?([0-9]+)(\.[a-z]+)?\s*$/)) {
              quotedNo = parseInt (RegExp.$3);
            }
            break;
          case 1:
            if (innerText.match (/([0-9]+)/)) {
              quotedNo = parseInt (RegExp.$1);
            }
            break;
          case 2:
            if (innerText.match
                (/(No\.)?([0-9]+)(.*)(No\.)?([0-9]+)/)) {
              if (RegExp.$3 || RegExp.$4) {
                /* 2 つ以上ある場合
                 * 同じサイズの非表示の要素を作成し
                 * 位置から番号をを算出する */
                var dummy = targetDocument.createElement ("span");
                quoted.parentNode.insertBefore (dummy, quoted);
                var rect = dummy.getBoundingClientRect ();
                var offsetLeft = rect.left;
                dummy.parentNode.removeChild (dummy);
              
                /* 値を解析するだけなので代入はしない */
                innerText.replace
                  (/(No\.)?([0-9]+)/g,
                   function (matched, no, number) {
                    var text = RegExp.leftContext;
                    text
                      = arAkahukuConverter.unescapeEntity
                      (text);
                    var textnode = targetDocument.createTextNode
                      (text);
                    var font
                      = targetDocument.createElement ("font");
                    font.style.visibility = "hidden";
                    font.appendChild (textnode);
                    quoted.parentNode.appendChild (font);
                    var offset = font.offsetWidth;
                    quoted.parentNode.removeChild (font);
                                    
                    if (param.pageX > offsetLeft + offset) {
                      quotedNo = parseInt (number);
                    }
                  });
              }
              else {
                quotedNo = parseInt (RegExp.$2 + RegExp.$5);
              }
            }
            else if (innerText.match (/(No\.)?([0-9]+)/)) {
              quotedNo = parseInt (RegExp.$2);
            }
            break;
        }
                
        if (quotedNo != -1) {
          /* レス番号の引用 */
                    
          /* 引用元を探す */
          targetIndex = -1;
          for (var i = index - 1; i >= 0; i --) {
            if (nodes [i].parentNode.style.display != "none") {
              var num = Akahuku.getMessageNum (nodes [i]);
              if (num == quotedNo) {
                /* 対象を発見 */
                targetIndex = i;
                if (arAkahukuPopupQuote.enableNearest) {
                  break;
                }
              }
              var num = Akahuku.getThumbNum (nodes [i]);
              if (num != 0 && num == quotedNo) {
                /* 対象を発見 */
                targetIndex = i;
                if (arAkahukuPopupQuote.enableNearest) {
                  break;
                }
              }
            }
          }
          if (targetIndex != -1) {
            var original
            = new arAkahukuQuoteOriginal (targetIndex,
                                          nodes [targetIndex]);
            return original;
          }
        }
        else if (type == 0) {
          /* 通常の引用 */
          var quotedText
          = arAkahukuDOM.getInnerText2 (quoted)
          .replace (/[ \t\u3000\xa0]*$/, "");
          var originalQuotedText = quotedText;
          quotedText = quotedText.replace (/^(>|&gt;)/, "");
                    
          /* 引用全体を取得 */
          var lines
          = arAkahukuDOM.getInnerText2 (currentBlockQuote)
          .split ("\n");
          for (var i = 0; i < lines.length; i ++) {
            if (lines [i].replace (/[ \t\u3000\xa0]*$/, "")
                == originalQuotedText) {
              for (var j = i - 1;
                   j >= 0 && lines [j].match (/^(>|&gt;)/);
                   j --) {
                quotedText
                  = lines [j]
                  .replace (/^(>|&gt;)/, "")
                  + "\n" + quotedText;
              }
              break;
            }
          }
                    
          /* 引用全体にマッチする引用元を探す */
          targetIndex = -1;
          for (var i = index - 1; i >= 0; i --) {
            if (nodes [i].parentNode.style.display != "none") {
              if (arAkahukuDOM.getInnerText2 (nodes [i])
                  .indexOf (quotedText) >= 0) {
                targetIndex = i;
                if (arAkahukuPopupQuote.enableNearest) {
                  break;
                }
              }
            }
          }
          if (targetIndex != -1) {
            var original
            = new arAkahukuQuoteOriginal (targetIndex,
                                          nodes [targetIndex]);
            return original;
          }
                    
          /* 無かった場合 */
                    
          /* 単一の行のみで探す */
          for (var i = index - 1; i >= 0; i --) {
            if (nodes [i].parentNode.style.display != "none") {
              if (arAkahukuDOM.getInnerText2 (nodes [i])
                  .indexOf (originalQuotedText) >= 0) {
                targetIndex = i;
                if (arAkahukuPopupQuote.enableNearest) {
                  break;
                }
              }
            }
          }
          if (targetIndex != -1) {
            var original
            = new arAkahukuQuoteOriginal (targetIndex,
                                          nodes [targetIndex]);
            return original;
          }
          /* スペースを除外して探す */
          quotedText
          = originalQuotedText
          .replace (/^(>|&gt; +)/, "")
          for (var i = index - 1; i >= 0; i --) {
            if (nodes [i].parentNode.style.display != "none") {
              if (arAkahukuDOM.getInnerText2 (nodes [i])
                  .indexOf (quotedText) >= 0) {
                targetIndex = i;
                if (arAkahukuPopupQuote.enableNearest) {
                  break;
                }
              }
            }
          }
          if (targetIndex != -1) {
            var original
            = new arAkahukuQuoteOriginal (targetIndex,
                                          nodes [targetIndex]);
            return original;
          }
                    
          return null;
        }
                
        var quotedIP = "";
                
        switch (info.server + "/" + info.dir) {
          case "www/h":
          case "dat/l":
          case "may/27":
          case "up/d":
          case "nov/y":
            if (innerText.match (/([0-9]+\.[0-9]+\.[0-9]+\.)/)) {
              quotedIP = RegExp.$1;
            }
          break;
        }
                
        if (quotedIP) {
          /* IP アドレスの引用 */
                    
          /* 引用元を探す */
          targetNode = -1;
          for (var i = index - 1; i >= 0; i --) {
            var ip = Akahuku.getMessageIP (nodes [i]);
            if (nodes [i].parentNode.style.display != "none") {
              if (ip == quotedIP) {
                /* 対象を発見 */
                targetIndex = i;
                if (arAkahukuPopupQuote.enableNearest) {
                  break;
                }
              }
            }
          }
          if (targetIndex != -1) {
            var original
            = new arAkahukuQuoteOriginal (targetIndex,
                                          nodes [targetIndex]);
            return original;
          }
        }
                
        return null;
      }
            
      var node = param.target;
      var container = null, blockquote = null;
      var type = -1;
            
      var targetNode = node;
      if (targetNode.nodeName.toLowerCase () != "font"
          /* 避難所 patch */
          && targetNode.nodeName.toLowerCase () != "span") {
        var tmp = arAkahukuDOM.findParentNode (targetNode, "font");
        if (!tmp) {
          tmp = arAkahukuDOM.findParentNode (targetNode, "span");
        }
        targetNode = tmp;
      }
      
      if (targetNode) {
        if ("color" in targetNode
            && (targetNode.color == "#789922"
                || arAkahukuDOM.getInnerText2 (targetNode).indexOf ("&gt;")
                == 0)) {
          /* 引用 */
          type = 0;
        }
        else if (("className" in targetNode
                  && targetNode.className == "akahuku_shown_mail")
                 || ("color" in targetNode
                     && targetNode.color == "#cc1105")
                 || ("color" in targetNode
                     && targetNode.color == "#117743")) {
          /* 表示されたメル欄 */
          type = 1;
        }
        /* 避難所 patch */
        else if ("className" in targetNode
                 && targetNode.className == "s3") {
          /* 引用 */
          type = 0;
        }
      }
      else if (node.nodeName.toLowerCase () == "#text") {
        /* コメント内のテキスト */
        targetNode = node;
        type = 2;
      }
      
      if (type != -1) {
        container = Akahuku.getMessageContainer (targetNode);
        
        if (!container) {
          var td = arAkahukuDOM.findParentNode (targetNode, "td");
          if (td) {
            var table = arAkahukuDOM.findParentNode (td, "table");
            if (table) {
              container = {};
              container.main = td;
              container.nodes = [table];
            }
          }
        }
        
        if (container) {
          var bqs
            = Akahuku.getMessageBQ (container.main);
          if (bqs.length) {
            blockquote = bqs [0];
          }
          else {
            var divs = container.main.getElementsByTagName ("div");
            for (var i = 0; i < divs.length; i ++) {
              if ("className" in divs [i]
                  && arAkahukuDOM.hasClassName
                  (divs [i], "akahuku_popup_content_blockquote")) {
                blockquote = divs [i];
                break;
              }
            }
          }
        }
      }
      
      if (targetNode && blockquote && container) {
        var quoteOriginal
        = getQuoteOriginal (targetNode,
                            blockquote,
                            container.main, type, info);
        
        if (quoteOriginal) {
          /* 引用元が見付かった */
          var popup
            = arAkahukuDOM.findParentNodeByClassName
            (container.main, "akahuku_reply_popup");
          
          arAkahukuPopupQuote.removePopup (param, popup);
          
          var container2 = Akahuku.getMessageContainer (quoteOriginal.node);
          
          /* ポップアップを作る */
          var div = targetDocument.createElement ("div");
          div.className = "akahuku_reply_popup";
          div.setAttribute ("__akahuku_reply_popup_index",
                            quoteOriginal.index);
          var table = targetDocument.createElement ("table");
          var tbody = targetDocument.createElement ("tbody");
          var tr = targetDocument.createElement ("tr");
          var td = targetDocument.createElement ("td");
          
          div.addEventListener
            ("mousedown",
             (function (div) {
               return function () {
                 arAkahukuPopupQuote.onPopupMouseDown (arguments [0], div);
               };
             })(div), true);
          
          if (quoteOriginal.index > 0) {
            /* レス */
            var th = targetDocument.createElement ("th");
            var tmp
              = arAkahukuConverter.unescapeEntity (info.replyPrefix);
            arAkahukuDOM.setText (th, tmp);
            tr.appendChild (th);
            
            copyPopup (quoteOriginal.node, td, true);
            td.style.backgroundColor = "#f0e0d6";
            if (arAkahukuThread.enableNumbering) {
              var b = targetDocument.createElement ("b");
              arAkahukuDOM.setText (b, quoteOriginal.index + " ");
              if (td.firstChild) {
                td.insertBefore (b, td.firstChild);
              }
              else {
                td.appendChild (b);
              }
            }
          }
          else {
            /* スレ */
            copyPopup (quoteOriginal.node, td, false);
          }
          tr.appendChild (td);
          tbody.appendChild (tr);
          table.appendChild (tbody);
          div.appendChild (table);
          
          div.style.left = (param.pageX + 8) + "px";
          div.style.top = (param.pageY + 8) + "px";
          
          if (arAkahukuPopupQuote.enableBottomUp) {
            div.style.top
              = (param.pageY - 8 - div.offsetHeight) + "px";
          }
          
          arAkahukuLink.addAutoLinkEventHandler
            (targetDocument, div);
                    
          param.popups.push (div);
          targetDocument.body.appendChild (div);
                    
          var max = 0;
          max = targetDocument.body.scrollTop
            + targetDocument.body.clientHeight;
          if (max > targetDocument.documentElement.scrollTop
              + targetDocument.documentElement.clientHeight) {
            max = targetDocument.documentElement.scrollTop
              + targetDocument.documentElement.clientHeight;
          }
          if (param.pageY + 8 + div.offsetHeight >= max - 1) {
            div.style.top
              = (max - 1 - div.offsetHeight) + "px";
          }
                    
          if (arAkahukuPopupQuote.enableBottomUp) {
            div.style.top
              = (param.pageY - 8 - div.offsetHeight) + "px";
            var min = 0;
            min = targetDocument.body.scrollTop;
            if (min < targetDocument.documentElement.scrollTop) {
              min = targetDocument.documentElement.scrollTop;
            }
            if (param.pageY - 8 - div.offsetHeight < min + 1) {
              div.style.top
                = (min + 1) + "px";
            }
          }
                    
          return;
        }
      }
      
      if (node) {
        var elementParent
        = arAkahukuDOM.findParentNodeByClassName
        (node, "akahuku_reply_popup");
        if (elementParent) {
          /* ポップアップの上に居る時はそのポップアップ以外を消す */
          
          arAkahukuPopupQuote.removePopup (param, elementParent);
          return;
        }
      }
      /* ポップアップの外に居る時は全部消す */
      arAkahukuPopupQuote.removePopup (param, null);
    }
    catch (e) {
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * body の unload イベント
   * 各種データを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  onBodyUnload : function (targetDocument, documentParam) {
    var param;
        
    param = documentParam.popupquote_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) {
      }
    }
    documentParam.popupquote_param = null;
  },
    
  /**
   * 引用のポップアップ用にイベントをフックする
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
        
    if (arAkahukuPopupQuote.enable && info.isReply) {
      var param = new arAkahukuPopupQuoteParam ();
      Akahuku.getDocumentParam (targetDocument).popupquote_param = param;
            
      if (arAkahukuPopupQuote.enableClickHide) {
        targetDocument.body.addEventListener
          ("click",
           function () {
            arAkahukuPopupQuote.onBodyClick (arguments [0]);
          }, false);
      }
            
      targetDocument.body.addEventListener
      ("mousemove",
       function () {
        arAkahukuPopupQuote.onBodyMouseMove (arguments [0]);
      }, false);
      targetDocument.body.addEventListener
      ("mouseup",
       function () {
        arAkahukuPopupQuote.onBodyMouseUp (arguments [0]);
      }, false);
    }
  }
};
