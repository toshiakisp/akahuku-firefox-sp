/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter
 *          arAkahukuDocumentParam, arAkahukuDOM, arAkahukuHistory,
 *          arAkahukuLink, arAkahukuP2P, arAkahukuPopup, arAkahukuSidebar,
 *          arAkahukuSound
 */

/**
 * [最新に更新] のキャッシュ書き込み
 *   Inherits From: nsICacheListener
 */
function arAkahukuCatalogCacheWriter () {
}
arAkahukuCatalogCacheWriter.prototype = {
  responseHead : "", /* String  応答のヘッダ */
  body : "",         /* String  キャッシュの内容 */
  charset : "",      /* String  文字コード */
    
  /**
   * キャッシュの各パートを構築する
   *
   * @param  String text
   *         キャッシュの全体
   * @return Boolean
   *         構築できたか
   */
  setText : function (text) {
    this.body = text;
        
    return true;
  },
            
  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheListener.onCacheEntryAvailable
   * 差分位置を取得する
   *
   * @param  nsICacheEntryDescriptor descriptor
   *         キャッシュの情報
   * @param  nsCacheAccessMode accessGranted
   *         アクセス権限
   * @param  nsresult status
   *         不明
   */
  onCacheEntryAvailable : function (descriptor, accessGranted, status) {
    if (accessGranted == Components.interfaces.nsICache.ACCESS_WRITE) {
      /* キャッシュの書き込み */
            
      descriptor.setExpirationTime (0);
            
      var ostream = descriptor.openOutputStream (0);
      ostream.write (this.body, this.body.length);
      ostream.flush ();
      ostream.close ();
            
      descriptor.markValid ();
            
      descriptor.setMetaDataElement ("request-method", "GET");
      descriptor.setMetaDataElement ("response-head",
                                     this.responseHead);
      descriptor.setMetaDataElement ("charset", this.charset);
            
      descriptor.close ();
    }
  }
};
/**
 * カタログのポップアップデータ
 *   Inherits From: arAkahukuPopupData
 *
 * @param  HTMLImageElement targetImage
 *         対象のカタログ画像
 */
function arAkahukuCatalogPopupData (targetImage) {
  this.targetImage = targetImage;
}
arAkahukuCatalogPopupData.prototype =  {
  state : 0,                  /* Number  ポップアップの状態
                               *   0: ポップアップ表示待ち
                               *   1: 拡大中
                               *   2: 拡大完了
                               *   3: 縮小中
                               *   4: 削除 */
  targetImage : null,         /* HTMLImageElement  対象のカタログ画像 */
  key : "",                   /* String  キャッシュのキー */
  popup : null,               /* HTMLDivElement  表示中のポップアップ */
  zoomFactor : 0,             /* Number  拡大の状態 */
  lastTime : 0,               /* Number  動作のタイマーの前回の時間 */
  createTimerID : null,       /* Number  表示待ち状態のタイマー ID */
  targetImageGeometry : null, /* Object  対象のカタログ画像の位置、サイズ */
  zoomImageGeometry : null,   /* Object  ズーム先の位置、サイズ */
    
  /**
   * データを開放する
   *   arAkahukuPopupData.destruct
   */
  destruct : function () {
    this.targetImage = null;
    this.popup = null;
    if (this.createTimerID) {
      clearTimeout (this.createTimerID);
      this.createTimerID = null;
    }
    this.targetImageGeometry = null;
    this.zoomImageGeometry = null;
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
      clearTimeout (this.createTimerID);
      this.createTimerID = null;
    }
        
    this.state = state;
    switch (state) {
      case 0:
        var timeout = arAkahukuCatalog.zoomTimeout;
                
        var exists = false;
        if (param.cacheImageData.exists (this.key)) {
          exists = true;
        }
        else if (arAkahukuP2P.enable) {
          var targetSrc
            = this.targetImage.src.replace ("/cat/", "/thumb/");
          if (arAkahukuP2P.getCacheFile (targetSrc)) {
            exists = true;
          }
        }
        if (!exists) {
          /* Firefox にキャッシュされているかチェック */
          var cacheService
            = Components.classes ["@mozilla.org/network/cache-service;1"]
            .getService (Components.interfaces.nsICacheService);
          var httpCacheSession
            = cacheService
            .createSession ("HTTP",
                            Components.interfaces.nsICache.STORE_ANYWHERE,
                            true);
          httpCacheSession.doomEntriesIfExpired = false;
          var targetSrc
            = this.targetImage.src.replace ("/cat/", "/thumb/");
          try {
            var descriptor
              = httpCacheSession
              .openCacheEntry (targetSrc,
                               Components.interfaces.nsICache.ACCESS_READ,
                               true);
            exists = true;
            descriptor.close ();
          }
          catch (e) {
            /* キャッシュが存在しなかった場合 */
          }
        }
                
        if (!arAkahukuCatalog.enableZoomClick
            && !exists
            && timeout < 1000) {
          timeout = 1000;
        }
            
        this.createTimerID
          = setTimeout (this.createPopup,
                        timeout,
                        param, this, targetDocument);
        break;
      case 1:
        this.targetImage.style.MozOpacity = 0;
        this.lastTime = new Date ().getTime ();
        arAkahukuPopup.addEffector (param,
                                    this,
                                    this.zoominEffect);
        break;
      case 2:
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
                      == "akahuku_cell") {
                                        
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
              var uri
                = Components
                .classes ["@mozilla.org/network/standard-url;1"]
                .createInstance (Components.interfaces.nsIURI);
              uri.spec = anchor.href;
              var visited = arAkahukuHistory.isVisited (uri);
              if (visited) {
                arAkahukuDOM.addClassName (anchor, "akahuku_visited");
              }
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
        this.targetImage.style.MozOpacity = 1;
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
    var min = targetDocument.body.scrollLeft;
    if (min < targetDocument.documentElement.scrollLeft) {
      min = targetDocument.documentElement.scrollLeft;
    }
    if (this.zoomImageGeometry.left < min) {
      this.zoomImageGeometry.left = min;
    }
    min = targetDocument.body.scrollTop;
    if (min < targetDocument.documentElement.scrollTop) {
      min = targetDocument.documentElement.scrollTop;
    }
    if (this.zoomImageGeometry.top < min) {
      this.zoomImageGeometry.top =  min;
    }
    var max = targetDocument.body.scrollLeft
    + targetDocument.body.clientWidth;
    if (max > targetDocument.body.scrollLeft
        + targetDocument.body.clientWidth) {
      max = targetDocument.documentElement.scrollLeft
        + targetDocument.documentElement.clientWidth;
    }
    if (this.zoomImageGeometry.left + this.zoomImageGeometry.width
        >= max - 1) {
      this.zoomImageGeometry.left
      = max - this.zoomImageGeometry.width - 2;
    }
    max = targetDocument.body.scrollTop
    + targetDocument.body.clientHeight;
    if (max > targetDocument.body.scrollTop
        + targetDocument.body.clientHeight) {
      max = targetDocument.documentElement.scrollTop
        + targetDocument.documentElement.clientHeight;
    }
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
    if (!this.targetImageGeometry) {
      this.getImageGeometry (this.targetImage.ownerDocument);
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
      var src = self.targetImage.src;
      src = src.replace ("/cat/", "/thumb/");
      src = arAkahukuP2P.tryEnP2P (src);
      image.src = src;
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
        
    anchor.appendChild (image);
    self.popup.appendChild (anchor);
        
    self.zoomFactor = 0;
        
    self.updatePopupGeometry ();
        
    targetDocument.body.appendChild (self.popup);
        
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
    this.popup = null;
    if (this.createTimerID) {
      clearTimeout (this.createTimerID);
      this.createTimerID = null;
    }
    this.baseNodeGeometry = null;
    this.popupGeometry = null;
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
      clearTimeout (this.createTimerID);
      this.createTimerID = null;
    }
        
    this.state = state;
    switch (state) {
      case 0:
        var timeout = arAkahukuCatalog.zoomCommentTimeout;
                
        this.createTimerID
          = setTimeout (this.createPopup,
                        timeout,
                        param, this, targetDocument);
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
    var min = targetDocument.body.scrollLeft;
    if (min < targetDocument.documentElement.scrollLeft) {
      min = targetDocument.documentElement.scrollLeft;
    }
    if (this.popupGeometry.left < min) {
      this.popupGeometry.left = min;
    }
    min = targetDocument.body.scrollTop;
    if (min < targetDocument.documentElement.scrollTop) {
      min = targetDocument.documentElement.scrollTop;
    }
    if (this.popupGeometry.top < min) {
      this.popupGeometry.top =  min;
    }
    var max = targetDocument.body.scrollLeft
    + targetDocument.body.clientWidth;
    if (max > targetDocument.body.scrollLeft
        + targetDocument.body.clientWidth) {
      max = targetDocument.documentElement.scrollLeft
        + targetDocument.documentElement.clientWidth;
    }
    if (this.popupGeometry.left + this.popupGeometry.width
        >= max - 1) {
      this.popupGeometry.left
      = max - this.popupGeometry.width - 2;
    }
    max = targetDocument.body.scrollTop
    + targetDocument.body.clientHeight;
    if (max > targetDocument.body.scrollTop
        + targetDocument.body.clientHeight) {
      max = targetDocument.documentElement.scrollTop
        + targetDocument.documentElement.clientHeight;
    }
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
                             oldReplyNumber, visited, isNew, overflowed,
                             className) {
  this.td = td;
  this.innerHTML = innerHTML;
  this.index = index;
  this.threadId = threadId;
  this.currentReplyNumber = currentReplyNumber;
  this.oldReplyNumber = oldReplyNumber;
  this.visited = visited;
  this.isNew = isNew;
  this.overflowed = overflowed;
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
  isNew : false,          /* Boolean  新規かどうか */
  overflowed : false      /* Boolean  オーバーフローしたか */
};
/**
 * カタログ管理データ
 *   Inherits From: nsISHistoryListener,
 *                  nsIRequestObserver, nsIStreamListener
 */
function arAkahukuCatalogParam () {
  this.order = "akahuku_catalog_reorder_default";
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
  oldThreads : null,      /* Array  最新に更新で消えたスレ
                           *   [arAkahukuMergeItem, ...] */
    
  sstream : null,         /* nsIScriptableInputStream  データ到着時に
                           *   読み込むストリーム */
  responseHead : "",      /* String  応答のヘッダ */
  responseText : "",      /* String  応答のデータ */
    
  writer : null,          /* arAkahukuCatalogCacheWriter
                           *   キャッシュ書き込み */
    
  addedLastCells : false, /* Boolean  最後のセルを追加したか */
    
  /**
   * データを開放する
   */
  destruct : function () {
    if (this.reloadChannel) {
      try {
        this.reloadChannel.cancel (0x80020006);
        /* NS_BINDING_ABORTED */
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
    this.targetDocument = null;
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
                                  "charset=EUC-JP");
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    if (this.reloadChannel == null) {
      return;
    }
        
    if (httpStatus == 200) {
      this.responseHead = responseHead;
            
      arAkahukuCatalog.setStatus ("\u66F4\u65B0\u4E2D",
                                  true, this.targetDocument);
            
      setTimeout
      (arAkahukuCatalog.update,
       10,
       this.targetDocument);
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
  }
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
  reorderSaveType : 0,          /* Number  状態
                                 *   0:  通常
                                 *   1:  ページごと
                                 *   2:  更新順に指定幅ずつ
                                 *   -1: スレの立った順に指定幅ずつ */
  enableReorderVisited : false, /* Boolean  未読と既読で分ける */
  enableReorderNew : false,     /* Boolean  最新に更新で新規を分ける */
  enableReorderFill : false,    /* Boolean  合間合間に で消した分を詰める */
    
  enableZoom : false,         /* Boolean  ズーム */
  enableZoomClick : false,    /* Boolean  クリックで開く */
  enableZoomNoAnim : false,   /* Boolean  アニメーションしない */
  zoomTimeout : 10,           /* Number  表示まで [ms] */
  zoomSize : 96,              /* Number  サイズ [px] */
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
                  + "padding-right: 8px;")
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
        .addRule ("a.akahuku_catalog_reorder",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_catalog_reorder:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_catalog_reorder_save:hover",
                  "font-size: 9pt; "
                  + "vertical-align: sub; "
                  + "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("a.akahuku_catalog_reorder_save",
                  "font-size: 9pt; "
                  + "vertical-align: sub; "
                  + "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;");
      }
      /* 一度見たスレをマーク */
      if (arAkahukuCatalog.enableVisited) {
        style
        .addRule ("td a",
                  "text-decoration: none;")
        .addRule ("td a font",
                  "color: #800000;")
        .addRule ("td a:visited font",
                  "background-color: #eeaa88;")
        .addRule ("td a.akahuku_visited font",
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
        .addRule ("#akahuku_catalog_reload_container",
                  "text-align: left; "
                  + "margin-bottom: 0.5em;")
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
      else if (arAkahukuCatalog.zoomSize > 250) {
        arAkahukuCatalog.zoomSize = 250;
      }
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
                   false);
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
      if (arAkahukuCatalog.enableReorderVisited
          || arAkahukuCatalog.enableReorderNew) {
        arAkahukuCatalog.enableReloadLeftBefore = false;
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
      }
      else if (checkVisited || checkNew) {
        var th = targetDocument.createElement ("th");
        tr.appendChild (th);
      }
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
        
    var checkVisited
    = arAkahukuCatalog.enableReorderVisited
    && (param.order == "akahuku_catalog_reorder_spec"
        || param.order == "akahuku_catalog_reorder_createtime");
    var checkNew
    = arAkahukuCatalog.enableReorderNew
    && (param.order == "akahuku_catalog_reorder_spec"
        || param.order == "akahuku_catalog_reorder_createtime");
        
    var visitedState = 0;
    var newState = 0;
    if (!checkNew) {
      newState = 1;
    }
    var diff = 0;
    var entire = false;
    var overflowedCount = 0;
    var leftNum = 0;

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
        if (overflowedCount < -leftNum) {
          continue;
        }
      }
            
      if ((i - diff) % columns == 0) {
        tr = targetDocument.createElement ("tr");
        tbody.appendChild (tr);
        createRowHeader (tr, (i - diff));
      }
      var newHeader = false;
      if (checkNew
          && newState == 0) {
        if (i == 0) {
          if (!mergedItems [i].isNew) {
            if (!checkVisited) {
              tr.firstChild.appendChild
                (targetDocument.createTextNode
                 ("\u65E2\u5B58"));
            }
            newState = 1;
          }
          else {
            tr.firstChild.appendChild
              (targetDocument.createTextNode
               ("\u65B0\u898F"));
            newHeader = true;
          }
        }
        else if (!mergedItems [i].isNew) {
          newState = 1;
          diff = i % columns;
                    
          tr = targetDocument.createElement ("tr");
          tbody.appendChild (tr);
          createRowHeader (tr, (i - diff));
                    
          if (!checkVisited) {
            tr.firstChild.appendChild
              (targetDocument.createTextNode
               ("\u65E2\u5B58"));
          }
        }
      }
            
      if (checkVisited
          && visitedState == 0
          && newState != 0) {
        if (i == 0) {
          if (mergedItems [i].visited) {
            if (!newHeader) {
              tr.firstChild.appendChild
              (targetDocument.createTextNode
               ("\u65E2\u8AAD"));
            }
          }
          else {
            if (!newHeader) {
              tr.firstChild.appendChild
              (targetDocument.createTextNode
               ("\u672A\u8AAD"));

            }
            visitedState = 1;
          }
        }
        else if (!mergedItems [i].visited) {
          visitedState = 1;
          diff = i % columns;
                    
          tr = targetDocument.createElement ("tr");
          tbody.appendChild (tr);
          createRowHeader (tr, (i - diff));
                    
          if (!newHeader) {
            tr.firstChild.appendChild
              (targetDocument.createTextNode
               ("\u672A\u8AAD"));
          }
        }
        else if (newState == 1) {
          tr.firstChild.appendChild
          (targetDocument.createTextNode
           ("\u65E2\u8AAD"));
        }
        newState = 2;
      }
            
      if (parseInt (mergedItems [i].threadId) > latestThread) {
        latestThread = parseInt (mergedItems [i].threadId);
      }
            
      var td = null;
      if (mergedItems [i].td) {
        td = mergedItems [i].td;
        if (mergedItems [i].oldReplyNumber != undefined) {
          td.setAttribute ("__old_reply_number",
                           mergedItems [i].oldReplyNumber);
        }
                
        var img = td.getElementsByTagName ("img");
        if (img && img [0]) {
          if (img [0].naturalWidth == 0) {
            img [0].src = img [0].src;
          }
        }
        td.setAttribute ("__is_new", "false");
      }
      else {
        var num = "";
        if (arAkahukuCatalog.enableReloadReplyNumberDelta) {
          num
            = "<div class=\"akahuku_cell\">"
            + (mergedItems [i].isNew ? "new" : "up")
            + "</div>";
        }
                
        td = targetDocument.createElement ("td");
        /* mergedItems [i].innerHTML には HTML が含まれるので
         * innerHTML を使用する */
        if (mergedItems [i].className
            && mergedItems [i].className != "undefined"
            && mergedItems [i].className != "null") {
          td.className = mergedItems [i].className;
        }
        td.innerHTML = num + mergedItems [i].innerHTML;
        td.setAttribute ("__is_new",
                         mergedItems [i].isNew ? "true" : "false");
                
        arAkahukuCatalog.updateCell (td, info);
                
        if (arAkahukuLink.enableHideTrolls
            && !arAkahukuLink.enableHideTrollsNoCat) {
          arAkahukuLink.applyHideTrolls (targetDocument, td);
        }
      }
            
      if (mergedItems [i].overflowed) {
        td.setAttribute ("__overflowed", "true");
        td.style.backgroundColor = "#ddddcc";
      }
      else {
        td.removeAttribute ("__overflowed");
        td.style.backgroundColor = "";
      }
            
      try {
        if (typeof Aima_Aimani != "undefined") {
          if (Aima_Aimani.hideNGNumberCatalogueHandler) {
            Aima_Aimani.hideNGNumberCatalogueHandler (td);
            if (td.style.display == "none") {
              entire = true;
              overflowedCount ++;
            }
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
            
      td.setAttribute ("__original_index", mergedItems [i].index);
      td.setAttribute ("__reply_number",
                       mergedItems [i].currentReplyNumber);
      td.setAttribute ("__thread_id", mergedItems [i].threadId);
      tr.appendChild (td);
    }
        
    param.latestThread = latestThread;
    arAkahukuThread.updateNewestNum (info, latestThread);
        
    oldTable.parentNode.removeChild (oldTable);
    if (entire) {
      arAkahukuCatalog.onHideEntireThread (targetDocument);
    }
        
    var nodes;
        
    for (i = 0, nodes = newTable.getElementsByTagName ("td");
         i < nodes.length; i ++) {
      if (nodes [i].getAttribute ("__old_reply_number") == undefined
          || nodes [i].getAttribute ("__old_reply_number") == "") {
        continue;
      }
            
      if (arAkahukuCatalog.enableReloadReplyNumberDelta) {
        var div = nodes [i].getElementsByTagName ("div") [0];
        if (div && !arAkahukuDOM.hasClassName (div, "akahuku_cell")) {
          /* akahuku_comment などの div を間違って消さないように */
          div = null;
        }
        var delta
          = parseInt (nodes [i].getAttribute ("__reply_number"))
          - parseInt (nodes [i].getAttribute ("__old_reply_number"));
        if (delta > 0) {
          delta = "+" + delta;
        }
        else if (delta == 0) {
          delta = "";
        }
                
        if (delta == "") {
          if (div) {
            div.parentNode.removeChild (div);
          }
        }
        else {
          if (!div) {
            div = targetDocument.createElement ("div");
            div.className = "akahuku_cell akahuku_catalog_delta";
            nodes [i].insertBefore (div, nodes [i].firstChild);
          }
                    
          arAkahukuDOM.setText (div, delta);
        }
      }
            
      arAkahukuCatalog.updateCellInfo (nodes [i],
                                       info,
                                       param.latestThread);
            
      var fonts = nodes [i].getElementsByTagName ("font");
      if (fonts && fonts.length > 0) {
        var font = fonts [fonts.length - 1];
        arAkahukuDOM.setText
          (font,
           nodes [i].getAttribute ("__reply_number"));
      }
      /* 避難所 patch */
      else {
        fonts = nodes [i].getElementsByTagName ("span");
        for (var j = 0; j < fonts.length; j ++) {
          if ("className" in fonts [j]
              && fonts [j].className == "s14") {
            arAkahukuDOM.setText (fonts [j],
                                  nodes [i].getAttribute
                                  ("__reply_number"));
          }
        }
      }
    }
        
    if (arAkahukuCatalog.enableReloadLeftBeforeSave
        && info.isFutaba
        && param.order == "akahuku_catalog_reorder_spec") {
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
          if (nodes [j].src.match (/cat\/([0-9]+)s\.jpg$/)) {
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
      setTimeout
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
    event.preventDefault ();
        
    var targetDocument = event.target.ownerDocument;
    var param
    = Akahuku.getDocumentParam (targetDocument).catalogpopup_param;
        
    var anchor = event.currentTarget;
    var nodes = anchor.getElementsByTagName ("img");
    if (nodes
        && nodes [0]) {
      var img = nodes [0];
      if (img.src.match (/cat\/([0-9]+)s\.jpg$/)) {
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
      if (nodes [i].innerHTML.match (/^[0-9]+$/)) {
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
      var uri
        = Components
        .classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (Components.interfaces.nsIURI);
      uri.spec = anchor.href;
                    
      visited = arAkahukuHistory.isVisited (uri);
    }
    return visited;
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
            node.setAttribute ("__thread", name + "/" + num);
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
          nodes [0].setAttribute ("__thread", name + "/" + num);
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
            
      /* 画像ロード失敗時に一度だけリロード */
      var image = anchor.getElementsByTagName ("img"); 
      if (image.length > 0) {
        var uinfo = arAkahukuImageURL.parse (image [0].src);
        if (uinfo && uinfo.isImage && !uinfo.isAd) {
          image [0].addEventListener
          ("error",
           function (event) {
             setTimeout
               (function (node, src, handler) {
                 if (node.src != src) {
                   /* P2Pなどで src が変えられたのなら再登録 */
                   node.addEventListener ("error", handler, false);
                   return;
                 }
                 node.src = src;
                 Akahuku.debug.log ("Reloading a corrupt image " + src
                   + "\n" + node.ownerDocument.location.href);
               }, 100, this, this.src, arguments.callee);
             this.removeEventListener ("error", arguments.callee, false);
           }, false);
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
        
    latestNum
      = Math.max
      (arAkahukuThread.newestNum [info.server + ":" + info.dir] || 0,
       latestNum);
    var anchor = arAkahukuDOM.getFirstElementByNames (tdElement, "a");
    if (anchor) {
      if (arAkahukuCatalog.enableRed) {
        if (anchor.href.match (/res[\/=]([0-9]+)/)
            || anchor.href.match (/2\/([0-9]+)/)
            || anchor.href.match (/b\/([0-9]+)/)) {
          var num = RegExp.$1;
          if (arAkahukuMaxNum.has (info.server + ":" + info.dir)) {
            var max
              = arAkahukuMaxNum.get (info.server + ":" + info.dir);
                        
            if (num < latestNum - max * 0.9) {
              tdElement.style.border = "2px solid #ff0000";
            }
          }
        }
      }
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
    }
    var columns = 10;
        
    switch (reorderId) {
      case "akahuku_catalog_reorder_default":
        columns = param.defaultColumns;
        mergedItems.sort (function (x, y) {
            return x.index - y.index;
          });
        break;
      case "akahuku_catalog_reorder_page":
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
            if (arAkahukuCatalog.enableReorderNew) {
              if (x.isNew && !y.isNew) {
                return -1;
              }
              else if (!x.isNew && y.isNew) {
                return 1;
              }
            }
            if (x.visited && !y.visited) {
              return -1;
            }
            else if (!x.visited && y.visited) {
              return 1;
            }
            return x.index - y.index;
          });
        break;
      case "akahuku_catalog_reorder_createtime":
        columns = arAkahukuCatalog.reorderWidth;
        if (columns == 0) {
          columns = param.defaultColumns;
        }
        mergedItems.sort (function (x, y) {
            if (arAkahukuCatalog.enableReorderNew) {
              if (x.isNew && !y.isNew) {
                return -1;
              }
              else if (!x.isNew && y.isNew) {
                return 1;
              }
            }
            if (x.visited && !y.visited) {
              return -1;
            }
            else if (!x.visited && y.visited) {
              return 1;
            }
            return y.threadId - x.threadId;
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
        
    if (target_id.match (/_save$/)) {
      var type = 0;
      target_id = target_id.replace (/_save$/, "");
            
      switch (target_id) {
        case "akahuku_catalog_reorder_default":
          type = 0;
          break;
        case "akahuku_catalog_reorder_page":
          type = 1;
          break;
        case "akahuku_catalog_reorder_spec":
          type = 2;
          break;
        case "akahuku_catalog_reorder_createtime":
          type = -1;
          break;
      }
            
      arAkahukuConfig.prefBranch
        .setIntPref ("akahuku.catalog.reorder.save.type", type);
      arAkahukuCatalog.reorderSaveType = type;
    }
        
    var count = 0;
    var visited = false;
    var nums = Object ();
        
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
                
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [i]);
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
            oldCells [i].getAttribute ("__reply_number"),
            visited,
            oldCells [i].getAttribute ("__is_new") == "true",
            oldCells [i].getAttribute ("__overflowed") == "true",
            oldCells [i].getAttribute ("class")));
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
      if (arAkahukuMaxNum.has (info.server + ":" + info.dir)) {
        max = arAkahukuMaxNum.get (info.server + ":" + info.dir);
      }
      else {
        max = 10000;
      }
            
      var cells = arAkahukuCatalog.lastCells [name];
      if (arAkahukuCatalog.enableReorderVisited) {
        var uri
          = Components
          .classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
      }
      for (var i = 0; i < cells.length; i ++) {
        var cell = cells [i];
        if (cell.threadId in nums) {
          continue;
        }
        if (cell.threadId < newestId - max) {
          continue;
        }
                
        visited = false;
        if (arAkahukuCatalog.enableReorderVisited) {
          uri.spec = cell.href;
                        
          visited = arAkahukuHistory.isVisited (uri);
        }
            
        mergedItems.push
          (new arAkahukuMergeItem
           (null,
            cell.text,
            count ++,
            cell.threadId,
            cell.replyNumber,
            cell.replyNumber,
            visited,
            false,
            true,
            cell.className));
      }
    }
        
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
            
      var indicator
      = targetDocument
      .getElementById ("akahuku_catalog_mode_indicator");
      if (indicator) {
        arAkahukuDOM.setText (indicator,
                              "["
                              + targetDocument.getElementById (target_id)
                              .innerHTML + "]");
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
    var update = false;
        
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
                    
          setTimeout (arAkahukuCatalog.tatelogTimer, 1000,
                      targetDocument);
        }
      }
            
      /* 広告に反映する */
      arAkahukuReload.updateAd (responseText,
                                targetDocument);
            
      var mergedItems
        = arAkahukuCatalog.mergeCellNodes (targetDocument,
                                           responseText);
      if (mergedItems.length > 0) {
        param.columns
          = arAkahukuCatalog.reorder (mergedItems, "",
                                      param);
        arAkahukuCatalog.replaceTable
          (oldTable,
           mergedItems,
           targetDocument,
           param);
        arAkahukuCatalog.setStatus
          ("\u5B8C\u4E86\u3057\u307E\u3057\u305F",
           false, targetDocument);
                                    
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
                                    
        var info
          = Akahuku.getDocumentParam (targetDocument)
          .location_info;
        arAkahukuSidebar.apply (targetDocument, info);
                
        update = true;
      }
      else {
        arAkahukuCatalog.setStatus ("\u6E80\u54E1\u3067\u3059",
                                    false, targetDocument);
      }
    }
    else {
      arAkahukuCatalog.setStatus ("\u30ED\u30FC\u30C9\u5931\u6557",
                                  false, targetDocument);
    }
        
    if (arAkahukuCatalog.enableReloadTimestamp) {
      arAkahukuCatalog.setTimeStamp (targetDocument);
    }
        
    if (update && arAkahukuCatalog.enableReloadUpdateCache) {
      if (param.writer == null) {
        param.writer = new arAkahukuCatalogCacheWriter ();
      }
            
      if (param.writer.setText (responseText)) {
        param.writer.responseHead = param.responseHead;
                
        var cacheService
        = Components.classes ["@mozilla.org/network/cache-service;1"]
        .getService (Components.interfaces.nsICacheService);
        var httpCacheSession;
        httpCacheSession
        = cacheService
        .createSession ("HTTP",
                        Components.interfaces.nsICache.STORE_ANYWHERE,
                        true);
        httpCacheSession.doomEntriesIfExpired = false;
        httpCacheSession
        .asyncOpenCacheEntry (targetDocument.location.href,
                              Components.interfaces.nsICache
                              .ACCESS_WRITE,
                              param.writer);
      }
    }
        
    arAkahukuCatalog.updateVisited (targetDocument);
    
    param.reloadChannel = null;
        
    param.responseText = "";
    param.stream = null;
        
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
                
        setTimeout (arAkahukuCatalog.tatelogTimer, 1000,
                    targetDocument);
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
        currentTdText
          = arAkahukuConverter.convertFromEUC (currentTdText, "");
      }
      else {
        currentTdText
        = arAkahukuConverter.convertFromSJIS (currentTdText, "");
      }
            
      if (currentTdText.match (/amazon.co.jp/)) {
        continue;
      }
            
      var replyNumber = 0;
      if (currentTdText.match (/<font[^>]*>([0-9]+)<\/font>/i)) {
        replyNumber = RegExp.$1;
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
                
      var visited = false;
                
      if (oldCells [threadId]) {
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [threadId]);
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
            visited,
            false,
            false,
            oldCells [threadId].getAttribute ("class")));
                
        delete oldCells [threadId];
      }
      else {
        if (arAkahukuCatalog.enableReorderVisited) {
          if (currentTdText.match (/href=([^ ]+)/)) {
            var path = RegExp.$1;
                            
            var baseDir
            = Components
            .classes ["@mozilla.org/network/standard-url;1"]
            .createInstance (Components.interfaces.nsIURI);
            baseDir.spec = targetDocument.location.href;
                            
            var uri
            = Components
            .classes ["@mozilla.org/network/standard-url;1"]
            .createInstance (Components.interfaces.nsIURI);
            uri.spec = baseDir.resolve (path);
                            
            visited = arAkahukuHistory.isVisited (uri);
          }
        }
                    
        nums [parseInt (threadId)] = true;
        if (newestId < parseInt (threadId)) {
          newestId = parseInt (threadId);
        }
        
        mergedItems.push (new arAkahukuMergeItem
                          (null,
                           currentTdText,
                           count ++,
                           threadId,
                           replyNumber,
                           replyNumber,
                           visited,
                           parseInt (threadId) > param.latestThread,
                           false,
                           className));
      }
    }
        
    if (arAkahukuCatalog.enableReloadLeftBefore
        && param.order == "akahuku_catalog_reorder_spec") {
      var max;
      if (arAkahukuMaxNum.has (info.server + ":" + info.dir)) {
        max = arAkahukuMaxNum.get (info.server + ":" + info.dir);
      }
      else {
        max = 10000;
      }
            
      for (threadId in oldCells) {
        if (parseInt (threadId) < newestId - max) {
          continue;
        }
                
        if (arAkahukuCatalog.enableReorderVisited) {
          visited = arAkahukuCatalog.isVisitedCell (oldCells [threadId]);
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
          oldCells [threadId].getAttribute ("__reply_number"),
          oldCells [threadId].getAttribute ("__reply_number"),
          visited,
          false,
          true,
          oldCells [threadId].getAttribute ("class")));
      }
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
      if (arAkahukuMaxNum.has (info.server + ":" + info.dir)) {
        max = arAkahukuMaxNum.get (info.server + ":" + info.dir);
      }
      else {
        max = 10000;
      }
            
      if (arAkahukuCatalog.enableReorderVisited) {
        var uri
          = Components
          .classes ["@mozilla.org/network/standard-url;1"]
          .createInstance (Components.interfaces.nsIURI);
      }
      var cells = arAkahukuCatalog.lastCells [name];
      for (i = 0; i < cells.length; i ++) {
        var cell = cells [i];
        if (cell.threadId in nums) {
          continue;
        }
        if (cell.threadId < newestId - max) {
          continue;
        }
                
        visited = false;
        if (arAkahukuCatalog.enableReorderVisited) {
          uri.spec = cell.href;
                        
          visited = arAkahukuHistory.isVisited (uri);
        }
                
        mergedItems.push
          (new arAkahukuMergeItem
           (null,
            cell.text,
            count ++,
            cell.threadId,
            cell.replyNumber,
            cell.replyNumber,
            visited,
            false,
            true,
            cell.className));
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
          setTimeout
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
    var anchor;
    var indicator
    = targetDocument.getElementById ("akahuku_catalog_mode_indicator");
        
    anchor
    = targetDocument.getElementById ("akahuku_catalog_reorder_createtime");
    if (anchor) {
      var columns = arAkahukuCatalog.reorderWidth;
      if (columns == 0) {
        columns = param.defaultColumns;
      }
      arAkahukuDOM.setText (anchor,
                            "\u30B9\u30EC\u306E\u7ACB\u3063\u305F\u9806\u306B"
                            + columns + "\u305A\u3064");
      if (param.order == "akahuku_catalog_reorder_createtime") {
        if (indicator) {
          arAkahukuDOM.setText
            (indicator, "[" + anchor.innerHTML + "]");
        }
      }
    }
        
    anchor = targetDocument.getElementById ("akahuku_catalog_reorder_spec");
    if (anchor) {
      var columns = arAkahukuCatalog.reorderWidth;
      if (columns == 0) {
        columns = param.defaultColumns;
      }
      arAkahukuDOM.setText (anchor,
                            "\u30C7\u30D5\u30A9\u30EB\u30C8\u9806\u306B"
                            + columns + "\u305A\u3064");
      if (param.order == "akahuku_catalog_reorder_spec") {
        if (indicator) {
          arAkahukuDOM.setText
            (indicator, "[" + anchor.innerHTML + "]");
        }
      }
    }
        
    if (param.reloadChannel) {
      try {
        param.reloadChannel.cancel (0x80020006);
        /* NS_BINDING_ABORTED */
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      param.reloadChannel = null;
      arAkahukuCatalog.setStatus
      ("\u4E2D\u65AD\u3055\u308C\u307E\u3057\u305F",
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
        
    var ios
    = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (Components.interfaces.nsIIOService);
    param.reloadChannel
    = ios.newChannel (targetDocument.location.href, null, null)
    .QueryInterface (Components.interfaces.nsIHttpChannel);
        
    arAkahukuCatalog.setStatus
    ("\u30ED\u30FC\u30C9\u4E2D (\u30D8\u30C3\u30C0)",
     true, targetDocument);
        
    try {
      param.reloadChannel.asyncOpen (param, null);
    }
    catch (e) {
      /* サーバに接続できなかった場合 */
      arAkahukuCatalog.setStatus
      ("\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
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
      var param
      = Akahuku.getDocumentParam (targetDocument)
      .catalogpopup_param;
            
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
                 && img.src.match (/cat\/([0-9]+)s\.jpg$/)) {
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
          tmp = base.getAttribute ("__thread");
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
            tmp = base.getAttribute ("__thread");
          }
        }
                
        var opened = false;
        if (tmp
            && tmp.match (/([^\/]+)\/([0-9]+)/)) {
          var name = RegExp.$1;
          var num = RegExp.$2;
          var thread
            = arAkahukuSidebar.boards [name].getThread (num);
          if (thread) {
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
      else {
        param.lastPopupKey = "";
        arAkahukuPopup.removeActivePopups (param);
      }
    }
    catch (e) {
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
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  onHideEntireThread : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument)
    .catalog_param;
        
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
   */
  updateVisited : function (targetDocument) {
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
      var uri
      = Components
      .classes ["@mozilla.org/network/standard-url;1"]
      .createInstance (Components.interfaces.nsIURI);
      
      var visited;
      for (var i = 0; i < nodes.length; i ++) {
        uri.spec = nodes [i].href;
        visited = arAkahukuHistory.isVisited (uri);
        if (visited) {
          arAkahukuDOM.addClassName (nodes [i], "akahuku_visited");
        }
        else {
          arAkahukuDOM.removeClassName (nodes [i], "akahuku_visited");
        }
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
            || arAkahukuCatalog.enableLeft)) {
            
      var param = new arAkahukuCatalogParam ();
      Akahuku.getDocumentParam (targetDocument)
      .catalog_param = param;
      param.targetDocument = targetDocument;
            
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
        if (nodes [i].innerHTML.match (/<font.*>([0-9]+)<\/font>/i)) {
          nodes [i].setAttribute ("__reply_number", RegExp.$1);
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
            
      for (var i = 0; i < nodes.length; i ++) {
        arAkahukuCatalog.updateCellInfo (nodes [i],
                                         info,
                                         param.latestThread);
      }
            
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
        function createReorderOrderButton (aid, content) {
          var anchor = targetDocument.createElement ("a");
          anchor.id = aid;
          anchor.className = "akahuku_catalog_reorder";
          anchor.appendChild (targetDocument.createTextNode
                              (content));
          anchor.addEventListener
            ("click",
             function () {
              arAkahukuCatalog.onReorderClick (arguments [0]);
            }, false);
                    
          paragraph.appendChild (targetDocument.createTextNode ("["));
          paragraph.appendChild (anchor);
                    
          if (arAkahukuCatalog.enableReorderSave) {
            var anchor = targetDocument.createElement ("a");
            anchor.id = aid + "_save";
            anchor.className = "akahuku_catalog_reorder_save";
            anchor.appendChild (targetDocument.createTextNode
                                ("\u8A18\u61B6"));
            anchor.addEventListener
              ("click",
               function () {
                arAkahukuCatalog.onReorderClick (arguments [0]);
              }, false);
                        
            paragraph.appendChild (anchor);
          }
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
         "\u30C7\u30D5\u30A9\u30EB\u30C8\u9806\u306B"
         + columns
         + "\u305A\u3064");
        createReorderOrderButton
        ("akahuku_catalog_reorder_createtime",
         "\u30B9\u30EC\u306E\u7ACB\u3063\u305F\u9806\u306B"
         + columns
         + "\u305A\u3064");
                
        table.parentNode.insertBefore (paragraph, table.nextSibling);
                
        if (arAkahukuCatalog.enableReorderSave) {
          var target_id = "";
          switch (arAkahukuCatalog.reorderSaveType) {
            case 0:
              target_id = "akahuku_catalog_reorder_default";
              break;
            case 1:
              target_id = "akahuku_catalog_reorder_page";
              break;
            case 2:
              target_id = "akahuku_catalog_reorder_spec";
              break;
            case -1:
              target_id = "akahuku_catalog_reorder_createtime";
              break;
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
        var param2 = new arAkahukuPopupParam (10);
        param2.targetDocument = targetDocument;
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
      }
      
      arAkahukuCatalog.updateVisited (targetDocument);
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
   *
   * @param  nsIURI aURI
   *         対象の URI
   */
  onEndUpdateBatch : function () {
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
    var spec = aURI.spec;
    
    if (spec.indexOf ("2chan.net/") == 0) {
      return;
    }

    if (spec.indexOf ("/res/") == 0
        && spec.indexOf ("?res=") == 0) {
      return;
    }
    
    for (var i = 0; i < Akahuku.documentParams.length; i ++) {
      var targetDocument = Akahuku.documentParams [i].targetDocument;
      arAkahukuCatalog.updateVisited (targetDocument);
    }
  }
};
