
/* global Components, arAkahukuConfig, AkahukuFileUtil, arAkahukuWindow */

/**
 * 音管理
 *  [音]
 */
var arAkahukuSound = {
  enableReloadNormal : false,   /* Boolean  リロード (通常モード) */
  reloadNormalFile : null,      /* nsIURL  リロード (通常モード) のファイル */
    
  enableReloadReply : false,    /* Boolean  リロード (レス送信モード) */
  reloadReplyFile : null,       /* nsIURL  リロード (レス送信モード) のファイル */

  enableNewReply : false,       /* Boolean  新着あり (レス送信モード) */
  newReplyFile : null,          /* nsIURL  新着あり (レス送信モード) のファイル */
    
  enableReloadCatalog : false,  /* Boolean  リロード (カタログモード) */
  reloadCatalogFile : null,     /* nsIURL  リロード (カタログモード) のファイル */
    
  enableExpire : false,         /* Boolean  消滅警告 (続きを読む 時) */
  expireFile : null,            /* nsIURL  消滅警告 (続きを読む 時) のファイル */
    
  enableMakeThread : false,     /* Boolean  レス送信 */
  makeThreadFile : null,        /* nsIURL  レス送信のファイル */
    
  enableReply : false,          /* Boolean  レス送信 */
  replyFile : null,             /* nsIURL  レス送信のファイル */
    
  enableReplyFail : false,      /* Boolean  レス送信失敗 */
  replyFailFile : null,         /* nsIURL  レス送信のファイル */
    
  enableSaveMHT : false,        /* Boolean  mht で保存 */
  saveMHTFile : null,           /* nsIURL  mht で保存のファイル */
    
  enableSaveMHTError : false,   /* Boolean  mht で保存失敗 */
  saveMHTErrorFile : null,      /* nsIURL  mht で保存失敗のファイル */
    
  enableSaveImage : false,      /* Boolean  画像を保存 */
  saveImageFile : null,         /* nsIURL  画像を保存のファイル */
    
  enableSaveImageError : false, /* Boolean  画像を保存失敗 */
  saveImageErrorFile : null,    /* nsIURL  画像を保存失敗のファイル */
    
  sound : null,                 /* nsISound  サウンドオブジェクト */
    
  /**
   * 初期化
   */
  init : function () {
    arAkahukuSound.sound
    = Components.classes ["@mozilla.org/sound;1"]
    .createInstance (Components.interfaces.nsISound);
  },

  term : function () {
    arAkahukuSound.sound = null;
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    var filename;
    var url;
        
    var ios = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (Components.interfaces.nsIIOService);
        
    if (arAkahukuConfig.prefHasUserValue
        ("akahuku.sound.reload")) {
      var value
        = arAkahukuConfig.getBoolPref
        ("akahuku.sound.reload");
            
      arAkahukuConfig.setBoolPref
        ("akahuku.sound.reload.reply", value);
      arAkahukuConfig.setBoolPref
        ("akahuku.sound.reload.catalog", value);
            
      arAkahukuConfig.clearUserPref
        ("akahuku.sound.reload");
    }
        
    if (arAkahukuConfig.prefHasUserValue
        ("akahuku.sound.reload.file")) {
      var value
      = arAkahukuConfig.getCharPref
      ("akahuku.sound.reload.file");
            
      arAkahukuConfig.setCharPref
      ("akahuku.sound.reload.reply.file", value);
      arAkahukuConfig.setCharPref
      ("akahuku.sound.reload.catalog.file", value);
            
      arAkahukuConfig.clearUserPref
      ("akahuku.sound.reload.file");
    }
        
    arAkahukuSound.enableReloadNormal
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.reload.normal", false);
    if (arAkahukuSound.enableReloadNormal) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.reload.normal.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.reloadNormalFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.reloadNormalFile = null;
      }
    }
        
    arAkahukuSound.enableReloadReply
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.reload.reply", false);
    /* 設定を引き継ぐために分岐しない */
    if (arAkahukuSound.enableReloadReply) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.reload.reply.file", "");
      
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.reloadReplyFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.reloadReplyFile = null;
      }
    }
    
    arAkahukuSound.enableNewReply
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.new.reply",
               arAkahukuSound.enableReloadReply);
    var reloadFilename
    = arAkahukuConfig
    .initPref ("char", "akahuku.sound.reload.reply.file", "");
    filename
    = arAkahukuConfig
    .initPref ("char", "akahuku.sound.new.reply.file", reloadFilename);
    if (arAkahukuSound.enableNewReply) {
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.newReplyFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.newReplyFile = null;
      }
    }
    
    arAkahukuSound.enableReloadCatalog
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.reload.catalog", false);
    if (arAkahukuSound.enableReloadCatalog) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.reload.catalog.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.reloadCatalogFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.reloadCatalogFile = null;
      }
    }
        
    arAkahukuSound.enableExpire
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.expire", false);
    if (arAkahukuSound.enableExpire) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.expire.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.expireFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.expireFile = null;
      }
    }
        
    arAkahukuSound.enableMakeThread
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.makethread", false);
    if (arAkahukuSound.enableMakeThread) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.makethread.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.makeThreadFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.makeThreadFile = null;
      }
    }
        
    arAkahukuSound.enableReply
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.reply", false);
    if (arAkahukuSound.enableReply) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.reply.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.replyFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.replyFile = null;
      }
    }
        
    arAkahukuSound.enableReplyFail
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.reply_fail", false);
    if (arAkahukuSound.enableReplyFail) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.reply_fail.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.replyFailFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.replyFailFile = null;
      }
    }
        
    arAkahukuSound.enableSaveMHT
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.savemht", false);
    if (arAkahukuSound.enableSaveMHT) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.savemht.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.saveMHTFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.saveMHTFile = null;
      }
    }
        
    arAkahukuSound.enableSaveMHTError
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.savemht.error", false);
    if (arAkahukuSound.enableSaveMHTError) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.savemht.error.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.saveMHTErrorFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.saveMHTErrorFile = null;
      }
    }
        
    arAkahukuSound.enableSaveImage
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.saveimage", false);
    if (arAkahukuSound.enableSaveImage) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.saveimage.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.saveImageFile = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.saveImageFile = null;
      }
    }
        
    arAkahukuSound.enableSaveImageError
    = arAkahukuConfig
    .initPref ("bool", "akahuku.sound.saveimage.error", false);
    if (arAkahukuSound.enableSaveImageError) {
      filename
        = arAkahukuConfig
        .initPref ("char", "akahuku.sound.saveimage.error.file", "");
      filename = unescape (filename);
            
      url = AkahukuFileUtil.getURLSpecFromNativePath (filename);
            
      if (url) {
        arAkahukuSound.saveImageErrorFile
          = ios.newURI (url, null, null);
      }
      else {
        arAkahukuSound.saveImageErrorFile = null;
      }
    }
  },
    
  /**
   * リロード (通常モード) の音を鳴らす
   */
  playNormalReload : function () {
    if (arAkahukuSound.enableReloadNormal
        && arAkahukuSound.reloadNormalFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.reloadNormalFile);
    }
  },
    
  /**
   * リロード (レス送信モード) の音を鳴らす
   */
  playReplyReload : function () {
    if (arAkahukuSound.enableReloadReply
        && arAkahukuSound.reloadReplyFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.reloadReplyFile);
    }
  },
    
  /**
   * 新着あり (レス送信モード) の音を鳴らす
   */
  playReplyNew : function () {
    if (arAkahukuSound.enableNewReply
        && arAkahukuSound.newReplyFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.newReplyFile);
    }
  },
    
  /**
   * リロード (カタログモード) の音を鳴らす
   */
  playCatalogReload : function () {
    if (arAkahukuSound.enableReloadCatalog
        && arAkahukuSound.reloadCatalogFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.reloadCatalogFile);
    }
  },
    
  /**
   * 消滅警告 (続きを読む 時) の音を鳴らす
   */
  playExpire : function () {
    if (arAkahukuSound.enableExpire
        && arAkahukuSound.expireFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.expireFile);
    }
  },
    
  /**
   * スレ立ての音を鳴らす
   */
  playMakeThread : function () {
    if (arAkahukuSound.enableMakeThread
        && arAkahukuSound.makeThreadFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.makeThreadFile);
    }
  },
    
  /**
   * レス送信の音を鳴らす
   */
  playReply : function () {
    if (arAkahukuSound.enableReply
        && arAkahukuSound.replyFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.replyFile);
    }
  },
    
  /**
   * レス送信失敗の音を鳴らす
   */
  playReplyFail : function () {
    if (arAkahukuSound.enableReplyFail
        && arAkahukuSound.replyFailFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.replyFailFile);
    }
  },
    
  /**
   * mht で保存の音を鳴らす
   */
  playSaveMHT : function () {
    if (arAkahukuSound.enableSaveMHT
        && arAkahukuSound.saveMHTFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.saveMHTFile);
    }
  },
    
  /**
   * mht で保存失敗の音を鳴らす
   */
  playSaveMHTError : function () {
    if (arAkahukuSound.enableSaveMHTError
        && arAkahukuSound.saveMHTErrorFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.saveMHTErrorFile);
    }
  },
    
  /**
   * 画像を保存の音を鳴らす
   */
  playSaveImage : function () {
    if (arAkahukuSound.enableSaveImage
        && arAkahukuSound.saveImageFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.saveImageFile);
    }
  },
    
  /**
   * 画像を保存失敗の音を鳴らす
   */
  playSaveImageError : function () {
    if (arAkahukuSound.enableSaveImageError
        && arAkahukuSound.saveImageErrorFile) {
            
      arAkahukuSound.sound.play (arAkahukuSound.saveImageErrorFile);
    }
  },
    
  /**
   * タブをレス送信中にする
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  setReplying : function (targetDocument) {
    var browser
    = arAkahukuWindow.getBrowserForWindow
    (targetDocument.defaultView);
    if (browser) {
      browser.__akahuku_replying = "1";
    }
  },
    
  /**
   * 音を鳴らす
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info, targetWindow) {
    if (info.isNotFound) {
      return;
    }
        
    var browser
    = arAkahukuWindow.getBrowserForWindow
    (targetDocument.defaultView);
    if (browser) {
      if (targetDocument.location.href.match (/futaba\.php$/)
          && !info.isNotFound) {
        /* スレ立て後、レス送信後、リダイレクトの場合 */
        /* futaba: 未知なので外部には対応しない */
                
        var nodes = targetDocument.getElementsByTagName ("meta");
        for (var i = 0; i < nodes.length; i ++) {
          if (nodes [i].httpEquiv == "refresh") {
            if (nodes [i].content.indexOf ("res") != -1) {
              if ("__akahuku_replying" in browser
                  && browser.__akahuku_replying == "1") {
                /* レス送信 */
                browser.__akahuku_replying = "2";
              }
              else {
                /* スレ立て */
                browser.__akahuku_makethread = "1";
              }
            }
          }
        }
      }
            
      var lasturi = "";
      if ("__akahuku_lasturi" in browser) {
        lasturi = browser.__akahuku_lasturi;
      }
            
      if (info.isReply
          && "__akahuku_makethread" in browser
          && browser.__akahuku_makethread == "1") {
        /* スレ立て後のレス送信モード */
        arAkahukuSound.playMakeThread ();
                
        browser.__akahuku_makethread = "0";
        browser.removeAttribute ("__akahuku_makethread");
      }
      if (info.isReply
          && "__akahuku_replying" in browser
          && browser.__akahuku_replying == "2") {
        /* レス送信後のレス送信モード */
        arAkahukuSound.playReply ();
                
        browser.__akahuku_replying = "0";
        browser.removeAttribute ("__akahuku_replying");
      }
      else if (lasturi == targetDocument.location.href) {
        /* リロード */
                
        if (info.isNormal) {
          arAkahukuSound.playNormalReload ();
        }
        else if (info.isReply) {
          arAkahukuSound.playReplyReload ();
        }
        else if (info.isCatalog) {
          arAkahukuSound.playCatalogReload ();
        }
      }
            
      browser.__akahuku_lasturi = targetDocument.location.href;
    }
  }
};
