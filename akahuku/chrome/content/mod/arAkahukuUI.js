
/**
 * Require: Akahuku, arAkahukuBloomer, arAkahukuBoard, arAkahukuConfig,
 *          arAkahukuJPEG, arAkahukuLink, arAkahukuP2P, arAkahukuQuote,
 *          arAkahukuStyle, arAkahukuTab, arAkahukuClipboard,
 *          arAkahukuCompat
 */

/**
 * UI 管理
 *   [ステータスバー]、[ツールバー]
 */
var arAkahukuUI = {
  enableStatusbarPreferences : false, /* Boolean
                                       *   ステータスバーにパネルを表示する */
    
  enableStatusbarOrder : false,       /* Boolean
                                       *   アイコンの並べ替え */
  statusbarOrderList : "",            /* String
                                       *   アイコンの並べ替え順番 */
    
  contextMenuShown : false,      /* Boolean
                                  *   コンテキストメニューが
                                  *   表示されているかどうか */
    
  prefDialog : null, /* ChromeWindow  設定ダイアログ */

  managedWindows : [],
    
  /**
   * 初期化処理
   */
  initForXUL : function () {
    this.attachToWindow (window);// eslint-disable-line no-undef
  },
  attachToWindow : function (window) {
    arAkahukuUI.managedWindows.push (window);
    var document = window.document;

    // Construct popup menus for toolbar button action
    var {AkahukuContextMenus}
    = Components.utils.import ("resource://akahuku/xul-contextmenus.jsm", {});
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup",
      contexts: ["_xul_mainpopupset"],
      title: "akahuku-statusbar-popup",
      _onshowing: arAkahukuUI.setStatusbarPopup,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-all",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      title: "\u5168\u6A5F\u80FD\u3092 ON", // 全機能を ON
      onclick: arAkahukuUI.switchDisabled,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-p2p",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      title: "P2P \u3092 ON", // P2P を ON
      onclick: arAkahukuUI.switchP2PDisabled,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-p2p-statusbar",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      // P2P ステータスバーを ON
      title: "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 ON",
      onclick: arAkahukuUI.switchP2PStatusbarDisabled,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-preferences",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      title: "\u8A2D\u5B9A", // 設定
      onclick: arAkahukuUI.showPreferences,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-separator1",
      type: "separator",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-apply",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      // レス送信モードで動かす
      title: "\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9\u3067\u52D5\u304B\u3059",
      onclick: arAkahukuUI.applyFocusedDocument,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-external",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      title: "\u5916\u90E8\u677F\u306B\u767B\u9332", // 外部板に登録
      onclick: arAkahukuUI.addFocusedToExternalBoards,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-separator2",
      type: "separator",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-sidebar",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      // 赤福サイドバー
      title : "\u8D64\u798F\u30B5\u30A4\u30C9\u30D0\u30FC",
      _xul_observes: "viewAkahukuSidebar",
      onclick: function (event) {
        var window = event.currentTarget.ownerDocument.defaultView.top;
        arAkahukuCompat.toggleSidebar ("viewAkahukuSidebar", false, window);
      },
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-p2psidebar",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      // 赤福 P2P サイドバー
      title : "\u8D64\u798F P2P \u30B5\u30A4\u30C9\u30D0\u30FC",
      _xul_observes: "viewAkahukuP2PSidebar",
      onclick: function (event) {
        var window = event.currentTarget.ownerDocument.defaultView.top;
        arAkahukuCompat.toggleSidebar ("viewAkahukuP2PSidebar", false, window);
      },
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-respanel",
      type: "checkbox",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      title: "\u30EC\u30B9\u30D1\u30CD\u30EB\u3092\u8868\u793A", // レスパネルを表示
      onclick: arAkahukuUI.switchResPanelShowing,
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-separator3",
      type: "separator",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
    });
    AkahukuContextMenus.create ({
      id: "akahuku-statusbar-popup-openwebsite",
      contexts: ["_xul_mainpopupset"],
      parentId: "akahuku-statusbar-popup",
      title: "\u30B5\u30A4\u30C8\u3092\u958B\u304F", // サイトを開く
      onclick: arAkahukuUI.openWebsite,
    });

    // toolbar buttons
    arAkahukuUI.createXULToolbarButton (document, {
      id : "akahuku-toolbarbutton-preferences",
      label : "\u8D64\u798F", // 赤福
      _xul_context : "akahuku-statusbar-popup",
      onclick : arAkahukuUI.showPreferences,
    });
    arAkahukuUI.createXULToolbarButton (document, {
      id : "akahuku-toolbarbutton-sidebar",
      // 赤福サイドバー
      title : "\u8D64\u798F\u30B5\u30A4\u30C9\u30D0\u30FC",
      _xul_observes : "viewAkahukuSidebar",
      onclick: function (event) {
        var window = event.currentTarget.ownerDocument.defaultView.top;
        arAkahukuCompat.toggleSidebar ("viewAkahukuSidebar", false, window);
      },
    });
    arAkahukuUI.createXULToolbarButton (document, {
      id : "akahuku-toolbarbutton-p2psidebar",
      // 赤福 P2P サイドバー
      title : "\u8D64\u798F P2P \u30B5\u30A4\u30C9\u30D0\u30FC",
      _xul_observes : "viewAkahukuP2PSidebar",
      onclick: function (event) {
        var window = event.currentTarget.ownerDocument.defaultView.top;
        arAkahukuCompat.toggleSidebar ("viewAkahukuP2PSidebar", false, window);
      },
    });
    arAkahukuUI.createXULToolbarButton (document, {
      id : "akahuku-toolbarbutton-p2pstatus",
      // 赤福 P2P ステータス
      label : "\u8D64\u798F P2P \u30B9\u30C6\u30FC\u30BF\u30B9",
      type : "_labels",
      _xul_children : [
        {id:"akahuku-toolbarpanel-p2p-node", value:"\u63A5:0/0"},
        {id:"akahuku-toolbarpanel-p2p-sep0", value:"/"},
        {id:"akahuku-toolbarpanel-p2p-send", value:"\u653B:0"},
        {id:"akahuku-toolbarpanel-p2p-sep1", value:"/"},
        {id:"akahuku-toolbarpanel-p2p-recv", value:"\u53D7:0"},
        {id:"akahuku-toolbarpanel-p2p-sep2", value:"/"},
        {id:"akahuku-toolbarpanel-p2p-relay", value:"\u7D99:0"},
        {id:"akahuku-toolbarpanel-p2p-sep3", value:"/"},
        {id:"akahuku-toolbarpanel-p2p-futaba", value:"\u53CC:0"},
      ],
    });

    arAkahukuUI.showPanelForWindow (window);
    arAkahukuUI.setPanelStatusForWindow (window);
        
    /* コンテキストメニューのイベントを監視 */
    var menu = document.getElementById ("contentAreaContextMenu");
    if (menu) {
      menu.addEventListener
        ("popupshowing", arAkahukuUI.setContextMenu, false);
      menu.addEventListener
        ("popupshown", arAkahukuUI.onContextMenuShown, false);
      menu.addEventListener
        ("popuphidden", arAkahukuUI.onContextMenuHidden, false);
    }
        
    if (arAkahukuUI.enableStatusbarOrder) {
      var panels = [];
      var ids = [];
      var idMap = {
        "unmht" : "unmht-statusbarpanel-preferences",
        "aka" : "akahuku-statusbarpanel-preferences",
        "aka_p2p" : "akahuku-statusbarpanel-p2p",
        "aima" : "aima_aimani-statusbarpanel-preferences",
        "aima_ng" : "aima_aimani-statusbarpanel-ng_word"
      };
        
      /* 値を解析するだけなので代入はしない */
      arAkahukuUI.statusbarOrderList.replace
      (/([^,]+),?/g,
       function (matched, part1) {
        ids.push (unescape (part1));
        return "";
      });
            
      var parentNode = null;
      var nextSibling = null;
      for (var i = 0; i < ids.length; i ++) {
        var node = document.getElementById (idMap [ids [i]]);
        if (node) {
          panels.push (node);
          parentNode = node.parentNode;
          if (i + 1 == ids.length) {
            nextSibling = node.nextSibling;
          }
          parentNode.removeChild (node);
        }
      }
      for (var i = 0; i < panels.length; i ++) {
        if (nextSibling) {
          parentNode.insertBefore (panels [i], nextSibling);
        }
        else {
          parentNode.appendChild (panels [i]);
        }
      }
    }
        
    window.arAkahukuUI_modifyLocationbarTimerID
      = window.setTimeout (function (win) {
        arAkahukuUI.modifyLocationbar (win)
      }, 1000, window);
  },
  dettachFromWindow : function (window) {
    var menu = window.document.getElementById ("contentAreaContextMenu");
    if (menu) {
      menu.removeEventListener
        ("popupshowing", arAkahukuUI.setContextMenu, false);
      menu.removeEventListener
        ("popupshown", arAkahukuUI.onContextMenuShown, false);
      menu.removeEventListener
        ("popuphidden", arAkahukuUI.onContextMenuHidden, false);
    }

    //TODO: remove XUL elements created for bootstrap.js

    window.clearTimeout (window.arAkahukuUI_modifyLocationbarTimerID);
    delete window.arAkahukuUI_modifyLocationbarTimerID;
    arAkahukuUI.modifyLocationbar (window, true);//to remove
    arAkahukuUI.managedWindows.splice
      (arAkahukuUI.managedWindows.indexOf (window), 1);
  },
    
  createXULToolbarButton : function (document, prop) {
    var navtoolbox = document.getElementById ("navigator-toolbox");
    if (!navtoolbox ) {
      Akahuku.debug.warn ("no navigator-toolbox!");
      return;
    }
    var button = document.getElementById (prop.id);
    if (button) {
      Akahuku.debug.warn ("button #" + prop.id, "already exists, skip it.");
      return;
    }
    var ns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    button = document.createElementNS (ns, "toolbarbutton");
    if (!prop.type || prop.type == "button") {
      button.setAttribute ("class", "toolbarbutton-1 chromeclass-toolbar-additional");
    }
    else if (prop.type == "_labels" && prop._xul_children) {
      button.setAttribute ("class", "");
      for (var i = 0; i < prop._xul_children.length; i ++) {
        var label = document.createElementNS (ns, "label");
        label.id = prop._xul_children [i].id;
        label.setAttribute ("value", prop._xul_children [i].value);
        label.setAttribute ("tooltiptext", prop.title);
        label.setAttribute ("style", "margin: 0; paddin: 0;");
        button.appendChild (label);
      }
    }
    button.setAttribute ("status", "enabled");
    button.id = prop.id;
    button.setAttribute ("label", prop.title);
    button.setAttribute ("tooltiptext", prop.title);
    if (prop._xul_context) {
      button.setAttribute ("context", prop._xul_context);
    }
    if (prop._xul_observes) {
      button.setAttribute ("observes", prop._xul_observes);
    }
    if (prop.onclick) {
      button.addEventListener ("command", prop.onclick, false);
    }
    if (prop.style) {
      button.setAttribute ("style", prop.style);
    }

    if (document.readyState !== "complete") {
      var palette = document.getElementById ("BrowserToolbarPalette");
      if (!palette) {
        Akahuku.debug.warn ("no BrowserToolbarPalette!");
      }
      palette.appendChild (button);
      return;
    }
    navtoolbox.palette.appendChild (button);

    // readyState=complete 後では BrowserToolbarPalette がもう無いので
    // 起動後に復元するにはツールバー(addon-bar, nav-bar, ...)へ
    // 手動で追加する必要あり
    var toolbars = document.querySelectorAll ('toolbar[customizable="true"]');
    for (var j = 0; j < toolbars.length; j ++) {
      var toolbar = toolbars [j];
      var currentset = toolbar.getAttribute ("currentset").split (",");
      var index = currentset.indexOf (prop.id);
      if (index >= 0) {
        var nextElem = null;
        for (var i = index + 1; i < currentset.length; i ++) {
          nextElem = document.getElementById (currentset [i]);
          if (nextElem) {
            break;
          }
        }
        toolbar.insertItem (prop.id, nextElem);
        Akahuku.debug.log ("toolbarbutton#" + prop.id
            + " is inserted to #" + toolbar.id);
        break;
      }
      else {
        Akahuku.debug.log ("toolbar currentset of #" + toolbar.id
            + "'does not have " + prop.id);
      }
    }
  },

  /**
   * ロケーションバーのメニューに P2P の [元のアドレスをコピー] を追加する
   */
  modifyLocationbar : function (window, doRemove) {
    var document = window.document;
    var urlbar = document.getElementById ("urlbar");
    var nodes, nodes2;
    var nodes2;
    var i, j;
    var node;
    var menu = null;
    nodes = document.getAnonymousNodes (urlbar);
    if (nodes) {
      for (i = 0; i < nodes.length; i ++) {
        if (nodes [i].className == "autocomplete-textbox-container") {
          node = nodes [i].firstChild;
          while (node) {
            if (node.className == "textbox-input-box") {
              nodes2 = document.getAnonymousNodes (node);
              for (j = 0; j < nodes2.length; j ++) {
                if (nodes2 [j].nodeName == "xul:menupopup") {
                  menu = nodes2 [j];
                  break;
                }
              }
              break;
            }
            if (node.firstChild) {
              node = node.firstChild;
            }
            else if (node.nextSibling) {
              node = node.nextSibling;
            }
            else {
              while (node
                     && !node.nextSibling) {
                node = node.parentNode;
              }
              if (node) {
                node = node.nextSibling;
              }
            }
          }
          break;
        }
      }
    }
        
    if (menu && !doRemove) {
      node = menu.firstChild;
      while (node) {
        if (node.getAttribute ("cmd") == "cmd_copy") {
          var label
            = "\u5143\u306E\u30A2\u30C9\u30EC\u30B9\u3092\u30B3\u30D4\u30FC";
          var menuitem = document.createElement ("menuitem");
          menuitem.setAttribute ("label", label);
          menuitem.id = "akahuku-urlbar-copy-p2p-address";
          menuitem.addEventListener
            ("command", 
             function () {
              arAkahukuUI.copyP2PAddress (arguments [0]);
            }, false);
          node.parentNode.insertBefore (menuitem, node.nextSibling);
          break;
        }
        node = node.nextSibling;
      }
      menu.addEventListener
      ("popupshowing", arAkahukuUI.setURLBarMenu, false);
    }
    if (menu && doRemove) {
      menu.removeEventListener
      ("popupshowing", arAkahukuUI.setURLBarMenu, false);
      var menuitem = document.getElementById ("akahuku-urlbar-copy-p2p-address");
      if (menuitem) {
        menuitem.parentNode.removeChild (menuitem);
      }
    }
  },
    
  /**
   * ロケーションバーのメニューを設定する
   *
   * @param  Event event
   *         対象のイベント
   */
  setURLBarMenu : function (event) {
    var menuitem;
    var document = event.currentTarget.ownerDocument;
    menuitem = document.getElementById ("akahuku-urlbar-copy-p2p-address");
    if (menuitem) {
      var url = document.getElementById ("urlbar").value;
      if (Akahuku.protocolHandler.isAkahukuURI (url)
          && Akahuku.protocolHandler.getAkahukuURIParam (url).type == "p2p") {
        menuitem.hidden = false;
      }
      else {
        menuitem.hidden = true;
      }
    }
  },
    
  /**
   * P2P の元のアドレスをコピーする
   *
   * @param  Event event
   *         対象のイベント
   */
  copyP2PAddress : function (event) {
    var document = event.currentTarget.ownerDocument;
    var url = document.getElementById ("urlbar").value;
    url = arAkahukuP2P.deP2P (url);
        
    try {
      arAkahukuClipboard.copyString (url);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
    
  /**
   * メニューが開かれたイベント
   */
  onContextMenuShown : function () {
    arAkahukuUI.contextMenuShown = true;
  },
    
  /**
   * メニューが閉じられたイベント
   */
  onContextMenuHidden : function () {
    arAkahukuUI.contextMenuShown = false;
  },
    
  /**
   * メニューが開かれるイベント
   * メニューの項目の表示／非表示を設定する
   *
   * @param  Event event
   *         対象のイベント
   */
  setContextMenu : function (event) {
    var gContextMenu = event.currentTarget.ownerDocument.defaultView.gContextMenu;
    if (gContextMenu && event.target.id == "contentAreaContextMenu") {
      arAkahukuLink.setContextMenu (event);
      arAkahukuImage.setContextMenu (event);
      arAkahukuQuote.setContextMenu (event);
      arAkahukuJPEG.setContextMenu (event);
      arAkahukuP2P.setContextMenu (event);
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuUI.enableStatusbarPreferences
    = arAkahukuConfig
    .initPref ("bool", "akahuku.statusbar.preferences", true);
        
    arAkahukuUI.enableStatusbarOrder
    = arAkahukuConfig
    .initPref ("bool", "akahuku.statusbar.order", true);
        
    if (arAkahukuUI.enableStatusbarOrder) {
      arAkahukuUI.statusbarOrderList
        = arAkahukuConfig
        .initPref ("char", "akahuku.statusbar.order.list",
                   "unmht,aka,aka_p2p,aima,aima_ng");
    }
  },
    
  /**
   * 設定ダイアログを開く
   *
   * @param  Event event
   *         対象のイベント
   */
  showPreferences : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    if (("button" in event && event.button != 0)
        || event.ctrlKey || event.shiftKey
        || event.altKey || event.metaKey) {
      return;
    }
        
    try {
      if (arAkahukuUI.prefDialog != null) {
        if (!arAkahukuUI.prefDialog.closed) {
          arAkahukuUI.prefDialog.focus ();
          return;
        }
      }
    }
    catch (e) {
      arAkahukuUI.prefDialog = null;
    }
    var optionsURL = "chrome://akahuku/content/options.xul";
    var features = "chrome,titlebar,toolbar,centerscreen,resizable";
    arAkahukuUI.prefDialog = window.openDialog (optionsURL, "", features);
        
    if (!arAkahukuConfig.isObserving) {
      arAkahukuUI.prefDialog.addEventListener
        ("unload",
         function () {
          arAkahukuUI.setPanelStatus ();
        }, false);
    }
  },
    
  /**
   * ステータスバーのメニューを設定する
   */
  setStatusbarPopup : function (event) {
    var document = event.currentTarget.ownerDocument;
    var menuitem;
        
    menuitem = document.getElementById ("akahuku-statusbar-popup-all");
    if (menuitem) {
      if (Akahuku.enableAll) {
        menuitem.setAttribute ("label", "\u5168\u6A5F\u80FD\u3092 OFF");
      }
      else {
        menuitem.setAttribute ("label", "\u5168\u6A5F\u80FD\u3092 ON");
      }
    }
        
    menuitem = document.getElementById ("akahuku-statusbar-popup-p2p");
    if (menuitem) {
      if (arAkahukuP2P.enable) {
        menuitem.setAttribute ("label", "P2P \u3092 OFF");
      }
      else {
        menuitem.setAttribute ("label", "P2P \u3092 ON");
      }
    }
        
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-p2p-statusbar");
    if (menuitem) {
      if (arAkahukuP2P.enableStatusbar) {
        menuitem.setAttribute ("label", "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 OFF");
      }
      else {
        menuitem.setAttribute ("label", "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 ON");
      }
    }
        
    var info = arAkahukuUI.getFocusedDocumentInfo (document.defaultView);
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-apply");
    if (menuitem) {
      menuitem.disabled = info.isAkahukuApplied;
    }
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-external");
    if (menuitem) {
      menuitem.disabled = !info.isAbleToAddExternal;
    }
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-respanel");
    if (menuitem) {
      menuitem.disabled = !info.isRespanelOpenable;
      if (info.isRespanelOpened) {
        if (info.isRespanelOrphaned) {
          /* レスパネルの要素が誰かに消されてる場合 */
          arAkahukuThread.closeResPanel (info.targetDocument);
          menuitem.removeAttribute ("checked");
        }
        else {
          menuitem.setAttribute ("checked", "true");
        }
      }
      else {
        menuitem.removeAttribute ("checked");
      }
    }
  },
  getFocusedDocumentInfo : function (window) {
    var document = window.document;
    var param = Akahuku.getFocusedDocumentParam (window);
    var focusedWindow = document.commandDispatcher.focusedWindow;
    var focusedDocument = null;
    if (focusedWindow.content) {
      focusedWindow = focusedWindow.content.defaultView;
    }
    focusedDocument = focusedWindow && focusedWindow.document || null;
    var info = {
      isAkahukuApplied: param != null,
      isAbleToAddExternal: param == null && focusedDocument
        && arAkahukuBoard.isAbleToAddExternal (focusedDocument.location.href),
      isRespanelOpenable: param && param.location_info.isReply,
      isRespanelOpened: param && param.respanel_param,
      isRespanelOrphaned: false,
      targetDocument: null,
    };
    if (info.isRespanelOpened
        && !param.respanel_param.frame.parentNode) {
      info.isRespanelOrphaned = true;
      info.targetDocument = param.targetDocument;
    }
    return info;
  },

    
  /**
   * 全機能の ON／OFF を切り替える
   */
  switchDisabled : function (event) {
    Akahuku.enableAll
    = !arAkahukuConfig
    .initPref ("bool", "akahuku.all", true);
    arAkahukuConfig
    .setBoolPref ("akahuku.all", Akahuku.enableAll);
    arAkahukuConfig
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    arAkahukuConfig.loadPrefBranch ();
    arAkahukuP2P.getConfig ();
    arAkahukuP2P.update ();
        
    arAkahukuStyle.modifyStyleFile (Akahuku.enableAll);
        
    var window = event.currentTarget.ownerDocument.defaultView;
    arAkahukuUI.setPanelStatusForWindow (window);
  },
    
  /**
   * P2P の ON／OFF を切り替える
   */
  switchP2PDisabled : function (event) {
    arAkahukuP2P.enable
    = !arAkahukuConfig
    .initPref ("bool", "akahuku.p2p", false);
    arAkahukuConfig
    .setBoolPref ("akahuku.p2p", arAkahukuP2P.enable);
    arAkahukuConfig
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    arAkahukuConfig.loadPrefBranch ();
    arAkahukuP2P.getConfig ();
    arAkahukuP2P.update ();
  },
    
  /**
   * P2P ステータスバーの ON／OFF を切り替える
   */
  switchP2PStatusbarDisabled : function (event) {
    arAkahukuP2P.enableStatusbar
    = !arAkahukuConfig
    .initPref ("bool", "akahuku.p2p.statusbar", true);
        
    arAkahukuConfig
    .setBoolPref ("akahuku.p2p.statusbar", arAkahukuP2P.enableStatusbar);
    arAkahukuConfig
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    arAkahukuP2P.update ();
  },
    
  /**
   * レスパネルの表示を切り替える
   */
  switchResPanelShowing : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    var document = window.document;
    var targetBrowser = window.gBrowser.selectedBrowser;
    var menuitem
    = document.getElementById ("akahuku-statusbar-popup-respanel");
    if (!menuitem) {
      return;
    }
    if (menuitem.getAttribute ("checked") == "true") {
      arAkahukuThread.closeResPanelForBrowser (targetBrowser);
      menuitem.removeAttribute ("checked");
    }
    else {
      try {
        arAkahukuThread.showResPanelForBrowser (targetBrowser);
        menuitem.setAttribute ("checked", "true");
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
  },
    
  /**
   * サイトを開く
   */
  openWebsite : function (event) {
    var document = event.currentTarget.ownerDocument;
    var tabbrowser = document.getElementById ("content");
    var newTab
    = tabbrowser.addTab ("https://toshiakisp.github.io/akahuku-firefox-sp/");
    tabbrowser.selectedTab = newTab;
  },
    
  /**
   * ステータスバー、ツールバーのパネルを表示する
   */
  showPanel : function () {
    for (var i = 0; i < arAkahukuUI.managedWindows.length; i ++) {
      var win = arAkahukuUI.managedWindows [i];
      arAkahukuUI.showPanelForWindow (win);
    }
  },
  showPanelForWindow : function (window) {
    var document = window.document;
    var panel;
    panel = document.getElementById ("akahuku-statusbarpanel-preferences");
    if (panel) {
      panel.hidden = !arAkahukuUI.enableStatusbarPreferences;
    }
  },
    
  /**
   * パネルのアイコンを、全機能の ON／OFF に合わせて切り替える
   */
  setPanelStatus : function () {
    arAkahukuConfig.loadPrefBranch ();
    Akahuku.getConfig ();

    for (var i = 0; i < arAkahukuUI.managedWindows.length; i ++) {
      var win = arAkahukuUI.managedWindows [i];
      arAkahukuUI.setPanelStatusForWindow (win);
    }
  },
  setPanelStatusForWindow : function (window) {
    var document = window.document;
    if (Akahuku.enableAll) {
      var panel
        = document
        .getElementById ("akahuku-statusbarpanel-preferences");
      if (panel) {
        panel.setAttribute ("status", "enabled");
        var text = panel.getAttribute ("tooltiptext");
        if (text.indexOf (AkahukuVersion) == -1) {
          panel.setAttribute ("tooltiptext",
                              text + " " + AkahukuVersion);
        }
      }
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences", "status", "enabled", document);
      var text = "\u8D64\u798F " + AkahukuVersion; // "赤福 "
      if (Akahuku.useFrameScript) {
        text += " - e10s";
      }
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences", "tooltiptext", text, document);
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences-image", "status", "enabled", document);
    }
    else {
      var panel
      = document
      .getElementById ("akahuku-statusbarpanel-preferences");
      if (panel) {
        panel.setAttribute ("status", "disabled");
      }
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences", "status", "disabled", document);
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences-image", "status", "disabled", document);
    }
  },

  setAttributeOfToolbarButton : function (id, attr, value, document) {
    var button = document.getElementById (id);
    var window = document.defaultView;
    if (button) {
      button.setAttribute (attr, value);
    }
    else if (typeof window.CustomizableUI != "undefined") {
      // For Australis
      var widgets = window.CustomizableUI.getWidget (id);
      if (widgets) {
        for (var i = 0; i < widgets.instances.length; i ++) {
          button = widgets.instances [i].node;
          if (button) {
            button.setAttribute (attr, value);
          }
        }
      }
    }
  },
    
  /**
   * フォーカスのあるドキュメントに適用する
   */
  applyFocusedDocument : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    var targetDocument = window.gBrowser.selectedBrowser.contentDocument;
    arAkahukuUI.applyDocument (targetDocument);
  },
  applyDocument : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument);
        
    if (param) {
      return;
    }
        
    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuConfig.loadPrefBranch ();
      Akahuku.getConfig ();
      arAkahukuTab.getConfig ();
      arAkahukuQuote.getConfig ();
      arAkahukuJPEG.getConfig ();
      arAkahukuBloomer.getConfig ();
      arAkahukuBoard.getConfig ();
    }
        
    Akahuku.apply (targetDocument, true);
  },

  /**
   * フォーカスのあるドキュメントを外部板に追加する
   */
  addFocusedToExternalBoards : function (event) {
    var window = event.currentTarget.ownerDocument.defaultView;
    var targetDocument = window.gBrowser.selectedBrowser.contentDocument;
    arAkahukuUI.addDocumentToExternalBoards (targetDocument);
  },
  addDocumentToExternalBoards : function (targetDocument) {
    if (Akahuku.getDocumentParam (targetDocument)) {
      return;
    }

    if (arAkahukuBoard.isAbleToAddExternal (targetDocument.location.href)) {
      arAkahukuBoard.addExternal (targetDocument);
      Akahuku.apply (targetDocument, false);
    }
  },


  /**
   * マウスホバーで表示されるステータスを設定する
   */
  setStatusPanelText : function (text, type, browser) {
    if (type !== "overLink" && type !== "status") {
      throw Components.Exception
        ("type of statuspanel must be 'overLink' or 'status'",
         Components.results.NS_ERROR_FAILURE,
         Components.stack.caller);
    }
    var window = browser.ownerDocument.defaultView;
    var status = arAkahukuCompat.gBrowser.getStatusPanel (window);
    if (!status) {
      Akahuku.debug.warn ("no statuspanel found");
      return;
    }
    if (status.tagName == "statuspanel") {
      status.setAttribute ("previoustype", status.getAttribute ("type"));
      status.setAttribute ("type", type);
    }
    status.label = text;
    if (status.tagName == "statuspanel") {
      status.setAttribute ("crop", type == "overLink" ? "center" : "end");
    }
  },
  clearStatusPanelText : function (optText, browser)
  {
    var window = browser.ownerDocument.defaultView;
    var status = arAkahukuCompat.gBrowser.getStatusPanel (window);
    if (!status) {
      Akahuku.debug.warn ("no statuspanel found");
      return;
    }
    if (typeof optText == "undefined"
        || optText === null
        || status.label == optText) {
      status.label = "";
    }
  },
  getStatusPanelText : function (browser) {
    var window = browser.ownerDocument.defaultView;
    var status = arAkahukuCompat.gBrowser.getStatusPanel (window);
    return status ? status.label : "";
  }
};
