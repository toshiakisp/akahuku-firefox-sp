
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
    
  /**
   * 初期化処理
   */
  initForXUL : function () {
    arAkahukuUI.showPanel ();
    arAkahukuUI.setPanelStatus ();
        
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
        
    window.setTimeout
    (function (win) {arAkahukuUI.modifyLocationbar (win)},
     1000, window);
  },
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
    if (typeof window !== "undefined") { // XUL overlay context
      arAkahukuUI.showPanelForWindow (window);
      return;
    }
    // for all windows (jsm context)
    arAkahukuWindow.forEachWindow (function (win) {
      arAkahukuUI.showPanelForWindow (win);
    });
  },
  showPanelForWindow : function (window) {
    var document = window.document;
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
                
        var label, command;
                
        popup = targetDocument.createElement ("popup");
        popup.id = "akahuku-statusbar-popup";
        popup.setAttribute ("position", "after_start");
        popup.addEventListener ("popupshowing",
            arAkahukuUI.setStatusbarPopup, false);
                
        var menuitem;
        var menuseparator;
                
        label = "\u5168\u6A5F\u80FD\u3092 ON";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.id = "akahuku-statusbar-popup-all";
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command",
          arAkahukuUI.switchDisabled, false);
        popup.appendChild (menuitem);
                
        label = "P2P \u3092 ON";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.id = "akahuku-statusbar-popup-p2p";
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command",
          arAkahukuUI.switchP2PDisabled, false);
        popup.appendChild (menuitem);
                
        label = "P2P \u30B9\u30C6\u30FC\u30BF\u30B9\u30D0\u30FC\u3092 ON";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.id = "akahuku-statusbar-popup-p2p-statusbar";
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command",
          arAkahukuUI.switchP2PStatusbarDisabled, false);
        popup.appendChild (menuitem);
                
        menuseparator = targetDocument.createElement ("menuseparator");
        menuseparator.id = "akahuku-menuitem-separator";
        popup.appendChild (menuseparator);
                
        label = "\u30B5\u30A4\u30C8\u3092\u958B\u304F";
        menuitem = targetDocument.createElement ("menuitem");
        menuitem.setAttribute ("label", label);
        menuitem.addEventListener ("command", arAkahukuUI.openWebsite);
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

    if (typeof window !== "undefined") { // XUL overlay context
      arAkahukuUI.setPanelStatusForWindow (window);
      return;
    }
    // for all windows (jsm context)
    arAkahukuWindow.forEachWindow (function (win) {
      arAkahukuUI.setPanelStatusForWindow (win);
    });
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
