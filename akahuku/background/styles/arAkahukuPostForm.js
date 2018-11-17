"use strict";

arAkahukuStyle.addUserStyleSheetHandler(
  (style) => {
    if ((Prefs.getItem('postform.normal.hide')
      && Prefs.getItem('postform.reply.hide'))
      || Prefs.getItem('floatpostform')) {
      style
      .addRule ("center > form[enctype=\"multipart/form-data\"]",
                "display: none;");
    }
  }
);
