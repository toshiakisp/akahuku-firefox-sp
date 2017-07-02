/**
 * Global notification observer e10s-ready wrapper
 * with webRequest-like interface for http-on-* (not fully implemented)
 */

var EXPORTED_SYMBOLS = [
  "AkahukuObserver",
];

const ipcBaseName = "akahuku.fx.sp@toshiakisp.github.io/Observer/";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import ("resource://akahuku/console.jsm");
var console = new AkahukuConsole ();
console.prefix = "Akahuku debug(observer)";

var isE10sReady = false;
var inMainProcess = true;
try {
  var appinfo
    = Cc ["@mozilla.org/xre/app-info;1"]
    .getService (Ci.nsIXULRuntime);
  if (typeof appinfo.browserTabsRemoteAutostart !== "undefined") {
    isE10sReady = true;

    // Check Palemoon 25+ (Goanna)
    var ai = Cc ["@mozilla.org/xre/app-info;1"]
      .getService (Ci.nsIXULAppInfo);
    if (ai.ID === "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}") {
      isE10sReady = false;
    }
  }
  if (appinfo.processType !== appinfo.PROCESS_TYPE_DEFAULT) {
    inMainProcess = false;
    console.prefix = "Akahuku debug(observer#" + appinfo.processID + ")";
  }
}
catch (e) {
  console.exception (e);
}


// Utilities

function Object_create (prototype) {
  if (typeof Object.create !== "undefined") {
    // requires Gecko 2.0 (Firefox 4.0)
    return Object.create (prototype);
  }
  else {
    // Polyfill
    if(prototype !== Object (prototype) && prototype !== null) {
      throw TypeError('Argument must be an object, or null');
    }
    Object_create_Temp.prototype = prototype || {};
    var result = new Object_create_Temp ();
    Object_create_Temp.prototype = null;
    if (prototype == null) {
      result.__proto__ = null;
    }
    return result;
  }
}
var Object_create_Temp = function () {};

function Object_assign (target) {
  if (typeof Object.assign == "function") {
    // Object.assign: requires Gecko 34.0+
    return Object.assign.apply (null, arguments);
  }

  // Polyfill
  if (typeof target === "undefined" || target === null) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  var result = Object (target);
  for (var i = 1; i < arguments.length; i ++) {
    var src = arguments [i];
    if (src !== undefined && src !== null) {
      for (var prop in src) {
        if (Object.prototype.hasOwnProperty.call (src, prop)) {
          result [prop] = src [prop];
        }
      }
    }
  }
  return result;
}


function getWindowIDs (contextWindow) {
  var ret = {
    innerWindowID: -1, // page
    outerWindowID: -1, // navigation context
  };
  try {
    var contextWinUtil
      = contextWindow.QueryInterface (Ci.nsIInterfaceRequestor)
      .getInterface (Ci.nsIDOMWindowUtils);
    // requires Gekco 2.0 (Firefox 4) or above
    ret.outerWindowID = contextWinUtil.outerWindowID || -1;
    ret.innerWindowID = contextWinUtil.currentInnerWindowID || -1;
  }
  catch (e) {
    console.exception (e);
  }
  return ret;
}

/**
 * notification observer base
 */
function BaseNotificationObserver (topics) {
  var obj = Object_create (BaseNotificationObserver.prototype);
  obj.targetTopics = topics;
  obj.registered = false;
  obj.callback = null;
  return obj;
};
BaseNotificationObserver.prototype = {
  /**
   * オブザーバを登録する
   *
   * @param function callback
   * @param Object filter
   * @param Object extraInfo
   */
  register : function (callback, filter, extraInfo) {
    this.callback = callback;
    if (!this.registered) {
      this.os
        = Cc ["@mozilla.org/observer-service;1"]
        .getService (Ci.nsIObserverService);
      try {
        for (var i = 0; i < this.targetTopics.length; i ++) {
          this.os.addObserver (this, this.targetTopics [i], false);
        }
        this.registered = true;
      }
      catch (e) {
        if (e.result == Components.results.NS_ERROR_NOT_IMPLEMENTED) {
          // http-on-* observers only work in the parent process
          console.error
            ("Can't monitor detail load errors of preview"
             + " in a content process by observing http-on-*");
        }
        else {
          console.exception (e);
        }
      }
    }
    this.onRegistered (callback, filter, extraInfo);
  },
  // virtual
  onRegistered : function (callback, filter, extraInfo) {
  },


  /**
   * オブザーバを解除
   */
  unregister : function () {
    if (this.registered) {
      this.registered = false;
      for (var i = 0; i < this.targetTopics.length; i ++) {
        this.os.removeObserver (this, this.targetTopics [i], false);
      }
      if (typeof this.callback &&
          typeof this.callback.detachIPCMessageManager !== "undefined") {
        // e10s: as arIPCProxyChild
        this.callback.detachIPCMessageManager ();
      }
      this.callback = null;
    }
  },

  /**
   * 通知を受け取る
   *   nsIObserver.observe
   */
  observe : function (subject, topic, data) {
    var ok = false;
    for (var i = 0; i < this.targetTopics.length; i ++) {
      if (topic === this.targetTopics [i]) {
        ok = true;
        break;
      }
    }
    if (!ok || !this.shouldProc (subject, topic, data)) {
      return;
    }
    this.onNotified (subject, topic, data);
  },

  /**
   * 通知を処理すべきか判定する (virtual)
   */
  shouldProc : function (subject, topic, data) {
    return false;
  },

  /**
   * 通知を処理する (virtual)
   */
  onNotified : function (subject, topic, data) {
    this.callback.call (topic);
  },
};


/**
 * http-on-* 通知のオブザーバ
 */
function HttpNotificationObserver (topics, extraInfoSpec) {
  var obj = Object_create (HttpNotificationObserver.prototype);
  Object_assign (obj, BaseNotificationObserver (topics));

  obj.targetInnerWindowID = -1;
  obj.targetURIs = [];
  obj.targetTypes = [];
  obj.extraInfoSpec = extraInfoSpec;
  return obj;
};
/**
 * 処理すべきチャネルの情報を得る
 *
 * @param nsIChannel channel
 */
HttpNotificationObserver.getChannelDetails = function (channel) {
  var details = {
    //requestId: -1,
    url: "",
    method: "",
    //frameId: -1,
    //parentFrameId: -1,
    //tabId: -1,
    _type: null,
    //timestamp: 0,
    originUrl: "",
    // for internal use
    _innerWindowID: -1,
    _outerWindowID: -1,
  };

  var uri = channel.originalURI;
  if (channel.loadFlags & Ci.nsIChannel.LOAD_REPLACE) {
    details._originalUrl = uri.spec;
    uri = channel.URI;
  }
  details.url = uri.spec;

  var protocolVersionText = "HTTP/1.1";
  try {
    details.statusCode = channel.responseStatus;
    details.method = channel.requestMethod;
    if (typeof channel.protocolVersion !== "undefined") {
      switch (channel.protocolVersion) {
        case "h2":
          protocolVersionText = "HTTP/2.0";
          break;
        case "http/1.1":
          protocolVersionText = "HTTP/1.1";
          break;
        case "http/1.0":
          protocolVersionText = "HTTP/1.0";
          break;
        default:
      }
    }
    details.statusLine
      = protocolVersionText
      + " " + channel.responseStatus
      + " " + channel.responseStatusText;
  }
  catch (e) {
    if (e.result == Cr.NS_ERROR_NOT_AVAILABLE) {
      // no response yet
    }
    else {
      console.exception (e);
    }
  }

  try {
    if (channel.loadInfo) {
      // requires Gecko 33.0+
      details._outerWindowID = channel.loadInfo.outerWindowID || -1;
      details._innerWindowID = channel.loadInfo.innerWindowID || -1;

      if (channel.loadInfo.externalContentPolicyType) {
        // とりあえず webRequest での定義はさておき "_IMAGE" などにする
        details._type = channel.loadInfo.externalContentPolicyType;
        for (var type in Ci.nsIContentPolicy) {
          if (Ci.nsIContentPolicy [type] === details._type) {
            details._type = type.replace (/^TYPE/, "");
            break;
          }
        }
      }
      if (channel.loadInfo.triggeringPrincipal &&
          channel.loadInfo.triggeringPrincipal.URI) {
        details.originUrl = channel.loadInfo.triggeringPrincipal.URI.spec;
      }
    }
    else {
      // Old way without nsIChannel.loadInfo
      var contextWindow = null;
      var callbacks = channel.notificationCallbacks;
      if (!callbacks && channel.loadGroup) {
        callbacks = channel.loadGroup.notificationCallbacks;
      }
      if (callbacks instanceof Ci.nsIInterfaceRequestor) {
        var loadContext = callbacks.getInterface (Ci.nsILoadContext);
        contextWindow = loadContext.associatedWindow;
        var ids = getWindowIDs (contextWindow);
        details._outerWindowID = ids.outerWindowID;
        details._innerWindowID = ids.innerWindowID;
      }
    }
  }
  catch (e) {
    console.exception (e);
  }

  return details;
};


/**
 * HttpNotificationObserver.prototype
 */
HttpNotificationObserver.prototype
= Object_create (BaseNotificationObserver.prototype);

HttpNotificationObserver.prototype
.onRegistered = function (callback, filter, extraInfo) {
  var {urls, types, windowId} = filter;
  this.extraInfo = extraInfo || {};

  var ios = Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService);
  for (var i = 0; i < urls.length; i ++) {
    try {
      this.targetURIs.push (ios.newURI (urls [i], null, null));
    }
    catch (e) {
      console.exception (e);
    }
  }
  this.targetInnerWindowID = windowId || -1;
  this.targetTypes = types || [];
};

HttpNotificationObserver.prototype
.shouldProc = function (subject, topic, data) {
  if (!(subject instanceof Ci.nsIHttpChannel)) {
    return false;
  }

  var details = HttpNotificationObserver.getChannelDetails (subject);
  this._details = details;
  if (this.extraInfo.responseHeaders) {
    details.responseHeaders = [];
    try {
      subject.visitResponseHeaders ({
        visitHeader: function (header, value) {
          details.responseHeaders.push ({name: header, value: value});
        },
      });
    }
    catch (e) {
      console.exception (e);
    }
  }
  if (this.extraInfo.requestHeaders) {
    details.requestHeaders = [];
    try {
      subject.visitRequestHeaders ({
        visitHeader: function (header, value) {
          details.requestHeaders.push ({name: header, value: value});
        },
      });
    }
    catch (e) {
      console.exception (e);
    }
  }

  var ios = Cc ["@mozilla.org/network/io-service;1"]
    .getService (Ci.nsIIOService);
  var uris = [ios.newURI (details.url, null, null)];

  if (details._originalUrl) { // redirected
    uris.push (ios.newURI (details._originalUrl, null, null));
  }

  // URI 合致判定
  var ok = false;
  for (var i = 0; i < this.targetURIs.length; i ++) {
    for (var j = 0; j < uris.length; j ++) {
      if (uris [j].equals (this.targetURIs [i])) {
        ok = true;
        break;
      }
    }
    if (ok) {
      break;
    }
  }
  if (!ok) {
    return false;
  }

  // TYPE フィルタリング [optional]
  if (this.targetTypes.length > 0 && details._type) {
    for (var i = 0; i < this.targetTypes.length; i ++) {
      if (this.targetTypes [i] != details._type) {
        return false;
      }
    }
  }

  // リクエスト生成元の同一判定
  if (this.targetInnerWindowID >= 0 &&
      details._innerWindowID >= 0 &&
      this.targetInnerWindowID != details._innerWindowID) {
    return false;
  }

  return true;
};

HttpNotificationObserver.prototype
.onNotified = function (subject, topic, data) {
  if (this._details) {
    this.callback.call (null, this._details);
  }
};


/**
 * Cookie ブロッカー
 */
function CookieBlocker (topics, extraInfoSpec) {
  var obj = Object_create (CookieBlocker.prototype);
  Object_assign (obj, HttpNotificationObserver (topics, extraInfoSpec));
  return obj;
};
CookieBlocker.prototype
= Object_create (HttpNotificationObserver.prototype);

CookieBlocker.prototype
.onNotified = function (subject, topic, data) {
  if (this._details) {
    var cookie;
    try {
      if (topic == "http-on-modify-request") {
        // リクエストにクッキーを含めないように
        cookie = subject.getRequestHeader ("Cookie");
        if (cookie) {
          subject.setRequestHeader ("Cookie", "", false);
        }
      }
      else { // http-on-examine-response etc.
        // レスポンスによってクッキーをセットされないように
        cookie = subject.getResponseHeader ("Cookie");
        if (cookie) {
          subject.setResponseHeader ("Set-Cookie", "", false);
        }
      }
    }
    catch (e) {
      if (e.result == Cr.NS_ERROR_NOT_AVAILABLE) {
        // no Cookie in header
      }
      else {
        console.exception (e);
      }
    }
    if (cookie) {
      // ブロック後の情報に更新
      this._details = HttpNotificationObserver.getChannelDetails (subject);
      this._details.blockedCookie = cookie;
      this.callback.call (null, this._details);
    }
  }
};


/**
 * NotificationObserver クラスのファクトリ (IPC)
 */
var NotificationObserverFactory = {
  /**
   * 生成 (IPC main-process version)
   *
   * @param String eventName
   */
  create : function (eventName) {
    var topics;
    switch (eventName) {
      case "onHeadersReceived":
        topics = [
          "http-on-examine-response",
          "http-on-examine-cached-response",
          "http-on-examine-merged-response",
        ];
        return HttpNotificationObserver (topics);
        break;
      case "onBeforeSendHeaders":
        topics = [
          "http-on-modify-request",
        ];
        return HttpNotificationObserver (topics);
        break;
      case "cookieBlockerRequest":
        return CookieBlocker (["http-on-modify-request"]);
        break;
      case "cookieBlockerResponse":
        topics = [
          "http-on-examine-response",
          "http-on-examine-cached-response",
          "http-on-examine-merged-response",
        ];
        return CookieBlocker (topics);
        break;
      default:
        throw Error ("unsupported topics: " + eventName);
    }
  },
};

if (isE10sReady) {
  Cu.import ("resource://akahuku/ipc.jsm");
  Cu.import ("resource://akahuku/ipc-proxy.jsm");

  if (arAkahukuIPC.inMainProcess) {
    // IPC メッセージの受入準備

    var factoryWrapper = {
      create : function (eventName) {
        var observer = NotificationObserverFactory.create (eventName);
        // observer から observer proxy (parent) を生成しつつ
        // IPC-transferable な情報を生成して送り返す
        var observerP = new arIPCProxyParent (observer);
        var mm = arAkahukuIPCRoot.messageTarget;
        observerP.attachIPCMessageManager (mm);
        // set shutdown timing
        observerP.unregister = function () {
          observerP.target.unregister ();
          observerP.detachIPCMessageManager ();
        };
        return {id: observerP.id};
      },
    };

    arAkahukuIPCRoot.defineProc
      (factoryWrapper, "ObserverFactory", "create");
  }
  else { // in child processes
    NotificationObserverFactory.create = function (eventName) {
      var observerT
        = arAkahukuIPC.sendSyncCommand
        ("ObserverFactory/create", [eventName]);
      // 戻された transferable な情報から
      // observer proxy (child) を生成する
      var proto = BaseNotificationObserver.prototype;
      var observerC = new arIPCProxyChild (proto);
      observerC.parentId = observerT.id;
      var mm = arAkahukuIPC.getChildProcessMessageManager ();
      observerC.attachIPCMessageManager (mm);
      return observerC;
    };
  }
}

/**
 * イベントの管理
 *   複数の通知をまとめてイベントを定義しリスナを管理する
 */
function NotificationEventManager (eventName, allowedInfoSpec) {
  this._eventName = eventName;
  this._observers = [];
  this._allowedInfoSpec = allowedInfoSpec || [];
}

NotificationEventManager.convFilterFromContent = function (contentFilter) {
  var {urls, types, _window} = contentFilter;
  var filter = {
    urls: urls,
    types: types,
    windowId: -1,
  };
  if (_window) {
    var ids = getWindowIDs (_window);
    filter.windowId = ids.innerWindowID;
  }
  return filter;
};
NotificationEventManager.parseExtraInfoSpec = function (extra, allowed) {
  if (!extra) {
    extra = [];
  }
  var ret = {};
  for (var i = 0; i < extra.length; i ++) {
    if (allowed.indexOf (extra [i]) === -1) {
      console.error ("ignore invalid option in extraInfoSpec;", extra [i]);
    }
  }
  for (var i = 0; i < allowed.length; i ++) {
    ret [allowed [i]] = (extra.indexOf (allowed [i]) != -1);
  }
  return ret;
};


NotificationEventManager.prototype = {
  addListener : function (listener, filter, extra) {
    if (this.hasListener (listener)) {
      return;
    }
    var actualFilter
      = NotificationEventManager.convFilterFromContent (filter);
    var extraInfo
      = NotificationEventManager
      .parseExtraInfoSpec (extra, this._allowedInfoSpec);
    var observer
      = NotificationObserverFactory.create (this._eventName);
    observer.register (listener, actualFilter, extraInfo);
    this._observers.push ({listener: listener, observer: observer});
  },
  removeListener : function (listener) {
    for (var i = 0; i < this._observers.length; i ++) {
      if (this._observers [i].listener == listener) {
        if (this._observers [i].observer) {
          this._observers [i].observer.unregister ();
        }
        this._observers.splice (i, 1);
        return;
      }
    }
  },
  hasListener : function (listener) {
    for (var i = 0; i < this._observers.length; i ++) {
      if (this._observers [i].listener == listener) {
        return true;
      }
    }
    return false;
  },
};


/**
 * Exporting module
 */
var AkahukuObserver= {
  /**
   * webRequest 風イベントハンドラ(必要なものだけ)
   */
  webRequest: {
    onSendHeaders:
      new NotificationEventManager
      ("onBeforeSendHeaders", ["requestHeaders"]),
    onHeadersReceived:
      // "blocking" は未サポート
      new NotificationEventManager
      ("onHeadersReceived", ["responseHeaders"]),
  },

  /**
   * 特殊: Cookie ブロッカー
   * (webRequest風に実装するのが e10s では面倒なので専用を用意)
   *
   * addListener することで Cookie をブロックするようになり
   * 結果をコールバックで確認できる
   */
  cookieBlocker: {
    onRequestBlocked:
      new NotificationEventManager ("cookieBlockerRequest"),
    onResponseBlocked:
      new NotificationEventManager ("cookieBlockerResponse"),
  },
};


