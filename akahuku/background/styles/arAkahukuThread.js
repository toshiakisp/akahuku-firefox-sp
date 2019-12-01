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
      .addRule ("body > form > div.thre"
                + ", body > div.thre"
                , "margin-right: inherit ! important;"
                + "overflow-x: hidden;")
      .addRule ("body > form > blockquote"
                + ",body > form > div.thre > blockquote"
                + ",body > div.thre > blockquote"
                + ",body > form > div.thre > table blockquote"
                + ",body > div.thre > table blockquote"
                , "overflow-x: hidden;"
                + "white-space: nowrap;"
                + "text-overflow: clip;"
                + "max-width: inherit ! important;")
    }
  }
);
