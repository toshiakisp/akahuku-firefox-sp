/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter
 *          arAkahukuDocumentParam, arAkahukuDOM,
 *          arAkahukuLink, arAkahukuP2P, arAkahukuPopup, arAkahukuSidebar,
 *          arAkahukuSound, arAkahukuBoard, arAkahukuUtil, arAkahukuCompat
 */

/**
 * カタログのポップアップデータ
 *   Inherits From: arAkahukuPopupData
 *
 * @param  HTMLImageElement targetImage
 *         対象のカタログ画像
 */
function arAkahukuCatalogPopupData (targetImage) {
  this.targetImage = targetImage;
  this.targetWindow = targetImage.ownerDocument.defaultView;
  this.targetSrc = targetImage.src.replace ("/cat/", "/thumb/");
}
arAkahukuCatalogPopupData.prototype =  {
  state : 0,                  /* Number  ポップアップの状態
                               *   0: ポップアップ表示待ち
                               *   1: 拡大中
                               *   2: 拡大完了
                               *   3: 縮小中
                               *   4: 削除 */
  targetImage : null,         /* HTMLImageElement  対象のカタログ画像 */
  targetSrc : "",             /* String  ポップアップする画像のURL */
  key : "",                   /* String  キャッシュのキー */
  popup : null,               /* HTMLDivElement  表示中のポップアップ */
  popupArea : null,           /* HTMLAnchorElement  ポップアップ保持領域 */
  zoomFactor : 0,             /* Number  拡大の状態 */
  lastTime : 0,               /* Number  動作のタイマーの前回の時間 */
  createTimerID : null,       /* Number  表示待ち状態のタイマー ID */
  hideCursorTimerID : null,   /* Number  保持領域でカーソル非表示にするタイマー ID */
  targetImageGeometry : null, /* Object  対象のカタログ画像の位置、サイズ */
  zoomImageGeometry : null,   /* Object  ズーム先の位置、サイズ */
    
  /**
   * データを開放する
   *   arAkahukuPopupData.destruct
   */
  destruct : function () {
    this.targetImage = null;
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild (this.popup);
    }
    this.popup = null;
    if (this.popupArea && this.popupArea.parentNode) {
      this.popupArea.parentNode.removeChild (this.popupArea);
    }
    this.popupArea = null;
    if (this.targetWindow) {
      this.targetWindow.clearTimeout (this.createTimerID);
      this.targetWindow.clearTimeout (this.hideCursorTimerID);
    }
    this.createTimerID = null;
    this.hideCursorTimerID = null;
    this.targetImageGeometry = null;
    this.zoomImageGeometry = null;
    this.targetWindow = null;
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
    var targetDocument = param.targetDocument;
        
    if (this.createTimerID) {
      this.targetWindow.clearTimeout (this.createTimerID);
      this.createTimerID = null;
    }
    this.transitionState = 0; // 状態変更毎にリセット
        
    this.state = state;
    switch (state) {
      case 0:
        var timeout = arAkahukuCatalog.zoomTimeout;
                
        var exists = false;
        if (param.cacheImageData.exists (this.key)) {
          exists = true;
        }
        else if (arAkahukuP2P.enable) {
          if (arAkahukuP2P.getCacheFile (this.targetSrc)) {
            exists = true;
            this.targetSrc = arAkahukuP2P.tryEnP2P (this.targetSrc);
          }
        }
        if (!exists) {
          // Firefox にキャッシュされているかのチェック(非同期)
          var that = this;
          Akahuku.Cache.asyncGetHttpCacheStatus
            ({url: this.targetSrc, triggeringNode: targetDocument},
             false,
             function (cacheStatus) {
              if (!cacheStatus.isExist || that.state != 0) {
                return;
              }
              if (that.createTimerID) {
                that.targetWindow.clearTimeout (that.createTimerID);
                that.createTimerID = null;
              }
              that.targetSrc
                = Akahuku.protocolHandler
                .enAkahukuURI ("cache", that.targetSrc);
              that.createTimerID
                = that.targetWindow.setTimeout (function () {
                  that.createPopup (param, that, targetDocument);
                }, arAkahukuCatalog.zoomTimeout);
             });
        }
                
        if (!arAkahukuCatalog.enableZoomClick
            && !exists
            && timeout < 1000) {
          timeout = 1000;
        }
            
        this.createTimerID
          = this.targetWindow.setTimeout (function (that) {
            that.createPopup (param, that, targetDocument);
          }, timeout, this);
        break;
      case 1:
        this.targetImage.style.opacity = 0;
        this.lastTime = new Date ().getTime ();
        var effect = this.zoominTransitionEffect;
        if (arAkahukuCompat.comparePlatformVersion ("15.*") <= 0) {
          effect = this.zoominEffect;
        }
        arAkahukuPopup.addEffector (param, this, effect);
        break;
      case 2:
        this.popup.style.display = "block"; //非表示解除を保証
        arAkahukuPopup.removeEffector (param, this);
        var targetAnchor = null;
        for (var tmp = this.targetImage; tmp; tmp = tmp.parentNode) {
          if (tmp.nodeName.toLowerCase () == "a") {
            targetAnchor = tmp;
          }
          else if (tmp.nodeName.toLowerCase () == "td") {
            if (this.popup.getElementsByTagName ("img") [0]
                .getAttribute ("__errored")) {
              param.cacheImageData.removeCache (this.key);
            }
                    
            if (targetAnchor) {
              var anchor = targetDocument.createElement ("a");
                        
              if (this.popup.getElementsByTagName ("img") [0]
                  .getAttribute ("__errored")) {
                anchor.appendChild
                  (targetDocument.createTextNode
                   ("\u30D5\u30A1\u30A4\u30EB\u304C\u7121\u3044\u3088"));
                anchor.className
                  = "akahuku_zoomedpopup_errored_button";
              }
              else {
                anchor.className = "akahuku_zoomedpopup_button";
                
                            
                var nodes;
                nodes = tmp.getElementsByTagName ("font");
                if (nodes && nodes.length > 0) {
                  arAkahukuDOM.copyChildren
                    (nodes [nodes.length - 1], anchor);
                }
                                
                /* 避難所 patch */
                nodes = tmp.getElementsByTagName ("span");
                if (nodes && nodes [0]) {
                  arAkahukuDOM.copyChildren
                    (nodes [0], anchor);
                }
                                
                nodes = tmp.getElementsByTagName ("div");
                for (var i = 0; i < nodes.length; i ++) {
                  if ("className" in nodes [i]
                      && nodes [i].className
                         .indexOf ("akahuku_cell") != -1) {
                                        
                    anchor.appendChild
                      (targetDocument.createTextNode
                       ("("));
                    arAkahukuDOM.copyChildren (nodes [i],
                                               anchor);
                    anchor.appendChild
                      (targetDocument.createTextNode
                       (")"));
                  }
                }
              }
                        
              anchor.style.position = "relative";
              anchor.href = this.popup.firstChild.href;
              var uri = arAkahukuUtil.newURIViaNode (anchor.href, anchor);
              arAkahukuCompat.AsyncHistory.isURIVisited (uri, {
                _target : anchor,
                isVisited : function (uri, visited) {
                  if (visited) {
                    arAkahukuDOM.addClassName (this._target, "akahuku_visited");
                  }
                },
              });
              this.popup.appendChild (anchor);
            }
            break;
          }
        }
        break;
      case 3:
        var anchors = this.popup.getElementsByTagName ("a");
        if (anchors && anchors [1]) {
          anchors [1].parentNode.removeChild (anchors [1]);
        }
        this.lastTime = new Date ().getTime ();
        var effect = this.zoomoutTransitionEffect;
        if (arAkahukuCompat.comparePlatformVersion ("15.*") <= 0) {
          effect = this.zoomoutEffect;
        }
        arAkahukuPopup.addEffector (param, this, effect);
        break;
      case 4:
      default:
        arAkahukuPopup.removeEffector (param, this);
        if (this.popup) {
          this.popup.parentNode.removeChild (this.popup);
          this.popup = null;
        }
        if (this.popupArea) {
          this.popupArea.parentNode.removeChild (this.popupArea);
          this.popupArea = null;
        }
        this.targetImage.style.opacity = 1;
        this.targetImage = null;
        break;
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
    var result = false;
        
    switch (this.state) {
      case 0:
        this.run (4, param);
        /* FALLTHRU */
      case 4:
        result = true;
        break;
      case 1:
      case 2:
        this.run (3, param);
        break;
    }
        
    return result;
  },
    
  /**
   * 対象のカタログ画像の位置、サイズ取得
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  getImageGeometry : function (targetDocument) {
    var x = 0, y = 0;
    for (var tmp = this.targetImage; tmp; tmp = tmp.offsetParent) {
      x += tmp.offsetLeft;
      y += tmp.offsetTop;
    }
        
    this.targetImageGeometry = new Object ();
    this.zoomImageGeometry = new Object ();
        
    this.targetImageGeometry.left = x - 1;
    this.targetImageGeometry.top = y - 1;
    this.targetImageGeometry.width = this.targetImage.width;
    this.targetImageGeometry.height = this.targetImage.height;
    this.targetImageGeometry.right
    = this.targetImageGeometry.left + this.targetImageGeometry.width;
    this.targetImageGeometry.bottom
    = this.targetImageGeometry.top + this.targetImageGeometry.height;
        
    if (arAkahukuCatalog.zoomSizeType == 1) { /* zoomSize [%] */
      var image = this.popup.getElementsByTagName ("img") [0];
      if (image && image.naturalWidth > 0) {
        this.zoomImageGeometry.width
          = image.naturalWidth * arAkahukuCatalog.zoomSize / 100;
        this.zoomImageGeometry.height
          = image.naturalHeight * arAkahukuCatalog.zoomSize / 100;
      }
      else {
        /* まだ準備が出来ていない */
        delete this.zoomImageGeometry;
        return;
      }
    }
    else /* zoomSize [px] */
    if (this.targetImageGeometry.height > this.targetImageGeometry.width) {
      this.zoomImageGeometry.width
        = arAkahukuCatalog.zoomSize
        * (this.targetImageGeometry.width
           / this.targetImageGeometry.height);
      this.zoomImageGeometry.height
        = arAkahukuCatalog.zoomSize;
    }
    else {
      this.zoomImageGeometry.width
      = arAkahukuCatalog.zoomSize;
      this.zoomImageGeometry.height
      = arAkahukuCatalog.zoomSize
      * (this.targetImageGeometry.height
         / this.targetImageGeometry.width);
    }
    this.zoomImageGeometry.left
    = this.targetImageGeometry.left
    - (this.zoomImageGeometry.width - this.targetImageGeometry.width) / 2;
    this.zoomImageGeometry.top
    = this.targetImageGeometry.top
    - (this.zoomImageGeometry.height - this.targetImageGeometry.height) / 2;
        
    /* 画面からはみ出さないようにする */
    var targetElement = targetDocument.body; //後方互換モード用
    if (targetDocument.compatMode != "BackCompat") {
      targetElement = targetDocument.documentElement; //標準準拠モード用
    }
    var min = targetElement.scrollLeft;
    if (this.zoomImageGeometry.left < min) {
      this.zoomImageGeometry.left = min;
    }
    min = targetElement.scrollTop;
    if (this.zoomImageGeometry.top < min) {
      this.zoomImageGeometry.top =  min;
    }
    var max = targetElement.scrollLeft + targetElement.clientWidth;
    if (this.zoomImageGeometry.left + this.zoomImageGeometry.width
        >= max - 1) {
      this.zoomImageGeometry.left
      = max - this.zoomImageGeometry.width - 2;
    }
    max = targetElement.scrollTop + targetElement.clientHeight;
    if (this.zoomImageGeometry.top + this.zoomImageGeometry.height
        >= max - 1) {
      this.zoomImageGeometry.top
      = max - this.zoomImageGeometry.height - 2;
    }
        
    this.zoomImageGeometry.right
    = this.zoomImageGeometry.left + this.zoomImageGeometry.width;
    this.zoomImageGeometry.bottom
    = this.zoomImageGeometry.top + this.zoomImageGeometry.height;
  },
    
  /**
   * ポップアップの位置、サイズの更新
   */
  updatePopupGeometry : function () {
    if (!this.targetImageGeometry || !this.zoomImageGeometry) {
      this.getImageGeometry (this.targetImage.ownerDocument);
      if (!this.targetImageGeometry || !this.zoomImageGeometry) {
        /* まだ準備が完了してはいない */
        if (this.targetImageGeometry) {
          this.popup.style.top = this.targetImageGeometry.top + "px";
          this.popup.style.left = this.targetImageGeometry.left + "px";
        }
        return;
      }
    }
        
    var targetImageGeometry = this.targetImageGeometry;
    var zoomImageGeometry = this.zoomImageGeometry;
        
    var t = this.zoomFactor / 100;
            
    var diffX = zoomImageGeometry.width - targetImageGeometry.width;
    var diffY = zoomImageGeometry.height - targetImageGeometry.height;
        
    var left, top, right, bottom;
    var width, height;
            
    left
    = (targetImageGeometry.left
       * Math.pow (1 - t, 3))
    + ((targetImageGeometry.left + diffX / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((zoomImageGeometry.left - diffX / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (zoomImageGeometry.left
       * Math.pow (t, 3));
    top
    = (targetImageGeometry.top
       * Math.pow (1 - t, 3))
    + ((targetImageGeometry.top + diffY / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((zoomImageGeometry.top - diffY / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (zoomImageGeometry.top
       * Math.pow (t, 3));
    right
    = (targetImageGeometry.right
       * Math.pow (1 - t, 3))
    + ((targetImageGeometry.right - diffX / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((zoomImageGeometry.right + diffX / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (zoomImageGeometry.right
       * Math.pow (t, 3));
    bottom
    = (targetImageGeometry.bottom
       * Math.pow (1 - t, 3))
    + ((targetImageGeometry.bottom - diffY / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((zoomImageGeometry.bottom + diffY / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (zoomImageGeometry.bottom
       * Math.pow (t, 3));
            
    width = right - left;
    height = bottom - top;
            
    /* ズーム中は元サイズより極端に小さくはしない */
    if (this.zoomFactor < 100
        && (width <= targetImageGeometry.width/2
            || height <= targetImageGeometry.height/2)) {
      return;
    }
            
    /* 小さくなる時はサイズから変える */
    if (this.popup.firstChild.firstChild.width > width) {
      this.popup.firstChild.firstChild.width = width;
      this.popup.style.left = left + "px";
    }
    if (this.popup.firstChild.firstChild.height > height) {
      this.popup.firstChild.firstChild.height = height;
      this.popup.style.top = top + "px";
    }
            
    /* 大きくなる時は位置から変える */
    if (this.popup.firstChild.firstChild.width <= width) {
      this.popup.style.left = left + "px";
      this.popup.firstChild.firstChild.width = width;
    }
    if (this.popup.firstChild.firstChild.height <= height) {
      this.popup.style.top = top + "px";
      this.popup.firstChild.firstChild.height = height;
    }

    /* 準備完了につき非表示は解除 */
    if ("removeProperty" in this.popup.style) {
      this.popup.style.removeProperty ("display");
    } else {
      this.popup.style.display = "block";
    }
  },
    
  /**
   * ポップアップの拡大
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoominEffect : function (param) {
    if (this.state != 1) {
      return;
    }
        
    if (arAkahukuCatalog.enableZoomNoAnim) {
      this.zoomFactor = 100;
      this.updatePopupGeometry ();
    }
        
    if (!this.zoomImageGeometry) {
      // 準備完了を待たずに zoominEffect が開始された場合
      // 画像サイズが取得できるのをしばらく待ってみる
      var nowTime = new Date ().getTime ();
      if (nowTime < this.lastTime + 3000) {
        this.getImageGeometry (this.targetImage.ownerDocument);
        if (!this.zoomImageGeometry) {
          return;
        }
        this.lastTime = nowTime;
      }
      else {
        this.run (2, param);
      }
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
            
      this.updatePopupGeometry ();
    }
    else {
      this.run (2, param);
    }
  },

  /**
   * ポップアップの拡大・縮小効果
   * (CSS Transition, Transform 利用版)
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoominTransitionEffect : function (param) {
    this.zoomTransitionEffect (param, "in");
  },
  zoomoutTransitionEffect : function (param) {
    this.zoomTransitionEffect (param, "out");
  },
  zoomTransitionEffect : function (param, mode) {
    function getTransformToTarget (that) {
      var scaleX = that.targetImageGeometry.width
        / that.zoomImageGeometry.width;
      var scaleY = that.targetImageGeometry.height
        / that.zoomImageGeometry.height;
      var diffX
        = (that.targetImageGeometry.left + that.targetImageGeometry.width/2)
        - (that.zoomImageGeometry.left + that.zoomImageGeometry.width/2);
      var diffY
        = (that.targetImageGeometry.top + that.targetImageGeometry.height/2)
        - (that.zoomImageGeometry.top + that.zoomImageGeometry.height/2);
      return "translate("
        + Math.round (diffX) + "px,"
        + Math.round (diffY) + "px) "
        + "scale(" + scaleX + ", " + scaleY + ")";
    }
    var doZoomIn = (mode == "in");
    var zoomState = (doZoomIn ? 1 : 3);
    var nextState = (doZoomIn ? 2 : 4);
    var duration_ms = 200;

    if (this.state != zoomState) {
      return;
    }

    if (arAkahukuCatalog.enableZoomNoAnim) {
      this.zoomFactor = (doZoomIn ? 100 : 0);
      this.updatePopupGeometry ();
      this.run (nextState, param);
      return;
    }

    if (this.transitionState == 0) {
      // state変更後に初実行時
      if (!this.zoomImageGeometry) {
        // 準備完了を待たずに zoominEffect が開始された場合
        // 画像サイズが取得できるのをしばらく待ってみる
        var nowTime = new Date ().getTime ();
        if (nowTime < this.lastTime + 3000) {
          this.getImageGeometry (this.targetImage.ownerDocument);
          if (!this.zoomImageGeometry) {
            return;
          }
          this.lastTime = nowTime;
        }
        else {
          Akahuku.debug.warn
            ("zoomTransitionEffect: getImageGeometry timeout!");
          this.run (nextState, param);
          return;
        }
      }

      if (doZoomIn) {
        // 初期位置・サイズの設定
        // (最終状態の位置・サイズより CSS transform で縮小)
        this.popup.firstChild.firstChild.width
          = this.zoomImageGeometry.width;
        this.popup.firstChild.firstChild.height
          = this.zoomImageGeometry.height;
        this.popup.style.zIndex = 200;
        this.popup.style.left
          = this.zoomImageGeometry.left + "px";
        this.popup.style.top
          = this.zoomImageGeometry.top + "px";
        this.popup.style.transformOrigin = "50% 50% 0";
        this.popup.style.transform = getTransformToTarget (this);

        // 準備完了につき非表示は解除
        this.popup.style.display = "block";

        // スタイルを反映させるために一度戻す
        this.transitionState = 1;
        return;
      }
      else { // zoom out
        this.popup.style.display = "block";
        this.transitionState = 1;
      }
    }

    if (this.transitionState == 1) {
      // CSS Transition を設定
      this.popup.style.transition
        = "transform "
        + duration_ms + "ms "
        + "cubic-bezier(0.333,-1,0.667,2)";

      var self = this;
      this.popup.addEventListener ("transitionend", function (event) {
        self.popup.removeEventListener (event.type, arguments.callee);
        if (self.state != zoomState) {
          return;
        }
        self.popup.style.transition = "";
        self.zoomFactor = (doZoomIn ? 100 : 0);
        self.run (nextState, param);
      }, false);

      if (doZoomIn) {
        this.popup.style.transform = "scale(1)";
      }
      else { // zoom out
        this.popup.style.transform = getTransformToTarget (this);
      }

      this.lastTime = new Date ().getTime ();

      this.transitionState = 2;
      return;
    }

    // 念のため transitionend イベントが起きない場合へ対処
    var nowTime = new Date ().getTime ();
    if (nowTime > this.lastTime + duration_ms*1.2) {
      Akahuku.debug.warn ("zoomTransitionEffect: timeout!");
      this.run (nextState, param);
      return;
    }
  },
    
  /**
   * ポップアップの縮小
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoomoutEffect : function (param) {
    if (this.state != 3) {
      return;
    }
        
    if (arAkahukuCatalog.enableZoomNoAnim) {
      this.zoomFactor = 0;
      this.updatePopupGeometry ();
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
            
      this.updatePopupGeometry ();
    }
    else {
      this.run (4, param);
    }
  },
    
  /**
   * ポップアップの作成
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   * @param  arAkahukuPopupData self
   *         ポップアップデータ
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  createPopup : function (param, self, targetDocument) {
    if (self.state != 0) {
      return;
    }
    var exists = false;
    for (var key in param.popups) {
      if (key == self.key) {
        exists = true;
      }
    }
        
    if (!exists) {
      return;
    }
        
    var image = param.cacheImageData.getCache (self.key);
    if (!image) {
      image = targetDocument.createElement ("img");
      image.src = self.targetSrc;
      image.style.border = "1px solid #0040e0";
            
      param.cacheImageData.register (self.key, image);
    }
        
    var anchor = targetDocument.createElement ("a");
    anchor.href = self.targetImage.parentNode.href;
    anchor.style.display = "block";
    anchor.target = self.targetImage.parentNode.target;
        
    self.popup = targetDocument.createElement ("div");
    self.popup.className = "akahuku_popup";
    self.popup.style.position = "absolute";
    // サイズ・位置が確定しない間は表示させない
    self.popup.style.display = "none";
        
    anchor.appendChild (image);
    self.popup.appendChild (anchor);
        
    self.zoomFactor = 0;
        
    self.updatePopupGeometry ();
        
    targetDocument.body.appendChild (self.popup);
        
    /* ポップアップ保持エリア */
    self.popupArea = targetDocument.createElement ("a");
    self.popupArea.href = anchor.href;
    self.popupArea.target = anchor.target;
    self.popupArea.className = "akahuku_popup_area";
    self.popupArea.style.position = "absolute";
    self.popupArea.style.top = self.targetImageGeometry.top + "px";
    self.popupArea.style.left = self.targetImageGeometry.left + "px";
    self.popupArea.style.width = self.targetImageGeometry.width + "px";
    self.popupArea.style.height = self.targetImageGeometry.height + "px";
    self.popupArea.style.opacity = 0;
    self.popupArea.style.zIndex = 201;
    targetDocument.body.appendChild (self.popupArea);
    self.popupArea.addEventListener
    ("mouseout",
     function () {
       param.lastPopupKey = "";
       arAkahukuPopup.removeActivePopups (param);
     }, false);
    // リンククリックのイベントは元のリンクへ転送する
    function transferMouseEventsToCatalog (ev) {
      var target = self.targetImage; // anchor よりいっそ大元へ (ねないこ支援?)
      var evNew = target.ownerDocument.createEvent ("MouseEvents");
      var view = target.ownerDocument.defaultView;
      evNew.initMouseEvent
        (ev.type, ev.bubbles , ev.cancelable, view, ev.detail,
         ev.screenX, ev.screenY, ev.clientX, ev.clientY,
         ev.ctrlKey, ev.altKey, ev.shiftKey, ev.metaKey,
         ev.button, ev.relatedTarget);
      ev.preventDefault ();
      ev.stopPropagation ();
      target.dispatchEvent (evNew);
    }
    self.popupArea.addEventListener
    ("click", transferMouseEventsToCatalog, true);
    // ポップアップ保持エリアでは静止時マウスカーソルを隠す
    function onMouseMoveOnPopupArea () {
      var targetWindow = self.popupArea.ownerDocument.defaultView;
      self.popupArea.style.removeProperty ("cursor");
      targetWindow.clearTimeout (self.hideCursorTimerID);
      self.hideCursorTimerID
      = targetWindow.setTimeout (function () {
        self.hideCursorTimerID = null;
        if (self.popupArea) {
          self.popupArea.style.cursor = "none";
        }
      }, 300);
    }
    self.popupArea.addEventListener
    ("mousemove", onMouseMoveOnPopupArea, false);
    onMouseMoveOnPopupArea (); //開いた時点でタイマースタート
        
    if (image.complete && !image.getAttribute ("__errored")) {
      self.run (1, param);
    }
    else {
      if (image.getAttribute ("__errored")) {
        /* 画像の読み込みに失敗している */
        self.run (2, param);
      }
      else {
        image.addEventListener
        ("error",
         function () {
          self.onImageError (arguments [0], param);
        }, false);
        image.addEventListener
        ("load",
         function () {
          self.onImageLoad (arguments [0], param);
        }, false);
      }
    }
  },
    
  /**
   * 画像読み込みの完了イベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  onImageLoad : function (event, param) {
    if (this.state != 0) {
      return; // 読込待ち状態以外からは状態遷移させてはならない
    }
    var exists = false;
    for (var key in param.popups) {
      if (key == this.key) {
        exists = true;
      }
    }
        
    if (!exists) {
      return;
    }
        
    this.run (1, param);
  },
    
  /**
   * 画像読み込みの失敗イベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  onImageError : function (event, param) {
    if (this.state != 0) {
      return; // 読込待ち状態以外からは状態遷移させてはならない
    }
    var exists = false;
    for (var key in param.popups) {
      if (key == this.key) {
        exists = true;
      }
    }
        
    if (!exists) {
      return;
    }
        
    event.currentTarget.setAttribute ("__errored", true);
    this.run (2, param);
  }
};
/**
 * カタログのコメントポップアップデータ
 *   Inherits From: arAkahukuPopupData
 *
 * @param  arAkahukuSidebarThread thread
 *         対象のスレッドデータ
 * @param  HTMLElememt baseNode
 *         ポップアップ元のノード
 */
function arAkahukuCatalogCommentPopupData (_thread, _baseNode) {
  this.thread = _thread;
  this.baseNode = _baseNode;
  this.targetWindow = _baseNode.ownerDocument.defaultView;
}
arAkahukuCatalogCommentPopupData.prototype =  {
  state : 0,                  /* Number  ポップアップの状態
                               *   0: ポップアップ表示待ち
                               *   1: 拡大中
                               *   2: 拡大完了
                               *   3: 縮小中
                               *   4: 削除 */
  thread : null,              /* arAkahukuSidebarThread  対象のスレッド */
  baseNode : null,            /* HTMLEmement  ポップアップ元のノード */
  key : "",                   /* String  キャッシュのキー */
  popup : null,               /* HTMLDivElement  表示中のポップアップ */
  container : null,           /* HTMLDivElement  テキストを含むノード */
  zoomFactor : 0,             /* Number  拡大の状態 */
  lastTime : 0,               /* Number  動作のタイマーの前回の時間 */
  createTimerID : null,       /* Number  表示待ち状態のタイマー ID */
  baseNodeGeometry : null,    /* Object  対象のカタログ画像の位置、サイズ */
  popupGeometry : null,       /* Object  ズーム先の位置、サイズ */
    
  width : 0,
  height : 0,
    
  /**
   * データを開放する
   *   arAkahukuPopupData.destruct
   */
  destruct : function () {
    this.thread = null;
    this.baseNode = null;
    if (this.popup && this.popup.parentNode) {
      this.popup.parentNode.removeChild (this.popup);
    }
    this.popup = null;
    this.container = null;
    if (this.targetWindow) {
      this.targetWindow.clearTimeout (this.createTimerID);
    }
    this.createTimerID = null;
    this.baseNodeGeometry = null;
    this.popupGeometry = null;
    this.targetWindow = null;
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
    var targetDocument = param.targetDocument;
        
    if (this.createTimerID) {
      this.targetWindow.clearTimeout (this.createTimerID);
      this.createTimerID = null;
    }
        
    this.state = state;
    switch (state) {
      case 0:
        var timeout = arAkahukuCatalog.zoomCommentTimeout;
                
        this.createTimerID
          = this.targetWindow.setTimeout (function (that) {
            that.createPopup (param, that, targetDocument);
          }, timeout, this);
        break;
      case 1:
        this.lastTime = new Date ().getTime ();
        arAkahukuPopup.addEffector (param,
                                    this,
                                    this.zoominEffect);
        break;
      case 2:
        arAkahukuPopup.removeEffector (param, this);
        break;
      case 3:
        this.lastTime = new Date ().getTime ();
        arAkahukuPopup.addEffector (param,
                                    this,
                                    this.zoomoutEffect);
        break;
      case 4:
      default:
        arAkahukuPopup.removeEffector (param, this);
        if (this.popup) {
          this.popup.parentNode.removeChild (this.popup);
          this.popup = null;
        }
        this.baseNode = null;
        break;
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
    var result = false;
        
    switch (this.state) {
      case 0:
        this.run (4, param);
        /* FALLTHRU */
      case 4:
        result = true;
        break;
      case 1:
      case 2:
        this.run (3, param);
        break;
    }
        
    return result;
  },
    
  /**
   * 対象のカタログ画像の位置、サイズ取得
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  getGeometry : function (targetDocument) {
    var x = 0, y = 0;
    for (var tmp = this.baseNode; tmp; tmp = tmp.offsetParent) {
      x += tmp.offsetLeft;
      y += tmp.offsetTop;
    }
        
    this.baseNodeGeometry = new Object ();
    this.popupGeometry = new Object ();
        
    this.baseNodeGeometry.left = x - 1;
    this.baseNodeGeometry.top = y - 1;
    this.baseNodeGeometry.width = this.baseNode.offsetWidth;
    this.baseNodeGeometry.height = this.baseNode.offsetHeight;
    this.baseNodeGeometry.right
    = this.baseNodeGeometry.left + this.baseNodeGeometry.width;
    this.baseNodeGeometry.bottom
    = this.baseNodeGeometry.top + this.baseNodeGeometry.height;
        
    this.width = this.baseNodeGeometry.width;
    this.height = this.baseNodeGeometry.height;
        
    this.popupGeometry.width = this.container.offsetWidth + 8;
    this.popupGeometry.height = this.container.offsetHeight + 8;
        
    if (this.popupGeometry.width < this.baseNodeGeometry.width) {
      this.popupGeometry.width = this.baseNodeGeometry.width;
    }
    if (this.popupGeometry.height < this.baseNodeGeometry.height) {
      this.popupGeometry.height = this.baseNodeGeometry.height;
    }
        
    this.popupGeometry.left
    = this.baseNodeGeometry.left
    - (this.popupGeometry.width - this.baseNodeGeometry.width) / 2;
    this.popupGeometry.top
    = this.baseNodeGeometry.top;
        
    /* 画面からはみ出さないようにする */
    var targetElement = targetDocument.body; //後方互換モード用
    if (targetDocument.compatMode != "BackCompat") {
      targetElement = targetDocument.documentElement; //標準準拠モード用
    }
    var min = targetElement.scrollLeft;
    if (this.popupGeometry.left < min) {
      this.popupGeometry.left = min;
    }
    min = targetElement.scrollTop;
    if (this.popupGeometry.top < min) {
      this.popupGeometry.top =  min;
    }
    var max = targetElement.scrollLeft + targetElement.clientWidth;
    if (this.popupGeometry.left + this.popupGeometry.width
        >= max - 1) {
      this.popupGeometry.left
      = max - this.popupGeometry.width - 2;
    }
    max = targetElement.scrollTop + targetElement.clientHeight;
    if (this.popupGeometry.top + this.popupGeometry.height
        >= max - 1) {
      this.popupGeometry.top
      = max - this.popupGeometry.height - 2;
    }
        
    this.popupGeometry.right
    = this.popupGeometry.left + this.popupGeometry.width;
    this.popupGeometry.bottom
    = this.popupGeometry.top + this.popupGeometry.height;
  },
    
  /**
   * ポップアップの位置、サイズの更新
   */
  updatePopupGeometry : function () {
    if (!this.baseNodeGeometry) {
      this.getGeometry (this.baseNode.ownerDocument);
    }
        
    var baseNodeGeometry = this.baseNodeGeometry;
    var popupGeometry = this.popupGeometry;
        
    var t = this.zoomFactor / 100;
        
    var diffX = popupGeometry.width - baseNodeGeometry.width;
    var diffY = popupGeometry.height - baseNodeGeometry.height;
        
    var left, top, right, bottom;
    var width, height;
            
    left
    = (baseNodeGeometry.left
       * Math.pow (1 - t, 3))
    + ((baseNodeGeometry.left + diffX / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((popupGeometry.left - diffX / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (popupGeometry.left
       * Math.pow (t, 3));
    top
    = (baseNodeGeometry.top
       * Math.pow (1 - t, 3))
    + ((baseNodeGeometry.top + diffY / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((popupGeometry.top - diffY / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (popupGeometry.top
       * Math.pow (t, 3));
    right
    = (baseNodeGeometry.right
       * Math.pow (1 - t, 3))
    + ((baseNodeGeometry.right - diffX / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((popupGeometry.right + diffX / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (popupGeometry.right
       * Math.pow (t, 3));
    bottom
    = (baseNodeGeometry.bottom
       * Math.pow (1 - t, 3))
    + ((baseNodeGeometry.bottom - diffY / 2)
       * 3.0 * Math.pow (1 - t, 2) * t)
    + ((popupGeometry.bottom + diffY / 2) 
       * 3.0 * (1 - t) * Math.pow (t, 2))
    + (popupGeometry.bottom
       * Math.pow (t, 3));
            
    width = right - left;
    height = bottom - top;
    if (this.baseNode.ownerDocument.compatMode != "BackCompat") {
      // CSS width/height には border/padding width は含まれない
      width -= 8;
      height -= 8; 
    }
            
    /* 小さくなる時はサイズから変える */
    if (this.width > width) {
      this.width = width;
      this.popup.style.width = width + "px";
      this.popup.style.left = left + "px";
    }
    if (this.height > height) {
      this.height = height;
      this.popup.style.height = height + "px";
      this.popup.style.top = top + "px";
    }
            
    /* 大きくなる時は位置から変える */
    if (this.width <= width) {
      this.popup.style.left = left + "px";
      this.width = width;
      this.popup.style.width = width + "px";
    }
    if (this.height <= height) {
      this.popup.style.top = top + "px";
      this.height = height;
      this.popup.style.height = height + "px";
    }
  },
    
  /**
   * ポップアップの拡大
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoominEffect : function (param) {
    if (this.state != 1) {
      return;
    }
        
    if (arAkahukuCatalog.enableZoomNoAnim) {
      this.zoomFactor = 100;
      this.updatePopupGeometry ();
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
            
      this.updatePopupGeometry ();
    }
    else {
      this.run (2, param);
    }
  },
    
  /**
   * ポップアップの縮小
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   */
  zoomoutEffect : function (param) {
    if (this.state != 3) {
      return;
    }
        
    if (arAkahukuCatalog.enableZoomNoAnim) {
      this.zoomFactor = 0;
      this.updatePopupGeometry ();
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
            
      this.updatePopupGeometry ();
    }
    else {
      this.run (4, param);
    }
  },
    
  /**
   * ポップアップの作成
   *
   * @param  arAkahukuPopupParam param
   *         ポップアップ管理データ
   * @param  arAkahukuPopupData self
   *         ポップアップデータ
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  createPopup : function (param, self, targetDocument) {
    if (self.state != 0) {
      return;
    }
    var exists = false;
    for (var key in param.popups) {
      if (key == self.key) {
        exists = true;
      }
    }
        
    if (!exists) {
      return;
    }
        
    self.popup = targetDocument.createElement ("div");
    self.popup.style.position = "absolute";
    self.popup.className = "akahuku_popup";
    self.popup.style.border = "1px solid #eeaa88";
    self.popup.style.backgroundColor = "#ffffee";
    self.popup.style.overflow = "hidden";
    self.popup.style.zIndex = 200;
    self.popup.style.padding = "4px";
        
    self.container = targetDocument.createElement ("div");
    self.container.className = "akahuku_popup";
    self.container.style.fontSize = "8pt";
    self.container.innerHTML = self.thread.comment;
        
    self.popup.appendChild (self.container);
        
    self.zoomFactor = 0;
        
    targetDocument.body.appendChild (self.popup);
        
    self.updatePopupGeometry ();
        
    self.run (1, param);
  }
};
/**
 * カタログのマージ用のデータ
 *
 * @param  HTMLTableCellElement td
 *         古いテーブルの td 要素
 * @param  String innerHTML
 *         新しいテーブルの内容
 * @param  Number index
 *         更新順の順番
 * @param  Number threadId
 *         スレ番号
 * @param  Number currentReplyNumber
 *         現在のレス数
 * @param  Number oldReplyNumber
 *         前のレス数
 * @param  Boolean visited
 *         既読かどうか
 * @param  Boolean isNew
 *         新規かどうか
 * @param  Boolean overflowed
 *         オーバーフローしたか
 * @param  String className
 *         クラス名
 */
function arAkahukuMergeItem (td, innerHTML, index, threadId, currentReplyNumber,
                             oldReplyNumber, className, flags) {
  this.td = td;
  this.innerHTML = innerHTML;
  this.index = index;
  this.threadId = threadId;
  this.currentReplyNumber = parseInt (currentReplyNumber);
  this.oldReplyNumber = parseInt (oldReplyNumber);
  this.visited = !!flags.visited;
  this.opened = ("opened" in flags ? !!flags.opened : false);
  this.isNew = !!flags.isNew;
  this.overflowed = !!flags.overflowed;
  this.className = className;
}
arAkahukuMergeItem.prototype = {
  td : null,              /* HTMLTableCellElement  古いテーブルの td 要素 */
  innerHTML : "",         /* String  新しいテーブルの内容 */
  index : 0,              /* Number  更新順の順番 */
  threadId : 0,           /* Number  スレ番号 */
  currentReplyNumber : 0, /* Number  現在のレス数 */
  oldReplyNumber : 0,     /* Number  前のレス数 */
  visited : false,        /* Boolean  既読かどうか */
  opened : false,         /* Boolean  開いているかどうか */
  isNew : false,          /* Boolean  新規かどうか */
  overflowed : false      /* Boolean  オーバーフローしたか */
  ,

  /**
   * レス増加数を得る* (isNew はレス数自体を増加数と見なす)
   *
   * @return Number
   *         レス増加数
   */
  getDelta : function () {
    var delta = this.currentReplyNumber || 0;
    if (!this.isNew) {
      if (this.oldReplyNumber >= 0) {
        delta -= this.oldReplyNumber;
      }
      else {
        delta = 0;
      }
    }
    return delta;
  },
};
/**
 * カタログの非同期履歴調査用
 */
function arAkahukuMergeItemVisitedCallback (mergeItem, list, id) {
  this.wrappedObject = mergeItem;
  this.id = id;
  list.addCallback (this, id);
  this.list = list;
  this.isVisitedHandler = null;
};
arAkahukuMergeItemVisitedCallback.prototype = {
  isVisited : function (uri, visited) {
    if (this.isVisitedHandler) {
      this.isVisitedHandler.apply (this, [uri, visited]);
    }
    else if (this.wrappedObject) {
      this.wrappedObject.visited = visited;
    }
    if (this.list) {
      this.list.removeCallback (this.id);
    }
    this.destruct ();
  },
  destruct : function () {
    this.id = null;
    this.list = null;
    this.wrappedObject = null;
    this.isVisitedHandler = null;
  },
};
function arAkahukuMergeItemCallbackList () {
  this._id = 0;
  this._list = {};
  this.count = 0;
  this.waiting = false;
  this.callback = null;
};
arAkahukuMergeItemCallbackList.prototype = {
  addCallback : function (callback, id) {
    this._list [id] = callback;
    this.count ++;
  },
  removeCallback : function (id) {
    delete this._list [id];
    this.count --;
    if (this.waiting && this.count == 0) {
      this.callback ();
      this.waiting = false;
      this.callback = null;
    }
  },
  createVisitedCallback : function (item) {
    return new arAkahukuMergeItemVisitedCallback (item, this, this._id ++);
  },
  asyncWaitRequests : function (callback) {
    if (this.count == 0) {
      callback ();
    }
    else {
      this.waiting = true;
      this.callback = callback;
    }
  },
  abort : function () {
    this.waiting = false;
    for (var id in this._list) {
      this._list [id].destruct ();
      this.removeCallback (id);
    }
  },
};
/**
 * カタログ管理データ
 *   Inherits From: nsISHistoryListener,
 *                  nsIRequestObserver, nsIStreamListener
 */
function arAkahukuCatalogParam (targetDocument) {
  this.order = "akahuku_catalog_reorder_default";
  this.targetDocument = targetDocument;
  this.targetWindow = targetDocument.defaultView;
}
arAkahukuCatalogParam.prototype = {
  tatelogSec : 0,         /* Number  タテログの残り時間 */
  reloadChannel : null,   /* Request  データを取得するチャネル */
  defaultColumns : 0,     /* Number  板自身のテーブルの横幅 */
  columns : 15,           /* Number  テーブルの横幅 */
  latestThread : 0,       /* Number  更新前の最新のスレ番号 */
  order : "",             /* String ソート方法
                           *   "akahuku_catalog_reorder_default"
                           *   "akahuku_catalog_reorder_page"
                           *   "akahuku_catalog_reorder_spec"
                           *   "akahuku_catalog_reorder_createtime" */
  targetDocument : null,  /* HTMLDocument  対象のドキュメント */
    
  oldTable : null,        /* HTMLTableElement  最新に更新の前のテーブル */
  oldOrder : "",          /* String  最新に更新の前の order */
  oldLatestThread : 0,    /* Number  最新に更新の前の latestThread */

  oldThreads : null,      /* Array  最新に更新で消えたスレ
                           *   [arAkahukuMergeItem, ...] */
    
  sstream : null,         /* nsIScriptableInputStream  データ到着時に
                           *   読み込むストリーム */
  responseHead : "",      /* String  応答のヘッダ */
  responseText : "",      /* String  応答のデータ */
    
  addedLastCells : false, /* Boolean  最後のセルを追加したか */

  updateAgeTimerID : null,    /* Number  __age 属性更新のデバウンス用タイマ */
  hideEntireThreadDispatched : false,
    
  historyCallbacks : null,

  /**
   * データを開放する
   */
  destruct : function () {
    if (this.reloadChannel) {
      try {
        this.reloadChannel.cancel
          (Components.results.NS_BINDING_ABORTED || 0x80020006);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      this.reloadChannel = null;
    }
    try {
      this.targetDocument.defaultView
      .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
      .getInterface (Components.interfaces.nsIWebNavigation)
      .sessionHistory.removeSHistoryListener (this);
    }
    catch (e) {
    }
    this.unregisterObserver ();
    if (this.targetWindow) {
      this.targetWindow.clearTimeout (this.updateAgeTimerID);
    }
    this.updateAgeTimerID = null;
    this.targetDocument = null;
    this.targetWindow = null;
    this.oldTable = null;
    this.historyCallbacks = null;
  },
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsISHistoryListener/nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsIObserver)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsISHistoryListener)
        || iid.equals (Components.interfaces.nsIRequestObserver)
        || iid.equals (Components.interfaces.nsIStreamListener)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },
    
  /**
   * 戻るイベント
   *   nsISHistoryListener.OnHistoryGoBack
   *
   * @param  nsIURI backURI
   *         戻る先の URI
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryGoBack : function (backURI) {
    return true;
  },
    
  /**
   * 進むイベント
   *   nsISHistoryListener.OnHistoryGoForward
   *
   * @param  nsIURI forwardURI
   *         進む先の URI
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryGoForward : function (forwardURI) {
    return true;
  },
    
  /**
   * 移動イベント
   *   nsISHistoryListener.OnHistoryGotoIndex
   *
   * @param  Number index
   *         移動先のインデックス
   * @param  nsIURI gotoURI
   *         移動先の URI
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryGotoIndex : function (index, gotoURI) {
    return true;
  },
    
  /**
   * 項目追加イベント
   *   nsISHistoryListener.OnHistoryNewEntry
   *
   * @param  nsIURI newURI
   *         追加する URI
   */
  OnHistoryNewEntry : function (newURI) {
    return true;
  },
    
  /**
   * 項目削除イベント
   *   nsISHistoryListener.OnHistoryPurge
   *
   * @param  Number index
   *         削除する数
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryPurge : function (numEntries) {
    return true;
  },
    
  /**
   * リロードイベント
   *   nsISHistoryListener.OnHistoryReload
   *
   * @param  nsIURI reloadURI
   *         リロードする URI
   * @param  Number reloadFlags
   *         リロード方法
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryReload : function (reloadURI, reloadFlags) {
    if (reloadFlags
        & Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE
        || reloadFlags
        & Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY) {
      try {
        var anchor
        = this.targetDocument
        .getElementById ("akahuku_catalog_reload_button");
        if (anchor) {
          anchor.parentNode.removeChild (anchor);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
            
      this.targetDocument.defaultView
      .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
      .getInterface (Components.interfaces.nsIWebNavigation)
      .reload (Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE);
            
      return false;
    }
        
    return true;
  },
    
  /**
   * リクエスト開始のイベント
   *   nsIRequestObserver.onStartRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   */
  onStartRequest : function (request, context) {
    this.sstream
    = Components.classes ["@mozilla.org/scriptableinputstream;1"]
    .createInstance (Components.interfaces.nsIScriptableInputStream);
    this.responseText = "";
        
    if (this.reloadChannel != null) {
      arAkahukuCatalog.setStatus
        ("\u30ED\u30FC\u30C9\u4E2D (\u30DC\u30C7\u30A3)",
         // "ロード中 (ボディ)"
         true, this.targetDocument);
    }
  },
    
  /**
   * リクエスト終了のイベント
   *   nsIRequestObserver.onStopRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  Number statusCode
   *         終了コード
   */
  onStopRequest : function (request, context, statusCode) {
    var httpStatus = 200;
    var responseHead = "HTTP/1.1 200 OK\r\n"
    + "Date: " + (new Date ()).toString () + "\r\n"
    + "Server: unknown\r\n"
    + "Content-Type: text/html; charset=Shift_JIS\r\n";
        
    try {
      var httpChannel
        = request.QueryInterface (Components.interfaces.nsIHttpChannel);
      httpStatus
        = httpChannel.responseStatus;
            
      /* 206 の場合表示がおかしくなるので、Date と Server のみ更新する */
      responseHead
        = "HTTP/1.1 200 OK\r\n"
        + "Date: "
        + httpChannel.getResponseHeader ("Date") + "\r\n"
        + "Server: "
        + httpChannel.getResponseHeader ("Server") + "\r\n"
        + "Content-Type: text/html; charset=Shift_JIS\r\n";
    }
    catch (e) {
    }
        
    /* 避難所 patch */
    try {
      var info
      = Akahuku.getDocumentParam (this.targetDocument)
      .location_info;
      if (info.isMonaca) {
        responseHead
          = responseHead.replace (/charset=Shift_JIS/,
                                  "charset=" + (this.targetDocument.characterSet || "EUC-JP") );
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    if (this.reloadChannel == null) {
      return;
    }
        
    if (httpStatus == 200
        && this.responseText.length < 100 && this.responseText.length >= 10
        && this.responseText.substr (0, 10) == "\x96\x9e\x88\xf5\x82\xc5\x82\xb7\x81\x42") {
      // 満員表示 (SJISで"満員です。"以下略)
      arAkahukuCatalog.setStatus
      ("load error: \u6E80\u54E1\u3067\u3059", //"満員です"
       false, this.targetDocument);
    }
    else if (httpStatus == 200) {
      this.responseHead = responseHead;
            
      // "更新中"
      arAkahukuCatalog.setStatus ("\u66F4\u65B0\u4E2D",
                                  true, this.targetDocument);
            
      this.targetWindow.setTimeout (function (that) {
        arAkahukuCatalog.update (that.targetDocument);
      }, 10, this);
      return;
    }
    else {
      arAkahukuCatalog.setStatus ("load error: " + httpStatus,
                                  false, this.targetDocument);
    }
        
    this.reloadChannel = null;
        
    this.responseText = "";
    this.sstream = null;
        
    arAkahukuSound.playCatalogReload ();
  },
    
  /**
   * データ到着のイベント
   *   nsIStreamListener.onDataAvailable
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  nsIInputStream inputStream
   *         データを取得するストリーム
   * @param  PRUint32 offset
   *         データの位置
   * @param  PRUint32 count 
   *         データの長さ
   */
  onDataAvailable : function (request, context, inputStream, offset, count) {
    this.sstream.init (inputStream);
        
    var chunk = this.sstream.read (count);
    this.responseText += chunk;
  },

  /**
   * 連携のためにオブザーバーとして登録する
   */
  registerObserver : function () {
    var os
    = Components.classes ["@mozilla.org/observer-service;1"]
    .getService (Components.interfaces.nsIObserverService);
    os.addObserver (this, "arakahuku-location-info-changed", false);
    os.addObserver (this, "arakahuku-board-newest-num-updated", false);
    os.addObserver (this, "arakahuku-thread-unload", false);
    this._observing = true;
  },
  unregisterObserver : function () {
    if (!this._observing) return;
    try {
      var os
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
      os.removeObserver (this, "arakahuku-location-info-changed", false);
      os.removeObserver (this, "arakahuku-board-newest-num-updated", false);
      os.removeObserver (this, "arakahuku-thread-unload", false);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },

  /**
   * nsIObserver.observe
   */
  observe : function (subject, topic, data) {
    if (!arAkahukuCatalog.enableObserve) {
      return;
    }
    try {
      if (topic == "arakahuku-location-info-changed") {
        subject.QueryInterface (Components.interfaces.nsISupportsString);
        var decodedData = arAkahukuJSON.decode (subject.data);
        this.onNotifiedLocationInfoUpdated (decodedData, data);
      }
      else if (topic == "arakahuku-board-newest-num-updated") {
        subject.QueryInterface (Components.interfaces.nsISupportsString);
        var decodedData = arAkahukuJSON.decode (subject.data);
        this.onNotifiedThreadNewestNumber (decodedData, data);
      }
      else if (topic == "arakahuku-thread-unload") {
        subject.QueryInterface (Components.interfaces.nsISupportsString);
        var decodedData = arAkahukuJSON.decode (subject.data);
        this.onNotifiedThreadUnload (decodedData, data);
      }
    }
    catch (e) {
      Akahuku.debug.exception (e);
    }
  },
  /**
   * スレ情報更新通知イベント
   */
  onNotifiedLocationInfoUpdated : function (infoThread, data) {
    var info
      = Akahuku.getDocumentParam (this.targetDocument)
      .location_info;
    if (!(info.server === infoThread.server
        && info.dir === infoThread.dir)) {
      return;
    }
    infoThread.prototype = info.prototype;
    if (infoThread.isReply) {
      arAkahukuCatalog.updateByThreadInfo
        (this.targetDocument, infoThread);
    }
  },
  /**
   * 板の最新レス番号の更新通知イベント
   */
  onNotifiedThreadNewestNumber : function (newestNum, data) {
    if (!arAkahukuCatalog.enableRed) {
      return;
    }
    var info
      = Akahuku.getDocumentParam (this.targetDocument)
      .location_info;
    var name = info.server + ":" + info.dir;
    if (name != newestNum.name) {
      return;
    }
    // 「古いスレを赤くする」の再判定
    // (短時間に繰り返し実行しないようにデバウンス)
    this.targetWindow.clearTimeout (this.updateAgeTimerID);
    this.updateAgeTimerID
      = this.targetWindow.setTimeout (function (param, num) {
        param.updateAgeTimerID = null;
        if (!param.targetDocument) return;
        var table = arAkahukuCatalog.getCatalogTable (param.targetDocument);
        if (!table) return;
        var nodes = table.getElementsByTagName ("td");
        for (var i = 0; i < nodes.length; i ++) {
          arAkahukuCatalog.updateCellAge (nodes [i], info, num);
          arAkahukuCatalog.updateCellPreserve (nodes [i], info);
        }
      }, 100, this, newestNum.value);
  },

  onNotifiedThreadUnload : function (threadInfo, data) {
    var info
      = Akahuku.getDocumentParam (this.targetDocument)
      .location_info;
    if (threadInfo.server !== info.server
        || threadInfo.dir !== info.dir) {
      // 管轄外のスレを無視
      return;
    }
    var td
      = arAkahukuCatalog.getThreadCell
      (this.targetDocument, threadInfo.threadNumber);
    if (td) {
      // unload 終了後にまだ開かれてるかの再判定
      this.targetWindow.setTimeout (function (cell, url) {
        var opened = arAkahukuCatalog.isOpened (url);
        arAkahukuCatalog.setCellOpened (cell, opened);
      }, 10, td, threadInfo.URL);
    }
  },
};
/**
 * カタログ管理
 *   [カタログ]
 *   Inherits From: nsINavHistoryObserver
 */
var arAkahukuCatalog = {
  enableReorder : false,        /* Boolean  ソート */
  reorderWidth : 10,            /* Boolean  指定幅 */
  enableReorderSave : false,    /* Boolean  状態を記憶する */
  reorderSaveType : 0,          /* Number  状態 */
  REORDER_TYPES : {
    akahuku_catalog_reorder_default : 0,    // 通常
    akahuku_catalog_reorder_page : 1,       // ページごと
    akahuku_catalog_reorder_spec : 2,       // 通常順に(指定幅ずつ)
    akahuku_catalog_reorder_delta : 3,      // 増加数順に
    akahuku_catalog_reorder_createtime : -1,// スレの立った順に
  },
  enableReorderVisited : false, /* Boolean  未読と既読で分ける */
  enableReorderNew : false,     /* Boolean  最新に更新で新規を分ける */
  enableReorderFill : false,    /* Boolean  合間合間に で消した分を詰める */
  enableReorderInfo : false,    /* Boolean  各行に情報を表示する */
    
  enableZoom : false,         /* Boolean  ズーム */
  enableZoomClick : false,    /* Boolean  クリックで開く */
  enableZoomNoAnim : false,   /* Boolean  アニメーションしない */
  zoomTimeout : 10,           /* Number  表示まで [ms] */
  zoomSize : 96,              /* Number  サイズ [px] */
  zoomSizeType : 0,           /* Number  サイズの単位
                               *   0: px
                               *   1: ％ */
  zoomCacheCount : 16,        /* Number  キャッシュ */
  enableZoomComment : false,  /* Boolean  コメントを全文表示 */
  zoomCommentTimeout : 10,    /* Number  表示まで [ms] */
    
  enableReload : false,                 /* Boolean  最新に更新 */
  enableReloadReplyNumberDelta : false, /* Boolean  レスの増加数を表示 */
  enableReloadHook : false,             /* Boolean  リロードの代わりに
                                         *   最新に更新 */
  enableReloadStatusHold : false,       /* Boolean  ステータスを消さない */
  enableReloadTimestamp : false,        /* Boolean  更新時刻を表示する */
  enableReloadUpdateCache : false,      /* Boolean  キャッシュに反映させる */
  enableReloadLeftBefore : false,       /* Boolean  合間合間に で消した分だけ更新前を残す */
  enableReloadLeftBeforeMore : false,   /* Boolean  多めに残す */
  reloadLeftBeforeMoreNum : "1L",       /* String  残す数 */
  enableReloadLeftBeforeSave : false,   /* Boolean  状態を保存する */

  enableSidebar : false,        /* Boolean  サイドバーと連携 */
  enableSidebarComment : false, /* Boolean  スレ本文を長めに表示 */
  sidebarCommentLength : 12,    /* Number  スレ本文の長さ */

  enableObserve : false,        /* Boolean  通常・返信モードと連携 */
  enableObserveReplyNum : false,/* Boolean  レス数を即座に反映 */
  enableObserveOpened : false,  /* Boolean  開いているスレをマーク */
    
  enableClickable : false, /* Boolean  空白の本文を強制リンク */
  enableVisited : false,   /* Boolean  一度見たスレをマーク */
  enableRed : false,       /* Boolean  古いスレを赤くする */
  enableLeft : false,      /* Boolean  カタログを左寄せ */
    
  lastCells : new Object (), /* Object  閉じる前のセル
                              *   <String server:dir, [Object セル情報]> */
  lastCellsText : "",        /* String  lastcells.txt の内容 */
    
  /**
   * 初期化処理
   */
  init : function () {
    var historyService
    = Components.classes ["@mozilla.org/browser/nav-history-service;1"]
    .getService (Components.interfaces.nsINavHistoryService);
    historyService.addObserver (arAkahukuCatalog, false);
  },
  
  /**
   * 終了処理
   */
  term : function () {
    var historyService
    = Components.classes ["@mozilla.org/browser/nav-history-service;1"]
    .getService (Components.interfaces.nsINavHistoryService);
    historyService.removeObserver (arAkahukuCatalog);
  },
  
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
    if (info.isCatalog) {
      /* カタログモード */
            
      /* ソート */
      if (arAkahukuCatalog.enableReorder) {
        style
        .addRule ("table th",
                  "padding-left: 8px; "
                  + "border-width: 0px;" // BackCompat
                  + "padding-right: 8px;")
        .addRule ("table th.akahuku_header",
                  "border-width: 1px;")
        .addRule ("table th.akahuku_header_info",
                  "font-size: 10pt; "
                  + "vertical-align: top; "
                  + "text-align: right; "
                  + "font-weight: normal;")
        .addRule ("#akahuku_catalog_mode_indicator",
                  "font-size: 9pt; "
                  + "font-weight: normal; "
                  + "color: #ffffff; "
                  + "background-color: inherit;"
                  + "margin-left: 1em;")
        .addRule ("#akahuku_catalog_reorder_container",
                  "text-align: center; "
                  + "font-size: 9pt; "
                  + "margin: 4px;")
        .addRule ("#akahuku_catalog_reorder_container2",
                  "text-align: center; "
                  + "font-size: 9pt; "
                  + "margin: 0px;")
        .addRule ("a.akahuku_catalog_reorder",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_catalog_current_reorder",
                  "font-weight: bold;")
        .addRule ("a.akahuku_catalog_reorder:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("span.akahuku_catalog_reorder_width",
                  "font-size: inherit;") // 旧スタイル対策
      }
      /* 一度見たスレをマーク */
      if (arAkahukuCatalog.enableVisited) {
        style
        .addRule ("td a",
                  "text-decoration: none;")
        .addRule ("td a font",
                  "color: #800000;")
        .addRule ("td a.akahuku_visited font, "
                  + "td a:visited font, "
                  + "td[__opened] a font",// 開いているスレ
                  "background-color: #eeaa88;");
        /* 避難所 patch */
        if (info.isMonaca) {
          style
            .addRule ("td a:visited span",
                      "background-color: #eeaa88;")
            .addRule ("td a.akahuku_visited span",
                      "background-color: #eeaa88;");
        }
      }
      /* 最新に更新 */
      if (arAkahukuCatalog.enableReload) {
        style
        .addRule ("#akahuku_appending_container",
                  "display: none; ")
        .addRule ("div.akahuku_cell",
                  "margin: 0; "
                  + "padding: 0; "
                  + "font-size: 9pt; "
                  + "color: #cc1105;")
        .addRule ("div.akahuku_cell_horizontal", //コメント位置:右
                  "float: left;")
        .addRule ("#akahuku_catalog_reload_container",
                  "text-align: left; "
                  + "margin-bottom: "
                  + (arAkahukuCatalog.enableReorder
                    ? "0em" : "0.5em;"))
        .addRule ("#akahuku_catalog_reload_container2",
                  "text-align: left; "
                  + "margin-bottom: 0.5em;")
        .addRule ("#akahuku_catalog_reload_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_button2",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_button2:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_undo",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_undo2",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_status",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_status2",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_timestamp",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_timestamp2",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_undo_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_undo_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_undo_button2",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_undo_button2:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_redo",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_redo2",
                  "font-size: 9pt;")
        .addRule ("#akahuku_catalog_reload_redo_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_redo_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_redo_button2",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_catalog_reload_redo_button2:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;");
        // ニュース表 patch
        if (info.server === "zip" && info.dir === "6") {
          style
          .addRule ("td a",
                    "text-decoration: underline;")
          .addRule ("td a font",
                    "color: inherit;")
        }
      }
      /* ズーム */
      if (arAkahukuCatalog.enableZoom) {
        style
        .addRule ("a.akahuku_zoomedpopup_button",
                  "z-index: 100; "
                  + "text-decoration: none; "
                  + "background-color: #0040e0; "
                  + "color: #ffffff; "
                  + "font-size: 10pt; "
                  + "padding: 0 4px 0 4px;")
        .addRule ("a.akahuku_zoomedpopup_errored_button",
                  "z-index: 100; "
                  + "text-decoration: none; "
                  + "background-color: #ffffee; "
                  + "color: red; "
                  + "border: 1px solid red; "
                  + "font-size: 9pt; "
                  + "padding: 0 4px 0 4px;");
                
        if (arAkahukuCatalog.enableVisited) {
          style
            .addRule ("a.akahuku_zoomedpopup_button.akahuku_visited",
                      "background-color: #e04000;");
        }
      }
      // 古いスレを赤くする
      if (arAkahukuCatalog.enableRed) {
        style
        // 赤字 (レス保存数残り1割)
        .addRule ('td[__age="9"]:not([__preserved])',
                  "border-style: solid; "
                  + "border-color: #f00;")
        // 赤字 (最低保持時間間近(レス保存数わずか))
        .addRule ('td[__age="9"][__preserved="0"]'
                  + ',td[__age="10"][__preserved="0"]',
                  "border-style: solid; "
                  + "border-color: #f00;")
        // 消滅したはず
        .addRule ('td[__age="10"]:not([__preserved])',
                  "border-style: dotted; "
                  + "border-color: #f00;")
        .addRule ('td[__age="-1"]',
                  "border-style: dotted; "
                  + "border-color: #800;")
        // 赤くすることでセルのサイズが変化しないように
        .addRule ('table[border="1"] td',
                  "border-width: 1px; "
                  + "padding: 1px;")
        .addRule ('table[border="1"] td[__age="9"]:not([__preserved])'
                  + ',table[border="1"] td[__age="9"][__preserved="0"]'
                  + ',table[border="1"] td[__age="10"][__preserved="0"]'
                  + ',table[border="1"] td[__age="10"]:not([__preserved])'
                  + ',table[border="1"] td[__age="-1"]',
                  "border-width: 2px; "
                  + "padding: 0px;")
        // 枠無しのカタログでの赤枠 (ニュース表など)
        .addRule ('table:not([border="1"]) td[__age="9"]'
                  + ',table:not([border="1"]) td[__age="10"]'
                  + ',table:not([border="1"]) td[__age="-1"]',
                  "border-width: 1px;")
      }
      // 更新前を残す
      style
      .addRule ('td[__overflowed="true"]',
                "background-color: #ddddcc;")
      // 開かれているスレ
      .addRule ('table[border="1"] td[__opened]',
                "border-style: outset;"
                + "box-shadow: 1px 1px #d8b2b2;")
      .addRule ('table:not([border="1"]) td[__opened]',
                "border-style: outset;"
                + "border-width: 1px;")
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuCatalog.enableReorder
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.reorder", true);
    if (arAkahukuCatalog.enableReorder) {
      arAkahukuCatalog.reorderWidth
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.reorder.width", 10);
      arAkahukuCatalog.enableReorderSave
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reorder.save", true);
      if (arAkahukuCatalog.enableReorderSave) {
        arAkahukuCatalog.reorderSaveType
          = arAkahukuConfig
          .initPref ("int", "akahuku.catalog.reorder.save.type", 0);
      }
      arAkahukuCatalog.enableReorderVisited
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reorder.visited", false);
      arAkahukuCatalog.enableReorderNew
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reorder.new", false);
      arAkahukuCatalog.enableReorderFill
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reorder.fill", false);
      arAkahukuCatalog.enableReorderInfo
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reorder.info", false);
    }
        
    arAkahukuCatalog.enableZoom
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.zoom", false);
    if (arAkahukuCatalog.enableZoom) {
      arAkahukuCatalog.enableZoomClick
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.zoom.click", false);
      arAkahukuCatalog.enableZoomNoAnim
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.zoom.noanim", false);
      arAkahukuCatalog.zoomTimeout
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.zoom.delay", 10);
      if (arAkahukuCatalog.zoomTimeout < 10) {
        arAkahukuCatalog.zoomTimeout = 10;
      }
      arAkahukuCatalog.zoomSize
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.zoom.size", 96);
      if (arAkahukuCatalog.zoomSize < 50) {
        arAkahukuCatalog.zoomSize = 50;
      }
      else if (arAkahukuCatalog.zoomSize > 300) {
        arAkahukuCatalog.zoomSize = 300;
      }
      arAkahukuCatalog.zoomSizeType
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.zoom.sizetype", 0);
      arAkahukuCatalog.zoomCacheCount
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.zoom.cache.count", 16);
            
      arAkahukuCatalog.enableZoomComment
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.zoom.comment", false);
      arAkahukuCatalog.zoomCommentTimeout
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.zoom.comment.delay", 10);
      if (arAkahukuCatalog.zoomCommentTimeout < 10) {
        arAkahukuCatalog.zoomCommentTimeout = 10;
      }
    }
        
    arAkahukuCatalog.enableReload
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.reload", true);
    if (arAkahukuCatalog.enableReload) {
      arAkahukuCatalog.enableReloadReplyNumberDelta
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reload.reply_number_delta",
                   false);
      arAkahukuCatalog.enableReloadHook
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reload.hook", false);
      arAkahukuCatalog.enableReloadStatusHold
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reload.status.hold", false);
      arAkahukuCatalog.enableReloadTimestamp
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reload.timestamp", false);
      arAkahukuCatalog.enableReloadUpdateCache
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reload.update_cache",
                   true);
      arAkahukuCatalog.enableReloadLeftBefore
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reload.left_before",
                   false);
      if (arAkahukuCatalog.enableReloadLeftBefore) {
        arAkahukuCatalog.enableReloadLeftBeforeMore
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.catalog.reload.left_before.more",
                     false);
        var value;
        value
          = arAkahukuConfig
          .initPref ("char",
                     "akahuku.catalog.reload.left_before.more.num",
                     "1L");
        arAkahukuCatalog.reloadLeftBeforeMoreNum = unescape (value);
        arAkahukuCatalog.enableReloadLeftBeforeSave
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.catalog.reload.left_before.save",
                     false);
        if (arAkahukuCatalog.enableReloadLeftBeforeSave) {
          /* 状態をロード */
          var filename
            = arAkahukuFile.systemDirectory
            + arAkahukuFile.separator + "lastcells.txt";
            
          arAkahukuCatalog.lastCellsText
            = arAkahukuFile.readFile (filename);
          var currentBoard = "";
            
          arAkahukuCatalog.lastCellsText.replace
            (/([^\n\r]+)[\r\n]+/g,
             function (matched, line) {
              if (line.indexOf (",") == -1) {
                currentBoard = line;
                var cells = new Array ();
                arAkahukuCatalog.lastCells [currentBoard] = cells;
              }
              else {
                var values = line.split (/,/);
                var i = 0;
                
                var cell = new Object ();
                
                cell.threadId = parseInt (unescape (values [i]));
                i ++;
                cell.replyNumber = parseInt (unescape (values [i]));
                i ++;
                cell.href = unescape (values [i]);
                i ++;
                cell.text = unescape (values [i]);
                i ++;
                cell.className = unescape (values [i]);
                i ++;
                arAkahukuCatalog.lastCells [currentBoard].push (cell);
              }
            });
        }
      }
      else {
        arAkahukuCatalog.enableReloadLeftBeforeMore = false;
        arAkahukuCatalog.enableReloadLeftBeforeSave = false;
      }
      if (!arAkahukuCatalog.enableReloadLeftBeforeSave) {
        arAkahukuCatalog.lastCellsText = "";
        arAkahukuCatalog.lastCells = new Object ();

        // lastcells.txt を削除
        // (設定をオンオフする場合等で古いデータが使われないように)
        var filename
          = arAkahukuFile.systemDirectory
          + arAkahukuFile.separator + "lastcells.txt";
        try {
          var file
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (Components.interfaces.nsILocalFile);
          file.initWithPath (filename);
          file.remove (false);
        }
        catch (e if e.result == Components.results.NS_ERROR_FILE_TARGET_DOES_NOT_EXIST
               || e.result == Components.results.NS_ERROR_FILE_NOT_FOUND) {
          // 無いなら無視
        }
        catch (e) { Akahuku.debug.exception (e);
        }
      }
    }
        
    arAkahukuCatalog.enableSidebar
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.sidebar", false);
    if (arAkahukuCatalog.enableSidebar) {
      arAkahukuCatalog.enableSidebarComment
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.sidebar.comment", true);
      arAkahukuCatalog.sidebarCommentLength
        = arAkahukuConfig
        .initPref ("int",  "akahuku.catalog.sidebar.comment.length",
                   12);
    }

    arAkahukuCatalog.enableObserve
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.observe", false);
    arAkahukuCatalog.enableObserveReplyNum
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.observe.replynum", false)
    && arAkahukuCatalog.enableObserve;
    arAkahukuCatalog.enableObserveOpened
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.observe.opened", false)
    && arAkahukuCatalog.enableObserve;
        
    arAkahukuCatalog.enableClickable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.clickable", true);
    arAkahukuCatalog.enableVisited
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.visited", true);
    arAkahukuCatalog.enableRed
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.red", false);
    arAkahukuCatalog.enableLeft
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.left", false);
  },
    
  /**
   * テーブルを置き換える
   *
   * @param  HTMLTableElement oldTable
   *         置き換える対象の前のテーブル
   * @param  arAkahukuMergeItem mergedItems
   *         カタログのマージ用のデータ
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuCatalogParam param
   *         カタログ管理データ
   */
  replaceTable : function (oldTable, mergedItems, targetDocument,
                           param) {
    /**
     * 更新順に10ずつの場合の各ページへのリンクを作成する
     *
     * @param  HTMLTableRowElement tr
     *         挿入対象の tr 要素
     * @param  Number i
     *         ページ番号
     */
    function createRowHeader (tr, i) {
      if (param.order == "akahuku_catalog_reorder_page") {
        var th = targetDocument.createElement ("th");
        var a = targetDocument.createElement ("a");
        var pageno = parseInt (i / 10);
        a.href
        = targetDocument.location.href
        .replace (/futaba\.php.*/,
                  (pageno == 0 ? "futaba" : pageno) + ".htm");
        /* futaba: 未知なので外部には対応しない */
        a.target = "_blank";
        a.appendChild (targetDocument.createTextNode (pageno));
        th.appendChild (a);
        tr.appendChild (th);
        th.className = "akahuku_header";
      }
      else if (needHeader) {
        var th = targetDocument.createElement ("th");
        tr.appendChild (th);
      }
    }

    function setRowHeaderText (tr, text) {
      tr.firstChild.textContent = text;
      tr.firstChild.className = "akahuku_header";
    }
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var i;
    var newTable = oldTable.cloneNode (false);
    var tbody = targetDocument.createElement ("tbody");
    var tr = null;
    var columns = param.columns;
        
    oldTable.parentNode.insertBefore (newTable, oldTable);
    oldTable.style.display = "none";
    /* 避難所 patch */
    if (info.isMonaca) {
      newTable.id = "cat";
    }
    newTable.appendChild (tbody);
    var latestThread = parseInt (mergedItems [0].threadId);
        
    var doReorderToWidth = !(/_(?:default|page)$/.test (param.order));
    var checkVisited
    = arAkahukuCatalog.enableReorderVisited
    && doReorderToWidth;
    var checkNew
    = arAkahukuCatalog.enableReorderNew
    && doReorderToWidth;
    var dispCreatetime
    = arAkahukuCatalog.enableReorderInfo
    && param.order === "akahuku_catalog_reorder_createtime";
    var dispDeltaHeaders
    = arAkahukuCatalog.enableReorderInfo
    && param.order === "akahuku_catalog_reorder_delta";
    var needHeader
    = checkVisited || checkNew || dispCreatetime || dispDeltaHeaders;
    var isBackCompat = (targetDocument.compatMode == "BackCompat");
        
    var visitedState = (checkVisited ? 0 : 1);
    var newState = (checkNew ? 0 : 1);
    var diff = 0;
    var entire = false;
    var overflowedCount = 0;
    var leftNum = 0;
    var diffAll = 0;

    var appending_container
      = targetDocument.getElementById ("akahuku_appending_container");
    var tdCreated = false;

    if (arAkahukuCatalog.enableReloadLeftBeforeMore) {
      if (arAkahukuCatalog.reloadLeftBeforeMoreNum.match
          (/([0-9]+).*L/)) {
        leftNum = parseInt (RegExp.$1) * columns;
      }
      else {
        leftNum = parseInt (arAkahukuCatalog.reloadLeftBeforeMoreNum);
      }
    }
        
    for (i = 0; i < mergedItems.length; i ++) {
      if (mergedItems [i].overflowed) {
        overflowedCount --;
        if (visitedState != 0 //既読中は overflowed も追加 
            && overflowedCount < -leftNum) {
          continue;
        }
      }
            
      if ((i - diff) % columns == 0) {
        tr = targetDocument.createElement ("tr");
        tbody.appendChild (tr);
        createRowHeader (tr, (i - diff));
      }
      if (checkNew
          && newState == 0) {
        if (i == 0) {
          if (!mergedItems [i].isNew) {
            newState = 1;
          }
          else {
            setRowHeaderText (tr, "\u65B0\u898F"); //"新規"
          }
        }
        else if (!mergedItems [i].isNew) {
          newState = 1;
          diff = i % columns;
          diffAll = i;
                    
          if (diff != 0) { // 改行
            tr = targetDocument.createElement ("tr");
            tbody.appendChild (tr);
            createRowHeader (tr, (i - diff));
          }
        }
      }
            
      if (checkVisited
          && visitedState == 0
          && newState != 0) {
        if (i == diffAll) {
          if (mergedItems [i].visited || mergedItems [i].opened) {
            setRowHeaderText (tr, "\u65E2\u8AAD"); // "既読"
          }
          else {
            visitedState = 1;
          }
        }
        else if (!(mergedItems [i].visited || mergedItems [i].opened)) {
          visitedState = 1;
          var diffVisited = (i - diff) % columns;
          diff = i % columns;
          diffAll = i;
                    
          if (diffVisited != 0) { // 改行
            tr = targetDocument.createElement ("tr");
            tbody.appendChild (tr);
            createRowHeader (tr, (i - diff));
          }
        }
      }

      if ((checkVisited || checkNew) //"未読"が必要か
          && newState != 0 && visitedState != 0) {
        if (i == diffAll) {
          setRowHeaderText (tr, "\u672A\u8AAD"); // "未読"
          // 新規・既読による端数も overflowed を残す分に含める
          leftNum += ((diffAll + overflowedCount) % columns);
          overflowedCount = 0;
        }
      }
            
      if (parseInt (mergedItems [i].threadId) > latestThread) {
        latestThread = parseInt (mergedItems [i].threadId);
      }
            
      var td = null;
      tdCreated = false;
      if (mergedItems [i].td) {
        td = mergedItems [i].td;
        if (mergedItems [i].oldReplyNumber >= 0) {
          td.setAttribute ("__old_reply_number",
                           mergedItems [i].oldReplyNumber);
          td.removeAttribute ("__is_up");
        }
                
        var img = td.getElementsByTagName ("img");
        if (img && img [0]) {
          if (img [0].naturalWidth == 0) {
            img [0].src = img [0].src;
          }
        }
        if (!mergedItems [i].isNew) {
          td.removeAttribute ("__is_new");
        }
        td.setAttribute ("__original_index", mergedItems [i].index);
      }
      else {
        tdCreated = true;
        td = targetDocument.createElement ("td");
        /* mergedItems [i].innerHTML には HTML が含まれるので
         * innerHTML を使用する */
        if (mergedItems [i].className
            && mergedItems [i].className != "undefined"
            && mergedItems [i].className != "null") {
          td.className = mergedItems [i].className;
        }
        td.innerHTML = mergedItems [i].innerHTML;
        // 必須の属性を updateCell より先に設定
        td.setAttribute ("__original_index", mergedItems [i].index);
        td.setAttribute ("__thread_id", mergedItems [i].threadId);
        if (mergedItems [i].isNew) {
          td.setAttribute ("__is_new", "true");
        }
        else {
          td.setAttribute ("__is_up", "true");
        }
                
        arAkahukuCatalog.updateCell (td, info);
                
        if (arAkahukuLink.enableHideTrolls
            && !arAkahukuLink.enableHideTrollsNoCat) {
          arAkahukuLink.applyHideTrolls (targetDocument, td);
        }

        // マークは生成時から (最適化)
        if (arAkahukuCatalog.enableVisited) {
          arAkahukuCatalog.setCellVisited (td, mergedItems [i].visited);
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          arAkahukuCatalog.setCellOpened (td, mergedItems [i].opened);
        }
      }
            
      if (mergedItems [i].overflowed) {
        td.setAttribute ("__overflowed", "true");
      }
      else {
        td.removeAttribute ("__overflowed");
      }
            
      try {
        if (typeof Aima_Aimani != "undefined") {
          if (Aima_Aimani.hideNGNumberCatalogueHandler) {
            Aima_Aimani.hideNGNumberCatalogueHandler (td);
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
            
      if (mergedItems [i].currentReplyNumber >= 0)
      td.setAttribute ("__reply_number",
                       mergedItems [i].currentReplyNumber);

      // 連携したい他の拡張機能の支援(カスタムイベント)
      if (appending_container) {
        appending_container.appendChild (td);
        var appendEvent = targetDocument.createEvent ("Events");
        var appendEventName = (tdCreated
            ? "AkahukuContentAppend"
            : "AkahukuContentReAppend");
        appendEvent.initEvent (appendEventName, true, true);
        if (!td.dispatchEvent (appendEvent)) {
          // preventDefault時にはスレを表示しない
          td.style.display = "none";
        }
        else {
          td.style.display = "";// 表示する
        }
      }

      if (td.style.display == "none") {
        entire = true;
        leftNum ++;
      }

      tr.appendChild (td);
    }
        
    param.latestThread = latestThread;
    arAkahukuBoard.updateNewestNum (info, latestThread);
        
    oldTable.parentNode.removeChild (oldTable);
    if (entire) {
      arAkahukuCatalog.onHideEntireThreadCore (targetDocument);
    }

    if (dispCreatetime) {
      arAkahukuCatalog.setCreatetimeHeaders (newTable);
    }
    else if (dispDeltaHeaders) {
      arAkahukuCatalog.setDeltaHeaders (newTable);
    }
        
    var nodes;
        
    for (i = 0, nodes = newTable.getElementsByTagName ("td");
         i < nodes.length; i ++) {
      arAkahukuCatalog.updateCellReplyNum (nodes [i]);
      arAkahukuCatalog.updateCellInfo (nodes [i],
                                       info,
                                       param.latestThread);
    }
        
    if (arAkahukuCatalog.enableReloadLeftBeforeSave
        && info.isFutaba) {
      /* 状態を保存 */
      var filename
      = arAkahukuFile.systemDirectory
      + arAkahukuFile.separator + "lastcells.txt";
      var text = "";
            
      var lastCells = newTable.getElementsByTagName ("td");
      var cells = new Array ();
      var cell;
      for (var i = 0; i < lastCells.length; i ++) {
        cell = new Object ();
                
        cell.threadId = lastCells [i].getAttribute ("__thread_id");
        cell.replyNumber = lastCells [i].getAttribute ("__reply_number");
        cell.href = "";
        var imageLink = "";
        var imageWidth = 0;
        var imageHeight = 0;
        var commentExists = false;
        var comment = "";
        
        var j;
        nodes = lastCells [i].getElementsByTagName ("a");
        for (j = 0; j < nodes.length; j ++) {
          if (nodes [j].href.match (/res[\/=]([0-9]+)/)
              || nodes [j].href.match (/2\/([0-9]+)/)
              || nodes [j].href.match (/b\/([0-9]+)/)) {
            cell.href = nodes [j].href;
            break;
          }
        }
        nodes = lastCells [i].getElementsByTagName ("img");
        for (j = 0; j < nodes.length; j ++) {
          if (nodes [j].src.match (/(?:cat|thumb)\/([0-9]+)s\.jpg$/)) {
            imageLink = nodes [j].src;
            imageWidth = nodes [j].width;
            imageHeight = nodes [j].height;
            break;
          }
        }
        nodes = lastCells [i].getElementsByTagName ("small");
        for (j = 0; j < nodes.length; j ++) {
          if ("className" in nodes [j]
              && nodes [j].className == "aima_aimani_generated") {
            continue;
          }
          comment = arAkahukuDOM.getInnerText (nodes [j]);
          commentExists = true;
          break;
        }
                
        cell.text
          = "<a href=\"" + cell.href + "\" target=_blank>";
                
        if (imageLink) {
          cell.text
            += "<img src=\"" + imageLink +"\" border=0 "
            + "width=" + imageWidth + " "
            + "height=" + imageHeight + " alt=\"\">"
            + "</a>";
        }
                
        if (commentExists) {
          if (imageLink) {
            cell.text
              += "<br>";
          }
          cell.text
            += "<small>" + comment + "</small>";
        }
                
        if (imageLink == "") {
          cell.text
            += "</a>";
        }
        
        cell.text
          += "<br><font size=2>" + cell.replyNumber + "</font>";
        
        cell.className = lastCells [i].getAttribute ("class");
        
        text
          += escape (cell.threadId)
          + "," + escape (cell.replyNumber)
          + "," + escape (cell.href)
          + "," + escape (cell.text)
          + "," + escape (cell.className)
          + "\n";
                
        cells.push (cell);
      }
            
      var name = info.server + ":" + info.dir;
      arAkahukuCatalog.lastCells [name] = cells;
            
      var currentBoard = "";
      var newText = "";
            
      arAkahukuCatalog.lastCellsText.replace
      (/([^\n\r]+)[\r\n]+/g,
       function (matched, line) {
        if (line.indexOf (",") == -1) {
          currentBoard = line;
          if (currentBoard != name) {
            newText += line + "\n";
          }
        }
        else {
          if (currentBoard != name) {
            newText += line + "\n";
          }
        }
      });
      newText += name + "\n" + text;
            
      arAkahukuCatalog.lastCellsText = newText;
      arAkahukuFile.createFile (filename, newText);
            
    }
  },

  /**
   *  スレが立った時間帯を列ヘッダに表示
   */
  setCreatetimeHeaders : function (table) {
    var ctimes = new Array ();

    // 一次スキャン
    var tdLast = null;
    var skipToUnread = false;
    var nodes = table.getElementsByTagName ("tr");
    for (var i = 0; i < nodes.length; i ++) {
      var th = nodes [i].firstChild;
      if (!th || th.nodeName.toLowerCase () != "th") {
        Akahuku.debug.log ("no th; break");
        break;
      }
      // "未読"まで飛ばす
      if (th.textContent != "\u672A\u8AAD") { //"未読"
        if (!/^\s*$/.test (th.textContent)) { //"新規"や"既読"がある場合
          skipToUnread = true;
        }
        if (skipToUnread) continue;
      }
      skipToUnread = false;

      var tds = nodes [i].getElementsByTagName ("td");
      for (var j = 0; j < tds.length; j ++) {
        var td = tds [j];
        if (j != 0 || td.getAttribute ("__overflowed") == "true") {
          tdLast = td
          continue;
        }
        //後は行頭のみの処理

        var img = td.getElementsByTagName ("img") [0];
        if (!img && tdLast) {
          // 文字スレへの限定的な対処
          img = tdLast.getElementsByTagName ("img") [0];
          tdLast = null;
        }
        if (img && img.src && img.src.match (/(\d+)s\.jpg$/)) {
          ctimes [i] = parseInt (RegExp.$1);
        }
      }
    }

    if (ctimes.length == 0) {
      return;
    }

    // 時間帯表示を作る関数のリスト
    var stamperList = [
      { limit: 60*60*1000,
        proc: function (d) {
          return d.getMinutes () + "\u5206"; //"分"
        },
      },
      { limit: 24*60*60*1000,
        proc: function (d) {
          return d.getHours () + "\u6642"; //"時"
        },
      },
      { limit: 7*24*60*60*1000,
        _weekdays: "\u65E5\u6708\u706B\u6C34\u6728\u91D1\u571F",
          // "日月火水木金土"
        proc: function (d) {
          return "(" + this._weekdays [d.getDay ()] + ")";
        },
      },
      { limit: Infinity,//no more entry
        proc: function (d) {
          return (d.getMonth () + 1) + "/" + d.getDate ();
        },
      },
    ];
    var index = 0;
    var stamper = null;//stamperList [index];
    var now = Date.now ();
    var nodes = table.getElementsByTagName ("tr");
    for (var i = 0; i < nodes.length; i ++) {
      var tr = nodes [i], th = nodes [i].firstChild;
      var ctime = ctimes [i];
      if (!ctime)
        continue;
      if (!stamper) { //初回
        stamper = stamperList [index];
        // 初期表示は行間平均を参考に桁上げ
        var dt = now - ctimes [ctimes.length - 1];
        if (ctimes.length > 1) {
          dt = parseInt (dt / (ctimes.length - 1));
        }
        while (dt >= stamper.limit) {
          stamper = stamperList [++index];
        }
      }
      else if (now - ctime >= stamper.limit / 2) {
        stamper = stamperList [++index];
      }
      if (stamper) {
        // setRowHeaderText 同様に
        th.textContent = stamper.proc (new Date (ctime));
        th.className = "akahuku_header akahuku_header_info";
      }
    }
  },

  /**
   *  スレのレス増加数を列ヘッダに表示
   */
  setDeltaHeaders : function (table) {
    function getDeltaForTd () {
      var curReplyNumber 
        = parseInt (td.getAttribute ("__reply_number"));
      var oldReplyNumber 
        = parseInt (td.getAttribute ("__old_reply_number"));
      var delta = curReplyNumber || 0;
      if (td.getAttribute ("__is_new") != "true") {
        delta = oldReplyNumber >= 0 ? delta - oldReplyNumber : 0;
      }
      return delta;
    }
    var skipToUnread = false;
    var nodes = table.getElementsByTagName ("tr");
    for (var i = 0; i < nodes.length; i ++) {
      var th = nodes [i].firstChild;
      if (!th || th.nodeName.toLowerCase () != "th") {
        Akahuku.debug.log ("no th; break");
        break;
      }
      // "未読"まで飛ばす
      if (th.textContent != "\u672A\u8AAD") { //"未読"
        if (!/^\s*$/.test (th.textContent)) { //"新規"や"既読"がある場合
          skipToUnread = true;
        }
        if (skipToUnread) continue;
      }
      skipToUnread = false;
      var td = nodes [i].getElementsByTagName ("td")[0];
      if (td && td.getAttribute ("__overflowed") != "true") {
        var delta = getDeltaForTd (td);
        if (delta > 0) {
          th.textContent = "+" + delta;
          th.className = "akahuku_header akahuku_header_info";
        }
      }
    }
  },
    
  /**
   * 更新時刻を表示する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  setTimeStamp : function (targetDocument) {
    var d = new Date ();
    var stamp = "";
    var h = d.getHours ();
    var m = d.getMinutes ();
    var s = d.getSeconds ();
            
    if (h <= 9) {
      stamp += "0" + h;
    }
    else {
      stamp += h;
    }
    if (m <= 9) {
      stamp += ":0" + m;
    }
    else {
      stamp += ":" + m;
    }
    if (s <= 9) {
      stamp += ":0" + s;
    }
    else {
      stamp += ":" + s;
    }
            
    var timestamp
    = targetDocument.getElementById
    ("akahuku_catalog_reload_timestamp");
    if (timestamp) {
      if (timestamp.firstChild
          && timestamp.firstChild.nodeValue) {
        timestamp.setAttribute ("__old",
                                timestamp.firstChild.nodeValue);
      }
      arAkahukuDOM.setText (timestamp, "(" + stamp + ")");
    }
    timestamp
    = targetDocument.getElementById
    ("akahuku_catalog_reload_timestamp2");
    if (timestamp) {
      if (timestamp.firstChild
          && timestamp.firstChild.nodeValue) {
        timestamp.setAttribute ("__old",
                                timestamp.firstChild.nodeValue);
      }
      arAkahukuDOM.setText (timestamp, "(" + stamp + ")");
    }
  },
    
  /**
   * [最新に更新] ボタンのメッセージを設定する
   *
   * @param  String message
   *         メッセージ
   * @param  Boolean permanent
   *         一定時間で消すかどうか
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  setStatus : function (message, permanent, targetDocument) {
    var ids = ["akahuku_catalog_reload_status",
               "akahuku_catalog_reload_status2"];
        
    for (var i = 0; i < ids.length; i ++) {
      var node = targetDocument.getElementById (ids [i]);
      if (node) {
        arAkahukuDOM.setText (node, message);
      }
    }
        
    if (!permanent  && !arAkahukuCatalog.enableReloadStatusHold) {
      targetDocument.defaultView.setTimeout
      (function (message) {
        for (var i = 0; i < ids.length; i++) {
          var node = targetDocument.getElementById (ids [i]);
          if (node) {
            if (node.firstChild
                && node.firstChild.nodeValue == message) {
              arAkahukuDOM.setText (node, "");
            }
          }
        }
      }, 5000, message);
    }
  },
    
  /**
   * カタログの画像をクリックしたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onLinkClick : function (event) {
    var targetDocument = event.target.ownerDocument;
    var param
    = Akahuku.getDocumentParam (targetDocument).catalogpopup_param;
        
    var anchor = event.currentTarget;
    var nodes = anchor.getElementsByTagName ("img");
    if (nodes
        && nodes [0]) {
      var img = nodes [0];
      if (img.src.match (/(?:cat|thumb)\/([0-9]+)s\.jpg$/)) {
        var key = RegExp.$1;
        if (key != param.lastPopupKey) {
          param.lastPopupKey = key;
          arAkahukuPopup.addPopup
            (key,
             param,
             new arAkahukuCatalogPopupData (img));
          // ポップアップを新たに作った時だけクリックイベントを止める
          // (ポップアップ保持領域からのクリックイベント転送に対応)
          event.preventDefault ();
        }
      }
    }
  },
    
  /**
   * レス数のノードを取得する
   *
   * @param  HTMLTableCellElement tdElement
   *         セルの td 要素
   * @return HTMLElement 
   *         レス数のノード
   *         もしくは null
   */
  getReplyCountNode : function (tdElement) {
    var nodes;
        
    nodes = tdElement.getElementsByTagName ("font");
    for (var i = 0; i < nodes.length; i ++) {
      if (/^(?:\d+|\(\d+\))$/.test (nodes [i].textContent)) {
        return nodes [i];
      }
    }
    /* 避難所 patch */
    nodes = tdElement.getElementsByTagName ("span");
    for (var i = 0; i < nodes.length; i ++) {
      if (nodes [i].innerHTML.match (/^[0-9]+$/)) {
        return nodes [i];
      }
    }
        
    return null;
  },
    
  /**
   * 既読のセルかを判定する
   *
   * @param  HTMLElement element
   *         セルの要素
   * @return Boolean
   *         既読かどうか
   */
  isVisitedCell : function (element) {
    var visited = false;
    var anchor
      = arAkahukuDOM.getFirstElementByNames (element, "a");
    if (anchor) {
      if (arAkahukuCatalog.enableVisited) {
        // 履歴調査済みなので属性から判断していい
        return arAkahukuDOM.hasClassName (anchor, "akahuku_visited");
      }
    }
    return visited;
  },

  isOpenedCell : function (cell) {
    if (arAkahukuCatalog.enableObserveOpened) {
      return (cell.getAttribute ("__opened") === "true");
    }
    return false;
  },

  isOpened : function (uri) {
    var entries
      = Components.classes
      ["@mozilla.org/appshell/window-mediator;1"]
      .getService (Components.interfaces.nsIWindowMediator)
      .getEnumerator ("navigator:browser");
    while (entries.hasMoreElements ()) {
      var win = entries.getNext ();
      if ("Akahuku" in win
          && "hasDocumentParamForURI" in win.Akahuku) {
        if (win.Akahuku.hasDocumentParamForURI (uri)) {
          return true;
        }
      }
    }
    return false;
  },
    
  /**
   * コメントを表示可能な状態にフォーマットする
   *
   * @param  String comment
   *         スレのコメント
   * @return String
   *         フォーマット済みのコメント
   */
  formatComment : function (comment) {
    var text = comment.replace (/<[^>]*>/ig, "");
        
    text = arAkahukuConverter.unescapeEntity (text);
    text
    = text
    .replace (/\u2501+\(/, "\u2501(")
    .replace (/\)\u2501+/, ")\u2501");
        
    var i = 0;
    var length = 0;
    while (length < arAkahukuCatalog.sidebarCommentLength
           && i < text.length) {
      var code = text.charCodeAt (i);
      if (code >= 0x0020
          && code <= 0x007d) {
        /* 半角英数 */
        length += 0.5;
      }
      else if (code == 0x203e) {
        /* チルダ */
        length += 0.5;
      }
      else if (code >= 0xff61
               && code <= 0xff9f) {
        /* 半角カナ */
        length += 0.5;
      }
      else {
        length += 1.0;
      }
      i ++;
    }
        
    text = text.substr (0, i);
        
    text = arAkahukuConverter.escapeEntity (text);
        
    return text;
  },
    
  /**
   * コメント用のノードを作成する
   * (元コメントを消去して空のノードを適当な場所へ追加)
   *
   * @param  HTMLTableCellElement tdElement
   *         セルの td 要素
   * @return HTMLElement
   *         コメント用のノード
   */
  createCommentNode : function (tdElement) {
    var targetDocument = tdElement.ownerDocument;
    var node = null;
        
    var nodes = tdElement.getElementsByTagName ("small");
    if (nodes && nodes [0]
        && !("className" in nodes [0]
             && nodes [0].className == "aima_aimani_generated")) {
      if (nodes [0].nextSibling
          && nodes [0].nextSibling.nodeName.toLowerCase () == "br") {
        nodes [0].parentNode.removeChild (nodes [0].nextSibling);
      }
      nodes [0].parentNode.removeChild (nodes [0]);
    }
        
    node = targetDocument.createElement ("div");
    node.className = "akahuku_comment";
    node.style.maxWidth = "50px";
    node.style.overflow = "hidden";
    node.style.fontSize = "8pt";
    var font
    = arAkahukuCatalog.getReplyCountNode (tdElement);
    if (font) {
      if (font.parentNode.nodeName.toLowerCase () == "a") {
        var anchor = font.parentNode;
        anchor.parentNode.insertBefore (node, anchor);
      }
      else {
        font.parentNode.insertBefore (node, font);
      }
    }
    else {
      tdElement.appendChild (node);
    }
        
    nodes = tdElement.getElementsByTagName ("img");
    if (nodes.length > 0) {
      /* 画像があるのでそのまま */
      return node;
    }
    else {
      /* 画像がないのでリンクにする */
      nodes = tdElement.getElementsByTagName ("a");
      if (nodes && nodes [0] && nodes [0].hasAttribute ("href")) {
        var anchor = nodes [0].cloneNode (false);
        node.appendChild (anchor);
                    
        if (nodes [0].nextSibling
            && nodes [0].nextSibling.nodeName.toLowerCase ()
            == "#text") {
          nodes [0].parentNode.removeChild
            (nodes [0].nextSibling);
        }
        if (nodes [0].nextSibling
            && nodes [0].nextSibling.nodeName.toLowerCase ()
            == "br") {
          nodes [0].parentNode.removeChild
            (nodes [0].nextSibling);
        }
        nodes [0].parentNode.removeChild
          (nodes [0]);
                    
        return anchor;
      }
            
      return node;
    }
  },
    
  /**
   * セルの内容を修正する
   *
   * @param  HTMLTableCellElement tdElement
   *         セルの td 要素
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  updateCell : function (tdElement, info) {
    var targetDocument = tdElement.ownerDocument;
        
    var anchor = tdElement.getElementsByTagName ("a");
    if (anchor && anchor [0]) {
      anchor = anchor [0];
    }
    else {
      anchor = null;
    }
        
    if (anchor) {
      if (info.isFutaba
          && info.server != "cgi") {
        if (anchor.href.match (/futaba\.php\?res=([0-9]+)$/)) {
          /* php を呼び出すアドレスを変更する */
          anchor.href
          = anchor.href.replace
          (/futaba\.php\?res=([0-9]+)$/,
           "res/$1.htm");
          /* futaba: ふたば固有の問題なので外部には対応しない */
        }
      }
            
      var replaced = false;
      var num = tdElement.getAttribute ("__thread_id");
      var name = info.server + "_" + info.dir;
            
      if (arAkahukuCatalog.enableSidebar
          && arAkahukuCatalog.enableSidebarComment) {
        if (name in arAkahukuSidebar.boards) {
          var thread
            = arAkahukuSidebar.boards [name].getThread
            (num);
          if (thread && thread.comment) {
            var node
              = arAkahukuCatalog.createCommentNode (tdElement);
            replaced = true;
            var text
              = arAkahukuCatalog.formatComment (thread.comment);
            node.innerHTML = text;
                        
            if (arAkahukuLink.enableHideTrolls
                && !arAkahukuLink.enableHideTrollsNoCat) {
              arAkahukuLink.applyHideTrollsCore (targetDocument,
                                                 node);
            }
          }
        }
      }
            
      if (!replaced) {
        var nodes = tdElement.getElementsByTagName ("small");
        if (nodes && nodes [0]
            && !("className" in nodes [0]
                 && nodes [0].className == "aima_aimani_generated")) {
          nodes [0].className = "akahuku_native_comment";
        }
      }
            
      if (arAkahukuCatalog.enableClickable
          && anchor.innerHTML
          .match (/^(<small>)?[ \t\u3000\xa0]*(<\/small>)?$/i)) {
        anchor.appendChild (targetDocument.createElement
                            ("br"));
        anchor.appendChild (targetDocument.createTextNode
                            ("(\u7A7A\u767D)"));
        anchor.style.fontSize = "9pt";
        anchor.style.color = "red";
      }
            
      if (arAkahukuCatalog.enableZoomClick) {
        if (anchor.getElementsByTagName ("img").length > 0) {
          anchor.addEventListener
          ("click",
           function () {
            arAkahukuCatalog.onLinkClick (arguments [0]);
          }, true);
        }
      }
    }
        
    if (arAkahukuCatalog.enableVisited) {
      var font = null;
      var nodes, node, nextNode;
            
      font = arAkahukuCatalog.getReplyCountNode (tdElement);
      if (font) {
        nodes = tdElement.getElementsByTagName ("a");
        if (nodes && nodes [0] && nodes [0].hasAttribute ("href")) {
          node = nodes [0].cloneNode (false);
          font.parentNode.insertBefore (node, font);
          font.parentNode.removeChild (font);
          node.appendChild (font);
          try {
            if ("style" in node) {
              node.style.color = "#800000";
              node.style.fontWeight = "normal";
            }
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
      }
    }
  },
    
  /**
   * 動的に変わるセルの内容を修正する
   *
   * @param  HTMLTableCellElement tdElement
   *         セルの td 要素
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   * @param  Number latestNum
   *         最新の番号
   */
  updateCellInfo : function (tdElement, info, latestNum) {
    var targetDocument = tdElement.ownerDocument;
        
    if (arAkahukuCatalog.enableRed) {
      arAkahukuCatalog.updateCellAge (tdElement, info, latestNum);
      arAkahukuCatalog.updateCellPreserve (tdElement, info);
    }
        
    if (arAkahukuCatalog.enableSidebar
        && arAkahukuCatalog.enableSidebarComment) {
      var name = info.server + "_" + info.dir;
      if (name in arAkahukuSidebar.boards) {
        var thread
          = arAkahukuSidebar.boards [name].getThread
          (tdElement.getAttribute ("__thread_id"));
        if (thread && thread.comment) {
          var node = 
            arAkahukuDOM.getFirstElementByNames
            (tdElement, "div", "akahuku_comment");
          if (node) {
            if (node.firstChild
                && node.firstChild.nodeName.toLowerCase ()
                == "a") {
              node = node.firstChild;
            }
          }
          else {
            node = arAkahukuCatalog.createCommentNode (tdElement);
          }
                    
          if (node) {
            var text
              = arAkahukuCatalog.formatComment (thread.comment);
            node.innerHTML = text;
            if (arAkahukuLink.enableHideTrolls
                && !arAkahukuLink.enableHideTrollsNoCat) {
              arAkahukuLink.applyHideTrollsCore (targetDocument,
                                                 node);
            }
          }
        }
      }
    }
  },

  /**
   * セルのスレ年齢情報を更新する
   */
  updateCellAge : function (tdElement, info, latestNum) {
    var name = info.server + ":" + info.dir;
    var num = arAkahukuCatalog._getCellThreadId (tdElement);
    if (!num) {
      return;
    }
    latestNum
      = Math.max
      (arAkahukuBoard.getNewestNum (name) || 0,
       latestNum || 0);
    if (!(latestNum >= num)) {
      Akahuku.debug.warn
        ("arAkahukuCatalog.updateCellAgae aborted; "
         + "latest No.(" + latestNum + ")"
         + "must be >= thread's No.(" + num + ")");
      return;
    }
    var oldAge = parseInt (tdElement.getAttribute ("__age"));
    if (oldAge == -1
        || !arAkahukuBoard.knows (name)) {
      return;
    }
    var max = arAkahukuBoard.getMaxNum (name);
    var age = parseInt ((latestNum - num) * 10 / max);
    if (age != oldAge) {
      tdElement.setAttribute ("__age", age);
      if (age > 10) {
        tdElement.setAttribute ("__age", 10);
      }
    }
  },

  /**
   * セルの最低保持時間フラグを更新
   */
  updateCellPreserve : function (tdElement, info) {
    var preserveMin = arAkahukuBoard.getPreserveMin (info);
    if (!(preserveMin > 0)) {
      return; // this board has no preserveMin
    }
    var num = arAkahukuCatalog._getCellThreadId (tdElement);
    var ctime = arAkahukuCatalog._getCellCreateTime (tdElement);
    if (!num || ctime <= 0) {
      return;
    }
    var now = Date.now ();
    var reddenMin = 3; // 期限間近のあと何分で赤字化するか
    if (now < ctime + 60*1000*(preserveMin - reddenMin)) {
      tdElement.setAttribute ("__preserved", 1);
    }
    else if (now < ctime + 60*1000*preserveMin) {
      // 最低保持期限間近
      tdElement.setAttribute ("__preserved", 0);
    }
    else { // 最低保持期限切れ
      tdElement.removeAttribute ("__preserved");
    }
  },

  _getCellThreadId : function (tdElement) {
    var num = parseInt (tdElement.getAttribute ("__thread_id"));
    if (!num) {
      var anchor = arAkahukuDOM.getFirstElementByNames (tdElement, "a");
      if (anchor) {
        if (anchor.href.match (/res[\/=]([0-9]+)/)
            || anchor.href.match (/2\/([0-9]+)/)
            || anchor.href.match (/b\/([0-9]+)/)) {
          num = parseInt (RegExp.$1);
        }
      }
    }
    return num;
  },

  _getCellCreateTime : function (td) {
    var ctime = -1;
    var img = td.getElementsByTagName ("img") [0];
    if (img && img.src && img.src.match (/(\d+)s\.jpg$/i)) {
      // 画像ファイル名の数字は投稿した日時に対応する
      ctime = parseInt (RegExp.$1);
    }
    return ctime;
  },

  /**
   * レス数(増加数)の表示を更新する 
   *
   * @param  HTMLTableCellElement td
   *         セルの td 要素
   */
  updateCellReplyNum : function (td)
  {
    var newReplyNum
      = parseInt (td.getAttribute ("__reply_number"));
    if (!(newReplyNum >= 0)) {
      // レス数取得ミス時は更新できない
      return;
    }

    var fonts = td.getElementsByTagName ("font");
    if (fonts && fonts.length > 0) {
      var font = fonts [fonts.length - 1];
      var text = font.textContent || "";
      if (text [0] == "(") { // ニュース表 patch
        var newtext = text.replace (/\d+/, newReplyNum);
        if (text != newtext) {
          arAkahukuDOM.setText (font, newtext);
        }
      }
      else if (text != newReplyNum) {
        arAkahukuDOM.setText (font, newReplyNum);
      }
    }
    /* 避難所 patch */
    else {
      fonts = td.getElementsByTagName ("span");
      for (var j = 0; j < fonts.length; j ++) {
        if ("className" in fonts [j]
            && fonts [j].className == "s14") {
          arAkahukuDOM.setText (fonts [j], newReplyNum);
        }
      }
    }

    // レス増加数 & new/up 表示
    var deltaText = null, className = null;
    if (arAkahukuCatalog.enableReloadReplyNumberDelta
        && !(td.getAttribute ("__overflowed") === "true")) {
      var oldReplyNum
        = parseInt (td.getAttribute ("__old_reply_number"));
      if (oldReplyNum >= 0) {
        var delta = newReplyNum - oldReplyNum;
        if (delta != 0) {
          deltaText = (delta > 0 ? "+" : "") + delta;
          className = "akahuku_cell akahuku_catalog_delta";
        }
      }
      else if (td.getAttribute ("__is_new") === "true") {
        className = "akahuku_cell";
        deltaText = "new";
      }
      else if (td.getAttribute ("__is_up") === "true") {
        className = "akahuku_cell";
        deltaText = "up";
      }
    }
    var div = td.getElementsByTagName ("div") [0];
    if (div && !arAkahukuDOM.hasClassName (div, "akahuku_cell")) {
      // akahuku_comment などの div を間違って消さないように
      div = null;
    }
    if (deltaText && className) {
      if (!div) {
        if (td.ownerDocument) {
          div = td.ownerDocument.createElement ("div");
          td.insertBefore (div, td.firstChild);
        }
      }
      if (div) {
        if (td.getElementsByTagName ("br").length == 0) {
          // コメント位置:右 (含ニュース表)
          className += " akahuku_cell_horizontal";
        }
        arAkahukuDOM.setText (div, deltaText);
        div.className = className;
      }
    }
    else if (div) {
      div.parentNode.removeChild (div);
    }
  },

  getCatalogTable : function (targetDocument) {
    var table = targetDocument.getElementsByTagName ("table") [1];
    if (!table) {
      /* 避難所 patch */
      table = targetDocument.getElementsByTagName ("table") [0];
    }
    return table;
  },

  getThreadCell : function (targetDocument, threadId) {
    var table = arAkahukuCatalog.getCatalogTable (targetDocument);
    if (!table) {
      return null;
    }
    var nodes = table.getElementsByTagName ("td");
    for (var i = 0; i < nodes.length; i ++) {
      if (nodes [i].getAttribute ("__thread_id")
          == threadId) {
        return nodes [i];
      }
    }
    return null;
  },

  /**
   * スレッド情報を元にカタログを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         スレッドの情報
   */
  updateByThreadInfo : function (targetDocument, info) {
    var td
      = arAkahukuCatalog.getThreadCell
      (targetDocument, info.threadNumber);
    if (!td) {
      return;
    }

    // レス数を反映させる
    if (arAkahukuCatalog.enableObserveReplyNum) {
      var newReplyNum = info.replyCount;
      var curReplyNum
        = parseInt (td.getAttribute ("__reply_number")) || -1;
      if (newReplyNum > 0 && newReplyNum > curReplyNum) {
        td.setAttribute ("__reply_number", newReplyNum);
        // 必要ならレス増加数を表示可能に (増加数はリセットしない)
        if (!td.hasAttribute ("__old_reply_number")) {
          td.setAttribute ("__old_reply_number", curReplyNum);
        }
        arAkahukuCatalog.updateCellReplyNum (td);
      }
    }

    if (info.isNotFound) {
      td.setAttribute ("__age", "-1");
      td.setAttribute ("__overflowed", "true");
    }

    if (arAkahukuCatalog.enableObserveOpened) {
      arAkahukuCatalog.setCellOpened (td, true);
    }
  },
    
  /**
   * セルをソートする
   *
   * @param Array mergedItems
   *        [arAkahukuMergeItem マージ用のデータ, ...]
   * @param String reorderId
   *        ソートの方法
   *          "akahuku_catalog_reorder_default"
   *          "akahuku_catalog_reorder_page"
   *          "akahuku_catalog_reorder_spec"
   *          "akahuku_catalog_reorder_createtime"
   *          "" : "akahuku_catalog_reorder_default"
   * @param  arAkahukuCatalogParam param
   *         カタログ管理データ
   *           null の場合 target から取得する
   */
  reorder : function (mergedItems, reorderId, param) {
    if (reorderId == "") {
      reorderId = param.order;
      // 更新時 mergedItems は index 順と期待していい
      var alreadySortedByIndex = true;
    }
    var columns = 10;

    // index順以外の共通評価関数
    function compareForReorderToWidth (x, y) {
      if (arAkahukuCatalog.enableReorderNew) {
        if (x.isNew && !y.isNew) {
          return -1;
        }
        else if (!x.isNew && y.isNew) {
          return 1;
        }
      }
      if (arAkahukuCatalog.enableReorderVisited) {
        if ((x.visited || x.opened) && !(y.visited || y.opened)) {
          return -1;
        }
        else if (!(x.visited || x.opened) && (y.visited || y.opened)) {
          return 1;
        }
      }
      // 更新前の残り(overflowed)は既読・未読内で下へ
      if (x.overflowed && !y.overflowed) {
        return +1;
      }
      else if (!x.overflowed && y.overflowed) {
        return -1;
      }
      else if (x.overflowed && y.overflowed) {
        // overflowed 同士では
        // 指定されたソート順によらずカタログ(通常)順
        return x.index - y.index;
      }
      return 0;
    }
    if (!arAkahukuCatalog.enableReloadLeftBefore
        && !arAkahukuCatalog.enableReorderNew
        && !arAkahukuCatalog.enableReorderVisited) {
      compareForReorderToWidth = function () {return 0};
    }
        
    switch (reorderId) {
      case "akahuku_catalog_reorder_default":
        columns = param.defaultColumns;
        if (alreadySortedByIndex) break;
        mergedItems.sort (function (x, y) {
            return x.index - y.index;
          });
        break;
      case "akahuku_catalog_reorder_page":
        if (alreadySortedByIndex) break;
        mergedItems.sort (function (x, y) {
            return x.index - y.index;
          });
        break;
      case "akahuku_catalog_reorder_spec":
        columns = arAkahukuCatalog.reorderWidth;
        if (columns == 0) {
          columns = param.defaultColumns;
        }
        mergedItems.sort (function (x, y) {
            var ret = compareForReorderToWidth (x, y);
            if (ret != 0) return ret;
            return x.index - y.index;
          });
        break;
      case "akahuku_catalog_reorder_createtime":
        columns = arAkahukuCatalog.reorderWidth;
        if (columns == 0) {
          columns = param.defaultColumns;
        }
        mergedItems.sort (function (x, y) {
            var ret = compareForReorderToWidth (x, y);
            if (ret != 0) return ret;
            return y.threadId - x.threadId;
          });
        break;
      case "akahuku_catalog_reorder_delta":
        columns = arAkahukuCatalog.reorderWidth;
        if (columns == 0) {
          columns = param.defaultColumns;
        }
        mergedItems.sort (function (x, y) {
            var ret = compareForReorderToWidth (x, y);
            if (ret != 0) return ret;
            var deltadiff = y.getDelta () - x.getDelta();
            if (deltadiff != 0) {
              return deltadiff;
            }
            return x.index - y.index;
          });
        break;
    }
        
    return columns;
  },
    
  /**
   * ソートボタンを押したイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onReorderClick : function (event) {
    event.preventDefault ();
        
    var target = event.explicitOriginalTarget;
        
    if (target.nodeName.toLowerCase () != "a") {
      target = arAkahukuDOM.findParentNode (target, "a");
    }
        
    arAkahukuCatalog.onReorderClickCore (target, null);
  },
    
  /**
   * ソートボタンを押したイベント
   *
   * @param  HTMLAnchorElement target
   *         対象の a 要素
   * @param  arAkahukuCatalogParam param
   *         カタログ管理データ
   *           null の場合 target から取得する
   */
  onReorderClickCore : function (target, param) {
    var targetDocument = target.ownerDocument;
    if (param == null) {
      param
        = Akahuku.getDocumentParam (targetDocument)
        .catalog_param;
    }
    var target_id = target.id;
        
    var newestId = 0;
        
    if (/^akahuku_catalog_reorder_save\d?$/.test (target_id)) {
      // 現在の並び順を記憶
      var type = arAkahukuCatalog.REORDER_TYPES [param.order];
      arAkahukuConfig
        .setIntPref ("akahuku.catalog.reorder.save.type", type);
      arAkahukuCatalog.reorderSaveType = type;
      arAkahukuCatalog.updateReorderIndicator (targetDocument, param);
      return;
    }

    target_id = target_id.replace (/\d$/, "");
        
    var count = 0;
    var visited = false;
    var opened = false;
    var nums = Object ();
        
    param.historyCallbacks = new arAkahukuMergeItemCallbackList ();

    /**
     * 古いテーブルのマージ用のデータを取得する
     *
     * @return Array
     *         [arAkahukuMergeItem マージ用のデータ, ...]
     */
    function getMergedItems () {
      var mergedItems = new Array ();
      var oldCells = oldTable.getElementsByTagName ("td");
      for (var i = 0; i < oldCells.length; i ++) {
        if (oldCells [i].style.display == "none") {
          continue;
        }
                
        visited = false;
        opened = false;
                
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [i]);
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          opened = arAkahukuCatalog.isOpenedCell (oldCells [i]);
        }
                
        count ++;
        var threadId
          = parseInt (oldCells [i].getAttribute ("__thread_id"));
        nums [threadId] = true;
        if (newestId < threadId) {
          newestId = threadId;
        }
                
        mergedItems.push
          (new arAkahukuMergeItem
           (oldCells [i],
            "",
            oldCells [i].getAttribute ("__original_index"),
            oldCells [i].getAttribute ("__thread_id"),
            oldCells [i].getAttribute ("__reply_number"),
            oldCells [i].getAttribute ("__old_reply_number"), // ソートではキープ
            oldCells [i].getAttribute ("class"),
            {visited: visited, opened: opened,
             isNew: oldCells [i].getAttribute ("__is_new") == "true",
             overflowed: oldCells [i].getAttribute ("__overflowed") == "true",
            }));

        if (arAkahukuCatalog.enableReorderVisited) {
          try {
            var anchor
              = arAkahukuDOM.getFirstElementByNames (oldCells [i], "a");
            arAkahukuCompat.AsyncHistory.isURIVisited
              (arAkahukuUtil.newURIViaNode (anchor.href, anchor),
               param.historyCallbacks.createVisitedCallback (mergedItems [mergedItems.length-1]));
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
      }
      return mergedItems;
    }
        
    var oldTable = targetDocument.getElementsByTagName ("table") [1];
    if (!oldTable) {
      /* 避難所 patch */
      oldTable = targetDocument.getElementsByTagName ("table") [0];
      if (!oldTable) {
        return;
      }
    }
        
    var mergedItems = getMergedItems ();
        
    var info
    = Akahuku.getDocumentParam (targetDocument)
    .location_info;
        
    var name;
    name = info.server + ":" + info.dir;
    if (arAkahukuCatalog.enableReloadLeftBeforeSave
        && info.isFutaba
        && !param.addedLastCells
        && name in arAkahukuCatalog.lastCells) {
      /* 前回の状態を追加 */
      param.addedLastCells = true;
            
      var max;
      if (arAkahukuBoard.knows (name)) {
        max = arAkahukuBoard.getMaxNum (name);
      }
      else {
        max = 10000;
      }
            
      opened = false;
      var cells = arAkahukuCatalog.lastCells [name];
      for (var i = 0; i < cells.length; i ++) {
        var cell = cells [i];
        if (cell.threadId in nums) {
          continue;
        }
        if (cell.threadId < newestId - max) {
          continue;
        }

        var uri = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableObserveOpened) {
          try {
            uri = arAkahukuUtil.newURIViaNode (cell.href, targetDocument);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
        if (arAkahukuCatalog.enableObserveOpened && uri) {
          opened = arAkahukuCatalog.isOpened (uri);
        }
            
        mergedItems.push
          (new arAkahukuMergeItem
           (null,
            cell.text,
            count ++,
            cell.threadId,
            cell.replyNumber,
            cell.replyNumber,
            cell.className,
            {visited: false, //履歴は必要なら後で調べる
             isNew: false, overflowed: true,
             opened: opened,
            }));

        if (arAkahukuCatalog.enableReorderVisited && uri) {
          arAkahukuCompat.AsyncHistory.isURIVisited
            (uri, param.historyCallbacks.createVisitedCallback
             (mergedItems [mergedItems.length-1]));
        }
      }
    }
        
    if (mergedItems.length > 0) {
      if (param.historyCallbacks.count > 0) {
        param.historyCallbacks.asyncWaitRequests
          (function () {
            param.historyCallbacks = null;
            arAkahukuCatalog._onReorderClickCore2
              (targetDocument, param, oldTable, mergedItems, target_id);
          });
      }
      else {
        param.historyCallbacks = null;
        arAkahukuCatalog._onReorderClickCore2
          (targetDocument, param, oldTable, mergedItems, target_id);
      }
    }
  },
  _onReorderClickCore2 : function (targetDocument, param, oldTable, mergedItems, target_id) {
    if (mergedItems.length > 0) {
      param.columns
      = arAkahukuCatalog.reorder (mergedItems,
                                  target_id,
                                  param);
      param.order = target_id;
      arAkahukuCatalog.replaceTable (oldTable,
                                     mergedItems,
                                     targetDocument,
                                     param);
            
      arAkahukuCatalog.updateReorderIndicator (targetDocument, param);
    }
  },

  /**
   * 現在のソート順、ソートボタンの状態を更新する
   */
  updateReorderIndicator : function (targetDocument, param)
  {
    var anchor;
    var indicator
    = targetDocument.getElementById ("akahuku_catalog_mode_indicator");
        
    var columns = arAkahukuCatalog.reorderWidth;
    if (columns == 0) {
      columns = param.defaultColumns;
    }

    var appends = ["", "2"];
    for (var id in arAkahukuCatalog.REORDER_TYPES) {
      for (var i = 0; i < appends.length; i ++) {
        anchor = targetDocument.getElementById (id + appends [i]);
        if (!anchor) {
          continue;
        }
        var span
          = anchor.getElementsByClassName
          ("akahuku_catalog_reorder_width") [0];
        if (span) {
          arAkahukuDOM.setText (span, columns);
        }
        if (param.order === id) {
          if (indicator) {
            if (id === "akahuku_catalog_reorder_default") {
              // "通常" は表示しない
              arAkahukuDOM.setText (indicator, "");
            }
            else {
              arAkahukuDOM.setText
                (indicator, "[" + anchor.textContent + "]");
            }
            indicator = null;
          }
          arAkahukuDOM.addClassName
            (anchor, "akahuku_catalog_current_reorder");
        }
        else {
          arAkahukuDOM.removeClassName
            (anchor, "akahuku_catalog_current_reorder");
        }
      }
    }
  },
    
  /**
   * [最新に更新] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onReloadClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuCatalog.reloadCore (targetDocument, event.target);
        
    event.preventDefault ();
  },
    
  /**
   * カタログを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  update : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument).catalog_param;
        
    var param2
    = Akahuku.getDocumentParam (targetDocument)
    .catalogpopup_param;
        
    var oldTable = targetDocument.getElementsByTagName ("table") [1];
    if (!oldTable) {
      /* 避難所 patch */
      oldTable = targetDocument.getElementsByTagName ("table") [0];
      if (!oldTable) {
        return;
      }
    }
        
    /* ポップアップを消す */
    if (param2) {
      arAkahukuPopup.removeActivePopups (param2);
    }
                            
    var responseText = param.responseText;
        
    if (responseText != "") {
      var info
        = Akahuku.getDocumentParam (targetDocument)
        .location_info;
      if (info.isCatalog && info.isTatelog) {
        /* タテログ */
                
        var node;
        node = targetDocument.getElementById ("reload");
        if (node.style.display == "inline") {
          node.style.display = "none";
                    
          if (responseText.match (/var waitSecs = ([0-9]+)/)) {
            param.tatelogSec = parseInt (RegExp.$1);
          }
                    
          node = targetDocument.getElementById ("remains");
          node.innerHTML
            = "\u3042\u3068 " + param.tatelogSec + " \u79D2";
          node.style.display = "";
                    
          targetDocument.defaultView.setTimeout (function () {
            arAkahukuCatalog.tatelogTimer (targetDocument);
          }, 1000);
        }
      }
            
      /* 広告に反映する */
      arAkahukuReload.updateAd (responseText,
                                targetDocument);
            
      param.historyCallbacks = new arAkahukuMergeItemCallbackList ();

      var mergedItems
        = arAkahukuCatalog.mergeCellNodes (targetDocument,
                                           responseText);
      if (mergedItems.length > 0) {
        if (param.historyCallbacks.count > 0) {
          arAkahukuCatalog.setStatus
            ("\u66F4\u65B0\u4E2D (\u5C65\u6B74)", // "更新中 (履歴)"
             true, targetDocument);
          // asyncWaitRequests が長時間たっても終了しないなら強制終了
          var asyncWaitMonitorTimerID =
            targetDocument.defaultView
            .setTimeout (function () {
              param.historyCallbacks.abort ();
              arAkahukuCatalog.setStatus // "更新中 (履歴 timeout)"
              ("\u66F4\u65B0\u4E2D (\u5C65\u6B74 timeout)",
               true, targetDocument);
              targetDocument.defaultView.setTimeout (function () {
                // 一時停止した後に更新を継続
                param.historyCallbacks.callback ();
              }, 500);
            }, 5000);
          param.historyCallbacks.asyncWaitRequests
            (function () {
              targetDocument.defaultView
              .clearTimeout (asyncWaitMonitorTimerID);
              arAkahukuCatalog.setStatus // "更新中"
                ("\u66F4\u65B0\u4E2D", true, targetDocument);
              param.historyCallbacks = null;
              arAkahukuCatalog._update2
                (targetDocument, oldTable, mergedItems, param);
            });
        }
        else {
          param.historyCallbacks = null;
          arAkahukuCatalog._update2
            (targetDocument, oldTable, mergedItems, param);
        }
      }
      else {
        // "満員です"
        arAkahukuCatalog.setStatus ("\u6E80\u54E1\u3067\u3059",
                                    false, targetDocument);
        arAkahukuSound.playCatalogReload ();
      }
    }
    else {
      // "ロード失敗"
      arAkahukuCatalog.setStatus ("\u30ED\u30FC\u30C9\u5931\u6557",
                                  false, targetDocument);
    }
        
    if (arAkahukuCatalog.enableReloadTimestamp) {
      arAkahukuCatalog.setTimeStamp (targetDocument);
    }
    
    param.reloadChannel = null;
        
    param.responseText = "";
    param.stream = null;
  },
    
  _update2 : function (targetDocument, oldTable, mergedItems, param)
  {
    param.columns
      = arAkahukuCatalog.reorder (mergedItems, "",param);
    arAkahukuCatalog.replaceTable
      (oldTable, mergedItems, targetDocument, param);
    arAkahukuCatalog.setStatus
      ("\u5B8C\u4E86\u3057\u307E\u3057\u305F", //"完了しました"
       false, targetDocument);

    var tmpNode = targetDocument.getElementById ("akahuku_catalog_reload_undo");
    if (tmpNode) {
      tmpNode.style.display = "";
    }
    tmpNode = targetDocument.getElementById ("akahuku_catalog_reload_undo2");
    if (tmpNode) {
      tmpNode.style.display = "";
    }
    tmpNode = targetDocument.getElementById ("akahuku_catalog_reload_redo");
    if (tmpNode) {
      tmpNode.style.display = "none";
    }
    tmpNode = targetDocument.getElementById ("akahuku_catalog_reload_redo2");
    if (tmpNode) {
      tmpNode.style.display = "none";
    }

    var info
      = Akahuku.getDocumentParam (targetDocument)
      .location_info;
    arAkahukuSidebar.apply (targetDocument, info);

    arAkahukuSound.playCatalogReload ();
  },

  /**
   * タテログ用のタイマ
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  tatelogTimer : function (targetDocument) {
    try {
      var param
      = Akahuku.getDocumentParam (targetDocument).catalog_param;
            
      var remains
      = targetDocument.getElementById ("remains");
        
      if (param.tatelogSec > 0) {
        remains.innerHTML
          = "\u3042\u3068 " + param.tatelogSec + " \u79D2";
        param.tatelogSec --;
                
        targetDocument.defaultView.setTimeout (function () {
          arAkahukuCatalog.tatelogTimer (targetDocument);
        }, 1000);
      }
      else {
        remains.innerHTML = "\uFF01";
                
        if (targetDocument.getElementById ("reload")) {
          targetDocument.getElementById ("reload").style.display
            = "inline";
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
    
    
  /**
   * テーブルの内容を更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String responseText
   *         カタログの HTML
   * @return Array
   *         マージした結果
   */
  mergeCellNodes : function (targetDocument, responseText) {
    var param
    = Akahuku.getDocumentParam (targetDocument).catalog_param;
        
    var beginTag = "<td";
    var endTag = "</td>";
    var beginPos = responseText.indexOf ("<table border=1 align=center>");
    var endPos = 0;
    var mergedItems = new Array ();
    var oldCells = new Array ();
    var count = 0;
    var i;
        
    var nums = Object ();
    var newestId = 0;
            
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var oldTable = targetDocument.getElementsByTagName ("table") [1];
    if (!oldTable) {
      /* 避難所 patch */
      oldTable = targetDocument.getElementsByTagName ("table") [0];
    }
        
    param.oldTable = oldTable.cloneNode (true);
    param.oldOrder = param.order;
    param.oldLatestThread = param.latestThread;
    if (arAkahukuCatalog.enableZoomClick) {
      var anchors = param.oldTable.getElementsByTagName ("a");
      for (i = 0; i < anchors.length; i ++) {
        if (anchors [i].getElementsByTagName ("img").length > 0) {
          anchors [i].addEventListener
            ("click",
             function () {
              arAkahukuCatalog.onLinkClick (arguments [0]);
            }, true);
        }
      }
    }
        
    var nodes;
        
    for (i = 0, nodes = oldTable.getElementsByTagName ("td");
         i < nodes.length; i ++) {
      oldCells [nodes [i].getAttribute ("__thread_id")] = nodes [i];
    }
        
    for (beginPos = responseText.indexOf (beginTag, beginPos);
         beginPos >= 0;
         beginPos = responseText.indexOf (beginTag, endPos)) {
      var beginPos2 = responseText.indexOf (">", beginPos);
      if (beginPos2 < 0) {
        break;
      }
      
      endPos = responseText.indexOf (endTag, beginPos);
      if (endPos < 0) {
        break;
      }
      
      var className = "";
      var currentTdAttributes
      = responseText.substr (beginPos + beginTag.length,
                             beginPos2 - (beginPos + beginTag.length));
      
      if (currentTdAttributes
          && currentTdAttributes.match (/class=[\"\']?[^\"\']*[\"\']?/)) {
        className = RegExp.$1;
      }
      
      var currentTdText
      = responseText.substr (beginPos2 + 1,
                             endPos - (beginPos2 + 1));
            
      /* 避難所 patch */
      if (info.isMonaca) {
        if (targetDocument.characterSet) {
          currentTdText
            = arAkahukuConverter.convert (currentTdText, targetDocument.characterSet);
        }
        else {
          currentTdText
            = arAkahukuConverter.convertFromEUC (currentTdText, "");
        }
      }
      else {
        currentTdText
        = arAkahukuConverter.convertFromSJIS (currentTdText, "");
      }
            
      if (currentTdText.match (/amazon.co.jp/)) {
        continue;
      }
            
      var replyNumber = null; //検出失敗の値
      if (currentTdText.match (/<font[^>]*>(?:(\d+)|\((\d+)\))<\/font>/i)) {
        replyNumber = RegExp.$1 || RegExp.$2;
      }
      /* 避難所 patch */
      else if (currentTdText.match (/<span[^>]*>([0-9]+)<\/span>/i)) {
        replyNumber = RegExp.$1;
      }
            
      var threadId = 0;
      if (currentTdText.match (/res[\/=]([0-9]+)/)
          || currentTdText.match (/2\/([0-9]+)/)
          || currentTdText.match (/b\/([0-9]+)/)) {
        threadId = RegExp.$1;
      }
      if (threadId == 0) {
        continue;
      }
                
      var visited = false;
      var opened = false;
                
      if (oldCells [threadId]) {
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [threadId]);
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          opened = arAkahukuCatalog.isOpenedCell (oldCells [threadId]);
        }
                
        nums [parseInt (threadId)] = true;
        if (newestId < parseInt (threadId)) {
          newestId = parseInt (threadId);
        }
                
        mergedItems.push 
          (new arAkahukuMergeItem
           (oldCells [threadId],
            "",
            count ++,
            threadId,
            replyNumber,
            oldCells [threadId].getAttribute ("__reply_number"),
            oldCells [threadId].getAttribute ("class"),
            {visited: visited, opened: opened,
             isNew: false, overflowed: false,
            }));
                
        if (arAkahukuCatalog.enableReorderVisited) {
          try {
            var anchor
              = arAkahukuDOM.getFirstElementByNames (oldCells [threadId], "a");
            arAkahukuCompat.AsyncHistory.isURIVisited
              (arAkahukuUtil.newURIViaNode (anchor.href, anchor),
               param.historyCallbacks.createVisitedCallback (mergedItems [mergedItems.length-1]));
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }

        delete oldCells [threadId];
      }
      else {
        nums [parseInt (threadId)] = true;
        if (newestId < parseInt (threadId)) {
          newestId = parseInt (threadId);
        }
        
        var uri = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableVisited
            || arAkahukuCatalog.enableObserveOpened) {
          try {
            var href = /href=['"]?([^\s'"]+)/.exec (currentTdText) [1];
            uri = arAkahukuUtil.newURIViaNode (href, targetDocument);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
        if (arAkahukuCatalog.enableObserveOpened && uri) {
          opened = arAkahukuCatalog.isOpened (uri);
        }

        mergedItems.push
          (new arAkahukuMergeItem
           (null,
            currentTdText,
            count ++,
            threadId,
            replyNumber,
            replyNumber,
            className,
            {visited: false,
             isNew: parseInt (threadId) > param.latestThread,
             overflowed: false,
             opened: opened,
            }));

        if (uri && (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableVisited)) {
          // 新しいスレに既読判定が必要な場合
          arAkahukuCompat.AsyncHistory.isURIVisited
            (uri, param.historyCallbacks.createVisitedCallback
             (mergedItems [mergedItems.length-1]));
        }
      }
    }
        
    if (arAkahukuCatalog.enableReloadLeftBefore) {
      var max;
      if (arAkahukuBoard.knows (info)) {
        max = arAkahukuBoard.getMaxNum (info);
      }
      else {
        max = 10000;
      }
            
      var overflowedItems = new Array ();
      for (threadId in oldCells) {
        if (parseInt (threadId) < newestId - max) {
          continue;
        }
                
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [threadId]);
        }
        var uri = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableObserveOpened) {
          var anchor
            = arAkahukuDOM.getFirstElementByNames (oldCells [threadId], "a");
          try {
            uri = arAkahukuUtil.newURIViaNode (anchor.href, anchor);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
        if (arAkahukuCatalog.enableObserveOpened && uri) {
          opened = arAkahukuCatalog.isOpened (uri);
        }
            
        nums [parseInt (threadId)] = true;
        if (newestId < parseInt (threadId)) {
          newestId = parseInt (threadId);
        }
                
        overflowedItems.push
        (new arAkahukuMergeItem
         (oldCells [threadId],
          "",
          //元indexでひとまず作成しソート後更新
          oldCells [threadId].getAttribute ("__original_index"),
          threadId,
          oldCells [threadId].getAttribute ("__reply_number"),
          oldCells [threadId].getAttribute ("__reply_number"),
          oldCells [threadId].getAttribute ("class"),
          {visited: visited, opened: opened,
           isNew: false, overflowed: true,
          }));

        if (arAkahukuCatalog.enableReorderVisited) {
          arAkahukuCompat.AsyncHistory.isURIVisited
            (uri, param.historyCallbacks.createVisitedCallback
             (mergedItems [mergedItems.length-1]));
        }
      }
      // カタログ順になることを保証させる
      overflowedItems.sort (function (x, y) {
        return x.index - y.index;
      });
      for (i = 0; i < overflowedItems.length; i ++) {
        overflowedItems [i].index = count ++;
        mergedItems.push (overflowedItems [i]);
      }
      overflowedItems = null;
    }
        
    var name;
    name = info.server + ":" + info.dir;
    if (arAkahukuCatalog.enableReloadLeftBeforeSave
        && info.isFutaba
        && !param.addedLastCells
        && name in arAkahukuCatalog.lastCells) {
      /* 前回の状態を追加 */
      param.addedLastCells = true;
            
      var max;
      if (arAkahukuBoard.knows (name)) {
        max = arAkahukuBoard.getMaxNum (name);
      }
      else {
        max = 10000;
      }
            
      visited = false;
      var cells = arAkahukuCatalog.lastCells [name];
      for (i = 0; i < cells.length; i ++) {
        var cell = cells [i];
        if (cell.threadId in nums) {
          continue;
        }
        if (cell.threadId < newestId - max) {
          continue;
        }

        var uri = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableObserveOpened) {
          try {
            uri = arAkahukuUtil.newURIViaNode (cell.href, targetDocument);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
        if (arAkahukuCatalog.enableObserveOpened && uri) {
          opened = arAkahukuCatalog.isOpened (uri);
        }
                
        mergedItems.push
          (new arAkahukuMergeItem
           (null,
            cell.text,
            count ++,
            cell.threadId,
            cell.replyNumber,
            cell.replyNumber,
            cell.className,
            {visited: visited, opened: opened,
             isNew: false, overflowed: true,
            }));

        if (arAkahukuCatalog.enableReorderVisited && uri) {
          arAkahukuCompat.AsyncHistory.isURIVisited
            (uri, param.historyCallbacks.createVisitedCallback
             (mergedItems [mergedItems.length-1]));
        }
      }
    }
        
    return mergedItems;
  },
    
  /**
   * 最新に更新
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement targetNode
   *         対象のノード
   */
  reloadCore : function (targetDocument, targetNode) {
    var param
    = Akahuku.getDocumentParam (targetDocument).catalog_param;
        
    var nodes, i;
    nodes = targetDocument.getElementsByTagName ("img");
    for (i = 0; i < nodes.length; i ++) {
      try {
        var load
          = nodes [i].QueryInterface
          (Components.interfaces.nsIImageLoadingContent);
        var request
          = load.getRequest
          (Components.interfaces.nsIImageLoadingContent
           .CURRENT_REQUEST);
        if (!request) {
          continue;
        }
                
        var errorStatus
          = Components.interfaces.imgIRequest.STATUS_ERROR
          | Components.interfaces.imgIRequest.STATUS_LOAD_PARTIAL;
                
        if (request.imageStatus & errorStatus) {
          nodes [i].src = nodes [i].src;
        }
        else if (request.imageStatus == 0) {
          targetDocument.defaultView.setTimeout
            (function (node) {
              node.src = node.src;
            }, 100, nodes [i]);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    /* ポップアップを消す */
    var param2
    = Akahuku.getDocumentParam (targetDocument)
    .catalogpopup_param;
    if (param2) {
      arAkahukuPopup.removeActivePopups (param2);
    }
        
    /* 指定幅を書き換える */
    arAkahukuCatalog.updateReorderIndicator (targetDocument, param);
        
    if (param.reloadChannel) {
      try {
        param.reloadChannel.cancel
          (Components.results.NS_BINDING_ABORTED || 0x80020006);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      param.reloadChannel = null;
      arAkahukuCatalog.setStatus
      ("\u4E2D\u65AD\u3055\u308C\u307E\u3057\u305F",
       // "中断されました"
       false, targetDocument);
      return;
    }
        
    var tmpNode
    = targetDocument.getElementById ("akahuku_catalog_reload_undo");
    if (tmpNode) {
      tmpNode.style.display = "none";
    }
    tmpNode
    = targetDocument.getElementById ("akahuku_catalog_reload_undo2");
    if (tmpNode) {
      tmpNode.style.display = "none";
    }
    tmpNode
    = targetDocument.getElementById ("akahuku_catalog_reload_redo");
    if (tmpNode) {
      tmpNode.style.display = "none";
    }
    tmpNode
    = targetDocument.getElementById ("akahuku_catalog_reload_redo2");
    if (tmpNode) {
      tmpNode.style.display = "none";
    }
        
    param.reloadChannel
      = arAkahukuUtil.newChannel ({
        uri: targetDocument.location.href,
        loadingNode: targetDocument,
        contentPolicyType: Components.interfaces.nsIContentPolicy.TYPE_REFRESH,
      }).QueryInterface (Components.interfaces.nsIHttpChannel);
    if (!arAkahukuCatalog.enableReloadUpdateCache) {
      // HttpChannel にキャッシュを更新させない
      param.reloadChannel.loadFlags
        |= Components.interfaces.nsIRequest.INHIBIT_CACHING;
      // requred for Firefox 27.0 (maybe caused by Bug 925352)
      param.reloadChannel.loadFlags
        |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
    }
    arAkahukuUtil.setChannelContext (param.reloadChannel, targetDocument);
        
    arAkahukuCatalog.setStatus
    ("\u30ED\u30FC\u30C9\u4E2D (\u30D8\u30C3\u30C0)",
     // "ロード中 (ヘッダ)"
     true, targetDocument);
        
    try {
      param.reloadChannel.asyncOpen (param, null);
    }
    catch (e) {
      /* サーバに接続できなかった場合 */
      arAkahukuCatalog.setStatus
      ("\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
       // "接続できませんでした"
       true, targetDocument);
    }
  },
    
  /**
   * [アンドゥ]／[リドゥ] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onUndoRedoClick : function (event, undo) {
    var targetDocument = event.target.ownerDocument;
    var param
    = Akahuku.getDocumentParam (targetDocument).catalog_param;
        
    var oldTable = targetDocument.getElementsByTagName ("table") [1];
    if (!oldTable) {
      /* 避難所 patch */
      oldTable = targetDocument.getElementsByTagName ("table") [0];
      if (!oldTable) {
        return;
      }
    }
        
    oldTable.parentNode.replaceChild (param.oldTable, oldTable);
    param.oldTable = oldTable;

    var tmp = param.oldLatestThread;
    param.oldLatestThread = param.latestThread;
    param.latestThread = tmp;

    tmp = param.oldOrder;
    param.oldOrder = param.order;
    param.order = tmp;
    arAkahukuCatalog.updateReorderIndicator (targetDocument, param);

    // 既読のマークを最新に更新
    arAkahukuCatalog.updateVisited (targetDocument);
        
    if (undo) {
      var tmpNode
        = targetDocument.getElementById
        ("akahuku_catalog_reload_undo");
      if (tmpNode) {
        tmpNode.style.display = "none";
      }
      tmpNode
        = targetDocument.getElementById
        ("akahuku_catalog_reload_undo2");
      if (tmpNode) {
        tmpNode.style.display = "none";
      }
            
      tmpNode
        = targetDocument.getElementById
        ("akahuku_catalog_reload_redo");
      if (tmpNode) {
        tmpNode.style.display = "";
      }
      tmpNode
        = targetDocument.getElementById
        ("akahuku_catalog_reload_redo2");
      if (tmpNode) {
        tmpNode.style.display = "";
      }
    }
    else {
      var tmpNode
      = targetDocument.getElementById
      ("akahuku_catalog_reload_undo");
      if (tmpNode) {
        tmpNode.style.display = "";
      }
      tmpNode
      = targetDocument.getElementById
      ("akahuku_catalog_reload_undo2");
      if (tmpNode) {
        tmpNode.style.display = "";
      }
            
      tmpNode
      = targetDocument.getElementById
      ("akahuku_catalog_reload_redo");
      if (tmpNode) {
        tmpNode.style.display = "none";
      }
      tmpNode
      = targetDocument.getElementById
      ("akahuku_catalog_reload_redo2");
      if (tmpNode) {
        tmpNode.style.display = "none";
      }
    }
        
    if (undo) {
      arAkahukuCatalog.setStatus
      ("\u30A2\u30F3\u30C9\u30A5\u3057\u307E\u3057\u305F",
       false, targetDocument);
    }
    else {
      arAkahukuCatalog.setStatus
      ("\u30EA\u30C9\u30A5\u3057\u307E\u3057\u305F",
       false, targetDocument);
    }
        
    if (arAkahukuCatalog.enableReloadTimestamp) {
      var now;
      var timestamp
      = targetDocument.getElementById
      ("akahuku_catalog_reload_timestamp");
      if (timestamp) {
        if (timestamp.firstChild
            && timestamp.firstChild.nodeValue) {
          now = timestamp.firstChild.nodeValue;
        }
        else {
          now = "";
        }
            
        if (timestamp.hasAttribute ("__old")) {
          arAkahukuDOM.setText (timestamp,
                                timestamp.getAttribute ("__old"));
        }
        else {
          arAkahukuDOM.setText (timestamp, "");
        }
            
        timestamp.setAttribute ("__old", now);
      }
      timestamp
      = targetDocument.getElementById
      ("akahuku_catalog_reload_timestamp2");
      if (timestamp) {
        if (timestamp.firstChild
            && timestamp.firstChild.nodeValue) {
          now = timestamp.firstChild.nodeValue;
        }
        else {
          now = "";
        }
            
        if (timestamp.hasAttribute ("__old")) {
          arAkahukuDOM.setText (timestamp,
                                timestamp.getAttribute ("__old"));
        }
        else {
          arAkahukuDOM.setText (timestamp, "");
        }
            
        timestamp.setAttribute ("__old", now);
      }
        
      event.preventDefault ();
    }
  },
    
  /**
   * マウスが動いたイベント
   * カタログ画像の上ならばポップアップを作成、外ならば全てのポップアップを削除
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyMouseOver : function (event) {
    try {
      var targetDocument = event.target.ownerDocument;
      var documentParam = Akahuku.getDocumentParam (targetDocument);
      if (!documentParam) {
        return; // document was closed
      }
      var param = documentParam.catalogpopup_param;
            
      var img = event.explicitOriginalTarget;
      if (img
          && img.nodeName.toLowerCase () == "img") {
        if (arAkahukuCatalog.enableZoomClick) {
          var tmp = arAkahukuDOM.findParentNode (img, "td");
          if (tmp) {
            param.lastPopupKey = "";
            arAkahukuPopup.removeActivePopups (param);
          }
        }
        else if (img.parentNode
                 && img.parentNode.nodeName.toLowerCase () == "a"
                 && img.src.match (/(?:cat|thumb)\/([0-9]+)s\.jpg$/)
                 && img.parentNode.parentNode
                 && img.parentNode.parentNode.className != "akahuku_popup") {
          var key = RegExp.$1;
          if (key != param.lastPopupKey) {
            param.lastPopupKey = key;
            arAkahukuPopup.addPopup
              (key,
               param,
               new arAkahukuCatalogPopupData (img));
          }
        }
      }
      else if (img && img.nodeName.toLowerCase () == "a"
          && img.className == "akahuku_popup_area") {
        // ポップアップ保持エリアではそのまま
      }
      else if (arAkahukuCatalog.enableZoomComment) {
        var tmp = null;
                
        var base = null;
        if (img.nodeName.toLowerCase () == "div") {
          base = img;
        }
        else {
          base = arAkahukuDOM.findParentNode (img, "div");
        }
        if (base
            && "className" in base
            && base.className == "akahuku_comment") {
          tmp = arAkahukuDOM.findParentNode (base, "td");
        }
        if (!tmp) {
          if (img.nodeName.toLowerCase () == "small") {
            base = img;
          }
          else {
            base = arAkahukuDOM.findParentNode (img, "small");
          }
          if (base
              && "className" in base
              && base.className == "akahuku_native_comment") {
            tmp = arAkahukuDOM.findParentNode (base, "td");
          }
        }
                
        var opened = false;
        if (tmp
            && tmp.hasAttribute ("__thread_id")) {
          var num = tmp.getAttribute ("__thread_id");
          var info
          = Akahuku.getDocumentParam (targetDocument)
          .location_info;
          var name = info.server + "_" + info.dir;
          var thread = null;
          if (name in arAkahukuSidebar.boards) {
            thread
            = arAkahukuSidebar.boards [name].getThread (num);
          }
          if (thread && thread.comment) { //コメント情報は必須
            var key = "t" + num;
            if (key != param.lastPopupKey) {
              param.lastPopupKey = key;
              arAkahukuPopup.addPopup
                (key,
                 param,
                 new arAkahukuCatalogCommentPopupData
                 (thread, base));
            }
            opened = true;
          }
        }
                
        if (!opened) {
          var base = null;
          if (img.nodeName.toLowerCase () == "div") {
            base = img;
          }
          else {
            base = arAkahukuDOM.findParentNode (img, "div");
          }
          if (base
              && "className" in base
              && base.className == "akahuku_popup") {
          }
          else {
            param.lastPopupKey = "";
            arAkahukuPopup.removeActivePopups (param);
          }
        }
      }
      else if (img && img.nodeName.toLowerCase () == "a"
               && img.className == "akahuku_popup_area") {
        /* 保持エリアではそのまま */
      }
      else {
        param.lastPopupKey = "";
        arAkahukuPopup.removeActivePopups (param);
      }
    }
    catch (e) { Akahuku.debug.exception (e);
      /* ドキュメントが閉じられた場合など */
    }
  },
    
  /**
   * マウスをクリックしたイベント
   * 表示しているポップアップを削除する
   *
   * @param  Event event
   *         対象のイベント
   */
  onBodyClick : function (event) {
    if (event.explicitOriginalTarget.nodeName.toLowerCase () == "img") {
      var tmp
      = arAkahukuDOM.findParentNode (event.explicitOriginalTarget, "td");
      if (tmp) {
        if (!arAkahukuCatalog.enableZoomClick) {
          var targetDocument = event.target.ownerDocument;
          var param
            = Akahuku.getDocumentParam (targetDocument)
            .catalogpopup_param;
                    
          param.lastPopupKey = "";
          arAkahukuPopup.removeActivePopups (param);
        }
      }
    }
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
        
    param = documentParam.catalog_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.catalog_param = null;
        
    param = documentParam.catalogpopup_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.catalogpopup_param = null;
  },
    
  /**
   * 合間合間に でカタログのスレを無かった事にしたイベント
   * を受け付ける(実際のDOM操作はまとめて後で)
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onHideEntireThread : function (targetDocument) {
    try {
      var param = Akahuku.getDocumentParam (targetDocument);
      param = param.catalog_param;
    }
    catch (e) {
      return;
    }
    // デバウンス
    if (!param.hideEntireThreadDispatched) {
      param.hideEntireThreadDispatched = true;
      arAkahukuUtil.executeSoon (function (doc, param) {
        param.hideEntireThreadDispatched = false;
        arAkahukuCatalog.onHideEntireThreadCore (doc);
      }, [targetDocument, param]);
    }
  },

  onHideEntireThreadCore : function (targetDocument) {
    var param = Akahuku.getDocumentParam (targetDocument);
    if (!param) {
      return;
    }
    param = param.catalog_param;
        
    if (!arAkahukuCatalog.enableReorderFill) {
      return;
    }
        
    if (param.order == "akahuku_catalog_reorder_default"
        || param.order == "akahuku_catalog_reorder_page") {
      return;
    }

    var table = targetDocument.getElementsByTagName ("table") [1];
    if (!table) {
      /* 避難所 patch */
      table = targetDocument.getElementsByTagName ("table") [0];
      if (!table) {
        return;
      }
    }
        
    var tbody = table.getElementsByTagName ("tbody");
    if (tbody && tbody [0]) {
      tbody = tbody [0];
    }
    else {
      return;
    }
    var fromTr = tbody.firstChild;
    while (fromTr
           && fromTr.nodeName.toLowerCase () != "tr") {
      fromTr = fromTr.nextSibling;
    }
    if (!fromTr) {
      return;
    }
    var toTr = tbody.firstChild;
    while (toTr
           && toTr.nodeName.toLowerCase () != "tr") {
      toTr = toTr.nextSibling;
    }
    if (!toTr) {
      return;
    }
    var td = fromTr.firstChild;
    var nextTd = null;
    var columns = param.columns;
        
    var count = 0;
    var hiddenCount = 0;
        
    while (fromTr && toTr) {
      nextTd = td.nextSibling;
      var isHeader = td.nodeName.toLowerCase () == "th";
      if (isHeader && td.firstChild) {
        count = 0;
        toTr = fromTr;
      }
      else {
        if (fromTr != toTr
            && !isHeader) {
          td.parentNode.removeChild (td);
          toTr.appendChild (td);
        }
                
        if (td.nodeName.toLowerCase () == "td") {
          if (td.style.display != "none") {
            count ++;
            if (count == columns) {
              count = 0;
              toTr = toTr.nextSibling;
              while (toTr
                     && toTr.nodeName.toLowerCase () != "tr") {
                toTr = toTr.nextSibling;
              }
            }
          }
          else {
            hiddenCount ++;
          }
        }
      }
            
      td = nextTd;
      if (!td) {
        fromTr = fromTr.nextSibling;
        while (fromTr
               && fromTr.nodeName.toLowerCase () != "tr") {
          fromTr = fromTr.nextSibling;
        }
        if (fromTr) {
          td = fromTr.firstChild;
        }
      }
    }
    var tr = tbody.firstChild;
    while (tr) {
      var nextTr = tr.nextSibling;
      if (tr.getElementsByTagName ("td").length == 0) {
        tr.parentNode.removeChild (tr);
      }
      tr = nextTr;
    }
        
  },
  
  /**
   * リンクの既読表示を更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean clear
   *         (オプション) 履歴を調べずに未読にするか
   */
  updateVisited : function (targetDocument, clear) {
    if (arAkahukuCatalog.enableVisited) {
      var table = targetDocument.getElementsByTagName ("table") [1];
      if (!table) {
        /* 避難所 patch */
        table = targetDocument.getElementsByTagName ("table") [0];
        if (!table) {
          return;
        }
      }
      
      var nodes = table.getElementsByTagName ("a");
      var uri;
      
      var historyCallbacks = new arAkahukuMergeItemCallbackList ();
      var callback;
      for (var i = 0; i < nodes.length; i ++) {
        if (clear) {
          arAkahukuDOM.removeClassName (nodes [i], "akahuku_visited");
        }
        else {
          uri = arAkahukuUtil.newURIViaNode (nodes [i].href, nodes [i]);
          // customize for node operations
          callback = historyCallbacks.createVisitedCallback (nodes [i]);
          callback.isVisitedHandler = function (uri, visited) {
            if (visited) {
              arAkahukuDOM.addClassName (this.wrappedObject, "akahuku_visited");
            }
            else {
              arAkahukuDOM.removeClassName (this.wrappedObject, "akahuku_visited");
            }
          };
          arAkahukuCompat.AsyncHistory.isURIVisited (uri, callback);
        }
      }

      if (historyCallbacks.count > 0) {
        historyCallbacks.asyncWaitRequests
          (function () {
            historyCallbacks = null;
          });
      }
    }
  },

  /**
   * セルのスレを開いているかの表示を更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateOpened : function (targetDocument) {
    if (!arAkahukuCatalog.enableObserveOpened) {
      return;
    }
    var table = arAkahukuCatalog.getCatalogTable (targetDocument);
    if (!table) {
      return;
    }
    var nodes = table.getElementsByTagName ("td");
    for (var i = 0; i < nodes.length; i ++) {
      var a = arAkahukuDOM.getFirstElementByNames (nodes [i], "a");
      try {
        var uri = arAkahukuUtil.newURIViaNode (a.href, a);
        var opened = arAkahukuCatalog.isOpened (uri);
        arAkahukuCatalog.setCellOpened (nodes [i], opened);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
  },

  /**
   * セルを既読としてマーク
   */
  setCellVisited : function (td, visited) {
    var nodes = td.getElementsByTagName ("a");
    for (var i = 0; i < nodes.length; i ++) {
      if (visited)
        arAkahukuDOM.addClassName (nodes [i], "akahuku_visited");
      else
        arAkahukuDOM.removeClassName (nodes [i], "akahuku_visited");
    }
  },

  /**
   * セルを開いているセルとしてマーク
   */
  setCellOpened : function (td, opened) {
    if (opened) {
      if (!td.hasAttribute ("__opened")) {
        td.setAttribute ("__opened", "true");
        td.addEventListener ("click", this.onClickOpenedCell, true);
      }
    }
    else if (td.hasAttribute ("__opened")) {
      td.removeAttribute ("__opened");
      td.removeEventListener ("click", this.onClickOpenedCell, true);
    }
  },

  onClickOpenedCell : function (event) {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
      return;
    }
    var anchor = arAkahukuDOM.findParentNode (event.target, "a");
    if (!anchor || !anchor.href) {
      return;
    }
    var uri = arAkahukuUtil.newURIViaNode (anchor.href, anchor);

    var targetWindow, reloader;

    var params = Akahuku.getDocumentParamsByURI (uri);
    if (params.length > 0) {
      // 現 Akahuku 管理下に対象のスレッドがある場合
      targetWindow = params [0].targetDocument.defaultView;
      arAkahukuWindow.focusTabForWindow (targetWindow);
      reloader = arAkahukuReload;
    }
    else {
      // XUL Window毎の検索
      targetWindow = anchor.ownerDocument.defaultView;
      var chromeWindow = arAkahukuWindow.getParentWindowInChrome (targetWindow);
      targetWindow = arAkahukuWindow.focusAkahukuTabByURI (uri, chromeWindow);
      if (!targetWindow) {// 切替失敗時
        return;
      }
      chromeWindow = arAkahukuWindow.getParentWindowInChrome (targetWindow);
      reloader = chromeWindow.arAkahukuReload;
    }

    event.preventDefault ();
    event.stopPropagation ();

    // [続きを読む]が画面内なら押す
    var doSync = false;
    var doc = targetWindow.document;
    var container = doc.getElementById ("akahuku_bottom_container");
    var btn = doc.getElementById ("akahuku_reload_button");
    if (!btn) {
      btn = doc.getElementById ("akahuku_reload_syncbutton");
      doSync = !!btn;
    }
    if (container && btn) {
      var elem = container;
      var offsetTop = elem.offsetTop|0;
      while (elem.offsetParent) {
        elem = elem.offsetParent;
        offsetTop += elem.offsetTop|0;
      }
      var base = doc.body; //後方互換モード用
      if (doc.compatMode != "BackCompat") {
        base = doc.documentElement; //標準準拠モード用
      }
      if (offsetTop < base.scrollTop + base.clientHeight) {
        // 画面内に要素がある場合
        reloader.diffReloadCore (doc, doSync, false);
      }
    }
  },
    
  /**
   * カタログを修正する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound) {
      return;
    }
        
    if (info.isCatalog
        && (arAkahukuCatalog.enableClickable
            || arAkahukuCatalog.enableSidebar
            || arAkahukuCatalog.enableReorder
            || arAkahukuCatalog.enableVisited
            || arAkahukuCatalog.enableZoom
            || arAkahukuCatalog.enableReload
            || arAkahukuCatalog.enableRed
            || arAkahukuCatalog.enableObserve
            || arAkahukuCatalog.enableLeft)) {
            
      var param = new arAkahukuCatalogParam (targetDocument);
      Akahuku.getDocumentParam (targetDocument)
      .catalog_param = param;
            
      var table = targetDocument.getElementsByTagName ("table") [1];
      if (!table) {
        /* 避難所 patch */
        table = targetDocument.getElementsByTagName ("table") [0];
        if (!table) {
          return;
        }
      }
           
      if (arAkahukuCatalog.enableLeft) {
        table.removeAttribute ("align");
        table.style.marginLeft = "0px";
      }
            
      var lastRule = null;
      var node
      for (node = table.nextSibling; node; node = node.nextSibling) {
        if (node.nodeName.toLowerCase () == "hr") {
          lastRule = node;
          break;
        }
      }
            
      /* 避難所 patch */
      if (!lastRule) {
        for (node = table.parentNode.nextSibling;
             node; node = node.nextSibling) {
          if (node.nodeName.toLowerCase () == "hr") {
            lastRule = node;
            break;
          }
        }
        /* カタログモードの設定にはhrが無い */
        if (!lastRule) {
          return;
        }
      }
            
      var nodes = table.getElementsByTagName ("tr");
      if (nodes && nodes [0]) {
        nodes = nodes [0].getElementsByTagName ("td");
        param.defaultColumns = param.columns = nodes.length;
      }
            
      /* セル毎に必要なデータを設定する */
      nodes = table.getElementsByTagName ("td");
      for (var i = 0; i < nodes.length; i ++) {
        nodes [i].setAttribute ("__original_index", i);
        if (nodes [i].innerHTML.match (/res[\/=]([0-9]+)/)
            || nodes [i].innerHTML.match (/2\/([0-9]+)/)
            || nodes [i].innerHTML.match (/b\/([0-9]+)/)) {
          nodes [i].setAttribute ("__thread_id", RegExp.$1);
        }
        if (nodes [i].innerHTML.match (/<font.*>(?:(\d+)|\((\d+)\))<\/font>/i)) {
          nodes [i].setAttribute ("__reply_number", RegExp.$1 || RegExp.$2);
        }
        /* 避難所 patch */
        else if (nodes [i].innerHTML.match
                 (/<span.*>([0-9]+)<\/span>/i)) {
          nodes [i].setAttribute ("__reply_number", RegExp.$1);
        }
                
        /* 現時点での最新のスレ番号を取得する */
        if (parseInt (nodes [i].getAttribute ("__thread_id"))
            > param.latestThread) {
          param.latestThread
            = parseInt (nodes [i].getAttribute ("__thread_id"));
        }
                
        arAkahukuCatalog.updateCell (nodes [i], info);
      }
      // 最新スレ番号を板の最新レス番号へ反映する
      arAkahukuBoard.updateNewestNum (info, param.latestThread);
            
      for (var i = 0; i < nodes.length; i ++) {
        arAkahukuCatalog.updateCellInfo (nodes [i],
                                         info,
                                         param.latestThread);
      }
      
      // 既読チェックは reorder 以前に行うこと
      arAkahukuCatalog.updateVisited (targetDocument);
      arAkahukuCatalog.updateOpened (targetDocument);
            
      if (arAkahukuCatalog.enableReorder) {
        var nodes = targetDocument.getElementsByTagName ("font");
        for (var i = 0; i < nodes.length; i ++) {
          if (nodes [i].innerHTML
              .match (/\u30AB\u30BF\u30ED\u30B0\u30E2\u30FC\u30C9/)) {
            var span = targetDocument.createElement ("span");
            span.id = "akahuku_catalog_mode_indicator";
            nodes [i].parentNode
              .insertBefore (span, nodes [i].nextSibling);
            break;
          }
        }
                
        var paragraph = targetDocument.createElement ("p");
        paragraph.id = "akahuku_catalog_reorder_container";
                
        /**
         * ソートのボタンを作成する
         *
         * @param  String aid
         *         アンカーの id
         * @param  String content
         *         アンカーの内容
         */
        function createReorderOrderButton (aid, content, reorderWidth) {
          var anchor = targetDocument.createElement ("a");
          anchor.id = aid;
          anchor.className = "akahuku_catalog_reorder";
          anchor.appendChild (targetDocument.createTextNode
                              (content));
          if (reorderWidth) {
            var span = targetDocument.createElement ("span");
            span.className = "akahuku_catalog_reorder_width";
            span.appendChild (targetDocument.createTextNode (reorderWidth));
            anchor.appendChild (span);
            anchor.appendChild (targetDocument.createTextNode
                                ("\u305A\u3064")); // "ずつ"
          }
          anchor.addEventListener
            ("click",
             function () {
              arAkahukuCatalog.onReorderClick (arguments [0]);
            }, false);
                    
          paragraph.appendChild (targetDocument.createTextNode ("["));
          paragraph.appendChild (anchor);
          paragraph.appendChild (targetDocument.createTextNode ("]"));
        }
                
        var columns = arAkahukuCatalog.reorderWidth;
        if (columns == 0) {
          columns = param.defaultColumns;
        }
                
        createReorderOrderButton
        ("akahuku_catalog_reorder_default",
         "\u901A\u5E38");
        createReorderOrderButton
        ("akahuku_catalog_reorder_page",
         "\u30DA\u30FC\u30B8\u3054\u3068");
        createReorderOrderButton
        ("akahuku_catalog_reorder_spec",
         "\u901A\u5E38\u9806\u306B", //"通常順に"
         columns);
        createReorderOrderButton
        ("akahuku_catalog_reorder_createtime",
         "\u30B9\u30EC\u306E\u7ACB\u3063\u305F\u9806\u306B",
         //"スレの立った順に"
         columns);
        createReorderOrderButton
        ("akahuku_catalog_reorder_delta",
         "\u5897\u52A0\u6570\u9806\u306B", // "増加数順に"
         columns);
                
        if (arAkahukuCatalog.enableReorderSave) {
          paragraph.appendChild
            (targetDocument.createTextNode (" / "));
          createReorderOrderButton
          ("akahuku_catalog_reorder_save",
           "\u8A18\u61B6"); // "記憶"
        }
                
        table.parentNode.insertBefore (paragraph, table.nextSibling);

        // 上部にも同じものを置く
        paragraph = paragraph.cloneNode (true);
        paragraph.id += "2";
        var nodes = paragraph.getElementsByTagName ("a");
        for (var i = 0; i < nodes.length; i ++) {
          nodes [i].id += "2";
          nodes [i].addEventListener
            ("click", arAkahukuCatalog.onReorderClick, false);
        }
        table.parentNode.insertBefore (paragraph, table);
                
        if (arAkahukuCatalog.enableReorderSave) {
          var target_id = "";
          for (var id in arAkahukuCatalog.REORDER_TYPES) {
            if (arAkahukuCatalog.REORDER_TYPES [id]
                === arAkahukuCatalog.reorderSaveType) {
              target_id = id;
            }
          }
                    
          if (target_id) {
            arAkahukuCatalog.onReorderClickCore
              (targetDocument
               .getElementById (target_id),
               param);
          }
        }
      }
            
      var table = targetDocument.getElementsByTagName ("table") [1];
      if (!table) {
        /* 避難所 patch */
        table = targetDocument.getElementsByTagName ("table") [0];
        if (!table) {
          return;
        }
      }
            
      /* ズーム用にマウスのイベントを検出する */
      if (arAkahukuCatalog.enableZoom) {
        var param2 = new arAkahukuPopupParam (10, targetDocument);
        Akahuku.getDocumentParam (targetDocument)
        .catalogpopup_param = param2;
                
        targetDocument.body.addEventListener
        ("mouseover",
         function () {
          arAkahukuCatalog.onBodyMouseOver (arguments [0]);
        }, false);
        targetDocument.body.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onBodyClick (arguments [0]);
        }, false);
      }
            
      if (arAkahukuCatalog.enableReload) {
        if (arAkahukuCatalog.enableReloadHook) {
          try {
            targetDocument.defaultView
            .QueryInterface (Components.interfaces
                             .nsIInterfaceRequestor)
            .getInterface (Components.interfaces.nsIWebNavigation)
            .sessionHistory.addSHistoryListener (param);
          }
          catch (e) {
            /* フレーム内の可能性あり */
          }
        }
                
        var div, a, span;
                
        div = targetDocument.createElement ("div");
        div.id = "akahuku_catalog_reload_container";
                
        div.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_catalog_reload_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u6700\u65B0\u306B\u66F4\u65B0"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onReloadClick (arguments [0]);
        }, false);
        div.appendChild (a);
                
        div.appendChild (targetDocument.createTextNode ("] "));
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_undo";
        span.style.display = "none";
                
        span.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_catalog_reload_undo_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u30A2\u30F3\u30C9\u30A5"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onUndoRedoClick (arguments [0], true);
        }, false);
        span.appendChild (a);
                
        span.appendChild (targetDocument.createTextNode ("] "));
                
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_redo";
        span.style.display = "none";
                
        span.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_catalog_reload_redo_button";
        a.appendChild (targetDocument.createTextNode
                       ("\u30EA\u30C9\u30A5"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onUndoRedoClick (arguments [0], false);
        }, false);
        span.appendChild (a);
                
        span.appendChild (targetDocument.createTextNode ("] "));
                
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_status";
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_timestamp";
        div.appendChild (span);
                
        if (table.previousSibling && table.previousSibling.id
            === "akahuku_catalog_reorder_container2")
          table.parentNode.insertBefore (div, table.previousSibling);
        else
        table.parentNode.insertBefore (div, table);
                
        div = targetDocument.createElement ("div");
        div.id = "akahuku_catalog_reload_container2";
                
        div.appendChild (targetDocument.createTextNode (" ["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_catalog_reload_button2";
        a.appendChild (targetDocument.createTextNode
                       ("\u6700\u65B0\u306B\u66F4\u65B0"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onReloadClick (arguments [0]);
        }, false);
        div.appendChild (a);
                
        div.appendChild (targetDocument.createTextNode ("] "));
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_undo2";
        span.style.display = "none";
                
        span.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_catalog_reload_undo_button2";
        a.appendChild (targetDocument.createTextNode
                       ("\u30A2\u30F3\u30C9\u30A5"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onUndoRedoClick (arguments [0], true);
        }, false);
        span.appendChild (a);
                
        span.appendChild (targetDocument.createTextNode ("] "));
                
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_redo2";
        span.style.display = "none";
                
        span.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_catalog_reload_redo_button2";
        a.appendChild (targetDocument.createTextNode
                       ("\u30EA\u30C9\u30A5"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuCatalog.onUndoRedoClick (arguments [0], false);
        }, false);
        span.appendChild (a);
                
        span.appendChild (targetDocument.createTextNode ("] "));
                
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_status2";
        div.appendChild (span);
                
        span = targetDocument.createElement ("span");
        span.id = "akahuku_catalog_reload_timestamp2";
        div.appendChild (span);
                
        lastRule.parentNode.insertBefore (div, lastRule);

        // 拡張間連携のための不可視の一時挿入場所
        div = targetDocument.createElement ("div");
        div.id = "akahuku_appending_container";
        targetDocument.body.appendChild (div);
      }

      // スレッドの更新通知を待ち受ける
      param.registerObserver ();
    }
  },
  
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsINavHistoryObserver
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsINavHistoryObserver)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },

  /**
   * URI 削除前イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  String aGUID
   *         ページの GUID
   */
  onBeforeDeleteURI : function  (aURI, aGUID) {
  },
  
  /**
   * バッチ開始イベント
   *   nsINavHistoryObserver.onBeginUpdateBatch
   */
  onBeginUpdateBatch : function () {
  },
  
  /**
   * 履歴クリアイベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   */
  onClearHistory : function () {
    arAkahukuCatalog.onHistoryUpdateCore (true);
  },

  /**
   * URI 削除イベント
   *   nsINavHistoryObserver.onDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  String aGUID
   *         ページの GUID
   */
  onDeleteURI : function (aURI, aGUID) {
    arAkahukuCatalog.onThreadHistoryChangeCore (aURI, false);
  },

  /**
   * 履歴削除イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aVisitTime
   *         最終訪問時間 [ms]
   * @param  String aGUID
   *         ページの GUID
   */
  onDeleteVisits : function (aURI, aVisitTime, aGUID) {
  },

  /**
   * バッチ終了イベント
   *   nsINavHistoryObserver.onEndUpdateBatch
   */
  onEndUpdateBatch : function () {
    arAkahukuCatalog.onHistoryUpdateCore ();
  },

  /**
   * ページ情報変更イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aWhat
   *         対象のキー
   * @param  String aValue
   *         対象の値
   */
  onPageChanged : function (aURI, aWhat, aValue) {
  },

  /**
   * 履歴期限切れイベント
   *   nsINavHistoryObserver.onPageExpired
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aVisitTime
   *         最終訪問時間 [ms]
   * @param  Boolean aWholeEntry
   *         全項目が削除中か
   */
  onPageExpired : function (aURI, aVisitTime, aWholeEntry) {
  },

  /**
   * タイトル変更イベント
   *   nsINavHistoryObserver.onBeforeDeleteURI
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  String aPageTitle
   *         ページタイトル
   */
  onTitleChanged : function (aURI, aPageTitle) {
  },

  /**
   * 履歴追加イベント
   *   nsINavHistoryObserver.onVisit
   *
   * @param  nsIURI aURI
   *         対象の URI
   * @param  Number aVisitID
   *         履歴の項目の ID
   * @param  Number aTime
   *         訪問時間 [ms]
   * @param  Number aSessionID,
   *         セッション ID
   * @param  Number aReferringID,
   *         遷移元の履歴の項目の ID
   *         なければ 0
   * @param  Number aTransitionType
   *         遷移方法 ?
   * @param  String aGUID
   *         ページの GUID
   */
  onVisit : function (aURI, aVisitID, aTime, aSessionID, aReferringID,
                      aTransitionType, aGUID) {
    arAkahukuCatalog.onThreadHistoryChangeCore (aURI, true);
  },

  /**
   * 履歴追加/削除をカタログに反映する
   */
  onThreadHistoryChangeCore : function (aURI, visited) {
    if (!arAkahukuCatalog.enableVisited) {
      return;
    }
    var matched = aURI.host.match (/^([^.]+)\.2chan\.net$/);
    if (!matched)
      return;
    var server = matched [1];
    matched = aURI.path.match (/^\/([^\/]+)\/(?:res\/|futaba\.php\?res=)(\d+)/);
    if (!matched)
      return;
    var dir = matched [1], id = matched [2];

    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      var info = Akahuku.documentParams [i].location_info;
      if (!info.isCatalog
          || info.server != server
          || info.dir != dir) {
        continue;
      }
      var targetDocument = Akahuku.documentParams [i].targetDocument;
      var td = arAkahukuCatalog.getThreadCell (targetDocument, id);
      if (td) {
        arAkahukuCatalog.setCellVisited (td, visited);
      }
    }
  },

  /**
   * 履歴の大幅な変化をカタログに反映する
   */
  onHistoryUpdateCore : function (cleared) {
    if (!arAkahukuCatalog.enableVisited) {
      return;
    }
    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      var info = Akahuku.documentParams [i].location_info;
      if (!info.isCatalog)
        continue;
      var targetDocument = Akahuku.documentParams [i].targetDocument;
      arAkahukuCatalog.updateVisited (targetDocument, cleared);
    }
  },
};
