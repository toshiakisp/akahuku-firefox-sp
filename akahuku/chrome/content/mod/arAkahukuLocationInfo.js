
/**
 * Require: arAkahukuBoard, arAkahukuDOM, arAkahukuFile,
 *          arAkahukuFileName, arAkahukuConverter, arAkahukuJSON,
 *          arAkahukuTitle, arAkahukuUtil, arAkahukuP2P
 *
 * init を使用しない場合は arAkahukuBoard, arAkahukuDOM は不要
 */

/**
 * アドレス、スレの情報
 * 
 * @param  HTMLDocument targetDocument
 *         対象のドキュメント
 *           null の時は初期化しない
 * @param  Boolean instant
 *         コンテキストメニューからの適用か
 */
function arAkahukuLocationInfo (targetDocument, instant) {
  if (targetDocument) {
    this.init (targetDocument, instant);
  }
}
arAkahukuLocationInfo.prototype = {
  isOnline : false,             /* Boolean  オンラインかどうか
                                 *   保存、リロードのフック、続きを読む
                                 *   リロード後の最新レス位置への移動 */
  isFutaba : false,             /* Boolean  ふたば内かどうか
                                 *   ユーザースタイルシート、サムネのチェック */
  isTatelog : false,            /* Boolean タテログかどうか */
  isMonaca : false,            /* Boolean  避難所内かどうか
                                *   避難所固有の仕様への対応 */
  isMht : false,                /* Boolean  mht かどうか
                                 *   レス番号、メル欄展開、リンク先のチェック */
    
  isNijiura : false,            /* Boolean  二次裏かどうか */
    
  isNormal : false,             /* Boolean  通常表示かどうか */
  isCatalog : false,            /* Boolean  カタログかどうか */
  isReply : false,              /* Boolean  レス送信モードかどうか */
  isFutasuke : false,           /* Boolean  双助かどうか
                                 *   リンク先の変更、差分読み込みの回避 */
  isTsumanne : false,           /* Boolean  サッチーかどうか */
  isNotFound : false,           /* Boolean  404 かどうか */
  isRedirect : false,           /* Boolean  リダイレクトかどうか */
  isImage : false,              /* Boolean  画像かどうか */
  isCache : false,              /* Boolean  キャッシュかどうか */
  path : "",                    /* String  板内のパス */
    
  normalPageNumber : 0,         /* Number  ページ番号 */
  threadNumber : 0,             /* Number  スレ番号 */
  replyCount : 0,               /* Number  レス数 */
  incomingReply : 0,            /* Number  レス増加通知数 */
    
  replyPrefix : "",             /* String  返信のテーブルの最初の文字 */
    
  scheme : "",
  server : "",                  /* String  サーバ名 */
  dir : "",                     /* String  ディレクトリ名 */
    
  isOld : false,                /* Boolean  そろそろ消えるか */
  board : "",                   /* String  板名 */
  board2 : "",                  /* String  サーバ名無しの板名 */
  board3 : "",                  /* String  実際の板名 */
  message : "",                 /* String  サブタイトル */
  message2 : "",                /* String  修正なしのコメントの 1 行目 */
  message8byte : "",            /* String  コメント最初の４文字 */
  entiremessage : "",           /* String  コメント全体 */
  name : "",                    /* String  名前 */
  mail : "",                    /* String  メル欄 */
  subject : "",                 /* String  題 */
  ip : "",                      /* String  IP アドレス */
  id : "",                      /* String  ID */
  mode : "",                    /* String  ページ番号／返信／カタログ */
    
  viewer : "",                  /* String  人数 */
  expire : "",                  /* String  消滅時刻 */
  expireWarning : "",           /* String  消滅情報 */
    
  year : "",                    /* String  スレ立ての年 */
  month : "",                   /* String  スレ立ての月 */
  day : "",                     /* String  スレ立ての日 */
  week : "",                    /* String  スレ立ての曜日 */
  hour : "",                    /* String  スレ立ての時 */
  min : "",                     /* String  スレ立ての分 */
  sec : "",                     /* String  スレ立ての秒 */
    
  /**
   * アドレス情報を設定する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean instant
   *         コンテキストメニューからの適用か
   */
  init : function (targetDocument, instant) {
    var location = targetDocument.location.href;
    var title = targetDocument.title;
    var path = ""; /* 板のディレクトリ以下のパス */
    var nodes, node;
        
    if (title.indexOf ("404 File Not Found") != -1
        || title.indexOf ("404 Not Found") != -1
        || targetDocument.getElementById ("errorPageContainer") != null) {
      /* 「ファイルが無いよ」か、もしくはサーバに繋がらなかった場合 */
      this.isNotFound = true;
      /* form の有無で再チェック */
      nodes = targetDocument.getElementsByTagName("form");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].action.match (/\.php(\?.+)?$/)
            && nodes [i].method.toLowerCase () == "post"
            && nodes [i].enctype.toLowerCase ()
            == "multipart/form-data") {
          this.isNotFound = false;
          break;
        }
      }
    }
        
    // 旧CGI仕様の板でスレが消えた場合のチェック
    nodes = targetDocument.body ? targetDocument.body.childNodes : [];
    for (var i = 0; i < nodes.length; i ++) {
      var nodename = nodes [i].nodeName.toLowerCase ();
      if (nodename === "center"
          || (nodename === "div" && nodes [i].align == "center")) {
        node = nodes [i];
      }
      else {
        continue;
      }
      node = arAkahukuDOM.getFirstElementByNames (node, "font");
      node = (node ? arAkahukuDOM.getFirstElementByNames (node, "b") : null);
      if (node && node.innerHTML.indexOf
          //"該当記事がみつかりません"
          ("\u8A72\u5F53\u8A18\u4E8B\u304C\u307F\u3064\u304B\u308A\u307E\u305B\u3093") != -1) {
        this.isNotFound = true;
      }
    }
        
    if (Akahuku.protocolHandler.isAkahukuURI (location)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (location);
      if (p.type == "cache"
          || p.type == "filecache") {
        location = p.original;
        this.isCache = true;
      }
    }
        
    if (location.match (/^https?:\/\/([^\/]+\/)?([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|www|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(.*)$/)) {
      var prefix = RegExp.$1;
      this.server = RegExp.$2;
      /* RegExp.$3: ポート番号 */
      var sdir = RegExp.$4;
      this.dir = RegExp.$5;
      path = RegExp.$6;
            
      if (sdir) {
        sdir = sdir.replace (/\//, "");
        this.dir = sdir + "-" + this.dir;
      }
            
      if (prefix) {
        this.isFutasuke = true;
      }
      this.isFutaba = true;
    }
    else if (location.match
             (/^http:\/\/appsweets\.net\/tatelog\/(dat|img)\/thread\/([0-9]+)$/)) {
      // タテログのログ
      this.server = "tatelog" + RegExp.$1;
      this.dir = "tatelog";
      this.isTatelog = true;
      this.isTsumanne = true;
      path = "";
      this.isFutaba = false;
      this.isReply = true;
      this.threadNumber = parseInt (RegExp.$2) || 0;
      this.mode = "\u8FD4\u4FE1";//"返信"
    }
    else if (location.match
             (/^http:\/\/appsweets\.net\/catalog\/dat\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      this.server = "dat";
      this.dir = "b";
      this.isTatelog = true;
      path = RegExp.$1;
      this.isFutaba = true;
    }
    else if (location.match
             (/^http:\/\/www\.nijibox4\.com\/akahuku\/catalog\/dat\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      this.server = "dat";
      this.dir = "b";
      this.isTatelog = true;
      path = RegExp.$1;
      this.isFutaba = true;
    }
    else if (location.match
             (/^http:\/\/www\.nijibox\.com\/futaba\/catalog\/img\/(view\.php\?mode=cat2?)/)) {
      /* img のタテログ */
      this.server = "img";
      this.dir = "b";
      this.isTatelog = true;
      path = RegExp.$1;
      this.isFutaba = true;
    }
    else if (location.match
             (/^http:\/\/(?:[^\.\/]+\.)?(tsumanne)\.net\/([a-z]+)\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/)) {
      /* サッチー */
      this.server = RegExp.$1;
      this.dir = RegExp.$1;
      this.isTsumanne = true;
      path = "";
      this.isFutaba = false;
    }
        
    if (location.match (/^unmht:\/\//)) {
      this.isMht = true;
      this.server = "UnMHT";
      this.dir = "UnMHT";
    }
    if (instant) {
      this.server = "?";
      this.dir = "?";
    }
        
    if (instant || this.isMht) {
      /* [掲示板に戻る] のリンクからサーバ名、ディレクトリ名を取得する */
      // (body > a なリンクのみを探査対象に)
      nodes = targetDocument.body.children;
      var uri = null;
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].nodeName.toLowerCase () !== "a") {
          continue;
        }
        try { // 相対アドレスの解決
          uri = arAkahukuUtil.newURIViaNode (nodes [i].href, nodes [i]);
        }
        catch (e) { Akahuku.debug.exception (e);
          continue;
        }
        if (uri.spec.match (/^(?:https?):\/\/([^\/]+\/)?([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|www|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(.*)$/)) {
          this.isFutasuke = false;
          this.server = RegExp.$2;
          /* RegExp.$3: ポート番号 */
          var sdir = RegExp.$4;
          this.dir = RegExp.$5;
                    
          if (sdir) {
            sdir = sdir.replace (/\//, "");
            this._targetFileDir = sdir + "-" + uinfo.dir;
          }
          path = "";
          break;
        }
      }
    }
        
    if (arAkahukuBoard.enableExternal) {
      for (var i = 0; i < arAkahukuBoard.externalList.length; i ++) {
        if (arAkahukuBoard.externalList [i].prefix) {
          if (targetDocument.location.href.indexOf
              (arAkahukuBoard.externalList [i].pattern) == 0) {
            this.server
            = arAkahukuBoard.externalList [i].pattern
            .replace (/^https?:\/\//, "")
            .replace (/\/$/, "");
            this.dir = "?";
            path
            = targetDocument.location.href.substr
            (arAkahukuBoard.externalList [i].pattern.length);
                    
            this.isMonaca = arAkahukuBoard.externalList [i].monaca;
                    
            break;
          }
        }
        else {
          // Note: pattern は jsm 内の RegExp で生成の(場合がある)ため
          // 結果がここでの RegExp.$* に反映されない (Firefox 49+)
          var reresult =
            arAkahukuBoard.externalList [i].pattern
            .exec (targetDocument.location.href);
          if (reresult) {
            this.server = (reresult [1] || "");
            this.dir = (reresult [2] || "");
            path = (reresult [3] || "");
                    
            this.isMonaca = arAkahukuBoard.externalList [i].monaca;
                    
            break;
          }
        }
      }
    }
        
    if (location.match (/^([^:]+):/)) {
      this.scheme = RegExp.$1;
      if (/^https?/.test (this.scheme)) {
        this.isOnline = true;
      }
    }
        
    if (arAkahukuBoard.knowsAsInternal (this)) {
      this.board3
      = arAkahukuBoard.getServerName (this, "true");
    }
    else  {
      if (this.isMht) {
        nodes = targetDocument.getElementsByTagName ("div");
        if (nodes.length > 0) {
          node = nodes [0];
          var text = arAkahukuDOM.getInnerText (node);
          if (text.match (/\uFF20\u3075\u305F\u3070/)) {
            this.board3
              = text.replace (/\uFF20\u3075\u305F\u3070/, "");
          }
        }
      }
      else {
        node = arAkahukuTitle.getTitleElement (targetDocument, this);
        if (node) {
          this.board3 = arAkahukuDOM.getInnerText (node);
        }
        if (!this.board3) {
          this.board3 = targetDocument.title;
        }
        if (this.board3) {
          this.board3
            = this.board3.replace
            (/\uFF20\u3075\u305F\u3070\s*$/, ""); // ＠ふたば
        }
      }
    }
        
    if (this.dir == "b") {
      this.isNijiura = true;
            
      this.board = "\u8679\u88CF " + this.server;
      this.board2 = "\u8679\u88CF";
    }
    else {
      this.board = this.board3;
      this.board2 = this.board3;
    }
        
        
    if (path.match (/%/)) {
      try {
        path = decodeURIComponent (path);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    this.path = path;
        
    if (instant || this.isMht || this.isTsumanne) {
      this.isReply = true;
      this.threadNumber = 0;
      this.mode = "\u8FD4\u4FE1";
      this.isFutaba = false;
      
      if (this.isMht) {
        this.isTsumanne =
          /^http:\/\/(tsumanne)\.net\/([a-z]+)\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/
          .test (arAkahukuCompat.UnMHT.getRootContentLocation (location));
      }
    }
    else if (path.match (/\?mode=cat/)) {
      this.isCatalog = true;
            
      this.mode = "\u30AB\u30BF\u30ED\u30B0";
    }
    /* 避難所 patch */
    else if (path.match (/^cat.htm/)) {
      this.isCatalog = true;
            
      this.mode = "\u30AB\u30BF\u30ED\u30B0";
    }
    else if (path.match (/^(red|d)\//)) {
      this.isRedirect = true;
      this.mode = "";
    }
    else if (path.match (/^src\//)) {
      this.isImage = true;
      this.mode = "";
    }
    else if (path.match (/^res\/([0-9]+)\.html?$/)
             || path.match (/^2\/([0-9]+)\.html?$/)
             || path.match (/^b\/([0-9]+)\.html?$/)
             || path.match (/\?res=([0-9]+)$/)) {
      this.isReply = true;
      this.threadNumber = parseInt (RegExp.$1) || 0;
            
      this.mode = "\u8FD4\u4FE1";
    }
    else if (this.isFutaba && this.dir == "bin") {
      // IFRAME(広告)などのリソース
    }
    else if (path.match (/^(([^\.]+)\.html?)?([#\?].*)?$/)) {
      this.isNormal = true;
      this.normalPageNumber = parseInt (RegExp.$1) || 0;
            
      if (this.normalPageNumber > 0) {
        this.mode = "\u30DA\u30FC\u30B8 " + this.normalPageNumber;
      }
      else {
        this.mode = "";
      }
    }
        
    nodes = targetDocument.getElementsByTagName ("li");
    for (var i = 0; i < nodes.length; i ++) {
      if (nodes [i].innerHTML.match (/\u73FE\u5728([0-9]+|\?+)/i)) {
        this.viewer = RegExp.$1;
        break;
      }
    }
    if (!this.viewer
        && this.isMht) {
      /* mht では li の中に居ない */
      nodes = targetDocument.getElementsByTagName ("span");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].innerHTML.match (/\u73FE\u5728([0-9]+|\?+)/i)) {
          this.viewer = RegExp.$1;
          break;
        }
      }
      nodes = targetDocument.getElementsByTagName ("small");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].innerHTML.match (/\u73FE\u5728([0-9]+|\?+)/i)) {
          this.viewer = RegExp.$1;
          break;
        }
      }
    }
        
    if (this.isReply || this.isMht) {
      nodes = Akahuku.getMessageBQ (targetDocument);
      this.replyCount = nodes.length - 1;
      if (nodes.length != 0) {
        var node = nodes [0].previousSibling;
                
        var text = "";
        while (node
               && node.nodeName.toLowerCase () != "hr"
               && node.nodeName.toLowerCase () != "input") {
          if (node.nodeName.toLowerCase () == "a"
              || node.nodeName.toLowerCase () == "font") {
            text = arAkahukuDOM.getInnerText (node) + text;
          }
          else if (node.nodeName.toLowerCase () == "#text") {
            text = node.nodeValue + text;
          }
                    
          node = node.previousSibling;
        }
        if (text.match (/([0-9]+)\/([0-9]+)\/([0-9]+)\(([^\)]+)\)([0-9]+):([0-9]+)(:([0-9]+))?/)) {
          this.year = RegExp.$1;
          this.month = RegExp.$2;
          this.day = RegExp.$3;
          this.week = RegExp.$4;
          this.hour = RegExp.$5;
          this.min = RegExp.$6;
          if (RegExp.$7) {
            this.sec = RegExp.$8;
          }
          else {
            this.sec = "00";
          }
        }
        if (text.indexOf ("ID:") != -1
            && text.match (/ID:([^ ]+)/)) {
          /* ID の場合 */
          this.id = RegExp.$1;
        }
        if (text.indexOf ("IP:") != -1
            && text.match (/IP:([^ ]+)/)) {
          /* IP アドレス の場合 */
          this.ip = RegExp.$1;
        }
        if (instant || this.isMht) {
          if (text.match (/No\.([0-9]+)/)) {
            this.threadNumber = parseInt (RegExp.$1);
          }
        }
                
        this.entiremessage
          = arAkahukuTitle.getComment (targetDocument, nodes [0]);
        this.entiremessage
          = arAkahukuConverter.normalize
          (this.entiremessage);
        if (arAkahukuTitle.enableCommentMultiLine) {
          this.message2
            = this.entiremessage.replace (/[\r\n]/, "");
          this.message8byte
            = arAkahukuTitle.truncateComment
            (this.message2, 8, 1);
        }
        else {
          this.message2
            = arAkahukuTitle.getFirstLine (this.entiremessage);
          this.message8byte
            = arAkahukuTitle.truncateComment
            (this.entiremessage.replace (/[\r\n]/, ""), 8, 1);
        }
        this.message
          = arAkahukuTitle.fixUpText (this.message2);
                
        this.message
          = arAkahukuTitle.truncateComment
          (this.message, null, null, "...");
        this.message2
          = arAkahukuTitle.truncateComment
          (this.message2, null, null, "...");
                
        node = nodes [0];
        while (node
               && node.nodeName.toLowerCase () != "hr") {
          var prevNode = node.previousSibling;
            
          if (node.nodeName.toLowerCase () == "a") {
            var href = node.getAttribute ("href");
                        
            if (href) {
              if (href.match (/^mailto:/)) {
                /* メール欄の場合 */
                this.mail = href.replace (/^mailto:/, "");
                                
                if (node.innerHTML.indexOf ("IP:") != -1
                    && node.innerHTML.match (/IP:([^ ]+)/)) {
                  /* IP アドレス の場合 */
                  this.ip = RegExp.$1;
                }
              }
            }
          }
          else if (node.nodeName.toLowerCase () == "font") {
            var color = node.getAttribute ("color");
            var color2 = node.style.color;
            var className
              = "className" in node ? node.className : "";
                        
            if (color == "blue" || color2 == "blue") {
              this.mail = arAkahukuDOM.getInnerText (node);
              this.mail
                = this.mail
                .replace (/^\[/, "")
                .replace (/\]$/, "");
            }
            else if (color == "#cc1105") {
              this.subject = arAkahukuDOM.getInnerText (node);
              this.subject = this.subject.replace (/ $/, "");
              this.subject
                = arAkahukuConverter.normalize
                (this.subject);
            }
            else if (color == "#117743") {
              var nodes2 = node.getElementsByTagName ("font");
              if (nodes2.length > 0) {
                this.name
                  = arAkahukuDOM.getInnerText (nodes2 [0]);
              }
              else {
                this.name = arAkahukuDOM.getInnerText (node);
              }
              this.name = this.name.replace (/ $/, "");
              this.name
                = arAkahukuConverter.normalize (this.name);
              var nodes2 = node.getElementsByTagName ("a");
              for (var i = 0; i < nodes2.length; i ++) {
                var href = nodes2 [i].getAttribute ("href");
                if (href) {
                  if (href.match (/^mailto:/)) {
                    /* メール欄の場合 */
                    this.mail
                      = href.replace (/^mailto:/, "");
                  }
                }
              }
              var nodes2 = node.getElementsByTagName ("font");
              for (var i = 0; i < nodes2.length; i ++) {
                var color = nodes2 [i].getAttribute ("color");
                var color2 = nodes2 [i].style.color;
                if (("className" in nodes2 [i]
                     && nodes2 [i].className
                     == "akahuku_shown_mail")
                    || color == "blue" || color2 == "blue") {
                  this.mail
                    = arAkahukuDOM.getInnerText
                    (nodes2 [i]);
                  this.mail
                    = this.mail
                    .replace (/^\[/, "")
                    .replace (/\]$/, "");
                }
              }
            }
            else {
              if (node.innerHTML.indexOf ("IP:") != -1
                  && node.innerHTML.match (/IP:([^ ]+)/)) {
                /* IP アドレス の場合 */
                this.ip = RegExp.$1;
              }
            }
          }
          else if (this.isMonaca && node.nodeName.toLowerCase () == "span") {
            var className = "className" in node ? node.className : "";
            var propMap = {s1:"subject", s2:"name"};
            if (className && propMap.hasOwnProperty (className)) {
              var nodeText = arAkahukuDOM.getInnerText (node);
              nodeText = nodeText.replace (/ $/, "");
              nodeText = arAkahukuConverter.normalize (nodeText);
              this [propMap [className]] = nodeText;
            }
          }
            
          node = prevNode;
        }
        this.mail = arAkahukuConverter.normalize (this.mail);
      }
    }
  },
    
  /**
   * 拡張した要素を XSLT に変換する
   *
   * @param  XMLElement node
   *         変換する要素
   */
  convertElement : function (node) {
    var node2, nextNode, tmpNode, newNode, space;
    var nodeName = node.nodeName;
    var pos;
        
    var invert = false;
    if (nodeName.substr (0, 1) == "_") {
      nodeName = nodeName.substr (1);
      invert = true;
    }
        
    var parentNode;
        
    switch (nodeName) {
      case "#text":
        pos = 0;
        while (node && (pos = node.nodeValue.indexOf (" ")) != -1) {
          parentNode = node.parentNode;
                
          tmpNode = node.splitText (pos);
                
          space
            = node.ownerDocument.createElementNS
            ("http://www.w3.org/1999/XSL/Transform", "value-of");
          space.setAttribute ("select", "/info/space");
                
          parentNode.insertBefore (space, tmpNode);
          if (tmpNode.nodeValue.length > 1) {
            node = tmpNode.splitText (1);
            parentNode.removeChild (tmpNode);
          }
          else {
            node = null;
            parentNode.removeChild (tmpNode);
          }
        }
        return;
        break;
      case "normal":
      case "reply":
      case "catalog":
      case "YY":
      case "MM":
      case "DD":
      case "DDD":
      case "hh":
      case "mm":
      case "ss":
      case "board":
      case "board2":
      case "board3":
      case "server":
      case "dir":
      case "page":
      case "thread":
      case "incomingreply":
      case "message":
      case "message2":
      case "message8byte":
      case "entiremessage":
      case "name":
      case "mail":
      case "subject":
      case "ip":
      case "id":
      case "viewer":
      case "expire":
      case "warning":
      case "old":
      case "online":
      case "mht":
      case "nijiura":
      case "futasuke":
        newNode
        = node.ownerDocument.createElementNS
        ("http://www.w3.org/1999/XSL/Transform", "if");
      node2 = node.firstChild;
      while (node2) {
        nextNode = node2.nextSibling;
        node.removeChild (node2);
        newNode.appendChild (node2);
        node2 = nextNode;
      }
      if (invert) {
        newNode.setAttribute
          ("test",
           "not (/info/check_" + nodeName + ")");
      }
      else {
        newNode.setAttribute ("test", "/info/check_" + nodeName);
      }
      node.parentNode.replaceChild (newNode, node);
      node = newNode;
      break;
    }
        
    node2 = node.firstChild;
    while (node2) {
      nextNode = node2.nextSibling;
      this.convertElement (node2);
      node2 = nextNode;
    }
  },
    
  /**
   * 拡張した XSLT2 疑似要素を変換する
   *
   * @param  XMLElement node
   *         変換する要素
   * @param  XMLDocument sourceDocument
   *         対象のドキュメント
   * @param  Array currentRegexGroup
   *         現在の正規表現による変数
   *           [Sring マッチした全体, String グループ1, String グループ2, ...]
   */
  convertExtraElement : function (node, sourceDocument, currentRegexGroup) {
    var node2, nextNode;
    var parentNode, nextSibling;
    var targetNode;
    var nodeName = node.nodeName;
    var nodeName2;
    var regex, regexGroup, flags;
    var parser
    = Components.classes ["@mozilla.org/xmlextras/domparser;1"]
    .createInstance (Components.interfaces.nsIDOMParser);
    var styleDocument;
    var regexDocument;
    var processor;
    var serializer;
    var generatedDocument;
    var generatedFragment;
    var i;
    var tmp;
        
    switch (nodeName) {
      case "x-analyze-string":
        flags = node.getAttribute ("flags");
        regex
          = new RegExp (node.getAttribute ("regex"),
                        flags ? flags : "");
        text
          = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
          + "<xsl:stylesheet "
          + "xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" "
          + "version=\"1.0\">"
          + "<xsl:template match=\"/\">"
          + "<result>"
          + "<xsl:value-of select=\""
          + node.getAttribute ("select") + "\" />"
          + "</result>"
          + "</xsl:template>"
          + "</xsl:stylesheet>";
        styleDocument = parser.parseFromString (text, "text/xml");
        
        if (currentRegexGroup) {
          text
            = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            + "<x>";
                
          for (var i = 0; i < currentRegexGroup.length; i ++) {
            tmp
              = arAkahukuConverter.escapeEntity
              (currentRegexGroup [i]);
                    
            if (i == 0) {
              text += "<regex-group0>" + tmp + "</regex-group0>";
            }
            else {
              text += "<regex-group>" + tmp + "</regex-group>";
            }
          }
                
          text += "</x>";
        }
        regexDocument = parser.parseFromString (text, "text/xml");
            
        processor = new XSLTProcessor ();
        processor.importStylesheet (styleDocument);
        sourceDocument.documentElement
          .appendChild (regexDocument.documentElement);
        generatedDocument
          = processor
          .transformToFragment (sourceDocument, node.ownerDocument);
        sourceDocument.documentElement
          .removeChild (sourceDocument.documentElement.lastChild);
            
        serializer = new XMLSerializer ();
        text = serializer.serializeToString (generatedDocument);
        text
          = text.replace (/<result ?\/?>/, "")
          .replace (/<\/result>/, "")
          .replace (/<\?xml.*\?>/, "");
            
        regexGroup = text.match (regex);
            
        targetNode = null;
            
        node2 = node.firstChild;
        while (node2) {
          nodeName2 = node2.nodeName.toLowerCase ();
          if (regexGroup && nodeName2 == "x-matching-substring") {
            targetNode = node2;
            break;
          }
          else if (!regexGroup
                   && nodeName2 == "x-non-matching-substring") {
            targetNode = node2;
            break;
          }
          node2 = node2.nextSibling;
        }
            
        nextSibling = node.nextSibling;
            
        if (targetNode) {
          text
            = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            + "<xsl:stylesheet "
            + "xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" "
            + "version=\"1.0\">"
            + "<xsl:template match=\"/\">"
            + "<result>"
            + "</result>"
            + "</xsl:template>"
            + "</xsl:stylesheet>";
          styleDocument = parser.parseFromString (text, "text/xml");
          node2 = targetNode.firstChild;
          while (node2) {
            nextNode = node2.nextSibling;
            styleDocument.documentElement.lastChild.lastChild
              .appendChild (node2);
            node2 = nextNode;
          }
          this.convertExtraElement (styleDocument, sourceDocument,
                                    regexGroup);
                
          if (regexGroup) {
            text
              = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
              + "<x>";
                    
            for (var i = 0; i < regexGroup.length; i ++) {
              tmp
                = arAkahukuConverter.escapeEntity
                (regexGroup [i]);
                        
              if (i == 0) {
                text
                  += "<regex-group0>"
                  + tmp + "</regex-group0>";
              }
              else {
                text
                  += "<regex-group>"
                  + tmp + "</regex-group>";
              }
            }
                    
            text += "</x>";
          }
          regexDocument = parser.parseFromString (text, "text/xml");
                
          processor = new XSLTProcessor ();
          processor.importStylesheet (styleDocument);
          sourceDocument.documentElement
            .appendChild (regexDocument.documentElement);
          generatedFragment
            = processor
            .transformToFragment (sourceDocument,
                                  node.ownerDocument);
          sourceDocument.documentElement
            .removeChild (sourceDocument.documentElement.lastChild);
                
          node2 = generatedFragment.firstChild.firstChild;
          while (node2) {
            nextNode = node2.nextSibling;
            node.parentNode.insertBefore (node2, node);
            node2 = nextNode;
          }
        }
            
        node.parentNode.removeChild (node);
            
        return nextSibling;
        break;
    }
        
    node2 = node.firstChild;
    while (node2) {
      node2
        = this.convertExtraElement (node2, sourceDocument,
                                    currentRegexGroup);
    }
        
    return node.nextSibling;
  },
    
  /**
   * ファイル名に使えない文字列を変換する
   *
   * @param  String filename
   *         変換するファイル名
   * @param  Boolean sep
   *         ディレクトリ名と分割して返すか
   * @return String/Array
   *         変換したファイル名
   */
  escapeForFilename : function (filename, sep) {
    var parts = filename.split (/<separator ?\/>/);
    filename = "";
    var dirname = new Array ();
    for (var i = 0; i < parts.length; i ++) {
      if (i == parts.length - 1) {
        dirname = filename;
        filename = "";
      }
      if (filename) {
        filename += arAkahukuFile.separator;
      }
      
      filename += arAkahukuFileName.escapeForFilename (parts [i]);
    }
        
    if (sep) {
      return [dirname, filename];
    }
        
    return filename;
  },
    
  /**
   * フォーマットを適用する
   *
   * @param  String formatString
   *         フォーマット文字列
   * @param  String url
   *         URL
   * @return String
   *         フォーマットを適用した文字列
   */
  format : function (formatString) {
    var info = this;
    var text = formatString;
    var parser;
    var styleDocument;
    var sourceDocument;
    var processor;
    var generatedDocument;
    var serializer;
        
    text = text.replace (/[\r\n]/g, "");
    text
    = text.replace (/&([^;]+);/g,
                    function (matched, part1) {
                      if (part1 == "amp"
                          || part1 == "lt"
                          || part1 == "gt") {
                        return matched;
                      }
                      else if (part1 == "separator") {
                        return "<separator />";
                      }
                      else if (part1 == "url") {
                        return "<url />";
                      }
                      else {
                        return "<xsl:value-of select=\"/info/"
                          + part1 + "\" />";
                      }
                    });
        
    text
    = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
    + "<xsl:stylesheet "
    + "xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" "
    + "version=\"1.0\">"
    + "<xsl:template match=\"/\">"
    + "<result>"
    + text
    + "</result>"
    + "</xsl:template>"
    + "</xsl:stylesheet>";
    
    parser
    = Components.classes ["@mozilla.org/xmlextras/domparser;1"]
    .createInstance (Components.interfaces.nsIDOMParser);
        
    try {
      styleDocument = parser.parseFromString (text, "text/xml");
            
      if (styleDocument.documentElement.nodeName.toLowerCase ()
          == "parsererror") {
        text = "error";
      }
      else {
        this.convertElement (styleDocument);
                
        text
          = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
          + "<info>"
          + "<YY>" + this.year + "</YY>"
          + "<MM>" + this.month + "</MM>"
          + "<DD>" + this.day + "</DD>"
          + "<DDD>" + this.week + "</DDD>"
          + "<hh>" + this.hour + "</hh>"
          + "<mm>" + this.min + "</mm>"
          + "<ss>" + this.sec + "</ss>"
          + "<board>" + this.board + "</board>"
          + "<board2>" + this.board2 + "</board2>"
          + "<board3>" + this.board3 + "</board3>"
          + "<server>" + this.server + "</server>"
          + "<dir>" + this.dir + "</dir>"
          + "<page>" + this.normalPageNumber + "</page>"
          + "<thread>" + this.threadNumber + "</thread>"
          + "<replycount>" + this.replyCount + "</replycount>"
          + "<incomingreply>" + this.incomingReply + "</incomingreply>"
          + "<message>" + this.message + "</message>"
          + "<message2>" + this.message2 + "</message2>"
          + "<message8byte>" + this.message8byte + "</message8byte>"
          + "<entiremessage>"
          + this.entiremessage + "</entiremessage>"
          + "<name>"
          + this.name + "</name>"
          + "<mail>"
          + arAkahukuConverter.escapeEntity (this.mail) + "</mail>"
          + "<subject>"
          + this.subject + "</subject>"
          + "<ip>"
          + arAkahukuConverter.escapeEntity (this.ip) + "</ip>"
          + "<id>"
          + arAkahukuConverter.escapeEntity (this.id) + "</id>"
          + "<viewer>" + this.viewer + "</viewer>"
          + "<expire>" + this.expire + "</expire>"
          + "<warning>" + this.expireWarning + "</warning>"
          
          + "<space> </space>"
          
          + (this.year ? "<check_YY />" : "") 
          + (this.month ? "<check_MM />" : "") 
          + (this.day ? "<check_DD />" : "") 
          + (this.week ? "<check_DDD />" : "") 
          + (this.hour ? "<check_hh />" : "") 
          + (this.min ? "<check_mm />" : "") 
          + (this.sec ? "<check_ss />" : "") 
          + (this.board ? "<check_board />" : "") 
          + (this.board2 ? "<check_board2 />" : "") 
          + (this.board3 ? "<check_board3 />" : "") 
          + (this.server ? "<check_server />" : "") 
          + (this.dir ? "<check_dir />" : "") 
          + (this.normalPageNumber ? "<check_page />" : "") 
          + (this.threadNumber ? "<check_thread />" : "") 
          + (this.replyCount ? "<check_replycount />" : "") 
          + (this.incomingReply > 0 ? "<check_incomingreply />" : "")
          + (this.message ? "<check_message />" : "") 
          + (this.message2 ? "<check_message2 />" : "") 
          + (this.message8byte ? "<check_message8byte />" : "") 
          + (this.entiremessage ? "<check_entiremessage />" : "") 
          + (this.name ? "<check_name />" : "")
          + (this.mail ? "<check_mail />" : "")
          + (this.subject ? "<check_subject />" : "")
          + (this.ip ? "<check_ip />" : "")
          + (this.id ? "<check_id />" : "")
          + (this.viewer&&!isNaN(this.viewer) ? "<check_viewer />" : "") 
          + (this.expire ? "<check_expire />" : "") 
          + (this.expireWarning ? "<check_warning />" : "") 
          
          + "<check_amp />" 
          + "<check_lt />" 
          + "<check_gt />" 
                    
          + (this.isNormal ? "<check_normal />" : "") 
          + (this.isReply ? "<check_reply />" : "") 
          + (this.isCatalog ? "<check_catalog />" : "") 
          + (this.isOld ? "<check_old />" : "") 
          + (this.isOnline ? "<check_online />" : "") 
          + (this.isMht ? "<check_mht />" : "") 
          + (this.isNijiura ? "<check_nijiura />" : "") 
          + (this.isFutasuke ? "<check_futasuke />" : "") 
          + "</info>";
                
        sourceDocument = parser.parseFromString (text, "text/xml");
                
        this.convertExtraElement (styleDocument, sourceDocument, null);
                
        processor = new XSLTProcessor ();
        processor.importStylesheet (styleDocument);
                
        generatedDocument
          = processor.transformToDocument (sourceDocument);
                
        serializer = new XMLSerializer ();
        text = serializer.serializeToString (generatedDocument);
        text
          = text.replace (/<result ?\/?>/, "")
          .replace (/<\/result>/, "")
          .replace (/<\?xml.*\?>/, "");
      }
    }
    catch (e) {
      text =  "error:" + e;
    }
        
    return text;
  },

  /**
   * 情報の更新を通知する
   *
   * @param  String formatString
   *         フォーマット文字列
   */
  notifyUpdate : function (text)
  {
    if (!text) {
      text = null;
    }
    var observerService
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);  
    var subject
      = Components.classes ["@mozilla.org/supports-string;1"]
      .createInstance (Components.interfaces.nsISupportsString);  
    subject.data = arAkahukuJSON.encode (this);
    observerService.notifyObservers
      (subject, "arakahuku-location-info-changed", text);
  },
};

function arAkahukuImageURLInfo () {
}
arAkahukuImageURLInfo.prototype = {
  isIp : false,
  isAd : false,
  scheme : "",
};
var arAkahukuImageURL = {
  /**
   * ImageURL の情報を返す
   *
   * @param  String url
   *         対象の URL
   * @param  Boolean tubu
   *         塩粒も対象にするか
   * @param  Boolean aboutCachex
   *         キャッシュを対象とした取得かどうか
   * @return arAkahukuImageURLInfo
   *         URL の情報
   *         対象外なら null
   */
  parse : function (url, tubu, aboutCache) {
    var uinfo = null;
    var akahukuParam = null;
    
    if (Akahuku.protocolHandler.isAkahukuURI (url)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (url);
            
      akahukuParam = p;
      url = p.original;
    }
    
    if (url.match (/^https?:\/\/([^\/]+\/)?([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|www|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(cat|thumb|src|red|d)\/([A-Za-z0-9]+)\.(jpg|png|gif|htm|webm|mp4)(\?.*)?$/)) {
      uinfo = new arAkahukuImageURLInfo ();
      
      uinfo.prefix = RegExp.$1;
      uinfo.server = RegExp.$2;
      uinfo.port = RegExp.$3;
      var sdir = RegExp.$4;
      uinfo.dir = RegExp.$5;
      uinfo.type = RegExp.$6;
      uinfo.leafName = RegExp.$7;
      uinfo.ext = RegExp.$8;
            
      uinfo.leafNameExt = uinfo.leafName + "." + uinfo.ext;
      uinfo.board = uinfo.server + "_" + uinfo.dir;
            
      if (sdir) {
        sdir = sdir.replace (/\//, "");
        if (aboutCache && arAkahukuP2P.enableTreatAsSame) {
          uinfo.server = sdir;
        }
        else {
          uinfo.dir = sdir + "-" + uinfo.dir;
          uinfo.board = sdir + "_" + uinfo.dir;
        }
                    
      }
            
      if (uinfo.type.match (/(cat|thumb|src)/)) {
        uinfo.isImage = true;
        if (/^(webm|mp4)$/i.test (uinfo.ext)) {
          uinfo.isImage = false;
          uinfo.isVideo = true;
        }
      }
      if (uinfo.type.match (/(red|d)/)) {
        uinfo.isRedirect = true;
      }
            
      if (akahukuParam) {
        uinfo.isAkahuku = true;
        uinfo.akahukuParam = akahukuParam;
      }
      
      if (url.match (/^https?:\/\/[a-z]+.2chan.net(:[0-9]+)?\/ad\//)
          || url.match (/^https?:\/\/[a-z]+.2chan.net(:[0-9]+)?\/dec\/ad\//)) {
        /* 広告バナー */
        uinfo.isAd = true;
      }
    }
    else if (tubu
             && url.match
             (/^http:\/\/www\.(nijibox)5\.com\/futabafiles\/(tubu)\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
      uinfo = new arAkahukuImageURLInfo ();
            
      uinfo.server = RegExp.$1;
      uinfo.dir = RegExp.$2;
      uinfo.type = RegExp.$3;
      uinfo.leafName = RegExp.$4;
      uinfo.ext = RegExp.$5;
            
      uinfo.leafNameExt = uinfo.leafName + "." + uinfo.ext;
      uinfo.board = uinfo.server + "_" + uinfo.dir;
            
      uinfo.isImage = true;
    }
    else if (url.match (/^https?:\/\/([^\/]+\/)?([^\.\/]+)\.2chan\.net(:[0-9]+)?\/([^\/]+)\//)) {
      uinfo = new arAkahukuImageURLInfo ();
            
      uinfo.prefix = RegExp.$1;
      uinfo.server = RegExp.$2;
      uinfo.port = RegExp.$3;
      uinfo.dir = RegExp.$4;
            
      uinfo.board = uinfo.server + "_" + uinfo.dir;
      
      if (url.match (/^https?:\/\/[a-z]+.2chan.net(:[0-9]+)?\/ad\//)
          || url.match (/^https?:\/\/[a-z]+.2chan.net(:[0-9]+)?\/dec\/ad\//)) {
        /* 広告バナー */
        uinfo.isAd = true;
      }
    }
    else if (url.match (/^https?:\/\/([0-9.]+)(:[0-9]+)?\/(apr|jan|feb|tmp|up|www|img|cgi|zip|dat|may|nov|jun|dec)\/([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+)\.(jpg|png|gif|webm|mp4)(\?.*)?$/)) {
      /* IP アドレスで画像鯖らしき場所が指定された場合 */
      uinfo = new arAkahukuImageURLInfo ();
            
      uinfo.server = RegExp.$1;
      uinfo.port = RegExp.$2;
      var sdir = RegExp.$3;
      uinfo.dir = RegExp.$4;
      uinfo.type = RegExp.$5;
      uinfo.leafName = RegExp.$6;
      uinfo.ext = RegExp.$7;
            
      uinfo.leafNameExt = uinfo.leafName + "." + uinfo.ext;
      uinfo.board = uinfo.server + "_" + uinfo.dir;
            
      if (aboutCache && arAkahukuP2P.enableTreatAsSame) {
        uinfo.server = sdir;
      }
      else {
        uinfo.dir = sdir + "-" + uinfo.dir;
        uinfo.board = sdir + "_" + uinfo.dir;
      }
            
      uinfo.isImage = true;
      if (/^(webm|mp4)$/i.test (uinfo.ext)) {
        uinfo.isImage = false;
        uinfo.isVideo = true;
      }
      uinfo.isIp = true;
      
      if (akahukuParam) {
        uinfo.isAkahuku = true;
        uinfo.akahukuParam = akahukuParam;
      }
      
      if (sdir == "dec" && uinfo.dir == "ad") {
        /* 広告バナー */
        uinfo.isAd = true;
      }
    }

    if (uinfo && url.match (/^([^:]+):/)) {
      uinfo.scheme = RegExp.$1;
    }
        
    return uinfo;
  }
};
