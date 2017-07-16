
/**
 * Require: arAkahukuConfig, arAkahukuFile
 */

/**
 * ブルマ女将管理
 *   [ブルマ女将]
 */
var arAkahukuBloomer = {
  enable : false,         /* Boolean  ブルマ女将 */
  keycode : 0,            /* Number  ショートカットキーのキーコード */
  modifiersAlt : false,   /* Boolean  ショートカットキーの Alt */
  modifiersCtrl : false,  /* Boolean  ショートカットキーの Ctrl */
  modifiersMeta : false,  /* Boolean  ショートカットキーの Meta */
  modifiersShift : false, /* Boolean  ショートカットキーの Shift */
  file : "",              /* String  ブルマ女将の場所 */
    
  /**
   * 初期化処理
   */
  initForXUL : function () {
    this.attachToWindow (window); // eslint-disable-line no-undef
  },
  attachToWindow : function (window) {
    window.addEventListener
    ("keydown", arAkahukuBloomer.onKeyDown, true);
  },
  dettachFromWindow : function (window) {
    window.removeEventListener
    ("keydown", arAkahukuBloomer.onKeyDown, true);
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    /* [ブルマ] タブの設定 */
    arAkahukuBloomer.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.bloomer", false);
    if (arAkahukuBloomer.enable) {
      var value
        = arAkahukuConfig
        .initPref ("char", "akahuku.bloomer.keycode", "VK_F2");
      value
        = unescape (value);
      arAkahukuBloomer.keycode
        = Components.interfaces.nsIDOMKeyEvent ["DOM_" + value];
            
      arAkahukuBloomer.modifiersAlt
        = arAkahukuConfig
        .initPref ("bool", "akahuku.bloomer.modifiers.alt", false);
      arAkahukuBloomer.modifiersCtrl
        = arAkahukuConfig
        .initPref ("bool", "akahuku.bloomer.modifiers.ctrl", false);
      arAkahukuBloomer.modifiersMeta
        = arAkahukuConfig
        .initPref ("bool", "akahuku.bloomer.modifiers.meta", false);
      arAkahukuBloomer.modifiersShift
        = arAkahukuConfig
        .initPref ("bool", "akahuku.bloomer.modifiers.shift", false);
            
      arAkahukuBloomer.file
        = arAkahukuConfig
        .initPref ("char", "akahuku.bloomer.file", "");
      arAkahukuBloomer.file
        = unescape (arAkahukuBloomer.file);
    }
  },
    
  /**
   * キーが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onKeyDown : function (event) {
    if (Akahuku.enableAll
        && arAkahukuBloomer.enable) {
      if (arAkahukuBloomer.keycode == event.keyCode
          && arAkahukuBloomer.modifiersAlt == event.altKey
          && arAkahukuBloomer.modifiersCtrl == event.ctrlKey
          && arAkahukuBloomer.modifiersMeta == event.metaKey
          && arAkahukuBloomer.modifiersShift == event.shiftKey) {
        var w = event.currentTarget.ownerDocument.defaultView;
        arAkahukuBloomer.openBloomer (w);
        event.preventDefault ();
      }
    }
  },
    
  /**
   * ブルマ女将を開く
   */
  openBloomer : function (window) {
    var document = window.document;
    if (Akahuku.enableAll
        && arAkahukuBloomer.enable) {
      var tabbrowser = document.getElementById ("content");

      var targetLocation = "about:blank";
      try {
        targetLocation
          = arAkahukuFile.getURLSpecFromFilename
          (arAkahukuBloomer.file);
      }
      catch (e) {
      }
      var newTab = tabbrowser.addTab (targetLocation);
      tabbrowser.selectedTab = newTab;
    }
  }
};
