/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * 履歴管理
 */
var arAkahukuHistory = {
  browserHistory : null,     /* nsIBrowserHistory  ブラウザの履歴 */
  browserHistoryNew : false, /* Boolean  nsIGlobalHistory2 かどうか */
    
  /**
   * 初期化処理
   */
  init : function () {
    try {
      arAkahukuHistory.browserHistory
      = Components.classes ["@mozilla.org/browser/global-history;2"]
      .getService (Components.interfaces.nsIBrowserHistory);
      arAkahukuHistory.browserHistoryNew = true;
    }
    catch (e) {
      /* 古い場合 */
      arAkahukuHistory.browserHistory
      = Components.classes ["@mozilla.org/browser/global-history;1"]
      .getService (Components.interfaces.nsIBrowserHistory);
    }
  },
    
  /**
   * 既読かどうかを返す
   *
   * @param  nsIURI uri
   *         対象の URI
   * @return Boolean
   *         既読かどうか
   */
  isVisited : function (uri) {
    if (arAkahukuHistory.browserHistoryNew) {
      return arAkahukuHistory.browserHistory.isVisited (uri);
    }
    else {
      return arAkahukuHistory.browserHistory.isVisited (uri.spec);
    }
  }
};

