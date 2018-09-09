
/* global Akahuku */

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
    Akahuku.debug.error('deprecated');
    return null;
  },
  /**
   * コンテント window から nsIWebProgress を得る
   * (content-process ready)
   */
  getWebProgressForWindow : function (targetWindow) {
    Akahuku.debug.error('deprecated');
    return null;
  },
  /**
   * コンテント window から message manager を得る
   * (content-process ready)
   */
  getMessageManagerForWindow : function (targetWindow) {
    Akahuku.debug.error('deprecated');
    return null;
  },

  isContentWindowPrivate : function (targetWindow) {
    return browser.extension.inIncognitoContext;
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
    Akahuku.debug.error('deprecated');
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
    Akahuku.debug.error('deprecated');
    return null;
  },

  getChromeWindowForBrowser : function (browser) {
    Akahuku.debug.error('deprecated');
    return null;
  },

  getMostRecentWindow : function () {
    Akahuku.debug.error('deprecated');
    return null;
  },

  forEachWindow : function (callback) {
    Akahuku.debug.error('deprecated');
  },

  focusAkahukuTabByURI : function (uri, optWindow, optNoEnumerate) {
    Akahuku.debug.error('NotYetImplemented');
    return null;
  },

  /**
   * コンテンツWindowに対応する tab にフォーカスを移す
   */
  focusTabForWindow : function (targetWindow) {
    Akahuku.debug.error('deprecated');
  },

};
