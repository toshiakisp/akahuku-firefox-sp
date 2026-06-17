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

    // 情報追加取得(mode=json)
    style
    .addRule ('div.akahuku_extra',
              'display: none;');
    if (Prefs.getItem('catalog.extra') && Prefs.getItem('catalog.extra.idp-badge')) {
      // ID/IPスレバッジ共通(まだdisplay: noneまま)
      style
      .addRule (cattable + ' td>div.akahuku_extra:where([data-id],[data-host],[data-id-all],[data-host-all],[data-host-self])',
                'position: absolute; top: 0; right:0;'
                +'min-width: 14px; height: 14px;'
                +'border-width: 1px; border-style: solid;'
                +'font-size: 10px; white-space: nowrap;'
                +'align-items: center; justify-content: center; z-index: 1;'
                +'color: #800000; background-color: #ffffee; border-color: gray;')
      if (Prefs.getItem('catalog.extra.idp-badge.id')) {
        // id表示[json id無し]
        style
        .addRule (cattable +' td>div.akahuku_extra[data-id-all]',
                  'display: flex; color: #ffffee; border-color: #117744 #117744 gray gray;'
                  +'background-color: #117744;')
        .addRule (cattable +' td>div.akahuku_extra[data-id-all]::after',
                  'content: "id";')
      }
      if (Prefs.getItem('catalog.extra.idp-badge.other')) {
        // 他 [json idあり]
        style
        .addRule (cattable +' td>div.akahuku_extra[data-id]',
                  'display: flex; color: black; border-color: #ffaf00 #ffaf00 gray gray;'
                  +'background-color: #ffaf00;')
        .addRule (cattable +' td>div.akahuku_extra[data-id]::after',
                  'content: "ID";')
        // 他 [json idあり][複数存在]
        .addRule (cattable +' td>div.akahuku_extra[data-id]:not([data-id-count="1"])::after',
                  'content: attr(data-id-count);')
        // 他 [json idあり](id表示)
        .addRule (cattable +' td>div.akahuku_extra[data-id-all="1"][data-id]',
                  'text-decoration: underline;');
      }
      // IPスレバッジ
      if (Prefs.getItem('catalog.extra.idp-badge.ip')) {
        // ip表示 [json hostなし]
        style
        .addRule (cattable +' td>div.akahuku_extra[data-host-all]',
                  'display: flex; color: white; border-color: blue;'
                  +'background-color: blue;')
        .addRule (cattable +' td>div.akahuku_extra[data-host-all]::after',
                  'content: "ip";');
      }
      if (Prefs.getItem('catalog.extra.idp-badge.ip-self')) {
        // ・3・ [json hostあり]
        style
        .addRule (cattable +' td>div.akahuku_extra[data-host-self]',
                  'display: flex; color: lightblue; border-color: blue;'
                  +'background-color: blue;')
        .addRule (cattable +' td>div.akahuku_extra[data-host-self]::after',
                  'content: "\uff653\uff65";');
      }
      if (Prefs.getItem('catalog.extra.idp-badge.other')) {
        // 他 [json hostあり] (実例無し?)
        style
        .addRule (cattable +' td>div.akahuku_extra[data-host]:not([data-host-self])',
                  'display: flex; color: black; border-color: #ffaf00 #ffaf00 gray gray;'
                  +'background-color: #ffaf00;')
        .addRule (cattable +' td>div.akahuku_extra[data-host]:not([data-host-self])::after',
                  'content: "IP";');
      }
    }
  }
);

