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
            
      var mediator
      = Components.classes ["@mozilla.org/appshell/window-mediator;1"]
      .getService (Components.interfaces.nsIWindowMediator);
      var chromeWindow
      = mediator.getMostRecentWindow ("navigator:browser");
      chromeWindow.arAkahukuSidebar.onSidebarLoad (document);
    }
  }
};
