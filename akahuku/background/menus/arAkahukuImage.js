'use strict';

var arAkahukuImage = new AkahukuContextMenu({
  common: {
    type: 'normal',
    contexts: ['link'],
    enabled: false,
    visible: false,
  },
  commonUpdate: (info, tab, c) => {
    if (tab === null || !arAkahukuImage._SaveImageInitialized) {
      // initialize/update for pref changed
      let list = [];
      let value = Prefs.getItem('saveimage.base.list2');
      if (value !== 'null') {
        list = JSON.parse(unescape(value));
        while (list.length && list[0] === undefined) {
          list.shift();
        }
      }
      for (let i = 0; i < 10; i++) {
        let title = '';
        if (i < list.length) {
          title = (list[i].name ? list[i].name : list[i].dir);
          if (list[i].key) {
            title += ' (&' + list[i].key + ')';
          }
        }
        arAkahukuImage._SaveImageListMenus[i] = {
          visible: title.length > 0,
          title: title,
        };
      }
      arAkahukuImage._SaveImageInitialized = true;
    }
    return {
      enabled: (Prefs.getItem('all')
        && Prefs.getItem('saveimage')
        && Prefs.getItem('saveimage.linkmenu')
      ),
    };
  },
  menus: [
    {
      id: 'akahuku-menuitem-content-separator9',
      type: 'separator',
      enabled: true,
      _onUpdate: (i, t, c) => ({
        visible: c.isSaveImageLink,
      }),
    },
    {id: 'akahuku-menuitem-content-saveimage-0',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 0, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 0),
    },
    {id: 'akahuku-menuitem-content-saveimage-1',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 1, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 1),
    },
    {id: 'akahuku-menuitem-content-saveimage-2',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 2, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 2),
    },
    {id: 'akahuku-menuitem-content-saveimage-3',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 3, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 3),
    },
    {id: 'akahuku-menuitem-content-saveimage-4',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 4, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 4),
    },
    {id: 'akahuku-menuitem-content-saveimage-5',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 5, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 5),
    },
    {id: 'akahuku-menuitem-content-saveimage-6',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 6, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 6),
    },
    {id: 'akahuku-menuitem-content-saveimage-7',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 7, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 7),
    },
    {id: 'akahuku-menuitem-content-saveimage-8',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 8, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 8),
    },
    {id: 'akahuku-menuitem-content-saveimage-9',
      onclick: (i, t) => arAkahukuImage.onClickCore(i, t, 9, false),
      _onUpdate: (i, t, c) => arAkahukuImage._onUpdateMenu(c, 9),
    },
  ],
});

Object.assign(arAkahukuImage, {
  _SaveImageInitialized: false,
  _SaveImageListMenus: [],
  _onUpdateMenu: function (c, index) {
    if (index >= 0 && index < this._SaveImageListMenus.length) {
      const ret = this._SaveImageListMenus[index];
      ret.enabled = c.isSaveImageLink;
      return ret;
    }
    return {visible: false};//for safe
  },

  onClickCore: function (info, tab, targetDirIndex, linkmenu) {
    let msg = {
      name: 'arAkahukuImage', method: 'onSaveImageClick',
      args: [{isTrusted: true}, targetDirIndex, undefined, linkmenu],
    };
    browser.tabs.sendMessage(tab.id, msg, {frameId: info.frameId});
  },

});
