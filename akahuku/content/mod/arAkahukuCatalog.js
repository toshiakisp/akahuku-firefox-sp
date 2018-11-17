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
        if (this.targetSrc === this.targetImage.src) {
          exists = true;
        }
        else if (param.cacheImageData.exists (this.key)) {
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
        if (!Akahuku.useCSSTransition) {
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
              let anchor = targetDocument.createElement("a");
                        
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
              HistoryService.isVisited(anchor.href)
                .then((visited) => {
                  if (visited) {
                    arAkahukuDOM.addClassName(anchor, "akahuku_visited");
                  }
                })
                .catch((e) => Akahuku.debug.exception(e));
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
        if (!Akahuku.useCSSTransition) {
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

    var width = this.targetImage.width;
    var height = this.targetImage.height;

    var style = this.targetImage.ownerDocument.defaultView
      .getComputedStyle (this.targetImage, null);
    if (style.objectFit == "contain") {
      // CSS3&4 object-fit で実際に表示されている画像の領域を予測
      // (簡単のため中央揃えを仮定)
      var ar = this.targetImage.naturalWidth / this.targetImage.naturalHeight;
      if (ar > this.targetImage.width / this.targetImage.height) {
        height = this.targetImage.width / ar;
        y += (this.targetImage.height - height)/2;
      }
      else {
        width = this.targetImage.height * ar;
        x += (this.targetImage.width - width)/2;
      }
    }
        
    this.targetImageGeometry = new Object ();
    this.zoomImageGeometry = new Object ();
        
    this.targetImageGeometry.left = x - 1;
    this.targetImageGeometry.top = y - 1;
    this.targetImageGeometry.width = width;
    this.targetImageGeometry.height = height;
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
      Akahuku.debug.log ("zoomTransitionEffect: timeout!");
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
  this.isSticky = !!flags.isSticky;
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
  isSticky : false,       /* Boolean  Sticky フラグ */
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
    else if (this.wrappedObject instanceof arAkahukuMergeItem) {
      this.wrappedObject.visited = visited;

      // 既に td が生成済みならそちらにも反映
      // (asyncWaitRequests で結果を待たない場合)
      try {
        var td = this.wrappedObject.td;
        if (td && !arAkahukuCompat.isDeadWrapper (td)) {
          arAkahukuCatalog.setCellVisited (td, visited);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
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
/**
 * 他タブ等で開いているスレかの非同期調査の待ち受け
 */
function arAkahukuMergeItemOpenedCallback (mergeItem, list, id) {
  this.wrappedObject = mergeItem;
  this.id = id;
  list.addCallback (this, id);
  this.list = list;
  this.listener = null;
};
arAkahukuMergeItemOpenedCallback.prototype = {
  isOpened : function (uri, opened) {
    if (this.listener) {
      this.listener.apply (this, [uri, opened]);
    }
    else if (this.wrappedObject instanceof arAkahukuMergeItem) {
      this.wrappedObject.opened = opened;

      // 既に td が生成済みならそちらにも反映
      // (asyncWaitRequests で結果を待たない場合)
      try {
        var td = this.wrappedObject.td;
        if (td && !arAkahukuCompat.isDeadWrapper (td)) {
          arAkahukuCatalog.setCellOpened (td, opened);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
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
    this.listener = null;
  },
};
/**
 * 非同期調査の管理
 */
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
  createOpenedCallback : function (item) {
    return new arAkahukuMergeItemOpenedCallback (item, this, this._id ++);
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
 */
function arAkahukuCatalogParam (targetDocument) {
  this.order = "akahuku_catalog_reorder_default";
  this.targetDocument = targetDocument;
  this.targetWindow = targetDocument.defaultView;

  this.historyObserver = {
    observe : function (topic, historyItem) {
      arAkahukuCatalog.onThreadHistoryChanged(
        targetDocument, historyItem.url, (topic == 'visited'));
    },
  };
  HistoryService.addObserver('visited', this.historyObserver);
  HistoryService.addObserver('removed', this.historyObserver);
}
arAkahukuCatalogParam.prototype = {
  tatelogSec : 0,         /* Number  タテログの残り時間 */
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
    
  responseText : "",      /* String  応答のデータ */
  reloadController : null,
    
  addedLastCells : false, /* Boolean  最後のセルを追加したか */

  updateAgeTimerID : null,    /* Number  __age 属性更新のデバウンス用タイマ */
  hideEntireThreadDispatched : false,
    
  historyCallbacks : null,

  ageStickByTextPattern : 0,

  /**
   * データを開放する
   */
  destruct : function () {
    HistoryService.removeObserver('visited', this.historyObserver);
    HistoryService.removeObserver('removed', this.historyObserver);
    if (this.reloadController) {
      try {
        this.reloadController.abort();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      this.reloadController = null;
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
   * 連携のためにオブザーバーとして登録する
   */
  registerObserver : function () {
    var os = ObserverService;
    os.addObserver (this, "arakahuku-location-info-changed", false);
    os.addObserver (this, "arakahuku-board-newest-num-updated", false);
    os.addObserver (this, "arakahuku-thread-unload", false);
    this._observing = true;
  },
  unregisterObserver : function () {
    if (!this._observing) return;
    try {
      var os = ObserverService;
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
        var decodedData = JSON.parse (subject.data);
        this.onNotifiedLocationInfoUpdated (decodedData, data);
      }
      else if (topic == "arakahuku-board-newest-num-updated") {
        var decodedData = JSON.parse (subject.data);
        this.onNotifiedThreadNewestNumber (decodedData, data);
      }
      else if (topic == "arakahuku-thread-unload") {
        var decodedData = JSON.parse (subject.data);
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
        arAkahukuCatalog.isOpenedAsync (url, function (opened) {
          if (opened) Akahuku.debug.log ("Catalog.onNotifiedThreadUnload:", "opened", url);
          arAkahukuCatalog.setCellOpened (cell, opened);
        });
      }, 10, td, threadInfo.URL);
    }
  },
};
/**
 * カタログ管理
 *   [カタログ]
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
  enableReorderSticky : true,   /* Boolean  Sticky フラグを分ける */
  enableReorderFill : false,    /* Boolean  合間合間に で消した分を詰める */
  enableReorderInfo : false,    /* Boolean  各行に情報を表示する */

  enableReorderStickByText : false, /* Boolean  本文で分ける */
  patternsToStickByText : [], /* Array RegExp */
  lastPatternStickByText : "",  /* String */
  ageStickByTextPattern : 0,  /* Number */
    
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
  enableObserveOpenedReload : false,  /* Boolean  開いているスレに移動後リロード */

  enableCellWidth : true,    /* Boolean スレの幅を固定 */
  cellWidthNum : 50,         /* Number  サイズ(値) */
  cellWidthUnit : "px",      /* String  サイズ(単位) */
  enableCellWidthImg : true, /* Boolean   サムネ表示領域も */
  cellWidthMaxLines : 2,     /* Number  本文は最大x行まで表示 */
    
  enableClickable : false, /* Boolean  空白の本文を強制リンク */
  enableVisited : false,   /* Boolean  一度見たスレをマーク */
  enableRed : false,       /* Boolean  古いスレを赤くする */
  enableLeft : false,      /* Boolean  カタログを左寄せ */
    
  lastCells : new Object (), /* Object  閉じる前のセル
                              *   <String server:dir, [Object セル情報]> */
  lastCellsText : "",        /* String  lastcells.txt の内容 */
    
  // マークアップ属性
  CLASSNAME_CATALOG_TABLE : "akahuku_markup_catalog_table",

  /**
   * 初期化処理
   */
  init : function () {
  },
  
  /**
   * 終了処理
   */
  term : function () {
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

      var cattable = "table." + arAkahukuCatalog.CLASSNAME_CATALOG_TABLE;
            
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
        .addRule (cattable + '[border="1"] td',
                  "border-width: 1px; "
                  + "padding: 1px;")
        .addRule (cattable + '[border="1"] td[__age="9"]:not([__preserved]),'
                  + cattable + '[border="1"] td[__age="9"][__preserved="0"],'
                  + cattable + '[border="1"] td[__age="10"][__preserved="0"],'
                  + cattable + '[border="1"] td[__age="10"]:not([__preserved]),'
                  + cattable + '[border="1"] td[__age="-1"]',
                  "border-width: 2px; "
                  + "padding: 0px;")
        // 枠無しのカタログでの赤枠 (ニュース表など)
        .addRule (cattable + ':not([border="1"]) td[__age="9"],'
                  + cattable + ':not([border="1"]) td[__age="10"],'
                  + cattable + ':not([border="1"]) td[__age="-1"]',
                  "border-width: 1px;")
      }
      // 更新前を残す
      style
      .addRule ('td[__overflowed="true"]',
                "background-color: #ddddcc;")
      // 開かれているスレ
      .addRule (cattable + '[border="1"] td[__opened]',
                "border-style: outset;"
                + "box-shadow: 1px 1px #d8b2b2;")
      .addRule (cattable + ':not([border="1"]) td[__opened]',
                "border-style: outset;"
                + "border-width: 1px;")
      // 要素追加のカスタムイベント発行用
      .addRule ("#akahuku_appending_container",
                "display: none; ")
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
      arAkahukuCatalog.enableReorderStickByText
        = arAkahukuConfig
        .initPref ("bool", "akahuku.catalog.reorder.stick-by-text.enable", false);
      var value = arAkahukuConfig
        .initPref ("char", "akahuku.catalog.reorder.stick-by-text.pattern", "");
      if (!arAkahukuCatalog.enableReorderStickByText) {
        value = "";
      }
      if (arAkahukuCatalog.lastPatternStickByText != value) {
        arAkahukuCatalog.lastPatternStickByText = value;
        arAkahukuCatalog.ageStickByTextPattern ++;
        arAkahukuCatalog.patternsToStickByText
          = arAkahukuCatalog.parseStickByTextPattern (unescape (value));
      }
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
            = AkahukuFileUtil.Path
            .join (arAkahukuFile.systemDirectory, "lastcells.txt");
            
          Akahuku.debug.error('NotYetImplemented (load from lastcells.txt)');
          /* TODO: implement IDB File Storage
          IDBFiles.getFileStorage({name: 'systemFiles'})
          .then(async (storage) => {
            let file = await storage.get('/lastcells.txt');
            return file.open('readonly').then(async (fh) => {
              let meta = await fh.getMetadata();
              return fh.readAsText(meta.size)
                .finally(() => fh.close());
            })
          })
          .then (function (text) {
            arAkahukuCatalog.lastCellsText = text;
            var currentBoard = "";
            var parser = function (matched, line) {
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
            };
            text.replace (/([^\n\r]+)[\r\n]+/g, parser);
          }, function (e) {
            Akahuku.debug.warn ("loading lastcells.txt faild; " + e.name);
          });
          */
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
        /* TODO: implement IDB File Storage
        IDBFiles.getFileStorage({name: 'systemFiles'})
          .then((storage) => storage.get('/lastcells.txt'))
          .then((storage) => {
            storage.remove('/lastcells.txt');
          }, (rejected) => {
            // 無いなら無視
          })
          .catch((e) => Akahuku.debug.exception(e));
        */
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
    arAkahukuCatalog.enableObserveOpenedReload
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.observe.opened.reload", true)
    && arAkahukuCatalog.enableObserveOpened;

    arAkahukuCatalog.enableCellWidth
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.cellwidth.enable", false);
    arAkahukuCatalog.cellWidthNum
    = parseFloat (arAkahukuConfig
    .initPref ("char", "akahuku.catalog.cellwidth.num", "50.0"));
    var cellWidthUnit
    = arAkahukuConfig
    .initPref ("char", "akahuku.catalog.cellwidth.unit", "px");
    var isValidCellWidthUnit = false;
    ["px", "vh", "vw", "rem"].forEach (function (u) {
      if (u == cellWidthUnit) {
        isValidCellWidthUnit = true;
        return;
      }
    });
    if (isValidCellWidthUnit) {
      arAkahukuCatalog.cellWidthUnit = cellWidthUnit;
    }
    else {
      Akahuku.debug.warn ("invalid value for arAkahukuCatalog.cellWidthUnit");
      arAkahukuCatalog.cellWidthUnit = "px";
    }
    arAkahukuCatalog.cellWidthMaxLines
    = parseFloat (arAkahukuConfig
    .initPref ("char", "akahuku.catalog.cellwidth.max-lines", "2.0"));
    arAkahukuCatalog.enableCellWidthImg
    = arAkahukuConfig
    .initPref ("bool", "akahuku.catalog.cellwidth.scale-thumb", true);
        
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
   * 「本文で分ける」のパターン文字列を解析
   *
   * @parama String text コンマ区切りのパターン
   * @return Array [{pattern: new RegExp(), label: ""},...]
   */
  parseStickByTextPattern : function (text) {
    var ret = [];
    // コンマ区切り(\,でエスケープ可)を分解
    text.replace (/[\r\n]/g, "").replace (/,/g, "\n")
    .replace (/\\\n/g, ",").split (/\n/g)
    .forEach (function (token) {
      // 前後の空白は除外
      token = token.replace (/(^\s*|\s*$)/g, "");
      if (!token) {
        return;
      }
      var obj = {pattern: null, label: token};
      var flags = "";
      var pat;
      try {
        if (token.match (/^\/(.*)\/([gimy]*)$/)) {
          // "/asdf/" はそのまま正規表現に
          pat = RegExp.$1;
          flags = RegExp.$2;
        }
        else { // 文字列
          flags = "i";
          // 半角全角を区別しない ("a" => "[aａＡ]")
          pat = token.replace (/[\u0021-\u007e]/g, // "!"-"~"
            function (matched) {
              var c = matched.charCodeAt (0);
              if (c < 0xfee0) {
                var ca = c;
                var cw = c + 0xfee0; // 半角を全角へ
              }
              else {
                var ca = c - 0xfee0; // 全角を半角へ
                var cw = c;
              }
              if (0xff21 <= cw && cw <= 0xff3a) {// "Ａ"-"Ｚ"
                var cw2 = cw + 0x0020; // 大文字を小文字へ
              }
              else if (0xff41 <= cw && cw <= 0xff5a) {// "ａ"-"ｚ"
                var cw2 = cw - 0x0020; // 小文字を大文字へ
              }
              var s1 = String.fromCharCode (ca);
              var s2 = String.fromCharCode (cw, cw2);
              // 正規表現の特殊文字をエスケープ
              s1 = s1.replace (/[\[\]\\]/g, "\\$&");
              return "[" + s1 + s2 + "]";
            });
          // スペースは全角空白にもマッチさせる
          pat = pat.replace (/ /g, "[ \u3000]");
        }
        if (pat) {
          obj.pattern = new RegExp (pat, flags);
          ret.push (obj);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    });
    return ret;
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
        
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var info = documentParam.location_info;
        
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
    var checkSticky
    = arAkahukuCatalog.enableReorderSticky
    && doReorderToWidth;
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
    = checkVisited || checkNew || dispCreatetime || dispDeltaHeaders ||
      checkSticky;
    var isBackCompat = (targetDocument.compatMode == "BackCompat");
        
    var visitedState = (checkVisited ? 0 : 1);
    var newState = (checkNew ? 0 : 1);
    var stickyState = (checkSticky ? 0 : 1);
    var diff = 0;
    var entire = false;
    var overflowedCount = 0;
    var leftNum = 0;
    var diffAll = 0;

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

      if (checkSticky
          && stickyState == 0) {
        if (i == 0) {
          if (mergedItems [i].isSticky) {
            setRowHeaderText (tr, "\u03C6"); // greece small letter phi
          }
          else {
            stickyState = 1;
          }
        }
        else if (!mergedItems [i].isSticky) {
          stickyState = 1;
          var diffSticky = (i - diff) % columns;
          diff = i % columns;
          diffAll = i;

          if (diffSticky != 0) { // 改行
            tr = targetDocument.createElement ("tr");
            tbody.appendChild (tr);
            createRowHeader (tr, (i - diff));
          }
        }
      }

      if (checkNew
          && newState == 0
          && stickyState != 0) {
        if (i == diffAll) {
          if (!mergedItems [i].isNew) {
            newState = 1;
          }
          else {
            setRowHeaderText (tr, "\u65B0\u898F"); //"新規"
          }
        }
        else if (!mergedItems [i].isNew) {
          newState = 1;
          var diffNew = (i - diff) % columns;
          diff = i % columns;
          diffAll = i;
                    
          if (diffNew != 0) { // 改行
            tr = targetDocument.createElement ("tr");
            tbody.appendChild (tr);
            createRowHeader (tr, (i - diff));
          }
        }
      }
            
      if (checkVisited
          && visitedState == 0
          && newState != 0
          && stickyState != 0) {
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

      // "未読"が必要か
      if ((checkVisited || checkNew || checkSticky) &&
          stickyState != 0 && newState != 0 && visitedState != 0) {
        if (i == diffAll) {
          setRowHeaderText (tr, "\u672A\u8AAD"); // "未読"
          // Sticky のみの場合は空白ヘッダ
          if (checkSticky && !checkVisited && !checkNew &&
              !dispCreatetime && !dispDeltaHeaders) {
            needHeader = false;
            if (i == 0) {
              tr.removeChild (tr.firstChild);
            }
            else {
              setRowHeaderText (tr, "");
              tr.firstChild.rowSpan = "0";
            }
          }
          // 新規・既読による端数も overflowed を残す分に含める
          leftNum += ((diffAll + overflowedCount) % columns);
          overflowedCount = 0;
        }
      }
            
      if (parseInt (mergedItems [i].threadId) > latestThread) {
        latestThread = parseInt (mergedItems [i].threadId);
      }
            
      var td = null;
      if (mergedItems [i].td) {
        td = mergedItems [i].td;
                
        var img = td.getElementsByTagName ("img");
        if (img && img [0] &&
            img [0].complete &&
            img [0].naturalWidth == 0) {
          // 読み込み失敗確定の画像を再読み込み
          img [0].src = img [0].src;
        }
      }
      else {
        Akahuku.debug.error ("TD should be created before; " +
            "threadId=" + mergedItems [i].threadId);
        // fail safe (カスタムイベント発行無し)
        td = arAkahukuCatalog.createCell (mergedItems [i], targetDocument, info);
      }
            
      try {
        if (documentParam.flags.existsAimaAimani) {
          /* TODO: communicate with Aima_Aimani
            scope.Aima_Aimani.hideNGNumberCatalogueHandler (td);
            // 古い合間合間にの挙動を修正 (enableCellWidth関係)
            arAkahukuCatalog.fixAimaAimaniInlineStyle (td);
          */
        }
      }
      catch (e) { Akahuku.debug.exception (e);
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
            imageWidth = nodes [j].getAttribute ("width");
            imageHeight = nodes [j].getAttribute ("height");
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
      Akahuku.debug.error('NotYetImplemented (save to lastcells.txt)');
      /* TODO: implement IDB File Storage
      IDBFiles.getFileStorage({name: 'systemFiles'})
      .then((sto) => sto.put('/lastcells.txt', new Blob([newText])))
      .catch (function (e) {
        Akahuku.debug.exception (e);
      });
      */
    }
  },

  /**
   * マージデータの挿入準備(要素生成,属性更新,カスタムイベント発行)
   *
   * @param  Array [arAkahukuMergeItem,...] mergedItems
   *         カタログのマージ用のデータ
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  prepareMergeItems : function (mergedItems, targetDocument) {
    var param = Akahuku.getDocumentParam (targetDocument);
    var info = param.location_info;

    var tdCreated = false;
    var td;

    var appending_container
      = targetDocument.getElementById ("akahuku_appending_container");
    if (!appending_container) {
      // 拡張間連携のための不可視の一時挿入場所
      appending_container = targetDocument.createElement ("div");
      appending_container.id = "akahuku_appending_container";
      targetDocument.body.appendChild (appending_container);
    }

    var checkAll4StickByText = false;
    var age = "ageStickByTextPattern";
    if (param.catalog_param [age] != arAkahukuCatalog [age]) {
      // 設定変更があったため全セルをチェック
      checkAll4StickByText = true;
      param.catalog_param [age] = arAkahukuCatalog [age];
    }

    for (var i = 0; i < mergedItems.length; i ++) {
      td = mergedItems [i].td;
      if (td) {
        // 既に td 要素があった場合
        tdCreated = false;
        if (mergedItems [i].oldReplyNumber >= 0) {
          td.setAttribute ("__old_reply_number",
                           mergedItems [i].oldReplyNumber);
          td.removeAttribute ("__is_up");
        }
        if (!mergedItems [i].isNew) {
          td.removeAttribute ("__is_new");
        }
        td.setAttribute ("__original_index", mergedItems [i].index);
      }
      else {
        // td 要素が新たに必要になる場合
        tdCreated = true;
        td = arAkahukuCatalog.createCell
        (mergedItems [i], targetDocument, info);
        mergedItems [i].td = td;
      }

      if (mergedItems [i].overflowed) {
        td.setAttribute ("__overflowed", "true");
      }
      else {
        td.removeAttribute ("__overflowed");
      }
      if (mergedItems [i].currentReplyNumber >= 0) {
        td.setAttribute ("__reply_number",
            mergedItems [i].currentReplyNumber);
      }

      if ((arAkahukuCatalog.enableReorderStickByText && tdCreated) ||
          checkAll4StickByText) {
        arAkahukuCatalog.checkCell4StickByText (td, checkAll4StickByText);
      }

      // 連携したい他の拡張機能の支援(カスタムイベント)
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

      // 古い合間合間にの挙動を修正 (enableCellWidth関係)
      arAkahukuCatalog.fixAimaAimaniInlineStyle (td);

      // イベントハンドラによるセルへの変更を内部情報へ反映
      mergedItems [i].isSticky = arAkahukuCatalog.isStickyCell (td);

      appending_container.removeChild (td);
    }
  },

  checkCell4StickByText : function (td, optUnflag) {
    if (!arAkahukuCatalog.enableReorderStickByText) {
      if (optUnflag) {
        arAkahukuCatalog.setCellSticky (td, false);
      }
      return;
    }

    var e1 = td.getElementsByClassName ("akahuku_comment") [0];
    var text1 = (e1 ? e1.textContent : "");
    var e2 = td.getElementsByClassName ("akahuku_native_comment") [0];
    var text2 = (e2 ? e2.textContent : "");
    // 長い方を検索対象に
    var text = (text1.length > text2.length ? text1 : text2);

    var pats = arAkahukuCatalog.patternsToStickByText;
    for (var i = 0; i < pats.length; i ++) {
      if (pats [i].pattern.test (text)) {
        arAkahukuCatalog.setCellSticky (td, true, pats [i].label);
        return;
      }
    }
    if (optUnflag) {
      arAkahukuCatalog.setCellSticky (td, false);
    }
  },

  fixAimaAimaniInlineStyle : function (td) {
    var nodes = td.querySelectorAll
      ("small:not(.aima_aimani_generated)[style*='display'],"
       + "small:not(.aima_aimani_warning)[style*='display'],"
       + "div.akahuku_comment[style*='display'],"
       + "img[style*='display'], a[style*='display']");
    for (var j = 0; j < nodes.length; j ++) {
      var displayToBeCleared
        = (nodes [j].nodeName.toLowerCase () == "div"
            ? "block"
            : "inline");
      if (nodes [j].style.display == displayToBeCleared) {
        nodes [j].style.display = "";
      }
    }
  },

  /**
   * セルの要素の生成
   *
   * @param  arAkahukuMergeItem mergedItem
   *         カタログのマージ用のデータ
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  createCell : function (mergedItem, targetDocument, info) {
    if (mergedItem.td) {
      return mergedItem.td;
    }

    var td = targetDocument.createElement ("td");
    /* mergedItem.innerHTML には HTML が含まれるので
     * innerHTML を使用する */
    td.innerHTML = mergedItem.innerHTML;

    if (mergedItem.className
        && mergedItem.className != "undefined"
        && mergedItem.className != "null") {
      td.className = mergedItem.className;
    }

    // 必須の属性を updateCell より先に設定
    td.setAttribute ("__original_index", mergedItem.index);
    td.setAttribute ("__thread_id", mergedItem.threadId);
    if (mergedItem.isNew) {
      td.setAttribute ("__is_new", "true");
    }
    else {
      td.setAttribute ("__is_up", "true");
    }

    arAkahukuCatalog.updateCell (td, info);

    // 芝刈り
    if (arAkahukuLink.enableHideTrolls
        && !arAkahukuLink.enableHideTrollsNoCat) {
      arAkahukuLink.applyHideTrolls (targetDocument, td);
    }

    // マークは生成時から (最適化)
    if (arAkahukuCatalog.enableVisited) {
      arAkahukuCatalog.setCellVisited (td, mergedItem.visited);
    }
    if (arAkahukuCatalog.enableObserveOpened) {
      arAkahukuCatalog.setCellOpened (td, mergedItem.opened);
    }

    return td;
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

  /**
   *  別タブ等でスレが開かれているか非同期調査
   */
  isOpenedAsync : function (uri, callback) {
    AkahukuCentral.isURLOpened(uri)
      .then((opened) => {
        if (typeof callback === "function") {
          callback.apply (null, [opened]);
        }
        else {
          callback.isOpened.apply (callback, [uri, opened]);
        }
      });
  },
    
  isStickyCell : function (cell) {
    if (arAkahukuCatalog.enableReorderSticky) {
      return cell.hasAttribute ("__sticky");
    }
    return false;
  },

  setCellSticky : function (cell, isSticky, optValue) {
    optValue = optValue || "sticky";
    if (isSticky) {
      cell.setAttribute ("__sticky", optValue);
    }
    else {
      cell.removeAttribute ("__sticky");
    }
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
        var browser = arAkahukuWindow
          .getBrowserForWindow (targetDocument.defaultView);
        var thread = arAkahukuSidebar.getThread (name, num, browser);
        if (thread) {
          if (thread.comment) {
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
      var browser = arAkahukuWindow
        .getBrowserForWindow (targetDocument.defaultView);
      var thread
        = arAkahukuSidebar.getThread
        (name, tdElement.getAttribute ("__thread_id"), browser);
      if (thread) {
        if (thread.comment) {
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
    var oldReplyNum
      = parseInt (td.getAttribute ("__old_reply_number"));

    var threadId = parseInt (td.getAttribute ("__thread_id"));
    if (threadId) {
      var doNotifyReplyNumber = false;
      if (oldReplyNum != oldReplyNum) { // isNaN
        // ページを開いた時やスレが new/up の時
        doNotifyReplyNumber = true;
      }
      else { // [最新に更新]後など履歴がある場合
        if (newReplyNum > oldReplyNum) {
          doNotifyReplyNumber = true;
        }
      }
      if (doNotifyReplyNumber) {
        var param = Akahuku.getDocumentParam (td.ownerDocument);
        var info = param.location_info;
        arAkahukuThread.asyncNotifyReplyNumber (info, threadId, newReplyNum);
      }
    }
    else {
      Akahuku.debug.error ("td has no attr __thread_id");
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
    var table = null;
    var className = arAkahukuCatalog.CLASSNAME_CATALOG_TABLE;

    // マーク済み
    table = arAkahukuDOM.getFirstElementByNames (targetDocument,
        "", className);
    if (table) {
      return table;
    }

    // 初回のノード探索
    table = targetDocument.getElementsByTagName ("table") [1];
    if (!table) {
      /* 避難所 patch */
      table = targetDocument.getElementsByTagName ("table") [0];
    }

    if (table) {
      arAkahukuDOM.addClassName (table, className);
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
    var compareForReorderToWidth = function (x, y) {
      if (arAkahukuCatalog.enableReorderSticky) {
        if (x.isSticky && !y.isSticky) {
          return -1;
        }
        else if (!x.isSticky && y.isSticky) {
          return 1;
        }
      }
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
    };
    if (!arAkahukuCatalog.enableReloadLeftBefore
        && !arAkahukuCatalog.enableReorderNew
        && !arAkahukuCatalog.enableReorderSticky
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
    var isSticky = false;
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
        isSticky = false;
                
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [i]);
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          opened = arAkahukuCatalog.isOpenedCell (oldCells [i]);
        }
        if (arAkahukuCatalog.enableReorderSticky) {
          isSticky = arAkahukuCatalog.isStickyCell (oldCells [i]);
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
             isSticky: isSticky,
            }));

        if (arAkahukuCatalog.enableReorderVisited) {
          let anchor
            = arAkahukuDOM.getFirstElementByNames(oldCells[i], "a");
          if (anchor && anchor.href) {
            let callback
              = param.historyCallbacks
              .createVisitedCallback(mergedItems[mergedItems.length-1]);
            HistoryService.isVisited(anchor.href)
              .then((visited) => callback.isVisited(anchor.href, visited))
              .catch((e) => Akahuku.debug.exception(e));
          }
        }
      }
      return mergedItems;
    }
        
    var oldTable = arAkahukuCatalog.getCatalogTable (targetDocument);
    if (!oldTable) {
      return;
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
            }));

        if (arAkahukuCatalog.enableReorderVisited) {
          let callback
            = param.historyCallbacks
            .createVisitedCallback(mergedItems[mergedItems.length-1]);
          let url = cell.href;
          HistoryService.isVisited(url)
            .then((visited) => callback.isVisited(url, visited))
            .catch((e) => Akahuku.debug.exception(e));
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          arAkahukuCatalog.isOpenedAsync
            (cell.href, param.historyCallbacks.createOpenedCallback
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
      arAkahukuCatalog.prepareMergeItems (mergedItems, targetDocument);
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
        
    var oldTable = arAkahukuCatalog.getCatalogTable (targetDocument);
    if (!oldTable) {
      return;
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
        if (arAkahukuCatalog.enableReorderVisited &&
            param.historyCallbacks.count > 0) {
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
              // 一時停止した後に更新を継続
              targetDocument.defaultView.setTimeout(() => {
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
              targetDocument.defaultView.setTimeout(() => {
                arAkahukuCatalog._update2
                  (targetDocument, oldTable, mergedItems, param);
              }, 0);
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
    
    param.responseText = "";
    param.reloadController = null;
  },
    
  _update2 : function (targetDocument, oldTable, mergedItems, param)
  {
    arAkahukuCatalog.prepareMergeItems (mergedItems, targetDocument);
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
        
    var oldTable = arAkahukuCatalog.getCatalogTable (targetDocument);
        
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
      var isSticky = false;
                
      if (oldCells [threadId]) {
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [threadId]);
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          opened = arAkahukuCatalog.isOpenedCell (oldCells [threadId]);
        }
        if (arAkahukuCatalog.enableReorderSticky) {
          isSticky = arAkahukuCatalog.isStickyCell (oldCells [threadId]);
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
             isSticky: isSticky,
            }));
                
        if (arAkahukuCatalog.enableReorderVisited) {
          let anchor
            = arAkahukuDOM.getFirstElementByNames(oldCells[threadId], "a");
          if (anchor && anchor.href) {
            let callback
              = param.historyCallbacks
              .createVisitedCallback(mergedItems[mergedItems.length-1]);
            let url = anchor.href;
            HistoryService.isVisited(url)
              .then((visited) => callback.isVisited(url, visited))
              .catch((e) => Akahuku.debug.exception(e));
          }
        }

        delete oldCells [threadId];
      }
      else {
        nums [parseInt (threadId)] = true;
        if (newestId < parseInt (threadId)) {
          newestId = parseInt (threadId);
        }
        
        let url = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableVisited
            || arAkahukuCatalog.enableObserveOpened) {
          let href = /href=['"]?([^\s'"]+)/.exec (currentTdText) [1];
          let anchor = targetDocument.createElement ("a");
          anchor.setAttribute('href', href);
          url = anchor.href;
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
            }));

        if (url && (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableVisited)) {
          // 新しいスレに既読判定が必要な場合
          let callback
            = param.historyCallbacks
            .createVisitedCallback(mergedItems[mergedItems.length-1]);
          HistoryService.isVisited(url)
            .then((visited) => callback.isVisited(url, visited))
            .catch((e) => Akahuku.debug.exception(e));
        }
        if (arAkahukuCatalog.enableObserveOpened && url) {
          arAkahukuCatalog.isOpenedAsync
            (url, param.historyCallbacks.createOpenedCallback
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
        let url = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableObserveOpened) {
          let anchor
            = arAkahukuDOM.getFirstElementByNames(oldCells[threadId], "a");
          if (anchor) {
            url = anchor.href;
          }
        }
        if (arAkahukuCatalog.enableObserveOpened) {
          opened = arAkahukuCatalog.isOpenedCell (oldCells [threadId]);
        }
        if (arAkahukuCatalog.enableReorderSticky) {
          isSticky = arAkahukuCatalog.isStickyCell (oldCells [threadId]);
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
           isSticky: isSticky,
          }));

        if (arAkahukuCatalog.enableReorderVisited && url) {
          let callback
            = param.historyCallbacks
            .createVisitedCallback(mergedItems[mergedItems.length-1]);
          HistoryService.isVisited(url)
            .then((visited) => callback.isVisited(url, visited))
            .catch((e) => Akahuku.debug.exception(e));
        }
        if (arAkahukuCatalog.enableObserveOpened && url) {
          arAkahukuCatalog.isOpenedAsync
            (url, param.historyCallbacks.createOpenedCallback
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

        let url = null;
        if (arAkahukuCatalog.enableReorderVisited
            || arAkahukuCatalog.enableObserveOpened) {
          let anchor = targetDocument.createElement('a');
          anchor.setAttribute('href', cell.href);
          url = anchor.href;
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
            {visited: visited,
             isNew: false, overflowed: true,
            }));

        if (arAkahukuCatalog.enableReorderVisited && url) {
          let callback = param.historyCallbacks
            .createVisitedCallback(mergedItems[mergedItems.length-1]);
          HistoryService.isVisited(url)
            .then((visited) => callback.isVisited(url, visited))
            .catch((e) => Akahuku.debug.exception(e));
        }
        if (arAkahukuCatalog.enableObserveOpened && url) {
          arAkahukuCatalog.isOpenedAsync
            (url, param.historyCallbacks.createOpenedCallback
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
        var imgStatus = arAkahukuUtil.getImageStatus (nodes [i]);
        if (!imgStatus.requestURI) {
          continue;
        }
        if (imgStatus.isErrored) {
          nodes [i].src = nodes [i].src;
        }
        else if (imgStatus.requestImageStatus == 0) {
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
        
    if (param.reloadController) {
      param.reloadController.abort();
      param.reloadController = null;
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
        
    arAkahukuCatalog.setStatus
    ("\u30ED\u30FC\u30C9\u4E2D (\u30D8\u30C3\u30C0)",
     // "ロード中 (ヘッダ)"
     true, targetDocument);
        
    param.reloadController = new AbortController();
    let fetchInit = {
      credentials: 'include',
      cache: 'reload',
      redirect: 'follow',
      signal: param.reloadController.signal,
    };
    if (!arAkahukuCatalog.enableReloadUpdateCache) {
      fetchInit.cache = 'no-store';
    }
    fetch(targetDocument.location.href, fetchInit)
      .then((resp) => {
        if (resp.ok) {
          // "ロード中 (ボディ)"
          this.setStatus("\u30ED\u30FC\u30C9\u4E2D (\u30DC\u30C7\u30A3)",
            true, targetDocument);
          return resp.arrayBuffer();
        }
        else {
          this.setStatus("load error: " + resp.status,
            false, this.targetDocument);
          arAkahukuSound.playCatalogReload();
          throw new Error(resp.status + ' ' + resp.statusText);
        }
      }, (err) => {
        // "接続できませんでした"
        this.setStatus("\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
          true, targetDocument);
        throw err;
      })
      .then((buffer) =>
        arAkahukuConverter.asyncConvertArrayBufToBinStr(buffer))
      .then((binstr) => {
        param.responseText = binstr;
        if (binstr.length < 100 && binstr.length >= 10
          && binstr.substr (0, 10) == "\x96\x9e\x88\xf5\x82\xc5\x82\xb7\x81\x42") {
          //"満員です"
          this.setStatus("load error: \u6E80\u54E1\u3067\u3059",
            false, targetDocument);
        }
        else {
          // "更新中"
          this.setStatus("\u66F4\u65B0\u4E2D", true, targetDocument);
          this.update(targetDocument);
        }
        arAkahukuSound.playCatalogReload();
      })
      .catch((err) => {
        Akahuku.debug.exception(err);
      })
      .finally(() => {
        param.reloadController = null;
      });
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
        
    var oldTable = arAkahukuCatalog.getCatalogTable (targetDocument);
    if (!oldTable) {
      return;
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
    // 開いているかを最新に更新
    arAkahukuCatalog.updateOpened (targetDocument);
        
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
          var browser
          = arAkahukuWindow
          .getBrowserForWindow (targetDocument.defaultView);
          var thread
          = arAkahukuSidebar.getThread (name, num, browser);
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
            // none
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

    var table = arAkahukuCatalog.getCatalogTable (targetDocument);
    if (!table) {
      return;
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
      if (isHeader && arAkahukuDOM.hasClassName (td, "akahuku_header")) {
        // 分ける種類(新規など)が切り替わった
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
      var table = arAkahukuCatalog.getCatalogTable (targetDocument);
      if (!table) {
        return;
      }
      
      var nodes = table.getElementsByTagName ("a");
      
      var historyCallbacks = new arAkahukuMergeItemCallbackList ();
      for (var i = 0; i < nodes.length; i ++) {
        if (clear) {
          arAkahukuDOM.removeClassName (nodes [i], "akahuku_visited");
        }
        else {
          // customize for node operations
          let callback = historyCallbacks.createVisitedCallback (nodes [i]);
          callback.isVisitedHandler = function (uri, visited) {
            if (visited) {
              arAkahukuDOM.addClassName (this.wrappedObject, "akahuku_visited");
            }
            else {
              arAkahukuDOM.removeClassName (this.wrappedObject, "akahuku_visited");
            }
          };
          let url = nodes[i].href;
          HistoryService.isVisited(url)
            .then((visited) => {
              callback.isVisited(url, visited);
            })
            .catch((e) => Akahuku.debug.exception(e));
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
    var historyCallbacks = new arAkahukuMergeItemCallbackList ();
    var nodes = table.getElementsByTagName ("td");
    for (var i = 0; i < nodes.length; i ++) {
      var a = arAkahukuDOM.getFirstElementByNames (nodes [i], "a");
      try {
        var callback = historyCallbacks.createOpenedCallback (nodes [i]);
        callback.listener = function (uri, opened) {
          arAkahukuCatalog.setCellOpened (this.wrappedObject, opened);
        };
        arAkahukuCatalog.isOpenedAsync (a.href, callback);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }

    if (historyCallbacks.count > 0) {
      historyCallbacks.asyncWaitRequests
        (function () {
          historyCallbacks = null;
        });
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
      if (!td.hasAttribute ("__opened") ||
          !td.getAttribute ("__opened") !== "true") {
        td.setAttribute ("__opened", "true");
      }
      // undo/redo 後に GC がイベントリスナを削除する場合がある
      // 同一リスナの多重登録は問題ないので都度登録する
      td.addEventListener ("click", this.onClickOpenedCell, true);
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
    var uri = anchor.href;

    var targetWindow;

    var params = Akahuku.getDocumentParamsByURI (uri);
    if (params.length > 0) {
      // 現 Akahuku 管理下に対象のスレッドがある場合
      targetWindow = params [0].targetDocument.defaultView;
      arAkahukuWindow.focusTabForWindow (targetWindow);

      if (arAkahukuCatalog.enableObserveOpenedReload) {
        arAkahukuUtil.executeSoon (function (scope) {
          arAkahukuReload.reloadOnDemand (targetWindow.document);
        });
      }
    }
    else {
      // 元のイベントを再現する情報を保存
      var eventArgs = [
        event.type, event.bubbles, event.cancelable,
        anchor.ownerDocument.defaultView, event.detail,
        event.screenX, event.screenY, event.clientX, event.clientY,
        event.ctrlKey, event.altKey, event.shiftKey, event.metaKey,
        event.button, event.relatedTarget];
      var eventTarget = event.target;
      Tabs.focusByURL(uri,
        {reloadOnDemand: arAkahukuCatalog.enableObserveOpenedReload})
        .then((focused) => {
          if (!focused) {
            Akahuku.debug.warn ("Catalog: thread", uri, "is not opened?");
            var td = arAkahukuDOM.findParentNode (event.target, "td");
            if (td) {
              arAkahukuCatalog.setCellOpened (td, false);
              // dispatch replicated event
              var evNew = anchor.ownerDocument.createEvent ("MouseEvents");
              evNew.initMouseEvent.apply (evNew, eventArgs);
              eventTarget.dispatchEvent (evNew);
            }
          }
        })
        .catch((err) => {
            Akahuku.debug.exception(err);
        });
    }

    event.preventDefault ();
    event.stopPropagation ();
  },

  /**
   * 別タブで開いているであろうスレへ切り替える
   */
  asyncFocusByThreadURI : function (uri, anchor, callback) {
    Akahuku.debug.error('NotYetImplemented');
    window.setTimeout(() => {
      callback.apply(null, [false]);
    }, 10);
    return;
    /*
    arAkahukuIPC.sendAsyncCommand
      ("Catalog/asyncFocusByThreadURI", [uri, null, callback]);
    */
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
            
      var table = arAkahukuCatalog.getCatalogTable (targetDocument);
      if (!table) {
        return;
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

        if (arAkahukuCatalog.enableReorderStickByText) {
          arAkahukuCatalog.checkCell4StickByText (nodes [i]);
        }
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
        var createReorderOrderButton = function (aid, content, reorderWidth) {
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
        };
                
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
            
      var table = arAkahukuCatalog.getCatalogTable (targetDocument);
      if (!table) {
        return;
      }
            
      /* ズーム用にマウスのイベントを検出する */
      if (arAkahukuCatalog.enableZoom) {
        var param2 = new arAkahukuPopupParam (10, targetDocument);
        try { // Firefox 4+
          Object.defineProperty (param2.cacheImageData, "limit", {
            get : function () {
              return arAkahukuCatalog.zoomCacheCount;
            }})
        }
        catch (e) {
          param2.cacheImageData.limit = arAkahukuCatalog.zoomCacheCount;
        }
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
          // TODO: hook reload
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
   * 履歴追加/削除をカタログに反映する
   */
  onThreadHistoryChanged : function (targetDocument, url, visited) {
    if (!arAkahukuCatalog.enableVisited) {
      return;
    }
    url = new URL(url);
    var matched = url.hostname.match (/^([^.]+)\.2chan\.net$/);
    if (!matched)
      return;
    var server = matched [1];
    var path = url.pathname + url.search;
    matched = path.match (/^\/([^\/]+)\/(?:res\/|futaba\.php\?res=)(\d+)/);
    if (!matched)
      return;
    var dir = matched [1], id = matched [2];

    let param = Akahuku.getDocumentParam(targetDocument);
    if (param) {
      var info = param.location_info;
      if (!info.isCatalog
          || info.server != server
          || info.dir != dir) {
        return;
      }
      var td = arAkahukuCatalog.getThreadCell (targetDocument, id);
      if (td) {
        arAkahukuCatalog.setCellVisited (td, visited);
      }
    }
  },
};
