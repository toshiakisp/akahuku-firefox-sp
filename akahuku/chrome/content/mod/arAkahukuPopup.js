
/* global arAkahukuCatalog */

/**
 * ポップアップ画像のキャッシュデータ
 */
function arAkahukuCacheImageData () {
  this.caches = new Array ();
}
arAkahukuCacheImageData.prototype = {
  caches : null, /* Array  画像のキャッシュ
                  *   [[String キャッシュのキー,
                  *     HTMLImageElement キャッシュ], ...] */
    
  /**
   * データを開放する
   */
  destruct : function () {
    this.caches = null;
  },
    
  /**
   * キャッシュが存在するかチェックする
   *
   * @param  String key
   *         キャッシュのキー
   * @return Boolean
   *         キャッシュが存在すれば true
   */
  exists : function (key) {
    for (var i = this.caches.length - 1; i >= 0; i--) {
      if (this.caches [i][0] == key) {
        return true;
      }
    }
        
    return false;
  },
    
  /**
   * キャッシュを取得する
   *
   * @param  String key
   *         キャッシュのキー
   * @return HTMLImageElement
   *         見付からなかった場合は undefined
   */
  getCache : function (key) {
    for (var i = this.caches.length - 1; i >= 0; i--) {
      if (this.caches [i][0] == key) {
        var result = this.caches [i];
        this.caches.splice (i, 1);
        this.caches.push (result);
        return result [1];
      }
    }
        
    return undefined;
  },
    
  /**
   * キャッシュを削除する
   *
   * @param  String key
   *         キャッシュのキー
   */
  removeCache : function (key) {
    for (var i = this.caches.length - 1; i >= 0; i--) {
      if (this.caches [i][0] == key) {
        var result = this.caches [i];
        this.caches.splice (i, 1);
      }
    }
  },
    
  /**
   * キャッシュを登録する
   *
   * @param  String key
   *         キャッシュのキー
   * @param  HTMLImageElement image
   *         キャッシュ
   */
  register : function (key, image) {
    if (!this.exists (key)) {
      this.caches.push ([key, image]);
      while (this.caches.length > arAkahukuCatalog.zoomCacheCount) {
        this.caches [0][1] = null;
        this.caches.shift ();
      }
    }
  }
};
/**
 * ポップアップデータのプロトタイプ
 */
function arAkahukuPopupData () {
}
arAkahukuPopupData.prototype = {
  /**
   * データを開放する
   *   arAkahukuPopupData.destruct
   */
  destruct : function () {
  },
    
  /**
   * ポップアップの状態変更
   *   arAkahukuPopupData.run
   *
   * @param  Number state
   *         ポップアップの状態
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  run : function (state, param) {
  },
    
  /**
   * ポップアップの削除要求
   *   arAkahukuPopupData.queryPurge
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   * @return Boolean
   *         削除してよいかどうか
   */
  queryPurge : function (param) {
  }
};
/**
 * ポップアップ管理データ
 *
 * @param  Number interval
 *         ポップアップを動かす間隔
 * @param  HTMLDocument doc
 *         対象のドキュメント
 */
function arAkahukuPopupParam (interval, doc) {
  this.cacheImageData = new arAkahukuCacheImageData ();
  this.popups = new Object ();
  this.effectors = new Object ();
  this.interval = interval;
  this.targetDocument = doc;
}
arAkahukuPopupParam.prototype = {
  cacheImageData : null,   /* arAkahukuCacheImageData  画像のキャッシュ */
  popups : null,           /* Object  現在表示しているポップアップ
                            *   <String ポップアップのキー,
                            *    arAkahukuPopupData ポップアップのデータ> */
  effectors : null,        /* Object  現在動いているポップアップ
                            *   <String ポップアップのキー,
                            *    [arAkahukuPopupData ポップアップデータ,
                            *     function エフェクトの関数]> */
  effectorsLength : 0,     /* Number  現在動いているポップアップの数 */
  effectorsTimerID : null, /* Number  ポップアップを動かすタイマー ID */
  targetDocument : null,   /* HTMLDocument  対象のドキュメント */
  enabled : true,          /* Boolean  有効フラグ */
  interval : 20,           /* Number  ポップアップの動作の間隔 */
  lastPopupKey : "",       /* String  最後に作成したポップアップのキー */
    
  /**
   * データを開放する
   */
  destruct : function () {
    try {
      this.cacheImageData.destruct ();
    }
    catch (e) {
    }
    this.cacheImageData = null;
  
    for (var key in this.popups) {
      try {
        this.popups [key].destruct ();
        this.popups [key] = null;
        delete this.popups [key];
      }
      catch (e) {
      }
    }
    this.popups = null;
        
    this.effectors = null;
        
    var window = this.targetDocument.defaultView;
    if (window && this.effectorsTimerID != null) {
      window.clearInterval (this.effectorsTimerID);
    }
    this.effectorsTimerID = null;
        
    this.targetDocument = null;
  }
};
/**
 * ポップアップ管理
 */
var arAkahukuPopup = {
  /**
   * ポップアップのエフェクトの追加
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   * @param  arAkahukuPopupData popupdata
   *         ポップアップデータ
   * @param  Function effectFunc
   *         エフェクトの関数
   */
  addEffector : function (param, popupdata, effectFunc) {
    if (!param.effectors [popupdata.key]) {
      param.effectorsLength ++;
    }
        
    param.effectors [popupdata.key] = [popupdata, effectFunc];
        
    if (!param.effectorsTimerID) {
      var window = param.targetDocument.defaultView;
      param.effectorsTimerID
        = window.setInterval (arAkahukuPopup.effectorTimer,
                       param.interval,
                       param);
    }
  },
    
  /**
   * ポップアップのエフェクトのイベント
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  effectorTimer : function (param) {
    for (var key in param.effectors) {
      param.effectors [key][1].apply
      (param.effectors [key][0], [param]);
    }
  },
    
  /**
   * ポップアップのエフェクトの削除
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   * @param  arAkahukuPopupData popupdata
   *         ポップアップデータ
   */
  removeEffector : function (param, popupdata) {
    if (param.effectors [popupdata.key]) {
      param.effectors [popupdata.key][0] = null;
      param.effectors [popupdata.key][1] = null;
      param.effectors [popupdata.key] = null;
      delete param.effectors [popupdata.key];
      param.effectorsLength --;
            
      if (param.effectorsLength == 0
          && param.effectorsTimerID) {
        var window = param.targetDocument.defaultView;
        window.clearInterval (param.effectorsTimerID);
        param.effectorsTimerID = null;
      }
    }
  },
    
  /**
   * ポップアップの追加
   *
   * @param  String key
   *         ポップアップのキー
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   * @param  arAkahukuPopupData popupdata
   *         ポップアップデータ
   */
  addPopup : function (key, param, popupdata) {
    arAkahukuPopup.removeActivePopups (param);
        
    key = "_" + key;
        
    if (!param.popups [key] && param.enabled) {
      param.popups [key] = popupdata;
      popupdata.key = key;
      popupdata.run (0, param);
    }
  },
    
  /**
   * 動作中の全てのポップアップの削除
   *
   * @param arAkahukuPopupParam param
   *        ポップアップ管理データ
   */
  removeActivePopups : function (param) {
    var needDeletes = new Object ();
    var key;
    for (key in param.popups) {
      if (param.popups [key].queryPurge (param)) {
        needDeletes [key] = param.popups [key];
      }
    }
        
    for (key in needDeletes) {
      param.popups [key].destruct ();
      param.popups [key] = null;
      delete param.popups [key];
    }
  }
};
