'use strict';

var arAkahukuSidebarMenus = new AkahukuContextMenu({
  common: {
    viewTypes: ['sidebar'],
    contexts: ['frame','image','link','page',],
  },
  commonUpdate: (info, tab, c) => ({
    enabled: Prefs.getItem('all') && Prefs.getItem('sidebar'),
  }),
  menus: [
    {
      id: 'akahuku-sidebar-popup-sort-mark',
      title: 'スレをマークする',
      _patterns: ['sidebar/sidebar_html.html'],
      onclick: (info, tab, c) => {
        browser.runtime.sendMessage({
          'frameId': info.frameId, // Not broadcast all sidebars,
          'target': 'sidebar.js',
          'command': 'markThread',
          'args': [c.activeBoardName, c.threadNum, true]});
      },
      _onUpdate: (info, tab, c) => ({
        visible: c.onThread && !c.isThreadMarked,
      }),
    },
    {
      id: 'akahuku-sidebar-popup-sort-unmark',
      title: 'スレのマークを外す',
      _patterns: ['sidebar/sidebar_html.html'],
      onclick: (info, tab, c) => {
        browser.runtime.sendMessage({
          'frameId': info.frameId, // Not broadcast all sidebars,
          'target': 'sidebar.js',
          'command': 'markThread',
          'args': [c.activeBoardName, c.threadNum, false]});
      },
      _onUpdate: (info, tab, c) => ({
        visible: c.onThread && c.isThreadMarked,
      }),
    },
    {
      id: 'akahuku-sidebar-popup-separator1',
      type: 'separator',
      _patterns: ['sidebar/sidebar_html.html'],
    },
    { // Parent group
      id: "akahuku-sidebar-catalog-popup-group",
      title: '更新カタログ種類',
      _patterns: ['sidebar/sidebar.html'],
      _onUpdate: (info, tab, c) => ({
        visible: (c.menuType == 'refresh' ||
          c.menuId?.startsWith('akahuku_sidebar_refresh_catalog_')
        ),
      }),
      _children: [
        {
          id: 'akahuku-sidebar-catalog-popup-cat',
          title: 'カタログ',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:0},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort1',
          title: '新順',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:1},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort2',
          title: '古順',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:2},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort3',
          title: '多順',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:3},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort6',
          title: '勢順',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:6},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort4',
          title: '少順',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:4},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort8',
          title: 'そ順',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:8},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort7',
          title: '見歴',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:7},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-sort9',
          title: '履歴',
          type: 'radio',
          _pref_select: {name:'sidebar.refresh.catalog.type', value:9},
        },
        {
          id: 'akahuku-sidebar-catalog-popup-separator1',
          type: 'separator',
        },
        {
          id: 'akahuku-sidebar-catalog-popup-catset',
          title: '設定...',
          onclick: (info, tab, c) => {
            browser.runtime.sendMessage({
              'frameId': info.frameId,
              'target': 'sidebar.js',
              'command': 'openCatalogSetting',
              'args': [c.activeBoardName]});
          },
        },
      ],
    },

    { // Parent group
      id: "akahuku-sidebar-popup-group-sort",
      title: 'スレの並び替え',
      _patterns: ['sidebar/sidebar_html.html', 'sidebar/sidebar.html'],
      _onUpdate: (info, tab, c) => ({
        visible: (c.inIframe ||
          c.menuType == 'sortorder'
        ),
      }),
      _children: [
        {
          id: 'akahuku-sidebar-popup-sort-num',
          title: 'スレの立った順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:0},
        },
        {
          id: 'akahuku-sidebar-popup-sort-lastnum',
          title: '最終レス番号順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:1},
        },
        {
          id: 'akahuku-sidebar-popup-sort-old',
          title: 'スレの古い順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:2},
        },
        {
          id: 'akahuku-sidebar-popup-sort-catalog-order',
          title: 'カタログ順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:5},
        },
        {
          id: 'akahuku-sidebar-popup-sort-reply-most',
          title: 'レスの多い順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:3},
        },
        {
          id: 'akahuku-sidebar-popup-sort-reply-least',
          title: 'レスの少ない順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:4},
        },
        {
          id: 'akahuku-sidebar-popup-sort-reply-delta-most',
          title: 'レスの増加数順',
          type: 'radio',
          _pref_select: {name:'sidebar.sort.type', value:6},
        },
        {
          id: 'akahuku-sidebar-popup-separator2',
          _patterns: ['sidebar/*'],
          type: 'separator',
        },
        {
          id: 'akahuku-sidebar-popup-sort-visited',
          _patterns: ['sidebar/*'],
          title: '既読を上に',
          type: 'checkbox',
          _pref_select: {name:'sidebar.sort.visited', value:true},
        },
        {
          id: 'akahuku-sidebar-popup-sort-marked',
          _patterns: ['sidebar/*'],
          title: 'マークを上に',
          type: 'checkbox',
          _pref_select: {name:'sidebar.sort.marked', value:true},
        },
        {
          id: 'akahuku-sidebar-popup-sort-invert',
          _patterns: ['sidebar/*'],
          title: '全体を反転',
          type: 'checkbox',
          _pref_select: {name:'sidebar.sort.invert', value:true},
        },
      ],
    },

    { // Parent group
      id: "akahuku-sidebar-popup-group-setting",
      title: '表示設定',
      _patterns: ['sidebar/sidebar_html.html'],
      _children: [
        {
          id: 'akahuku-sidebar-popup-flowmode-row',
          title: 'リスト配置',
          type: 'radio',
          _pref_select: {name:'sidebar.flow-mode', value:'row'},
        },
        {
          id: 'akahuku-sidebar-popup-flowmode-catalog',
          title: 'カタログ配置',
          type: 'radio',
          _pref_select: {name:'sidebar.flow-mode', value:'catalog'},
        },
        {
          id: 'akahuku-sidebar-popup-separator-flowmode',
          type: 'separator',
        },
        {
          id: 'akahuku-sidebar-popup-thumbnail-fit-contain',
          title: 'サムネ通常表示',
          type: 'radio',
          _pref_select: {name:'sidebar.thumbnail.fit', value:'contain'},
        },
        {
          id: 'akahuku-sidebar-popup-thumbnail-fit-cover',
          title: 'サムネ拡大表示',
          type: 'radio',
          _pref_select: {name:'sidebar.thumbnail.fit', value:'cover'},
        },
        {
          id: 'akahuku-sidebar-popup-separator-thumbnail-fit',
          type: 'separator',
        },
        {
          id: 'akahuku-sidebar-popup-thumbnail-zoom',
          title: 'マウスホバーでズーム',
          type: 'checkbox',
          _pref_select: {name:'sidebar.thumbnail.zoom', value:true},
        },
      ],
    },

    {
      id: 'akahuku-sidebar-popup-clear',
      title: '板をクリア',
      _patterns: ['sidebar/sidebar_html.html'],
      onclick: (info, tab, c) => {
        browser.runtime.sendMessage({
          'frameId': info.frameId,
          'target': 'sidebar.js',
          'command': 'clearAllThreads',
          'args': [c.activeBoardName]});
      },
      _onUpdate: (info, tab, c) => ({
        visible: c.inIframe || c.inDeckControl,
        title: (c.activeBoardTitle || '板') + 'をクリア',
      }),
    },
    {
      id: "akahuku-sidebar-popup-action",
      title: '赤福設定...',
      _patterns: ['sidebar/*'],
      onclick: (info, tab, c) => {
        browser.runtime.openOptionsPage();
      },
    },
  ],
});
