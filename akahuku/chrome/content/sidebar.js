/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: arAkahukuSidebar
 */

/**
 * サイドバー
 */
var AkahukuSidebar = {
  initialized : false, /* Boolean  初期化フラグ */
    
  /**
   * 初期化処理
   */
  init : function () {
    if (!AkahukuSidebar.initialized) {
      AkahukuSidebar.initialized = true;
            
      if ("arAkahukuSidebar" in window.top) {
        window.top.arAkahukuSidebar.onSidebarLoad (document);
        return;
      }
      else { // サイドバー以外
      var mediator
      = Components.classes ["@mozilla.org/appshell/window-mediator;1"]
      .getService (Components.interfaces.nsIWindowMediator);
      var chromeWindow
      = mediator.getMostRecentWindow ("navigator:browser");
      // 別 の ChromeWindow にならないように
      chromeWindow
        = chromeWindow.arAkahukuWindow
        .getParentWindowInChrome (window.top).top;

      // デバッグ目的以外ではサイドバー以外で動かさない
      if (chromeWindow.Akahuku.debug.enabled)
      chromeWindow.arAkahukuSidebar.onSidebarLoad (document);
      }
    }
  },

  term : function ()
  {
    var wnd = window.top;

    if (!("arAkahukuSidebar" in wnd)) {
      // サイドバー以外で開いている場合
      var mediator
      = Components.classes ["@mozilla.org/appshell/window-mediator;1"]
      .getService (Components.interfaces.nsIWindowMediator);
      var chromeWindow
        = mediator.getMostRecentWindow ("navigator:browser");
      // 別 の ChromeWindow にならないように
      wnd = chromeWindow.arAkahukuWindow.getParentWindowInChrome (wnd).top;
    }

    wnd.arAkahukuSidebar.onSidebarUnload (document);
  },
};
