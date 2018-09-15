
/**
 * JPEG のサムネ管理
 *  [JPEG のサムネを見る]
 */
var arAkahukuJPEG = {

  initContextMenus : function () {
    let p = (key) => Prefs.getItem(key);
    let enableMenu
      =  p('jpeg.thumbnail')
      && p('all');

    let createIf = (condition, createProps) => {
      browser.menus.remove(createProps.id);
      if (enableMenu && condition)
        browser.menus.create(createProps);
    };

    createIf(true, {
      id: "akahuku-menuitem-content-separator5",
      type: "separator",
      contexts: ['image'],
    });
    createIf(true, {
      id: "akahuku-menuitem-content-jpeg-thumbnail",
      type: "normal",
      contexts: ['image'],
      enabled: false,
      // サムネを見る
      title: "\u30B5\u30E0\u30CD\u3092\u898B\u308B",
      onclick: arAkahukuJPEG.onClickOpenThumbnail,
    });
    createIf(true, {
      id: "akahuku-menuitem-content-jpeg-thumbnail-close",
      type: "normal",
      contexts: ['image'],
      enabled: false,
      // サムネを閉じる
      title: "\u30B5\u30E0\u30CD\u3092\u9589\u3058\u308B",
      onclick: arAkahukuJPEG.onClickCloseThumbnail,
    });
  },

  updateContextMenus: function (info, tab, c) {
    if (!info.contexts.includes('selection')) {
      return false;
    }

    let rules = [
      //{id:'akahuku-menuitem-content-separator5',
      //  update: {visible: c.isJPEG || c.isThumbnailOpened}},
      {id:'akahuku-menuitem-content-jpeg-thumbnail',
        update: {enabled: c.isJPEG && !c.isThumbnailOpened}},
      {id:'akahuku-menuitem-content-jpeg-thumbnail-close',
        update: {enabled: c.isThumbnailOpened}},
    ];
    // Note:'visible' requires Fx63+

    let updated = false;
    for (let rule of rules) {
      if (info.menuIds.includes(rule.id)) {
        browser.menus.update(rule.id, rule.update);
        updated = true;
      }
    }
    return updated;
  },

  onClickOpenThumbnail : function (event) {
    let msg = {name: 'arAkahukuJPEG', method: 'openThumbnail', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  onClickCloseThumbnail : function (event) {
    let msg = {name: 'arAkahukuJPEG', method: 'closeThumbnail', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },
};
