
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
  isObserving : false,   /* boolean 監視しているかどうか */
    
  /**
   * 初期化処理
   */
  init : function () {
    arAkahukuConfig.loadPrefBranch ();
    try {
      var oldVersion = arAkahukuConfig.getCharPref ("akahuku.version");
      var cr = arAkahukuCompat.compareVersion (String (AkahukuVersion), oldVersion);
      if (cr > 0) {
        // バージョンアップ時
        Akahuku.debug.log ("Version up detected from " + oldVersion + " to " + AkahukuVersion);

        // 対象バージョン以上への更新の判定
        var updatedOver = function (v) {
          var c = arAkahukuCompat.compareVersion;
          return (c (oldVersion, v) < 0 && c (String (AkahukuVersion), v) >= 0);
        };

        if (updatedOver ("5.2.90.sp_rev.39")) {
          Akahuku.debug.log ("Reset akahuku.ext.maximageretries to 0");
          arAkahukuConfig.setIntPref ("akahuku.ext.maximageretries", 0);
        }
      }
      else if (cr < 0) {
        // バージョンダウン
        Akahuku.debug.log ("Version down detected from "
            + oldVersion + " to " + AkahukuVersion);
      }
      else {
        // バージョン据え置き
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    arAkahukuConfig.setCharPref ("akahuku.version", AkahukuVersion);
        
    if (typeof (arAkahukuConfig.prefBranch.addObserver) === "function") {
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
            
      /* ダイアログからの設定の変更を監視する */
      arAkahukuConfig.prefBranch.addObserver ("akahuku.savepref",
                                              arAkahukuConfig,
                                              false);
      arAkahukuConfig.isObserving = true;
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
    if (arAkahukuConfig.isObserving) {
      /* 設定の変更の監視を解除する */
      arAkahukuConfig.prefBranch
      .removeObserver ("akahuku.savepref",
                       arAkahukuConfig);
      arAkahukuConfig.isObserving = false;
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

  setBoolPref : function (prefName, value) {
    this.prefBranch.setBoolPref (prefName, value);
  },
  setCharPref : function (prefName, value) {
    this.prefBranch.setCharPref (prefName, value);
  },
  setIntPref : function (prefName, value) {
    this.prefBranch.setIntPref (prefName, value);
  },
  getBoolPref : function (prefName) {
    return this.prefBranch.getBoolPref (prefName);
  },
  getCharPref : function (prefName) {
    return this.prefBranch.getCharPref (prefName);
  },
  getIntPref : function (prefName) {
    return this.prefBranch.getIntPref (prefName);
  },
  prefHasUserValue : function (prefName) {
    return this.prefBranch.prefHasUserValue (prefName);
  },
  clearUserPref : function (prefName) {
    this.prefBranch.clearUserPref (prefName);
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
            
      arAkahukuStyle.onPrefChanged ();
            
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

