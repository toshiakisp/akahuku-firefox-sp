
/* global Akahuku, arAkahukuConfig */

/**
 * JPEG のサムネ管理
 *  [JPEG のサムネを見る]
 */
var arAkahukuJPEG = {
  enableThumbnail : false,       /* Boolean  JPEG のサムネを見る */
  enableThumbnailError : false,  /* Boolean  見つからなかった場合に
                                  *   エラーを表示する */

  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuJPEG.enableThumbnail
    = arAkahukuConfig
    .initPref ("bool", "akahuku.jpeg.thumbnail", false);
    if (arAkahukuJPEG.enableThumbnail) {
      arAkahukuJPEG.enableThumbnailError
      = arAkahukuConfig
      .initPref ("bool", "akahuku.jpeg.thumbnail.error", false);
    }
  },
    
  getContextMenuContentData : function (targetNode) {
    var data = {
      isJPEG : false,
      isThumbnailOpened : false,
    };

    if (!targetNode) {
      return data;
    }

    if (arAkahukuJPEG.enableThumbnail) {
      if (targetNode
          && targetNode.nodeName.toLowerCase ()
          == "img") {
        if ("src" in targetNode) {
          if (targetNode.src.match (/jpe?g$/)) {
            data.isJPEG = true;
          }
        }
        if (targetNode
            .getAttribute ("__akahuku_jpeg_thumbnail_opened")
            == "true") {
          data.isThumbnailOpened = true;
        }
      }
    }

    return data;
  },
    
  /**
   * JPEG のサムネを表示する
   */
  openThumbnail : function (target) {
    var uri
    = Akahuku.protocolHandler.enAkahukuURI ("jpeg", target.src);
        
    target.setAttribute ("__akahuku_jpeg_thumbnail_opened",
                         "true");
    var node = target.ownerDocument.createElement ("img");
    node.addEventListener
    ("load",
     function () {
      arAkahukuJPEG.onThumbnailLoad (target, node);
    }, false);
    node.addEventListener
    ("error",
     function () {
      arAkahukuJPEG.onThumbnailError (target, node);
    }, false);
    node.src = uri;
    node.className = "akahuku_jpeg_thumbnail";
    node.style.verticalAlign = "top";
    node.style.display = "none";
    if (target.nextSibling) {
      target.parentNode.insertBefore (node, target.nextSibling);
    }
    else {
      target.parentNode.appendChild (node);
    }
  },
    
  /**
   * JPEG のサムネを閉じる
   *
   * @param  HTMLImageElement target
   *         対象の img 要素
   */
  closeThumbnail : function (target) {
    if (target.nextSibling
        && "className" in target.nextSibling
        && (target.nextSibling.className == "akahuku_jpeg_thumbnail"
            || target.nextSibling.className
            == "akahuku_jpeg_thumbnail_error")) {
      if (target.nextSibling
          .getAttribute ("__akahuku_jpeg_thumbnail_opened") == "true") {
        arAkahukuJPEG.closeThumbnail (target.nextSibling);
      }
      target.nextSibling.parentNode.removeChild (target.nextSibling);
    }
    target.removeAttribute ("__akahuku_jpeg_thumbnail_opened");
  },
    
  /**
   * サムネのロード完了のイベント
   *
   * @param  HTMLImageElement target
   *         対象の img 要素
   * @param  HTMLImageElement thumbnail
   *         サムネの img 要素
   */
  onThumbnailLoad : function (target, thumbnail) {
    thumbnail.style.display = "";
    thumbnail.scrollIntoView (false);
  },
    
  /**
   * ファイル中にサムネが見付からなかったイベント
   *
   * @param  HTMLImageElement target
   *         対象の img 要素
   * @param  HTMLImageElement thumbnail
   *         サムネの img 要素
   */
  onThumbnailError : function (target, thumbnail) {
    thumbnail.parentNode.removeChild (thumbnail);
    if (arAkahukuJPEG.enableThumbnailError) {
      if (target.getAttribute ("__akahuku_jpeg_thumbnail_opened")
          == "true") {
        var node = target.ownerDocument.createElement ("span");
        node.style.fontSize = "9pt";
        node.style.color = "#000000";
        node.style.backgroundColor = "#ff0000";
        node.style.verticalAlign = "top";
        node.className = "akahuku_jpeg_thumbnail_error";
        if (target.nextSibling) {
          target.parentNode.insertBefore (node, target.nextSibling);
        }
        else {
          target.parentNode.appendChild (node);
        }
        node.appendChild (target.ownerDocument.createTextNode
                          ("\u30B5\u30E0\u30CD\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F"));
      }
    }
    else {
      target
      .removeAttribute ("__akahuku_jpeg_thumbnail_opened");
    }
  }
};
