"use strict";

arAkahukuStyle.addUserStyleSheetHandler(
  (style) => {
    const cattable = 'table.akahuku_markup_catalog_table';
    const catcell = cattable + '[border="1"] td';
    const catimganchor = catcell + ' > a:nth-of-type(1)';
    const catimg = catimganchor + ' > img';
    const cattable0 = 'table#cattable:not(.akahuku_markup_catalog_table)';
    const catcell0 = cattable0 + '[border="1"] td';
    const catimganchor0 = catcell0 + ' > a:nth-of-type(1)';
    const catimg0 = catimganchor0 + ' > img';
    const catimg_all = catimg + ',' + catimg0;

    if (Prefs.getItem('catalog.cellwidth.enable')) {
      let cellWidthNum = parseFloat(Prefs.getItem('catalog.cellwidth.num'));
      let cellWidthUnit = Prefs.getItem('catalog.cellwidth.unit');
      if (!(['px', 'vh', 'vw', 'rem'].includes(cellWidthUnit))) {
        cellWidthUnit = 'px';
      }
      let w = cellWidthNum + cellWidthUnit;
      style
      .addRule (catcell + ',' + catcell0,
                "width: " + w + ";")
      .addRule (catcell + " .akahuku_native_comment"
                + "," + catcell0 + " small",
                "display: inline-block;"
                + "max-width: " + w + ";"
                + "line-break: anywhere;"
                + "word-break: break-all;")
      .addRule (catcell + " div.akahuku_comment",
                "max-width: " + w + ";"
                + "line-break: anywhere;"
                + "word-break: break-all;"
                + "font-size: 8pt;"
                + "overflow: hidden;")

      const lines = parseFloat(Prefs.getItem('catalog.cellwidth.max-lines'));
      if (lines >= 0) {
        const lineHeight = 1.1;
        // akahuku_comment は字数制限が別にあるので行数制限をしない
        style
        .addRule (catcell + " .akahuku_native_comment"
                  + "," + catcell0 + " small",
                  "line-height: " + lineHeight + ";"
                  + "max-height: " + (lineHeight*lines) + "em;"
                  + "overflow-y: auto; overflow-x: hidden;")
      }

      // 大きいサムネを縮小
      style
      .addRule (catimg_all,
                "max-width: " + w + ";"
                + "max-height: " + w + ";"
                + "height: auto !important;"
                + "width: auto !important;");

      if (Prefs.getItem('catalog.cellwidth.scale-thumb')) {
        style
        .addRule (catimg_all,
                  "object-fit: contain;"
                  + "object-position: center center;"
                  + "height: " + w + " !important;"
                  + "width: " + w + " !important;");
      }
    }
    else {
      style
      .addRule (catcell + " div.akahuku_comment",
                "max-width: 50px;"
                + "font-size: 8pt;"
                + "overflow: hidden;")
    }
  }
);

