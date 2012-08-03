/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * インストールする拡張
 */
var Extension = {
  /* String  バージョン */
  version        : "5.2.90",
  /* String  ダイアログに表示する名前 */
  displayName    : "akahuku",
  /* String  拡張の識別名 */
  appName        : "akahuku",
  /* String  拡張の作者 */
  author         : "arai",
  /* Array  インストールする components のリスト
   *   [String ファイル名, ...] */
  componentsList : [
    "arAkahukuContentPolicy.js",
    "arAkahukuProtocolHandler.js",
    "arAkahukuP2PServant2.js",
    "arAkahukuP2PChannel.js",
    "arIAkahukuP2PServant2.xpt",
    "arIAkahukuP2PServantListener.xpt",
    "arIAkahukuP2PChannel.xpt",
    "arIAkahukuProtocolHandler.xpt"
    ],
  /* Array  前回インストールしたもののうち、削除する components のリスト
   *   [String ファイル名, ...] */
  uninstallList  : [
    ],
  /* Array  インストールする locale のリスト
   *   [String ロケール名, ...] */
  localesList    : [
    ]
};

/**
 * インストール対象の情報
 *
 * @param  Object Extension
 *         インストールする拡張
 * @param  Boolean global
 *         Global ならば true
 *         Profile ならば false
 */
function arSettings (Extension, global) {
  if (global) {
    this.chrome = getFolder ("chrome");
    this.flag   = DELAYED_CHROME;
  }
  else {
    this.chrome = getFolder ("Profile", "chrome");
    this.flag   = PROFILE_CHROME;
  }
  this.components = getFolder ("components");
  this.jarPath    = getFolder (this.chrome, Extension.appName + ".jar");
  this.exists     = File.exists (this.jarPath);
}
arSettings.prototype = {
  chrome : "",     /* String  chrome のパス */
  components : "", /* String  components のパス */
  flag : 0,        /* Number  インストール時のフラグ */
  jarPath : "",    /* String  jar のパス */
  exists : false   /* Boolean  jar が存在するかどうか */
};

/**
 * インストーラ
 *
 * @param  Object Extension
 *         インストールする拡張
 */
function arInstaller (Extension) {
  this.init (Extension);
}

arInstaller.prototype = {
  extension : null, /* Object  インストールする拡張 */
  global : null,    /* arSettings  Global インストールの設定 */
  profile : null,   /* arSettings  Profile インストールの設定 */
    
  /**
   * 初期化
   *
   * @param  Object Extension
   *         インストールする拡張
   */
  init : function (Extension) {
    this.extension = Extension;
    this.global = new arSettings (Extension, true);
    this.profile = new arSettings (Extension, false);
  },
    
  /**
   * 不要なファイルを削除する
   */
  uninstall : function () {
    var i;
    var err;
    var oldFile;
        
    if (buildID <= 2003072300) {
      /* Wazilla 等では全てのファイルを削除してからでないとインストールできない
       * また、一旦移動してからでないと削除できない */
            
      /* 移動 */
      initInstall ("uninstall_old",
                   "/" + this.extension.author + "/uninstall_old",
                   "0.0");
      if (this.global.exists) {
        File.rename (this.global.jarPath,
                     this.extension.appName
                     + "_uninstalled");
      }
      if (this.profile.exists) {
        File.rename (this.profile.jarPath,
                     this.extension.appName
                     + "_uninstalled");
      }
      for (i = 0; i < this.extension.uninstallList.length; i ++) {
        oldFile = getFolder (this.global.components,
                             this.extension.uninstallList [i]);
        if (File.exists (oldFile)) {
          File.rename (oldFile,
                       this.extension.appName
                       + "_uninstalled2_" + i);
        }
        oldFile = getFolder (this.profile.chrome,
                             this.extension.uninstallList [i]);
        if (File.exists (oldFile)) {
          File.rename (oldFile,
                       this.extension.appName
                       + "_uninstalled2_" + i);
        }
      }
      for (i = 0; i < this.extension.componentsList.length; i ++) {
        oldFile = getFolder (this.global.components,
                             this.extension.componentsList [i]);
        if (File.exists (oldFile)) {
          File.rename (oldFile,
                       this.extension.appName
                       + "_uninstalled_" + i);
        }
        oldFile = getFolder (this.profile.chrome,
                             this.extension.componentsList [i]);
        if (File.exists (oldFile)) {
          File.rename (oldFile,
                       this.extension.appName
                       + "_uninstalled_" + i);
        }
      }
      err = getLastError ();
      if (err == SUCCESS) {
        var err = performInstall ();
        if (err == SUCCESS) {
          cancelInstall (err);
        }
      }
      else {
        cancelInstall (err);
      }
    
      /* 削除 */
      initInstall ("uninstall_old",
                   "/" + this.extension.author + "/uninstall_old",
                   "0.1");
      if (this.global.exists) {
        File.remove (getFolder (this.global.chrome,
                                this.extension.appName
                                + "_uninstalled"));
      }
      if (this.profile.exists) {
        File.remove (getFolder (this.profile.chrome,
                                this.extension.appName
                                + "_uninstalled"));
      }
      for (i = 0; i < this.extension.uninstallList.length; i ++) {
        oldFile = getFolder (this.global.components,
                             this.extension.appName
                             + "_uninstalled2_" + i);
        if (File.exists (oldFile)) {
          File.remove (oldFile);
        }
        oldFile = getFolder (this.profile.chrome,
                             this.extension.appName
                             + "_uninstalled2_" + i);
        if (File.exists (oldFile)) {
          File.remove (oldFile);
        }
      }
      for (i = 0; i < this.extension.componentsList.length; i ++) {
        oldFile = getFolder (this.global.components,
                             this.extension.appName
                             + "_uninstalled_" + i);
        if (File.exists (oldFile)) {
          File.remove (oldFile);
        }
        oldFile = getFolder (this.profile.chrome,
                             this.extension.appName
                             + "_uninstalled_" + i);
        if (File.exists (oldFile)) {
          File.remove (oldFile);
        }
      }
      err = getLastError ();
      if (err == SUCCESS) {
        var err = performInstall ();
        if (err == SUCCESS) {
          cancelInstall (err);
        }
      }
      else {
        cancelInstall (err);
      }
    }
    else {
      /* Wazilla 以外では不要になったファイルのみ削除する */
            
      initInstall ("uninstall_old",
                   "/" + this.extension.author + "/uninstall_old",
                   "0.0");
      for (i = 0; i < this.extension.uninstallList.length; i ++) {
        oldFile = getFolder (this.global.components,
                             this.extension.uninstallList [i]);
        if (File.exists (oldFile)) {
          File.remove (oldFile);
        }
        oldFile = getFolder (this.profile.chrome,
                             this.extension.uninstallList [i]);
        if (File.exists (oldFile)) {
          File.remove (oldFile);
        }
      }
      err = getLastError ();
      if (err == SUCCESS) {
        var err = performInstall ();
        if (err == SUCCESS) {
          cancelInstall (err);
        }
      }
      else {
        cancelInstall (err);
      }
    }
  },
    
  /**
   * インストール先を取得する
   */
  getTarget : function () {
    var selected = false;
    var installToProfile = false;

    if (buildID > 2003072300) {
      /* Wazilla 等では必ず Global にインストールする
       * それ以外では状況から判断する */
            
      if (this.profile.exists) {
        if (confirm ("\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u524D\u56DE\u306E\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3092\u767A\u898B\u3057\u307E\u3057\u305F\u3002\n"
                     + "\u3053\u308C\u3092\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3057\u307E\u3059\u304B\uFF1F")) {
          installToProfile = true;
          selected = true;
        }
      }
      else if (this.global.exists) {
        if (confirm ("\u30B0\u30ED\u30FC\u30D0\u30EB\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u524D\u56DE\u306E\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3092\u767A\u898B\u3057\u307E\u3057\u305F\u3002\n"
                     + "\u3053\u308C\u3092\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3057\u307E\u3059\u304B\uFF1F")) {
          installToProfile = false;
          selected = true;
        }
      }
            
      if (!selected) {
        installToProfile = confirm ("\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3059\u308B\u306B\u306F OK \u3092\u3001\n"
                                    + "\u30B0\u30ED\u30FC\u30D0\u30EB\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3059\u308B\u306B\u306F\u30AD\u30E3\u30F3\u30BB\u30EB\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      }
    }
        
    if (installToProfile) {
      this.target = this.profile;
    }
    else {
      this.target = this.global;
    }
  },
    
  /**
   * インストールする
   */
  install : function () {
    var i;
    initInstall (this.extension.displayName
                 + " " + this.extension.version,
                 "/" + this.extension.author
                 + "/" + this.extension.appName,
                 this.extension.version);
        
    /* components のインストール */
    for (i = 0; i < this.extension.componentsList.length; i ++) {
      addFile (null,
               "components/" + this.extension.componentsList [i],
               this.global.components, null);
    }
        
    /* jar のインストール */
    addFile ("/" + this.extension.author
             + "/" + this.extension.appName,
             this.extension.version,
             "chrome/" + this.extension.appName + ".jar",
             this.target.chrome,
             null);
    registerChrome (CONTENT | this.target.flag,
                    this.target.jarPath,
                    "content/");

    /* locale のインストール */
    for (i = 0; i < this.extension.localesList.length; i ++) {
      registerChrome (LOCALE | this.target.flag,
                      this.target.jarPath,
                      "locale/"
                      + this.extension.localesList [i] +"/");
    }

    var err;
    err = getLastError ();
    if (err == SUCCESS) {
      err = performInstall ();
      if (err == SUCCESS || err == 999) {
      }
      else {
        cancelInstall (err);
      }
    }
    else {
      cancelInstall (err);
    }
  }
};

var installer = new arInstaller (Extension);
installer.uninstall ();
installer.getTarget ();
installer.install ();
