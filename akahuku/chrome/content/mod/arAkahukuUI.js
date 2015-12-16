/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuBloomer, arAkahukuBoard, arAkahukuConfig,
 *          arAkahukuJPEG, arAkahukuLink, arAkahukuP2P, arAkahukuQuote,
 *          arAkahukuStyle, arAkahukuTab, arAkahukuClipboard
 */

/**
 * UI 管理
 *   [ステータスバー]、[ツールバー]
 */
var arAkahukuUI = {
  enableToolbarPreferences : false,   /* Boolean
                                       *   ツールバーにパネルを表示する */
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
    
  /**
   * 初期化処理
   */
  init : function () {
    arAkahukuConfig.loadPrefBranch ();
    arAkahukuUI.getConfig ();
        
    arAkahukuUI.setPanelStatus ();
    arAkahukuUI.showPanel ();
        
    /* コンテキストメニューのイベントを監視 */
    var menu = document.getElementById ("contentAreaContextMenu");
    if (menu) {
      menu.addEventListener
        ("popupshowing", 
         function () {
          arAkahukuUI.setContextMenu (arguments [0]);
        }, false);
      menu.addEventListener
        ("popupshown",
         function () {
          arAkahukuUI.onContextMenuShown ();
        }, false);
      menu.addEventListener
        ("popuphidden",
         function () {
          arAkahukuUI.onContextMenuHidden ();
        }, false);
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
        
    setTimeout
    (arAkahukuUI.modifyLocationbar,
     1000);
  },
    
  /**
   * ロケーションバーのメニューに P2P の [元のアドレスをコピー] を追加する
   */
  modifyLocationbar : function () {
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
        
    if (menu) {
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
      ("popupshowing", 
       function () {
        arAkahukuUI.setURLBarMenu (arguments [0]);
      }, false);
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
    if (gContextMenu) {
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
        
    arAkahukuUI.enableToolbarPreferences
    = arAkahukuConfig
    .initPref ("bool", "akahuku.toolbar.preferences", false);
        
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
    arAkahukuUI.prefDialog = openDialog (optionsURL, "", features);
        
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
  setStatusbarPopup : function () {
    var menuitem;
        
    menuitem = document.getElementById ("akahuku-statusbar-popup-all");
    if (menuitem) {
      if (Akahuku.enableAll) {
        menuitem.label = "\u5168\u6A5F\u80FD\u3092 OFF";
      }
      else {
        menuitem.label = "\u5168\u6A5F\u80FD\u3092 ON";
      }
    }
        
    menuitem = document.getElementById ("akahuku-statusbar-popup-p2p");
    if (menuitem) {
      if (arAkahukuP2P.enable) {
        menuitem.label = "P2P \u3092 OFF";
      }
      else {
        menuitem.label = "P2P \u3092 ON";
      }
    }
        
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-p2p-statusbar");
    if (menuitem) {
      if (arAkahukuP2P.enableStatusbar) {
        menuitem.label = "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 OFF";
      }
      else {
        menuitem.label = "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 ON";
      }
    }
        
    var param = Akahuku.getFocusedDocumentParam ();
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-apply");
    if (menuitem) {
      menuitem.disabled = (param != null);
    }
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-external");
    if (menuitem) {
      menuitem.disabled
      = !(param == null
          && arAkahukuBoard.isAbleToAddExternal
          (document.commandDispatcher.focusedWindow.document));
    }
    menuitem
    = document.getElementById ("akahuku-statusbar-popup-respanel");
    if (menuitem) {
      menuitem.disabled
      = (!param || !param.location_info.isReply);
      if (param && "respanel_param" in param && param.respanel_param) {
        if (!param.respanel_param.frame.parentNode) {
          /* レスパネルの要素が誰かに消されてる場合 */
          arAkahukuThread.closeResPanel (param.targetDocument);
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
    
  /**
   * 全機能の ON／OFF を切り替える
   */
  switchDisabled : function () {
    Akahuku.enableAll
    = !arAkahukuConfig
    .initPref ("bool", "akahuku.all", true);
    arAkahukuConfig.prefBranch
    .setBoolPref ("akahuku.all", Akahuku.enableAll);
    arAkahukuConfig.prefBranch
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    arAkahukuConfig.loadPrefBranch ();
    arAkahukuP2P.getConfig ();
    arAkahukuP2P.update ();
        
    arAkahukuStyle.modifyStyleFile (Akahuku.enableAll);
        
    arAkahukuUI.setPanelStatus ();
  },
    
  /**
   * P2P の ON／OFF を切り替える
   */
  switchP2PDisabled : function () {
    arAkahukuP2P.enable
    = !arAkahukuConfig
    .initPref ("bool", "akahuku.p2p", false);
    arAkahukuConfig.prefBranch
    .setBoolPref ("akahuku.p2p", arAkahukuP2P.enable);
    arAkahukuConfig.prefBranch
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    arAkahukuConfig.loadPrefBranch ();
    arAkahukuP2P.getConfig ();
    arAkahukuP2P.update ();
  },
    
  /**
   * P2P ステータスバーの ON／OFF を切り替える
   */
  switchP2PStatusbarDisabled : function () {
    arAkahukuP2P.enableStatusbar
    = !arAkahukuConfig
    .initPref ("bool", "akahuku.p2p.statusbar", true);
        
    arAkahukuConfig.prefBranch
    .setBoolPref ("akahuku.p2p.statusbar", arAkahukuP2P.enableStatusbar);
    arAkahukuConfig.prefBranch
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    arAkahukuP2P.update ();
  },
    
  /**
   * レスパネルの表示を切り替える
   */
  switchResPanelShowing : function () {
    var menuitem
    = document.getElementById ("akahuku-statusbar-popup-respanel");
    if (!menuitem) {
      return;
    }
    if (menuitem.getAttribute ("checked") == "true") {
      arAkahukuThread.closeResPanel ();
      menuitem.removeAttribute ("checked");
    }
    else {
      try {
        arAkahukuThread.showResPanel ();
        menuitem.setAttribute ("checked", "true");
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
  },
    
  /**
   * サイトを開く
   */
  openWebsite : function () {
    var tabbrowser = document.getElementById ("content");
    var newTab
    = tabbrowser.addTab ("http://toshiakisp.github.io/akahuku-firefox-sp/");
    tabbrowser.selectedTab = newTab;
  },
    
  /**
   * ステータスバー、ツールバーのパネルを表示する
   */
  showPanel : function () {
    if (arAkahukuUI.enableToolbarPreferences) {
      var style = -1;
            
      var style = -1;
      if (arAkahukuConfig.prefBranch
          .prefHasUserValue ("browser.chrome.toolbar_style")) {
        style
          = arAkahukuConfig.prefBranch
          .getIntPref ("browser.chrome.toolbar_style");
      }
      var navbar;
      var button;
      var inner;
      navbar = document.getElementById ("nav-bar");
      inner = document.getElementById ("nav-bar-inner");
      if (navbar && inner) {
        if (arAkahukuUI.enableToolbarPreferences) {
          button = document.createElement ("toolbarbutton");
          var id;
          if (style != 1) {
            id = "akahuku-toolbarbutton-preferences-image";
          }
          else {
            id = "akahuku-toolbarbutton-preferences-text";
          }
          button.setAttribute ("id", id);
          button.addEventListener ("command", function (event) {
            arAkahukuUI.showPreferences (event);
          }, false);
          button.setAttribute ("class", "toolbarbutton-1");
          button.setAttribute ("status", Akahuku.enableAll);
          if (style != 0) {
            button.setAttribute ("label", "\u8D64\u798F");
          }
          button.setAttribute ("tooltiptext", "\u8D64\u798F");
                    
          navbar.insertBefore (button, inner);
        }
      }
    }
        
    var panel;
    panel = document.getElementById ("akahuku-statusbarpanel-preferences");
    if (panel) {
      panel.hidden = !arAkahukuUI.enableStatusbarPreferences;
    }
        
    var popup;
    popup = document.getElementById ("akahuku-statusbar-popup");
    if (!popup) {
      /* Mozilla Suite では mainPopupSet が無いためオーバーレイできない */
            
      var mainWindow = document.getElementById ("main-window");
      if (mainWindow) {
        var targetDocument = mainWindow.ownerDocument;
        var popupset = targetDocument.createElement ("popupset");
                
        var label;
                
        popup = targetDocument.createElement ("popup");
        popup.id = "akahuku-statusbar-popup";
        popup.setAttribute ("position", "after_start");
        popup.addEventListener ("popupshowing", function () {
          arAkahukuUI.setStatusbarPopup ();
        }, false);
                
        var menuitem;
        var menuseparator;
                
        label = "\u5168\u6A5F\u80FD\u3092 ON";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.id = "akahuku-statusbar-popup-all";
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command", function () {
          arAkahukuUI.switchDisabled ();
        }, false);
        popup.appendChild (menuitem);
                
        label = "P2P \u3092 ON";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.id = "akahuku-statusbar-popup-p2p";
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command", function () {
          arAkahukuUI.switchP2PDisabled ();
        }, false);
        popup.appendChild (menuitem);
                
        label = "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 ON";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.id = "akahuku-statusbar-popup-p2p-statusbar";
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command", function () {
          arAkahukuUI.switchP2PStatusbarDisabled ();
        }, false);
        popup.appendChild (menuitem);
                
        menuseparator = targetDocument.createElement ("menuseparator");
        menuseparator.id = "akahuku-menuitem-separator";
        popup.appendChild (menuseparator);
                
        label = "\u30B5\u30A4\u30C8\u3092\u958B\u304F";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command", function () {
          arAkahukuUI.openWebsite ();
        }, false);
        popup.appendChild (menuitem);
                
        popupset.appendChild (popup);
                
        mainWindow.appendChild (popupset);
      }
    }
  },
    
  /**
   * パネルのアイコンを、全機能の ON／OFF に合わせて切り替える
   */
  setPanelStatus : function () {
    arAkahukuConfig.loadPrefBranch ();
    Akahuku.getConfig ();
        
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
        ("akahuku-toolbarbutton-preferences", "status", "enabled");
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences", "tooltiptext",
         "\u8D64\u798F "+ AkahukuVersion); // "赤福 "+
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences-image", "status", "enabled");
    }
    else {
      var panel
      = document
      .getElementById ("akahuku-statusbarpanel-preferences");
      if (panel) {
        panel.setAttribute ("status", "disabled");
      }
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences", "status", "disabled");
      this.setAttributeOfToolbarButton
        ("akahuku-toolbarbutton-preferences-image", "status", "disabled");
    }
  },

  setAttributeOfToolbarButton : function (id, attr, value) {
    var button = document.getElementById (id);
    if (button) {
      button.setAttribute (attr, value);
    }
    else if (typeof CustomizableUI != "undefined") {
      // For Australis
      var widgets = CustomizableUI.getWidget (id);
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
  applyFocusedDocument : function () {
    var targetDocument
    = document.commandDispatcher.focusedWindow.document;
        
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
  addFocusedToExternalBoards : function ()
  {
    var targetDocument
    = document.commandDispatcher.focusedWindow.document;
    if (Akahuku.getDocumentParam (targetDocument)) {
      return;
    }

    if (arAkahukuBoard.isAbleToAddExternal (targetDocument)) {
      arAkahukuBoard.addExternal (targetDocument);
      Akahuku.apply (targetDocument, false);
    }
  },
};
