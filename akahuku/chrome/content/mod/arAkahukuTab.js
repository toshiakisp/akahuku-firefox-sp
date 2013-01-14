/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuBoard
 */

/**
 * ソート用のタブのデータ
 */
function arAkahukuTabData () {
}
arAkahukuTabData.prototype = {
  i : 0,       /* Number  元の位置 */
  group : 0,   /* Number  スレをソートの場合のグループ */
  tab : null,  /* tab  タブ要素 */
  info : null, /* arAkahukuLocationInfo  アドレス、スレの情報 */
  type : 0     /* Number  種類
                *   0: 通常モード
                *   1: レス送信モード
                *   2: カタログモード
                *   3: その他 */
};
/**
 * タブ管理
 *   [タブのソート]
 */
var arAkahukuTab = {
  enableSort : false,             /* Boolean  タブのソート */
  enableSortThread : false,       /* Boolean  スレをソート */
  enableSortAll : false,          /* Boolean  全てソート */
  enableSortInvertThread : false, /* Boolean  スレの並びを反転 */
  sortOrderNormal : 2,            /* Number  タブの並び - 通常モード */
  sortOrderReply : 3,             /* Number  タブの並び - レス送信モード */
  sortOrderCatalog : 4,           /* Number  タブの並び - カタログモード */
  sortOrderOther : 1,             /* Number  タブの並び - その他 */
  sortBoardOrder : "",            /* String  板の順番 */
    
  /**
   * 初期化処理
   */
  init : function () {
    var tabbrowser = document.getElementById ("content");
    var tabMenu
    = document.getAnonymousElementByAttribute (tabbrowser,
                                               "anonid", "tabContextMenu");
    var mode = 0;
    if (!tabMenu) {
      tabMenu
        = document.getElementById ("tabContextMenu");
      mode = 1;
    }
    
    if (tabMenu) {
      tabMenu.addEventListener
        ("popupshowing",
         function () {
          arAkahukuTab.setContextMenu ();
        }, false);
            
      var insertPos = tabMenu.lastChild.previousSibling;
            
      var item;
            
      if (mode == 1) {
        item = document.createElement ("menuseparator");
        item.id = "akahuku-menuitem-tab-sort-separator";
        tabMenu.insertBefore (item, insertPos);
        insertPos = item;
      }
      
      item = document.createElement ("menuitem");
      item.id = "akahuku-menuitem-tab-sort-all";
      item.setAttribute ("label", "\u5168\u3066\u30BD\u30FC\u30C8");
      item.setAttribute ("oncommand", "arAkahukuTab.sort (true);");
      tabMenu.insertBefore (item, insertPos);
      insertPos = item;
            
      item = document.createElement ("menuitem");
      item.id = "akahuku-menuitem-tab-sort-thread";
      item.setAttribute ("label", "\u30B9\u30EC\u3092\u30BD\u30FC\u30C8");
      item.setAttribute ("oncommand", "arAkahukuTab.sort (false);");
      tabMenu.insertBefore (item, insertPos);
      insertPos = item;
            
      if (mode == 0) {
        item = document.createElement ("menuseparator");
        item.id = "akahuku-menuitem-tab-sort-separator";
        tabMenu.insertBefore (item, insertPos);
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuTab.enableSort
    = arAkahukuConfig
    .initPref ("bool", "akahuku.tab.sort", true);
    if (arAkahukuTab.enableSort) {
      arAkahukuTab.enableSortThread
        = arAkahukuConfig
        .initPref ("bool", "akahuku.tab.sort.thread", true);
      arAkahukuTab.enableSortAll
        = arAkahukuConfig
        .initPref ("bool", "akahuku.tab.sort.all", true);
      arAkahukuTab.enableSortInvertThread
        = arAkahukuConfig
        .initPref ("bool", "akahuku.tab.sort.invert.thread", false);
      arAkahukuTab.sortOrderNormal
        = arAkahukuConfig
        .initPref ("int", "akahuku.tab.sort.order.normal", 2);
      arAkahukuTab.sortOrderReply
        = arAkahukuConfig
        .initPref ("int", "akahuku.tab.sort.order.reply", 3);
      arAkahukuTab.sortOrderCatalog
        = arAkahukuConfig
        .initPref ("int", "akahuku.tab.sort.order.catalog", 4);
      arAkahukuTab.sortOrderOther
        = arAkahukuConfig
        .initPref ("int", "akahuku.tab.sort.order.other", 1);
      var value
        = arAkahukuConfig
        .initPref ("char", "akahuku.tab.sort.board_order.list", "");
      var list = new Array ();
      if (value == "") {
        list = arAkahukuBoard.getBoardIDs ("internal");
        list = list.sort (function (x, y) {
            return x < y ? -1 : 1;
          });
      }
      else {
        /* 値を解析するだけなので代入はしない */
        value.replace
          (/([^,]+),?/g,
           function (matched, part1) {
            list.push (unescape (part1));
            return "";
          });
      }
      arAkahukuTab.sortBoardOrder
        = "[" + list.join ("][") + "]";
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
        
    menuitem
    = document.getElementById ("akahuku-menuitem-tab-sort-thread");
    if (menuitem) {
      menuitem.hidden
        = !arAkahukuTab.enableSort
        || !arAkahukuTab.enableSortThread;
    }
    menuitem
    = document.getElementById ("akahuku-menuitem-tab-sort-all");
    if (menuitem) {
      menuitem.hidden
        = !arAkahukuTab.enableSort
        || !arAkahukuTab.enableSortAll;
    }
    menuitem
    = document.getElementById ("akahuku-menuitem-tab-sort-separator");
    if (menuitem) {
      menuitem.hidden
        = !arAkahukuTab.enableSort
        || (!arAkahukuTab.enableSortThread && !arAkahukuTab.enableSortAll);
    }
  },
    
  /**
   * タブをソート
   * 
   * @param  Boolean all
   *         全てのページをソートするかどうか
   */
  sort : function (all) {
    var tabbrowser = document.getElementById ("content");
        
    var tabs = null;
    if ("visibleTabs" in tabbrowser) {
      /* Firefox4/Gecko2.0 */
      /* ソートは現在表示しているタブグループ内でのみ */
      tabs = tabbrowser.visibleTabs;
    }
    else if ("mTabContainer" in tabbrowser) {
      tabs = tabbrowser.mTabContainer.childNodes;
    }
    if (tabs
        && "moveTabTo" in tabbrowser) {
            
      var list = new Array ();
      var data;
      var documentParam;
      var group = 0;
      var indics = []; // 移動可能な対象インデックス
      for (i = 0; i < tabs.length; i ++) {
        var tab = tabs [i];
        // ソートできないピン留めされたタブを除外 (Gecko2.0)
        if (tab.getAttribute ("pinned") == "true") {
          continue;
        }
        indics.push (i);
        data = new arAkahukuTabData ();
        data.i = i;
        data.tab = tab;
        data.group = group;
                
        documentParam
          = Akahuku.getDocumentParam
          (tabbrowser.getBrowserForTab (tab).contentDocument, false);
        if (documentParam) {
          data.info = documentParam.location_info;
        }
        else {
          // documentParam が得られない場合 (pending タブ含む)
          data.info
            = new arAkahukuLocationInfo
            (tabbrowser.getBrowserForTab (tab).contentDocument);
          if (!data.info.isFutaba) {
            delete data.info;
          }
          else if (!data.info.isNormal
              && !data.info.isCatalog
              && !data.info.isReply ) {
            // 対象モードでない場合は除外 (画像のタブなど)
            delete data.info;
          }
        }
                    
        if (data.info) {
          if (data.info.isNormal) {
            data.type = 0;
          }
          else if (data.info.isReply) {
            data.type = 1;
          }
          else if (data.info.isCatalog) {
            data.type = 2;
          }
                    
          if (!all) {
            if (!data.info.isReply) {
              group ++;
            }
          }
        }
        else {
          data.info = null;
          data.type = 3;
          if (!all) {
            group ++;
          }
        }
                
        list.push (data);
      }
            
      var allMatrix;
      allMatrix = new Array ();
      allMatrix [0] = new Array ();
      allMatrix [1] = new Array ();
      allMatrix [2] = new Array ();
      allMatrix [3] = new Array ();
            
      allMatrix [0][0] = function (x, y) {
        /* 通常モード - 通常モード */
        return (x.info.normalPageNumber
                - y.info.normalPageNumber)
        || (x.i - y.i);
      };
      allMatrix [0][1] = function (x, y) {
        /* 通常モード - レス送信モード */
        return arAkahukuTab.sortOrderNormal
        - arAkahukuTab.sortOrderReply;
      };
      allMatrix [0][2] = function (x, y) {
        /* 通常モード - カタログモード */
        return arAkahukuTab.sortOrderNormal
        - arAkahukuTab.sortOrderCatalog;
      };
      allMatrix [0][3] = function (x, y) {
        /* 通常モード - その他 */
        return arAkahukuTab.sortOrderNormal
        - arAkahukuTab.sortOrderOther;
      };
            
      allMatrix [1][0] = function (x, y) {
        /* レス送信モード - 通常モード */
        return arAkahukuTab.sortOrderReply
        - arAkahukuTab.sortOrderNormal;
      };
      allMatrix [1][1] = function (x, y) {
        /* レス送信モード - レス送信モード */
        if (arAkahukuTab.enableSortInvertThread) {
          return (y.info.threadNumber
                  - x.info.threadNumber)
          || (x.i - y.i);
        }
        else {
          return (x.info.threadNumber
                  - y.info.threadNumber)
          || (x.i - y.i);
        }
      };
      allMatrix [1][2] = function (x, y) {
        /* レス送信モード - カタログモード */
        return arAkahukuTab.sortOrderReply
        - arAkahukuTab.sortOrderCatalog;
      };
      allMatrix [1][3] = function (x, y) {
        /* レス送信モード - その他 */
        return arAkahukuTab.sortOrderReply
        - arAkahukuTab.sortOrderOther;
      };
            
      allMatrix [2][0] = function (x, y) {
        /* カタログモード - 通常モード */
        return arAkahukuTab.sortOrderCatalog
        - arAkahukuTab.sortOrderNormal;
      };
      allMatrix [2][1] = function (x, y) {
        /* カタログモード - レス送信モード */
        return arAkahukuTab.sortOrderCatalog
        - arAkahukuTab.sortOrderReply;
      };
      allMatrix [2][2] = function (x, y) {
        /* カタログモード - カタログモード */
        return (x.i - y.i);
      };
      allMatrix [2][3] = function (x, y) {
        /* カタログモード - その他 */
        return arAkahukuTab.sortOrderCatalog
        - arAkahukuTab.sortOrderOther;
      };
            
      allMatrix [3][0] = function (x, y) {
        /* その他 - 通常モード */
        return arAkahukuTab.sortOrderOther
        - arAkahukuTab.sortOrderNormal;
      };
      allMatrix [3][1] = function (x, y) {
        /* その他 - レス送信モード */
        return arAkahukuTab.sortOrderOther
        - arAkahukuTab.sortOrderReply;
      };
      allMatrix [3][2] = function (x, y) {
        /* その他 - カタログモード */
        return arAkahukuTab.sortOrderOther
        - arAkahukuTab.sortOrderCatalog;
      };
      allMatrix [3][3] = function (x, y) {
        /* その他 - その他 */
        return (x.i - y.i);
      };
            
      list.sort (function (x, y) {
          if (x.group != y.group) {
            return x.group - y.group;
          }
                    
          if (!all) {
            if (x.type != 1 || y.type != 1) {
              /* スレのみの場合は両方スレでなければ元の順に */
              return (x.i - y.i);
            }
          }
                    
          if (x.type != 3 && y.type != 3) {
            if (x.info.server != y.info.server
                || x.info.dir != y.info.dir) {
              /* 違う板 */
              if (all) {
                /* 全ての場合は板順に */
                var x_pos
                  = arAkahukuTab.sortBoardOrder
                  .indexOf ("[" + x.info.server
                            + ":" + x.info.dir + "]");
                var y_pos
                  = arAkahukuTab.sortBoardOrder
                  .indexOf ("[" + y.info.server
                            + ":" + y.info.dir + "]");
                                
                if (x_pos == -1 && y_pos == -1) {
                  return ((x.info.server
                           + ":" + x.info.dir)
                          < (y.info.server
                             + ":" + y.info.dir)) ? -1 : 1;
                }
                                
                return x_pos - y_pos;
              }
              else {
                /* スレのみの場合は元の順に */
                return (x.i - y.i);
              }
            }
          }
                    
          return allMatrix [x.type][y.type] (x, y);
        });
            
      for (var i = 0; i < list.length; i ++) {
        tabbrowser.moveTabTo (list [i].tab, indics [i]);
      }
    }
  }
};
