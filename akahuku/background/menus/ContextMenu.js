'use strict';

function AkahukuContextMenu ({common={}, menus=[], baseUrl='/', commonUpdate=null}) {
  this.menuCommons = common;
  this.menuSettings = menus;
  this.baseUrl = browser.runtime.getURL(baseUrl);
  this.commonUpdate = ()=>({});
  if (commonUpdate) {
    this.commonUpdate = commonUpdate;
  }
  this.clickHandlers = new Map();
  this.updateHandlers = new Map();
  this.menuSettingById = new Map();
}

AkahukuContextMenu.prototype = {
  initialized: false,
  baseUrl: '',
  lastContentData: null,

  menuCommons: {},
  menuSettings: [],

  clickHandlers: new Map(),
  updateHandlers: new Map(),
  menuSettingById: new Map(),

  init: function () {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    for (let m of this.menuSettings) {
      this.createMenuFromData(m);
    }
    browser.menus.onClicked.addListener(this.onClicked);
    browser.menus.onShown.addListener(this.onShown);
    browser.menus.onHidden.addListener(this.onHidden);
  },

  destruct: function () {
    if (!this.initialized) {
      return Promise.resolve();
    }
    this.initialized = false;
    browser.menus.onClicked.removeListener(this.onClicked);
    browser.menus.onShown.removeListener(this.onShown);
    browser.menus.onHidden.removeListener(this.onHidden);
    const p = [];
    for (let m of this.menuSettings) {
      p.push(this.removeMenuFromData(m));
    }
    this.clickHandlers.clear();
    this.updateHandlers.clear();
    this.menuSettingById.clear();
    return Promise.allSettled(p);
  },

  createMenuFromData: function (data, parentProp={}) {
    let click_handler = data.onclick;
    let update_handler = data._onUpdate;

    if (typeof data._pref_select != 'undefined') {
      const orig_onclick = click_handler;
      click_handler = (info, tab) => {
        orig_onclick?.(info, tab);
        let value =  data._pref_select.value;
        if (data.type == 'checkbox') {
          value = info.checked; // toggle
        }
        Prefs.set({[data._pref_select.name]: value});
      };
      const orig_onupdate = update_handler;
      update_handler = (info, tab, c) => {
        const prop = (orig_onupdate?.(info, tab, c) || {});
        prop.checked = (Prefs.getItem(data._pref_select.name) == data._pref_select.value);
        return prop;
      };
    }

    if (data.id) {
      this.menuSettingById.set(data.id, data);
    }

    let prop = {...this.menuCommons};
    // Inherit properties from parent
    if (parentProp?.id) {
      prop.parentId = parentProp.id;
    }
    if (parentProp?.documentUrlPatterns) {
      prop.documentUrlPatterns = parentProp.documentUrlPatterns;
    }
    [// Properties simply copied
      'checked','command','contexts','enabled','id','icons','parentId',
      'targetUrlPatterns','title','type','visible','viewTypes',
    ].forEach(name => {
      if (name in data) prop[name] = data[name];
    });
    // Special properties
    if (data._patterns) {
      prop.documentUrlPatterns = [];
      for (let p of data._patterns) {
        prop.documentUrlPatterns.push(this.baseUrl + p);
      }
    }
    browser.menus.create(prop, () => {
      const err = browser.runtime.lastError;
      if (err) {
        console.error(err);
      }
    });
    if (click_handler && prop.id) {
      this.clickHandlers.set(prop.id, click_handler);
    }
    if (update_handler && prop.id) {
      this.updateHandlers.set(prop.id, update_handler);
    }
    if (!prop.id && (click_handler || update_handler)) {
      console.warn('No id specified for a menu!', prop);
    }

    if (typeof data._children !== 'undefined') {
      for (let d of data._children) {
        this.createMenuFromData(d, prop);
      }
    }
  },

  removeMenuFromData: function (data, parentProp={}) {
    const p = [];
    if (typeof data._children !== 'undefined') {
      for (let d of data._children) {
        p.push(this.removeMenuFromData(d));
      }
    }
    p.push(browser.menus.remove(data.id));
    return Promise.allSettled(p);
  },

  get onClicked () {
    if (!this._onClickedBind) this._onClickedBind = this._onClicked.bind(this);
    return this._onClickedBind;
  },
  get onShown () {
    if (!this._onShownBind) this._onShownBind = this._onShown.bind(this);
    return this._onShownBind;
  },
  get onHidden () {
    if (!this._onHiddenBind) this._onHiddenBind = this._onHidden.bind(this);
    return this._onHiddenBind;
  },

  _onClicked: function (info, tab) {
    const handler = this.clickHandlers.get(info.menuItemId);
    if (handler) {
      handler(info, tab, this.lastContentData);
    }
  },
  _onShown: function (info, tab) {
    this.lastContentData = null;
  },

  _onHidden: function (info, tab) {
    this.lastContentData = null;
  },

  /**
   * メニューの初期化/再設定インタフェース
   */
  initContextMenus: function (prefChanged) {
    if (prefChanged || this.initialized) {
      // minimum update (dummy info)
      this.updateContextMenus({contexts: []}, null, {});
      return;
    }
    this.init();
  },

  /**
   * contextmenuイベント時に呼ばれる更新処理インタフェース
   */
  updateContextMenus: function (info, tab, c) {
    this.lastContentData = c;
    let commonProps = {};
    try {
      commonProps = this.commonUpdate(info, tab, c);
    } catch (e) {
      console.error(e);
    }

    let updated = false;
    for (const [id, handler] of this.updateHandlers) {
      try {
        const data = this.menuSettingById.get(id);
        const contexts = data.contexts || this.menuCommons.contexts;
        if (contexts && info.contexts.length > 0) {
          let matched = false;
          for (const c of contexts) {
            matched = matched || info.contexts.includes(c);
          }
          if (!matched) continue;
        }
        let props = handler(info, tab, c);
        if (props) {
          props = {...commonProps, ...props};
          browser.menus.update(id, props);
          updated = true;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return updated;
  },
};

