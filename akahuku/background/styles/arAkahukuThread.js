"use strict";

arAkahukuStyle.addUserStyleSheetHandler(
  (style) => {
    var s;
    if (Prefs.getItem('cutefont')) {
      let font = unescape(Prefs.getItem('cutefont.family'));
      s = "font-family: " + font + ";";

      style
        .addRule ("blockquote", s);
      style
        .addRule ("div.t", s);
      style
        .addRule ("div.akahuku_popup_content_blockquote", s);
    }

    if (Prefs.getItem('style.body_font')) {
      let font_size = Prefs.getItem('style.body_font.size');
      s = "font-size:" + font_size + "pt !important;"
      style.addRule ("body", s);
    }

    s = "";
    if (Prefs.getItem('reply.marginbottom')) {
      s += "margin-bottom: 1em;";
    }
    if (Prefs.getItem('reply.nomargintop')) {
      s += "margin-top: 0em;";
    }
    if (Prefs.getItem('reply.nomarginbottom')) {
      s += "margin-bottom: 0em;";
    }

    if (s) {
      style
      .addRule ("blockquote", s);
      style
      .addRule ("div.t", s);
      style
      .addRule ("div.akahuku_popup_content_blockquote", s);
    }

    if (Prefs.getItem('reply.limitwidth')) {
      style
      .addRule ("body > form > blockquote",
                "overflow: -moz-hidden-unscrollable;")
      .addRule ("body > form > div.t",
                "overflow: -moz-hidden-unscrollable;")
      .addRule ("body > form > table",
                "display: block;"
                + "overflow: -moz-hidden-unscrollable;")
      .addRule ("body > form > div.r",
                "overflow: -moz-hidden-unscrollable;")
    }

    if (Prefs.getItem('reply.limitwidth')) {
      style
      .addRule ("img",
                "position: relative; z-index: 99;");
      /* -moz-hidden-unscrollable を設定すると
       *  z-index が img より上になってクリックできなくなるので
       * スレ画像の img の z-index をさらに上にする */
    }
  }
);
