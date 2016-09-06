/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku
 */

/**
 * ウィンドウ管理
 */
var arAkahukuWindow = {
  /**
   * 対象のコンテントウィンドウを持つ browser オブジェクト
   * か代わりのXUL要素を取得する
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
    // e10s ready method
    // non-e10s: chromeEventHandler => xul:browser
    // e10s: chromeEventHandler => WindowRoot
    //       (not a browser object, but it is possible set/get attribute)
    try {
      var handler = targetWindow
        .QueryInterface (Ci.nsIInterfaceRequestor)
        .getInterface (Ci.nsIWebNavigation)
        .QueryInterface (Ci.nsIDocShell)
        .chromeEventHandler;
      if (!("setAttribute" in handler)) {
        // WindowRoot (e10s) lacks *Attribute functions, define them
        handler.__akahuku_attr = {};
        handler.setAttribute = function (name, value) {
          this.__akahuku_attr [name] = value;
        };
        handler.getAttribute = function (name) {
          return this.__akahuku_attr [name] || null;
        };
        handler.hasAttribute = function (name) {
          return this.__akahuku_attr.hasOwnProperty (name);
        };
        handler.removeAttribute = function (name) {
          delete this.__akahuku_attr [name];
        };
      }
      return handler;
    }
    catch (e) {
    }
    // code works only for XUL overlay (depends on document global)
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
   * コンテント window から nsIWebProgress を得る
   * (content-process ready)
   */
  getWebProgressForWindow : function (targetWindow) {
    try {
      return targetWindow
        .QueryInterface (Ci.nsIInterfaceRequestor)
        .getInterface (Ci.nsIWebNavigation)
        .QueryInterface (Ci.nsIInterfaceRequestor)
        .getInterface (Ci.nsIWebProgress);
    }
    catch (e) { Akahuku.debug.exception (e);
      // classic method
      return arAkahukuWindow.getBrowserForWindow (targetWindow)
        .webProgress;
    }
  },
  /**
   * コンテント window から message manager を得る
   * (content-process ready)
   */
  getMessageManagerForWindow : function (targetWindow) {
    return targetWindow
      .QueryInterface (Ci.nsIInterfaceRequestor)
      .getInterface (Ci.nsIWebNavigation)
      .QueryInterface (Ci.nsIInterfaceRequestor)
      .QueryInterface (Ci.nsIDocShell)
      .QueryInterface (Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIContentFrameMessageManager);
  },

  isContentWindowPrivate : function (targetWindow) {
    try {
      return targetWindow
        .QueryInterface (Ci.nsIInterfaceRequestor)
        .getInterface (Ci.nsIWebNavigation)
        .QueryInterface (Ci.nsILoadContext)
        .usePrivateBrowsing;
    }
    catch (e) {
      return false;
    }
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
    return arAkahukuWindow.getTabForBrowser
      (arAkahukuWindow.getBrowserForWindow (targetWindow));
  },
  getTabForBrowser : function (targetBrowser) {
    if (!(targetBrowser instanceof Components.interfaces.nsIDOMXULElement)) {
      throw Components.Exception ("must be XULElement, but " + targetBrowser,
          Components.results.NS_ERROR_ILLEGAL_VALUE,
          Components.stack.caller);
    }
    var xulDocument = targetBrowser.ownerDocument;
    var tabbrowser = xulDocument.getElementById ("content");
    if ("tabs" in tabbrowser) {
      /* Firefox4/Gecko2.0 以降では安全なプロパティだけを使って単純に */
      var numTabs = tabbrowser.tabs.length;
      for (var i = 0; i < numTabs; i ++) {
		var browser = tabbrowser.getBrowserForTab (tabbrowser.tabs [i]);
        if (browser == targetBrowser) {
          return tabbrowser.tabs [i];
        }
      }
      return null;
    }
    else if (tabbrowser.mTabContainer) {
      for (var i = 0; i < tabbrowser.mTabContainer.childNodes.length; i ++) {
        var tab = tabbrowser.mTabContainer.childNodes [i];
        if (tab.linkedBrowser
            && tab.linkedBrowser == targetBrowser) {
          return tab;
        }
      }
            
      if ("mPanelContainer" in tabbrowser
          && "childNodes" in tabbrowser.mPanelContainer) {
        for (var i = 0; i < tabbrowser.mPanelContainer.childNodes.length;
             i ++) {
          var b = tabbrowser.mPanelContainer.childNodes [i];
          if (b == targetBrowser) {
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

  focusAkahukuTabByURI : function (uri, optWindow, optNoEnumerate) {
    var entries
      = Components.classes
      ["@mozilla.org/appshell/window-mediator;1"]
      .getService (Components.interfaces.nsIWindowMediator)
      .getEnumerator ("navigator:browser");
    var window = optWindow;
    if (!window && entries.hasMoreElements ()) {
      window = entries.getNext ();
    }
    while (window) {
      var params = window.Akahuku.getDocumentParamsByURI (uri);
      if (params.length > 0) {
        try {
          var targetWindow = params [0].targetDocument.defaultView;
          var tab = window.arAkahukuWindow.getTabForWindow (targetWindow);
          window.focus ();
          window.document.getElementById ("content").selectedTab = tab;
          return targetWindow;
        }
        catch (e) { Components.utils.reportError (e);
        }
      }
      if (!optNoEnumerate && entries.hasMoreElements ()) {
        window = entries.getNext ();
      }
      else {
        break;
      }
    }
    return null;
  },

  /**
   * コンテンツWindowに対応する tab にフォーカスを移す
   */
  focusTabForWindow : function (targetWindow) {
    arAkahukuWindow.focusTabForBrowser
      (arAkahukuWindow.getBrowserForWindow (targetWindow));
  },
  focusTabForBrowser : function (targetBrowser) {
    if (!(targetBrowser instanceof Components.interfaces.nsIDOMXULElement)) {
      throw Components.Exception ("must be XULElement, but " + targetBrowser,
          Components.results.NS_ERROR_ILLEGAL_VALUE,
          Components.stack.caller);
    }
    var xulDocument = targetBrowser.ownerDocument;
    var chromeWindow = xulDocument.defaultView.top;
    var tab = arAkahukuWindow.getTabForBrowser (targetBrowser);
    if (tab) {
      chromeWindow.focus ();
      xulDocument.getElementById ("content").selectedTab = tab;
    }
    else {
      Akahuku.debug.warn ("arAkahukuWindow.focusTabForWindow: "
          + "tab not found for window " + targetWindow);
    }
  },
};
