
/**
 * UI 管理
 *   [ステータスバー]、[ツールバー]
 */
var arAkahukuUI = {
  contextMenuShown : false,      /* Boolean
                                  *   コンテキストメニューが
                                  *   表示されているかどうか */
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
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

  /**
   * ドキュメントに適用する
   */
  applyDocument : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument);
        
    if (param) {
      return;
    }
        
    Akahuku.apply (targetDocument, true);
  },

  /**
   * ドキュメントを外部板に追加する
   */
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
    //Deprecated
  },
  clearStatusPanelText : function (optText, browser)
  {
    //Deprecated
  },
  getStatusPanelText : function (browser) {
    //Deprecated
  }
};
