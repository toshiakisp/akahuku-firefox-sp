
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
        && arAkahukuURLUtil.isAbleToAddExternal(focusedDocument.location.href),
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
   * ステータスバー、ツールバーのパネルを表示する
   */
  showPanel : function () {
    // no action need in content
    Akahuku.debug.error('deprecated');
  },
    
  /**
   * パネルのアイコンを、全機能の ON／OFF に合わせて切り替える
   */
  setPanelStatus : function () {
    // no action need in content
    Akahuku.debug.error('deprecated');
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

    if (arAkahukuURLUtil.isAbleToAddExternal(targetDocument.location.href)) {
      arAkahukuBoard.addExternal (targetDocument);
      Akahuku.apply (targetDocument, false);
    }
  },


  /**
   * マウスホバーで表示されるステータスを設定する
   */
  setStatusPanelText : function (text, type, browser) {
    Akahuku.debug.error('NotYetImplemented, deprecated');
    /*
    arAkahukuIPC.sendSyncCommand
      ("UI/setStatusPanelText", [text, type],
       browser.ownerGlobal);
    */
  },
  clearStatusPanelText : function (optText, browser)
  {
    Akahuku.debug.error('NotYetImplemented, deprecated');
    /*
    arAkahukuIPC.sendSyncCommand
      ("UI/clearStatusPanelText", [optText],
       browser.ownerGlobal);
    */
  },
  getStatusPanelText : function (browser) {
    Akahuku.debug.error('NotYetImplemented, deprecated');
    return "";
    /*
    return arAkahukuIPC.sendSyncCommand
      ("UI/getStatusPanelText", [],
       browser.ownerGlobal);
    */
  }
};
