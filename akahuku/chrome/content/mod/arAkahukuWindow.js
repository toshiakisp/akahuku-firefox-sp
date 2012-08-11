/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * ウィンドウ管理
 */
var arAkahukuWindow = {
  /**
   * 対象のウィンドウを持つ browser オブジェクトを取得する
   * 
   * @param  Window targetWindow
   *         対象のウィンドウ
   * @return Browser
   *         見付からなければ null
   */
  getBrowserForWindow : function (targetWindow) {
    /* フレーム中からの場合は親の window を手繰る */
    while (targetWindow.frameElement) {
      targetWindow = targetWindow.frameElement.ownerDocument.defaultView;
    }
    var tabbrowser = document.getElementById ("content");
    if ("getBrowserForDocument" in tabbrowser) {
      return tabbrowser.getBrowserForDocument (targetWindow.document);
    }
    /* 古いコード */
    if (tabbrowser.mTabContainer) {
      for (var i = 0; i < tabbrowser.mTabContainer.childNodes.length; i ++) {
        var tab = tabbrowser.mTabContainer.childNodes [i];
        if (tab.linkedBrowser
            && tab.linkedBrowser
            .contentWindow == targetWindow) {
          return tab.linkedBrowser;
        }
      }
    }
    else if (tabbrowser.contentWindow == targetWindow) {
      return tabbrowser;
    }
        
    return null;
  },
    
  /**
   * 対象のウィンドウを持つ tab オブジェクトを取得する
   * 
   * @param  Window targetWindow
   *         対象のウィンドウ
   * @return Tab
   *         見付からなければ null
   */
  getTabForWindow : function (targetWindow) {
    var tabbrowser = document.getElementById ("content");
    if ("tabs" in tabbrowser) {
      /* Firefox4/Gecko2.0 以降では安全なプロパティだけを使って単純に */
      var numTabs = tabbrowser.tabs.length;
      for (var i = 0; i < numTabs; i ++) {
		var browser = tabbrowser.getBrowserForTab (tabbrowser.tabs [i]);
        if (browser.contentWindow == targetWindow) {
          return tabbrowser.tabs [i];
        }
      }
      return null;
    }
    else if (tabbrowser.mTabContainer) {
      for (var i = 0; i < tabbrowser.mTabContainer.childNodes.length; i ++) {
        var tab = tabbrowser.mTabContainer.childNodes [i];
        if (tab.linkedBrowser
            && tab.linkedBrowser
            .contentWindow == targetWindow) {
          return tab;
        }
      }
            
      if ("mPanelContainer" in tabbrowser
          && "childNodes" in tabbrowser.mPanelContainer) {
        for (var i = 0; i < tabbrowser.mPanelContainer.childNodes.length;
             i ++) {
          var b = tabbrowser.mPanelContainer.childNodes [i];
          if (b.contentWindow == targetWindow) {
            return tabbrowser.mTabContainer.childNodes [i];
          }
        }
      }
    }
        
    return null;
  },

  /**
   * chrome/content間を越えて親ウィンドウを得る
   * 
   * @param  Window targetWindow
   *         対象のウィンドウ
   * @return Window
   *         見付からなければ null
   */
  getParentWindowInChrome : function (targetWindow) {
    var parentWindow = null;
    try {
      parentWindow
        = targetWindow
        .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
        .getInterface (Components.interfaces.nsIWebNavigation)
        .QueryInterface (Components.interfaces.nsIDocShellTreeItem)
        .parent
        .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
        .getInterface (Components.interfaces.nsIDOMWindow);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    if ("unwrap" in XPCNativeWrapper) {
      parentWindow = XPCNativeWrapper.unwrap (parentWindow);
    }
    else {
      if (parentWindow.wrappedJSObject) {
        parentWindow = parentWindow.wrappedJSObject;
      }
    }
    return parentWindow;
  },

};
