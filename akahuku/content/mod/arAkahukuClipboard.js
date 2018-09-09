
/* global Promise, Akahuku, navigator */

/**
 * クリップボード処理
 */
var arAkahukuClipboard = {
  /**
   * クリップボードに文字列をコピー
   *
   * @param  String aString
   *         コピーするUnicode文字列
   * @parma  Document aDocument
   *         ドキュメント(オプション)
   */
  copyString : function (aString, aDocument) {
    try {
      navigator.clipboard.writeText(aString); // Fx63+
    }
    catch (e) {
      browser.runtime.sendMessage({
        target: 'clipboard-polyfill.js',
        command: 'writeText',
        args: [aString],
      });
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
    Akahuku.debug.error('NotYetImplemented');
    return null;
  },

  /**
   * クリップボードからファイルを取得
   * @return Promise to be a DOM File
   */
  getFile : function () {
    return Promise.reject(new Error('NotYetImplemented'));
    /*
    return arAkahukuIPC.sendAsyncCommand ("Clipboard/getFile", []);
    */
  },

};

