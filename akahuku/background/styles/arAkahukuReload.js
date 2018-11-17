"use strict";

arAkahukuStyle.addUserStyleSheetHandler(
  (style) => {
    if (Prefs.getItem('reload.rule.zeroheight')) {
      style
      .addRule ("img",
                "position: relative; z-index: 99;");
      /* -moz-hidden-unscrollable を設定すると
       *  z-index が img より上になってクリックできなくなるので
       * スレ画像の img の z-index をさらに上にする */
    }
  }
);
