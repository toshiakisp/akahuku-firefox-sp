/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: arAkahukuConfig, arAkahukuDOM
 */

/**
 * 広告削除管理
 *   [広告を隠す]
 */
var arAkahukuDelBanner = {
  enable : false,            /* Boolean  広告を隠す */
  enableImage : false,       /* Boolean  バナー広告 */
  enableImage404 : false,    /* Boolean  404 ページの広告 */
  enableFlash : false,       /* Boolean  二次の Flash 広告 */
  enableText : false,        /* Boolean  テキスト広告 */
  enableMoveTailAd : false,  /* Boolean  末尾の広告を横に置く */
  enableMoveTailAdAll :false,/* Boolean  全て横に */
    
  /**
   * スタイルファイルのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  setStyleFile : function (style) {
    if (arAkahukuDelBanner.enable) {
      style
      .addRule ("*[__akahuku_contentpolicy_hide]",
                "display: none ! important;");
      if (arAkahukuDelBanner.enableImage) {
        /* バナー広告の後の改行 */
        style
        .addRule ("a[delete] + br",
                  "display: none;");
      }
            
      if (arAkahukuDelBanner.enableText) {
        /* テキスト広告 */
        style
        .addRule
        ("form > b > a[href*=\"http://click.dtiserv2.com/\"]",
         "display: none;");
      }
    }
  },

  /**
   * スタイルファイルのスタイルを解除する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  resetStyleFile : function (style) {
    if (arAkahukuDelBanner.enable) {
      if (arAkahukuDelBanner.enableText) {
        /* テキスト広告 */
        style
        .addRule
        ("form > b > a[href*=\"http://click.dtiserv2.com/\"]",
         "display: inline !important;");
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
      style
        .addRule
        ("#akahuku_tailad_center > *",
         "margin-right: auto ! important;"
         + "margin-left: auto ! important;");
    }
  },

  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuDelBanner.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.delbanner", false);
    if (arAkahukuDelBanner.enable) {
      arAkahukuDelBanner.enableImage
        = arAkahukuConfig
        .initPref ("bool", "akahuku.delbanner.image", false);
      arAkahukuDelBanner.enableImage404
        = arAkahukuConfig
        .initPref ("bool", "akahuku.delbanner.image.404",
                   arAkahukuDelBanner.enableImage);
      arAkahukuDelBanner.enableFlash
        = arAkahukuConfig
        .initPref ("bool", "akahuku.delbanner.flash", false);
      arAkahukuDelBanner.enableText
        = arAkahukuConfig
        .initPref ("bool", "akahuku.delbanner.text", false);
      arAkahukuDelBanner.enableMoveTailAd
        = arAkahukuConfig
        .initPref ("bool", "akahuku.delbanner.movetailad", false);
      if (arAkahukuDelBanner.enableMoveTailAd) {
        arAkahukuDelBanner.enableMoveTailAdAll
          = arAkahukuConfig
          .initPref ("bool", "akahuku.delbanner.movetailad.all", false);
      }
    }
  },
    
  /**
   * 画像広告を削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   * @param  Boolean all
   *         全て削除する
   */
  deleteImage : function (targetDocument, info, all) {
    var images = targetDocument.getElementsByTagName ("img");
    var iframes = targetDocument.getElementsByTagName ("iframe");
    var objects = targetDocument.getElementsByTagName ("object");
    var src = "";
    var nodes = new Array ();
    var i;
    var objectNodeName = "OBJECT";
    var imgNodeName    = "IMG";
    var iframeNodeName = "IFRAME";
    if (arAkahukuDelBanner.enableImage
        || arAkahukuDelBanner.enableImage404
        || arAkahukuDelBanner.enableFlash
        || all) {
      /* nodeName を比較用に取得 (表記法は文書内で同一と仮定) */
      if (images.length > 0)
        imgNodeName = String (images [0].nodeName);
      if (iframes.length > 0)
        iframeNodeName = String (iframes [0].nodeName);
      if (objects.length > 0)
        objectNodeName = String (objects [0].nodeName);
            
      for (i = 0; i < images.length; i ++) {
        nodes.push (images [i]);
      }
      for (i = 0; i < iframes.length; i ++) {
        nodes.push (iframes [i]);
      }
      for (i = 0; i < objects.length; i ++) {
        nodes.push (objects [i]);
      }
    }
        
    for (var i = 0; i < nodes.length; i ++) {
      if (nodes [i].nodeName === objectNodeName) {
        src = "";
                
        var params = nodes [i].getElementsByTagName ("param");
        for (var j = 0; j < params.length; j ++) {
          if (params [j].name == "movie") {
            src = params [j].value;
            break;
          }
        }
      }
      else if (info.isMht) {
        if (nodes [i].hasAttribute ("__unmht_src")
            && nodes [i].getAttribute ("__unmht_src")) {
          /* unmht の出力で unmht_src を持っており、空でない場合 */
          src = nodes [i].getAttribute ("__unmht_src");
        }
        else {
          if (nodes [i].hasAttribute ("src")) {
            /* mht ファイルでは不明な画像は表示したまま */
            continue;
          }
          src = "";
        }
      }
      else if (nodes [i].hasAttribute ("src")
               && nodes [i].getAttribute ("src")) {
        /* src を持っており、空でない場合 */
        src = nodes [i].src;
      }
      else if (nodes [i].hasAttribute ("dummysrc")
               && nodes [i].getAttribute ("dummysrc")) {
        /* dummysrc を持っており、空でない場合 */
        src = nodes [i].getAttribute ("dummysrc");
      }
      else {
        src = "";
      }
            
      if (src.indexOf (":") == -1
          && nodes [i].nodeName === imgNodeName) {
        /* 相対パス */
        continue;
      }
            
      if (info.isMht) {
        if (src
            && !src.match (/^http/)) {
          /* unmht の出力で、ローカル経由で保存されたファイルの場合 */
          continue;
        }
      }
            
      if ("className" in nodes [i]
          && nodes [i].className
          && nodes [i].className.match (/^akahuku_generated/)) {
        /* 固定フォームのアイコン */
        continue;
      }

      if ("className" in nodes [i]
          && nodes [i].className == "akahuku_preview") {
        /* プレビュー */
        continue;
      }
      
      var uinfo =  arAkahukuImageURL.parse (src);
      if (uinfo && uinfo.isAd) {
        /* 広告バナー */
      }
      else if (uinfo && uinfo.isImage
               && nodes [i].nodeName === imgNodeName) {
        /* ふたば内 */
        continue;
      }
            
      if (src.match (/^\//)
          && nodes [i].nodeName === imgNodeName) {
        /* ふたば内 */
        continue;
      }
            
      if (Akahuku.protocolHandler.isAkahukuURI (src)) {
        /* akahuku プロトコル */
        if (src.match (/^akahuku:\/\/[a-z]+.2chan.net(:[0-9]+)?\/p2p\/http\.5\/ad\//)
            || src.match (/^akahuku:\/\/[a-z]+.2chan.net(:[0-9]+)?\/p2p\/http\.5\/dec\/ad\//)) {
          /* 広告バナー */
        }
        else {
          continue;
        }
      }
            
      var parent = arAkahukuDOM.findParentNode (nodes [i], "a");
      if (parent) {
        if (parent.hasAttribute ("__unmht_href")
            && parent.getAttribute ("__unmht_href") == src) {
          /* UnMHT でのプレビュー */
          continue;
        }
      }
            
      var delTarget = false;
            
      /*  arAkahukuContentPolicy の結果から判定 */
      if (parent) {
        delTarget = parent.hasAttribute ("delete");
      }
            
      if (delTarget || all) {
        /* 削除対象 */
        if (parent) {
          if (parent.parentNode.nodeName.toLowerCase () == "div") {
            if (parent.parentNode.childNodes.length == 1) {
              parent = parent.parentNode;
            }
            else if (parent.parentNode.children.length == 1) {
              // 子ノード数が1ではないのに子要素数が1の場合は
              // 無駄なノードがある可能性があるので精密に探索する
              var child = parent.parentNode.childNodes [0];
              var valuableChildsLength = 0;
              while (child) {
                if (child.nodeType === child.ELEMENT_NODE) {
                  valuableChildsLength ++;
                }
                else if (child.nodeType === child.TEXT_NODE
                    && !(/^[ \r\n\t]*$/.test (child.nodeValue))) {
                  valuableChildsLength ++;
                }
                child = child.nextSibling;
              }
              if (valuableChildsLength == 1) {
                // 価値あるノードが1つなら削除対象を親へ移動
                parent = parent.parentNode;
              }
            }
          }
          var next = parent.nextSibling;
          if (next
              && next.nodeName.toLowerCase () == "#text"
              && next.nodeValue.match (/^[ \r\n\t]*$/)) {
            parent.parentNode.removeChild (next);
          }
          next = parent.nextSibling;
          if (next
              && next.nodeName.toLowerCase () == "br") {
            parent.parentNode.removeChild (next);
          }
          next = parent.nextSibling;
          if (next
              && next.nodeName.toLowerCase () == "br") {
            parent.parentNode.removeChild (next);
          }
          parent.parentNode.removeChild (parent);
        }
        else {
          var next = nodes [i].nextSibling;
          if (next
              && next.nodeName.toLowerCase () == "#text"
              && ((nodes [i].nodeName.toLowerCase () == "iframe" &&
                next.nodeValue.match (/^[ \r\n\t\.]*$/))
                || next.nodeValue.match (/^[ \r\n\t]*$/)) ) {
            nodes [i].parentNode.removeChild (next);
          }
          next = nodes [i].nextSibling;
          if (next
              && next.nodeName.toLowerCase () == "br") {
            nodes [i].parentNode.removeChild (next);
          }
          nodes [i].parentNode.removeChild (nodes [i]);
        }
      }
      else {
        /* 保存時に消す */
        nodes [i].setAttribute ("__akahuku_banner", "true");
      }
            
    }
  },
    
  /**
   * テキスト広告を削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  deleteText : function (targetDocument, all) {
    var bolds = targetDocument.getElementsByTagName ("b");
    for (var i = 0; i < bolds.length; i ++) {
      var next = null;
      var prev = null;
            
      if (!all) {
        if (bolds [i].firstChild
            && bolds [i].firstChild.nodeName.toLowerCase () == "a") {
          var href = bolds [i].firstChild.getAttribute ("href");
          if (href
              && (href.match (/http:\/\/www\.amazon\.co\.jp\//)
                  || href.match (/^https?:\/\/www\.2chan\.net\/ktinv/))) {
            continue;
          }
        }
      }
            
      prev = bolds [i].previousSibling;
      if (prev && prev.nodeName.toLowerCase () == "#text"
          && prev.nodeValue.match (/\u5E83\u544A/)) {
        next = bolds [i].nextSibling;
                
        prev.parentNode.removeChild (prev);
        bolds [i].parentNode.removeChild (bolds [i]);
        next.parentNode.removeChild (next);
        i --;
      }
    }
  },
    
  /**
   * 末尾の広告を移動する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  moveTailAd : function (targetDocument) {
    var target = null;
    
    /* 広告を探すので Akahuku.getMessageBQ は使わない */
    var nodes = targetDocument.getElementsByTagName ("blockquote");
    for (var i = nodes.length - 1; i >= 0; i --) {
      var table = arAkahukuDOM.findParentNode (nodes [i], "table");
      if (table && table.getAttribute ("border") == 1) {
        target = table;
        break;
      }
      if (table && "className" in table
          && table.className == "ama") {
        target = table;
        break;
      }
      table = arAkahukuDOM.findParentNode (nodes [i], "div");
      if (table
          && "className" in table
          && table.className == "ama") {
        target = table;
        break;
      }
      if (Akahuku.getMessageBQ (nodes [i].parentNode)) {
        // 後ろから探してレスまでいったらもう探さない
        break;
      }
    }

    var targetIsInContainer = false;
    if (target && arAkahukuDelBanner.enableMoveTailAdAll
        && target.parentNode.nodeName.toLowerCase () == "div"
        && target.parentNode.align == "center") {
      targetIsInContainer = true;
    }
    if (!target) {
      target = arAkahukuDelBanner._getTailDivOfIframeAds (targetDocument);
      if (!target) {
        return;
      }
      targetIsInContainer = true;
    }
        
    nodes = targetDocument.getElementsByTagName ("hr");
    if (nodes.length == 0) {
      return;
    }
        
    var hr = nodes [nodes.length - 1];
        
    var div = targetDocument.createElement ("div");
    div.id = "akahuku_tailad";
    div.style.cssFloat = "right";
    div.style.width = "0px";
    div.style.height = "0px";
    div.style.position = "relative";
    var div2 = targetDocument.createElement ("div");
    div2.id = "akahuku_tailad_center";
    div2.style.position = "absolute";
    div2.style.right = "0px";
    div2.style.bottom = "12px";
    div2.style.textAlign = "center";
        
    div.appendChild (div2);
        
    var node = target;
    if (arAkahukuDelBanner.enableMoveTailAdAll
        && targetIsInContainer) {
      node = target.parentNode.firstChild;
    }
    while (node) {
      var nextSibling = node.nextSibling;
      div2.appendChild (node);
      node = nextSibling;
    }
        
    hr.parentNode.insertBefore (div, hr.nextSibling);
  },

  _getTailDivOfIframeAds : function (targetDocument)
  {
    if (!Akahuku.isXPathAvailable) {
      return null;
    }
    var xpath = ".//form[@method='POST'][last()]/following-sibling::*/descendant-or-self::div[count(div[count(descendant::iframe)=1])>0]/div[count(descendant::iframe)=1][last()]";
    var r = targetDocument.evaluate
      (xpath, targetDocument, null,
       targetDocument.defaultView.XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (!r) return null;
    return r.singleNodeValue;
  },
    
  /**
   * コンテクストノードを削除する
   */
  deleteContextAfterBlock : function (context, text)
  {
    if (context.hasAttribute ("delete")) {
      // 処理済みのノードは無視
      return;
    }
    var branch = context.nodeName;
    var node = context;
    var hiddenNode = null;
    var hideAttr = "__akahuku_contentpolicy_hide";
    var dontRemove = node.hasAttribute ("id");
    function isBlankNode (node) {
      return (node.offsetHeight == 0 || node.offsetWidth == 0);
    }

    // ノードを非表示にしながら問題なさそうな所まで祖先にさかのぼる
    while (node.parentNode) {
      node.setAttribute (hideAttr, "1");
      if (!isBlankNode (node)) {
        // 別srcなiframe内では hideAttr で非表示にできないので
        node.style.display = "none";
      }
      if (hiddenNode) {
        hiddenNode.removeAttribute (hideAttr);
      }
      hiddenNode = node;

      var blank = true;
      for (var i = 0; i < node.parentNode.children.length; i ++) {
        var brother = node.parentNode.children [i];
        if (brother == node) continue; // 兄弟のみを走査
        blank = blank && isBlankNode (brother);
        dontRemove = dontRemove
          || brother.hasAttribute ("id")
          || brother.hasAttribute (hideAttr);
      }
      if (!blank) break; //空白ではない兄弟がいるならそこまで

      node = node.parentNode;
      branch = node.nodeName
        + (node.hasAttribute ("id") ? "#" + node.getAttribute ("id") : "")
        + (node.hasAttribute ("class") ? "." + node.getAttribute ("class") : "")
        + ">" + branch;

      if (node.parentNode && node.parentNode.nodeType == node.DOCUMENT_NODE) {
        if (!node.parentNode.defaultView) {
          dontRemove = true;
          break;
        }
        var frameElement = node.parentNode.defaultView.frameElement;
        if (frameElement && frameElement.nodeName.toLowerCase () == "iframe") {
          // iframeの中からは親ドキュメントへさかのぼる
          branch = frameElement.nodeName
            + (node.hasAttribute ("id") ? "#" + node.getAttribute ("id") : "")
            + (node.hasAttribute ("class") ? "." + node.getAttribute ("class") : "")
            + ">#document"
            + (frameElement.hasAttribute ("src") ? "(" + frameElement.getAttribute ("src") + ")" : "")
            + ">" + branch;
          node = frameElement;
          // iframe内のidは関係がないのでフラグリセット
          dontRemove = false;
        }
        else {
          break;
        }
      }

      dontRemove = dontRemove || node.hasAttribute ("id");
    }

    var log = false;
    if (/^(?:DIV(?:[\.#][^>]*)*>)?A(?:[\.#][^>]*)*>IMG(?:[\.#][^>]*)*$/.test (branch)) {
      // バナー広告のツリー構造は従来通りに削除処理
      context.parentNode.setAttribute ("delete", text || "delete");
      context.setAttribute ("__akahuku_banner", "true");
      if (hiddenNode) {
        hiddenNode.removeAttribute ("__akahuku_contentpolicy_hide");
        hiddenNode = null;
      }
      var param = Akahuku.getDocumentParam (context.ownerDocument);
      var info = (param ? param.location_info : {isMht:false});
      this.deleteImage (node, info, false);
      node = null;
    }
    else if (/^(?:DIV(?:[\.#][^>]*)*>)*IFRAME(?:[\.#][^>]*)*($|>#document)/.test (branch)) {
      // known ad pattern
    }
    else if (/(^|>)DIV(?:#[^>]*)?\.thre(>|$)/.test (branch)) {
      // for safe
      if (hiddenNode) {
        hiddenNode.removeAttribute ("__akahuku_contentpolicy_hide");
        hiddenNode = null;
      }
      Akahuku.debug.warn
        ("deleteContextAfterBlock avoids to "
         + (dontRemove ? "hide " : "remove ")
         + "(" + node.parentNode.nodeName + ">)" + branch + src
         + "\n  " + context.ownerDocument.location);
      node = null;
    }
    else { // unknown pattern
      log = true;
    }

    if (node && node.parentNode) {
      var parentNodeName = node.parentNode.nodeName;
      if (dontRemove) {
        // already hidden, just mark
        context.setAttribute ("delete", text || "delete");
        node.setAttribute ("delete", text || "delete");
      }
      else {
        node.parentNode.removeChild (node);
      }

      if (log && Akahuku.debug.enabled) {
        var src = context.getAttribute ("src") || "";
        if (src.length) {
          src = "[src=\"" + src.replace (/\?.*$/, "?...") + "\"]";
        }
        Akahuku.debug.log
          ("deleteContextAfterBlock suspiciously "
           + (dontRemove ? "hides " : "removes ")
           + "(" + parentNodeName + ">)" + branch + src
           + "\n  " + context.ownerDocument.location);

      }
    }
  },

  /**
   * 広告を削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (arAkahukuDelBanner.enable
        && (info.isFutaba || info.isMht)) {
      // arAkahukuContentPolicy からの削除要求をまず適用
      Akahuku.runContextTasks
        (targetDocument, {handler: this.deleteContextAfterBlock});

      if (info.isNotFound) {
        if (arAkahukuDelBanner.enableImage404) {
          arAkahukuDelBanner.deleteImage
          (targetDocument, info, false);
        }
      }
      else if (info.isCatalog) {
        if (arAkahukuDelBanner.enableImage
            || arAkahukuDelBanner.enableFlash) {
          arAkahukuDelBanner.deleteImage
          (targetDocument, info, false);
        }
      }
      else {
        if (arAkahukuDelBanner.enableImage
            || arAkahukuDelBanner.enableFlash) {
          arAkahukuDelBanner.deleteImage
          (targetDocument, info, false);
        }
        if (arAkahukuDelBanner.enableText) {
          arAkahukuDelBanner.deleteText (targetDocument, false);
        }
                
        if (arAkahukuDelBanner.enableMoveTailAd) {
          arAkahukuDelBanner.moveTailAd (targetDocument);
        }
      }
    }
  }
};
