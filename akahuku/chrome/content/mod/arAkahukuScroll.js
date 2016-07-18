/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuDocumentParam,
 *          arAkahukuDOM, arAkahukuThread, arAkahukuWheel, arAkahukuWindow
 */

/**
 * スクロール管理
 *  [スクロール]
 */
var arAkahukuScroll = {
  enableLock : false,            /* Boolean  位置のズレを直す */
  enableLockReply : false,       /* Boolean  レス送信モードのみ */
  enableGoTop : false,           /* Boolean  0 〜 10ページのリロード時に
                                  *   先頭へ */
    
  enableGoCurrentReload : false,         /* Boolean  レス送信モードで
                                          *   リロード時に最新位置へ */
  enableGoCurrentRule : false,           /* Boolean  区切り */
  enableGoCurrentRuleZeroHeight : false, /* Boolean  ズレないようにする */
  enableGoCurrentRuleRandom : false,     /* Boolean  ランダム */
    
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
      if (!info.isFutaba || info.isLogch || info.isFutasuke) {
        /* ユーザースタイルシートが効かないので指定しなおす */
                
        if (arAkahukuScroll.enableGoCurrentRuleZeroHeight) {
          style
          .addRule ("img",
                    "position: relative; "
                    + "z-index: 99;");
          /* -moz-hidden-unscrollable を設定すると
           *  z-index が img より上になってクリックできなくなるので
           * スレ画像の img の z-index をさらに上にする */
        }
      }
    }
        
    if (info.isReply) {
      /* レス送信モード */
            
      if (arAkahukuScroll.enableGoCurrentRule) {
        style
        .addRule ("#akahuku_new_reply_header_number",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;");
      }
    }
  },
    
  /**
   * スタイルファイルのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  setStyleFile : function (style) {
    if (arAkahukuScroll.enableGoCurrentRuleZeroHeight) {
      style
      .addRule ("img",
                "position: relative; z-index: 99;");
      /* -moz-hidden-unscrollable を設定すると
       *  z-index が img より上になってクリックできなくなるので
       * スレ画像の img の z-index をさらに上にする */
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuScroll.enableLock
    = arAkahukuConfig
    .initPref ("bool", "akahuku.scroll.lock", false);
    if (arAkahukuScroll.enableLock) {
      arAkahukuScroll.enableLockReply
        = arAkahukuConfig
        .initPref ("bool", "akahuku.scroll.lock.reply", false);
    }
    arAkahukuScroll.enableGoTop
    = arAkahukuConfig
    .initPref ("bool", "akahuku.scroll.gotop", false);
    arAkahukuScroll.enableGoCurrentReload
    = arAkahukuConfig
    .initPref ("bool", "akahuku.scroll.gocurrent.reload", false);
    arAkahukuScroll.enableGoCurrentRule
    = arAkahukuConfig
    .initPref ("bool", "akahuku.scroll.gocurrent.rule", false);
    if (arAkahukuScroll.enableGoCurrentReload) {
      arAkahukuScroll.enableGoCurrentRuleZeroHeight
        = arAkahukuConfig
        .initPref ("bool", "akahuku.scroll.gocurrent.rule.zeroheight",
                   false);
      arAkahukuScroll.enableGoCurrentRuleRandom
        = arAkahukuConfig
        .initPref ("bool", "akahuku.scroll.gocurrent.rule.random",
                   true);
    }
  },
    
  /**
   * 現在の最終レスを保存する
   * 
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  setCurrentReply : function (targetDocument, info) {
    if (arAkahukuScroll.enableGoCurrentReload
        && info.isReply) {
      var lastReply = arAkahukuThread.getLastReply (targetDocument);
      if (lastReply) {
        var browser
          = arAkahukuWindow.getBrowserForWindow
          (targetDocument.defaultView);
        if (browser) {
          browser.__akahuku_lastreply = lastReply.num;
          browser.__akahuku_lastthread = info.threadNumber;
        }
      }
    }
  },
    
  /**
   * 現在のレス位置に移動して、必要ならば区切を作る
   *
   * @param  Window targetWindow
   *         対象のウィンドウ
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  goCurrent : function (targetWindow, info) {
    var targetDocument = targetWindow.document;
    var lastReply = 0;
    var findNext = false;
    var i;
        
    if (!lastReply && arAkahukuScroll.enableGoCurrentReload) {
      /* リロード後かどうかチェック */
      var browser
        = arAkahukuWindow.getBrowserForWindow (targetWindow);
      if (browser) {
        if (info.threadNumber == browser.__akahuku_lastthread) {
          /* リロード後だった */
          lastReply = browser.__akahuku_lastreply;
          findNext = true;
        }
      }
    }
        
    if (lastReply) {
      /* 前のレスが分かる場合 */
            
      var nodes = Akahuku.getMessageBQ (targetDocument);
      var node = null;
      for (var i = nodes.length - 1; i >= 0; i --) {
        var num = Akahuku.getMessageNum (nodes [i]);
                
        if (num == lastReply) {
          node = nodes [i];
          break;
        }
      }
            
      if (arAkahukuScroll.enableGoCurrentRule) {
        /* 区切りを表示する */
        if (node) {
          var container = Akahuku.getMessageContainer (node);
          var show = true;
          if (container) {
            var containerLast = container.nodes [container.nodes.length - 1];
          }
          
          if (container) {
            if (findNext) {
              /* レスが増えている場合のみ区切りを表示するので
               * 次のレスがあるかどうか探す */
              show = false;
              var node = containerLast.nextSibling;
              while (node) {
                if (node.nodeName.toLowerCase () == "br") {
                  break;
                }
                if (node.nodeName.toLowerCase () == "table"
                    && node.getElementsByTagName ("blockquote").length > 0) {
                  /* 次のレスがあるので区切りを表示する */
                  show = true;
                  break;
                }
                if (node.nodeName.toLowerCase () == "div"
                    && arAkahukuDOM.hasClassName (node, "r")) {
                  /* 次のレスがあるので区切りを表示する */
                  show = true;
                  break;
                }
                node = node.nextSibling;
              }
            }
          }
          else {
            show = false;
          }
                    
          if (show && containerLast) {
            var newReplyHeader
            = arAkahukuThread.createNewReplyHeader
            (targetDocument,
             arAkahukuScroll.enableGoCurrentRuleZeroHeight,
             arAkahukuScroll.enableGoCurrentRuleRandom);
                        
            containerLast.parentNode.insertBefore
            (newReplyHeader,
             containerLast.nextSibling);
          }
        }
      }
            
      /* 前のレス周辺にスクロール */
      var y = -64;
      for (var tmp = node; tmp; tmp = tmp.offsetParent) {
        y += tmp.offsetTop;
      }
      if (y < 0) {
        y = 0;
      }
            
      targetWindow.scrollTo (0, y);
    }
        
    var headerNumber
    = targetDocument.getElementById ("akahuku_new_reply_header_number");
    if (headerNumber) {
      var count = 0;
            
      var num = 0;
      var node;
      var nodes = Akahuku.getMessageBQ (targetDocument);
            
      for (var i = nodes.length - 1; i >= 0; i --) {
        node = nodes [i];
                
        while (node) {
          if (node.nodeName.toLowerCase () == "#text"
              && node.nodeValue.match (/No\.([0-9]+)/)) {
            num = parseInt (RegExp.$1);
            if (num > parseInt (lastReply)) {
              count ++;
            }
          }
                    
          node = node.previousSibling;
        }
      }
            
      arAkahukuDOM.setText (headerNumber, count);
    }
  },
    
  /**
   * ウィンドウがスクロールしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onScroll : function (event, browser) {
    var targetWindow = null;
    if ("defaultView" in event.target) {
      targetWindow = event.target.defaultView;
    }
    else if ("ownerDocument" in event.target) {
      targetWindow = event.target.ownerDocument.defaultView;
    }
    else {
      return;
    }
        
    browser.__lastScrollY = targetWindow.scrollY;
  },
    
  /**
   * body の unload イベント
   * データを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  onBodyUnload : function (targetDocument, documentParam) {
    if (documentParam.gotop_scroll) {
      documentParam.gotop_scroll
      = false;
            
      var targetWindow = targetDocument.defaultView;
      var browser
      = arAkahukuWindow.getBrowserForWindow (targetWindow);
      if (browser) {
        browser.__akahuku_gotop_scrolled = true;
      }
      targetWindow.scrollTo (0, 0);
    }
  },
    
  /**
   * 指定位置にスクロールする
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
    var targetWindow = targetDocument.defaultView;
        
    var scrolled = false;
        
    if (arAkahukuScroll.enableGoCurrentReload
        && info.isReply && info.isOnline) {
      arAkahukuScroll.goCurrent (targetWindow, info);
            
      if (arAkahukuScroll.enableGoCurrentReload) {
        arAkahukuScroll.setCurrentReply (targetDocument, info);
      }
            
      scrolled = true;
    }
        
    var browser = arAkahukuWindow.getBrowserForWindow (targetWindow);
        
    if (!scrolled
        && info.isNormal && arAkahukuWheel.enableReloadLoop) {
      if (browser
          && "__akahuku_gobottom" in browser
          && browser.__akahuku_gobottom) {
        /* ループで末尾にスクロール */
        browser.__akahuku_gobottom = false;
        browser.removeAttribute ("__akahuku_gobottom");
        targetWindow.scrollTo
          (0,
           targetDocument.documentElement.scrollHeight);
        targetWindow.setTimeout (function () {
            targetWindow.scrollTo
              (0,
               targetDocument.documentElement.scrollHeight);
          }, 100);
        scrolled = true;
      }
    }
        
    if (!scrolled
        && arAkahukuScroll.enableGoTop && info.isNormal) {
      if (browser
          && "__akahuku_gotop_scrolled" in browser
          && browser.__akahuku_gotop_scrolled) {
        /* リロード前にページトップにスクロールしていた場合はスクロールしない */
        browser.__akahuku_gotop_scrolled = false;
        browser.removeAttribute ("__akahuku_gotop_scrolled");
        scrolled = true;
      }
      else {
        targetWindow.scrollTo (0, 0);
        scrolled = true;
      }
    }
        
    if (!scrolled && arAkahukuScroll.enableLock
        && (!arAkahukuScroll.enableLockReply || info.isReply)) {
      /* 他のスクロールが行われない場合に
       * リロード前の位置にスクロールする */
      if (browser) {
        if (targetWindow.scrollY > 0) {
          if (browser.__lastScrollY) {
            targetWindow.scrollTo (targetWindow.scrollX,
                                   browser.__lastScrollY);
          }
        }
                
        targetWindow.addEventListener
        ("scroll",
         function () {
          arAkahukuScroll.onScroll (arguments [0], browser);
        }, false);
      }
    }
  }
};
