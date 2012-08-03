/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuBloomer, arAkahukuBoard, arAkahukuCatalog,
 *          arAkahukuDelBanner, arAkahukuImage, arAkahukuJPEG,
 *          arAkahukuLink, arAkahukuMHT, arAkahukuP2P, arAkahukuPopupQuote,
 *          arAkahukuPostForm, arAkahukuQuote, arAkahukuReload,
 *          arAkahukuScroll, arAkahukuSidebar, arAkahukuSound, arAkahukuStyle,
 *          arAkahukuTab, arAkahukuThread, arAkahukuThreadOperator,
 *          arAkahukuTitle, arAkahukuUI, arAkahukuWheel
 */

/**
 * 設定管理
 *   Inherits From: nsIObserver
 */
var arAkahukuConfig = {
  prefBranch : null,    /* nsIPrefBranch/nsIPrefBranch2  pref サービス */
    
  /**
   * 初期化処理
   */
  init : function () {
    arAkahukuConfig.prefBranch.setCharPref ("akahuku.version",
                                            AkahukuVersion);
        
    if (Components.interfaces.nsIPrefBranch2) {
      /* 設定を取得する */
      Akahuku.getConfig ();
      arAkahukuTab.getConfig ();
      arAkahukuQuote.getConfig ();
      arAkahukuJPEG.getConfig ();
      arAkahukuImage.getConfig ();
      arAkahukuSidebar.getConfig ();
      arAkahukuSound.getConfig ();
      arAkahukuP2P.getConfig ();
      arAkahukuBloomer.getConfig ();
      arAkahukuBoard.getConfig ();
      arAkahukuFileName.getConfig ();
      arAkahukuTitle.getConfig ();
      arAkahukuScroll.getConfig ();
      arAkahukuDelBanner.getConfig ();
      arAkahukuWheel.getConfig ();
      arAkahukuMHT.getConfig ();
      arAkahukuPostForm.getConfig ();
      arAkahukuReload.getConfig ();
      arAkahukuThreadOperator.getConfig ();
      arAkahukuThread.getConfig ();
      arAkahukuLink.getConfig ();
      arAkahukuPopupQuote.getConfig ();
      arAkahukuCatalog.getConfig ();
            
      if (Akahuku.enableAll) {
        arAkahukuStyle.modifyStyleFile (true);
      }
            
      /* ダイアログからの設定の変更を監視する */
      arAkahukuConfig.prefBranch.addObserver ("akahuku.savepref",
                                              arAkahukuConfig,
                                              false);
    }
    else {
      Akahuku.getConfig ();
      arAkahukuBloomer.getConfig ();
      arAkahukuBoard.getConfig ();
      arAkahukuP2P.getConfig ();
    }
        
    arAkahukuP2P.update ();
  },
    
  /**
   * prefBranch を設定し直す
   */
  loadPrefBranch : function () {
    if (Components.interfaces.nsIPrefBranch2) {
      arAkahukuConfig.prefBranch
      = Components.classes ["@mozilla.org/preferences-service;1"]
      .getService (Components.interfaces.nsIPrefBranch2);
    }
    else {
      arAkahukuConfig.prefBranch
      = Components.classes ["@mozilla.org/preferences-service;1"]
      .getService (Components.interfaces.nsIPrefBranch);
    }
  },
    
  /**
   * 終了処理
   */
  term : function () {
    if (Components.interfaces.nsIPrefBranch2) {
      /* 設定の変更の監視を解除する */
      arAkahukuConfig.prefBranch
      .removeObserver ("akahuku.savepref",
                       arAkahukuConfig);
    }
  },
    
  /**
   * 設定を読み込む
   * 設定が無ければ既定値を書き込む
   *
   * @param  String type
   *         設定の種類
   *           "bool": bool
   *           "char": 文字列
   *           "int":  数値
   * @param  String name
   *         設定名
   * @param  Boolean/String/Number value
   *         既定値
   * @return Boolean/String/Number
   *         取得した値
   *         設定が無ければ既定値
   */
  initPref : function (type, name, value) {
    if (arAkahukuConfig.prefBranch.prefHasUserValue (name)) {
      ; /* switch のインデント用 */
      switch (type) {
        case "bool":
          value = arAkahukuConfig.prefBranch.getBoolPref (name);
          break;
        case "char":
          value = arAkahukuConfig.prefBranch.getCharPref (name);
          break;
        case "int":
          value = arAkahukuConfig.prefBranch.getIntPref (name);
          break;
      }
    }
    else {
      ; /* switch のインデント用 */
      switch (type) {
        case "bool":
          arAkahukuConfig.prefBranch.setBoolPref (name, value);
          break;
        case "char":
          arAkahukuConfig.prefBranch.setCharPref (name, value);
          break;
        case "int":
          arAkahukuConfig.prefBranch.setIntPref (name, value);
          break;
      }
    }
        
    return value;
  },
    
  /**
   * 設定の変更のイベント
   *   nsIObserver.observe
   *
   * @param  nsISupports subject
   *         不明
   * @param  String topic
   *         通知の対象
   * @param  String data
   *         通知の内容
   */
  observe : function (subject, topic, data){
    if (topic == "nsPref:changed"){
      /* 設定の変更の場合 */
            
      /* 設定を取得する */
      Akahuku.getConfig ();
      arAkahukuTab.getConfig ();
      arAkahukuQuote.getConfig ();
      arAkahukuJPEG.getConfig ();
      arAkahukuImage.getConfig ();
      arAkahukuSidebar.getConfig ();
      arAkahukuSound.getConfig ();
      arAkahukuP2P.getConfig ();
      arAkahukuBloomer.getConfig ();
      arAkahukuBoard.getConfig ();
      arAkahukuFileName.getConfig ();
      arAkahukuTitle.getConfig ();
      arAkahukuScroll.getConfig ();
      arAkahukuDelBanner.getConfig ();
      arAkahukuWheel.getConfig ();
      arAkahukuMHT.getConfig ();
      arAkahukuPostForm.getConfig ();
      arAkahukuReload.getConfig ();
      arAkahukuThreadOperator.getConfig ();
      arAkahukuThread.getConfig ();
      arAkahukuLink.getConfig ();
      arAkahukuPopupQuote.getConfig ();
      arAkahukuCatalog.getConfig ();
      arAkahukuUI.getConfig ();
      arAkahukuUI.showPanel ();
      arAkahukuUI.setPanelStatus ();
            
      if (Akahuku.enableAll) {
        arAkahukuStyle.modifyStyleFile (true);
      }
      else {
        arAkahukuStyle.modifyStyleFile (false);
      }
            
      arAkahukuP2P.update ();
    }
  },
  
  defaultTime : -2,
  
  /**
   * スクリプトの実行時間を設定する
   *
   * @param Number t
   *        時間
   */
  setTime : function (t) {
    if (arAkahukuConfig.defaultTime == -2) {
      if (arAkahukuConfig.prefBranch
          .prefHasUserValue ("dom.max_chrome_script_run_time")) {
        arAkahukuConfig.defaultTime
        = arAkahukuConfig.prefBranch
        .getIntPref ("dom.max_chrome_script_run_time");
      }
      else {
        arAkahukuConfig.defaultTime = -1;
      }
    }
    arAkahukuConfig.prefBranch
    .setIntPref ("dom.max_chrome_script_run_time", t);
  },
  
  /**
   * スクリプトの実行時間を元に戻す
   */
  restoreTime : function () {
    if (arAkahukuConfig.defaultTime == -2) {
    }
    else if (arAkahukuConfig.defaultTime == -1) {
      if (arAkahukuConfig.prefBranch
          .prefHasUserValue ("dom.max_chrome_script_run_time")) {
        arAkahukuConfig.prefBranch
        .clearUserPref ("dom.max_chrome_script_run_time");
      }
    }
    else {
      arAkahukuConfig.prefBranch
      .setIntPref ("dom.max_chrome_script_run_time",
                   arAkahukuConfig.defaultTime);
    }
  }
};

