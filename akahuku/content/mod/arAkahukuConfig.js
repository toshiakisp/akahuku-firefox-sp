export {arAkahukuConfig};

import {Prefs} from '/content/pref-content.js';
import {default as _console} from '/content/console.js';

var Akahuku = {debug: _console};

/**
 * 設定管理
 */
var arAkahukuConfig = {
  isObserving : false,   /* boolean 監視しているかどうか */
  modules : [], /* 管理モジュールリスト: getConfig()/onPrefChanged()を呼ぶ対象 */
    
  /**
   * 初期化処理
   */
  init : function (scope=null) {
    this.callForSubmodules('getConfig', {scope: scope});
    if (!arAkahukuConfig.isObserving) {
      this._listener = (bag) => {
        arAkahukuConfig.observe(null, "nsPref:changed", null);
      };
      Prefs.onChanged.addListener(this._listener);
      arAkahukuConfig.isObserving = true;
    }
  },
    
  /**
   * 終了処理
   */
  term : function () {
    if (arAkahukuConfig.isObserving) {
      Prefs.onChanged.removeListener(this._listener);
      this._listener = null;
      arAkahukuConfig.isObserving = false;
    }
  },

  /**
   * name の関数をサブモジュール全てに対して呼び出す
   */
  callForSubmodules : function (name, opts={scope:null, keepOnFail:false}) {
    for (const [k, m] of this.modules.entries()) {
      let mod = null;
      if (typeof m == 'object' && m !== null) {
        mod = m;
      } else if (opts?.scope) {// lazy resolve
        try {
          mod = opts.scope[m];
        } catch (e) { Akahuku.debug.exception(e);
        }
        if (!(typeof mod == 'object' && mod !== null)) {
          Akahuku.debug.error(`Invalid object: "${m}" in ${opts.scope} is`, mod);
          mod = null;
        }
        this.modules[k] = mod;
      }
      try {
        if (mod && name in mod)
          mod[name].call(mod);
      } catch (e) {
        Akahuku.debug.exception(e);
        if (!opts?.keepOnFail)
          this.modules[k] = null;
      }
    }
  },
    
  /**
   * 設定を読み込む
   * 設定が無ければ既定値を書き込む
   *
   * @param  String type
   *         設定の種類
   *           "bool": bool
   *           "char": 文字列
   *           "int":  数値
   * @param  String name
   *         設定名
   * @param  Boolean/String/Number value
   *         既定値
   * @return Boolean/String/Number
   *         取得した値
   *         設定が無ければ既定値
   */
  initPref : function (type, name, value) {
    name = this._convToPrefsName(name);

    if (Prefs.hasItem (name)) {
      value = Prefs.getItem (name);
    }
    else {
      Akahuku.debug.warn('pref("' + name + '", '
        + JSON.stringify(value) + '); // UNKNOWN!!')
    }
    return value;
  },

  _convToPrefsName: function (prefName) {
    if (prefName.startsWith('akahuku.')) {
      return prefName.substring('akahuku.'.length);
    }
    else {
      console.warn('Accesssing invalid prefName =', prefName);
      return prefName;
    }
  },

  setBoolPref : function (prefName, value) {
    Prefs.setItem(this._convToPrefsName(prefName), value);
  },
  setCharPref : function (prefName, value) {
    Prefs.setItem(this._convToPrefsName(prefName), value);
  },
  setIntPref : function (prefName, value) {
    Prefs.setItem(this._convToPrefsName(prefName), value);
  },
  getBoolPref : function (prefName) {
    return Prefs.getItem(this._convToPrefsName(prefName));
  },
  getCharPref : function (prefName) {
    return Prefs.getItem(this._convToPrefsName(prefName));
  },
  getIntPref : function (prefName) {
    return Prefs.getItem(this._convToPrefsName(prefName));
  },
  prefHasUserValue : function (prefName) {
    return Prefs.hasItem(this._convToPrefsName(prefName));
  },
  clearUserPref : function (prefName) {
    Prefs.clearUserValue(this._convToPrefsName(prefName));
  },
    
  /**
   * 設定の変更のイベント
   *   nsIObserver.observe
   *
   * @param  nsISupports subject
   *         不明
   * @param  String topic
   *         通知の対象
   * @param  String data
   *         通知の内容
   */
  observe : function (subject, topic, data){
    if (topic == "nsPref:changed"){
      /* 設定の変更の場合 */
      this.callForSubmodules('getConfig');
      this.callForSubmodules('onPrefChanged', {keepOnFail: true});
    }
  },
  
  /**
   * スクリプトの実行時間を設定する
   *
   * @param Number t
   *        時間
   */
  setTime : function (t) {
    Akahuku.debug.warn('Deprecated: arAkahukuConfig.setTime()');
  },
  
  /**
   * スクリプトの実行時間を元に戻す
   */
  restoreTime : function () {
    Akahuku.debug.warn('Deprecated: arAkahukuConfig.restoreTime()');
  }
};

