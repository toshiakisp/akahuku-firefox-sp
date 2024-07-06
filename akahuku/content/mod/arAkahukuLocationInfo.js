/* global arAkahukuLocationInfoBase */

/**
 * アドレス、スレの情報 (拡張)
 * 
 * @param  HTMLDocument targetDocument
 *         対象のドキュメント
 *           null の時は初期化しない
 * @param  Boolean instant
 *         コンテキストメニューからの適用か
 */
function arAkahukuLocationInfo (targetDocument, instant) {
  // prototype chaining at the first constructor call
  if (Object.getPrototypeOf(arAkahukuLocationInfo.prototype) != arAkahukuLocationInfoBase.prototype) {
    Object.setPrototypeOf(arAkahukuLocationInfo.prototype, arAkahukuLocationInfoBase.prototype);
  }
  arAkahukuLocationInfoBase.call(this);
  if (targetDocument) {
    this.init (targetDocument, instant);
  }
}
arAkahukuLocationInfo.prototype = {
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
            
      if (this.server == "jun" && sdir == "jun/") {
        // Special case: jun.2chan.net/jun/futaba.htm
        path = this.dir + "/" + path;
        this.dir = "jun";
        sdir = "";
      }
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
             (/^https?:\/\/appsweets\.net\/tatelog\/(dat|img)\/thread\/([0-9]+)$/)) {
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
             (/^https?:\/\/appsweets\.net\/catalog\/dat\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      this.server = "dat";
      this.dir = "b";
      this.isTatelog = true;
      path = RegExp.$1;
      this.isFutaba = true;
    }
    else if (location.match
             (/^https?:\/\/www\.nijibox4\.com\/akahuku\/catalog\/dat\/(view\.php\?mode=cat2?)/)) {
      /* dat のタテログ */
      this.server = "dat";
      this.dir = "b";
      this.isTatelog = true;
      path = RegExp.$1;
      this.isFutaba = true;
    }
    else if (location.match
             (/^https?:\/\/www\.nijibox\.com\/futaba\/catalog\/img\/(view\.php\?mode=cat2?)/)) {
      /* img のタテログ */
      this.server = "img";
      this.dir = "b";
      this.isTatelog = true;
      path = RegExp.$1;
      this.isFutaba = true;
    }
    else if (location.match
             (/^https?:\/\/(?:[^\.\/]+\.)?(tsumanne)\.net\/([a-z]+)\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/)) {
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
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].nodeName.toLowerCase () !== "a") {
          continue;
        }
        let url = null;
        try {
          url = new URL(nodes[i].href);
        }
        catch (e) { Akahuku.debug.exception (e);
          continue;
        }
        if (url.href.match (/^(?:https?):\/\/([^\/]+\/)?([^\.\/]+)\.2chan\.net(:[0-9]+)?\/((?:apr|jan|feb|tmp|up|www|img|cgi|zip|dat|may|nov|jun|dec)\/)?([^\/]+)\/(.*)$/)) {
          this.isFutasuke = false;
          this.server = RegExp.$2;
          /* RegExp.$3: ポート番号 */
          var sdir = RegExp.$4;
          this.dir = RegExp.$5;
                    
          if (sdir) {
            sdir = sdir.replace (/\//, "");
            this._targetFileDir = sdir + "-" + this.dir;
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
        
    if (this.dir == "b"
      || (this.server == "jun" && this.dir == "jun")) {
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
          /^https?:\/\/(tsumanne)\.net\/([a-z]+)\/data\/[0-9]+\/[0-9]+\/[0-9]+\/[0-9]+\/$/
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
    else if (this.isFutaba && path.match(/futaba\.php\?guid=on$/)) {
      if (targetDocument.getElementById("searchResult")) {
        // 全文検索
        this.isSearchResponse = true;

        this.mode = "\u691C\u7D22"; // "検索"
        nodes = targetDocument.getElementsByTagName("h4");
        if (nodes && nodes[0]
          && nodes[0].textContent.match(/^[^[]*\[([^\]]+)\][^\]]*$/)) {
          this.mode += " " + RegExp.$1;
        }
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
        var nodeName = node ? node.nodeName.toLowerCase () : "";
                
        var text = "";
        while (node
               && nodeName != "hr"
               && nodeName != "input") {
          if (nodeName == "a"
              || nodeName == "font"
              || nodeName == "span") {
            text = arAkahukuDOM.getInnerText (node) + text;
          }
          else if (nodeName == "#text") {
            text = node.nodeValue + text;
          }
                    
          node = node.previousSibling;
          nodeName = node ? node.nodeName.toLowerCase () : "";
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
            if (className && Object.prototype.hasOwnProperty.call (propMap, className)) {
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
    var subject = {};
    subject.data = JSON.stringify (this);
    ObserverService.notifyObservers
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
             (/^https?:\/\/www\.(nijibox)5\.com\/futabafiles\/(tubu)\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
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
