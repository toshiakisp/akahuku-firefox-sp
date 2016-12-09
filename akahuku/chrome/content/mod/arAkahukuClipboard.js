
/**
 * Require: Akahuku
 */

/**
 * クリップボード処理
 */
var arAkahukuClipboard = {
  /**
   * 指定されたクリップボードに文字列をコピー
   * (nsIClipboardHelper 互換)
   *
   * @param  String aString
   *         コピーするUnicode文字列
   * @param  Number aClipboardID
   *         クリップボードのID (nsIClipboard.kSelectionClipboardなど)
   * @parma  Document aDocument
   *         プライベートフラグを取得するドキュメント(オプション)
   */
  copyStringToClipboard : function (aString, aClipboardID, aDocument)
  {
    var clipboard
      = Components.classes ["@mozilla.org/widget/clipboard;1"]
      .getService (Components.interfaces.nsIClipboard);
    if (!clipboard) {
      throw Components.Exception ();
    }
    if (Components.interfaces.nsIClipboard.kSelectionClipboard === aClipboardID) {
      if (!clipboard.supportsSelectionClipboard ()) {
        throw Components.Exception ();
      }
    }

    var trans
      = Components.classes ["@mozilla.org/widget/transferable;1"]
      .createInstance (Components.interfaces.nsITransferable);
    if (!trans) {
        throw Components.Exception ();
    }

    if ("init" in trans) {
      // API changes since Firefox 16
      var loadContext = null;
      if (aDocument instanceof Components.interfaces.nsIDOMDocument) {
        loadContext
          = aDocument.defaultView
          .getInterface (Components.interfaces.nsIWebNavigation)
          .QueryInterface (Components.interfaces.nsILoadContext);
      }
      trans.init (loadContext);
    }
    trans.addDataFlavor ("text/unicode");

    var data
      = Components.classes ["@mozilla.org/supports-string;1"]
      .createInstance (Components.interfaces.nsISupportsString);
    if (!data) {
      throw Components.Exception ();
    }

    data.data = aString;
    trans.setTransferData ("text/unicode", data, aString.length * 2);

    clipboard.setData (trans, null, aClipboardID);
  },

  /**
   * クリップボードに文字列をコピー
   * (nsIClipboardHelper 互換)
   *
   * @param  String aString
   *         コピーするUnicode文字列
   * @parma  Document aDocument
   *         プライベートフラグを取得するドキュメント(オプション)
   */
  copyString : function (aString, aDocument)
  {
    this.copyStringToClipboard
      (aString,
       Components.interfaces.nsIClipboard.kGlobalClipboard,
       aDocument);

    // unix's requirement
    try {
      this.copyStringToClipboard
        (aString,
         Components.interfaces.nsIClipboard.kSelectionClipboard,
         aDocument);
    }
    catch (e) {
    }
  },

  /**
   * クリップボードから画像を取得
   *
   * @parma  string flavor MIME/type
   * @return ACString
   *         画像バイナリデータ (or null)
   */
  getImage : function (flavor) {
    if (!flavor) {
      flavor = "image/jpg";
    }

    var trans = arAkahukuClipboard.getTransferable (flavor);
    if (!trans) return null;

    try {
      var data = {};
      var dataLen = {};
      try {
        trans.getTransferData (flavor, data, dataLen);
      }
      catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
        Akahuku.debug.warn
          ("conversion failed from clipboard with flavor "+flavor);
        return null;
      }

      var image = data.value;

      if (image instanceof Components.interfaces.nsISupportsInterfacePointer) {
        image = image.data;
      }
      if (image instanceof Components.interfaces.imgIContainer) {
        var imageTools
          = Components.classes ["@mozilla.org/image/tools;1"]
          .getService (Components.interfaces.imgITools);
        image = imageTools.encodeImage (image, flavor);
      }

      if (image instanceof Components.interfaces.nsIInputStream) {
        var bstream
          = Components.classes ["@mozilla.org/binaryinputstream;1"]
          .createInstance (Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream (image);
        return bstream.readBytes (bstream.available ());
      }
      Akahuku.debug.warn
        ("unsupported instance "+image.toString ());
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    return null;
  },

  getFile : function () {
    var flavor = "application/x-moz-file";
    var trans = arAkahukuClipboard.getTransferable (flavor);
    var data = {};
    try {
      trans.getTransferData (flavor, data, {});
      return data.value.QueryInterface (Components.interfaces.nsIFile);
    }
    catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
      Akahuku.debug.warn ("failed to obtain nsIFile from clipboard");
      return null;
    }
  },

  getTransferable : function (flavor) {
    try {
      var clipboard
        = Components.classes ["@mozilla.org/widget/clipboard;1"]
        .getService (Components.interfaces.nsIClipboard);

      var trans
        = Components.classes ["@mozilla.org/widget/transferable;1"]
        .createInstance (Components.interfaces.nsITransferable);
      if ("init" in trans) {
        trans.init (null);
      }
      if (flavor) {
        trans.addDataFlavor (flavor);
      }
      clipboard.getData (trans, clipboard.kGlobalClipboard);
      return trans;
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    return null;
  },

};

