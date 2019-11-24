
/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter,
 *          arAkahukuDOM, arAkahukuPostForm, arAkahukuClipboard
 */

/**
 * 引用管理
 *   [引用]
 */
var arAkahukuQuote = {
  enable : false,                  /* Boolean  引用 */
  enableMenu : false,              /* Boolean  メニュー */
  enableSeparator : false,         /* Boolean  区切り */
  enableQuote : false,             /* Boolean  引用 */
  enableMail : false,              /* Boolean  メール欄へ */
  enableName : false,              /* Boolean  名前欄へ */
  enableComment : false,           /* Boolean  コメント欄へ */
  enableCopy : false,              /* Boolean  引用付きコピー */
  enableCont : false,              /* Boolean  - 連続 */
  enableGoogleImage : false,       /* Boolean  イメググる */
  enableWikipedia : false,         /* Boolean  ウィキペドる */
  enableNumber : false,            /* Boolean  番号をクリックで引用 */
  numberType : 1,                  /* Number  引用の方法
                                    *   0: 番号
                                    *   1: No. + 番号
                                    *   2: メッセージ */
  enableNumberClear : false,       /* Boolean  引用する時にコメント欄をクリア */
  enableNumberNoComment : false,   /* Boolean  本文なしの場合に番号にする */
  enableNumberOnlyQuote : false,   /* Boolean  メッセージが引用のみの場合に番号にする */
  enableNumberNoMenu : false,
  enableClear : false,             /* Boolean  メニューから引用する時に
                                    *   コメント欄をクリア */
  enableUntroll : false,           /* Boolean  芝刈りを解除する */
  enableFocus : false,             /* Boolean  検索したタブを選択する */
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuQuote.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.quickquote", true);
    if (arAkahukuQuote.enable) {
      arAkahukuQuote.enableMenu
        = arAkahukuConfig
        .initPref ("bool", "akahuku.quickquote.menu", true);
      if (arAkahukuQuote.enableMenu) {
        arAkahukuQuote.enableSeparator
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.separator",
                     true);
        arAkahukuQuote.enableQuote
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.quote", true);
        arAkahukuQuote.enableMail
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.mail", true);
        arAkahukuQuote.enableName
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.name", false);
        arAkahukuQuote.enableComment
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.comment", true);
        arAkahukuQuote.enableCopy
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.copy", true);
        arAkahukuQuote.enableCont
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.cont", true);
        arAkahukuQuote.enableGoogleImage
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.google.image",
                     true);
        arAkahukuQuote.enableWikipedia
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.menu.wikipedia",
                     false);
      }
      
      arAkahukuQuote.enableNumber
        = arAkahukuConfig
        .initPref ("bool", "akahuku.quickquote.number", false);
      if (arAkahukuQuote.enableNumber) {
        arAkahukuQuote.numberType
          = arAkahukuConfig
          .initPref ("int",  "akahuku.quickquote.number.type", 1);
        arAkahukuQuote.enableNumberClear
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.number.clear",
                     false);
        arAkahukuQuote.enableNumberNoComment
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.number.nocomment",
                     false);
        arAkahukuQuote.enableNumberOnlyQuote
          = arAkahukuConfig
          .initPref ("bool", "akahuku.quickquote.number.onlyquote",
                     false);
      }
      arAkahukuQuote.enableNumberNoMenu
        = arAkahukuConfig
        .initPref ("bool", "akahuku.quickquote.number.nomenu", false);
      arAkahukuQuote.enableClear
        = arAkahukuConfig
        .initPref ("bool", "akahuku.quickquote.clear", false);
      arAkahukuQuote.enableUntroll
        = arAkahukuConfig
        .initPref ("bool", "akahuku.quickquote.untroll", false);
      arAkahukuQuote.enableFocus
        = arAkahukuConfig
        .initPref ("bool", "akahuku.quickquote.focus", false);
    }
  },

  initContextMenus : function (contextMenus) {
    contextMenus.create ({
      id: "akahuku-menuitem-content-separator1",
      type: "separator",
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-quote",
      type: "normal",
      // 引用
      title: "\u5F15\u7528",
      onclick: arAkahukuQuote.onClickQuoteWithMark,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-mail",
      type: "normal",
      // メール欄へ
      title: "\u30E1\u30FC\u30EB\u6B04\u3078",
      onclick: arAkahukuQuote.onClickQuoteToMailBox,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-name",
      type: "normal",
      // 名前欄へ
      title: "\u540D\u524D\u6B04\u3078",
      onclick: arAkahukuQuote.onClickQuoteToNameBox,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-comment",
      type: "normal",
      // コメントへ
      title: "\u30B3\u30E1\u30F3\u30C8\u3078",
      onclick: arAkahukuQuote.onClickQuoteAsComment,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-separator2",
      type: "separator",
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-quote-copy",
      type: "normal",
      // 引用付きコピー
      title: "\u5F15\u7528\u4ED8\u304D\u30B3\u30D4\u30FC",
      onclick: arAkahukuQuote.onClickCopyToClipboard,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-separator3",
      type: "separator",
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-quote-cont",
      type: "normal",
      // 引用 - 連続
      title: "\u5F15\u7528 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteWithMarkCont,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-mail-cont",
      type: "normal",
      // メール欄へ - 連続
      title: "\u30E1\u30FC\u30EB\u6B04\u3078 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteToMailBoxCont,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-name-cont",
      type: "normal",
      // 名前欄へ - 連続
      title: "\u540D\u524D\u6B04\u3078 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteToNameBoxCont,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-comment-cont",
      type: "normal",
      // コメントへ - 連続
      title: "\u30B3\u30E1\u30F3\u30C8\u3078 - \u9023\u7D9A",
      onclick: arAkahukuQuote.onClickQuoteAsCommentCont,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-separator4",
      type: "separator",
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-google-image",
      type: "normal",
      // イメぐぐる
      title: "\u30A4\u30E1\u3050\u3050\u308B",
      onclick: arAkahukuQuote.onClickGoogleImage,
    });
    contextMenus.create ({
      id: "akahuku-menuitem-content-wikipedia",
      type: "normal",
      // ウィキペドる
      title: "\u30A6\u30A3\u30AD\u30DA\u30C9\u308B",
      onclick: arAkahukuQuote.onClickWikipedia,
    });
  },
    
  /**
   * メニューが開かれるイベント
   * メニューの項目の表示／非表示を設定する
   *
   * @param  Event event
   *         対象のイベント
   */
  setContextMenu : function (event) {
    var menuitem;
    var document = event.currentTarget.ownerDocument;
    var gContextMenu = document.defaultView.gContextMenu;
        
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator1");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableSeparator
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-quote");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableQuote
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-mail");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableMail
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-name");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableName
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-comment");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableComment
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
        
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator2");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableCopy
        || !arAkahukuQuote.enableSeparator
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-quote-copy");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableCopy
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
        
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator3");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || arAkahukuPostForm.enableFloat
        || !arAkahukuQuote.enableSeparator
        || !arAkahukuQuote.enableCont
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-quote-cont");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || arAkahukuPostForm.enableFloat
        || !arAkahukuQuote.enableQuote
        || !arAkahukuQuote.enableCont
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-mail-cont");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || arAkahukuPostForm.enableFloat
        || !arAkahukuQuote.enableMail
        || !arAkahukuQuote.enableCont
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-name-cont");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || arAkahukuPostForm.enableFloat
        || !arAkahukuQuote.enableName
        || !arAkahukuQuote.enableCont
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-comment-cont");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || arAkahukuPostForm.enableFloat
        || !arAkahukuQuote.enableComment
        || !arAkahukuQuote.enableCont
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
        
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator4");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || (!arAkahukuQuote.enableGoogleImage
            && !arAkahukuQuote.enableWikipedia)
        || !arAkahukuQuote.enableSeparator
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-google-image");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableGoogleImage
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-wikipedia");
    if (menuitem) {
      menuitem.hidden
        = !gContextMenu.isTextSelected
        || !arAkahukuQuote.enableWikipedia
        || !arAkahukuQuote.enableMenu
        || !arAkahukuQuote.enable
        || !Akahuku.enableAll;
    }
  },
    
  /**
   * 引用のプレフィックスを付ける
   *
   * @param  String text
   *         引用する文字列
   * @param  String prefix
   *         プレフィックス
   */
  addPrefix : function (text, prefix) {
    var noPrefix = false;
        
    var ary = text.split (/[\r\n]/);
    var ary2 = new Array ();
    var ary3 = new Array ();
    for (var i = 0; i < ary.length; i ++) {
      ary [i]
        = ary [i]
        .replace (/^[ \t]+/g, "")
        .replace (/[ \t]+$/g, "");
            
      if (ary [i] != "") {
        ary2.push (prefix + ary [i]);
        ary3.push (ary [i]);
        if (!ary [i].match (/^>/)) {
          noPrefix = true;
        }
      }
    }
        
    if (noPrefix) {
      return ary2.join ("\n");
    }
    else {
      return ary3.join ("\n");
    }
  },
    
  /**
   * 選択文字列から、赤福、合間合間にが追加した要素を消す
   *
   * @param  nsISelection selection
   *         選択範囲
   * @return String
   *         修正した選択文字列
   */
  modifySelection : function (selection) {
    var i;
        
    var originalRanges = new Array ();
    var modifiedRanges = new Array ();
    for (i = 0; i < selection.rangeCount; i ++) {
      originalRanges.push (selection.getRangeAt (i));
    }
        
    var text = "";
    var range;
    var modified = false;
    var nodeName;
    var lastRange;
        
    var lastText;      /* Text  選択範囲の終点 */
    var ignoreNode;    /* HTMLElement  無視する要素の始点 */
        
    for (i = 0; i < selection.rangeCount; i ++) {
      range = selection.getRangeAt (i).cloneRange ();
            
      var startNode;
      var endNode;
            
      startNode = range.startContainer;
      endNode = range.endContainer;
            
      nodeName = range.startContainer.nodeName.toLowerCase ();
      if (nodeName != "#text") {
        if (range.startOffset >= 0
            && range.startOffset
            < range.startContainer.childNodes.length) {
          startNode
            = range.startContainer.childNodes [range.startOffset];
        }
      }
            
      nodeName = range.endContainer.nodeName.toLowerCase ();
      if (nodeName != "#text") {
        if (range.endOffset >= 0
            && range.endOffset
            < range.endContainer.childNodes.length) {
          endNode
            = range.endContainer.childNodes [range.endOffset];
        }
      }
            
      var node = startNode;
      lastText = range.startContainer;
      ignoreNode = null;
            
      while (node) {
        nodeName = node.nodeName.toLowerCase ();
                
        if ("className" in node
            && (node.className == "akahuku_generated"
                || node.className == "aima_aimani_generated")
            || ("style" in node
                && (node.style.display == "none"))) {
          /* 赤福、合間合間にが追加した要素
           * もしくは非表示になっている要素の場合 */
                    
          if (ignoreNode == null) {
            /* 既に開始していなければ、無視する要素の始点とする */
            ignoreNode = node;
            if (lastText != null
                && "nodeValue" in lastText) {
              /* 選択範囲の終点がある場合 */
                            
              modified = true;
                            
              /* 選択範囲を複製して終点を設定する */
              lastRange = range;
              range = lastRange.cloneRange ();
              lastRange.setEnd (lastText,
                                lastText.nodeValue.length);
                            
              /* 選択範囲に追加 */
              modifiedRanges.push (new Array (0, lastRange));
                            
              /* 選択範囲の始点を探す */
              lastText = null;
            }
          }
        }
                
        if ("className" in node
            && node.className == "akahuku_generated_link_child") {
          /* 赤福のオートリンクのデコードした文字列 */
                    
          if (ignoreNode == null) {
            /* 既に開始していなければ、無視する要素の始点とする */
            ignoreNode = node;
            if (lastText != null) {
              /* 選択範囲の終点がある場合 */
                            
              modified = true;
                            
              /* 選択範囲を複製して終点を設定する */
              lastRange = range;
              range = lastRange.cloneRange ();
              lastRange.setEnd (lastText,
                                lastText.nodeValue.length);
                            
              /* 選択範囲に追加 */
              modifiedRanges.push (new Array (0, lastRange));
                            
              var tmp
                = unescape (atob (node.getAttribute
                                  ("__akahuku_link_tmp")));
              modifiedRanges.push (new Array (1, tmp));
                            
              /* 選択範囲の始点を探す */
              lastText = null;
            }
          }
        }
                
        if (arAkahukuQuote.enableUntroll
            && "hasAttribute" in node
            && node.hasAttribute ("__akahuku_troll_text")) {
          /* 赤福のオートリンクのデコードした文字列 */
                    
          if (ignoreNode == null) {
            /* 既に開始していなければ、無視する要素の始点とする */
            ignoreNode = node;
            if (lastText != null) {
              /* 選択範囲の終点がある場合 */
                            
              modified = true;
                            
              /* 選択範囲を複製して終点を設定する */
              lastRange = range;
              range = lastRange.cloneRange ();
              lastRange.setEnd (lastText,
                                lastText.nodeValue.length);
                            
              /* 選択範囲に追加 */
              modifiedRanges.push (new Array (0, lastRange));
                            
              var tmp
                = unescape (atob (node.getAttribute
                                  ("__akahuku_troll_text")));
              modifiedRanges.push (new Array (1, tmp));
                            
              /* 選択範囲の始点を探す */
              lastText = null;
            }
          }
        }
                
        if (lastText == null
            && (nodeName == "blockquote"
                || nodeName == "div"
                || nodeName == "br")) {
          /* 選択範囲の始点を探している間に改行位置があれば追加する
           * (選択範囲内の改行位置は自動的に追加されるため) */
                    
          modifiedRanges.push (new Array (1, "\n"));
        }
                
        if (nodeName == "#text" && ignoreNode == null) {
          /* 無視する要素外のテキスト */
          if (lastText == null) {
            /* 選択範囲の始点を探している場合は始点とする */
            range.setStart (node, 0);
          }
                    
          /* 現在の選択範囲に追加するテキストの終点とする */
          lastText = node;
        }
                
        /* 次の要素に移動する */
        if (node.firstChild) {
          node = node.firstChild;
        }
        else {
          var end = false;
          while (node) {
            if (node == endNode) {
              /* 全体の選択範囲の終点の場合、終了する */
              end = true;
              break;
            }
                        
            nodeName = node.nodeName.toLowerCase ();
                        
            if (node == ignoreNode) {
              /* 無視する要素終了 */
              ignoreNode = null;
            }
            if (nodeName == "blockquote"
                || nodeName == "div") {
              /* 改行位置があれば追加する */
              modifiedRanges.push (new Array (1, "\n"));
            }
                        
            if (node.nextSibling) {
              node = node.nextSibling;
              break;
            }
            node = node.parentNode;
          }
          if (end) {
            break;
          }
        }
      }
            
      if (lastText != null) {
        /* 選択範囲の終点がある場合 */
                
        /* 選択範囲に追加 */
        modifiedRanges.push (new Array (0, range));
      }
    }
        
    if (modified) {
      text = "";
      for (i = 0; i < modifiedRanges.length; i ++) {
        if (modifiedRanges [i][0] == 0) {
          selection.removeAllRanges ();
          selection.addRange (modifiedRanges [i][1]);
          text += selection.toString ();
        }
        else if (modifiedRanges [i][0] == 1) {
          text += modifiedRanges [i][1];
        }
      }
      selection.removeAllRanges ();
      for (i = 0; i < originalRanges.length; i ++) {
        selection.addRange (originalRanges [i]);
      }
    }
    else {
      text = selection.toString ();
    }
        
    return text;
  },
    
  /**
   * 選択文字列を取得する
   *
   * @param  Window
   *         対象のウィンドウ
   * @return String
   *         選択文字列
   */
  getSelectedString : function (targetWindow) {
    var selection
    = arAkahukuQuote.modifySelection (targetWindow.getSelection ());
        
    return selection;
  },
    
  /**
   * 選択文字列をコメント欄に引用する
   *
   * @param  Boolean addQuotePrefix
   *         プレフィックスを追加するかどうか
   * @param  Boolean focusTextArea
   *         コメント欄にフォーカスを移すかどうか
   * @param  HTMLElement originNode
   *         対象ドキュメントの要素
   */
  quote : function (addQuotePrefix, focusTextArea, originNode) {
    var targetDocument = originNode.ownerDocument;
    var targetWindow = targetDocument.defaultView;
    var selection = arAkahukuQuote.getSelectedString (targetWindow);
        
    var target = targetDocument.getElementsByTagName ("textarea");
    if (target.length == 0) {
      return;
    }
    target = target [0];
        
    if (arAkahukuQuote.enableClear) {
      target.value = "";
    }
        
    arAkahukuPostForm.ensureDispPostForm (targetDocument);
    if (!arAkahukuPostForm.enableCommentboxStatusSize) {
      target.rows = "8";
    }
    var s
    = arAkahukuQuote.addPrefix (selection,
                                addQuotePrefix ? ">" : "");
    if (target.value == "") {
      target.value = s.replace (/[\r\n]$/, "");
    }
    else {
      target.value = target.value.replace (/[\r\n]$/, "") + "\n" + s;
    }
        
    target.value += "\n";
        
    if (focusTextArea) {
      target.setSelectionRange (target.value.length, target.value.length);
      target.focus ();
      
      arAkahukuPostForm.focus (targetDocument, target);
    }
  },
  onClickQuote : function (event, addQuotePrefix, focusTextArea) {
    var window = event.currentTarget.ownerDocument.defaultView;
    var target = window.gContextMenu.target;
    arAkahukuQuote.quote (addQuotePrefix, focusTextArea, target);
  },
  onClickQuoteWithMark : function (event) {
    arAkahukuQuote.onClickQuote (event, true, true);
  },
  onClickQuoteAsComment : function (event) {
    arAkahukuQuote.onClickQuote (event, false, true);
  },
  onClickQuoteWithMarkCont : function (event) {
    arAkahukuQuote.onClickQuote (event, true, false);
  },
  onClickQuoteAsCommentCont : function (event) {
    arAkahukuQuote.onClickQuote (event, false, false);
  },
    
  /**
   * 選択文字列にプレフィックスを追加してコピーする
   */
  copyToClipboard : function (target) {
    var targetDocument = target.ownerDocument;
    var targetWindow = targetDocument.defaultView;
    var selection = arAkahukuQuote.getSelectedString (targetWindow);
        
    var copytext = arAkahukuQuote.addPrefix (selection, ">");
        
    try {
      arAkahukuClipboard.copyString (copytext, targetDocument);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
  onClickCopyToClipboard : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    arAkahukuQuote.copyToClipboard (window.gContextMenu.target);
  },
    
  /**
   * 選択文字列をメール欄に引用する
   *
   * @param  Boolean focusMailBox
   *         メール欄にフォーカスを移すかどうか
   */
  quoteToMailBox : function (focusMailBox, target) {
    var targetDocument = target.ownerDocument;
    var targetWindow = targetDocument.defaultView;
    var selection = arAkahukuQuote.getSelectedString (targetWindow);
        
    var target = targetDocument.getElementsByName ("email");
    if (target.length == 0) {
      return;
    }
    target = target [0];
        
    arAkahukuPostForm.ensureDispPostForm (targetDocument);
    var s = arAkahukuQuote.addPrefix (selection, "");
    target.value += s.replace (/[\r\n]/, "");
        
    if (focusMailBox) {
      target.setSelectionRange (target.value.length, target.value.length);
      target.focus ();
            
      arAkahukuPostForm.focus (targetDocument, target);
    }
  },
  onClickQuoteToMailBoxCore : function (event, focusMailBox) {
    var window = event.currentTarget.ownerDocument.defaultView;
    var target = window.gContextMenu.target;
    arAkahukuQuote.quoteToMailBox (focusMailBox, target);
  },
  onClickQuoteToMailBox : function (event) {
    arAkahukuQuote.onClickQuoteToMailBoxCore (event, true);
  },
  onClickQuoteToMailBoxCont : function (event) {
    arAkahukuQuote.onClickQuoteToMailBoxCore (event, false);
  },
    
  /**
   * 選択文字列を名前欄に引用する
   *
   * @param  Boolean focusNameBox
   *         名前欄にフォーカスを移すかどうか
   */
  quoteToNameBox : function (focusNameBox, target) {
    var targetDocument = target.ownerDocument;
    var targetWindow = targetDocument.defaultView;
    var selection = arAkahukuQuote.getSelectedString (targetWindow);
        
    var target = targetDocument.getElementsByName ("name");
    if (target.length == 0) {
      return;
    }
    target = target [0];
        
    arAkahukuPostForm.ensureDispPostForm (targetDocument);
    var s = arAkahukuQuote.addPrefix (selection, "");
    target.value += s.replace (/[\r\n]/, "");
        
    if (focusNameBox) {
      target.setSelectionRange (target.value.length, target.value.length);
      target.focus ();
            
      arAkahukuPostForm.focus (targetDocument, target);
    }
  },
  onClickQuoteToNameBoxCore : function (event, focusNameBox) {
    var window = event.currentTarget.ownerDocument.defaultView;
    var target = window.gContextMenu.target;
    arAkahukuQuote.quoteToNameBox (focusNameBox, target);
  },
  onClickQuoteToNameBox : function (event) {
    arAkahukuQuote.onClickQuoteToNameBoxCore (event, true);
  },
  onClickQuoteToNameBoxCont : function (event) {
    arAkahukuQuote.onClickQuoteToNameBoxCore (event, false);
  },
    
  /**
   * 選択文字列を Google Image で検索する
   */
  googleImage : function (target) {
    var targetWindow = target.ownerDocument.defaultView;
    var selection = arAkahukuQuote.getSelectedString (targetWindow);
        
    var s = arAkahukuQuote.addPrefix (selection, "");
    s = s.replace (/[\r\n]/, "");
        
    var href
    = "http://www.google.com/images?hl=ja&q="
    + encodeURIComponent (s);

    var browser = arAkahukuWindow.getBrowserForWindow (targetWindow);
    arAkahukuQuote.searchInNewTabXUL (href, arAkahukuQuote.enableFocus, browser);
  },
  onClickGoogleImage : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    arAkahukuQuote.googleImage (window.gContextMenu.target);
  },
    
  /**
   * 選択文字列を Wikipedia で検索する
   */
  wikipedia : function (target) {
    var targetWindow = target.ownerDocument.defaultView;
    var selection = arAkahukuQuote.getSelectedString (targetWindow);
        
    var s = arAkahukuQuote.addPrefix (selection, "");
    s = s.replace (/[\r\n]/, "");
        
    var href
    = "http://ja.wikipedia.org/wiki/%E7%89%B9%E5%88%A5:Search?search="
    + encodeURIComponent (s) + "&go=%E8%A1%A8%E7%A4%BA";
        
    var browser = arAkahukuWindow.getBrowserForWindow (targetWindow);
    arAkahukuQuote.searchInNewTabXUL (href, arAkahukuQuote.enableFocus, browser);
  },
  onClickWikipedia : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    arAkahukuQuote.wikipedia (window.gContextMenu.target);
  },

  searchInNewTabXUL : function (href, focus, browser) {
    var tabbrowser = browser.ownerDocument.getElementById ("content");
    var newTab = tabbrowser.addTab (href, {relatedToCurrent : true});
    if (focus) {
      tabbrowser.selectedTab = newTab;
    }
  },
    
  /**
   * マウスをクリックしたイベント
   * メッセージの番号をクリックしたら引用する
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var target = event.explicitOriginalTarget;
        
    var num = -1;
    if (target
        && target.nodeName.toLowerCase () == "#text") {
      if (target.nodeValue.match (/^No\.([0-9]+)$/)) {
        num = RegExp.$1;
      }
      else if (target.nodeValue.match (/^No\.$/)) {
        if (target.nextSibling
            && target.nextSibling.nodeName.toLowerCase () == "wbr"
            && target.nextSibling.nextSibling
            && target.nextSibling.nextSibling.nodeName.toLowerCase ()
            == "#text"
            && target.nextSibling.nextSibling.nodeValue
            .match (/^([0-9]+)$/)) {
          num = target.nextSibling.nextSibling.nodeValue;
        }
      }
      else if (target.nodeValue.match (/^([0-9]+)$/)) {
        if (target.previousSibling
            && target.previousSibling.nodeName.toLowerCase () == "wbr"
            && target.previousSibling.previousSibling
            && target.previousSibling.previousSibling.nodeName
            .toLowerCase () == "#text"
            && target.previousSibling.previousSibling.nodeValue
            .match (/^No\.$/)) {
          num = target.nodeValue;
        }
      }
    }
    
    if (num != -1
        && (target.parentNode.nodeName.toLowerCase () == "td"
          // td#text (レス)
            || (target.parentNode.nodeName.toLowerCase () == "div"
                && arAkahukuDOM.hasClassName (target.parentNode, "thre"))
            // div.thre#text (スレ本文(2016/05/31~))
            || (target.parentNode.nodeName.toLowerCase () == "div"
                && arAkahukuDOM.hasClassName (target.parentNode, "r"))
            // div.r#text (レス(layout == 2))
            || target.parentNode.nodeName.toLowerCase () == "form"
            // form#text (スレ本文(~2016/05/31))
            )) {
      arAkahukuQuote.quoteMessageByNum (targetDocument, num, target);
      event.preventDefault ();
    }
    else if (num != -1 && arAkahukuCompat.HTMLElement.matches (event.target, "span.cno")) {
      // New layout: 2019/11/18- (tagged No.)
      var noModifier = !(event.shiftKey || event.altKey || event.ctrlKey || event.metaKey);
      if (arAkahukuQuote.enableNumberNoMenu ? noModifier : !noModifier) {
        arAkahukuQuote.quoteMessageByNum (targetDocument, num, event.target);
        event.stopPropagation ();
      }
    }
    else if (num != -1) {
      Akahuku.debug.warn ("arAkahukuQuote.onBodyClick: No." + num
          + " is clicked but in an unsupported node.");
    }
  },

  quoteMessageByNum : function (targetDocument, num, target) {
      var text = "";
      switch (arAkahukuQuote.numberType) {
        case 0:
          text = num;
          break;
        case 1:
          text = "No." + num;
          break;
        case 2:
          var node = target;
          while (node) {
            if (Akahuku.isMessageBQ (node)) {
              text = arAkahukuDOM.getInnerText (node);
              text = arAkahukuConverter.unescapeEntity (text);
              break;
            }
            node = node.nextSibling;
          }
          break;
        case 3:
          var node = target;
          while (node) {
            if (Akahuku.isMessageBQ (node)) {
              text = arAkahukuDOM.getInnerText (node);
              text = arAkahukuConverter.unescapeEntity (text);
              var lines = text.split (/[\r\n]+/);
              text = "";
              for (var i = 0; i < lines.length; i ++) {
                if (lines [i].match (/^>/)) {
                  continue;
                }
                if (text) {
                  text += "\n";
                }
                text += lines [i];
              }
              break;
            }
            node = node.nextSibling;
          }
          break;
      }
      if (arAkahukuQuote.enableNumberNoComment
          && (text.match (/^\uFF77\uFF80\u2501\u2501\u2501\u2501\u2501\u2501\(\uFF9F\u2200\uFF9F\)\u2501\u2501\u2501\u2501\u2501\u2501 !!!!![ \r\n]*$/)
              || text.match (/^\uFF77\uFF80\u2501\u2501\u2501\(\uFF9F\u2200\uFF9F\)\u2501\u2501\u2501!![ \r\n]*$/)
              || text.match (/^\u672C\u6587\u7121\u3057[ \r\n]*$/))) {
        text = "No." + num;
      }
      else if (arAkahukuQuote.enableNumberOnlyQuote
          && ((arAkahukuQuote.numberType == 3 && text.length == 0)
            ||(arAkahukuQuote.numberType == 2
              && /^>[^\r\n]*(\r?\n>[^\r\n]*)*$/.test (text))
            )) {
        text = "No." + num;
      }
      
      target = targetDocument.getElementsByTagName ("textarea");
      if (target.length == 0) {
        return;
      }
      target = target [0];
            
      if (arAkahukuQuote.enableNumberClear) {
        target.value = "";
      }
            
      arAkahukuPostForm.ensureDispPostForm (targetDocument);
      if (!arAkahukuPostForm.enableCommentboxStatusSize) {
        target.rows = "8";
      }
      var s = arAkahukuQuote.addPrefix (text, ">");
      if (target.value == "") {
        target.value = s.replace (/[\r\n]$/, "");
      }
      else {
        target.value = target.value.replace (/[\r\n]$/, "") + "\n" + s;
      }
            
      target.value += "\n";
            
      target.setSelectionRange (target.value.length, target.value.length);
      target.focus ();
            
      arAkahukuPostForm.focus (targetDocument, target);
  },
    
  /**
   * 対象のノード以下にレス番号の引用を適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyQuickQuoteNumber : function (targetDocument, targetNode) {
    var nodes = Akahuku.getMessageBQ (targetNode);
    
    for (var i = 0; i < nodes.length; i ++) {
      var node = nodes [i];
      while (node) {
        if (node.nodeType == node.TEXT_NODE
            && node.nodeValue.match (/(No\.[0-9]+)/)) {
          var prev = RegExp.leftContext;
          var num = RegExp.$1;
          var next = RegExp.rightContext;
                    
          /* Text.splitText で高速分割 */
          if (typeof (node.splitText) == "function") {
            if (prev) {
              node = node.splitText (prev.length);
            }
            if (next) {
              node.splitText (num.length);
            }
            break;
          }
                    
          node.nodeValue = num;
                    
          if (prev) {
            node.parentNode
              .insertBefore (targetDocument.createTextNode (prev),
                             node);
          }
          if (next) {
            if (node.nextSibling) {
              node.parentNode
                .insertBefore (targetDocument.createTextNode
                               (next),
                               node.nextSibling);
            }
            else {
              node.parentNode
                .appendChild (targetDocument.createTextNode
                              (next));
            }
          }
                    
          break;
        }
                
        node = node.previousSibling;
      }
    }
  },
  
  /**
   * レス番号の引用を付ける
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (info.isReply
        && arAkahukuQuote.enable
        && arAkahukuQuote.enableNumber) {
      targetDocument.body.addEventListener
      ("click",
       function () {
        arAkahukuQuote.onBodyClick (arguments [0]);
      }, false);
      
      arAkahukuQuote.applyQuickQuoteNumber (targetDocument,
                                            targetDocument);
    }
  }
};
