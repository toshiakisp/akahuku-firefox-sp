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
    this.attachListenerToExistingWindows (this.listener, {startup: true});
    // observe window creation/destroy
    this.ww.registerNotification (this);
  },
  shutdown : function () {
    this.ww.unregisterNotification (this);
    try {
      this.dettachListenerFromExistingWindows (this.listener, {shutdown: true});
    }
    catch (e) {
      Cu.reportError (e);
    }
    this.listener = null;
  },

  // nsIObserver for nsIWindowWatcher.registerNotification
  observe : function (subject, topic, data) {
    var win = subject.QueryInterface (Ci.nsIDOMWindow);
    try {
      if (topic === "domwindowopened") {
        var that = this;
        win.addEventListener ("load", function () {
          // wait for load event fired to detect windowtype attr
          win.removeEventListener ("load", arguments.callee, false);
          var type = win.document.documentElement
          .getAttribute ("windowtype");
          if (type == that.targetType) {
            that.listener.attachToWindow (win, {startup: false});
          }
        }, false);
      }
      else if (topic === "domwindowclosed") {
        var type = win.document.documentElement
        .getAttribute ("windowtype");
        if (type == this.targetType) {
          this.listener.dettachFromWindow (win, {shutdown: false});
        }
      }
    }
    catch (e) {
      Cu.reportError (e);
    }
  },

  forEachExistingWindow : function (callback) {
    var wins = this.ww.getWindowEnumerator ();
    while (wins.hasMoreElements ()) {
      var w = wins.getNext ();
      var type = w.document.documentElement.getAttribute ("windowtype");
      if (type === this.targetType) {
        if (w.document.readyState !== "complete") {
          w.addEventListener ("load", function () {
            // wait for readyState == "complete"
            w.removeEventListener ("load", arguments.callee, false);
            callback.apply (null, [w]);
          }, false);
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

