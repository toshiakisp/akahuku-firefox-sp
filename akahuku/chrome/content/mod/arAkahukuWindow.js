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
    while (targetWindow.frameElement) {
      targetWindow = targetWindow.frameElement.ownerDocument.defaultView;
    }
    var tabbrowser = document.getElementById ("content");
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
    if (tabbrowser.mTabContainer) {
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
  }
};
