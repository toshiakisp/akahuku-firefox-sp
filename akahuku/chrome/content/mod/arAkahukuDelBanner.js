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
    if (arAkahukuDelBanner.enableImage
        || arAkahukuDelBanner.enableImage404
        || all) {
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
      if (nodes [i].nodeName.toLowerCase () == "object") {
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
            
      /* 新しいサーバが IP アドレスになっているので名前にする */
      src = src
      .replace (/112\.78\.198\.230/, "jan.2chan.net")
      .replace (/112\.78\.201\.90/, "mar.2chan.net")
      .replace (/112\.78\.200\.214/, "jul.2chan.net");
      
      if (src.indexOf (":") == -1
          && nodes [i].nodeName.toLowerCase () == "img") {
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
      
      if (src.match (/^http:\/\/[a-z]+.2chan.net(:[0-9]+)?\/ad\//)
          || src.match (/^http:\/\/[a-z]+.2chan.net(:[0-9]+)?\/dec\/ad\//)) {
        /* 広告バナー */
      }
      else if (src.match (/^http:\/\/([^\/]+\/)?[^\.\/]+\.2chan\.net(:[0-9]+)?\//)
               && nodes [i].nodeName.toLowerCase () == "img") {
        /* ふたば内 */
        continue;
      }
            
      if (src.match (/^\//)
          && nodes [i].nodeName.toLowerCase () == "img") {
        /* ふたば内 */
        continue;
      }
            
      if (Akahuku.protocolHandler.isAkahukuURI (src)) {
        /* akahuku プロトコル */
akahuku://rrd.2chan.net/p2p/http.5/dec/ad/src/1272121796994.gif
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
            
      if (arAkahukuDelBanner.enableImage
          || all) {
        if (src.match (/http:\/\/aqua\.dmm\.co\.jp\//)
            || src.match (/http:\/\/www\.mmaaxx\.com\//)
            || src.match (/http:\/\/click\.dtiserv2\.com\//)) {
          delTarget = true;
        }
      }
            
      if (arAkahukuDelBanner.enableImage404
          || all) {
        if (src.match (/http:\/\/affiliate\.dtiserv\.com\//)
            || src.match (/http:\/\/www\.mmaaxx\.com\//)
            || src.match (/http:\/\/click\.dtiserv2\.com\//)) {
          delTarget = true;
        }
      }
            
      if (arAkahukuDelBanner.enableFlash
          || all) {
      }
            
      if (delTarget || all) {
        /* 削除対象 */
        if (parent) {
          if (parent.parentNode.nodeName.toLowerCase () == "div"
              && parent.parentNode.childNodes.length == 1) {
            parent = parent.parentNode;
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
              && next.nodeValue.match (/^[ \r\n\t]*$/)) {
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
                  || href.match (/http:\/\/www\.2chan\.net\/ktinv/))) {
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
    var targetTable = null;
    
    /* 広告を探すので Akahuku.getMessageBQ は使わない */
    var nodes = targetDocument.getElementsByTagName ("blockquote");
    for (var i = nodes.length - 1; i >= 0; i --) {
      var table = arAkahukuDOM.findParentNode (nodes [i], "table");
      if (table && table.getAttribute ("border") == 1) {
        targetTable = table;
        break;
      }
      if (table && "className" in table
          && table.className == "ama") {
        targetTable = table;
        break;
      }
      table = arAkahukuDOM.findParentNode (nodes [i], "div");
      if (table
          && "className" in table
          && table.className == "ama") {
        targetTable = table;
        break;
      }
    }
    
    if (!targetTable) {
      return;
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
    var div2 = targetDocument.createElement ("center");
    div2.style.position = "absolute";
    div2.style.right = "0px";
    div2.style.bottom = "12px";
    div2.style.textAlign = "center";
        
    div.appendChild (div2);
        
    var node = targetTable;
    if (arAkahukuDelBanner.enableMoveTailAdAll
        && targetTable.parentNode.nodeName.toLowerCase () == "div"
        && targetTable.parentNode.align == "center") {
      node = targetTable.parentNode.firstChild;
    }
    while (node) {
      var nextSibling = node.nextSibling;
      div2.appendChild (node);
      node = nextSibling;
    }
        
    hr.parentNode.insertBefore (div, hr.nextSibling);
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
