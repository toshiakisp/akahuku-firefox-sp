/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

if ("import" in Cu) {
  Cu.import ("resource://akahuku/content-policy.jsm");
}
else {
  var loader
    = Cc ["@mozilla.org/moz/jssubscript-loader;1"]
    .getService (Ci.mozIJSSubScriptLoader);
  loader.loadSubScript ("resource://akahuku/content-policy.jsm");
}

/**
 * Gecko 2.0 より前のXPCOMコンポーネントのエントリーポイント
 */

/**
 * 本体のファクトリー
 *   Inherits From: nsIFactory
 */
var arAkahukuContentPolicyFactory = arAkahukuContentPolicy.prototype._xpcom_factory;

/**
 * XPCOM のモジュール
 *   Inherits From: nsIModule
 */
var arAkahukuContentPolicyModule = {
  /* 本体に関する情報 */
  CONTRACTID: arAkahukuContentPolicy.prototype.contractID,
  CID: arAkahukuContentPolicy.prototype.classID,
  CNAME: arAkahukuContentPolicy.prototype.classDescription,
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェースID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIModule
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Ci.nsISupports)
        || iid.equals (Ci.nsIModule)) {
      return this;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 登録処理
   *   nsIModule.registerSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   * @param  String type
   *         ローダの種類
   */
  registerSelf : function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface (Ci.nsIComponentRegistrar);
    compMgr.registerFactoryLocation (this.CID,
                                     this.CNAME,
                                     this.CONTRACTID,
                                     fileSpec, location, type);
        
    var catman
    = Cc ["@mozilla.org/categorymanager;1"]
    .getService (Ci.nsICategoryManager);
    catman.addCategoryEntry ("content-policy",
                             this.CONTRACTID,
                             this.CONTRACTID, true, true);
  },
    
  /**
   * 登録解除処理
   *   nsIModule.unregisterSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   */
  unregisterSelf : function (compMgr, fileSpec, location) {
    compMgr = compMgr.QueryInterface (Ci.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation (this.CID, fileSpec);
        
    var catman
    = Cc ["@mozilla.org/categorymanager;1"]
    .getService (Ci.nsICategoryManager);
    catman.deleteCategoryEntry ("content-policy",
                                this.CONTRACTID, true);
  },
    
  /**
   * ファクトリーオブジェクトを取得する
   *   nsIModule.getClassObject
   *
   * @param  nsIComponentManager compMgr
   * @param  nsCIDRef cid
   *         取得対象のクラス ID
   * @param  nsIIDRef iid
   *         取得対象のインターフェース ID
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   *         Components.results.NS_ERROR_NO_INTERFACE
   * @return arAkahukuContentPolicyFactory
   *         本体のファクトリー
   */
  getClassObject : function (compMgr, cid, iid) {
    if (cid.equals (this.CID)) {
      return arAkahukuContentPolicyFactory;
    }
        
    if (!iid.equals (Ci.nsIFactory)) {
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    }
        
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 終了できるかどうか
   *   nsIModule.canUnload
   *
   * @param  nsIComponentManager compMgr
   * @return Boolean
   *         終了できるかどうか
   */
  canUnload : function (compMgr) {
    return true;
  }
};

/**
 * モジュールを取得する
 * @param  nsIComponentManager compMgr
 * @param  nsIFile fileSpec
 *         モジュールのファイル
 * @return arAkahukuContentPolicyModule
 *         モジュール
 */
function NSGetModule (compMgr, fileSpec) {
  return arAkahukuContentPolicyModule;
}

/**
 * Gecko 2.0 以降でのXPCOMコンポーネントのインタフェース
 */
var NSGetFactory;
try {
  Cu.import("resource://gre/modules/XPCOMUtils.jsm");
  NSGetFactory = XPCOMUtils.generateNSGetFactory ([arAkahukuContentPolicy]);
}
catch (e) {
  Cu.reportError (e);
}

