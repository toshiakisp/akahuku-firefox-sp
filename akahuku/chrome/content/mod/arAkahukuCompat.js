/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Firefox/Gecko バージョン間の差異を吸収する
 */
var arAkahukuCompat = new function () {
  function _getArg (args, name, defaultValue) {
    if (name in args) {
      return args [name];
    }
    return defaultValue;
  }

  const Ci = Components.interfaces;
  const Cc = Components.classes;
  const Cr = Components.results;

  this.WebBrowserPersist = {
    saveURI : function (webBrowserPersist, args)
    {
      var uri = _getArg (args, 'uri', null);
      var file = _getArg (args, 'file', null);
      var err_args = Components.results.NS_ERROR_XPC_NOT_ENOUGH_ARGS;
      try {
        // oldest version?
        var postData = _getArg (args, 'postData', null);
        webBrowserPersist.saveURI (uri, postData, file);
      }
      catch (e if e.result == err_args) {
        try {
          // Firefox 3.6?-17.0
          var cacheKey = _getArg (args, 'postData', null);
          var referrer = _getArg (args, 'referrer', null);
          var extraHeaders = _getArg (args, 'extraHeaders', null);
          webBrowserPersist.saveURI
            (uri, cacheKey, referrer,
             postData, extraHeaders,
             file);
        }
        catch (e if e.result == err_args) {
          // Firefox 18.0+
          var privacyContext = _getArg (args, 'privacyContext', null);
          webBrowserPersist.saveURI
            (uri, cacheKey, referrer,
             postData, extraHeaders,
             file, privacyContext);
        }
      }
    }
  };

  this.FilePicker = new function () {
    // Fx17 から nsIFilePicker.show() は obsolete になり
    // コールバックを取る非同期な open() が新設された [Bug 731307]。
    // そこで非同期なインタフェースに統一し、
    // 古い環境では非同期呼び出しを模擬することで動作させる。
    this.open = function (picker, callback) {
      if (typeof picker.open !== "function") {
        _asyncShow (picker, callback);
        return;
      }
      if (typeof callback === "function") {
        // nsIFilePickerShownCallback
        var callbackFunc = callback;
        callback = {done : callbackFunc};
      }
      picker.open (callback);
    };

    function _asyncShow (picker, callback) {
      var tm
        = Components.classes ["@mozilla.org/thread-manager;1"]
        .getService (Components.interfaces.nsIThreadManager);
      tm.currentThread.dispatch ({
        run : function () {
          var ret = Components.interfaces.nsIFilePicker.returnCancel;
          try {
            ret = picker.show ();
          }
          catch (e) {
          }
          if (typeof callback === "function") {
            var args = [ret];
            callback.apply (null, args);
          }
          else {
            callback.done (ret);
          }
        }
      }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
    };
  };

  this.AsyncHistory = new function () {
    // 履歴の調査を非同期的なAPIに統一する
    // mozIAsyncHistory.isURIVisited
    if ("@mozilla.org/browser/history;1" in Cc) {
      var asyncHistory
        = Cc ["@mozilla.org/browser/history;1"]
        .getService (Ci.mozIAsyncHistory);
      if ("isURIVisited" in asyncHistory) { // Gecko 11.0+
        this.isURIVisited = asyncHistory.isURIVisited;
      }
      else {
        asyncHistory = null;
      }
    }
    if (!asyncHistory) {
      // async compatibles using sync interfaces
      if ("@mozilla.org/browser/global-history;2" in Cc) {
        var gh2 = Cc ["@mozilla.org/browser/global-history;2"]
          .getService (Ci.nsIBrowserHistory);
        this.isURIVisited = function (uri, callback) {
          callback.isVisited (uri, gh2.isVisited (uri));
        };
      }
      else if ("@mozilla.org/browser/global-history;1" in Cc) {
        var gh1
          = Cc ["@mozilla.org/browser/global-history;1"]
          .getService (Ci.nsIBrowserHistory);
        this.isURIVisited = function (uri, callback) {
          callback.isVisited (uri, gh1.isVisited (uri.spec));
        };
      }
      else {
        // dummy definition
        this.isURIVisited = function (uri, callback) {
          if (callback && "isVisited" in callback) {
            callback.isVisited (uri, false);
          }
        };
      }
    }
  };

};

