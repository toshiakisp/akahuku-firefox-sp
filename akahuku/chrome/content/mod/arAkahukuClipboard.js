/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

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
      if (aDocument instanceof Document) {
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
};

