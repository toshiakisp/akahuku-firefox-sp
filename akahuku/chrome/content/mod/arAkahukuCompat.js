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
};

