
/**
 * JPEG のサムネ管理
 *  [JPEG のサムネを見る]
 */
var arAkahukuJPEG = new AkahukuContextMenu({
  common: {
    type: "normal",
    contexts: ['image'],
    visible: false,
  },
  commonUpdate: () => ({
    visible: (Prefs.getItem('all')
      && Prefs.getItem('jpeg.thumbnail')),
  }),
  menus: [
    {
      id: "akahuku-menuitem-content-separator5",
      type: "separator",
      visible: true,
    },
    {
      id: "akahuku-menuitem-content-jpeg-thumbnail",
      enabled: false,
      // サムネを見る
      title: "\u30B5\u30E0\u30CD\u3092\u898B\u308B",
      onclick: (i, t) => arAkahukuJPEG.onClickOpenThumbnail(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isJPEG && !c.isThumbnailOpened,
        enabled: c.isJPEG && !c.isThumbnailOpened,
      }),
    },
    {
      id: "akahuku-menuitem-content-jpeg-thumbnail-close",
      enabled: false,
      // サムネを閉じる
      title: "\u30B5\u30E0\u30CD\u3092\u9589\u3058\u308B",
      onclick: (i, t) => arAkahukuJPEG.onClickCloseThumbnail(i, t),
      _onUpdate: (i, t, c) => ({
        visible: c.isThumbnailOpened,
        enabled: c.isThumbnailOpened,
      }),
    },
  ],
});

Object.assign(arAkahukuJPEG, {

  onClickOpenThumbnail : function (info, tab) {
    let msg = {name: 'arAkahukuJPEG', method: 'openThumbnail', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

  onClickCloseThumbnail : function (info, tab) {
    let msg = {name: 'arAkahukuJPEG', method: 'closeThumbnail', args: []};
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },
});
