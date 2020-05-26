'use strict';

var arAkahukuImage = {

  maxListItems: 10,
  list: [],

  initContextMenus: function () {
    let p = (key) => Prefs.getItem(key);
    let enableMenu
      = p('saveimage')
      && p('saveimage.linkmenu') && p('all');

    let createIf = (condition, createProps) => {
      browser.menus.remove(createProps.id);
      if (enableMenu && condition)
        browser.menus.create(createProps);
    };

    let list = [];
    let value = p('saveimage.base.list2');
    if (value !== 'null') {
      list = JSON.parse(unescape(value));
      while (list.length && list[0] === undefined) {
        list.shift();
      }
    }
    this.list = list; // backup

    createIf(list.length > 0, {
      id: 'akahuku-menuitem-content-separator9',
      type: 'separator',
      contexts: ['link'],
    });

    for (let i = 0; i < this.maxListItems; i++) {
      let title = '';
      if (i < list.length) {
        title = (list[i].name ? list[i].name : list[i].dir);
        if (list[i].key) {
          title += ' (&' + list[i].key + ')';
        }
      }
      createIf(i < list.length, {
        id: 'akahuku-menuitem-content-saveimage-' + i,
        type: 'normal',
        contexts: ['link'],
        title: title,
        enabled: false,
        onclick: (info, tab) => {
          arAkahukuImage.onClickSaveImageMenu(info, tab, i, false);
        },
      });
    }
  },

  updateContextMenus: function (info, tab, c) {
    if (this.list.length > 0) {
      for (let i = 0; i < this.list.length; i++) {
        let id = 'akahuku-menuitem-content-saveimage-' + i;
        browser.menus.update(id, {
          enabled: c.isSaveImageLink,
        });
      }
      return true;
    }
    return false;
  },

  onClickSaveImageMenu: function (info, tab, targetDirIndex, linkmenu) {
    let msg = {
      name: 'arAkahukuImage', method: 'onSaveImageClick',
      args: [{isTrusted: true}, targetDirIndex, undefined, linkmenu],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

};
