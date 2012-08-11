/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter, arAkahukuDOM,
 *          arAkahukuHistory, arAkahukuImage, arAkahukuP2P
 */

/**
 * リンク変換器
 *
 * @param  RegExp pattern
 *         マッチするパターン
 * @param  Function prefix
 *         プレフィックス取得関数
 * @param  Function createReplacement
 *         変換関数
 */
function arAkahukuMatchPattern (pattern, prefix, createReplacement) {
  this.pattern = pattern;
  this.prefix = prefix;
  this.createReplacement = createReplacement;
}
arAkahukuMatchPattern.prototype = {
  pattern : null,        /* RegExp  マッチするパターン */
    
  /**
   * 変換関数
   *   arAkahukuMatchPattern.createReplacement
   *
   * @param  Object or Number parens
   *         マッチングオブジェクトかマッチする位置
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  createReplacement : null,
    
  /**
   * 最初にマッチする位置を更新する
   *
   * @param  String text
   *         対象の文字列
   * @param  Object result
   *         結果
   */
  updateMatchedPosition : function (text, result) {
    var parens = text.match (this.pattern);
        
    if (parens) {
      result.position = parens.index;
      result.length = parens [0].length;
      result.parens = parens;
      
      result.position += this.prefix (parens);
      result.length -= this.prefix (parens);
    }
    else {
      result.position = -1;
      result.length = -1;
      result.parens = null;
    }
  }
};
/**
 * ユーザ指定リンク変換器
 *   Inherits From: arAkahukuMatchPattern
 *
 * @param  String pattern
 *         マッチするパターン
 * @param  Boolean isRegExp
 *         正規表現フラグ
 * @param  String url
 *         リンク先の URL
 */
function arAkahukuUserMatchPattern (pattern, isRegExp, url) {
  this.isRegExp = isRegExp;
  if (this.isRegExp) {
    this.pattern = new RegExp (pattern);
  }
  else {
    this.pattern = pattern;
  }
  this.url = url;
}
arAkahukuUserMatchPattern.prototype = {
  pattern : null,        /* RegExp or String  マッチするパターン */
  isRegExp : false,      /* Boolean  pattern が RegExp かどうか */
  url : "",              /* String  リンク先の URL */
    
  /**
   * 変換関数
   *   arAkahukuMatchPattern.createReplacement
   *
   * @param  Text targetNode
   *         対象の文字列を含むノード (切り離されている)
   * @param  Text nextNode
   *         次のノード
   * @param  Object or Number parens
   *         マッチングオブジェクトかマッチする位置
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  createReplacement : function (targetNode, nextNode,
                                parens, targetDocument) {
    var m;
    var matched = "";
    var url = "";
        
    url = this.url;
    if (this.isRegExp) {
      matched = parens [0];
            
      url = 
        url.replace (/\$([0-9]+|\$)/g,
                     function (matched, part1) {
                       if (part1 == "$") {
                         return "$";
                       }
                       else {
                         var n = parseInt (part1);
                         if (n < parens.length) {
                           var dest = parens [n];
                           if (dest === undefined) {
                             dest = "undefined";
                           }
                           dest
                             = dest
                             .replace (/<[^>]*>/g, "")
                             .replace (/\"/g, "&quot;")
                             .replace (/\'/g, "&#x27;")
                             return dest;
                         }
                         return "";
                       }
                     });
    }
    else {
      matched = this.pattern;
    }
        
    var anchor = targetDocument.createElement ("a");
    url = arAkahukuP2P.tryEnP2P (url);
    anchor.setAttribute ("dummyhref", url);
    anchor.className = "akahuku_generated_link";
    arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
    arAkahukuLink.updateAutoLinkVisitedCore (anchor);
    anchor.appendChild (targetNode);
    nextNode.parentNode.insertBefore (anchor, nextNode);
    var button = arAkahukuLink.createPreviewButton (targetDocument,
                                                    url, anchor);
    if (button) {
      nextNode.parentNode.insertBefore (button [0], nextNode);
      if (button [1]) {
        button [1] ();
      }
    }
    
    return true;
  },
    
  /**
   * 最初にマッチする位置を更新する
   *   arAkahukuMatchPattern.updateMatchedPosition
   *
   * @param  String text
   *         対象の文字列
   * @param  Object result
   *         結果
   */
  updateMatchedPosition : function (text, result) {
    if (this.isRegExp) {
      var parens = text.match (this.pattern);
            
      if (parens) {
        result.position = parens.index;
        result.length = parens [0].length;
        result.parens = parens;
      }
      else {
        result.position = -1;
        result.length = -1;
        result.parens = null;
      }
    }
    else {
      var position = text.indexOf (this.pattern);
            
      if (position != -1) {
        result.position = position;
        result.length = this.pattern.length;
        result.parens = null;
      }
      else {
        result.position = -1;
        result.length = -1;
        result.parens = null;
      }
    }
  }
};
/**
 * リンク適用の結果
 *
 * @param  Boolean updated
 *         変更しかたどうか
 * @param  String result
 *         結果の文字列
 */
function arAkahukuLinkifyResult (updated, result) {
  this.updated = updated;
  this.result = result;
}
arAkahukuLinkifyResult.prototype = {
  updated : false, /* Boolean  変更しかたどうか */
  result : ""      /* String  結果の文字列 */
};
/**
 * 拡張子自動認識のリスナ
 *   Inherits From: nsIInterfaceRequestor, nsIHttpEventSink,
 *                  nsIStreamListener, nsIRequestObserver
 */
function arAkahukuLinkExtListener () {
}
arAkahukuLinkExtListener.prototype = {
  targetDocument : null, /* HTMLDocument  対象のドキュメント */
  targetNode : null,     /* HTMLElement  対象のノード */
  extNode : null,        /* HTMLElement  拡張子のノード */
  content : "" ,         /* String  ファイルのデータ */

  // nsILoadContext
  associatedWindow : null,
  isContent : false,
  topWindow : null,
  isAppOfType : function (appType) {
    // docShell ではないのでこの程度でいい？
    return (appType ===
        Components.interfaces.nsIDocShell.APP_TYPE_UNKNOWN);
  },

  // 初期化用関数
  init : function (targetDocument, targetNode, extNode) {
    if (!targetDocument || !targetNode) {
      throw Components.results.NS_ERROR_ILLEGAL_VALUE;
    }
    this.targetDocument = targetDocument;
    this.targetNode = targetNode;
    this.extNode = extNode; // may be null

    if (targetDocument.defaultView
        instanceof Components.interfaces.nsIDOMWindow) {
      this.associatedWindow = targetDocument.defaultView;
      this.topWindow = this.associatedWindow.top;
    }
    this.isContent = !(this.associatedWindow 
        instanceof Components.interfaces.nsIDOMXULElement);
  },
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsIInterfaceRequestor)
        || iid.equals (Components.interfaces.nsIHttpEventSink)
        || iid.equals (Components.interfaces.nsIStreamListener)
        || iid.equals (Components.interfaces.nsILoadContext) // for webconsole
        || iid.equals (Components.interfaces.nsIRequestObserver)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },
    
  /**
   * インターフェースの取得
   *   nsIInterfaceRequestor.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  getInterface : function (iid) {
    return this.QueryInterface (iid);
  },
    
  /**
   * リダイレクトのイベント
   *   nsIHttpEventSink.onRedirect
   *
   * @param  nsIHttpChannel httpChannel
   *         現在のリクエスト
   * @param  nsIChannel newChannel
   *         新しいリクエスト
   */
  onRedirect : function (httpChannel, newChannel) {
    try {
      if (newChannel.URI.spec.match (/s[usapq][0-9]+\.([_a-zA-Z0-9]+)/)) {
        var ext = RegExp.$1;
        arAkahukuLink.setExt2 (ext,
                               this.targetDocument, this.targetNode,
                               this.extNode);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    newChannel.cancel (Components.results.NS_BINDING_ABORTED || 0x80020006);
  },

  /**
   * リクエスト開始のイベント
   *   nsIRequestObserver.onStartRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   */
  onStartRequest : function (request, context) {
    this.content = "";
  },
    
  /**
   * リクエスト終了のイベント
   *   nsIRequestObserver.onStopRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  Number statusCode
   *         終了コード
   */
  onStopRequest : function (request, context, statusCode) {
    var ext = "";
    if (this.content.match (/^\x89PNG/)) {
      ext = "png";
    }
    if (this.content.match
        (/<a href=\".*s[usapq][0-9]+\.([_a-zA-Z0-9]+)\"/)) {
      ext = RegExp.$1;
    }
    else if (this.content.match
             (/value=\"s[usapq][0-9]+\.([_a-zA-Z0-9]+)\"/)) {
      ext = RegExp.$1;
    }
        
    if (ext) {
      try {
        arAkahukuLink.setExt2 (ext,
                               this.targetDocument, this.targetNode,
                               this.extNode);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    this.content = "";
    this.channel = null;
    this.targetDocument = null;
    this.targetNode = null;
    this.extNode = null;
  },
    
  /**
   * データ到着のイベント
   *   nsIStreamListener.onDataAvailable
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  nsIInputStream inputStream
   *         データを取得するストリーム
   * @param  PRUint32 offset
   *         データの位置
   * @param  PRUint32 count 
   *         データの長さ
   */
  onDataAvailable : function (request, context, inputStream, offset, count) {
    var bstream
    = Components.classes ["@mozilla.org/binaryinputstream;1"]
    .createInstance (Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream (inputStream);
        
    this.content += bstream.readBytes (count);
  }
};
/**
 * リモートファイル読み込み
 * とりあえず作っておく
 *   Inherits From: nsIInterfaceRequestor
 *                  nsIStreamListener, nsIRequestObserver
 */
function arAkahukuLinkLoader () {
}
arAkahukuLinkLoader.prototype = {
  content : "" ,         /* String  ファイルのデータ */
  callback : null,       /* Function  コールバック関数 */
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsIInterfaceRequestor)
        || iid.equals (Components.interfaces.nsIStreamListener)
        || iid.equals (Components.interfaces.nsIRequestObserver)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },
    
  /**
   * インターフェースの取得
   *   nsIInterfaceRequestor.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  getInterface : function (iid) {
    return this.QueryInterface (iid);
  },
    
  /**
   * リクエスト開始のイベント
   *   nsIRequestObserver.onStartRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   */
  onStartRequest : function (request, context) {
    this.content = "";
  },
    
  /**
   * リクエスト終了のイベント
   *   nsIRequestObserver.onStopRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  Number statusCode
   *         終了コード
   */
  onStopRequest : function (request, context, statusCode) {
    this.callback (this);
        
    this.content = "";
    this.callback = null;
  },
    
  /**
   * データ到着のイベント
   *   nsIStreamListener.onDataAvailable
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  nsIInputStream inputStream
   *         データを取得するストリーム
   * @param  PRUint32 offset
   *         データの位置
   * @param  PRUint32 count 
   *         データの長さ
   */
  onDataAvailable : function (request, context, inputStream, offset, count) {
    var bstream
    = Components.classes ["@mozilla.org/binaryinputstream;1"]
    .createInstance (Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream (inputStream);
        
    this.content += bstream.readBytes (count);
  }
};
/**
 * リンク管理
 *   [オートリンク]、[芝刈り]、[P2P]
 *   Inherits From: nsINavHistoryObserver
 */
var arAkahukuLink = {
  targetLinks : null,              /* Object  チェックするリンク */
  lastCleanuped : 0,               /* Number  targetLinks の
                                    *   最終クリーンアップ時刻 [ms] */
  
  enableHideTrolls : false,        /* Boolean  芝刈り */
  hideTrollsMode : "",             /* String  方法
                                    *   "normal": ......
                                    *   "hide":   隠す
                                    *   "user":   ユーザ指定 */
  hideTrollsUser : "",             /* String  ユーザ指定 */
  hideTrollsUserList : null,       /* Array ユーザ指定 */
  enableHideTrollsRed : false,     /* Boolean  色を変える */
  hideTrollsRedColor : "red",      /* String  色 通常 */
  hideTrollsRedColorQuote : "red", /* String  色 引用 */
  enableHideTrollsRandom : false,  /* Boolean  ランダムで切り替える */
  enableHideTrollsNoCat : false,   /* Boolean  カタログでは刈らない */
    
  enableSubjectName : false,       /* Boolean  題名と名前も対象にする */
  
  enableShowMail : false,          /* Boolean  メール欄表示 */
  enableShowMailPopup : false,     /* Boolean  メール欄ポップアップ */
    
  enableAutoLink : false,             /* Boolean  オートリンク */
  enableAutoLinkFocus : false,        /* Boolean  開いたタブを選択する */
  enableAutoLinkUser : false,         /* Boolean  ユーザ指定文字列 */
  enableAutoLinkAs : false,           /* Boolean  板以外で選択範囲を
                                       *   オートリンクとして開く */
  enableAutoLinkPreview : false,      /* Boolean  プレビュー */
  enableAutoLinkPreviewMulti : false, /* Boolean  複数表示する */
  autoLinkPreviewSWFWidth : 320,      /* Boolean  swf の幅 */
  autoLinkPreviewSWFHeight : 240,     /* Boolean  swf の高さ */
  
  enableAutoLinkPreviewAutoOpen : false, /* Boolean  P2P のキャッシュに
                                          *   ある場合自動で開く */
  enableAutoLinkPreviewAutoOpenNoQuote : false, /* Boolean  引用では開かない */
    
  normalPatterns : null,         /* Array  リンク変換器
                                  * [arAkahukuMatchPattern, ...] */
  mailPatterns : null,         /* Array  リンク変換器
                                * [arAkahukuMatchPattern, ...] */
  trollsPatterns : null,         /* Array  リンク変換器
                                  * [arAkahukuMatchPattern, ...] */
  userPatterns : null,         /* Array  リンク変換器
                                * [arAkahukuMatchPattern, ...] */
    
  wikipediaPattern : null, /* arAkahukuMatchPattern  Wikipedia のリンク変換器 */
  urlPattern : null,       /* arAkahukuMatchPattern  URL のリンク変換器 */
  upPattern : null,        /* arAkahukuMatchPattern  あぷのリンク変換器 */
  up2Pattern : null,       /* arAkahukuMatchPattern  あぷ小のリンク変換器 */
  sioPattern : null,       /* arAkahukuMatchPattern  塩辛瓶のリンク変換器 */
  futalogPattern : null,   /* arAkahukuMatchPattern  ふたログのリンク変換器 */
  trollsPattern : null,    /* arAkahukuMatchPattern  芝刈り機のリンク変換器 */
  P2PPattern : null,       /* arAkahukuMatchPattern  P2Pノード名のリンク変換器 */
    
  mouseOutTimeoutId : null,  /* Number マウスアウトでステータスを消すタイマーID */
    
  /**
   * 初期化処理
   */
  init : function () {
    this.targetLinks = new Object ();
    
    var historyService
    = Components.classes ["@mozilla.org/browser/nav-history-service;1"]
    .getService (Components.interfaces.nsINavHistoryService);
    historyService.addObserver (arAkahukuLink, false);
    
    /* オートリンク用に中ボタンクリックのイベントを監視 */
    window.addEventListener
    ("click",
     function () {
      arAkahukuLink.onAutolinkClick (arguments [0]);
    }, true);
    window.addEventListener
    ("mousedown",
     function () {
      arAkahukuLink.onAutolinkMouseDown (arguments [0]);
    }, true);
        
    arAkahukuLink.initPatterns ();
  },
    
  /**
   * 終了処理
   */
  term : function () {
    var historyService
    = Components.classes ["@mozilla.org/browser/nav-history-service;1"]
    .getService (Components.interfaces.nsINavHistoryService);
    historyService.removeObserver (arAkahukuLink);
    clearTimeout (arAkahukuLink.mouseOutTimeoutId);
    arAkahukuLink.mouseOutTimeoutId = null;
  },
  
  /**
   * パターン初期化
   */
  initPatterns : function () {
    function _getAttachmentOnTsumanne (targetDocument, name) {
      var attachment = targetDocument.getElementById ("attachment");
      if (attachment) {
        var nodes = attachment.getElementsByTagName ("a");
        for (var i = 0; i < nodes.length; i ++) {
          var href = nodes [i].getAttribute ("href");
          if (href === name) {
            return targetDocument.location + name;
          }
        }
      }
      return null;
    }

    arAkahukuLink.wikipediaPattern
    = new arAkahukuMatchPattern
    (/(http:\/\/[^.]+\.wikipedia.org\/wiki\/)([^<>]*)/,
     /* $1: Wikipedia のアドレス
      * $2: クエリ文字列 */
     function (parens) {
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var url, query;
      url = parens [1];
      query = parens [2];
            
      if (query.match (/[\u0100-\uffff]/)) {
        /* マルチバイト文字が含まれている */
        query = encodeURIComponent (query);
      }
      url += query;
            
      var anchor = targetDocument.createElement ("a");
      anchor.setAttribute ("dummyhref", url);
      anchor.className = "akahuku_generated_link";
      arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
      arAkahukuLink.updateAutoLinkVisitedCore (anchor);
      anchor.appendChild (targetDocument.createTextNode
                          (parens [1]));
             
      query = parens [2];
      if (query.indexOf ("%") >= 0) {
        var query2 = query;
        try {
          query2 = decodeURIComponent (query);
                     
          if (query2.match
              (/^([^#]+)#((\.[0-9A-Fa-f][0-9A-Fa-f])+)(.*)$/)) {
            query2 = RegExp.$1
              var query3 = RegExp.$2;
            var query4 = RegExp.$4;
                         
            query3
              = decodeURIComponent (query3.replace (/\./g, "%"));
                         
            query2 = query2 + "#" + query3 + query4;
          }
        }
        catch (e) { Akahuku.debug.exception (e);
        }
                 
        var font = targetDocument.createElement ("font");
        font.className = "akahuku_generated_link_child";
        font.setAttribute ("__akahuku_link_tmp",
                           btoa (escape (query)));
        font.appendChild (targetDocument.createTextNode
                          (query2));
        anchor.appendChild (font);
      }
      else {
        anchor.appendChild (targetDocument.createTextNode
                            (query));
      }
             
      nextNode.parentNode.insertBefore (anchor, nextNode);
      var button
      = arAkahukuLink.createPreviewButton (targetDocument,
                                           url, anchor);
      if (button) {
        nextNode.parentNode.insertBefore (button [0], nextNode);
        if (button [1]) {
          button [1] ();
        }
      }
      return true;
    });
        
    arAkahukuLink.urlPattern
    = new arAkahukuMatchPattern
    (/(file|ftp|mms|rtsp|akahuku|h?t?t?p?s?)(:\/\/([^ \u0000-\u002C\u003A-\u0060\u3000-\u3004\uFF01-\uFFBE\xa0\/]+\/[\!#$%&|\'\(\)\*\+,\-\.\/0-9:;=\?@[\]A-Z\\_a-z~\uFF5E\u2329]*|[\!#$%&|\'\(\)\*\+,\-\.\/0-9:;=\?@[\]A-Z\\_a-z~\uFF5E\u2329]+))/,
     /* $1: http 等のプロトコル
      * $2: 残りの URL */
     function (parens) {
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      if (parens [2].match (/:\/\/rrr-kb\.grrr\.jp\//)) {
        nextNode.parentNode.insertBefore (targetNode, nextNode);
        return false;
      }
      var protocol;
      switch (parens [1]) {
        case "file":
        case "ftp":
        case "mms":
        case "rtsp":
        case "akahuku":
          protocol = parens [1];
        break;
        default:
          protocol
            = "http" + ((parens [1].length > 0
                         && parens [1].substr (-1, 1) == "s")
                        ? "s" : "");
          
          var param
            = Akahuku.getDocumentParam (targetDocument);
          if (protocol == "http"
              && param && param.location_info.isFutasuke
              && parens [2].match (/^:\/\/[^.\/]+\.2chan\.net/)) {
            /* 双助を使っている場合でふたば内へのリンクは双助経由にする */
            protocol = "";
            parens [2] = parens [2].replace (/^:\//, "");
          }
          break;
      }
             
      var url
      = protocol
      + parens [2].replace (/\uFF5E/g, "~")
      .replace (/\u2329/g, "&lang");
      
      try {
        var testURL
          = Components
          .classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
        testURL.spec = url;
      }
      catch (e) { Akahuku.debug.exception (e);
        return false;
      }
      
      var anchor = targetDocument.createElement ("a");
      url = arAkahukuP2P.tryEnP2P (url);
      if (typeof (Components.interfaces.nsIIDNService) != "undefined") {
        if (url.match (/^([A-Za-z0-9]+):\/\/([^\/]+)\/(.+)/)) {
          var protocol2 = RegExp.$1;
          var host = RegExp.$2;
          var path = RegExp.$3;
                    
          var idn
            = Components.classes
            ["@mozilla.org/network/idn-service;1"].
            getService (Components.interfaces.nsIIDNService);
                    
          try {
            host = unescape (host);
            host = idn.convertUTF8toACE (host);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
          url = protocol2 + "://" + host + "/" + path;
        }
      }
      anchor.setAttribute ("dummyhref", url);
      anchor.className = "akahuku_generated_link";
      arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
      arAkahukuLink.updateAutoLinkVisitedCore (anchor);
      anchor.appendChild (targetDocument.createTextNode
                          (parens [1]));
      nextNode.parentNode.insertBefore (anchor, nextNode);
      try {
        if (url.match
            (/^https?(:\/\/(?:www|images|maps|scholar|books)\.google\.[^\/]+\/[^\/#]*[\?#])(.+)/)) {
          var parens2 = RegExp.$1;
          var query = RegExp.$2;
          var ie = "UTF-8";
          if (query.match (/ie=([^&]+)/)) {
            ie = RegExp.$1;
            if (ie.match (/SJIS/i)
                || ie.match (/ShiftJIS/i)) {
                             
              ie = "Shift_JIS";
            }
          }
                     
          if (query.match (/^(q=|.*&q=)([^&]+)(.*)$/)) {
            var prev = RegExp.$1;
            var word = RegExp.$2;
            var next = RegExp.$3;
            var tmp = word;
                     
            word = word.replace (/\+/g, " ");
            word
              = word
              .replace (/\\x([0-9A-Fa-f][0-9A-Fa-f])/g, "%$1");
            word = unescape (word);
            try {
              word = decodeURIComponent (word);
            }
            catch (e) { Akahuku.debug.exception (e);
            }
                     
            if (1 || !ie.match (/UTF-8/i)) {
              word = arAkahukuConverter.convert (word, ie);
            }
                         
            anchor.appendChild (targetDocument.createTextNode
                                (parens2 + prev));
                     
            var font = targetDocument.createElement ("font");
            font.className = "akahuku_generated_link_child";
            font.setAttribute ("__akahuku_link_tmp",
                               btoa (escape (tmp)));
            font.appendChild (targetDocument.createTextNode
                              (word));
            anchor.appendChild (font);
                     
            if (next) {
              anchor.appendChild (targetDocument.createTextNode
                                  (next));
            }
          }
          else {
            anchor.appendChild (targetDocument.createTextNode
                                (parens [2].replace
                                 (/\u2329/g, "&amp;lang")));
          }
        }
        else {
          anchor.appendChild (targetDocument.createTextNode
                              (parens [2].replace
                               (/\u2329/g, "&amp;lang")));
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        anchor.appendChild (targetDocument.createTextNode
                            (parens [2].replace
                             (/\u2329/g, "&amp;lang")));
      }
             
      var button
      = arAkahukuLink.createPreviewButton (targetDocument,
                                           url, anchor);
      if (button) {
        nextNode.parentNode.insertBefore (button [0], nextNode);
        if (button [1]) {
          button [1] ();
        }
      }
      return true;
    });
        
    arAkahukuLink.upPattern
    = new arAkahukuMatchPattern
    (/([^A-Fa-f0-9#]|^)(f[0-9]{4,}(\.[_a-zA-Z0-9]+)?)/,
     /* $1: 前の文字
      * $2: f123.jpg
      * $3: .jpg */
     function (parens) {
      if (parens [1]) {
        return parens [1].length;
      }
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var url;
      url = "http://dec.2chan.net/up/";
      var prefix = url;
      url += parens [3] ? ("src/" + parens [2]) : "up.htm";
      
      var param = Akahuku.getDocumentParam (targetDocument);
      if (param) {
        var info = param.location_info;
        if (info && info.isTsumanne) {
          url = _getAttachmentOnTsumanne (targetDocument, parens [2]) || url;
        }
      }
      
      var anchor = targetDocument.createElement ("a");
      if (!(parens [3])) {
        anchor.setAttribute ("__akahuku_autolink_no_ext", "1");
        anchor.setAttribute ("__akahuku_autolink_prefix",
                             prefix + "src/" + parens [2]);
      }
             
      url = arAkahukuP2P.tryEnP2P (url);
      anchor.setAttribute ("dummyhref", url);
      anchor.className = "akahuku_generated_link";
      arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
      arAkahukuLink.updateAutoLinkVisitedCore (anchor);
      anchor.appendChild (targetDocument.createTextNode
                          (parens [2]));
      nextNode.parentNode.insertBefore (anchor, nextNode);
             
      var button
      = arAkahukuLink.createPreviewButton (targetDocument,
                                           url, anchor);
      if (button) {
        nextNode.parentNode.insertBefore (button [0], nextNode);
        if (button [1]) {
          button [1] ();
        }
      }
      return true;
    });
        
    arAkahukuLink.up2Pattern
    = new arAkahukuMatchPattern
    (/([^A-Fa-f0-9#]|^)(fu[0-9]{4,}(\.[_a-zA-Z0-9]+)?)/,
     /* $1: 前の文字
      * $2: fu123.jpg
      * $3: .jpg */
     function (parens) {
      if (parens [1]) {
        return parens [1].length;
      }
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var url;
      url = "http://dec.2chan.net/up2/";
      var prefix = url;
      url += parens [3] ? ("src/" + parens [2]) : "up.htm";
      var param = Akahuku.getDocumentParam (targetDocument);
      if (param) {
        var info = param.location_info;
        if (info && info.isTsumanne) {
          url = _getAttachmentOnTsumanne (targetDocument, parens [2]) || url;
        }
      }
      
      var anchor = targetDocument.createElement ("a");
      if (!(parens [3])) {
        anchor.setAttribute ("__akahuku_autolink_no_ext", "1");
        anchor.setAttribute ("__akahuku_autolink_prefix",
                             prefix + "src/" + parens [2]);
      }
             
      url = arAkahukuP2P.tryEnP2P (url);
      anchor.setAttribute ("dummyhref", url);
      anchor.className = "akahuku_generated_link";
      arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
      arAkahukuLink.updateAutoLinkVisitedCore (anchor);
      anchor.appendChild (targetDocument.createTextNode
                          (parens [2]));
      nextNode.parentNode.insertBefore (anchor, nextNode);
             
      var button
      = arAkahukuLink.createPreviewButton (targetDocument,
                                           url, anchor);
      if (button) {
        nextNode.parentNode.insertBefore (button [0], nextNode);
        if (button [1]) {
          button [1] ();
        }
      }
      return true;
    });
        
    arAkahukuLink.sioPattern
    = new arAkahukuMatchPattern
    (/([^A-Fa-f0-9#]|^)(s[usapq][0-9]{4,}(\.[_a-zA-Z0-9]+)?)/,
     /* $1: 前の文字
      * $2: sa123.jpg
      * $3: .jpg */
     function (parens) {
      if (parens [1]) {
        return parens [1].length;
      }
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var linkToRedirect = false;
      var url;
      url = "http://www.nijibox2.com/futabafiles/";
      switch (parens [2].substr (0, 2)) {
        case "su":
          url = "http://www.nijibox5.com/futabafiles/";
          url += "tubu/";
          break;
        case "ss":
          url = "http://www.nijibox5.com/futabafiles/";
          url += "kobin/";
          break;
        case "sa":
          if (parseInt (parens [2].substr (2)) >= 41080) {
            url = "http://www.nijibox6.com/futabafiles/";
          }
          url += "001/";
          break;
        case "sp":
          url += "003/";
          break;
        case "sq":
          url = "http://www.nijibox6.com/futabafiles/";
          url += "mid/";
          linkToRedirect = true;
          break;
      }
      
      var prefix = url;
      url += "src/" + parens [2];
      
      var param = Akahuku.getDocumentParam (targetDocument);
      if (param) {
        var info = param.location_info;
        if (info && info.isTsumanne && parens [3]) {
          var url2 = _getAttachmentOnTsumanne (targetDocument, parens [2]);
          if (url2) {
            url = url2;
            linkToRedirect = false;
          }
        }
      }
            
      var anchor = targetDocument.createElement ("a");
      if (linkToRedirect && parens [3]) {
        // 中瓶のDLKey付きでも自動でKey入力画面に飛ぶように
        // 拡張子無しのURLでアクセスする
        anchor.setAttribute ("dummyhref", url.replace (/(\d+)\.[^\.]+$/,"$1"));
      }
      else
      anchor.setAttribute ("dummyhref", url);
      anchor.className = "akahuku_generated_link";
      if (!(parens [3])) {
        anchor.setAttribute ("__akahuku_autolink_no_ext", "1");
        anchor.setAttribute ("__akahuku_autolink_no_ext_auto", "1");
        anchor.setAttribute ("__akahuku_autolink_prefix",
                             prefix + "src/" + parens [2]);
        anchor.setAttribute ("__akahuku_autolink_autourl",
                             url);
      }
      arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
      arAkahukuLink.updateAutoLinkVisitedCore (anchor);
      anchor.appendChild (targetDocument.createTextNode
                          (parens [2]));
      nextNode.parentNode.insertBefore (anchor, nextNode);
             
      var button
      = arAkahukuLink.createPreviewButton (targetDocument,
                                           url, anchor);
      if (button) {
        nextNode.parentNode.insertBefore (button [0], nextNode);
        if (button [1]) {
          button [1] ();
        }
      }
      return true;
    });
        
    arAkahukuLink.futalogPattern
    = new arAkahukuMatchPattern
    (/([^A-Fa-f0-9#]|^)((dec|jun|nov|may|img|dat|cgi|nne|jik|oth|she|nar|id)([0-9]{4,})(\.mht)?)/,
     /* $1: 前の文字
      * $2: img123.mht
      * $3: img
      * $4: 123
      * $5: .mht */
     function (parens) {
      if (parens [1]) {
        return parens [1].length;
      }
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var url = "http://www.nijibox2.com/futalog/";
      switch (parens [3]) {
        case "dec":
        case "jun":
        case "nov":
        case "may":
        case "img":
        case "dat":
        case "cgi":
        case "nne":
        case "jik":
        case "nar":
        case "id":
          url += parens [3] + "/";
        break;
        case "oth":
          url += "other/";
          break;
        case "she":
          url += "shelter/";
          break;
      }
      url
      += "src/" + parens [3] + parens [4]
      + (parens [5] ? parens [5] : ".mht");
             
      var anchor = targetDocument.createElement ("a");
      anchor.setAttribute ("dummyhref", url);
      anchor.className = "akahuku_generated_link";
      arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
      arAkahukuLink.updateAutoLinkVisitedCore (anchor);
      anchor.appendChild (targetDocument.createTextNode
                          (parens [2]));
      nextNode.parentNode.insertBefore (anchor, nextNode);
             
      var button
      = arAkahukuLink.createPreviewButton (targetDocument,
                                           url, anchor);
      if (button) {
        nextNode.parentNode.insertBefore (button [0], nextNode);
        if (button [1]) {
          button [1] ();
        }
      }
      return true;
    });
        
    arAkahukuLink.trollsPattern
    = new arAkahukuMatchPattern
    (/[wW\uFF57\uFF37]{4,}|([^A-Za-z\uFF21-\uFF3A\uFF41-\uFF5A]|^)([w\uFF57]+)[ \u3000\xa0]*($|\u300D|\u300F)|(?:[wW\uFF57\uFF37][ \u3000]+){3,}[wW\uFF57\uFF37]?/,
         
     /* 4 個以上
      * (行頭 or アルファベット以外の次) かつ
      *   (行末 or 閉じ括弧の前) の独立した小文字 1 個以上 */
         
     /* $1: 前の文字 or 行頭("")
      * $2: 対象
      * $3: 閉じ括弧 or 行末("") */
     function (parens) {
      if (parens [1]) {
        return parens [1].length;
      }
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var text;
      var prev = "";
      var next = "";
      var t = "";
             
      switch (arAkahukuLink.hideTrollsMode) {
        case "hide":
          text = "";
          break;
        case "user":
          var n;
          if (arAkahukuLink.enableHideTrollsRandom) {
            n = arAkahukuLink.hideTrollsUserList.length;
            n = parseInt (Math.random () * n);
            text = arAkahukuLink.hideTrollsUserList [n];
          }
          else {
            text = arAkahukuLink.hideTrollsUser;
          }
          if (text == "") {
            text = "\u2665";
          }
          break;
        case "normal":
        default:
          text = "..........";
      }
             
      var title;
      if (parens [2]) {
        title = parens [2];
      }
      else {
        title = parens [0];
      }
             
      var tmpNode = targetNode;
            
      if (text) {
        var font = targetDocument.createElement ("font");
        if (arAkahukuLink.enableHideTrollsRed) {
          var font2
            = arAkahukuDOM.findParentNode (nextNode, "font");
          if (font2 == null) {
            font.color = arAkahukuLink.hideTrollsRedColor;
          }
          else {
            font.color = arAkahukuLink.hideTrollsRedColorQuote;
          }
        }
        font.title = title;
        font.setAttribute ("__akahuku_troll", "1");
        font.setAttribute ("__akahuku_troll_text",
                           btoa (escape (title)));
        font.appendChild (targetDocument.createTextNode
                          (text));
        nextNode.parentNode.insertBefore (font, nextNode);
      }
             
      if (parens [3]) {
        tmpNode = tmpNode.splitText (tmpNode.length - 1);
                 
        nextNode.parentNode.insertBefore (tmpNode, nextNode);
      }
      return true;
    });
        
    arAkahukuLink.P2PPattern
    = new arAkahukuMatchPattern
    (/(=AKA\/[0-9]+\.[0-9]+:[^=]+=)/,
     /* $1: ノード名 */
     function (parens) {
      return 0;
    },
     function (targetNode, nextNode,
               parens, targetDocument) {
      var nodeName = parens [1];
      var newNode = targetDocument.createElement ("small");
      newNode.className = "akahuku_p2p_nodename";
      newNode.appendChild (targetDocument.createTextNode
                           (nodeName));
      nextNode.parentNode.insertBefore (newNode, nextNode);
      return true;
    });
        
    arAkahukuLink.normalPatterns = new Array ();
    arAkahukuLink.normalPatterns.push (arAkahukuLink.urlPattern);
    arAkahukuLink.normalPatterns.push (arAkahukuLink.wikipediaPattern);
    arAkahukuLink.normalPatterns.push (arAkahukuLink.upPattern);
    arAkahukuLink.normalPatterns.push (arAkahukuLink.up2Pattern);
    arAkahukuLink.normalPatterns.push (arAkahukuLink.sioPattern);
    arAkahukuLink.normalPatterns.push (arAkahukuLink.futalogPattern);
        
    arAkahukuLink.trollsPatterns = new Array ();
    arAkahukuLink.trollsPatterns.push (arAkahukuLink.trollsPattern);
        
    arAkahukuLink.userPatterns = new Array ();
        
    arAkahukuLink.mailPatterns = new Array ();
    arAkahukuLink.mailPatterns.push (arAkahukuLink.P2PPattern);
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
      /* 通常モード、レス送信モード共通 */
            
      /* メル欄表示 */
      if (arAkahukuLink.enableShowMail) {
        var weight = "normal";
        if (targetDocument.getElementsByName ("name").length > 0) {
          weight = "bold";
        }
        style
        .addRule ("font.akahuku_shown_mail",
                  "color: blue; "
                  + "font-weight: " + weight)
        .addRule ("small.akahuku_p2p_nodename",
                  "color: #0040ee; "
                  + "font-size: 8pt;");
      }
            
      /* オートリンク */
      if (arAkahukuLink.enableAutoLink) {
        style
        /* 未読 */
        /* 通常 */
        .addRule ("blockquote > a.akahuku_generated_link",
                  "color: #0040ee; "
                  + "text-decoration: underline;")
        .addRule ("blockquote > a.akahuku_generated_link > "
                  + "font.akahuku_generated_link_child",
                  "color: #a060cc;")
        .addRule ("div.t > a.akahuku_generated_link",
                  "color: #0040ee; "
                  + "text-decoration: underline;")
        .addRule ("div.t > a.akahuku_generated_link > "
                  + "font.akahuku_generated_link_child",
                  "color: #a060cc;")
        /* ポップアップ内 */
        .addRule ("div.akahuku_popup_content_blockquote > "
                  + "a.akahuku_generated_link",
                  "color: #0040ee; "
                  + "text-decoration: underline;")
        .addRule ("div.akahuku_popup_content_blockquote > "
                  + "a.akahuku_generated_link > "
                  + "font.akahuku_generated_link_child",
                  "color: #a060cc;")
        /* 引用内 */
        .addRule ("font > a.akahuku_generated_link",
                  "color: #409999; "
                  + "text-decoration: underline;")
        .addRule ("font > a.akahuku_generated_link > "
                  + "font.akahuku_generated_link_child",
                  "color: #c09999;")
        .addRule ("span > a.akahuku_generated_link",
                  "color: #409999; "
                  + "text-decoration: underline;")
        .addRule ("span > a.akahuku_generated_link > "
                  + "font.akahuku_generated_link_child",
                  "color: #c09999;")
        
        /* 題名, 名前 */
        .addRule ("b > a.akahuku_generated_link",
                  "color: #0040ee; "
                  + "text-decoration: underline;")
        .addRule ("b > a.akahuku_generated_link > "
                  + "font.akahuku_generated_link_child",
                  "color: #a060cc;")
        
        /* 既読 */
        /* 通常 */
        .addRule ("blockquote > a.akahuku_generated_link[visited]",
                  "color: #8040ee; "
                  + "text-decoration: underline;")
        .addRule ("div.t > a.akahuku_generated_link[visited]",
                  "color: #8040ee; "
                  + "text-decoration: underline;")
        /* ポップアップ */
        .addRule ("div.akahuku_popup_content_blockquote[visited] > "
                  + "a.akahuku_generated_link",
                  "color: #8040ee; "
                  + "text-decoration: underline;")
        /* 引用内 */
        .addRule ("font > a.akahuku_generated_link[visited]",
                  "color: #806099; "
                  + "text-decoration: underline;")
        .addRule ("span > a.akahuku_generated_link[visited]",
                  "color: #806099; "
                  + "text-decoration: underline;")
                
        /* ホバー */
        .addRule ("a.akahuku_generated_link:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "text-decoration: underline;")
        .addRule ("a.akahuku_generated_link[visited]:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "text-decoration: underline;");
                
        /* 自動識別した拡張子 */
        style
        .addRule ("a.akahuku_generated_link .akahuku_generated_ext",
                  "opacity: 0.5;");
        style
        /* 未読 */
        /* 通常 */
        .addRule ("blockquote > small.akahuku_generated",
                  "color: #0040ee;")
        .addRule ("div.t > small.akahuku_generated",
                  "color: #0040ee;")
        /* ポップアップ内 */
        .addRule ("div.akahuku_popup_content_blockquote > "
                  + "small.akahuku_generated",
                  "color: #0040ee;")
        /* 引用内 */
        .addRule ("font > small.akahuku_generated",
                  "color: #409999;")
        .addRule ("span > small.akahuku_generated",
                  "color: #409999;")
                
        /* 通常 */
        .addRule ("span.akahuku_preview_button",
                  "font-size: inherit !important;")
        /* ホバー */
        .addRule ("span.akahuku_preview_button:hover",
                  "font-size: inherit !important; "
                  + "cursor: pointer; "
                  + "color: #ff4000;")
                
        /* 通常 */
        .addRule ("span.akahuku_preview_save_button",
                  "font-size: inherit !important;")
        /* ホバー */
        .addRule ("span.akahuku_preview_save_button:hover",
                  "font-size: inherit !important; "
                  + "cursor: pointer;")
                
        /* (Gecko 10.0+) moz HTML5 Fullscreen マージンバグ?対策 */
        .addRule ("iframe.akahuku_preview:-moz-full-screen",
                  "margin: 0 !important;")
                
        .addRule ("span.akahuku_preview_error",
                  "font-size: 9pt; "
                  + "font-weight: bold; "
                  + "color: #ff4000;");
                
        /* mht で保存用 */
        style
        .addRule ("div#akahuku_savemht_nocachelist > a.akahuku_generated_link",
                  "color: #0040ee; "
                  + "text-decoration: underline;")
        .addRule ("div#akahuku_savemht_nocachelist > a.akahuku_generated_link[visited]",
                  "color: #806099; "
                  + "text-decoration: underline;")
        .addRule ("div#akahuku_savemht_nocachelist > a.akahuku_generated_link:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "text-decoration: underline;")
        .addRule ("div#akahuku_savemht_nocachelist > a.akahuku_generated_link[visited]:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "text-decoration: underline;");
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuLink.enableHideTrolls
    = arAkahukuConfig
    .initPref ("bool", "akahuku.hidetrolls", true);
    if (arAkahukuLink.enableHideTrolls) {
      arAkahukuLink.hideTrollsMode
        = arAkahukuConfig
        .initPref ("char", "akahuku.hidetrolls.mode", "normal");
      if (arAkahukuLink.hideTrollsMode != "normal"
          && arAkahukuLink.hideTrollsMode != "hide"
          && arAkahukuLink.hideTrollsMode != "user") {
        arAkahukuLink.hideTrollsMode = "normal";
      }
      arAkahukuLink.enableHideTrollsRed
        = arAkahukuConfig
        .initPref ("bool", "akahuku.hidetrolls.red", true);
      var value
        = arAkahukuConfig
        .initPref ("char", "akahuku.hidetrolls.red.color", "red");
      arAkahukuLink.hideTrollsRedColor = unescape (value);
      value
        = arAkahukuConfig
        .initPref ("char", "akahuku.hidetrolls.red.color.quote", value);
      arAkahukuLink.hideTrollsRedColorQuote = unescape (value);
      arAkahukuLink.enableHideTrollsRandom
        = arAkahukuConfig
        .initPref ("bool", "akahuku.hidetrolls.random", false);
      arAkahukuLink.hideTrollsUser
        = arAkahukuConfig
        .initPref ("char", "akahuku.hidetrolls.user", "..........");
      arAkahukuLink.hideTrollsUser
        = unescape (arAkahukuLink.hideTrollsUser);
      if (arAkahukuLink.enableHideTrollsRandom) {
        arAkahukuLink.hideTrollsUserList
          = arAkahukuLink.hideTrollsUser.split (/,/);
      }
      arAkahukuLink.hideTrollsUser
        = unescape (arAkahukuLink.hideTrollsUser);
      arAkahukuLink.enableHideTrollsNoCat
        = arAkahukuConfig
        .initPref ("bool", "akahuku.hidetrolls.nocat", false);
    }
    
    arAkahukuLink.enableSubjectName
    = arAkahukuConfig
    .initPref ("bool", "akahuku.autolink.subject_name", false);
    
    arAkahukuLink.enableShowMail
    = arAkahukuConfig
    .initPref ("bool", "akahuku.showmail", true);
        
    arAkahukuLink.enableShowMailPopup
    = arAkahukuConfig
    .initPref ("bool", "akahuku.showmail.popup", false);
        
    arAkahukuLink.enableAutoLink
    = arAkahukuConfig
    .initPref ("bool", "akahuku.autolink", true);
    if (arAkahukuLink.enableAutoLink) {
      arAkahukuLink.enableAutoLinkFocus
        = arAkahukuConfig
        .initPref ("bool", "akahuku.autolink.focus", false);
      arAkahukuLink.enableAutoLinkUser
        = arAkahukuConfig
        .initPref ("bool", "akahuku.autolink.user", true);
      arAkahukuLink.enableAutoLinkAs
        = arAkahukuConfig
        .initPref ("bool", "akahuku.autolink.as", false);
      arAkahukuLink.enableAutoLinkPreview
        = arAkahukuConfig
        .initPref ("bool", "akahuku.autolink.preview", true);
      if (arAkahukuLink.enableAutoLinkPreview) {
        arAkahukuLink.enableAutoLinkPreviewMulti
          = arAkahukuConfig
          .initPref ("bool", "akahuku.autolink.preview.multi", false);
        arAkahukuLink.enableAutoLinkPreviewAutoOpen
          = arAkahukuConfig
          .initPref ("bool", "akahuku.autolink.preview.autoopen", false);
        arAkahukuLink.enableAutoLinkPreviewAutoOpenNoQuote
          = arAkahukuConfig
          .initPref ("bool", "akahuku.autolink.preview.autoopen.noquote",
                     false);
        arAkahukuLink.autoLinkPreviewSWFWidth
          = arAkahukuConfig
          .initPref ("int",  "akahuku.autolink.preview.swf.width",
                     320);
        arAkahukuLink.autoLinkPreviewSWFHeight
          = arAkahukuConfig
          .initPref ("int",  "akahuku.autolink.preview.swf.height",
                     240);
      }
            
      arAkahukuLink.userPatterns = new Array ();
      
      if (arAkahukuLink.enableAutoLinkUser) {
        /* ユーザ指定文字列のチェックがオンの場合 */
        var value;
        
        value
          = arAkahukuConfig
          .initPref ("char", "akahuku.autolink.user.patterns2", "null");
        if (value != "null") {
          var list = arAkahukuJSON.decode (unescape (value));
          while (list.length && list [0] == undefined) {
            list.shift ();
          }
          for (var i = 0; i < list.length; i ++) {
            arAkahukuLink.userPatterns.push
            (new arAkahukuUserMatchPattern
             (list [i].pattern,
              list [i].r,
              list [i].url));
          }
        }
        else {
          value
            = arAkahukuConfig
            .initPref ("char", "akahuku.autolink.user.patterns", "");
          if (value != "") {
            /* 値を解析するだけなので代入はしない */
            value.replace
              (/([^&,]*)&([^&,]*)&([^&,]*),?/g,
               function (matched, pattern, r, url) {
                arAkahukuLink.userPatterns.push
                    (new arAkahukuUserMatchPattern
                     (unescape (pattern),
                      unescape (r) == "o",
                      unescape (url)));
                
                return "";
              });
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
    var menuitem;
        
    var isAutolink = false;
    var isNoExtAutolink = false;
    var isNoExtAutolinkAuto = false;
    var node = document.popupNode;
    if (node) {
      if (node.nodeName.toLowerCase () != "a") {
        node = arAkahukuDOM.findParentNode (document.popupNode, "a");
      }
      if (node) {
        if (node.nodeName.toLowerCase () == "a") {
          if ("className" in node
              && node.className == "akahuku_generated_link") {
            isAutolink = true;
            if (node.hasAttribute ("__akahuku_autolink_no_ext")) {
              isNoExtAutolink = true;
            }
            if (node.hasAttribute
                ("__akahuku_autolink_no_ext_auto")) {
              isNoExtAutolinkAuto = true;
            }
          }
        }
      }
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator0");
    if (menuitem) {
      menuitem.hidden = !isAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-openlink");
    if (menuitem) {
      menuitem.hidden = !isAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-savelink");
    if (menuitem) {
      menuitem.hidden = !isAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-copylink");
    if (menuitem) {
      menuitem.hidden = !isAutolink;
    }
        
    var isUserLinkable = false;
    var isAsAutoLinkable = false;
        
    if (arAkahukuLink.enableAutoLinkAs) {
      var targetDocument = document.popupNode.ownerDocument;
      var param
        = Akahuku.getDocumentParam (targetDocument);
      if (!param) {
        isAsAutoLinkable = gContextMenu.isTextSelected;
      }
    }
        
    if (arAkahukuLink.enableAutoLink
        && arAkahukuLink.enableAutoLinkUser) {
      if (document.popupNode
          && document.popupNode.nodeName.toLowerCase ()
          == "img") {
        if ("src" in document.popupNode) {
          if (document.popupNode.src.match
              (/^(.+\/)([^0-9\/]+)([0-9]+)\.(.+)$/)) {
            isUserLinkable = true;
          }
        }
      }
    }
        
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator6");
    if (menuitem) {
      menuitem.hidden = !isUserLinkable && !isAsAutoLinkable;
    }
    menuitem
    = document
    .getElementById
    ("akahuku-menuitem-content-autolink-user-add");
    if (menuitem) {
      menuitem.hidden = !isUserLinkable;
    }
    menuitem
    = document
    .getElementById
    ("akahuku-menuitem-content-autolink-open-as");
    if (menuitem) {
      menuitem.hidden = !isAsAutoLinkable;
    }
        
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-separator7");
    if (menuitem) {
      menuitem.hidden = !isNoExtAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-ext-auto");
    if (menuitem) {
      menuitem.hidden = !isNoExtAutolink || !isNoExtAutolinkAuto;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-ext-jpg");
    if (menuitem) {
      menuitem.hidden = !isNoExtAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-ext-png");
    if (menuitem) {
      menuitem.hidden = !isNoExtAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-ext-gif");
    if (menuitem) {
      menuitem.hidden = !isNoExtAutolink;
    }
    menuitem
    = document
    .getElementById ("akahuku-menuitem-content-autolink-ext-input");
    if (menuitem) {
      menuitem.hidden = !isNoExtAutolink;
    }
  },
    
  /**
   * オートリンクに拡張子を追加する
   *
   * @param  Number type
   *         指定の種類
   *           0: 直接指定
   *           1: 手入力
   *           2: 自動認識
   * @param  String ext
   *         指定する拡張子
   */
  setExt : function (type, ext) {
    var targetNode = document.popupNode;
    var targetDocument = targetNode.ownerDocument;
        
    if (targetNode.nodeName.toLowerCase () != "a") {
      targetNode = arAkahukuDOM.findParentNode (targetNode, "a");
    }
        
    if (!targetNode) {
      return;
    }
        
    var button = targetNode.nextSibling;
    if (button
        && "hasAttribute" in button
        && button.hasAttribute ("__akahuku_autolink_button")) {
      button.parentNode.removeChild (button);
    }
    var extNode = null;
    var node = targetNode.firstChild;
    while (node.nextSibling) {
      node = node.nextSibling;
    }
    if (node && node.firstChild
        && "className" in node
        && node.className == "akahuku_generated") {
      node = node.firstChild;
    }
    if (node
        && "className" in node
        && node.className == "akahuku_generated_ext") {
      extNode = node;
    }
        
    if (type == 1) {
      ext
      = prompt ("\u4F55\u3082\u5165\u529B\u3057\u306A\u3044\u3068\u62E1\u5F35\u5B50\u6307\u5B9A\u3092\u89E3\u9664\u3057\u307E\u3059", "",
                "\u62E1\u5F35\u5B50\u3092\u6307\u5B9A");
    }
    else if (type == 2) {
      var listener = new arAkahukuLinkExtListener ();
      listener.init (targetDocument, targetNode, extNode);
            
      var url = targetNode.getAttribute ("__akahuku_autolink_autourl");
      // 自動認識にも preview 用匿名チャネルを使う
      url = Akahuku.protocolHandler.enAkahukuURI ("preview", url);
            
      var ios
      = Components.classes ["@mozilla.org/network/io-service;1"]
      .getService (Components.interfaces.nsIIOService);
      listener.channel 
      = ios.newChannel (url, null, null);
      listener.channel.notificationCallbacks = listener;
            
      try {
        listener.channel.asyncOpen (listener, null);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      return;
    }
        
    arAkahukuLink.setExt2 (ext, targetDocument, targetNode, extNode);
  },
        
  /**
   * オートリンクに拡張子を追加する
   *
   * @param  String ext
   *         指定する拡張子
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   * @param  HTMLElement extNode
   *         拡張子のノード
   */
  setExt2 : function (ext, targetDocument, targetNode, extNode) {
    if (ext == "" && extNode) {
      extNode.parentNode.removeChild (extNode);
      return;
    }
        
    if (extNode == null) {
      var extNodeContainer = targetDocument.createElement ("small");
      extNodeContainer.className = "akahuku_generated";
      extNode = targetDocument.createElement ("span");
      extNode.className = "akahuku_generated_ext";
      extNodeContainer.appendChild (extNode);
      targetNode.appendChild (extNodeContainer);
    }
        
    var prefix = targetNode.getAttribute ("__akahuku_autolink_prefix");
        
    var url = prefix + "." + ext;
        
    arAkahukuDOM.setText (extNode, "." + ext);
    targetNode.setAttribute ("dummyhref", url)
        
    var button = arAkahukuLink.createPreviewButton (targetDocument,
                                                    url, targetNode);
    if (button) {
      if (targetNode.nextSibling) {
        targetNode.parentNode.insertBefore
          (button [0], targetNode.nextSibling);
      }
      else {
        targetNode.parentNode.appendChild (button [0]);
      }
      if (button [1]) {
        button [1] ();
      }
    }
  },
    
  /**
   * ユーザ指定文字列に追加する
   */
  addUser : function () {
    var target = document.popupNode;
        
    if (target.src.match
        (/^(.+\/)([^0-9\/]+)([0-9]+)\.(.+)$/)) {
      var base = RegExp.$1;
      var prefix = RegExp.$2;
      prefix
        = prefix.replace
        (/([\(\)\[\]\{\}\\\^\$\+\*\?\|\-])/g, "\\$1");
      var targetPattern = "(" + prefix + "[0-9]+\\.[a-z]+)";
      var targetUrl = base + "$1";
            
      var exists = false;
      var list = null;
      
      if (prefix.match (/^(f|fu|s[sapuq]|dec|jun|nov|may|img|dat|cgi|nne|jik|oth|she|nar)$/)) {
        exists = true;
      }
      else {
        var value
          = arAkahukuConfig
          .initPref ("char", "akahuku.autolink.user.patterns2", "null");
        if (value != "null") {
          list = arAkahukuJSON.decode (unescape (value));
          while (list.length && list [0] == undefined) {
            list.shift ();
          }
          for (var i = 0; i < list.length; i ++) {
            if (list [i].pattern == targetPattern
                && list [i].r) {
              exists = true;
            }
          }
        }
      }
            
      if (!exists) {
        arAkahukuLink.userPatterns.push
          (new arAkahukuUserMatchPattern
           (targetPattern,
            true,
            targetUrl));
        
        var value = {};
        value.pattern = targetPattern;
        value.r = true;
        value.url = targetUrl;
        list.push (value);
        
        arAkahukuConfig.prefBranch.setCharPref
          ("akahuku.autolink.user.patterns2",
           escape (arAkahukuJSON.encode (list)));
        
        var status = document.getElementById ("statusbar-display");
        if (status) {
          status.label
            = "\u8D64\u798F\u30AA\u30FC\u30C8\u30EA\u30F3\u30AF\uFF1A\u8FFD\u52A0\u3057\u307E\u3057\u305F";
        }
      }
      else {
        var status = document.getElementById ("statusbar-display");
        if (status) {
          status.label
            = "\u8D64\u798F\u30AA\u30FC\u30C8\u30EA\u30F3\u30AF\uFF1A\u540C\u3058\u9805\u76EE\u304C\u3042\u308A\u307E\u3059";
        }
      }
    }
  },
    
  /**
   * オートリンクを適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Text node
   *         対象の Text ノード
   * @param  Boolean normal
   *         通常
   * @param  Boolean trolls
   *         芝刈り
   * @param  Boolean user
   *         ユーザ指定文字列
   * @param  Boolean mail
   *         メール欄
   */
  linkify : function (targetDocument, node, normal, trolls, user, mail) {
    var nextNode = node.nextSibling;
        
    var tmpResult = new Object ();
    var nearestResult = new Object ();
        
    while (true) {
      /* 最も手前でマッチするパターンを探す */
      var nearestPattern = null;
      var nearestPosition = 0;
            
      /* マッチする位置を探す */
      for (var i = 0; i < arAkahukuLink.normalPatterns.length; i ++) {
        if (normal) {
          arAkahukuLink.normalPatterns [i].updateMatchedPosition
            (node.nodeValue, tmpResult);
                    
          if (tmpResult.position != -1) {
            if (nearestPattern == null
                || tmpResult.position < nearestResult.position
                || (tmpResult.position == nearestResult.position
                    && tmpResult.length >= nearestResult.length)) {
              nearestPattern = arAkahukuLink.normalPatterns [i];
              nearestResult.position = tmpResult.position;
              nearestResult.length = tmpResult.length;
              nearestResult.parens = tmpResult.parens;
            }
          }
        }
      }
      for (var i = 0; i < arAkahukuLink.trollsPatterns.length; i ++) {
        if (trolls) {
          arAkahukuLink.trollsPatterns [i].updateMatchedPosition
            (node.nodeValue, tmpResult);
                    
          if (tmpResult.position != -1) {
            if (nearestPattern == null
                || tmpResult.position < nearestResult.position
                || (tmpResult.position == nearestResult.position
                    && tmpResult.length >= nearestResult.length)) {
              nearestPattern = arAkahukuLink.trollsPatterns [i];
              nearestResult.position = tmpResult.position;
              nearestResult.length = tmpResult.length;
              nearestResult.parens = tmpResult.parens;
            }
          }
        }
      }
      for (var i = 0; i < arAkahukuLink.mailPatterns.length; i ++) {
        if (mail) {
          arAkahukuLink.mailPatterns [i].updateMatchedPosition
            (node.nodeValue, tmpResult);
                    
          if (tmpResult.position != -1) {
            if (nearestPattern == null
                || tmpResult.position < nearestResult.position
                || (tmpResult.position == nearestResult.position
                    && tmpResult.length >= nearestResult.length)) {
              nearestPattern = arAkahukuLink.mailPatterns [i];
              nearestResult.position = tmpResult.position;
              nearestResult.length = tmpResult.length;
              nearestResult.parens = tmpResult.parens;
            }
          }
        }
      }
      for (var i = 0; i < arAkahukuLink.userPatterns.length; i ++) {
        if (user) {
          arAkahukuLink.userPatterns [i].updateMatchedPosition
            (node.nodeValue, tmpResult);
          
          if (tmpResult.position != -1) {
            if (nearestPattern == null
                || tmpResult.position < nearestResult.position
                || (tmpResult.position == nearestResult.position
                    && tmpResult.length >= nearestResult.length)) {
              nearestPattern = arAkahukuLink.userPatterns [i];
              nearestResult.position = tmpResult.position;
              nearestResult.length = tmpResult.length;
              nearestResult.parens = tmpResult.parens;
            }
          }
        }
      }
            
      if (nearestPattern == null) {
        /* マッチするものが無い場合 */
        break;
      }
      else {
        /* マッチするものがある場合 */
                
        /* マッチした文字列で分割する */
        var tmpNode;
        if (nearestResult.position > 0) {
          tmpNode = node.splitText (nearestResult.position);
        }
        else {
          tmpNode = node;
        }
        node = tmpNode.splitText (nearestResult.length);
        tmpNode.parentNode.removeChild (tmpNode);
                
        /* 変換したノードを追加する */
        var result
          = nearestPattern
          .createReplacement (tmpNode, node,
                              nearestResult.parens,
                              targetDocument);
        if (!result) {
          node.parentNode.insertBefore (tmpNode, node);
        }
      }
    }
        
    return nextNode;
  },
    
  /**
   * 対象のノード以下のメール欄を表示する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyShowMail : function (targetDocument, targetNode) {
    var nodes, i;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    if (arAkahukuLink.enableShowMail
        && info.isMht) {
      /* mht ファイルでは、最初から展開されている場合がある */
      nodes = targetNode.getElementsByTagName ("font");
      
      for (i = 0; i < nodes.length; i ++) {
        var ok = 0;
        if ("style" in nodes [i]
            && nodes [i].style.color == "blue") {
          ok = 1;
        }
        if (nodes [i].getAttribute ("color") == "green") {
          ok = 1;
        }
        
        if (ok) {
          /* スレ, レスのメール欄かどうかチェック */
          if (arAkahukuDOM.findParentNode (nodes [i], "form")) {
            nodes [i].className = "akahuku_shown_mail";
            
            arAkahukuLink.applyAutoLinkCore
              (targetDocument,
               nodes [i],
               arAkahukuLink.enableAutoLink,
               arAkahukuLink.enableHideTrolls,
               arAkahukuLink.enableAutoLink
               && arAkahukuLink.enableAutoLinkUser,
               true);
          }
        }
      }
    }
    
    var plainNode;
    var tmp = targetNode.getElementsByTagName ("a");
    nodes = new Array ();
    for (i = 0; i < tmp.length; i ++) {
      nodes.push (tmp [i]);
    }
        
    var weight
    = targetDocument.getElementsByName ("name").length ? "bold" : "normal";
        
    for (i = 0; i < nodes.length; i ++) {
      var href = nodes [i].getAttribute ("href") || "";
            
      if (!href.match (/^mailto:/)) {
        continue;
      }
            
      var mail = href.replace (/^mailto:/, "");
            
      if (mail) {
        if (arAkahukuLink.enableShowMail) {
          nodes [i].style.display = "none";
                    
          plainNode = targetDocument.createElement ("font");
          nodes [i].parentNode.insertBefore (plainNode, nodes [i]);
          arAkahukuDOM.copyChildren (nodes [i], plainNode);
          arAkahukuDOM.setText (nodes [i], null);
                    
          var font = targetDocument.createElement ("font");
          font.className = "akahuku_shown_mail";
                    
          mail
            = mail
            .replace (/&#x202E;?/ig, "")
            .replace (/&#8328;?/ig, "")
            .replace (/\u202E/ig, "");
                    
          font.appendChild (targetDocument.createTextNode
                            (mail));
          arAkahukuLink.applyAutoLinkCore
            (targetDocument, font,
             arAkahukuLink.enableAutoLink,
             arAkahukuLink.enableHideTrolls,
             arAkahukuLink.enableAutoLink
             && arAkahukuLink.enableAutoLinkUser,
             true);
                    
          font.insertBefore (targetDocument.createTextNode
                             ("["),
                             font.firstChild);
          font.appendChild (targetDocument.createTextNode
                            ("]"));
                    
          nodes [i].parentNode.insertBefore (font, nodes [i]);
                    
          if (font.previousSibling
              && font.previousSibling.previousSibling) {
            var b = font.previousSibling.previousSibling;
            if (b.nodeName.toLowerCase () == "b") {
              var nodes2 = b.getElementsByTagName ("font");
              for (var j = 0; j < nodes2.length; j ++) {
                if (nodes2 [j].className
                    == "akahuku_shown_mail") {
                  nodes2 [j].parentNode.removeChild
                    (nodes2 [j]);
                  break;
                }
              }
            }
          }
        }
        else if (arAkahukuLink.enableShowMailPopup) {
          nodes [i].setAttribute ("title", mail);
        }
      }
    }
  },
    
  /**
   * オートリンクを新しいウィンドウで開く
   */
  openLink : function () {
    window.open (document.popupNode.getAttribute ("dummyhref"), "_blank");
  },
    
  /**
   * オートリンクを保存する
   */
  saveLink : function () {
    saveURL (document.popupNode.getAttribute ("dummyhref"),
             null, null, true, false, null);
  },
    
  /**
   * オートリンクをコピーする
   */
  copyLink : function () {
    var copytext = document.popupNode.getAttribute ("dummyhref");
        
    var str
    = Components.classes ["@mozilla.org/supports-string;1"]
    .createInstance (Components.interfaces.nsISupportsString);
    if (!str) {
      return;
    }
    str.data = copytext;
        
    var trans
    = Components.classes ["@mozilla.org/widget/transferable;1"]
    .createInstance (Components.interfaces.nsITransferable);
    if (!trans) {
      return;
    }
        
    trans.addDataFlavor ("text/unicode");
    trans.setTransferData ("text/unicode", str, copytext.length * 2);
        
    var clip
    = Components.classes ["@mozilla.org/widget/clipboard;1"]
    .getService (Components.interfaces.nsIClipboard);
    if (!clip) {
      return;
    }
        
    clip.setData (trans, null,
                  Components.interfaces.nsIClipboard.kGlobalClipboard);
  },
    
  /**
   * オートリンク上でボタンをクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onAutolinkClick : function (event) {
    if (arAkahukuLink.enableAutoLink) {
      var target = event.explicitOriginalTarget;
            
      if (target) {
        if (target.nodeName.toLowerCase () != "a") {
          target = arAkahukuDOM.findParentNode (target, "a");
        }
                
        if (target
            && "className" in target
            && target.className == "akahuku_generated_link") {
          var to = -1;
          var focus = arAkahukuLink.enableAutoLinkFocus;
                    
          if (event.button == 0) {
            if (event.ctrlKey || event.metaKey) {
              /* 新規タブ */
              to = 1;
              if (event.shiftKey) {
                focus = !focus;
              }
            }
            else if (event.altKey && !event.shiftKey) {
              /* 保存 */
              to = 3;
            }
            else if (!event.altKey && event.shiftKey) {
              /* 新規ウィンドウ */
              to = 2;
            }
            else {
              /* 新規タブ (本来は現在のタブ) */
              to = 1;
            }
          }
                    
          if (to != -1) {
            arAkahukuLink.openAutoLink (target, to, focus);
                        
            event.preventDefault ();
            event.stopPropagation ();
          }
        }
      }
            
      var target = event.explicitOriginalTarget;
            
      if (target) {
        if (target.nodeName.toLowerCase () != "span") {
          target = arAkahukuDOM.findParentNode (target, "span");
                    
          if (target
              && "className" in target
              && target.className == "akahuku_preview_button") {
            arAkahukuLink.onPreviewLinkClick (target);
          }
        }
      }
    }
  },
    
  /**
   * オートリンク上でボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onAutolinkMouseDown : function (event) {
    if (arAkahukuLink.enableAutoLink) {
      var target = event.explicitOriginalTarget;
            
      if (target) {
        if (target.nodeName.toLowerCase () != "a") {
          target = arAkahukuDOM.findParentNode (target, "a");
        }
                
        if (target
            && target.className == "akahuku_generated_link") {
          var to = -1;
          // 中ボタンクリックは通常とフォーカスが逆
          var focus = !arAkahukuLink.enableAutoLinkFocus;
                    
          if (event.button == 1) {
            /* 新規タブ */
            to = 1;
            if (event.shiftKey) {
              focus = !focus;
            }
          }
                    
          if (to != -1) {
            arAkahukuLink.openAutoLink (target, to, focus);
                        
            event.preventDefault ();
            event.stopPropagation ();
          }
        }
      }
    }
  },
    
  /**
   * オートリンクとして開く
   *
   * @param  Event event
   *         対象のイベント
   */
  openAsAutoLink : function (event) {
    var targetDocument = document.popupNode.ownerDocument;
    var selection = targetDocument.defaultView.getSelection ().toString ();
        
    var tmpNode = targetDocument.createElement ("div");
    arAkahukuDOM.setText (tmpNode, selection);
                
    arAkahukuLink.linkify
    (targetDocument,
     tmpNode.firstChild,
     true, false, true, false);
                
    var to = 1;
    var focus = arAkahukuLink.enableAutoLinkFocus;
    if (event.shiftKey) {
      focus = !focus;
    }
        
    var nodes = tmpNode.getElementsByTagName ("a");
    var urls = new Array ();
    for (var i = 0; i < nodes.length; i ++) {
      if ("className" in nodes [i]
          && nodes [i].className == "akahuku_generated_link") {
        arAkahukuLink.openAutoLink (nodes [i], to, focus);
      }
    }
  },
    
  /**
   * オートリンクを開く
   *
   * @param  HTMLElement target
   *         対象の要素
   * @param  Number to
   *         どこに開くか
   *           0: 現在のタブ
   *           1: 新規タブ
   *           2: 新規ウィンドウ
   *           3: 保存
   * @param  Boolean focus
   *         フォーカスを移すか
   */
  openAutoLink : function (target, to, focus) {
    var tabbrowser = document.getElementById ("content");
    var href = target.getAttribute ("dummyhref");
                
    var targetDocument = target.ownerDocument;
    var param = Akahuku.getDocumentParam (targetDocument);
    var info = null;
    if (param) {
      info = param.location_info;
    }
        
    if (info && info.isMht) {
      /* リンク先のファイルが mht 内に存在するかどうかチェック */
      try {
        var contentLocation
        = Components
        .classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (Components.interfaces.nsIURI);
        contentLocation.spec = href;
                
        var requestOrigin
        = Components
        .classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (Components.interfaces.nsIURI);
        requestOrigin.spec = targetDocument.location.href;
                
        var uri
        = UnMHT.getMHTFileURI (contentLocation,
                               requestOrigin);
        if (uri) {
          href = uri.spec;
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    if (arAkahukuP2P.enable) {
      href = arAkahukuP2P.tryEnP2P (href);
    }
    else {
      href = arAkahukuP2P.deP2P (href);
    }
    
    arAkahukuLink.targetLinks [href] = new Date ().getTime ();
    
    ; /* switch のインデント用 */
    switch (to) {
      case 0:
        var nav
          = targetDocument.defaultView
          .QueryInterface (Components.interfaces
                           .nsIInterfaceRequestor)
          .getInterface (Components.interfaces.nsIWebNavigation)
          .loadURI (href, 0, null, null, null);
        break;
      case 1:
        try {
          // ツリー型タブ アドオン対応 (0.12.2011060201+)
          // オートリンク先も通常リンク先同様に子タブにさせる
          if ("TreeStyleTabService" in window) {
            TreeStyleTabService.readyToOpenChildTabNow
              (tabbrowser.selectedTab);
          }
        }
        catch (e) { Akahuku.debug.exception (e);
        }
        var newTab;
        if (Akahuku.isFx36) {
          newTab = tabbrowser.addTab (href, {
            relatedToCurrent : true,
            // gBrowser.loadOneTab と同じロジックでタブを関連付ける
            ownerTab : (focus ? tabbrowser.selectedTab : null),
          });
        }
        else {
          newTab = tabbrowser.addTab (href);
        }
        if (focus) {
          tabbrowser.selectedTab = newTab;
        }
        break;
      case 2:
        window.open (href, "_blank");
        break;
      case 3:
        saveURL (href, null, null, true, false, null);
        break;
    }
  },
    
  /**
   * オートリンク上にマウスが乗ったイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onAutoLinkOver : function (event) {
    clearTimeout (arAkahukuLink.mouseOutTimeoutId);
    arAkahukuLink.mouseOutTimeoutId = null;
    var status = document.getElementById ("statusbar-display");
    if (status) {
      var target = event.target;
      if (target) {
        if (target.nodeName.toLowerCase () != "a") {
          target = arAkahukuDOM.findParentNode (target, "a");
        }
                
        if (target) {
          var href = target.getAttribute ("dummyhref");
                    
          /* IDN や相対アドレスの解決 */
          var ios
            = Components.classes
            ["@mozilla.org/network/io-service;1"]
            .getService (Components.interfaces.nsIIOService);
          var baseUri
            = target.ownerDocument.baseURIObject
            || ios.newURI (target.ownerDocument.baseURI, null, null);
          var uri = ios.newURI (href, null, baseUri);
          href = uri.spec;
          try {
            /* 可能ならロケーションバーと同様に可読化 */
            href = window.losslessDecodeURI (uri);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
                    
          status.label
            = "\u8D64\u798F\u30AA\u30FC\u30C8\u30EA\u30F3\u30AF: "
            + href;
        }
      }
    }
  },
    
  /**
   * オートリンク上からマウスが出たイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onAutoLinkOut : function (event) {
    var status = document.getElementById ("statusbar-display");
    /* Firefox4+ におけるステータスのポップアップにより
     * out/over の無限ループに陥ることを防ぐために少し待つ
     */
    clearTimeout (arAkahukuLink.mouseOutTimeoutId);
    arAkahukuLink.mouseOutTimeoutId
    = setTimeout
      ((function (status, oldLabel) {
          return function () {
            if (status && status.label == oldLabel) {
              status.label = "";
            }
            arAkahukuLink.mouseOutTimeoutId = null;
          };
        })(status, status.label), 100);
  },
    
  /**
   * オートリンクをドラッグしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onAutoLinkDragStart: function (event) {
    if (!("dataTransfer" in event) || !event.dataTransfer) {
      return;
    }

    var target = event.target;
    var caption = "";
    switch (target.nodeName.toLowerCase ()) {
      case "img":
        /* 画像データ自体はデフォルトでセットされる？ */
        if (!arAkahukuDOM.hasClassName
             (event.target, "akahuku_preview")) {
          break;
        }
        caption = caption || target.title;
        /* IMG の dummyhref は A と同様に処理 */
      case "a":
        caption = caption || target.textContent;
        var href = target.getAttribute ("dummyhref");
        href = arAkahukuP2P.deP2P (href);
        if (href) {
          event.dataTransfer.setData
            ("text/x-moz-url", href + "\n" + caption);
          event.dataTransfer.setData
            ("application/x-moz-file-promise-url", href);
          event.dataTransfer.setData ("text/uri-list", href);
          event.dataTransfer.setData ("text/plain", href);
        }
    }
  },
    
  /**
   * 対象のノード以下に芝刈りを適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyHideTrollsCore : function (targetDocument, targetNode) {
    var node;
    var nodeName;
        
    node = targetNode.firstChild;
        
    while (node) {
      nodeName = node.nodeName.toLowerCase ();
      if (nodeName == "font"
          || nodeName == "span") {
        arAkahukuLink.applyHideTrollsCore (targetDocument, node);
        node = node.nextSibling;
      }
      else if (nodeName == "#text") {
        node
          = arAkahukuLink.linkify
          (targetDocument,
           node,
           false, true, false, false);
      }
      else {
        node = node.nextSibling;
      }
    }
  },
    
  /**
   * 対象のノード以下に芝刈りを適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyHideTrolls : function (targetDocument, targetNode) {
    var nodes = targetNode.getElementsByTagName ("small");
        
    for (var i = 0; i < nodes.length; i ++) {
      arAkahukuLink.applyHideTrollsCore (targetDocument, nodes [i]);
    }
  },
    
  /**
   * アンカーを通常のテキストに変換する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  textize : function (targetDocument, targetNode) {
    var node;
        
    var nodes = targetNode.getElementsByTagName ("a");
    while (nodes.length) {
      var text = "";
      node = nodes [0].firstChild;
      while (node) {
        if (node.nodeName.toLowerCase () == "#text") {
          text += node.nodeValue;
        }
        node = node.nextSibling;
      }
            
      if (nodes [0].previousSibling
          && nodes [0].previousSibling.nodeName.toLowerCase ()
          == "#text") {
        text = nodes [0].previousSibling.nodeValue + text;
        if (nodes [0].nextSibling
            && nodes [0].nextSibling.nodeName.toLowerCase ()
            == "#text") {
          text = text + nodes [0].nextSibling.nodeValue;
          nodes [0].parentNode.removeChild (nodes [0].nextSibling);
        }
        var newNode = targetDocument.createTextNode (text);
        nodes [0].parentNode.replaceChild (newNode,
                                           nodes [0].previousSibling);
        nodes [0].parentNode.removeChild (nodes [0]);
                
      }
      else if (nodes [0].nextSibling
               && nodes [0].nextSibling.nodeName.toLowerCase ()
               == "#text") {
        text = text + nodes [0].nextSibling.nodeValue;
        nodes [0].parentNode.removeChild (nodes [0].nextSibling);
                
        var newNode = targetDocument.createTextNode (text);
        nodes [0].parentNode.replaceChild (newNode,
                                           nodes [0]);
      }
      else {
        var newNode = targetDocument.createTextNode (text);
        nodes [0].parentNode.replaceChild (newNode,
                                           nodes [0]);
      }
    }
  },
    
  /**
   * 対象のノード以下にオートリンクを適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   * @param  Boolean normal
   *         通常
   * @param  Boolean trolls
   *         芝刈り
   * @param  Boolean user
   *         ユーザ指定文字列
   * @param  Boolean mail
   *         メール欄
   */
  applyAutoLinkCore : function (targetDocument, targetNode,
                                normal, trolls, user, mail) {
    var node;
    var nodeName;
    
    /* 広告の blockquote 回避は getMessageBQ でやってるので無駄
    node = targetNode;
    for (var i = 0; node && i < 5; i ++) {
      if (node.nodeName.toLowerCase () == "a"
          && "href" in node
          && node.href.match (/http:\/\/www\.amazon\.co\.jp\//)) {
        return;
      }
      node = node.previousSibling;
    }
    */
        
    arAkahukuLink.textize (targetDocument, targetNode);
        
    node = targetNode.firstChild;
        
    while (node) {
      nodeName = node.nodeName.toLowerCase ();
      if (nodeName == "font"
          || nodeName == "span") {
        arAkahukuLink.applyAutoLinkCore (targetDocument, node,
                                         normal, trolls, user, mail);
        node = node.nextSibling;
      }
      else if (nodeName == "#text") {
        node = arAkahukuLink.linkify (targetDocument, node,
                                      normal, trolls, user, mail);
      }
      else {
        node = node.nextSibling;
      }
    }
  },
    
  /**
   * 対象のノード以下にオートリンクを適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  applyAutoLink : function (targetDocument, targetNode) {
    var nodes = Akahuku.getMessageBQ (targetNode);
        
    for (var i = 0; i < nodes.length; i ++) {
      arAkahukuLink.applyAutoLinkCore
        (targetDocument, nodes [i],
         arAkahukuLink.enableAutoLink,
         arAkahukuLink.enableHideTrolls,
         arAkahukuLink.enableAutoLink
         && arAkahukuLink.enableAutoLinkUser,
         false);
    }
    
    if (arAkahukuLink.enableSubjectName) {
      for (var i = 0; i < nodes.length; i ++) {
        var node = nodes [i].previousSibling;
        while (node) {
          if (node.nodeName.toLowerCase () == "font"
              && node.firstChild
              && node.firstChild.nodeName.toLowerCase () == "b") {
            arAkahukuLink.applyAutoLinkCore
              (targetDocument, node.firstChild,
               arAkahukuLink.enableAutoLink,
               arAkahukuLink.enableHideTrolls,
               arAkahukuLink.enableAutoLink
               && arAkahukuLink.enableAutoLinkUser,
               false);
          }
          node = node.previousSibling;
        }
      }
    }
  },
    
  /**
   * 対象のノードのオートリンクの既読をチェックする
   *
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  updateAutoLinkVisitedCore : function (targetNode) {
    var uri
    = Components
    .classes ["@mozilla.org/network/standard-url;1"]
    .createInstance (Components.interfaces.nsIURI);
    try {
      uri.spec = targetNode.getAttribute ("dummyhref");
    }
    catch (e) { Akahuku.debug.exception (e);
      return;
    }
    var flag = targetNode.getAttribute ("visited");
        
    var visited = arAkahukuHistory.isVisited (uri);
    if (visited) {
      targetNode.setAttribute ("visited", "true");
    }
    else {
      targetNode.removeAttribute ("visited");
    }
  },
    
  /**
   * 対象のノード以下のオートリンクの既読をチェックする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  updateAutoLinkVisited : function (targetDocument, targetNode) {
    var nodes = targetNode.getElementsByTagName ("a");
        
    for (var i = nodes.length - 1; i >= 0; i --) {
      if (nodes [i].className == "akahuku_generated_link") {
        arAkahukuLink.updateAutoLinkVisitedCore (nodes [i]);
      }
    }
  },
    
  /**
   * 対象のノードのオートリンクのイベントをフックする
   *
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  addAutoLinkEventHandlerCore : function (targetNode) {
    targetNode.addEventListener
    ("mouseover",
     function () {
      arAkahukuLink.onAutoLinkOver (arguments [0]);
    }, false);
        
    targetNode.addEventListener
    ("mouseout",
     function () {
      arAkahukuLink.onAutoLinkOut (arguments [0]);
    }, false);
        
    if (Akahuku.isFx36) {
      /* ドラッグ可能にする */
      targetNode.draggable = true;
      targetNode.addEventListener
      ("dragstart",
       function () {
        arAkahukuLink.onAutoLinkDragStart (arguments [0]);
      }, false);
    }
  },
    
  /**
   * 対象のノード以下のオートリンクのイベントをフックする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  addAutoLinkEventHandler : function (targetDocument, targetNode) {
    var nodes = targetNode.getElementsByTagName ("a");
        
    for (var i = nodes.length - 1; i >= 0; i --) {
      if (nodes [i].className == "akahuku_generated_link") {
        arAkahukuLink.addAutoLinkEventHandlerCore (nodes [i]);
      }
    }
  },
    
  /**
   * プレビューボタンを作る
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String url
   *         プレビュー対象のアドレス
   * @param  HTMLAnchorElement linkNode
   *         リンク要素
   * @return Array
   *         [HTMLAnchorElement プレビューボタン, Function 追加後のコールバック]
   *         作成されなかった場合は null
   */
  createPreviewButton : function (targetDocument, url, linkNode) {
    if (!url.match (/\.([sx]?html?|php|cgi|pl|aspx?|jsp)(\?.*)?(#.*)?$/i)
        && !url.match (/\/(\?.*)?$/i)) {
      var button = targetDocument.createElement ("small");
      button.className = "akahuku_generated";
      button.setAttribute ("__akahuku_autolink_button", "1");
      var target = null;
            
      if (arAkahukuLink.enableAutoLinkPreview
          && (url.match (/^http:\/\/((www\.|m\.)?youtube\.com\/watch\?([^&]+&)*v=|youtu\.be\/)[^&]+/i)
            ||url.match (/\.(jpe?g|gif|png|swf|bmp)(\?.*)?$/i))) {
        button.appendChild (targetDocument.createTextNode
                            ("["));
        
        var span = targetDocument.createElement ("span");
        span.setAttribute ("dummyhref", url);
        span.className = "akahuku_preview_button";
        span.appendChild (targetDocument.createTextNode
                          ("\u898B\u308B"));
        button.appendChild (span);
        target = span;
                
        button.appendChild (targetDocument.createTextNode
                            ("]"));
      }
      
      if (arAkahukuMHT.enable) {
        var param
        = Akahuku.getDocumentParam (targetDocument);
                
        var info = null;
        if (param) {
          info = param.location_info;
        }
            
        if (info
            && info.isReply && !info.isMht
            && !url.match
            (/(http:\/\/[^.]+\.wikipedia.org\/wiki\/)([^<>]*)/)
            && !url.match
            (/^http:\/\/((www\.|m\.)?youtube\.com\/watch\?|youtu\.be\/)/)
            && !url.match (/\.(jpe?g|gif|png|bmp)(\?.*)?$/i)
            && url.match (/\/[^\/]+\.[^\/]+$/i)
            && !url.match (/:\/\/([^\/]+)$/)) {
          button.appendChild (targetDocument.createTextNode
                              ("["));
                    
          span = targetDocument.createElement ("span");
          span.setAttribute ("dummyhref", url);
          span.setAttribute ("save", "0");
          span.style.color = "#c0c0c0";
          span.className = "akahuku_preview_save_button";
          span.appendChild (targetDocument.createTextNode
                            ("MHT \u306B\u542B\u3081\u308B"));
          span.addEventListener
          ("click",
           function () {
            arAkahukuLink.onSaveLinkClick (arguments [0]);
          }, false);
          button.appendChild (span);
                
          button.appendChild (targetDocument.createTextNode
                              ("]"));
        }
      }
        
      if (arAkahukuImage.enable
          && arAkahukuImage.enableAutoLinkPreview) {
        if (url.match (/\.(jpe?g|gif|png|swf|bmp)(\?.*)?$/i)) {
          arAkahukuImage.createSaveImageButton (targetDocument,
                                                button, url,
                                                linkNode);
        }
      }
      
      var f = null;
      
      if (button.firstChild) {
        var param = Akahuku.getDocumentParam (targetDocument);
        var isMHT = false;
        if (param) {
          var info = param.location_info;
          isMHT = info.isMHT;
        }
        
        if (target
            && arAkahukuP2P.enable
            && arAkahukuLink.enableAutoLinkPreviewAutoOpen
            && !isMHT) {
          var file = arAkahukuP2P.getCacheFile (url);
          if (file) {
            f = (function (target) {
                return function () {
                  if (arAkahukuLink.enableAutoLinkPreviewAutoOpenNoQuote) {
                    var font = arAkahukuDOM.findParentNode (target, "font");
                    if (font) {
                      return;
                    }
                  }
                  arAkahukuLink.onPreviewLinkClick (target);
                };
              })(target);
          }
        }
        
        return [button, f];
      }
    }
        
    return null;
  },
    
  /**
   * コメント要素を順方向に検索し取得する
   *
   * @param  HTMLElement node
   *         対象のノード
   * @return HTMLElement
   *         見付からなかった場合は null
   */
  findBQ : function (node) {
    node = node.nextSibling;
    while (node) {
      if (node.nodeName.match (/table|hr/i)) {
        break;
      }
      if (Akahuku.isMessageBQ (node)) {
        return node;
      }
      node = node.nextSibling;
    }
    
    return null;
  },

  /**
   * 画像読み込みエラーの詳細を取得するためのオブザーバー作成
   */
  loadErrorObserverFactory : function ()
  {
    function LoadErrorObserver () {
      this.targetNode = null;
      this.targetURI = null;
      this.registered = false;
    };
    LoadErrorObserver.prototype = {
      statusCodeAttrName : "__akahuku_preview_error_status",
      statusTextAttrName : "__akahuku_preview_error_status_text",
      register : function (node, uriSpec)
      {
        this.targetNode = node;
        this.targetURI
          = Components.classes ["@mozilla.org/network/io-service;1"]
          .getService (Components.interfaces.nsIIOService)
          .newURI (uriSpec, null, null);
        if (!this.registered) {
          this.os
            = Components.classes ["@mozilla.org/observer-service;1"]
            .getService (Components.interfaces.nsIObserverService);
          this.os.addObserver
            (this, "http-on-examine-response", false);
          this.registered = true;
        }
      },
      unregister : function () {
        if (this.registered) {
          this.registered = false;
          this.os.removeObserver
            (this, "http-on-examine-response", false);
        }
      },
      // nsIObserver.observe
      observe : function (subject, topic, data)
      {
        if (topic != "http-on-examine-response")
          return;
        // QueryInterface
        if (!(subject instanceof Components.interfaces.nsIHttpChannel))
          return;
        if (!this.isChannelShouldProcess (subject))
          return;
        if (!subject.requestSucceeded) {
          // エラーの情報をノードに記録
          this.targetNode.setAttribute
            (this.statusCodeAttrName, subject.responseStatus);
          this.targetNode.setAttribute
            (this.statusTextAttrName, subject.responseStatusText);
        }
      },
      // 処理すべきチャネルの判定
      // FIXME: URI単位より確実な判定方法はないものか...
      isChannelShouldProcess : function (channel)
      {
        if (!channel.URI.equals (this.targetURI)
            && !channel.originalURI.equals (this.targetURI) ) {
          return false;
        }
        try { // リクエスト生成元の同一判定
          var callbacks = channel.notificationCallbacks;
          if (!callbacks && channel.loadGroup) {
            callbacks = channel.loadGroup.notificationCallbacks;
          }
          var contextWindow
            = callbacks.getInterface (Components.interfaces.nsILoadContext)
            .associatedWindow;
          if (contextWindow.document != this.targetNode.ownerDocument) {
            return false;
          }
        }
        catch (e) { Akahuku.debug.exception (e);
          return false;
        }
        return true;
      },
    };

    return new LoadErrorObserver ();
  },
  
  /**
   * プレビュー画像読み込みの完了イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onImageLoad : function (event) {
    var image = event.currentTarget;
    if (!image.parentNode) return;
    if (image.parentNode.hasAttribute ("__akahuku_preview_error")
        && !Akahuku.protocolHandler.isAkahukuURI (image.src)) {
      /* エラー後に第三者が画像を差し替え */
      var src = image.src;
      if (/^data:/.test (src)) {
        src = src.substring (0, 32); /* たいてい長すぎるので割愛 */
      }
      Akahuku.debug.log ("arAkahukuLink.onImageLoad aborted: " + src);
      return;
    }
    if (image.naturalWidth
        && image.naturalHeight) {
      var w = 0;
      if (image.naturalWidth < 250
          && image.naturalHeight < 250) {
        w = image.naturalWidth;
        image.setAttribute ("width", image.naturalWidth);
        image.setAttribute ("height", image.naturalHeight);
      }
      else {
        w = 250;
        if (image.naturalWidth > image.naturalHeight) {
          image.width = 250;
          image.height
            = 250 * image.naturalHeight
            / image.naturalWidth;
        }
        else {
          image.width
            = 250 * image.naturalWidth
            / image.naturalHeight;
          image.height = 250;
        }
      }
      
      if (arAkahukuThread.enableReplyAvoidWrap) {
        var div = arAkahukuDOM.findParentNode (image, "div");
        
        var container = Akahuku.getMessageContainer (image);
        if (container) {
          var bqs = Akahuku.getMessageBQ (container.main);
          if (bqs.length) {
            var bq = bqs [0];
            
            if (!bq.hasAttribute ("__akahuku_margin_left")) {
              if (bq.style.marginLeft) {
                bq.setAttribute ("__akahuku_margin_left_original",
                                        bq.style.marginLeft);
              }
              bq.setAttribute ("__akahuku_margin_left", 1);
            }
            bq.style.marginLeft = div.offsetWidth + "px";
            bq.style.display = "none";
            setTimeout
              ((function (node) {
                  return function () {
                    node.style.display = "";
                  };
                })(bq), 10);
          }
        }
      }
    }
    
    image.parentNode.removeAttribute ("__akahuku_preview_error");
    /* エラーを消す */
    if (image.nextSibling
        && "className" in image.nextSibling
        && image.nextSibling.className == "akahuku_preview_error") {
      image.parentNode.removeChild (image.nextSibling);
    }
  },
    
  /**
   * 画像読み込みの失敗イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onImageError : function (event) {
    var image = event.currentTarget;
    var targetDocument = event.currentTarget.ownerDocument;
        
    var status = 0;
    var statusText = "Not connected?";
        
    // LoadErrorObserver が記録したエラー情報を取得
    var attr = "__akahuku_preview_error_status";
    if (image.hasAttribute (attr)) {
     status = parseInt (image.getAttribute (attr));
     image.removeAttribute (attr);
    }
    attr = "__akahuku_preview_error_status_text";
    if (image.hasAttribute (attr)) {
     statusText = image.getAttribute (attr);
     image.removeAttribute (attr);
    }
        
    if (!image.parentNode.hasAttribute
        ("__akahuku_preview_error")) {
      var node
      = arAkahukuLink.createError (targetDocument, status, statusText);
      image.parentNode.setAttribute
      ("__akahuku_preview_error", 1);
      if (image.nextSibling) {
        image.parentNode.insertBefore (node,
                                       image.nextSibling);
      }
      else {
        image.parentNode.appendChild (node);
      }
    }
  },
                    
  /**
   * プレビュー画像が取得できなかった場合の警告を作成する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Number status
   *         ステータス
   * @param  String statusText
   *         ステータスのテキスト
   * @return HTMLSpanElement
   *         警告の span 要素
   */
  createError : function (targetDocument, status, statusText) {
    var node = targetDocument.createElement ("span");
    node.className = "akahuku_preview_error";
    var text = "";
    if (status == 404) {
      text = "\u30D5\u30A1\u30A4\u30EB\u304C\u7121\u3044\u3088";
    }
    else if (status == 403) {
      text = "\u6A29\u9650\u304C\u306A\u3044\u3088";

    }
    else if (status == 401) {
      text = "\u8A8D\u8A3C\u304C\u8981\u308B\u3088";
    }
    else {
      text
      = "\u30A8\u30E9\u30FC\u3060\u3088 "
      + "(" + status
      + " " + statusText + ")";
    }
    node.appendChild (targetDocument.createTextNode (text));
        
    return node;
  },
    
  /**
   * プレビュー画像のノードを作成する
   *
   * @param  String uri
   *         プレビュー画像の URI
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @return HTMLImageElement
   *         プレビュー画像の img 要素
   */
  createImage : function (uri, targetDocument) {
    var image;
        
    if (uri.match (/\.(jpe?g|gif|png|bmp)$/i)) {
      image = targetDocument.createElement ("img");
      image.style.maxWidth = "250px";
      image.style.maxHeight = "250px";
      image.style.borderWidth = "0px";
      image.title = uri;
      // HTTPレスポンスを直に監視してエラー情報を得る
      var observer = arAkahukuLink.loadErrorObserverFactory ();
      observer.register (image, uri);
      image.addEventListener
        ("DOMNodeRemoved", function () {
          observer.unregister ();
        }, false);
      image.addEventListener
        ("load",
         function () {
          observer.unregister ();
          arAkahukuLink.onImageLoad (arguments [0]);
        }, false);
      image.addEventListener
        ("error",
         function () {
          observer.unregister ();
          arAkahukuLink.onImageError (arguments [0]);
        }, false);
    }
    else if (uri.match (/\.(swf)(\?.*)?$/i)) {
      image = targetDocument.createElement ("embed");
      image.width = arAkahukuLink.autoLinkPreviewSWFWidth;
      image.height = arAkahukuLink.autoLinkPreviewSWFHeight;
      if (RegExp.$2) {
        var flashvars = RegExp.$2;
        image.src
          = Akahuku.protocolHandler.enAkahukuURI
            ("preview", uri.substring (0, uri.length - flashvars.length));
        image.setAttribute ("flashvars", flashvars);
      }
      image.type = "application/x-shockwave-flash";
      image.setAttribute ("allowFullScreen", "true");
      image.setAttribute ("allowScriptAccess", "never");
    }
    else if (uri.match (/^http:\/\/(?:(?:www\.|m\.)?youtube\.com\/watch\?(?:[^&]+&)*v=|youtu\.be\/)([^&?#]+)/i)) {
      var youtubeUrl = "http://www.youtube.com/embed/" + RegExp.$1
                     + "?rel=0&border=0&fs=1&showinfo=1";
      var t = 0;
      if (uri.match (/[?&#]t=(?:([0-9]+)h)?(?:([0-9]+)m)?([0-9]+)s/)) {
        t = parseInt (RegExp.$3)
          + parseInt (RegExp.$2 || 0) * 60
          + parseInt (RegExp.$1 || 0) * 3600;
      }
      else if (uri.match (/[?&#]t=([0-9]+)/)) {
        t = parseInt (RegExp.$1)
      }
      if (t > 0) {
        youtubeUrl += "&start=" + t;
      }
      image = targetDocument.createElement ("iframe");
      image.width = Math.max (480, arAkahukuLink.autoLinkPreviewSWFWidth);
      image.height = Math.max (385, arAkahukuLink.autoLinkPreviewSWFHeight);
      image.src //= youtubeUrl;
        = Akahuku.protocolHandler.enAkahukuURI ("preview", youtubeUrl);
      image.setAttribute ("frameborder", "0");
      /* (Gecko 10.0+) moz HTML5 Fullscreen */
      image.setAttribute ("mozallowfullscreen", "true");
    }
    else {
      Akahuku.debug.warn ("Unknown preview uri pattern: "+uri);
      image = targetDocument.createElement ("img");
      image.className = "akahuku_preview";
      return image;
    }
        
    image.style.cssFloat = "left";
    image.style.clear = "left";
    image.className = "akahuku_preview";
    image.style.margin = "0px 20px 0px 20px";
    image.setAttribute ("dummyhref", uri);
        
    if (Akahuku.protocolHandler.isAkahukuURI (uri)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (uri);
      if (p.type == "p2p") {
        image.setAttribute ("__akahuku_p2p", "1");
      }
    }
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var src = "";
        
    if (info.isMht) {
      /* リンク先のファイルが mht 内に存在するかどうかチェック */
      try {
        var contentLocation
          = Components.classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
        contentLocation.spec = uri;
                
        var requestOrigin
          = Components.classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
        requestOrigin.spec = targetDocument.location.href;
                
        var uri2 = UnMHT.getMHTFileURI (contentLocation, requestOrigin);
        if (uri2) {
          /* UnMHT の出力の場合、リファラは送信されず、
           * また更に mht で保存する事はないので、アドレス直で OK */
          src = uri2.spec;
        }
        else {
          src = uri;
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        src = uri;
      }
    }
    else {
      if (Akahuku.protocolHandler.isAkahukuURI (uri)
          && Akahuku.protocolHandler.getAkahukuURIParam (uri).type
          == "p2p") {
        src = uri;
      }
      else if (arAkahukuP2P.enable
               && uri.match
               (/^http:\/\/www\.(nijibox)5\.com\/futabafiles\/(tubu)\/(src)\/([A-Za-z0-9]+)\.(jpg|png|gif)(\?.*)?$/)) {
        src = arAkahukuP2P.enP2P (uri);
      }
      else {
        src = Akahuku.protocolHandler.enAkahukuURI ("preview", uri);
      }
    }
        
    if (typeof (noscriptOverlay) != "undefined"
        && uri.match (/\.(swf)(\?.*)?$/i)) {
      /* NoScript があれば解除する */
      try {
        uri2 = targetDocument.location.href;
        uri2
        = uri2.replace
        (/^([^\/]+:\/\/\/?[^\/]+)\/.+$/, "$1");
                
        var enabled = false;
                
        try {
          enabled = noscriptOverlay.ns.isJSEnabled (uri2);
        }
        catch (e) { Akahuku.debug.exception (e);
        }
                
        if (!enabled) {
          noscriptOverlay.safeAllow
          (uri2, true, true);
        }
                
        noscriptOverlay.safeAllow (src, true, true);
                
        if (!enabled) {
          setTimeout (function (uri2) {
              noscriptOverlay.safeAllow (uri2, false, false);
            }, 3000, uri2);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    if (!image.src) {
      image.src = src;
    }
        
    return image;
  },
    
  /**
   * プレビューのアンカーの状態を変更する
   *
   * @param  HTMLAnchorElement target
   *         対象のアンカー
   * @param  Boolean opened
   *         今のイベントで開かれたかどうか
   */
  updateButton : function (target, opened) {
    var owner = arAkahukuDOM.findParentNode (target, "blockquote");
    if (!owner) {
      owner = arAkahukuDOM.findParentNodeByClassName (target, "t");
    }
    if (!owner) {
      owner = arAkahukuDOM.findParentNodeByClassName (target, "re");
    }
    if (!owner) {
      /* メル欄の場合 */
      owner = arAkahukuDOM.findParentNode (target, "font");
      if (!owner) {
        return;
      }
    }
        
    if (!arAkahukuLink.enableAutoLinkPreviewMulti) {
      /* 他のアンカーを閉じる */
      var nodes = owner.getElementsByTagName ("span");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].className == "akahuku_preview_button"
            && nodes [i] != target) {
          nodes [i].replaceChild (target.ownerDocument.createTextNode
                                  ("\u898B\u308B"),
                                  nodes [i].firstChild);
        }
      }
    }
        
    /* 自分の状態を変える */
    if (opened) {
      target.replaceChild (target.ownerDocument.createTextNode
                           ("\u9589\u3058\u308B"),
                           target.firstChild);
    }
    else {
      target.replaceChild (target.ownerDocument.createTextNode
                           ("\u898B\u308B"),
                           target.firstChild);
    }
  },
    
  /**
   * プレビューボタンをクリックしたイベント
   *
   * @param  HTMLSpanElement target
   *         プレビューボタン
   */
  onPreviewLinkClick : function (target) {
    var targetDocument = target.ownerDocument;
        
    var blockquote = arAkahukuDOM.findParentNode (target, "blockquote");
    if (!blockquote) {
      blockquote = arAkahukuDOM.findParentNodeByClassName (target, "t");
    }
    if (!blockquote) {
      blockquote = arAkahukuDOM.findParentNodeByClassName (target, "re");
    }
    if (!blockquote) {
      /* メル欄の場合 */
      var node = target;
      while (node
             && (node.parentNode.nodeName.toLowerCase () == "small"
                 || node.parentNode.nodeName.toLowerCase () == "font"
                 || node.parentNode.nodeName.toLowerCase () == "b")) {
        node = node.parentNode;
      }
            
      if (!node) {
        return false;
      }
      
      blockquote
        = arAkahukuLink.findBQ (node);
      if (!blockquote) {
        return false;
      }
    }
    
    var isReply = false;
    var container = Akahuku.getMessageContainer (blockquote);
    if (container) {
      isReply = true;
    }
    
    var node;
    if (isReply) {
      node = blockquote.previousSibling;
    }
    else {
      node = blockquote.nextSibling;
    }
        
    var opening = false;
    if (target.firstChild.nodeValue.match (/\u898B\u308B/)) {
      opening = true;
    }
        
    /* 画像読込を即中止させる */
    function forceCancelImageLoad (node) {
      var image = node.getElementsByTagName ("img") [0];
      if (!image) return;
      try {
        var content
          = image.QueryInterface
            (Components.interfaces.nsIImageLoadingContent);
        var request
          = content.getRequest
          (Components.interfaces.nsIImageLoadingContent.PENDING_REQUEST);
        if (request) {
          request.cancel (Components.results.NS_BINDING_ABORTED);
        }
        request
          = content.getRequest
          (Components.interfaces.nsIImageLoadingContent.CURRENT_REQUEST);
        if (request) {
          request.cancel (Components.results.NS_BINDING_ABORTED);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        /* 次善の策 */
        image.removeAttribute ("src");
      }
    }
        
    arAkahukuLink.updateButton (target, opening);
        
    if (opening) {
      /* 自分を見る時 */
      if (node
          && node.nodeName.toLowerCase () == "div"
          && "className" in node
          && node.className == "akahuku_preview_container") {
        if (!arAkahukuLink.enableAutoLinkPreviewMulti) {
          /* 複数表示しない場合は前のを消す */
          forceCancelImageLoad (node.firstChild);
          node.removeChild (node.firstChild);
        }
      }
      else {
        /* コンテナが無い場合は作る */
        var node = targetDocument.createElement ("div");
        node.className = "akahuku_preview_container";
        node.style.cssFloat = "left";
        node.style.clear = "left";
        if (isReply) {
          blockquote.parentNode.insertBefore (node, blockquote);
        }
        else {
          blockquote.parentNode.insertBefore (node,
                                              blockquote.nextSibling);
        }
      }
            
      var image
        = arAkahukuLink.createImage
        (target.getAttribute ("dummyhref"),
         targetDocument);
      var uri = target.getAttribute ("dummyhref");
            
      if (uri.match (/\.(jpe?g|gif|png|bmp)$/i)) {
        var anchor = targetDocument.createElement ("a");
        arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
        if (Akahuku.protocolHandler.isAkahukuURI (uri)) {
          var p = Akahuku.protocolHandler.getAkahukuURIParam (uri);
          if (p.type == "p2p") {
            anchor.setAttribute ("__akahuku_p2p", "1");
          }
        }
        anchor.className = "akahuku_generated_link";
        anchor.setAttribute ("dummyhref",
                             uri);
        arAkahukuLink.updateAutoLinkVisitedCore (anchor);
        anchor.appendChild (image);
        node.appendChild (anchor);
      }
      else {
        if ("noscriptOverlay" in window) {
          setTimeout (function (node, image) {
              node.appendChild (image);
            }, 500, node, image);
        }
        else {
          node.appendChild (image);
        }
      }
    }
    else {
      /* 自分を閉じる時 */
      if (!arAkahukuLink.enableAutoLinkPreviewMulti) {
        /* 複数表示しない場合はコンテナを消す */
        if (blockquote.hasAttribute ("__akahuku_margin_left")) {
          blockquote.style.marginLeft = 
            blockquote.getAttribute ("__akahuku_margin_left_original");
          blockquote.removeAttribute ("__akahuku_margin_left_original");
          blockquote.removeAttribute ("__akahuku_margin_left");
        }
        forceCancelImageLoad (node);
        node.parentNode.removeChild (node);
      }
      else {
        var node2 = node.firstChild;
        while (node2) {
          if (node2
              && node2.getAttribute ("dummyhref")
              == target.getAttribute ("dummyhref")) {
            forceCancelImageLoad (node2);
            node2.parentNode.removeChild (node2);
            break;
          }
          /*  Flashblock のプレースホルダ */
          if (node2
              && node2.nodeName.toLowerCase () == "div"
              && node2.hasAttribute ("srcattribute")
              && Akahuku.deAkahukuURI (node2.getAttribute ("srcattribute"), "preview")
              == target.getAttribute ("dummyhref")) {
            node2.parentNode.removeChild (node2);
            break;
          }
                    
          node2 = node2.nextSibling;
        }
        if (!node.firstChild) {
          /* 1つも無くなった時はコンテナを消す */
          if (blockquote.hasAttribute ("__akahuku_margin_left")) {
            blockquote.style.marginLeft = 
              blockquote.getAttribute ("__akahuku_margin_left_original");
            blockquote.removeAttribute ("__akahuku_margin_left_original");
            blockquote.removeAttribute ("__akahuku_margin_left");
          }
          node.parentNode.removeChild (node);
        }
      }
    }
        
    return false;
  },
    
  /**
   * MHT に含める ボタンをクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSaveLinkClick : function (event) {
    var targetDocument = event.target.ownerDocument;
    var target = event.explicitOriginalTarget;
    if (target.nodeName.toLowerCase () != "span") {
      target = arAkahukuDOM.findParentNode (target, "span");
    }
        
    var save = target.getAttribute ("save");
    if (save == "1") {
      target.setAttribute ("save", "0");
      target.style.color = "#c0c0c0";
    }
    else {
      target.setAttribute ("save", "1");
      target.style.color = "#ff0000";
    }
        
    return false;
  },
    
  /**
   * メル欄表示、オートリンクを適用する
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
    
    var now = new Date ().getTime ();
    if (now > arAkahukuLink.lastCleanuped + 60 * 1000) {
      for (var key in arAkahukuLink.targetLinks) {
        if (now > arAkahukuLink.targetLinks [key] + 60 * 1000) {
          delete arAkahukuLink.targetLinks [key];
        }
      }
    }
    
    if (info.isCatalog) {
      if (arAkahukuLink.enableHideTrolls
          && !arAkahukuLink.enableHideTrollsNoCat) {
        arAkahukuLink.applyHideTrolls (targetDocument,
                                       targetDocument);
      }
    }
    else {
      if (arAkahukuLink.enableShowMail
          || arAkahukuLink.enableShowMailPopup) {
        arAkahukuLink.applyShowMail (targetDocument,
                                     targetDocument);
      }
            
      if (arAkahukuLink.enableAutoLink
          || arAkahukuLink.enableHideTrolls) {
        arAkahukuLink.applyAutoLink (targetDocument,
                                     targetDocument);
      }
    }
  },
  
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsINavHistoryObserver
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsINavHistoryObserver)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },

  /**
   * URI 削除前イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  String aGUID
   *         ページの GUID
   */
  onBeforeDeleteURI : function  (aURI, aGUID) {
  },
  
  /**
   * バッチ開始イベント
   *   nsINavHistoryObserver.onBeginUpdateBatch
   */
  onBeginUpdateBatch : function () {
  },
  
  /**
   * 履歴クリアイベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   */
  onClearHistory : function () {
  },

  /**
   * URI 削除イベント
   *   nsINavHistoryObserver.onDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  String aGUID
   *         ページの GUID
   */
  onDeleteURI : function (aURI, aGUID) {
  },

  /**
   * 履歴削除イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aVisitTime
   *         最終訪問時間 [ms]
   * @param  String aGUID
   *         ページの GUID
   */
  onDeleteVisits : function (aURI, aVisitTime, aGUID) {
  },

  /**
   * バッチ終了イベント
   *   nsINavHistoryObserver.onEndUpdateBatch
   *
   * @param  nsIURI aURI
   *         対象の URI
   */
  onEndUpdateBatch : function () {
  },

  /**
   * ページ情報変更イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aWhat
   *         対象のキー
   * @param  String aValue
   *         対象の値
   */
  onPageChanged : function (aURI, aWhat, aValue) {
  },

  /**
   * 履歴期限切れイベント
   *   nsINavHistoryObserver.onPageExpired
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aVisitTime
   *         最終訪問時間 [ms]
   * @param  Boolean aWholeEntry
   *         全項目が削除中か
   */
  onPageExpired : function (aURI, aVisitTime, aWholeEntry) {
  },

  /**
   * タイトル変更イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  String aPageTitle
   *         ページタイトル
   */
  onTitleChanged : function (aURI, aPageTitle) {
  },

  /**
   * 履歴追加イベント
   *   nsINavHistoryObserver.onVisit
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aVisitID
   *         履歴の項目の ID
   * @param  Number aTime
   *         訪問時間 [ms]
   * @param  Number aSessionID,
   *         セッション ID
   * @param  Number aReferringID,
   *         遷移元の履歴の項目の ID
   *         なければ 0
   * @param  Number aTransitionType
   *         遷移方法 ?
   * @param  String aGUID
   *         ページの GUID
   */
  onVisit : function (aURI, aVisitID, aTime, aSessionID, aReferringID,
                      aTransitionType, aGUID) {
    var spec = aURI.spec;
    
    if (!(spec in arAkahukuLink.targetLinks)) {
      return;
    }
    
    var now = new Date ().getTime ();
    
    if (now > arAkahukuLink.targetLinks [spec] + 30 * 1000) {
      return;
    }
    
    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      var targetDocument = Akahuku.documentParams [i].targetDocument;
      arAkahukuLink.updateAutoLinkVisited (targetDocument, targetDocument);
    }
  }
};
