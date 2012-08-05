/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuDocumentParam,
 *          arAkahukuMHT, arAkahukuPopup, arAkahukuPostForm, arAkahukuReload,
 *          arAkahukuStyle
 */

/**
 * サムネのポップアップデータ
 *   Inherits From: arAkahukuPopupData
 *
 * @param HTMLAnchorElement anchor
 *        ポップアップのサムネの画像を含む a 要素
 * @param HTMLImageElement image
 *        サムネの画像の img 要素
 */
function arAkahukuThumbnailPopupData (anchor, image) {
  this.anchor = anchor;
  this.image = image;
  this.opacity = arAkahukuThreadOperator.enableThumbnailAlpha ? 50: 100;
}
arAkahukuThumbnailPopupData.prototype = {
  state : 0,          /* Number  ポップアップの状態
                       *   0: ポップアップ表示待ち
                       *   1: 巻き下げ中
                       *   2: 巻き下げ完了
                       *   3: 巻き上げ中
                       *   4: 巻き上げ完了
                       *   5: 拡大中
                       *   6: 拡大完了
                       *   7: 縮小中
                       *   8: 縮小完了 */
  anchor : null,      /* HTMLAnchorElement  ポップアップのサムネの画像を
                       *   含む a 要素 */
  image : null,       /* HTMLImageElement  サムネの画像の img 要素 */
  targetWidth : 0,    /* Number  固定したサムネの幅 */
  targetHeight : 0,   /* Number  固定したサムネの高さ */
  zoomFactor : 0,     /* Number  拡大の状態 */
  rollFactor : 0,     /* Number  巻きの状態 */
  lastTime : 0,       /* Number  動作のタイマーの前回の時間 */
  opacity : 100,    /* String  透明度 */
    
  zoomState : 0,      /* Number  拡大の状態
                       *   0: 指定なし
                       *   1: 拡大
                       *   2: 縮小 */
  rollState : 0,      /* Number  巻きの状態
                       *   0: 指定なし
                       *   1: 巻き下げ
                       *   2: 巻き上げ */
    
  /**
   * データを開放する
   *   arAkahukuPopupData.destruct
   */
  destruct : function () {
    this.image = null;
    this.anchor = null;
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
    if (this.state == 1
        || this.state == 3
        || this.state == 5
        || this.state == 7) {
      if (state == 1) {
        this.rollState = 1;
        return;
      }
      else if (state == 3) {
        this.rollState = 2;
        return;
      }
      else if (state == 5) {
        this.zoomState = 1;
        return;
      }
      else if (state == 7) {
        this.zoomState = 2;
        return;
      }
    }
        
    var oldstate = this.state;
    this.state = state;
    switch (state) {
      case 0:
        this.rollFactor = 0;
        this.zoomFactor = 0;
        if (arAkahukuThreadOperator.enableThumbnailRoll) {
          this.anchor.firstChild.width = "1";
          this.anchor.firstChild.height = "1";
        }
        else {
          this.anchor.firstChild.style.display = "inline";
        }
        this.setOpacity ();
        switch (arAkahukuThreadOperator.thumbnailSize) {
          case 0:
            this.targetWidth = this.image.width;
            this.targetHeight = this.image.height;
            break;
          case 1:
            this.targetWidth = parseInt (this.image.width * 0.5);
            this.targetHeight = parseInt (this.image.height * 0.5);
            break;
        }
        if (!arAkahukuThreadOperator.enableThumbnailRoll) {
          this.anchor.firstChild.width = this.targetWidth;
          this.anchor.firstChild.height = this.targetHeight;
        }
        break;
      case 1:
        this.anchor.firstChild.style.display = "inline";
        this.lastTime = new Date ().getTime ();
        arAkahukuPopup.addEffector (param, this,
                                    this.rolldownEffect);
        break;
      case 2:
        arAkahukuPopup.removeEffector (param, this);
        this.rollFactor = 100;
        break;
      case 3:
        this.lastTime = new Date ().getTime ();
        arAkahukuPopup.addEffector (param, this,
                                    this.rollupEffect);
        break;
      case 4:
        this.rollFactor = 0;
        this.zoomFactor = 0;
        this.anchor.firstChild.style.display = "none";
        arAkahukuPopup.removeEffector (param, this);
        break;
      case 5:
        this.setOpacity ();
        if (arAkahukuThreadOperator.thumbnailSize == 1
            && arAkahukuThreadOperator.enableThumbnailSizeZoom) {
          arAkahukuPopup.addEffector (param, this,
                                      this.zoominEffect);
        }
        else {
          this.state = oldstate;
        }
        break;
      case 6:
        arAkahukuPopup.removeEffector (param, this);
        this.zoomFactor = 100;
        break;
      case 7:
        this.setOpacity ();
        if (arAkahukuThreadOperator.thumbnailSize == 1
            && arAkahukuThreadOperator.enableThumbnailSizeZoom) {
          arAkahukuPopup.addEffector (param, this,
                                      this.zoomoutEffect);
        }
        else {
          this.state = oldstate;
        }
        break;
      case 8:
        arAkahukuPopup.removeEffector (param, this);
        this.zoomFactor = 0;
        break;
    }
        
    if (this.state == 2
        || this.state == 4
        || this.state == 6
        || this.state == 8) {
      if (this.rollState == 1) {
        this.rollState = 0;
        this.run (1, param);
      }
      else if (this.rollState == 2) {
        this.rollState = 0;
        this.run (3, param);
      }
      else if (this.zoomState == 1) {
        this.zoomState = 0;
        this.run (5, param);
      }
      else if (this.zoomState == 2) {
        this.zoomState = 0;
        this.run (7, param);
      }
    }
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
    return false;
  },
    
  /**
   * 透明度を設定する
   */
  setOpacity : function () {
    if (arAkahukuThreadOperator.enableThumbnailAlpha) {
      if (arAkahukuThreadOperator.thumbnailSize == 1
          && arAkahukuThreadOperator.enableThumbnailSizeZoom) {
        this.anchor.firstChild.style.MozOpacity
        = ((100 - this.opacity) * this.zoomFactor / 100 + this.opacity)
        / 100;
      }
      else {
        if (this.state == 5) {
          this.anchor.firstChild.style.MozOpacity = "1.0";
        }
        else {
          this.anchor.firstChild.style.MozOpacity = "0.5";
        }
      }
    }
    else {
      this.anchor.firstChild.style.MozOpacity = "1.0";
    }
  },
    
  /**
   * ポップアップの巻き下げ
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  rolldownEffect : function (param) {
    if (this.state != 1) {
      return;
    }
        
    if (this.rollFactor < 100) {
      var nowTime = new Date ().getTime ();
      var diff = (nowTime - this.lastTime) / 2;
      this.lastTime = nowTime;
      if (diff <= 0) {
        diff = 1;
      }
      else if (diff > 10) {
        diff = 10;
      }
      this.rollFactor += diff;
            
      if (this.rollFactor > 100) {
        this.rollFactor = 100;
      }
            
      var t = this.rollFactor / 100;
      var p = 1.5 * 3.0 * (1 - t) * Math.pow (t, 2) + Math.pow (t, 3);
            
      if (this.zoomFactor == 100) {
        this.anchor.firstChild.width = this.image.width;
        this.anchor.firstChild.height = p * this.image.height;
      }
      else {
        this.anchor.firstChild.width = this.targetWidth;
        this.anchor.firstChild.height = p * this.targetHeight;
      }
    }
    else {
      this.run (2, param);
    }
  },
    
  /**
   * ポップアップの巻き上げ
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  rollupEffect : function (param) {
    if (this.state != 3) {
      return;
    }
    if (this.rollFactor > 0) {
      var nowTime = new Date ().getTime ();
      var diff = (nowTime - this.lastTime) / 2;
      this.lastTime = nowTime;
      if (diff <= 0) {
        diff = 1;
      }
      else if (diff > 10) {
        diff = 10;
      }
      this.rollFactor -= diff;
            
      if (this.rollFactor < 0) {
        this.rollFactor = 0;
      }
            
      var t = this.rollFactor / 100;
      var p = 1.5 * 3.0 * (1 - t) * Math.pow (t, 2) + Math.pow (t, 3);
            
      if (this.zoomFactor == 100) {
        this.anchor.firstChild.width = this.image.width;
        this.anchor.firstChild.height = p * this.image.height;
      }
      else {
        this.anchor.firstChild.width = this.targetWidth;
        this.anchor.firstChild.height = p * this.targetHeight;
      }
    }
    else {
      this.run (4, param);
    }
  },
    
  /**
   * ポップアップの拡大
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoominEffect : function (param) {
    if (this.state != 5) {
      return;
    }
        
    if (this.zoomFactor < 100) {
      var nowTime = new Date ().getTime ();
      var diff = (nowTime - this.lastTime) / 2;
      this.lastTime = nowTime;
      if (diff <= 0) {
        diff = 1;
      }
      else if (diff > 10) {
        diff = 10;
      }
      this.zoomFactor += diff;
            
      if (this.zoomFactor > 100) {
        this.zoomFactor = 100;
      }
            
      var t = this.zoomFactor / 100;
      var p
      = -0.5 * 3.0 * Math.pow (1 - t, 2) * t
      + 1.5 * 3.0 * (1 - t) * Math.pow (t, 2)
      + Math.pow (t, 3);
            
      var w
      = p * (this.image.width - this.targetWidth)
      + this.targetWidth;
      var h
      = p * (this.image.height - this.targetHeight)
      + this.targetHeight;
            
      this.anchor.firstChild.width = w;
      this.anchor.firstChild.height = h;
      this.setOpacity ();
    }
    else {
      this.run (6, param);
    }
  },
    
  /**
   * ポップアップの縮小
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoomoutEffect : function (param) {
    if (this.state != 7) {
      return;
    }
        
    if (this.zoomFactor > 0) {
      var nowTime = new Date ().getTime ();
      var diff = (nowTime - this.lastTime) / 2;
      this.lastTime = nowTime;
      if (diff <= 0) {
        diff = 1;
      }
      else if (diff > 10) {
        diff = 10;
      }
      this.zoomFactor -= diff;
            
      if (this.zoomFactor < 0) {
        this.zoomFactor = 0;
      }
            
      var t = this.zoomFactor / 100;
      var p
      = -0.5 * 3.0 * Math.pow (1 - t, 2) * t
      + 1.5 * 3.0 * (1 - t) * Math.pow (t, 2)
      + Math.pow (t, 3);
            
      var w
      = p * (this.image.width - this.targetWidth)
      + this.targetWidth;
      var h
      = p * (this.image.height - this.targetHeight)
      + this.targetHeight;
            
      this.anchor.firstChild.width = w;
      this.anchor.firstChild.height = h;
      this.setOpacity ();
    }
    else {
      this.setOpacity ();
      this.run (8, param);
    }
  }
};

/**
 * スレッド操作パネル管理のデータ
 */
function arAkahukuThreadOperatorParam () {
  this.popupParam = new arAkahukuPopupParam (10);
}
arAkahukuThreadOperatorParam.prototype = {
  popupParam : null,   /* arAkahukuPopupParam  ポップアップ
                        *   管理データ */
  thumbnailPopupData : null, /* arAkahukuThumbnailPopupData  サムネの
                              *   ポップアップデータ */
  thumbnailTimerID : null,   /* Number  サムネのポップアップのタイマー ID */
    
  /**
   * データを開放する
   */
  destruct : function () {
    try {
      this.popupParam.destruct ();
    }
    catch (e) {
    }
    this.popupParam = null;
        
    this.thumbnailPopupData.destruct ();
    this.thumbnailPopupData = null;
        
    if (this.thumbnailTimerID != null) {
      clearInterval (this.thumbnailTimerID);
      this.thumbnailTimerID = null;
    }
  }
};
/**
 * スレ操作パネル管理
 *   [スレ操作パネル]
 */
var arAkahukuThreadOperator = {
  enable : false,                  /* Boolean  スレ操作パネル */
  enableClickOpen : false,         /* Boolean  クリックで開閉 */
  enableClickClose : false,        /* Boolean  外をクリックで閉じる */
  enableHide : false,              /* Boolean  デフォルトで閉じる */
  enableThreadTime : false,        /* Boolean  スレの立った時刻を表示 */
  enableExpireDiff : false,        /* Boolean  残り時間、番号を表示する */
  enableThumbnail : false,         /* Boolean  サムネも固定する */
  enableThumbnailOnly : false,     /* Boolean  サムネだけ */
  enableThumbnailAlpha : false,    /* Boolean  半透明 */
  enableThumbnailRoll : false,     /* Boolean  巻き上げ */
  enableThumbnailSizeZoom : false, /* Boolean  ズーム */
  thumbnailSize : 0,               /* Number  サムネのサイズ
                                    *   0: フルサイズ
                                    *   1: ハーフ */
  positionX : 0,                   /* Number  x 座標 [px] */
  positionY : 0,                   /* Number  y 座標 [px] */
  enableShowMove : false,          /* Boolean  移動 */
  enableShowThumbnail : false,     /* Boolean  サムネ固定のチェックボックス */
  enableShowReload : false,        /* Boolean  続きを読む */
  enableShowSaveMHT : false,       /* Boolean  MHT で保存 */
    
  /**
   * ドキュメントのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  setStyle : function (style, targetDocument, info) {
    if (info.isReply) {
      /* レス送信モード */
            
      /* スレッド操作パネル */
      if (arAkahukuThreadOperator.enable) {
        var throppos = "";
        if (arAkahukuPostForm.enableFloat
            && arAkahukuPostForm.floatPosition == "topright") {
          throppos = "bottomright";
        }
        else {
          throppos = "topright";
        }
                
        style
        .addRule ("#akahuku_thread_operator",
                  arAkahukuStyle.getFixedStyle
                  (throppos,
                   "position: fixed; "
                   + "margin: 0; "
                   + "padding: 0; "
                   + "text-align: right; "
                   + "font-size: 10pt; "
                   +  "z-index: 301; ",
                   arAkahukuThreadOperator.positionX,
                   arAkahukuThreadOperator.positionY))
        .addRule ("#akahuku_throp_thumbnail_container",
                  "margin: 0 0 0 auto;")
        .addRule ("#akahuku_throp_thumbnail",
                  "border: none;")
                
        .addRule ("a.akahuku_throp_go_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_throp_go_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
                
        .addRule ("#akahuku_throp_header_container",
                  "margin:0 0 0 auto; "
                  + "padding: 4px; "
                  + "background-color: #ffffee; "
                  + "border: 1px solid #eeaa88;")
        .addRule ("#akahuku_throp_header_container img",
                  "margin: 0 0 0 2px; "
                  + "border: none; "
                  + "vertical-align: middle;")
                
        .addRule ("#akahuku_throp_menu",
                  "margin: 0 0 0 auto; "
                  + "border-collapse: collapse; "
                  + "background-color: #ffffee; "
                  + "border:1px solid #800000; "
                  + "border-top: 2px solid #800000;")
        .addRule ("#akahuku_throp_menu div",
                  "display: block; "
                  + "padding: 4px 12px 4px 12px; "
                  + "text-align: right; "
                  + "font-size: 10pt; "
                  + "border-top: 1px solid silver;")
        .addRule ("#akahuku_throp_menu div:hover",
                  "background-color: #f0e0d6;")
                
        .addRule ("#akahuku_throp_threadtime",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("#akahuku_throp_number",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("#akahuku_throp_number_hidden",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("#akahuku_throp_viewer",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("#akahuku_throp_expire",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")

        .addRule ("#akahuku_throp_expire_diff",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
        .addRule ("#akahuku_throp_expire_num",
                  "font-size: 10pt; "
                  + "vertical-align: text-bottom;")
                
        .addRule ("#akahuku_throp_reload_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_throp_reload_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_throp_reload_syncbutton",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_throp_reload_syncbutton:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_throp_reload_status",
                  "font-size: 8.5pt;")
                
        .addRule ("#akahuku_throp_savemht_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_throp_savemht_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_throp_savemht_status",
                  "font-size: 8.5pt;")
        .addRule ("#akahuku_throp_savemht_progress",
                  "font-size: 8.5pt;");
                
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuThreadOperator.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.thread_operator", false);
    if (arAkahukuThreadOperator.enable) {
      arAkahukuThreadOperator.enableClickOpen
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.clickopen", false);
      arAkahukuThreadOperator.enableClickClose
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.clickclose", true);
      arAkahukuThreadOperator.enableHide
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.hide", true);
      arAkahukuThreadOperator.enableThreadTime
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.threadtime", false);
      arAkahukuThreadOperator.enableExpireDiff
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.expire_diff",
                   false);
      arAkahukuThreadOperator.enableThumbnail
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.thumbnail", false);
      /* 後から変えられるので読んでおく */
      arAkahukuThreadOperator.enableThumbnailOnly
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.thumbnail.only",
                   false);
      arAkahukuThreadOperator.enableThumbnailAlpha
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.thumbnail.alpha",
                   false);
      arAkahukuThreadOperator.enableThumbnailRoll
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.thumbnail.roll",
                   true);
      arAkahukuThreadOperator.thumbnailSize
        = arAkahukuConfig
        .initPref ("int",  "akahuku.thread_operator.thumbnail.size", 0);
      arAkahukuThreadOperator.enableThumbnailSizeZoom
        = arAkahukuConfig
        .initPref ("bool",
                   "akahuku.thread_operator.thumbnail.size.zoom", true);
      arAkahukuThreadOperator.positionX
        = arAkahukuConfig
        .initPref ("int",  "akahuku.thread_operator.position.x", 0);
      arAkahukuThreadOperator.positionY
        = arAkahukuConfig
        .initPref ("int",  "akahuku.thread_operator.position.y", 0);
      arAkahukuThreadOperator.enableShowMove
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.show.move", true);
      arAkahukuThreadOperator.enableShowThumbnail
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.show.thumbnail",
                   true);
      arAkahukuThreadOperator.enableShowReload
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.show.reload", true);
      arAkahukuThreadOperator.enableShowSaveMHT
        = arAkahukuConfig
        .initPref ("bool", "akahuku.thread_operator.show.savemht",
                   true);
    }
  },    
    
  /**
   * [続きを読む] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onReloadButtonClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuReload.diffReloadCore (targetDocument, false, false);
    event.preventDefault ();
  },
    
  /**
   * [同期] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onReloadSyncButtonClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuReload.diffReloadCore (targetDocument, true, false);
    event.preventDefault ();
  },
    
  /**
   * [mht で保存] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSaveMHTButtonClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuMHT.saveMHT (targetDocument);
    event.preventDefault ();
  },
    
  /**
   * めどマーク上にマウスが乗ったイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onMenuOpenerMouseOver : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    if (!arAkahukuThreadOperator.enableShowMove
        && !arAkahukuThreadOperator.enableShowThumbnail
        && !arAkahukuThreadOperator.enableShowReload
        && !arAkahukuThreadOperator.enableShowSaveMHT) {
      return;
    }
        
    var element = targetDocument.getElementById ("akahuku_throp_menu");
        
    element.style.width = "12em";
    if (arAkahukuThreadOperator.enableShowSaveMHT
        && arAkahukuMHT.enable
        && arAkahukuMHT.enablePreview
        && arAkahukuMHT.enablePreviewCount) {
      element.style.width = "15em";
    }
    
    element.style.display = "block";
  },
    
  /**
   * めどマークをクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onMenuOpenerClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    if (!arAkahukuThreadOperator.enableShowMove
        && !arAkahukuThreadOperator.enableShowThumbnail
        && !arAkahukuThreadOperator.enableShowReload
        && !arAkahukuThreadOperator.enableShowSaveMHT) {
      return;
    }
        
    var element = targetDocument.getElementById ("akahuku_throp_menu");
        
    if (element.style.display == "block") {
      element.style.display = "none";
    }
    else {
      element.style.width = "12em";
      element.style.display = "block";
    }
  },
    
  /**
   * マウスをクリックしたイベント
   * メニュー以外をクリックしたらメニューを消す
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    if (!arAkahukuThreadOperator.enableShowMove
        && !arAkahukuThreadOperator.enableShowThumbnail
        && !arAkahukuThreadOperator.enableShowReload
        && !arAkahukuThreadOperator.enableShowSaveMHT) {
      return;
    }
        
    var element = targetDocument.getElementById ("akahuku_throp_menu");
    if (element
        && element.style.display != "none") {
      var needHide = true;
      for (var tmp = event.explicitOriginalTarget; tmp;
           tmp = tmp.parentNode) {
        if (tmp.id == "akahuku_throp_menu"
            || tmp.id == "akahuku_throp_menu_opener") {
          needHide = false;
          break;
        }
      }
            
      if (needHide) {
        element.style.display = "none";
      }
    }
  },
    
  /**
   * メニュー上からマウスが出たイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onMenuMouseOut : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    if (!arAkahukuThreadOperator.enableShowMove
        && !arAkahukuThreadOperator.enableShowThumbnail
        && !arAkahukuThreadOperator.enableShowReload
        && !arAkahukuThreadOperator.enableShowSaveMHT) {
      return;
    }
        
    var element = targetDocument.getElementById ("akahuku_throp_menu");
    if (element.style.display != "none") {
      var needHide = true;
      for (var tmp = event.explicitOriginalTarget; tmp;
           tmp = tmp.parentNode) {
        if (tmp.id == "akahuku_throp_menu"
            || tmp.id == "akahuku_throp_header_container") {
          needHide = false;
          break;
        }
      }
            
      if (needHide) {
        element.style.display = "none";
      }
    }
  },
    
  /**
   * [サムネ固定] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onThumbnailClipperCheck : function (event) {
    var targetDocument = event.target.ownerDocument;
    arAkahukuThreadOperator.onThumbnailClipperCheckCore (targetDocument);
  },
    
  /**
   * [サムネ固定] ボタンのイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onThumbnailClipperCheckCore : function (targetDocument) {
    if (!Akahuku.getDocumentParam (targetDocument)) {
      /* すでに unload されていた場合など */
      return;
    }
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    var param
    = Akahuku.getDocumentParam (targetDocument).threadoperator_param;
    var ok = false;
        
    var thumbnail
    = targetDocument.getElementById ("akahuku_throp_thumbnail_button");
    var clipper
    = targetDocument.getElementById ("akahuku_thumbnail_clipper");
    var checked = true;
    if (clipper) {
      checked = clipper.checked;
    }
        
    if (checked) {
      var container
      = targetDocument
      .getElementById ("akahuku_throp_thumbnail_container");
            
      if (!thumbnail) {
        var thumbnail
          = targetDocument.getElementById ("akahuku_thumbnail");
        if (thumbnail) {
          var anchor = thumbnail.parentNode.cloneNode (false);
          anchor.id = "akahuku_throp_thumbnail_button";
                    
          var img = targetDocument.createElement ("img");
          img.id = "akahuku_throp_thumbnail";
          img.src = thumbnail.src;
          if (arAkahukuThreadOperator.enableThumbnailRoll) {
            img.style.display = "none";
          }
                    
          if ((arAkahukuThreadOperator.thumbnailSize == 1
               && arAkahukuThreadOperator.enableThumbnailSizeZoom)
              || arAkahukuThreadOperator.enableThumbnailAlpha) {
            img.addEventListener
              ("mousemove",
               function () {
                arAkahukuThreadOperator.onThumbnailMouseOver
                  (arguments [0]);
              }, false);
            img.addEventListener
              ("mouseout",
               function () {
                arAkahukuThreadOperator.onThumbnailMouseOut
                  (arguments [0]);
              }, false);
          }
                    
          anchor.appendChild (img);
                        
          container.appendChild (anchor);
                        
          param.thumbnailPopupData
            = new arAkahukuThumbnailPopupData (anchor,
                                               thumbnail);
                    
          arAkahukuPopup.addPopup ("thumbnail",
                                   param.popupParam,
                                   param.thumbnailPopupData);
                        
        }
      }
            
      if (param.thumbnailPopupData) {
        param.thumbnailPopupData.run (0, param.popupParam);
        if (arAkahukuThreadOperator.enableThumbnailRoll) {
          arAkahukuThreadOperator.onThumbnailTimer (targetDocument);
          param.thumbnailTimerID
            = setInterval
            (function () {
              arAkahukuThreadOperator.onThumbnailTimer
              (targetDocument);
            }, 1000);
        }
      }
    }
    else {
      if (param.thumbnailPopupData) {
        param.thumbnailPopupData.run (3, param.popupParam);
        if (param.thumbnailTimerID) {
          clearInterval (param.thumbnailTimerID);
          param.thumbnailTimerID = null;
        }
      }
    }
  },
    
  /**
   * 固定したサムネ上にマウスが乗ったイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onThumbnailMouseOver : function (event) {
    var targetDocument = event.target.ownerDocument;
    var param
    = Akahuku.getDocumentParam (targetDocument).threadoperator_param;
        
    param.thumbnailPopupData.run (5, param.popupParam);
  },
    
  /**
   * 固定したサムネ上からマウスが出たイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onThumbnailMouseOut : function (event) {
    var targetDocument = event.target.ownerDocument;
    var param
    = Akahuku.getDocumentParam (targetDocument).threadoperator_param;
        
    param.thumbnailPopupData.run (7, param.popupParam);
  },
    
  /**
   * 固定したサムネを表示するかどうかのチェックのタイマーイベント
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onThumbnailTimer : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument).threadoperator_param;
    var thumbnail = targetDocument.getElementById ("akahuku_thumbnail");
    var thumbnailButton
    = targetDocument.getElementById ("akahuku_throp_thumbnail_button");
    var clipper
    = targetDocument.getElementById ("akahuku_thumbnail_clipper");
    var checked = true;
    if (clipper) {
      checked = clipper.checked;
    }
        
    if (thumbnail && thumbnailButton && checked) {
      var y = 0;
      for (var tmp = thumbnail; tmp; tmp = tmp.offsetParent) {
        y += tmp.offsetTop;
      }
            
      if (y + thumbnail.offsetHeight
          < targetDocument.body.scrollTop
          + targetDocument.documentElement.scrollTop) {
        param.thumbnailPopupData.run (1, param.popupParam);
      }
      else {
        param.thumbnailPopupData.run (3, param.popupParam);
      }
    }
  },
    
  /**
   * ページ先頭へのボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onGoTopClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var targetWindow = targetDocument.defaultView;
    targetWindow.scrollTo (0, 0);
  },

  /**
   * ページ末尾へのボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onGoBottomClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var targetWindow = targetDocument.defaultView;
    targetWindow.scrollTo (0, targetDocument.documentElement.scrollHeight);
  },

  /**
   * body の unload イベント
   * 各種データを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  onBodyUnload : function (targetDocument, documentParam) {
    var param;
        
    param = documentParam.threadoperator_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) {
      }
    }
    documentParam.threadoperator_param = null;
  },
    
  /**
   * スレッド操作パネルを作成する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound) {
      return;
    }
        
    if (info.isReply && arAkahukuThreadOperator.enable) {
      var param = new arAkahukuThreadOperatorParam ();
      Akahuku.getDocumentParam (targetDocument).threadoperator_param
      = param;
            
      var contents = [];
      var div;
            
      div = targetDocument.createElement ("div");
      div.id = "akahuku_throp_thumbnail_container";
      contents.push (div);
            
      div = targetDocument.createElement ("div");
      div.id = "akahuku_throp_header_container";
      if (!arAkahukuThreadOperator.enableClickOpen) {
        div.addEventListener
          ("mouseout",
           function () {
            arAkahukuThreadOperator.onMenuMouseOut (arguments [0]);
          }, false);
      }
            
      var span;

      var firstBr = null;
      var br;
            
      if (arAkahukuThreadOperator.enableThreadTime) {
        var text;
                
        if (info.year == ""
            && info.month == ""
            && info.day == ""
            && info.week == ""
            && info.hour == ""
            && info.min == ""
            && info.sec == "") {
          text = "\u306A\u30FC";
        }
        else {
          text
            = info.year + "/"
            + info.month + "/"
            + info.day + "("
            + info.week + ")"
            + info.hour + ":"
            + info.min + ":"
            + info.sec;
        }
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_threadtime";
        span.appendChild (targetDocument.createTextNode (text));
        div.appendChild (span);
                
        br = targetDocument.createElement ("br");
        if (firstBr == null) {
          firstBr = br;
        }
        div.appendChild (br);
      }
            
      span = targetDocument.createElement ("span");
      span.id = "akahuku_throp_number";
      span.appendChild (targetDocument.createTextNode (info.replyCount));
      div.appendChild (span);
            
      if (arAkahukuThread.enableBottomStatusHidden) {
        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_number_hidden";
        span.appendChild (targetDocument.createTextNode (""));
        div.appendChild (span);
      }
            
      span = targetDocument.createElement ("span");
      span.className = "akahuku_status_suffix";
      span.appendChild (targetDocument.createTextNode
                        ("\u30EC\u30B9"));
      div.appendChild (span);
            
      if (info.viewer) {
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          (" \uFF0F "));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_viewer";
        span.appendChild (targetDocument.createTextNode (info.viewer));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          ("\u4EBA"));
        div.appendChild (span);
      }
            
      if (info.expire) {
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          (" \uFF0F "));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_expire";
        if (info.isOld) {
          span.style.color = "red";
          span.style.fontWeight = "bold";
        }
        span.appendChild (targetDocument.createTextNode (info.expire));
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.className = "akahuku_status_suffix";
        span.appendChild (targetDocument.createTextNode
                          ("\u9803"));
        div.appendChild (span);
                
        if (arAkahukuThreadOperator.enableExpireDiff) {
          var lastReply
            = arAkahukuThread.getLastReply (targetDocument);
                
          var enableBottomStatusNum = false;
          var expireNum
            = arAkahukuThread.getExpireNum (targetDocument, info,
                                            info.threadNumber,
                                            lastReply.num);
          var expireMax
            = arAkahukuThread.getExpireNum (targetDocument, info,
                                            0, 0);
          if (expireNum != null) {
            enableBottomStatusNum
              = arAkahukuThread.enableBottomStatusNum;
          }
          if (!info.isMht
              && (arAkahukuThread.enableBottomStatusDiff
                  || enableBottomStatusNum)) {
            br = targetDocument.createElement ("br");
            if (firstBr == null) {
              firstBr = br;
            }
            div.appendChild (br);
            
            var expireBox2 = targetDocument.createElement ("div");
            expireBox2.id = "akahuku_throp_expire_box2";
            expireBox2.style.display = "none";
            expireBox2.style.color = "red";
            expireBox2.style.fontWeight = "bold";
            expireBox2.appendChild (targetDocument.createTextNode
                                    ("Not Found"));
            div.appendChild (expireBox2);
            
            var expireBox = targetDocument.createElement ("div");
            expireBox.id = "akahuku_throp_expire_box";
            div.appendChild (expireBox);
            
            span = targetDocument.createElement ("span");
            span.className = "akahuku_status_suffix";
            span.appendChild (targetDocument.createTextNode
                              ("("));
            expireBox.appendChild (span);
            
            if (arAkahukuThread.enableBottomStatusDiff) {
              var expireDiff;
                    
              expireDiff
                = arAkahukuThread.getExpireDiff (targetDocument,
                                                 info.expire);
                
              span = targetDocument.createElement ("span");
              span.className = "akahuku_status_suffix";
              span.appendChild (targetDocument.createTextNode
                                ("\u3042\u3068"));
              expireBox.appendChild (span);
                    
              span = targetDocument.createElement ("span");
              span.id = "akahuku_throp_expire_diff";
              span.className = "akahuku_bottom_status_expire_diff";
              span.appendChild (targetDocument.createTextNode (expireDiff));
              expireBox.appendChild (span);
            }
            if (enableBottomStatusNum) {
              if (arAkahukuThread.enableBottomStatusDiff) {
                span = targetDocument.createElement ("span");
                span.className = "akahuku_status_suffix";
                span.appendChild (targetDocument.createTextNode
                                  ("\u3001"));
                expireBox.appendChild (span);
              }
                    
              span = targetDocument.createElement ("span");
              span.className = "akahuku_status_suffix";
              span.appendChild (targetDocument.createTextNode
                                ("\u3042\u3068"));
              expireBox.appendChild (span);
                    
              span = targetDocument.createElement ("span");
              span.id = "akahuku_throp_expire_num";
              span.className = "akahuku_bottom_status_expire_num";
              span.appendChild (targetDocument.createTextNode (expireNum));
              var expireWarning
                = targetDocument.getElementById
                ("akahuku_thread_warning");
              if (expireNum < expireMax / 10
                  && !expireWarning) {
                span.style.fontWeight = "bold";
                span.style.color = "#ff0000";
              }
              expireBox.appendChild (span);
                
              span = targetDocument.createElement ("span");
              span.className = "akahuku_status_suffix";
              span.appendChild (targetDocument.createTextNode
                                ("\u756A"));
              expireBox.appendChild (span);
            }
            
            span = targetDocument.createElement ("span");
            span.className = "akahuku_status_suffix";
            span.appendChild (targetDocument.createTextNode
                              (")"));
            expireBox.appendChild (span);
          }
        }
      }
            
      var img;
      img = targetDocument.createElement ("img");
      img.id = "akahuku_throp_menu_opener";
      img.style.verticalAlign = "top";
      img.src
      = Akahuku.protocolHandler.enAkahukuURI
      ("preview", "chrome://akahuku/content/images/throp.png");
      if (arAkahukuThreadOperator.enableClickOpen) {
        img.addEventListener
          ("click",
           function () {
            arAkahukuThreadOperator.onMenuOpenerClick
              (arguments [0]);
          }, false);
      }
      else {
        img.addEventListener
        ("mouseover",
         function () {
          arAkahukuThreadOperator.onMenuOpenerMouseOver
          (arguments [0]);
        }, false);
      }
            
      if (firstBr
          && (arAkahukuPostForm.floatPosition == "topleft"
              || arAkahukuPostForm.floatPosition == "topright")) {
        div.insertBefore (img, firstBr);
      }
      else {
        div.appendChild (img);
      }
            
      contents.push (div);
            
      div = targetDocument.createElement ("div");
      div.id = "akahuku_throp_menu_container";
            
      var a, label, input, nobr, font, menudiv, itemdiv;
            
      menudiv
      = targetDocument.createElement ("menudiv");
      menudiv.id = "akahuku_throp_menu";
      if (arAkahukuThreadOperator.enableHide) {
        menudiv.style.display = "none";
      }
      else {
        menudiv.style.display = "block";
      }
      if (!arAkahukuThreadOperator.enableClickOpen) {
        menudiv.addEventListener
        ("mouseout",
         function () {
          arAkahukuThreadOperator.onMenuMouseOut (arguments [0]);
        }, false);
      }
            
      if (arAkahukuThreadOperator.enableShowMove) {
        itemdiv = targetDocument.createElement ("div");
            
        itemdiv.appendChild (targetDocument.createTextNode ("["));
        a = targetDocument.createElement ("a");
        a.href = "/";
        a.appendChild (targetDocument.createTextNode
                       ("\u30DB\u30FC\u30E0"));
        itemdiv.appendChild (a);
        itemdiv.appendChild (targetDocument.createTextNode ("]"));
            
        itemdiv.appendChild (targetDocument.createElement ("br"));
            
        itemdiv.appendChild (targetDocument.createTextNode ("["));
        a = targetDocument.createElement ("a");
        a.href = "futaba.htm";
        /* futaba: 未知なので外部には対応しない */
        a.appendChild (targetDocument.createTextNode
                       ("\u63B2\u793A\u677F\u306B\u623B\u308B"));
        itemdiv.appendChild (a);
        if (arAkahukuThread.enableBackNew) {
          a.target = "_blank";
          a.appendChild (targetDocument.createTextNode ("*"));
        }
        itemdiv.appendChild (targetDocument.createTextNode ("]"));
            
        itemdiv.appendChild (targetDocument.createElement ("br"));
            
        itemdiv.appendChild (targetDocument.createTextNode ("["));
        a = targetDocument.createElement ("a");
        a.className = "akahuku_throp_go_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u30DA\u30FC\u30B8\u5148\u982D"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuThreadOperator.onGoTopClick (arguments [0]);
        }, false);
        itemdiv.appendChild (a);
        itemdiv.appendChild (targetDocument.createTextNode ("]"));
            
        itemdiv.appendChild (targetDocument.createElement ("br"));
            
        itemdiv.appendChild (targetDocument.createTextNode ("["));
        a = targetDocument.createElement ("a");
        a.className = "akahuku_throp_go_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u30DA\u30FC\u30B8\u672B\u5C3E"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuThreadOperator.onGoBottomClick (arguments [0]);
        }, false);
        itemdiv.appendChild (a);
        itemdiv.appendChild (targetDocument.createTextNode ("]"));
            
        menudiv.appendChild (itemdiv);
      }
            
      if (arAkahukuThreadOperator.enableShowThumbnail) {
        itemdiv = targetDocument.createElement ("div");
            
        label = targetDocument.createElement ("label");
        label.setAttribute ("for", "akahuku_thumbnail_clipper");
            
        input = targetDocument.createElement ("input");
        input.id = "akahuku_thumbnail_clipper";
        input.type = "checkbox";
        input.addEventListener
        ("click",
         function () {
          arAkahukuThreadOperator.onThumbnailClipperCheck
            (arguments [0]);
        }, false);
        if (arAkahukuThreadOperator.enableThumbnail) {
          input.checked = "checked";
        }
            
        label.appendChild (input);
        label.appendChild (targetDocument.createTextNode
                           ("\u30B5\u30E0\u30CD\u56FA\u5B9A"));
        itemdiv.appendChild (label);
            
        menudiv.appendChild (itemdiv);
      }
            
      if (arAkahukuThreadOperator.enableShowReload
          && arAkahukuReload.enable && !info.isMht) {
        itemdiv = targetDocument.createElement ("div");
                
        nobr = targetDocument.createElement ("nobr");
        nobr.style.overflow = "hidden";
                
        nobr.appendChild (targetDocument.createTextNode ("["));
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_reload_status";
        nobr.appendChild (span);
                
        nobr.appendChild (targetDocument.createTextNode ("]"));
                
        itemdiv.appendChild (nobr);
                
        itemdiv.appendChild (targetDocument.createElement ("br"));
                
        if (arAkahukuReload.enableSyncButton) {
          itemdiv.appendChild (targetDocument.createTextNode ("["));
                    
          a = targetDocument.createElement ("a");
          a.id = "akahuku_throp_reload_syncbutton";
          a.appendChild (targetDocument.createTextNode
                         ("\u540C\u671F"));
          a.addEventListener
            ("click",
             function () {
              arAkahukuThreadOperator.onReloadSyncButtonClick
                (arguments [0]);
            }, false);
          itemdiv.appendChild (a);
                    
          itemdiv.appendChild (targetDocument.createTextNode ("] "));
        }
                
        itemdiv.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_throp_reload_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u7D9A\u304D\u3092\u8AAD\u3080"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuThreadOperator.onReloadButtonClick
            (arguments [0]);
        }, false);
        itemdiv.appendChild (a);
                
        itemdiv.appendChild (targetDocument.createTextNode ("]"));
                
        menudiv.appendChild (itemdiv);
      }
      if (arAkahukuThreadOperator.enableShowSaveMHT
          && arAkahukuMHT.enable && !info.isMht) {
        itemdiv = targetDocument.createElement ("div");
                
        nobr = targetDocument.createElement ("nobr");
        nobr.style.overflow = "hidden";
                
        nobr.appendChild (targetDocument.createTextNode ("["));
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_savemht_progress";
        nobr.appendChild (span);

        span = targetDocument.createElement ("span");
        span.id = "akahuku_throp_savemht_status";
        nobr.appendChild (span);
                
        nobr.appendChild (targetDocument.createTextNode ("]"));
                
        itemdiv.appendChild (nobr);
                
        itemdiv.appendChild (targetDocument.createElement ("br"));
                
        itemdiv.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_throp_savemht_button";
        a.appendChild (targetDocument.createTextNode
                       ("mht \u3067\u4FDD\u5B58"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuThreadOperator.onSaveMHTButtonClick
            (arguments [0]);
        }, false);
        itemdiv.appendChild (a);
                
        itemdiv.appendChild (targetDocument.createTextNode ("]"));
                
        menudiv.appendChild (itemdiv);
      }
            
      div.appendChild (menudiv);
            
      contents.push (div);
            
      div = targetDocument.createElement ("div");
      div.id = "akahuku_thread_operator";
            
      if (arAkahukuThreadOperator.enableThumbnailOnly) {
        contents.splice (1, 2);
      }
      if (arAkahukuPostForm.enableFloat
          && arAkahukuPostForm.floatPosition == "topright") {
        contents = contents.reverse ();
      }
            
      for (var i = 0; i < contents.length; i ++) {
        div.appendChild (contents [i]);
      }
      targetDocument.body.appendChild (div);
            
      if (arAkahukuThreadOperator.enableThumbnailOnly
          || arAkahukuThreadOperator.enableThumbnail) {
        /* 遅延実行で負荷軽減 */
		setTimeout
		((function (doc) {
			return function () {
			  arAkahukuThreadOperator
			  .onThumbnailClipperCheckCore (doc);
			};
		 })(targetDocument), 1000, false);
      }
            
      if (arAkahukuThreadOperator.enableClickOpen
          && arAkahukuThreadOperator.enableClickClose) {
        targetDocument.body.addEventListener
        ("click",
         function () {
          arAkahukuThreadOperator.onBodyClick (arguments [0]);
        }, false);
      }
    }
  }
};
