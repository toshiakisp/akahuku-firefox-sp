/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuCatalog, arAkahukuConfig, arAkahukuReload,
 *          arAkahukuWheel, arAkahukuWindow
 */

/**
 * ホイール管理
 *   [ページの末尾のホイール n 回操作でリロード]
 */
var arAkahukuWheel = {
  enableReload : false,          /* Boolean ページ末尾のホイール n 回操作
                                  *   でリロード */
  enableReload0 : false,         /* Boolean 0 ページ */
  enableReload1 : false,         /* Boolean 1 〜 */
  enableReloadLoop : false,      /* Boolean ループ */
  enableReloadReply : false,     /* Boolean レス送信 */
  enableReloadReplySync : false, /* Boolean 同期 */
  enableReloadCatalog : false,   /* Boolean カタログ */
  enableReloadAll : false,       /* Boolean 全てのページ */
  reloadThreshold : 3,           /* Number  n 回操作 */
    
    
  count : 0,           /* Number  ホイールの操作回数 */
  timeoutID : null,       /* Number  最新のタイムアウトの ID */
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuWheel.enableReload
    = arAkahukuConfig
    .initPref ("bool", "akahuku.wheel.reload", true);
    if (arAkahukuWheel.enableReload) {
      Akahuku.reloadThreshold
        = arAkahukuConfig
        .initPref ("int",  "akahuku.wheel.reload.threshold", 3);
      arAkahukuWheel.enableReload0
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.0", true);
      arAkahukuWheel.enableReload1
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.1", true);
      arAkahukuWheel.enableReloadReply
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.reply", true);
      arAkahukuWheel.enableReloadReplySync
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.reply.sync", false);
      arAkahukuWheel.enableReloadCatalog
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.catalog", true);
      arAkahukuWheel.enableReloadAll
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.all", false);
      arAkahukuWheel.enableReloadLoop
        = arAkahukuConfig
        .initPref ("bool", "akahuku.wheel.reload.loop", false);
    }
  },

  /**
   * ホイールを回したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onWheel : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var targetWindow = targetDocument.defaultView;
            
      var tabbrowser = document.getElementById ("content");
      var selectedBrowser;
      if ("selectedBrowser" in tabbrowser) {
        selectedBrowser = tabbrowser.selectedBrowser;
      }
      else {
        selectedBrowser = tabbrowser;
      }
            
      var documentParam
      = Akahuku.getDocumentParam (targetDocument);
      var info = null;
      if (documentParam) {
        info = documentParam.location_info;
      }
      var status = document.getElementById ("statusbar-display");
            
      var wheelDelta = event.detail;
      var ok = true;
      var up = false;
            
      if (wheelDelta < 0
          || targetWindow.scrollY < targetWindow.scrollMaxY) {
        /* ページ末尾以外、もしくは上方向 */
        ok = false;
      }
            
      if (info
          && info.isNormal && arAkahukuWheel.enableReloadLoop
          && wheelDelta < 0
          && targetWindow.scrollY == 0) {
        /* ループの場合上方向もアリ */
        up = true;
        ok = true;
      }
            
      if (!ok) {
        selectedBrowser.setAttribute ("__akahuku_wheel_count", 0);
                
        return;
      }
            
      var now = (new Date ()).getTime ();
            
      var lastReloadTime = 0;
      if (selectedBrowser.hasAttribute ("__akahuku_last_reload")) {
        lastReloadTime
          = parseInt (selectedBrowser.getAttribute
                      ("__akahuku_last_reload"));
      }
      if (now < lastReloadTime + 5000) {
        /* 最後のリロードから時間が経っていない場合待つ */
                
        var text = "\u3061\u3087\u3063\u3068\u5F85\u3063\u3066\u306D";
                
        if (status) {
          status.label = text;
        }
                
        /* timeout が設定済みならリセットして再設定 */
        clearTimeout (arAkahukuWheel.timeoutID);
        arAkahukuWheel.timeoutID =
          setTimeout (function (status, text) {
              try {
                if (status.label == text) {
                  status.label = "";
                }
              }
              catch (e) { Akahuku.debug.exception (e);
              }
              arAkahukuWheel.timeoutID = null;
            }, Math.max (1000, lastReloadTime + 5000 - now),
            status, text);
                
        return;
      }
            
      var lastWheelTime = 0;
      if (selectedBrowser.hasAttribute ("__akahuku_last_wheel")) {
        lastWheelTime
          = parseInt (selectedBrowser.getAttribute
                      ("__akahuku_last_wheel"));
      }
      selectedBrowser.setAttribute ("__akahuku_last_wheel", now);
            
      var wheelCount = 0;
      if (selectedBrowser.hasAttribute ("__akahuku_wheel_count")) {
        wheelCount
          = parseInt (selectedBrowser.getAttribute
                      ("__akahuku_wheel_count"));
      }
            
      if (now >= lastWheelTime + 500) {
        /* 最後の操作から時間が経っている場合回数をリセットする */
                
        wheelCount = 0;
      }
      wheelCount ++;
            
      if (wheelCount >= Akahuku.reloadThreshold) {
        selectedBrowser.setAttribute ("__akahuku_last_reload", now);
        selectedBrowser.setAttribute ("__akahuku_wheel_count", 0);
                
        event.preventDefault ();
                
        if (!info) {
          targetWindow
            .QueryInterface (Components.interfaces
                             .nsIInterfaceRequestor)
            .getInterface (Components.interfaces
                           .nsIWebNavigation)
            .reload (Components.interfaces.nsIWebNavigation
                     .LOAD_FLAGS_NONE);
        }
        else if (info.isNormal) {
          if (arAkahukuWheel.enableReloadLoop) {
            var nodes = targetDocument.getElementsByTagName ("a");
                        
            var defIndex = "futaba";
            if (info.server == "dec"
                && (info.dir == "up"
                    || info.dir == "up2")) {
              defIndex = "up";
            }
            var nextPage = defIndex + ".htm";
            var targetPage = info.normalPageNumber + 1;
            if (up) {
              nextPage = "";
              targetPage = info.normalPageNumber - 1;
              var browser
                = arAkahukuWindow.getBrowserForWindow
                (targetWindow);
              browser.__akahuku_gobottom = true;
            }
                        
            var lastPage = defIndex + ".htm";
            for (var i = 0; i < nodes.length; i ++) {
              if (nodes [i].href.match
                  (/\/([^\/]+)\/(futaba|[0-9]+)\.htm([#\?].*)?$/)) {
                if (RegExp.$1 == info.dir) {
                  var page = parseInt (RegExp.$2) || 0;
                  if (page == targetPage) {
                    nextPage
                      = ((page == 0) ? defIndex : page)
                      + ".htm";
                    /* futaba: 未知なので外部には対応しない */
                  }
                  lastPage = ((page == 0) ? defIndex : page) + ".htm";
                }
              }
            }
            if (nextPage == "") {
              nextPage = lastPage; 
            }
                        
            var href = targetDocument.location.href.replace
              (/\/[^\/]*$/,
               "/" + nextPage);
                        
            targetWindow
              .QueryInterface (Components.interfaces
                               .nsIInterfaceRequestor)
              .getInterface (Components.interfaces
                             .nsIWebNavigation)
              .loadURI (href,
                        0, null, null, null);
          }
          else {
            Akahuku.getDocumentParam (targetDocument)
              .gotop_scroll = 1;
                        
            targetWindow
              .QueryInterface (Components.interfaces
                               .nsIInterfaceRequestor)
              .getInterface (Components.interfaces
                             .nsIWebNavigation)
              .reload (Components.interfaces.nsIWebNavigation
                       .LOAD_FLAGS_NONE);
          }
        }
        else if (info.isReply) {
          if (arAkahukuReload.enable
              && documentParam.reload_param) {
            if (status) {
              status.label = "";
            }
            arAkahukuReload.diffReloadCore
              (targetDocument,
               arAkahukuWheel.enableReloadReplySync, false);
          }
          else {
            targetWindow
              .QueryInterface (Components.interfaces
                               .nsIInterfaceRequestor)
              .getInterface (Components.interfaces
                             .nsIWebNavigation)
              .reload (Components.interfaces.nsIWebNavigation
                       .LOAD_FLAGS_NONE);
          }
        }
        else if (info.isCatalog) {
          if (arAkahukuCatalog.enableReload
              && documentParam.catalog_param) {
            if (status) {
              status.label = "";
            }
            var anchor
              = targetDocument
              .getElementById ("akahuku_catalog_reload_button");
            arAkahukuCatalog.reloadCore (targetDocument,
                                         anchor);
          }
          else {
            targetWindow
              .QueryInterface (Components.interfaces
                               .nsIInterfaceRequestor)
              .getInterface (Components.interfaces
                             .nsIWebNavigation)
              .reload (Components.interfaces.nsIWebNavigation
                       .LOAD_FLAGS_NONE);
          }
        }
      }
      else {
        selectedBrowser.setAttribute ("__akahuku_wheel_count",
                                      wheelCount);
        if (status) {
          var text
            = "\u30EA\u30ED\u30FC\u30C9\u3062\u304B\u3089: "
            + parseInt (wheelCount * 100
                        / Akahuku.reloadThreshold)
            + "%";
          status.label = text;
                    
          /* timeout が設定済みならリセットして再設定 */
          clearTimeout (arAkahukuWheel.timeoutID);
          arAkahukuWheel.timeoutID =
            setTimeout (function (status, text) {
                try {
                  if (status.label == text) {
                    status.label = "";
                  }
                }
                catch (e) { Akahuku.debug.exception (e);
                }
                arAkahukuWheel.timeoutID = null;
              }, 1000, status, text);
                
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
    
  /**
   * ページ末尾のホイールをフックする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info, targetWindow) {
    if (info && info.isNotFound) {
      return;
    }
        
    if ((!info || info.isOnline)
        && arAkahukuWheel.enableReload) {
      var ok = false;
            
      if (!info) {
        if (arAkahukuWheel.enableReloadAll) {
          ok = true;
        }
      }
      else if (info.isNormal && info.normalPageNumber == 0
               && arAkahukuWheel.enableReload0) {
        ok = true;
      }
      else if (info.isNormal && info.normalPageNumber > 0
               && arAkahukuWheel.enableReload1) {
        ok = true;
      }
      else if (info.isReply && arAkahukuWheel.enableReloadReply) {
        ok = true;
      }
      else if (info.isCatalog && arAkahukuWheel.enableReloadCatalog) {
        ok = true;
      }
            
      if (ok) {
        if (targetDocument.body) {
          targetDocument.body.addEventListener
          ("DOMMouseScroll",
           function () {
            arAkahukuWheel.onWheel (arguments [0]);
          }, false);
        }
      }
    }
  }
};
