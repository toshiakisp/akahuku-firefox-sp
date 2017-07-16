/**
 * Dynamical XUL context-menu constructor for restartlessness
 * which provides a simillar interface with contextMenus in webext
 */
/* global Components, Promise, XULWindowObserver */

var EXPORTED_SYMBOLS = [
  "AkahukuContextMenus",
  "AkahukuContextMenusService",
];

var Cu = Components.utils;

Cu.import ("resource://akahuku/xul-window-observer.jsm");

var UPromise;
if (typeof Promise !== "undefined") {
  UPromise = Promise;
}
else {
  var {akPromise} = Cu.import ("resource://akahuku/promise-polyfill.jsm", {});
  UPromise = akPromise;
}

/**
 * Pan-window XUL menuitem handler
 */
function XULMenuItem (props) {
  this.id = props.id;
  this.parentId = props.parentId;
  this.type = props.type || "normal";
  this.title = props.title;
  this.onclick = props.onclick;
  this.events = [];

  if (!props.contexts) {
    this.contexts = ["page_action"];
  }
  else if (props.contexts.length > 1) {
    throw "no multiple contexts support"
  }
  else {
    this.contexts = [String (props.contexts [0])];
  }
  switch (this.contexts [0]) {
    case "page_action":
      this.popupId = "contentAreaContextMenu";
      this.insertBefore = props._insertbefore || "spell-separator";
      if (this.onclick) {
        this.events.push ("command");
      }
      break;
    case "tab":
      this.popupId = "tabContextMenu";
      this.insertBefore = props._insertbefore;
      if (this.onclick) {
        this.events.push ("command");
      }
      break;
    case "_xul_mainpopupset"://special
      this.popupId = "mainPopupSet";
      this.insertBefore = props._insertbefore;
      if (!this.parentId) {
        this.type = "_xul_menupopup";
        this.onshowing = props._onshowing;
        if (this.onshowing) {
          this.events.push ("popupshowing");
        }
      }
      else {
        if (this.onclick) {
          this.events.push ("command");
        }
      }
      break;
    default:
      throw "Unknown context: " + this.contexts [0];
  }
};
XULMenuItem.prototype = {
  attachToWindow : function (xulWindow) {
    var popup = xulWindow.document.getElementById (this.popupId);
    if (!popup) {
      if (this.popupId == "tabContextMenu") {
        // for Fx < 4.0
        var tabbrowser = xulWindow.document.getElementById ("content");
        popup = xulWindow.document
          .getAnonymousElementByAttribute
          (tabbrowser, "anonid", "tabContextMenu");
        if (!popup) {
          Cu.reportError (new Error ("popup not found"));
          return false;
        }
      }
      else {
        Cu.reportError (new Error ("popup not found"));
        return false;
      }
    }
    var node = xulWindow.document.getElementById (this.id);
    if (node) { // same-id node exists
      Cu.reportError (new Error ("same-id node exists"));
      return false;
    }

    if (this.parentId) {
      var parentItem = popup.querySelector ("#" + this.parentId);
      if (parentItem) { // to be a submenu
        popup = parentItem;
        // FIXME parentItem should be a "menu" or "menupopup"
      }
    }

    var nodeName = "";
    switch (this.type) {
      case "normal":
      case "checkbox":
        nodeName = "menuitem";
        break;
      case "separator":
        nodeName = "menuseparator";
        break;
      case "_xul_menupopup":
        nodeName = "menupopup";
        break;
    }
    if (!nodeName) {
      Cu.reportError (new Error ("node name was not determined"));
      return false;
    }

    var ns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = xulWindow.document.createElementNS (ns, nodeName);
    item.id = this.id;
    item.enabled = true;
    switch (this.type) {
      case "normal":
        item.setAttribute ("label", this.title);
        break;
      case "checkbox":
        item.setAttribute ("label", this.title);
        item.setAttribute ("type", "checkbox");
        item.setAttribute ("autocheck", "false");
        break;
      case "separator":
        break;
      case "_xul_menupopup":
        item.setAttribute ("position", "after_start");
        break;
      default:
        throw new Error ("unkown type: " + this.type);
    }
    for (var i = 0; i < this.events.length; i ++) {
      item.addEventListener (this.events [i], this, false);
    }

    var nodeBefore = null;
    if (this.insertBefore) {
      nodeBefore = xulWindow.document.getElementById (this.insertBefore);
    }
    else if (this.popupId == "tabContextMenu") {
      nodeBefore = popup.lastChild.previousSibling;
    }
    if (nodeBefore && nodeBefore.parentNode == popup) {
      popup.insertBefore (item, nodeBefore);
    }
    else {
      popup.appendChild (item);
    }
  },

  dettachFromWindow : function (xulWindow) {
    var popup = xulWindow.document.getElementById (this.popupId);
    var node = xulWindow.document.getElementById (this.id);
    if (node && popup && node.parentNode == popup) {
      for (var i = 0; i < this.events.length; i ++) {
        node.removeEventListener (this.events [i], this);
      }
      popup.removeChild (node);
    }
  },

  handleEvent : function (event) {
    switch (event.type) {
      case "command":
        if (typeof this.onclick === "function") {
          this.onclick.apply (null, [event]);
        }
      case "popupshowing":
        if (typeof this.onshowing === "function") {
          this.onshowing.apply (null, [event]);
        }
    }
  },

  update : function (props) {
    // not implemented yet
  },
};

/**
 * synchronus XUL contextMenus registry
 */
function ContextMenuRegistry () {
  this.menuitems = [];
  this.windowObserver = null;
  this.observing = false;
}
ContextMenuRegistry.prototype = {
  // methods for chrome.popupMenu API
  create : function (createProperties) {
    var item = new XULMenuItem (createProperties);
    this.register (item);
    return item.id;
  },
  update : function (id, updateProperties) {
    var item = this.getById (id);
    item.update (updateProperties);
    return UPromise.resolve ();
  },
  remove : function (id) {
    this.unregister (id);
    return UPromise.resolve ();
  },
  removeAll : function () {
    this.unregisterAll ();
    return UPromise.resolve ();
  },

  register : function (item) {
    this.menuitems.push (item);
    if (this.observing) {
      this.windowObserver.attachListenerToExistingWindows (item);
    }
    else {
      this.windowObserver = new XULWindowObserver (this);
      this.windowObserver.startup ();
      this.observing = true;
    }
  },
  getById : function (id) {
    for (var i; i < this.menuitems.length; i ++) {
      if (this.menuitems [i].id === id) {
        return this.menuitems [i];
      }
    }
    return null;
  },
  unregister : function (id) {
    for (var i; i < this.menuitems.length; i ++) {
      if (this.menuitems [i].id === id) {
        var item = this.menuitems [i];
        this.menuitems.splice (i, 1);
        if (this.observing) {
          this.windowObserver.dettachListenerFromExistingWindows (item);
        }
      }
    }
    if (this.menuitems.length == 0
        && this.observing) {
      this.windowObserver.shutdown ();
      this.observing = false;
    }
  },
  unregisterAll : function () {
    if (this.observing) {
      this.windowObserver.shutdown ();
      this.observing = false;
    }
    for (var i; i < this.menuitems.length; i ++) {
      this.menuitems [i].remove ();
    }
    this.menuitems.splice (0);
  },

  // for XULWindowObserver
  attachToWindow : function (xulWindow) {
    for (var i = 0; i < this.menuitems.length; i ++) {
      this.menuitems [i].attachToWindow (xulWindow);
    }
  },
  dettachFromWindow : function (xulWindow) {
    for (var i = 0; i < this.menuitems.length; i ++) {
      this.menuitems [i].dettachFromWindow (xulWindow);
    }
  },
};

var contextMenus = null;
var AkahukuContextMenus = {
  create : function (createProperties) {
    return contextMenus.create (createProperties);
  },
  update : function (id, updateProperties) {
    return contextMenus.update (id, updateProperties);
  },
  remove : function (id) {
    return contextMenus.remove (id);
  },
  removeAll : function () {
    return contextMenus.removeAll ();
  },

  /* TODO
  onClicked : {
    addListener : function (listener) {
    },
    removeListener : function (listener) {
    },
    hasListener : function (listener) {
      return false;
    },
  }
  */
};

var AkahukuContextMenusService = {
  _started : false,
  startup : function () {
    if (this._started) {
      return;
    }
    contextMenus = new ContextMenuRegistry ();
    this._started = true;
  },
  shutdown : function () {
    contextMenus.removeAll ();
    contextMenus = null;
    this._started = true;
  },
};

