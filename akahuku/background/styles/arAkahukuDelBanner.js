"use strict";

arAkahukuStyle.addUserStyleSheetHandler(
  (style) => {
    if (Prefs.getItem('delbanner')) {
      style
      .addRule ("*[__akahuku_contentpolicy_hide]",
                "display: none ! important;");
      if (Prefs.getItem('delbanner.image')) {
        /* バナー広告の後の改行 */
        style
        .addRule ("a[delete] + br",
                  "display: none;");
      }

      if (Prefs.getItem('delbanner.text')) {
        /* テキスト広告 */
        style
        .addRule
        ("form > b > a[href*=\"http://click.dtiserv2.com/\"]",
         "display: none;");
      }

      if (Prefs.getItem('delbanner.monotonize')) {
        style
        .addRule
        ("img[__akahuku_banner='true']"
         + ",iframe[__akahuku_banner='true']"
         + ",object[__akahuku_banner='true']",
         "filter: url(\"data:image/svg+xml;utf-8,"
         + "<svg xmlns='http://www.w3.org/2000/svg' version='1.1'>"
         + "<defs><filter"
         + " color-interpolation='sRGB' color-interpolation-filters='sRGB'"
         + " color-rendering='optimizeSpeed' image-rendering='optimizeSpeed'"
         + " id='f'>"
         + "<feColorMatrix type='matrix' values='"
         + " 0.093 0.314 0.032 0 0.502"
         + " 0.187 0.628 0.063 0 0"
         + " 0.178 0.600 0.061 0 0"
         + " 0 0 0 1 0'/>"
         + "<feConvolveMatrix preserveAlpha='true'"
         + " order='3 3' kernelMatrix='0 -1 0 -1 20 -1 0 -1 0' divisor='16'/>"
         + "</filter></defs></svg>#f\");")
        .addRule
        ("img[__akahuku_banner='true']:hover"
         + ",iframe[__akahuku_banner='true']:hover"
         + ",object[__akahuku_banner='true']:hover",
         "filter: none;");
      }
    }
  }
);
