
/* global Components,
 *   Akahuku, arAkahukuCompat, arAkahukuFile, arAkahukuUtil,
 *   arAkahukuCatalog, arAkahukuDelBanner,
 *   arAkahukuImage, arAkahukuLink, arAkahukuMHT, arAkahukuPostForm,
 *   arAkahukuThread, arAkahukuReload, arAkahukuScroll,
 *   arAkahukuTitle, arAkahukuPopupQuote, arAkahukuThreadOperator,
 *   AkahukuFileUtil, AkahukuFSUtil,
 */

/**
 * スタイルデータ
 */
function arAkahukuStyleData () {
  this.rules = new Object ();
}
arAkahukuStyleData.prototype = {
  rules : null,          /* Object  スタイルルール
                          *   <String セレクタ, String スタイル> */
    
  /**
   * ルールを追加する
   *
   * @param  String selector
   *         セレクタ
   * @param  String value
   *         スタイル
   * @return arAkahukuStyleData
   *         this
   */
  addRule : function (selector, value) {
    if (selector in this.rules) {
      this.rules [selector] += " " + value;
    }
    else {
      this.rules [selector] = value;
    }
        
    return this;
  },
    
  /**
   * スタイルルールをスタイルシートに変換する
   *
   * @param  String retcode
   *         改行コード
   * @return String
   *         スタイルシート
   */
  toString : function (retcode) {
    var s = "";
    for (var selector in this.rules) {
      s
        += selector + " {" + retcode
        + this.rules [selector] + retcode
        + "}" + retcode;
    }
    return s;
  },
    
  /**
   * ルールを適用する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  apply : function (targetDocument) {
    var header = targetDocument.getElementsByTagName ("head") [0];
    if (header) {
      var s = this.toString ("");
      this.rules = null;
      if (s != "") {
        var style = targetDocument.createElement ("style");
        style.appendChild (targetDocument.createTextNode (s));
        header.appendChild (style);
      }
    }
  }
};
/**
 * スタイル管理
 */
var arAkahukuStyle = {
  /**
   * 初期化処理
   */
  init : function () {
    if (Akahuku.enableAll) {
      this.modifyStyleFile (true);
    }
  },

  term : function () {
    this.modifyStyleFile (false);
  },

  onPrefChanged : function () {
    if (Akahuku.enableAll) {
      arAkahukuStyle.modifyStyleFile (true);
    }
    else {
      arAkahukuStyle.modifyStyleFile (false);
    }
  },

  /**
   * フォーム等を固定する際のスタイルを取得する
   *
   * @param  String position
   *         フォームを固定する位置
   *           "topleft":     左上
   *           "topright":    右上
   *           "bottomleft":  左下
   *           "bottomright": 右下
   * @param  String style
   *         それ以外のスタイル
   * @param  Number x
   *         固定位置からの X 座標
   * @param  Number y
   *         固定位置からの Y 座標
   */
  getFixedStyle : function (position, style, x, y) {
    if (position.indexOf ("right") != -1) {
      style += "right: " + x + "px;";
    }
    else {
      style += "left: " + x + "px;";
    }
    if (position.indexOf ("bottom") != -1) {
      style += "bottom: " + y + "px;";
    }
    else {
      style += "top: " + y + "px;";
    }
    return style;
  },
    
  /**
   * スタイルファイルを修正する
   *   ロード前から適用すべきスタイルを指定する
   *
   * @param  Boolean register
   *         true: 修正して登録する
   *         false: 解除する
   */
  modifyStyleFile : function (register) {
    if (!Akahuku.useFrameScript &&
        arAkahukuCompat.comparePlatformVersion ("48.0") < 0) {
      arAkahukuStyle._modifyStyleFileLegacy (register);
      return;
    }
    try {
      var {AkahukuCSSInjector}
      = Components.utils.import ("resource://akahuku/css-injector.jsm", {});
    }
    catch (e) { Akahuku.debug.exception (e);
      arAkahukuStyle._modifyStyleFileLegacy (register);
      return;
    }

    var uid = "Akahuku_userContent_css";
    if (register) {
      var style = new arAkahukuStyleData ();

      arAkahukuDelBanner.setStyleFile (style);
      arAkahukuPostForm.setStyleFile (style);
      arAkahukuThread.setStyleFile (style);
      arAkahukuReload.setStyleFile (style);
      arAkahukuScroll.setStyleFile (style);
      arAkahukuCatalog.setStyleFile (style);

      AkahukuCSSInjector
        .register (uid, "domain(2chan.net)", style.toString ("\n"));
    }
    else {
      AkahukuCSSInjector.unregister (uid);
    }
  },
  _modifyStyleFileLegacy : function (register) {
    var filename
    = AkahukuFileUtil
    .Path.join (arAkahukuFile.systemDirectory, "userContent.css");
        
    var styleSheetService
    = Components.classes ["@mozilla.org/content/style-sheet-service;1"]
    .getService (Components.interfaces.nsIStyleSheetService);
    var type = Components.interfaces.nsIStyleSheetService.USER_SHEET;
        
    var ios
    = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (Components.interfaces.nsIIOService);
    var uri
    = ios.newURI (AkahukuFileUtil.getURLSpecFromNativePath (filename),
                  null, null);
        
    if (register) {
      var style = new arAkahukuStyleData ();
            
      arAkahukuDelBanner.setStyleFile (style);
      arAkahukuPostForm.setStyleFile (style);
      arAkahukuThread.setStyleFile (style);
      arAkahukuReload.setStyleFile (style);
      arAkahukuScroll.setStyleFile (style);
      arAkahukuCatalog.setStyleFile (style);
            
      var text
      = "@-moz-document domain(2chan.net) {\n"
      + style.toString ("\n")
      + "}\n";
            
      style = null;
            
      AkahukuFSUtil.saveStringToNativeFile (filename, text, "plain/text")
      .then (function () {
        if (styleSheetService.sheetRegistered (uri, type)) {
          styleSheetService.unregisterSheet (uri, type);
        }
        styleSheetService.loadAndRegisterSheet (uri, type);
      }, function (err) {
        Akahuku.debug.error ("Error in creating userContent.css:", err);
      });
    }
    else {
      if (styleSheetService.sheetRegistered (uri, type)) {
        styleSheetService.unregisterSheet (uri, type);
      }
    }
  },
    
  /**
   * スタイルファイルでの修正を解除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  resetStyle : function (targetDocument) {
    var style = new arAkahukuStyleData ();
        
    arAkahukuDelBanner.resetStyleFile (style);
    arAkahukuPostForm.resetStyleFile (style);
    arAkahukuThread.resetStyleFile (style);
            
    style.apply (targetDocument);
    style = null;
  },
    
  /**
   * スタイルを修正する
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
        
    var style = new arAkahukuStyleData ();
        
    if (info.isNormal || info.isReply) {
      /* 通常モード、レス送信モード共通 */
            
      style
        .addRule ("span.akahuku_status_suffix",
                  "font-size: 9pt; "
                  + "vertical-align: text-bottom; "
                  + "color: #a05050; "
                  + "background-color: inherit;");
    }
        
    arAkahukuCatalog.setStyle (style, targetDocument, info);
    arAkahukuLink.setStyle (style, targetDocument, info);
    arAkahukuImage.setStyle (style, targetDocument, info);
    arAkahukuMHT.setStyle (style, targetDocument, info);
    arAkahukuPopupQuote.setStyle (style, targetDocument, info);
    arAkahukuPostForm.setStyle (style, targetDocument, info);
    arAkahukuReload.setStyle (style, targetDocument, info);
    arAkahukuScroll.setStyle (style, targetDocument, info);
    arAkahukuThread.setStyle (style, targetDocument, info);
    arAkahukuThreadOperator.setStyle (style, targetDocument, info);
    arAkahukuTitle.setStyle (style, targetDocument, info);
    arAkahukuDelBanner.setStyle (style, targetDocument, info);
        
    style.apply (targetDocument);
    style = null;
  }
};
