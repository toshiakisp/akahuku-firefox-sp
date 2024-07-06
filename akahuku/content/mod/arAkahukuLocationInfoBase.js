
/**
 * アドレス、スレの情報 (基底)
 */
function arAkahukuLocationInfoBase () {
}
arAkahukuLocationInfoBase.prototype = {
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
  isSearchResponse : false,     /* Boolean  検索モードかどうか */
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
  isMaxRes : false,             /* Boolean  レス上限に達しているか */
  maxresWarning : "",           /* String  上限レス情報 */
    
  year : "",                    /* String  スレ立ての年 */
  month : "",                   /* String  スレ立ての月 */
  day : "",                     /* String  スレ立ての日 */
  week : "",                    /* String  スレ立ての曜日 */
  hour : "",                    /* String  スレ立ての時 */
  min : "",                     /* String  スレ立ての分 */
  sec : "",                     /* String  スレ立ての秒 */
    

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
      case "maxres":
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
    var parser = new DOMParser();
    var styleDocument;
    var regexDocument;
    var processor;
    var serializer;
    var generatedDocument;
    var generatedFragment;
    var i;
    var tmp;
    var text;
        
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
    for (var i = 0; i < parts.length; i ++) {
      if (!sep && i < parts.length - 1) {
        continue;
      }
      parts [i] = arAkahukuFileName.escapeForFilename (parts [i]);
    }
    filename = (parts.length > 0 ? parts [parts.length-1] : "");
        
    if (sep) {
      var dirname = "";
      parts.pop (); // drop filename
      if (parts.length > 0) {
        dirname = AkahukuFileUtil.Path.join.apply (null, parts);
      }
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
    
    parser = new DOMParser();
        
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
          + "<maxres>" + this.maxresWarning + "</maxres>"
          
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
          + (this.isMaxRes ? "<check_maxres />" : "")
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

};

