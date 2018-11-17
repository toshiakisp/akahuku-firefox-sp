"use strict";

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
};

/**
 * スタイル管理
 */
var arAkahukuStyle = {
  /**
   * 初期化処理
   */
  init : function () {
    if (Prefs.getItem('all')) {
      this.modifyStyleFile(true);
    }
    Prefs.onChanged.addListener(this.onPrefChanged);
  },

  term : function () {
    Prefs.onChanged.removeListener(this.onPrefChanged);
    this.modifyStyleFile(false);
    this._handlers.clear();
  },

  onPrefChanged : function () {
    if (Prefs.getItem('all')) {
      arAkahukuStyle.modifyStyleFile(true);
    }
    else {
      arAkahukuStyle.modifyStyleFile(false);
    }
  },


  _handlers: [],
  _timer: null,

  addUserStyleSheetHandler: function (handler) {
    this._handlers.push(handler);

    // debouncing
    window.clearTimeout(this._timer);
    this._timer = window.setTimeout(() => {
      if (Prefs.getItem('all')) {
        this.modifyStyleFile(true);
      }
    }, 10);
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
    // update css only in the Chrome process
    const uid = "Akahuku_userContent_css";
    if (register) {
      let style = new arAkahukuStyleData ();
      for (let handler of this._handlers) {
        handler(style)
      }
      const code = style.toString('\n');
      AkahukuCSSInjector.register(uid, '2chan.net', code);
    }
    else {
      AkahukuCSSInjector.unregister(uid);
    }
  },
};


arAkahukuStyle.init();

