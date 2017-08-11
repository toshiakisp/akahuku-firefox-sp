/**
 * XUL Window observer
 */
/* global Components */
var EXPORTED_SYMBOLS = [
  "XULWindowObserver"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

/**
 * Window create/destroy observer
 *
 * listener should implement attachTo/dettachFromWindow methods
 */
var XULWindowObserver = function (listener) {
  this.ww = null;
  this.listener = listener;
}
XULWindowObserver.prototype = {
  targetType : "navigator:browser",
  startup : function () {
    this.ww = Cc ["@mozilla.org/embedcomp/window-watcher;1"]
      .getService (Ci.nsIWindowWatcher);
    var that = this;
    this.forEachExistingWindow (function (win) {
      // listen load/unload events for window
      var param = that.register (win);
      if (win.document.readyState == "complete") {
        // directly attach to existing windows with complete xul document
        var listener = that.listener;
        listener.attachToWindow.apply (listener, [win, {startup: true}]);
        param.attached = true;
      }
    }, true);
    // observe window creation/destroy
    this.ww.registerNotification (this);
  },
  shutdown : function () {
    this.ww.unregisterNotification (this);
    this.unregisterAll ({shutdown: true, unload: false});
    this.listener = null;
  },

  // nsIObserver for nsIWindowWatcher.registerNotification
  observe : function (subject, topic, data) {
    var win = subject.QueryInterface (Ci.nsIDOMWindow);
    try {
      if (topic === "domwindowopened") {
        this.register (win);
      }
      else if (topic === "domwindowclosed") {
        this.unregister (win, {shutdown: false, unload: true});
      }
    }
    catch (e) {
      Cu.reportError (e);
    }
  },

  windowParams : [],

  register : function (win) {
    for (var i = 0; i < this.windowParams.length; i ++) {
      if (this.windowParams [i].window == win) {
        return; // already registered
      }
    }
    var param = {
      window: win,
      attached: false,
      onload: null,
      onunload: null
    };
    this.windowParams.push (param);
    var that = this;
    param.onload = function () {
      var type = win.document.documentElement.getAttribute ("windowtype");
      if (type == that.targetType) {
        param.attached = true;
        that.listener.attachToWindow (win, {startup: false});
      }
    };
    param.onunload = function () {
      if (param.attached) {
        param.attached = false;
        var flags = {shutdown: false, unload: true};
        that.listener.dettachFromWindow (win, flags);
      }
    };
    win.addEventListener ("load", param.onload, false);
    win.addEventListener ("unload", param.onunload, false);
    return param;
  },
  unregister : function (win, flags) {
    for (var i = 0; i < this.windowParams.length; i ++) {
      var param = this.windowParams [i];
      if (param.window == win) {
        param.window.removeEventListener ("load", param.onload, false);
        param.window.removeEventListener ("unload", param.onunload, false);
        if (param.attached) {
          this.listener.dettachFromWindow (param.window, flags);
        }
        this.windowParams.splice (i, 1);
        return;
      }
    }
  },
  unregisterAll : function (flags) {
    for (var i = 0; i < this.windowParams.length; i ++) {
      var param = this.windowParams [i];
      param.window.removeEventListener ("load", param.onload, false);
      param.window.removeEventListener ("unload", param.onunload, false);
      if (param.attached) {
        this.listener.dettachFromWindow (param.window, flags);
      }
    }
    this.windowParams.splice (0);
  },


  forEachExistingWindow : function (callback, optIgnoreState) {
    var wins = this.ww.getWindowEnumerator ();
    while (wins.hasMoreElements ()) {
      var w = wins.getNext ();
      var type = w.document.documentElement.getAttribute ("windowtype");
      if (type === this.targetType) {
        if (!optIgnoreState && w.document.readyState !== "complete") {
          continue;
        }
        try {
          callback.apply (null, [w]);
        }
        catch (e) {
          Cu.reportError (e);
        }
      }
    }
  },
  attachListenerToExistingWindows : function (listener, props) {
    this.forEachExistingWindow (function (win) {
      listener.attachToWindow.apply (listener, [win, props]);
    });
  },
  dettachListenerFromExistingWindows : function (listener, props) {
    this.forEachExistingWindow (function (win) {
      listener.dettachFromWindow.apply (listener, [win, props]);
    });
  },
};

