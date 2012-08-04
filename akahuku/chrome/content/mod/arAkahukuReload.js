/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter,
 *          arAkahukuDocumentParam, arAkahukuDOM, arAkahukuImage, arAkahukuLink,
 *          arAkahukuP2P, arAkahukuQuote, arAkahukuSidebar, arAkahukuSound,
 *          arAkahukuThread, arAkahukuTitle
 */

/**
 * [続きを読む] のキャッシュ書き込み
 *   Inherits From: nsICacheListener
 */
function arAkahukuReloadCacheWriter () {
}
arAkahukuReloadCacheWriter.prototype = {
  responseHead : "", /* String  応答のヘッダ */
    
  head : "",         /* String  キャッシュの内容 人数の前まで */
  viewer : "",       /* String  キャッシュの内容 人数 */
  head2 : "",        /* String  キャッシュの内容 人数の後から消滅時刻の前まで */
  expire : "",       /* String  キャッシュの内容 消滅時刻 */
  head3 : "",        /* String  キャッシュの内容 消滅時刻の後から消滅情報の前まで */
  warning : "",      /* String  キャッシュの内容 消滅情報 */
  body : "",         /* String  キャッシュの内容 消滅情報の後から
                      *   最後のレスの後まで */
  foot : "",         /* String  キャッシュの内容 最後のレスの後から */
    
  charset : "",      /* String  文字コード */
    
  /**
   * キャッシュの各パートを構築する
   *
   * @param  String text
   *         キャッシュの全体
   * @return Boolean
   *         構築できたか
   */
  setText : function (text) {
    var start_pos, end_pos;
    start_pos = 0;
    end_pos = 0;
    
    end_pos = text.search (/<li>\x8C\xBB\x8D\xDD[0-9]+\x90\x6C/i,
                           start_pos);
    if (end_pos != -1) {
      end_pos += 8;
      this.head = text.substr (0, end_pos);
            
      start_pos = end_pos;
      end_pos = text.indexOf ("\x90\x6C", start_pos);
      if (end_pos != -1) {
        this.viewer = text.substr (start_pos, end_pos - start_pos);
      }
            
      start_pos = end_pos;
    }
    else {
      start_pos = 0;
    }
        
    end_pos = text.search
    (/<small>([0-9]+\x93\xFA)?[0-9]+:[0-9]+\x8D\xA0\x8F\xC1\x82\xA6\x82\xDC\x82\xB7<\/small>/,
     start_pos);
    if (end_pos != -1) {
      end_pos += 7;
      this.head2 = text.substr (start_pos, end_pos - start_pos);
            
      start_pos = end_pos;
      end_pos = text.indexOf ("\x8D\xA0", start_pos);
      if (end_pos != -1) {
        this.expire = text.substr (start_pos, end_pos - start_pos);
      }
            
      start_pos = end_pos;
    }
        
    end_pos = text.search
    (/<font color="?#f00000"?><b>\x82\xB1\x82\xCC\x83\x58\x83\x8C\x82\xCD[^<]+<\/b><\/font>/,
     start_pos);
    if (end_pos != -1) {
      this.head3 = text.substr (start_pos, end_pos - start_pos);
            
      start_pos = end_pos;
      end_pos = text.indexOf ("</font>", start_pos);
      if (end_pos != -1) {
        end_pos += 7;
        this.warning = text.substr (start_pos, end_pos - start_pos);
      }
            
      start_pos = end_pos;
    }
    else {
      /* 警告はまだ出ていない */
      end_pos = text.indexOf ("<table border=0>", start_pos);
      if (end_pos == -1) {
        /* レスがない */
        end_pos = text.indexOf ("<br clear", start_pos);
        if (end_pos == -1) {
          end_pos = text.indexOf ("<div style=\"clear:left\">", start_pos);
        }
      }
      
      if (end_pos == -1) {
        return false;
      }
            
      this.head3 = text.substr (start_pos, end_pos - start_pos);
      this.warning = "";
            
      start_pos = end_pos;
    }
        
    end_pos = text.indexOf ("<br clear", start_pos);
    if (end_pos == -1) {
      end_pos = text.indexOf ("<div style=\"clear:left\">", start_pos);
    }
    if (end_pos != -1) {
      this.body = text.substr (start_pos, end_pos - start_pos);
      this.foot = text.substr (end_pos);
            
      return true;
    }
        
    return false;
  },
    
  /**
   * キャッシュのファイルを作成する
   *
   * @param  String location
   *         ファイルの場所
   */
  createFile : function (location) {
    try {
      var base
      = arAkahukuFile.getURLSpecFromFilename
      (arAkahukuReload.extCacheFileBase);
      var path = location
      .replace (/^https?:\/\//, "");
                        
      path
      = arAkahukuFile.getFilenameFromURLSpec (base + path);
            
      var targetFile
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
      targetFile.initWithPath (path);
      if (!targetFile.exists ()) {
        targetFile.create
          (Components.interfaces.nsIFile.NORMAL_FILE_TYPE,
           0644);
      }
            
      var fstream
      = Components.classes
      ["@mozilla.org/network/file-output-stream;1"]
      .createInstance (Components.interfaces.nsIFileOutputStream);
      fstream.init (targetFile, 0x02 | 0x08 | 0x20, 0644, 0);
            
      fstream.write (this.head, this.head.length);
      fstream.write (this.viewer, this.viewer.length);
      fstream.write (this.head2, this.head2.length);
      fstream.write (this.expire, this.expire.length);
      fstream.write (this.head3, this.head3.length);
      fstream.write (this.warning, this.warning.length);
      fstream.write (this.body, this.body.length);
      fstream.write (this.foot, this.foot.length);
        
      fstream.close ();
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
    
  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheListener.onCacheEntryAvailable
   * キャッシュを更新する
   *
   * @param  nsICacheEntryDescriptor descriptor
   *         キャッシュの情報
   * @param  nsCacheAccessMode accessGranted
   *         アクセス権限
   * @param  nsresult status
   *         不明
   */
  onCacheEntryAvailable : function (descriptor, accessGranted, status) {
    if (accessGranted == Components.interfaces.nsICache.ACCESS_WRITE) {
      /* キャッシュの書き込み */
            
      descriptor.setExpirationTime (0);
            
      var ostream = descriptor.openOutputStream (0);
      ostream.write (this.head, this.head.length);
      ostream.write (this.viewer, this.viewer.length);
      ostream.write (this.head2, this.head2.length);
      ostream.write (this.expire, this.expire.length);
      ostream.write (this.head3, this.head3.length);
      ostream.write (this.warning, this.warning.length);
      ostream.write (this.body, this.body.length);
      ostream.write (this.foot, this.foot.length);
      ostream.flush ();
      ostream.close ();
            
      descriptor.markValid ();
            
      if (!this.responseHead) {
        this.responseHead
          = "HTTP/1.1 200 OK\r\n"
          + "Date: " + (new Date ()).toString () + "\r\n"
          + "Server: unknown\r\n"
          + "Content-Type: text/html; charset=Shift_JIS\r\n";
      }
            
      descriptor.setMetaDataElement ("request-method", "GET");
      descriptor.setMetaDataElement ("response-head",
                                     this.responseHead);
      descriptor.setMetaDataElement ("charset", this.charset);
            
      descriptor.close ();
    }
  }
};
/**
 * [続きを読む] 管理データ
 *   Inherits From: nsICacheListener, nsISHistoryListener,
 *                  nsIRequestObserver, nsIStreamListener
 */
function arAkahukuReloadParam () {
}
arAkahukuReloadParam.prototype = {
  nextPosition : 0,            /* Number  差分の開始位置 */
  reloadChannel : null,        /* nsIHttpChannel  レスの差分取得のチャネル */
  replying : false,            /* Boolean  返信中フラグ */
  replied : false,             /* Boolean  返信後フラグ */
  targetDocument : null,       /* HTMLDocument  対象のドキュメント */
    
  useRange : false,            /* Boolean  この板で差分取得を行うか */
  sync : false,                /* Boolean  同期したか */
    
  sstream : null,              /* nsIScriptableInputStream  データ到着時に
                                *   読み込むストリーム */
  responseHead : "",           /* String  応答のヘッダ */
  responseText : "",           /* String  応答のデータ */
    
  location : "",               /* リロード中のアドレス */
    
  writer : null,               /* arAkahukuReloadCacheWriter
                                *   キャッシュ書き込み */
    
  partialNodes : null,         /* Array  部分表示の時のボタン用の要素 */
    
  /**
   * データを開放する
   */
  destruct : function () {
    if (this.reloadChannel) {
      try {
        this.reloadChannel.cancel (0x80020006);
        /* NS_BINDING_ABORTED */
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      this.reloadChannel = null;
      if (arAkahukuReload.enableNolimit) {
        arAkahukuConfig.restoreTime ();
      }
    }
    try {
      this.targetDocument.defaultView
      .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
      .getInterface (Components.interfaces.nsIWebNavigation)
      .sessionHistory.removeSHistoryListener (this);
    }
    catch (e) {
    }
    this.targetDocument = null;
  },
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsISHistoryListener/nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsISHistoryListener)
        || iid.equals (Components.interfaces.nsIRequestObserver)
        || iid.equals (Components.interfaces.nsIStreamListener)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },
    
  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheListener.onCacheEntryAvailable
   * キャッシュ情報を収集, バックアップを作成する
   *
   * @param  nsICacheEntryDescriptor descriptor
   *         キャッシュの情報
   * @param  nsCacheAccessMode accessGranted
   *         アクセス権限
   * @param  nsresult status
   *         不明
   */
  onCacheEntryAvailable : function (descriptor, accessGranted, status) {
    if (accessGranted) {
      try {
        var istream = descriptor.openInputStream (0);
        var bstream
        = Components.classes ["@mozilla.org/binaryinputstream;1"]
        .createInstance (Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream (istream);
        var bindata = bstream.readBytes (descriptor.dataSize);
        bstream.close ();
        istream.close ();
        descriptor.close ();
        
        var cont = function (self, bindata) {
          try {
            if (self.writer == null) {
              self.writer = new arAkahukuReloadCacheWriter ();
            }
                
            if (!self.writer.setText (bindata)) {
              return;
            }
                
            if (arAkahukuReload.enableExtCache) {
              /* 現在のキャッシュをバックアップ */
              if (arAkahukuReload.enableExtCacheFile) {
                self.writer.createFile (self.location);
              }
              else {
                try {
                  var cacheService
                  = Components.classes ["@mozilla.org/network/cache-service;1"]
                  .getService (Components.interfaces.nsICacheService);
                  var httpCacheSession;
                  httpCacheSession
                  = cacheService
                  .createSession ("HTTP",
                                  Components.interfaces.nsICache
                                  .STORE_ANYWHERE,
                                  true);
                  httpCacheSession.doomEntriesIfExpired = false;
                  httpCacheSession
                  .asyncOpenCacheEntry (self.location + ".backup",
                                        Components.interfaces.nsICache
                                        .ACCESS_WRITE,
                                        self.writer);
                }
                catch (e) { Akahuku.debug.exception (e);
                }
              }
            }
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        };
        
        if (bindata.match (/^\x1f\x8b\x08/)) {
          /* gzip 圧縮されている */
          
          arAkahukuFile.gunzip
            (bindata,
             (function (self, cont) {
               return function (bindata) {
                 cont (self, bindata);
               };
             })(this, cont));
        }
        else {
          cont (this, bindata);
        }
      }
      catch (e) { Akahuku.debug.exception(e);
        /* 既に閉じられている場合など */
      }
    }
  },
    
  /**
   * 戻るイベント
   *
   * @param  nsIURI backURI
   *         戻る先の URI
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryGoBack : function (backURI) {
    return true;
  },
    
  /**
   * 進むイベント
   *
   * @param  nsIURI forwardURI
   *         進む先の URI
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryGoForward : function (forwardURI) {
    return true;
  },
    
  /**
   * 移動イベント
   *
   * @param  Number index
   *         移動先のインデックス
   * @param  nsIURI gotoURI
   *         移動先の URI
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryGotoIndex : function (index, gotoURI) {
    return true;
  },
    
  /**
   * 項目追加イベント
   *
   * @param  nsIURI newURI
   *         追加する URI
   */
  OnHistoryNewEntry : function (newURI) {
    return true;
  },
    
  /**
   * 項目削除イベント
   *
   * @param  Number index
   *         削除する数
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryPurge : function (numEntries) {
    return true;
  },
    
  /**
   * リロードイベント
   *
   * @param  nsIURI reloadURI
   *         リロードする URI
   * @param  Number reloadFlags
   *         リロード方法
   * @return Boolean
   *         続けるかどうか
   */
  OnHistoryReload : function (reloadURI, reloadFlags) {
    if (arAkahukuReload.enableHook) {
      if (reloadFlags
          & Components.interfaces.nsIWebNavigation
          .LOAD_FLAGS_BYPASS_CACHE
          || reloadFlags
          & Components.interfaces.nsIWebNavigation
          .LOAD_FLAGS_BYPASS_PROXY) {
        try {
          var anchor
          = this.targetDocument
          .getElementById ("akahuku_reload_button");
          if (anchor) {
            anchor.parentNode.removeChild (anchor);
          }
        }
        catch (e) { Akahuku.debug.exception (e);
        }
                
        try {
          this.targetDocument.defaultView
          .QueryInterface (Components.interfaces
                           .nsIInterfaceRequestor)
          .getInterface (Components.interfaces.nsIWebNavigation)
          .sessionHistory.removeSHistoryListener (this);
        }
        catch (e) {
        }
                
        this.targetDocument.defaultView
        .QueryInterface (Components.interfaces.nsIInterfaceRequestor)
        .getInterface (Components.interfaces.nsIWebNavigation)
        .reload (Components.interfaces.nsIWebNavigation
                 .LOAD_FLAGS_NONE);
                
        return false;
      }
    }
        
    return true;
  },
    
  /**
   * リクエスト開始のイベント
   *   nsIRequestObserver.onStartRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   */
  onStartRequest : function (request, context) {
    this.sstream
    = Components.classes ["@mozilla.org/scriptableinputstream;1"]
    .createInstance (Components.interfaces.nsIScriptableInputStream);
    this.responseText = "";
        
    if (this.reloadChannel != null) {
      arAkahukuReload.setStatus
        ("\u30ED\u30FC\u30C9\u4E2D (\u30DC\u30C7\u30A3)",
         true, this.targetDocument);
    }
  },
    
  /**
   * リクエスト終了のイベント
   *   nsIRequestObserver.onStopRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  Number statusCode
   *         終了コード
   */
  onStopRequest : function (request, context, statusCode) {
    /* 取得できなかった場合に備えて適当に指定しておく */
    var httpStatus = 200;
    var responseHead = "HTTP/1.1 200 OK\r\n"
    + "Date: " + (new Date ()).toString () + "\r\n"
    + "Server: unknown\r\n"
    + "Content-Type: text/html; charset=Shift_JIS\r\n";
        
    try {
      var httpChannel
        = request.QueryInterface (Components.interfaces.nsIHttpChannel);
      httpStatus
        = httpChannel.responseStatus;
            
      /* 206 の場合表示がおかしくなるので、Date と Server のみ更新する */
      responseHead
        = "HTTP/1.1 200 OK\r\n"
        + "Date: "
        + httpChannel.getResponseHeader ("Date") + "\r\n"
        + "Server: "
        + httpChannel.getResponseHeader ("Server") + "\r\n"
        + "Content-Type: text/html; charset=Shift_JIS\r\n";
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    /* 避難所 patch */
    var param = Akahuku.getDocumentParam (this.targetDocument);
    if (param == null) {
      return;
    }
    var info = param.location_info;
    try {
      if (info.isMonaca) {
        responseHead
          = responseHead.replace (/charset=Shift_JIS/,
                                  "charset=EUC-JP");
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
        
    if (this.reloadChannel == null) {
      return;
    }
        
    ; /* switch のインデント用 */
    switch (httpStatus) {
      case 200:
      case 206:
        this.responseHead = responseHead;
                
        arAkahukuReload.setStatus
          ("\u66F4\u65B0\u4E2D",
           false, this.targetDocument);
        
        if (this.responseText.search (/<html/i) != -1) {
          if (this.responseText.search (/<blockquote/i) == -1
              && this.responseText.search (/<div class=\"t\"/i) == -1) {
            /* スレが消えていた場合 */
            /* 区切りの削除 */
            var newReplyHeader
              = this.targetDocument
              .getElementById ("akahuku_new_reply_header");
            if (newReplyHeader) {
              newReplyHeader.parentNode
                .removeChild (newReplyHeader);
            }
            var expireBox
              = this.targetDocument
              .getElementById ("akahuku_throp_expire_box");
            if (expireBox) {
              expireBox.style.display = "none";
            }
            var expireBox2
              = this.targetDocument
              .getElementById ("akahuku_throp_expire_box2");
            if (expireBox2) {
              expireBox2.style.display = "block";
            }
            arAkahukuReload.setStatus
              (arAkahukuReload.getNotFoundText (),
               true, this.targetDocument);
                        
            if (arAkahukuSidebar.enable) {
              try {
                var name;
                name = info.server + "_" + info.dir;
                                
                if (name in arAkahukuSidebar.boards) {
                  var ok = true;
                  if (!arAkahukuSidebar.enableBackground) {
                    var sidebar
                      = arAkahukuSidebar.getSidebar ();
                    if (!sidebar.docShell) {
                      ok = false;
                    }
                    else {
                      var sidebarDocument
                        = sidebar.contentDocument;
                      var iframe
                        = sidebarDocument.getElementById
                        ("akahuku_sidebar_iframe_"
                         + name);
                      if (iframe == null) {
                        ok = false;
                      }
                    }
                  }
                  if (ok) {
                    arAkahukuSidebar.onThreadExpired
                      (name,
                       info.threadNumber);
                  }
                }
              }
              catch (e) { Akahuku.debug.exception (e);
              }
            }
                        
            break;
          }
        }
        else if (this.responseText == "\x96\x9e\x88\xf5\x82\xc5\x82\xb7\x81\x42\x82\xbf\x82\xe5\x82\xc1\x82\xc6\x82\xdc\x82\xc1\x82\xc4\x82\xcb\x81\x42") {
          /* 満員表示 */
          /* 区切りの削除 */
          var newReplyHeader
            = this.targetDocument
            .getElementById ("akahuku_new_reply_header");
          if (newReplyHeader) {
            newReplyHeader.parentNode
              .removeChild (newReplyHeader);
          }
          arAkahukuReload.setStatus
            ("\u6E80\u54E1\u3067\u3059",
             true, this.targetDocument);
          break;
                        
        }
        
        setTimeout
          (arAkahukuReload.update,
           10,
           this.targetDocument, this.replied);
        return;
        break;
      case 304:
        /* ファイルが更新されていない場合 */
        arAkahukuReload.setStatus
          ("\u65B0\u7740\u306A\u3057",
           false, this.targetDocument);
        break;
      case 404:
        /* ファイルが消えていた場合 */
        /* 区切りの削除 */
        var newReplyHeader
          = this.targetDocument
          .getElementById ("akahuku_new_reply_header");
        if (newReplyHeader) {
          newReplyHeader.parentNode
            .removeChild (newReplyHeader);
        }
        var expireBox
          = this.targetDocument
          .getElementById ("akahuku_throp_expire_box");
        if (expireBox) {
          expireBox.style.display = "none";
        }
        var expireBox2
          = this.targetDocument
          .getElementById ("akahuku_throp_expire_box2");
        if (expireBox2) {
          expireBox2.style.display = "block";
        }
        arAkahukuReload.setStatus
          (arAkahukuReload.getNotFoundText (),
           true, this.targetDocument);
        if (arAkahukuSidebar.enable) {
          try {
            var name;
            name = info.server + "_" + info.dir;
                                
            if (name in arAkahukuSidebar.boards) {
              var ok = true;
              if (!arAkahukuSidebar.enableBackground) {
                var sidebar
                  = arAkahukuSidebar.getSidebar ();
                if (!sidebar.docShell) {
                  ok = false;
                }
                else {
                  var sidebarDocument
                    = sidebar.contentDocument;
                  var iframe
                    = sidebarDocument.getElementById
                    ("akahuku_sidebar_iframe_"
                     + name);
                  if (iframe == null) {
                    ok = false;
                  }
                }
              }
              if (ok) {
                arAkahukuSidebar.onThreadExpired
                  (name,
                   info.threadNumber);
              }
            }
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
        break;
      default:
        arAkahukuReload.setStatus
          ("load error: " + httpStatus,
           false,
           this.targetDocument);
    }
    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
    this.reloadChannel = null;
        
    this.responseText = "";
    this.sstream = null;
    
    /* HTML が正しく取得できなかった場合の音 */
    if (!this.replied) {
      arAkahukuSound.playReplyReload ();
    }
    else {
      arAkahukuSound.playReply ();
    }
  },
    
  /**
   * データ到着のイベント
   *   nsIStreamListener.onDataAvailable
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  nsIInputStream inputStream
   *         データを取得するストリーム
   * @param  PRUint32 offset
   *         データの位置
   * @param  PRUint32 count 
   *         データの長さ
   */
  onDataAvailable : function (request, context, inputStream, offset, count) {
    this.sstream.init (inputStream);
        
    var chunk = this.sstream.read (count);
    this.responseText += chunk;
  }
};
/**
 * [続きを読む] 管理
 *   [続きを読む]
 */
var arAkahukuReload = {
  enable : false,                        /* Boolean  続きを読む */
  enableSyncButton : false,              /* Boolean  [同期] ボタン */
  enableSyncButtonNoDelete : false,      /* Boolean  削除されたレスを
                                          *   残す */
  enableRule : false,                    /* Boolean  区切り */
  enableRuleZeroHeight : false,          /* Boolean  ズレないようにする */
  enableRuleRandom : false,              /* Boolean  ランダム */
  enableReply : false,                   /* Boolean  レス送信と連携 */
  enableReplyScroll : false,             /* Boolean  最新位置にスクロール */
  enableHook : false,                    /* Boolean  リロードの代わりに
                                          *   続きを読む */
  enableHookSync : false,                /* Boolean  同期する */
  enableStatusRandom : false,            /* Boolean  スレが消えたときに
                                          *   ランダム */
  enableStatusHold : false,              /* Boolean  ステータスを
                                          *   消さない */
  enableTimeStamp : false,               /* Boolean  更新時刻を表示する */
  enableNolimit : false,                 /* Boolean  更新中はスクリプトの
                                          *   制限時間を n 秒にする */
  limitTime : 0,                         /* Number  実行時間 */
  lastLimit : -1,                        /* Number  制限時間 */
  enableStatusNoCount : false,           /* Boolean  ステータスに
                                          *   レス数を表示しない */
  enableExtCache : false,                /* Boolean  スレが消えても
                                          *   表示できるようにする */
  enableExtCacheFile : false,            /* Boolean  スレをファイルに保存する */
  extCacheFileBase : "",                 /* String  保存するディレクトリ */
    
  expireLength : 80, /* Number このスレは〜 のタグ付きの長さ */
  adMargin : 80,     /* Number  テキスト広告の変化による差分位置のマージン
                      *   (実際の測定結果は 40 程度) */
  imageMargin : 400, /* Number  スレ消滅情報が出た時にスレ画像が消える板で
                      *       該当部分のソース消滅による差分位置のマージン
                      *   (実際の測定結果は 300 程度) */
    
  /**
   * ドキュメントのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレス情報
   */
  setStyle : function (style, targetDocument, info) {
    if (info.isNormal || info.isReply) {
      /* 通常モード、レス送信モード共通 */
      if (!info.isFutaba || info.isFutasuke) {
        /* ユーザースタイルシートが効かないので指定しなおす */
                
        if (arAkahukuReload.enableRuleZeroHeight) {
          style
          .addRule ("img",
                    "position: relative; "
                    + "z-index: 99;");
          /* -moz-hidden-unscrollable を設定すると
           *  z-index が img より上になってクリックできなくなるので
           * スレ画像の img の z-index をさらに上にする */
        }
      }
    }
        
    if (info.isReply) {
      /* レス送信モード */
            
      /* [続きを読む] */
      if (arAkahukuReload.enable) {
        style
        .addRule ("#akahuku_reload_container",
                  "color: inherit; "
                  + "background-color: #ffffee; "
                  + "padding-top: 8px;")
        .addRule ("#akahuku_reload_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_syncbutton",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_syncbutton:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_upbutton",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_upbutton:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_allbutton",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_allbutton:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_reload_timestamp",
                  "font-size: 9pt;")
        .addRule ("#akahuku_reload_status",
                  "font-size: 9pt;")
        .addRule (".akahuku_skipped_reply",
                  "border: 2px solid red !important;")
        .addRule (".akahuku_deleted_reply",
                  "border: 2px solid blue !important;")
        .addRule ("#akahuku_reply_status",
                  "font-size: 9pt;")
        .addRule ("#akahuku_reply_target_frame",
                  "width: 8px; "
                  + "height: 8px; "
                  + "border: 0px none #ffffee; "
                  + "display: block; "
                  + "position: absolute; "
                  + "left: 0px; "
                  + "top: 0px;");
                
        if (arAkahukuReload.enableRule) {
          style
            .addRule ("#akahuku_new_reply_header_number",
                      "font-size: 10pt; "
                      + "vertical-align: text-bottom;");
        }
      }
    }
  },
    
  /**
   * スタイルファイルのスタイルを設定する
   *
   * @param  arAkahukuStyleData style
   *         スタイル
   */
  setStyleFile : function (style) {
    if (arAkahukuReload.enableRuleZeroHeight) {
      style
      .addRule ("img",
                "position: relative; z-index: 99;");
      /* -moz-hidden-unscrollable を設定すると
       *  z-index が img より上になってクリックできなくなるので
       * スレ画像の img の z-index をさらに上にする */
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuReload.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.reload", true);
    if (arAkahukuReload.enable) {
      arAkahukuReload.enableSyncButton
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.range.syncbutton", true);
      if (arAkahukuReload.enableSyncButton) {
        arAkahukuReload.enableSyncButtonNoDelete
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.reload.range.syncbutton.nodelete",
                     false);
      }
      arAkahukuReload.enableRule
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.rule", true);
      if (arAkahukuReload.enableRule) {
        arAkahukuReload.enableRuleZeroHeight
          = arAkahukuConfig
          .initPref ("bool", "akahuku.reload.rule.zeroheight", false);
        arAkahukuReload.enableRuleRandom
          = arAkahukuConfig
          .initPref ("bool", "akahuku.reload.rule.random", true);
      }
      arAkahukuReload.enableReply
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.reply", true);
      arAkahukuReload.enableReplyScroll
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.reply.scroll", true);
      arAkahukuReload.enableHook
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.hook", false);
      if (arAkahukuReload.enableHook) {
        arAkahukuReload.enableHookSync
          = arAkahukuConfig
          .initPref ("bool", "akahuku.reload.hook.sync", false);
      }
      arAkahukuReload.enableStatusRandom
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.status.random", true);
      arAkahukuReload.enableStatusHold
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.status.hold", false);
      arAkahukuReload.enableTimeStamp
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.timestamp", false);
      arAkahukuReload.enableNolimit
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.nolimit", false);
      arAkahukuReload.limitTime
        = arAkahukuConfig
        .initPref ("int",  "akahuku.reload.nolimit.time", 0);
      arAkahukuReload.enableStatusNoCount
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.status_no_count", false);
      arAkahukuReload.enableExtCache
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.extcache", false);
      arAkahukuReload.enableExtCacheFile
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.extcache.file", false);
      var value
        = arAkahukuConfig
        .initPref ("char", "akahuku.reload.extcache.file.base", "");
      arAkahukuReload.extCacheFileBase = unescape (value);
    }
  },
    
  /**
   * 見ている人数を更新する
   *
   * @param  String responseText
   *         取得した差分
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateViewersNumber : function (responseText, targetDocument) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var viewersNumber = "";
    if (responseText.match
        (/<li>\x8c\xbb\x8d\xdd([0-9]+)\x90\x6c/i)) {
      /* <li>現在(xx)人 (Shift_JIS) */
      viewersNumber = RegExp.$1;
    }
        
    if (viewersNumber) {
      info.viewer = viewersNumber;
            
      var node
      = targetDocument
      .getElementById ("akahuku_postform_opener_appendix");
      if (node) {
        var startNode = node;
        node = node.firstChild;
        while (node) {
          if (node.nodeName.toLowerCase () == "#text") {
            if (node.nodeValue.match
                (/\u73FE\u5728[0-9]+\u4EBA/)) {
              node.nodeValue
                = node.nodeValue
                .replace (/\u73FE\u5728[0-9]+\u4EBA/,
                          "\u73FE\u5728" + viewersNumber
                          + "\u4EBA");
              break;
            }
          }
          if (node.firstChild) {
            node = node.firstChild;
          }
          else {
            while (!node.nextSibling) {
              node = node.parentNode;
              if (node == startNode) {
                node = null;
                break;
              }
            }
            if (node) {
              node = node.nextSibling;
            }
            else {
              break;
            }
          }
        }
      }
            
      var node
      = targetDocument.getElementById ("akahuku_throp_viewer");
      if (node) {
        arAkahukuDOM.setText (node, viewersNumber);
      }
            
      node
      = targetDocument
      .getElementById ("akahuku_bottom_status_viewer");
      if (node) {
        arAkahukuDOM.setText (node, viewersNumber);
      }
            
      var nodes = targetDocument.getElementsByTagName ("li");
      for (var i = 0; i < nodes.length; i ++) {
        if (nodes [i].innerHTML
            .match (/^(<small>)?(\u73FE\u5728[0-9]+\u4EBA)/)) {
          var startNode = nodes [i];
          node = nodes [i].firstChild;
          while (node) {
            if (node.nodeName.toLowerCase () == "#text") {
              if (node.nodeValue.match
                  (/\u73FE\u5728[0-9]+\u4EBA/)) {
                node.nodeValue
                  = node.nodeValue
                  .replace (/\u73FE\u5728[0-9]+\u4EBA/,
                            "\u73FE\u5728" + viewersNumber
                            + "\u4EBA");
                break;
              }
            }
            if (node.firstChild) {
              node = node.firstChild;
            }
            else {
              while (!node.nextSibling) {
                node = node.parentNode;
                if (node == startNode) {
                  node = null;
                  break;
                }
              }
              if (node) {
                node = node.nextSibling;
              }
              else {
                break;
              }
            }
          }
          break;
        }
      }
    }
  },
    
  /**
   * スレの消滅時刻を更新する
   *
   * @param  String responseText
   *         取得した差分
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateExpireTime : function (responseText, targetDocument) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var expireTime = "";
    if (responseText.match
        (/<small>(([0-9]+\x93\xfa)?[0-9]+:[0-9]+)\x8d\xa0\x8f\xc1\x82\xa6\x82\xdc\x82\xb7<\/small>/)) {
      /* <small>((xx日)?xx:xx)頃消えます</small> (Shift_JIS) */
      expireTime = RegExp.$1;
    }
    /* 避難所 patch */
    if (info.isMonaca
        && responseText.match
        (/id=expire>(([0-9]+\xc7\xaf)?([0-9]+\xb7\xee)?([0-9]+\xc6\xfc)?[0-9]+:[0-9]+)\xba\xa2\xbe\xc3\xa4\xa8\xa4\xde\xa4\xb9<\/span>/)) {
      /* id=expire>((xx日)?xx:xx)頃消えます</span> (EUC-JP) */
      expireTime = RegExp.$1;
    }
        
    if (expireTime) {
      /* 避難所 patch */
      if (info.isMonaca) {
        expireTime
        = arAkahukuConverter.convertFromEUC (expireTime, "");
      }
      else {
        expireTime
        = arAkahukuConverter.convertFromSJIS (expireTime, "");
      }
      info.expire = expireTime;
            
      var node
      = targetDocument.getElementById ("akahuku_throp_expire");
      if (node) {
        arAkahukuDOM.setText (node, expireTime);
      }
            
      node
      = targetDocument.getElementById ("akahuku_bottom_status_expire");
      if (node) {
        arAkahukuDOM.setText (node, expireTime);
      }
            
      node = targetDocument.getElementById ("akahuku_thread_deletetime");
      if (node) {
        arAkahukuDOM.setText
          (node,
           expireTime + "\u9803\u6D88\u3048\u307E\u3059");
      }
    }
  },
    
  /**
   * 残り時間、番号を更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateExpireDiffNum : function (targetDocument) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    var node;
        
    var expireBox
    = targetDocument
    .getElementById ("akahuku_throp_expire_box");
    if (expireBox) {
      expireBox.style.display = "block";
    }
    var expireBox2
    = targetDocument
    .getElementById ("akahuku_throp_expire_box2");
    if (expireBox2) {
      expireBox2.style.display = "none";
    }
    
    node
    = targetDocument.getElementById
    ("akahuku_bottom_status_expire_diff");
    if (node) {
      var expireDiff;
      expireDiff
        = arAkahukuThread.getExpireDiff (targetDocument,
                                         info.expire);
      arAkahukuDOM.setText (node, expireDiff);
      
      node
        = targetDocument.getElementById
        ("akahuku_throp_expire_diff");
      if (node) {
        arAkahukuDOM.setText (node, expireDiff);
      }
    }
    
    var lastReply = arAkahukuThread.getLastReply (targetDocument);
    node
    = targetDocument.getElementById
    ("akahuku_bottom_status_expire_num");
    if (node) {
      var expireNum
        = arAkahukuThread.getExpireNum (targetDocument, info,
                                        info.threadNumber,
                                        lastReply.num);
      var expireMax
        = arAkahukuThread.getExpireNum (targetDocument, info,
                                        0, 0);
      var node2
        = targetDocument.getElementById ("akahuku_thread_warning");
      if (expireNum < expireMax / 10) {
        if (node2) {
          node.style.fontSize = "";
          node.style.color = "";
        }
        else {
          node.style.fontSize = "12pt";
          node.style.color = "#ff0000";
        }
      }
      arAkahukuDOM.setText (node, expireNum);
                
      node
        = targetDocument.getElementById
        ("akahuku_throp_expire_num");
      if (node) {
        if (expireNum < expireMax / 10) {
          if (node2) {
            node.style.fontWeight = "";
            node.style.color = "";
          }
          else {
            node.style.fontWeight = "bold";
            node.style.color = "#ff0000";
          }
        }
        arAkahukuDOM.setText (node, expireNum);
      }
    }
            
    var numPS
    = arAkahukuThread.getExpireNumPrefixSuffix (targetDocument, info,
                                                info.threadNumber,
                                                lastReply.num);
    node
    = targetDocument.getElementById
    ("akahuku_bottom_status_expire_num_prefix");
    if (node) {
      arAkahukuDOM.setText
        (node, numPS [0]);
    }
    node
    = targetDocument.getElementById
    ("akahuku_bottom_status_expire_num_suffix");
    if (node) {
      arAkahukuDOM.setText
        (node, numPS [1]);
    }
  },
    
  /**
   * 削除されたレスのメッセージを追加する
   *
   * @param  String responseText
   *         取得した差分
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateDeletedMessage : function (responseText, targetDocument) {
    var ddel = targetDocument.getElementById ("ddel");
    if (ddel) {
      return;
    }
    
    if (responseText.match (/<span id=[\"\']?ddel[\"\']?>/)) {
      ddel = targetDocument.createElement ("span");
      ddel.id = "ddel";
      ddel.style.display = "inline";
      
      ddel.innerHTML = "\u524A\u9664\u3055\u308C\u305F\u8A18\u4E8B\u304C<span id=ddnum>0</span>\u4EF6\u3042\u308A\u307E\u3059.<span id=ddbut onclick=\"onddbut()\">\u898B\u308B</span><br>";
      var bq
        = targetDocument.getElementById ("akahuku_thread_text");
      if (bq.nextSibling) {
        bq.parentNode.insertBefore (ddel, bq.nextSibling);
      }
      else {
        bq.parentNode.appendChild (ddel);
      }
      
      arAkahukuReload.updateDDel (targetDocument);
    }
  },
  
  /**
   * 削除されたレスの数を更新する
   */
  updateDDel : function (targetDocument) {
    var nodes = targetDocument.getElementsByTagName ("table");
    
    var count = 0;
    for (var i = 0; i < nodes.length; i ++) {
      if (arAkahukuDOM.hasClassName (nodes [i], "deleted")) {
        count ++;
      }
    }
    
    if (count > 0) {
      var ddel = targetDocument.getElementById ("ddel");
      if (ddel) {
        ddel.style.display = "inline";
      }
    }
    
    var ddnum = targetDocument.getElementById ("ddnum");
    if (ddnum) {
      ddnum.innerHTML = count;
    }
  },

  /**
   * スレの消滅情報, del 数を更新する
   *
   * @param  String responseText
   *         取得した差分
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateExpireWarning : function (responseText, targetDocument) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    
    var expireWarning = "";
    if (responseText.match
        (/<font color="?#f00000"?><b>(\x82\xb1\x82\xcc\x83\x58\x83\x8c\x82\xcd[^<]+)<\/b><\/font>/)) {
      /* <font color="?#f00000"?><b>(このスレは〜)</b></font>
         (Shift_JIS) */
      expireWarning = RegExp.$1;
    }
    /* 避難所 patch */
    if (info.isMonaca
        && responseText.match
        (/id=warning class=s6>(\xa4\xb3\xa4\xce\xa5\xb9\xa5\xec\xa4\xcf[^<]+)<\/span>/)) {
      /* id=warning class=s6>(このスレは〜)</span> (EUC-JP) */
      expireWarning = RegExp.$1;
    }
    
    if (expireWarning) {
      /* 避難所 patch */
      if (info.isMonaca) {
        expireWarning
        = arAkahukuConverter.convertFromEUC (expireWarning, "");
      }
      else {
        expireWarning
        = arAkahukuConverter.convertFromSJIS (expireWarning, "");
      }
      info.expireWarning = expireWarning;
      info.isOld = true;
            
      var node
      = targetDocument.getElementById ("akahuku_throp_expire");
      if (node) {
        node.style.color = "red";
        node.style.fontWeight = "bold";
      }
            
      node
      = targetDocument.getElementById ("akahuku_bottom_status_alert");
      if (node) {
        arAkahukuDOM.setText (node, expireWarning);
      }
      
      node = targetDocument.getElementById ("akahuku_thread_warning");
      if (!node) {
        /* 警告が出ていない場合に追加する */
        node = targetDocument.getElementById ("akahuku_thread_text");
        if (node) {
          /* 保存時のために font を使用し、スタイルを直接指定する */
          var font = targetDocument.createElement ("font");
          font.id = "akahuku_thread_warning";
          font.style.color = "#f00000";
          font.style.fontWeight = "bold";
          font.appendChild (targetDocument.createTextNode
                            (expireWarning));
          node.parentNode.insertBefore (font, node.nextSibling);
          
          var br = targetDocument.createElement ("br");
          font.parentNode.insertBefore (br, font.nextSibling);
        }
        arAkahukuSound.playExpire ();
      }
    }
    
    var delWarning = "";
    if (responseText.match
        (/<font color="?#f00000"?>(\x82\xb1\x82\xcc\x83\x58\x83\x8c\x82\xc9\x91\xce\x82\xb7\x82\xe9\x8d\xed\x8f\x9c\x88\xcb\x97\x8a.+)<\/font>/)) {
      /* <font color="?#f00000"?>(このスレに対する削除依頼.+)</font>
         (Shift_JIS) */
      delWarning = RegExp.$1;
      delWarning = arAkahukuConverter.convertFromSJIS (delWarning, "");
      info.isDel = RegExp.$1;
    }
    
    if (delWarning) {
      node = targetDocument.getElementById ("akahuku_bottom_status_delcount");
      if (node) {
        arAkahukuDOM.setText (node, "del");
        node
          = targetDocument.getElementById
          ("akahuku_bottom_status_delcount_sep");
        arAkahukuDOM.setText (node, " \uFF0F ");
      }
      node = targetDocument.getElementById ("akahuku_thread_delcount");
      if (node) {
        arAkahukuDOM.setText (node, delWarning);
      }
      else {
        /* 警告が出ていない場合に追加する */
        node = targetDocument.getElementById ("akahuku_thread_text");
        if (node) {
          /* 保存時のために font を使用し、スタイルを直接指定する */
          var font = targetDocument.createElement ("font");
          font.id = "akahuku_thread_delcount";
          font.style.color = "#f00000";
          font.appendChild (targetDocument.createTextNode
                            (delWarning));
          
          var node2 = targetDocument.getElementById ("akahuku_thread_warning");
          if (node2) {
            /* warn br */
            node2.parentNode.insertBefore (font, node2.nextSibling);
            /* warn [del] br */
            var br = targetDocument.createElement ("br");
            node2.parentNode.insertBefore (br, node2.nextSibling);
            /* warn [br] [del] br */
          }
          else {
            /* text */
            var br = targetDocument.createElement ("br");
            node.parentNode.insertBefore (br, node.nextSibling);
            /* text [br] */
            node.parentNode.insertBefore (font, node.nextSibling);
            /* text [del] [br] */
          }
        }
      }
    }
    else {
      node = targetDocument.getElementById ("akahuku_thread_delcount");
      if (node) {
        var br = arAkahukuDOM.findBR (node.nextSibling);
        if (br) {
          br.parentNode.removeChild (br);
        }
        node.parentNode.removeChild (node);
      }
      node = targetDocument.getElementById ("akahuku_bottom_status_delcount");
      if (node) {
        arAkahukuDOM.setText (node, null);
        node
          = targetDocument.getElementById
          ("akahuku_bottom_status_delcount_sep");
        arAkahukuDOM.setText (node, null);
      }
    }
  },
    
  /**
   * 更新時刻を表示する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  setTimeStamp : function (targetDocument) {
    var timestamp
    = targetDocument.getElementById ("akahuku_reload_timestamp");
    if (timestamp) {
      var d = new Date ();
      var stamp = "";
      var h = d.getHours ();
      var m = d.getMinutes ();
      var s = d.getSeconds ();
            
      if (h <= 9) {
        stamp += "0" + h;
      }
      else {
        stamp += h;
      }
      if (m <= 9) {
        stamp += ":0" + m;
      }
      else {
        stamp += ":" + m;
      }
      if (s <= 9) {
        stamp += ":0" + s;
      }
      else {
        stamp += ":" + s;
      }
      arAkahukuDOM.setText (timestamp, "(" + stamp + ")");
    }
  },
    
  /**
   * [続きを読む] ボタンのメッセージを設定する
   *
   * @param  String message
   *         メッセージ
   * @param  Boolean permanent
   *         一定時間で消すかどうか
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  setStatus : function (message, permanent, targetDocument) {
    var ids = [
      "akahuku_reload_status",
      "akahuku_throp_reload_status"
      ];
        
    if (message.indexOf ("Not Found.") != -1) {
      var element = targetDocument.getElementById ("akahuku_throp_menu");
            
      if (element) {
        element.style.width = "18em";
      }
    }
        
    for (var i = 0; i < ids.length; i ++) {
      var node = targetDocument.getElementById (ids [i]);
      if (node) {
        arAkahukuDOM.setText (node, message);
      }
    }
        
    if (!permanent && !arAkahukuReload.enableStatusHold) {
      setTimeout
      (function (message) {
        for (var i = 0; i < ids.length; i++) {
          var node = targetDocument.getElementById (ids [i]);
          if (node) {
            if (node.firstChild
                && node.firstChild.nodeValue == message) {
              arAkahukuDOM.setText (node, "");
            }
          }
        }
      }, 5000, message);
    }
  },
    
  /**
   * [続きを読む] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDiffReloadClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuReload.diffReloadCore (targetDocument, false, false);
    event.preventDefault ();
  },
    
  /**
   * [同期] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDiffReloadSyncClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    arAkahukuReload.diffReloadCore (targetDocument, true, false);
    event.preventDefault ();
  },
    
  /**
   * [もうn件前から表示] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDiffReloadUpClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    var param
    = Akahuku.getDocumentParam (targetDocument).reload_param;
        
    info.replyFrom -= Akahuku.partialUp;
    if (info.replyFrom < 1) {
      info.replyFrom = 1;
    }
        
    if (info.replyFrom == 1) {
      var n
      = targetDocument.getElementById ("akahuku_partial_indicator");
      n.parentNode.removeChild (n);
      for (var i = 0; i < param.partialNodes.length; i ++) {
        param.partialNodes [i].parentNode.removeChild
          (param.partialNodes [i]);
      }
    }
    else {
      var skippped
      = targetDocument.getElementById ("akahuku_partial_indicator_n");
      arAkahukuDOM.setText (skippped, info.replyFrom - 1);
    }
        
    arAkahukuReload.diffReloadCore (targetDocument, true, false);
    event.preventDefault ();
  },
    
  /**
   * [全部表示] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onDiffReloadAllClick : function (event) {
    var targetDocument = event.target.ownerDocument;
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    info.replyFrom = 1; 
    var param
    = Akahuku.getDocumentParam (targetDocument).reload_param;
        
    var n
    = targetDocument.getElementById ("akahuku_partial_indicator");
    n.parentNode.removeChild (n);
    for (var i = 0; i < param.partialNodes.length; i ++) {
      param.partialNodes [i].parentNode.removeChild
        (param.partialNodes [i]);
    }
        
    try {
      if (!arAkahukuReload.enableExtCache) {
        throw false;
      }
            
      param.responseText = "";
            
      var location = targetDocument.location.href;
            
      if (arAkahukuReload.enableExtCacheFile) {
        var base
          = arAkahukuFile.getURLSpecFromFilename
          (arAkahukuReload.extCacheFileBase);
        var path = location
          .replace (/^https?:\/\//, "");
                
        path
          = arAkahukuFile.getFilenameFromURLSpec
          (base + path);
                
        var targetFile
          = Components.classes ["@mozilla.org/file/local;1"]
          .createInstance (Components.interfaces.nsILocalFile);
        targetFile.initWithPath (path);
        if (!targetFile.exists ()) {
          throw false;
        }
                
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (Components.interfaces.nsIFileInputStream);
        fstream.init (targetFile, 0x01, 0444, 0);
        var bstream
          = Components.classes ["@mozilla.org/binaryinputstream;1"]
          .createInstance
          (Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream (fstream);
        param.responseText = bstream.readBytes (targetFile.fileSize);
        bstream.close ();
        fstream.close ();
      }
      else {
        var cacheService
        = Components.classes
        ["@mozilla.org/network/cache-service;1"]
        .getService (Components.interfaces.nsICacheService);
        var httpCacheSession;
        httpCacheSession
        = cacheService
        .createSession
        ("HTTP",
         Components.interfaces.nsICache.STORE_ANYWHERE,
         true);
        httpCacheSession.doomEntriesIfExpired = false;
            
        descriptor
        = httpCacheSession.openCacheEntry
        (location + ".backup",
         Components.interfaces.nsICache.ACCESS_READ,
         false);
        if (!descriptor) {
          throw false;
        }
            
        var istream = descriptor.openInputStream (0);
        var bstream
        = Components.classes ["@mozilla.org/binaryinputstream;1"]
        .createInstance
        (Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream (istream);
        param.responseText = bstream.readBytes (descriptor.dataSize);
        bstream.close ();
        istream.close ();
        descriptor.close ();
      }
            
      if (arAkahukuReload.enableNolimit) {
        arAkahukuConfig.setTime (arAkahukuReload.limitTime);
      }
            
      param.reloadChannel = null;
      param.sync = true;
      param.replied = false;
      param.useRange = false;
      param.location = location;
            
      setTimeout
      (arAkahukuReload.update,
       10,
       targetDocument);
    }
    catch (e) {
      /* キャッシュが存在しなかった場合 */
      arAkahukuReload.diffReloadCore (targetDocument, true, false);
    }
        
    event.preventDefault ();
  },
    
  /**
   * レスのコンテナを作成する
   *
   * @param  String responseText
   *         レスを含む HTML
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @return Object
   *         レスのコンテナ
   */
  createContainer : function (responseText, targetDocument) {
    var container = {};
    
    var isOld = true;
    
    if (responseText.match (/<div class=t>/)) {
      isOld = false;
    }
    
    if (isOld) {
      var table = targetDocument.createElement ("table");
      var tbody = targetDocument.createElement ("tbody");
      var tr = targetDocument.createElement ("tr");
    
      table.appendChild (tbody);
      tbody.appendChild (tr);
        
      if (responseText.match
          (/<table [^>]*border=[\"\']?0[\"\']?[^>]*><tr><td[^>]*>([^<]+)<\/td><td bgcolor=[\"\']?(#[0-9A-Fa-f]+)[\"\']?/)) {
        /* レスの前の文字を反映する */
        var info
          = Akahuku.getDocumentParam (targetDocument).location_info;
        /* 避難所 patch */
        if (info.isMonaca) {
          info.replyPrefix
            = arAkahukuConverter.convertFromEUC (RegExp.$1, "");
        }
        else {
          info.replyPrefix
            = arAkahukuConverter.convertFromSJIS (RegExp.$1, "");
        }
            
        var head = targetDocument
          .getElementById ("akahuku_bottom_container_head");
        if (head) {
          var tmp = arAkahukuConverter.unescapeEntity (info.replyPrefix);
          arAkahukuDOM.setText (head, tmp);
        }
      
        /* HTML のソースから構築するので innerHTML を使用する  */
        var td = targetDocument.createElement ("td");
        td.innerHTML = info.replyPrefix;
        td.noWrap = "nowrap";
        td.align = "right";
        td.vAlign = "top";
        tr.appendChild (td);
            
        var td = targetDocument.createElement ("td");
        td.bgColor = RegExp.$2 ? RegExp.$2 : "#F0E0D6";
        tr.appendChild (td);
      
        container.main = td;
      }
      /* 避難所 patch */
      else if (responseText
               .match (/<table><tr><th>([^<]+)<\/th><td>/)) {
        var info
          = Akahuku.getDocumentParam (targetDocument).location_info;
        /* 避難所 patch */
        if (info.isMonaca) {
          info.replyPrefix
            = arAkahukuConverter.convertFromEUC (RegExp.$1, "");
        }
        else {
          info.replyPrefix
            = arAkahukuConverter.convertFromSJIS (RegExp.$1, "");
        }
            
        var head = targetDocument
          .getElementById ("akahuku_bottom_container_head");
        if (head) {
          var tmp = arAkahukuConverter.unescapeEntity (info.replyPrefix);
          arAkahukuDOM.setText (head, tmp);
        }
            
        /* HTML のソースから構築するので innerHTML を使用する  */
        var th = targetDocument.createElement ("th");
        th.innerHTML = info.replyPrefix;
        tr.appendChild (th);
            
        var td = targetDocument.createElement ("td");
        tr.appendChild (td);
      
        container.main = td;
      }
    
      container.nodes = [table];
    }
    else {
      var r, br;
      r = targetDocument.createElement ("div");
      r.className = "r";
      br = targetDocument.createElement ("br");
      br.clear = "left";
      
      container.nodes = [r, br];
      container.main = r;
    }
    
    return container;
  },
    
  /**
   * レス番号を付ける
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  HTMLElement element
   *         対象の td 要素
   * @param  Number number
   *         レス番号
   */
  applyNumbering : function (targetDocument, element, number) {
    if (number <= arAkahukuThread.numberingMax) {
      var span = targetDocument.createElement ("span");
      span.className = "akahuku_replynumber";
      span.appendChild (targetDocument.createTextNode (number));
      
      if (arAkahukuDOM.hasClassName (element.firstChild, "s")) {
        element.insertBefore (span, element.firstChild.nextSibling);
      }
      else {
        element.insertBefore (span, element.firstChild);
      }
    }
  },
    
  /**
   * レスを追加する
   *
   * @param  String responseText
   *         応答の HTML
   * @param  HTMLDivElement terminator
   *         レスを追加する位置の次の要素
   * @param  Boolean sync
   *         同期フラグ
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean retNode
   *         BLOCKQUOTE のリストを返すか
   * @return Array
   *         [Number 新規のレス,
   *          Number 取得していなかったレス, Number 削除されたレス,
   *          Array 追加したレスの BLOCKQUOTE のリスト,
   *          Array 途中に追加したレスの BLOCKQUOTE のリスト]
   */
  appendNewReplies : function (responseText, terminator, sync,
                               targetDocument, retNode) {
    var newNodes = new Array ();
    var addNodes = new Array ();
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var lastReply = arAkahukuThread.getLastReply (targetDocument);
    
    var replyStartTag = "<td bgcolor=";
    var replyEndTag = "</td>";
    var replyEndTag2 = null;
    var tagStop = ">";
    var checkColor = true;
    
    /* 避難所 patch */
    if (info.isMonaca) {
      checkColor = false;
      replyStartTag = "<th>\xa1\xc4</th><td";
      /* <th>…</tr><th (EUC-JP) */
      tagStop = "<td>";
    }
    if (responseText.indexOf ("<div class=t>") != -1) {
      checkColor = false;
      replyStartTag = "<div class=r>";
      tagStop = ">";
      replyEndTag = "</div>";
      replyEndTag2 = "</div>";
    }
    
    var lastReplyNumber = 0;
    var newReplies = 0;
    var skippedReplies = 0;
    var noSkippedReplies = 0;
    var deletedReplies = 0;
    var nodeletedReplies = 0;
    var startPosition = 0;
    var endPosition = 0;
    var redReplies = 0;

    var replyPrefix
    = arAkahukuConverter.convertToSJIS (info.replyPrefix, "");
        
    var showMailHandler
    = (arAkahukuLink.enableShowMail
       || arAkahukuLink.enableShowMailPopup) ?
    arAkahukuLink.applyShowMail : function () {};
        
    var autoLinkHandler
    = (arAkahukuLink.enableAutoLink
       || arAkahukuLink.enableHideTrolls) ?
    arAkahukuLink.applyAutoLink : function () {};
        
    var alertGIFHandler
    = arAkahukuThread.enableAlertGIF ?
    arAkahukuThread.applyAlertGIF : function () {};

    var delInlineHandler
    = arAkahukuThread.enableDelInline ?
    arAkahukuThread.applyInlineDel : function () {};
        
    var P2PHandler
    = arAkahukuP2P.enable ?
    arAkahukuP2P.applyP2P : function () {};
        
    var numberingHandler
    = (arAkahukuThread.enableNumbering) ?
    arAkahukuReload.applyNumbering : function () {};
        
    var saveImageHandler
    = arAkahukuImage.enable ?
    arAkahukuImage.applySaveImage : function () {};
        
    var quickQuoteNumberHandler
    = (arAkahukuQuote.enable && arAkahukuQuote.enableNumber) ?
    arAkahukuQuote.applyQuickQuoteNumber : function () {};
        
    var delNewTabHandler
    = arAkahukuThread.enableDelNewTab ?
    arAkahukuThread.applyDelNewTab : function () {};
        
    /* 合間合間に との連携の初期化 */
    var aimaHandler = function () {};
    var aimaHandler2 = function () {};
        
    try {
      if (typeof Aima_Aimani != "undefined") {
        if (Components.interfaces.nsIPrefBranch2 == undefined) {
          /* 監視していない場合にのみ設定を取得する */
          if (Aima_Aimani.loadNGWord) {
            Aima_Aimani.loadNGWord ();
          }
        }
                
        if ("hideNGNumberHandler" in Aima_Aimani) {
          aimaHandler = Aima_Aimani.hideNGNumberHandler;
        }
        if ("hideNGNumberHandler2" in Aima_Aimani) {
          aimaHandler2 = Aima_Aimani.hideNGNumberHandler2;
        }
      }
    }
    catch (e) {
      aimaHandler = function () {};
      aimaHandler2 = function () {};
    }
        
    if (!sync) {
      lastReplyNumber = arAkahukuThread.numberingMax + 1;
      /* 最後のレスの通し番号の取得 */
      if (arAkahukuThread.enableNumbering
          && lastReply.container) {
        var nodes2 = lastReply.container.main.getElementsByTagName ("span");
        for (var i = 0; i < nodes2.length; i ++) {
          if (nodes2 [i].className == "akahuku_replynumber") {
            lastReplyNumber = parseInt (nodes2 [i].innerHTML);
            break;
          }
        }
      }
    }
    else {
      lastReplyNumber = 0;
    }
        
    /* 区切りの削除 */
    var newReplyHeader
    = targetDocument.getElementById ("akahuku_new_reply_header");
    if (newReplyHeader) {
      newReplyHeader.parentNode.removeChild (newReplyHeader);
    }
        
    var tmp = Akahuku.getMessageBQ (targetDocument);
    var nodes = new Array ();
    for (var i = 1; i < tmp.length; i ++) {
      nodes.push (tmp [i]);
    }
    tmp = null;
    var nodesIndex = 0;
    
    /* レスの追加 */
    if (sync) {
      startPosition = 0;
    }
    else {
      startPosition
      = responseText
      .search (new RegExp ("name=\"?([0-9]+:)?" + lastReply.num + "\"?"));
    }
    for (startPosition
           = responseText.indexOf (replyStartTag, startPosition);
         startPosition >= 0;
         startPosition
           = responseText.indexOf (replyStartTag, endPosition)) {
      var isDeleted = false;
      if (checkColor) {
        var s = responseText.substr (startPosition, 100);
        if (!s.match (/^<td bgcolor=\'?#F0E0D6/i)) {
          endPosition = startPosition + 1;
          continue;
        }
        
        var p = responseText.substr (0, startPosition).lastIndexOf ("<table");
        if (p != -1) {
          if (responseText.substr (p, startPosition - p).match (/<table [^>]*class=[\'\"]?deleted[\'\"]?/)) {
            isDeleted = true;
          }
        }
      }
      
      endPosition = responseText.indexOf (replyEndTag, startPosition);
      if (endPosition < 0) {
        break;
      }
      
      if (replyEndTag2) {
        endPosition += replyEndTag.length;
        endPosition = responseText.indexOf (replyEndTag2, endPosition);
        if (endPosition < 0) {
          break;
        }
      }
      
      var tagStopPosition = responseText.indexOf (tagStop, startPosition);
      if (tagStopPosition == -1) {
        break;
      }
      var currentReplyTextTmp
      = responseText.substr (tagStopPosition + tagStop.length,
                             endPosition
                             - (tagStopPosition + tagStop.length));
      
      var currentReplyText;
      /* 避難所 patch */
      if (info.isMonaca) {
        currentReplyText
          = arAkahukuConverter.convertFromEUC (currentReplyTextTmp,
                                               "");
      }
      else {
        currentReplyText
        = arAkahukuConverter.convertFromSJIS (currentReplyTextTmp, "");
      }
            
      var num = 0;
      if (currentReplyText.match (/name=\"?([0-9]+:)?([0-9]+)\"?/)) {
        num = parseInt (RegExp.$2);
      }
      /* 避難所 patch */
      else if (currentReplyText.match (/value=\"?([0-9]+)\"?/)) {
        num = parseInt (RegExp.$1);
      }
      else if (currentReplyText.match (/No.([0-9]+)/)) {
        num = parseInt (RegExp.$1);
      }
      if (sync || num > lastReply.num) {
        /* レスの追加 */
        if (!lastReply.container) {
          /* レスが無い時 */
          lastReply.container
          = arAkahukuReload.createContainer (responseText,
                                             targetDocument);
          replyPrefix
          = arAkahukuConverter.convertToSJIS (info.replyPrefix, "");
          lastReplyNumber = 0;
        }
        
        var currentContainer
        = Akahuku.cloneMessageContainer (lastReply.container);
        arAkahukuDOM.removeClassName
        (currentContainer.main, "akahuku_skipped_reply");
        arAkahukuDOM.removeClassName
        (currentContainer.main, "akahuku_deleted_reply");
        
        /* HTML のソースから構築するので innerHTML を使用する  */
        currentContainer.main.innerHTML = currentReplyText;
        
        var appendPosition = null;
        var append = true;
        var replyIndex = 0;
        appendPosition = terminator;
                
        var className = "";
        if (sync) {
          append = false;
          while (true) {
            if (nodesIndex < nodes.length) {
              var nodeNum
                = Akahuku.getMessageNum (nodes [nodesIndex]);
              var container = Akahuku.getMessageContainer (nodes [nodesIndex]);
              
              if (nodeNum == num) {
                /* 同じレスがある */
                if (arAkahukuDOM.hasClassName
                    (container.main, "akahuku_skipped_reply")) {
                  arAkahukuDOM.removeClassName
                    (container.main, "akahuku_skipped_reply");
                }
                
                var bqs = Akahuku.getMessageBQ (currentContainer.main);
                if (bqs.length) {
                  var fonts = bqs [0].getElementsByTagName ("font");
                  
                  var c;
                  var reds = [];
                  for (var i = 0; i < fonts.length; i ++) {
                    c = fonts [i].getAttribute ("color");
                    if (c == "#f00000" || c == "#ff0000") {
                      reds.push (fonts [i]);
                    }
                  }

                  var bs = bqs [0].getElementsByTagName ("b");
                  for (var i = 0; i < bs.length; i ++) {
                    if (bs [i].parentNode.nodeName.toLowerCase () == "font") {
                      c = bs [i].parentNode.getAttribute ("color");
                      if (c == "#f00000" || c == "#ff0000") {
                        continue;
                      }
                    }
                    reds.push (bs [i]);
                  }
                  
                  var bqs2 = Akahuku.getMessageBQ (container.main);
                  if (bqs2.length) {
                    var fonts2 = bqs2 [0].getElementsByTagName ("font");
                    var reds2 = [];
                    for (var i = 0; i < fonts2.length; i ++) {
                      c = fonts2 [i].getAttribute ("color");
                      if (c == "#f00000" || c == "#ff0000") {
                        if (("className" in fonts2 [i]
                             && fonts2 [i].className
                             == "akahuku_generated_link_child")
                            || fonts2 [i].hasAttribute ("__akahuku_troll")) {
                          continue;
                        }
                        reds2.push (fonts2 [i]);
                      }
                    }
                    var bs2 = bqs2 [0].getElementsByTagName ("b");
                    for (var i = 0; i < bs2.length; i ++) {
                      if (bs2 [i].parentNode.nodeName.toLowerCase () == "font") {
                        c = bs2 [i].parentNode.getAttribute ("color");
                        if (c == "#f00000" || c == "#ff0000") {
                          continue;
                        }
                      }
                      reds2.push (bs2 [i]);
                    }
                    
                    if (reds.length != reds2.length) {
                      redReplies ++;
                      for (var i = 0; i < reds2.length; i ++) {
                        var br = arAkahukuDOM.findBR (reds2 [i].nextSibling);
                        if (br) {
                          br.parentNode.removeChild (br);
                        }
                        reds2 [i].parentNode.removeChild (reds2 [i]);
                      }
                      
                      for (var i = reds.length - 1; i >= 0; i --) {
                        var br = targetDocument.createElement ("br");
                        if (bqs2 [0].firstChild) {
                          bqs2 [0].insertBefore (br, bqs2 [0].firstChild);
                        }
                        else {
                          bqs2 [0].appendChild (br);
                        }
                        
                        var p = reds [i].previousSibling;
                        var n = reds [i].nextSibling;
                        if (n
                            && n.nodeName.toLowerCase () == "#text") {
                          bqs2 [0].insertBefore (n, bqs2 [0].firstChild);
                        }
                        bqs2 [0].insertBefore (reds [i], bqs2 [0].firstChild);
                        if (p
                            && p.nodeName.toLowerCase () == "#text") {
                          bqs2 [0].insertBefore (p, bqs2 [0].firstChild);
                        }
                      }
                    }
                  }
                }
                
                if (arAkahukuThread.enableNumbering
                    && skippedReplies + deletedReplies
                    + nodeletedReplies) {
                  /* レス番号がズレている時 */
                  if ("className" in container.main.firstChild
                      && container.main.firstChild.className
                      == "akahuku_replynumber") {
                    arAkahukuDOM.setText
                      (container.main.firstChild,
                       nodesIndex
                       + skippedReplies
                       - deletedReplies + 1);
                  }
                }
                nodesIndex ++;
                break;
              }
              else if (nodeNum < num) {
                /* 削除されたレスの次のレス */
                if (arAkahukuReload.enableSyncButtonNoDelete) {
                  nodeletedReplies ++;
                  
                  arAkahukuDOM.addClassName
                    (container.main, "akahuku_deleted_reply");
                  
                  if (arAkahukuThread.enableNumbering
                      && skippedReplies + deletedReplies
                      + nodeletedReplies) {
                    /* レス番号がズレている時 */
                    if ("className" in container.main.firstChild
                        && container.main.firstChild.className
                        == "akahuku_replynumber") {
                      arAkahukuDOM.setText
                        (container.main.firstChild,
                         nodesIndex
                         + skippedReplies
                         - deletedReplies
                         + 1);
                    }
                  }
                }
                else {
                  deletedReplies ++;
                  
                  Akahuku.removeMessageContainer (container);
                }
                nodesIndex ++;
              }
              else if (nodeNum > num) {
                /* 取得していなかったレス */
                skippedReplies ++;
                
                append = true;
                appendPosition = container.nodes [0];
                className = "akahuku_skipped_reply";
                replyIndex
                  = nodesIndex + skippedReplies
                  - deletedReplies;
                break;
              }
            }
            else {
              /* 新規のレス */
                            
              newReplies ++;
              append = true;
              replyIndex
                = nodesIndex + skippedReplies
                - deletedReplies + newReplies;
              break;
            }
          }
        }
        else {
          newReplies ++;
          replyIndex = lastReplyNumber + newReplies;
        }
                
        if (Akahuku.enablePartial
            && replyIndex < info.replyFrom) {
          noSkippedReplies ++;
          continue;
        }
        
        if (newReplies == 1) {
          /* 最初の新規レス */
          if (arAkahukuReload.enableRule) {
            /* 区切りの追加 */
            if (!newReplyHeader) {
              newReplyHeader
              = arAkahukuThread.createNewReplyHeader
              (targetDocument,
               arAkahukuReload.enableRuleZeroHeight,
               arAkahukuReload.enableRuleRandom);
            }
                        
            terminator.parentNode
            .insertBefore (newReplyHeader, terminator);
          }
          arAkahukuThread.updateReplyPrefix
          (lastReply.container, info);
        }
        
        if (append) {
          if (className) {
            arAkahukuDOM.addClassName
            (currentContainer.main, className);
          }
          saveImageHandler (targetDocument, currentContainer.main);
          P2PHandler (targetDocument, currentContainer.main, false);
          showMailHandler (targetDocument, currentContainer.main);
          autoLinkHandler (targetDocument, currentContainer.main);
          alertGIFHandler (targetDocument, currentContainer.main);
          delInlineHandler (targetDocument, currentContainer.main);
          numberingHandler (targetDocument, currentContainer.main,
                            replyIndex);
          quickQuoteNumberHandler (targetDocument, currentContainer.main);
          delNewTabHandler (targetDocument, currentContainer.main);
          
          if (Akahuku.enableAddCheckboxID) {
            var nodes2
              = currentContainer.main.getElementsByTagName ("input");
            var t = (new Date ()).getTime ();
            var tmp = "akahuku_dummyid_" + t + "_";
            if (nodes2.length > 0) {
              if (!("id" in nodes2 [0])
                  || !nodes2 [0].id) {
                nodes2 [0].id = tmp + newReplies;
              }
            }
          }
          
          for (var i = 0; i < currentContainer.nodes.length; i ++) {
            arAkahukuDOM.removeClassName
            (currentContainer.nodes [i], "deleted");
            if (isDeleted && currentContainer.nodes [i].nodeName.toLowerCase () == "table") {
              arAkahukuDOM.addClassName
              (currentContainer.nodes [i], "deleted");
            }
            
            terminator.parentNode.insertBefore
            (currentContainer.nodes [i], appendPosition);
          }
          
          arAkahukuThread.fixBug (currentContainer.main, info);
          aimaHandler (currentContainer.main, targetDocument);
          aimaHandler2 (currentContainer.main, targetDocument);
                    
          if (retNode) {
            var nodes2
              = Akahuku.getMessageBQ (currentContainer.main);
            if (nodes2.length > 0) {
              if (className == "akahuku_skipped_reply") {
                addNodes.push (nodes2 [0]);
              }
              else {
                newNodes.push (nodes2 [0]);
              }
            }
          }
        }
      }
    }
    if (sync) {
      while (nodesIndex < nodes.length) {
        /* 末尾に削除されたレスがある */
                
        if (arAkahukuReload.enableSyncButtonNoDelete) {
          nodeletedReplies ++;
          
          var container = Akahuku.getMessageContainer (nodes [nodesIndex]);
          arAkahukuDOM.addClassName
          (container.main, "akahuku_deleted_reply");
          
          if (arAkahukuThread.enableNumbering
              && skippedReplies + deletedReplies + nodeletedReplies) {
            /* レス番号がズレている時 */
            if ("className" in container.main.firstChild
                && container.main.firstChild.className
                == "akahuku_replynumber") {
              arAkahukuDOM.setText (container.main.firstChild,
                                    nodesIndex
                                    + skippedReplies
                                    - deletedReplies + 1);
            }
          }
        }
        else {
          deletedReplies ++;
          
          Akahuku.removeMessageContainer (container);
        }
        nodesIndex ++;
      }
    }
    
    arAkahukuReload.updateDDel (targetDocument);
    
    skippedReplies -= noSkippedReplies;
        
    if (newReplies + skippedReplies + nodeletedReplies + deletedReplies
        > 0) {
      /* レス数の表示 */
      arAkahukuThread.updateReplyNumber (targetDocument);
      if (arAkahukuThread.enableBottomStatus) {
        var bottomStatus
          = targetDocument.getElementById ("akahuku_bottom_status");
        if (bottomStatus) {
          arAkahukuThread.displayReplyNumber (targetDocument);
        }
        else {
          /* レス 0 からのリロード */
          var lastReply
            = arAkahukuThread.getLastReply (targetDocument);
          var td = terminator.getElementsByTagName ("td") [1];
          td.insertBefore (arAkahukuThread.createThreadStatus
                           (targetDocument,
                            info.threadNumber,
                            lastReply.num,
                            -1,
                            "",
                            "",
                            true),
                           td.firstChild);
          arAkahukuThread.displayReplyNumber (targetDocument);
        }
      }
    }
        
    return new Array (newReplies, skippedReplies,
                      nodeletedReplies + deletedReplies,
                      newNodes, addNodes, redReplies);
  },
    
  /**
   * 広告を更新する
   *
   * @param  String responseText
   *         応答の HTML
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateAd : function (responseText, targetDocument) {
    var startPosition = 0;
    var endPosition = 0;
    var heading = "<table width=468 border><tr><td>";
    var heading2 = "<table class=\"ama\"><tr><td>";
    var heading3 = "<div class=\"ama\">";
    var startTag = heading + "<a href=\"http://www.amazon.co.jp/";
    var startTag2 = heading2 + "<a href=\"http://www.amazon.co.jp/";
    var startTag3 = heading3 + "<a href=\"http://www.amazon.co.jp/";
    var mode = 1;
    var endTag = "</td>";
    var trailing2 = "</blockquote>";
    var endTag2 = "</blockquote></div>";
    
    startPosition = responseText.indexOf (startTag, startPosition);
    if (startPosition != -1) {
      startPosition += heading.length;
    }
    else {
      startPosition = responseText.indexOf (startTag2, startPosition);
      
      if (startPosition != -1) {
        startPosition += heading2.length;
      }
      else {
        startPosition = responseText.indexOf (startTag3, startPosition);
      
        if (startPosition != -1) {
          mode = 2;
          startPosition += heading3.length;
        }
        else {
          return;
        }
      }
    }
        
    if (mode == 1) {
      endPosition = responseText.indexOf (endTag, startPosition);
      if (endPosition == -1) {
        return;
      }
    }
    else {
      endPosition = responseText.indexOf (endTag2, startPosition);
      if (endPosition == -1) {
        return;
      }
      endPosition += trailing2.length;
    }
        
    var adText
    = responseText.substr (startPosition, endPosition - startPosition);
    
    var adCell = null;
    adCell = targetDocument.getElementById ("akahuku_ad_cell");
    if (adCell == null) {
      var nodes = targetDocument.getElementsByTagName ("blockquote");
      for (var i = 0; i < nodes.length; i ++) {
        var isBanner = false;
        var mode2 = 1;
        if (arAkahukuDOM.findParentNode (nodes [i], "center") != null) {
          isBanner = true;
        }
        var table = arAkahukuDOM.findParentNode (nodes [i], "table");
        if (table && table.getAttribute ("border") == 1) {
          isBanner = true;
        }
        if (table && "className" in table
            && table.className == "ama") {
          isBanner = true;
        }
        
        table = arAkahukuDOM.findParentNode (nodes [i], "div");
        if (table
            && "className" in table
            && table.className == "ama") {
          isBanner = true;
          mode2 = 2;
        }
        
        if (isBanner) {
          if (mode == 1) {
            var td = arAkahukuDOM.findParentNode (nodes [i], "td");
            adCell = td;
            adCell.id = "akahuku_ad_cell";
          }
          else {
            var td = arAkahukuDOM.findParentNode (nodes [i], "div");
            adCell = td;
            adCell.id = "akahuku_ad_cell";
          }
          break;
        }
      }
    }
        
    if (adCell) {
      adCell.innerHTML = arAkahukuConverter.convertFromSJIS (adText);
    }
  },
  
  /**
   * レスを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  update : function (targetDocument) {
    var param
    = Akahuku.getDocumentParam (targetDocument).reload_param;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var newNodes = new Array (), addNodes = new Array ();
        
    /* 応答を解析する */
    var responseText = param.responseText;
    
    var newReplies = 0;
    
    var responseTextBeginPosition = 0;
    if (!info.isMonaca
        && param.sync
        && (responseText.search (/<html/i) == -1
            || responseText.search (/<\/html/i) == -1)) {
      arAkahukuReload.setStatus ("\u30ED\u30FC\u30C9\u5931\u6557",
                                 false, targetDocument);
    }
    else if (responseText != "") {
      var container
      = targetDocument.getElementById ("akahuku_bottom_container");
            
      var retNode = (arAkahukuReload.listeners.length > 0);
            
      /* レスに反映する */
      var array
      = arAkahukuReload.appendNewReplies (responseText,
                                          container,
                                          param.sync,
                                          targetDocument,
                                          retNode);
            
      /* 広告に反映する */
      arAkahukuReload.updateAd (responseText,
                                targetDocument);
            
      newReplies = array [0];
      var skippedReplies = array [1];
      var deletedReplies = array [2];
      newNodes = array [3];
      addNodes = array [4];
      var redReplies = array [5];
            
      /* 避難所 patch */
      if (info.isMonaca) {
        var contentRange = "";
        try {
          contentRange
            = param.reloadChannel.getResponseHeader
            ("X-Content-Range");
        }
        catch (e) {
          contentRange = "";
        }
        var re
          = contentRange.match
          (/(no content )?([0-9]+)\/([0-9]+)/);
        if (re) {
          param.nextPosition = parseInt (re [3]);
        }
      }
            
      if (newReplies > 0) {
        /* 新しいレスがあった場合 */
                
        /* [mht で保存] のステータスを消す */
        var mht_progress
        = targetDocument.getElementById
        ("akahuku_savemht_progress");
        if (mht_progress) {
          arAkahukuDOM.setText (mht_progress, null);
        }
        var mht_status
        = targetDocument.getElementById ("akahuku_savemht_status");
        if (mht_status) {
          arAkahukuDOM.setText (mht_status, null);
        }
                
        var mht_progress
        = targetDocument.getElementById
        ("akahuku_throp_savemht_progress");
        if (mht_progress) {
          arAkahukuDOM.setText (mht_progress, null);
        }
        var mht_status
        = targetDocument.getElementById
        ("akahuku_throp_savemht_status");
        if (mht_status) {
          arAkahukuDOM.setText (mht_status, null);
        }
                
        /* レス数を表示 */
        var node
        = targetDocument
        .getElementById ("akahuku_new_reply_header_number");
        if (node) {
          arAkahukuDOM.setText (node, newReplies);
        }
      }
            
      /* スレ消滅情報に反映する */
      arAkahukuReload.updateViewersNumber (responseText,
                                           targetDocument);
      arAkahukuReload.updateDeletedMessage (responseText,
                                           targetDocument);
      arAkahukuReload.updateExpireWarning (responseText,
                                           targetDocument);
      arAkahukuReload.updateExpireTime (responseText,
                                        targetDocument);
      
      arAkahukuReload.updateExpireDiffNum (targetDocument);
      if (arAkahukuThread.enableBottomStatus
          && arAkahukuThread.enableBottomStatusHidden) {
        arAkahukuThread.updateHidden (targetDocument);
      }
            
      if (arAkahukuTitle.enable) {
        /* タイトルを更新する */
        arAkahukuTitle.setTitle (targetDocument, info);
      }
      arAkahukuThread.updateResPanel (targetDocument);
      arAkahukuThread.updateResPanelBar (targetDocument);
            
      var s = "";
      var parm = false;
            
      if (!arAkahukuReload.enableStatusNoCount) {
        if (newReplies > 0) {
          var parm = true;
          s += "\u65B0\u7740: " + newReplies;
        }
        else {
          s += "\u65B0\u7740\u306A\u3057";
        }
                
        if (skippedReplies > 0) {
          /* 取得していなかったレスがあった場合 */
          s += ", \u672A\u53D6\u5F97: " + skippedReplies;
          parm = true;
        }
        if (deletedReplies > 0) {
          /* 削除されたレスがあった場合 */
          s += ", \u524A\u9664: " + deletedReplies;
          parm = true;
        }
        if (redReplies > 0) {
          /* 赤字が変わったレスがあった場合 */
          s += ", \u8D64\u5B57\u5909\u5316: " + redReplies;
          parm = true;
        }
      }
      
      arAkahukuReload.setStatus (s, parm, targetDocument);
      if (arAkahukuReload.enableTimeStamp) {
        arAkahukuReload.setTimeStamp (targetDocument);
      }
    }
    else {
      arAkahukuReload.setStatus ("\u30ED\u30FC\u30C9\u5931\u6557",
                                 false, targetDocument);
    }
        
    if (arAkahukuSidebar.enable) {
      try {
        var name, reply, expire, warning, lastNum;
            
        name = info.server + "_" + info.dir;
            
        if (name in arAkahukuSidebar.boards) {
          var ok = true;
          if (!arAkahukuSidebar.enableBackground) {
            var sidebar = arAkahukuSidebar.getSidebar ();
            if (!sidebar.docShell) {
              ok = false;
            }
            else {
              var sidebarDocument = sidebar.contentDocument;
              var iframe
                = sidebarDocument.getElementById
                ("akahuku_sidebar_iframe_" + name);
              if (iframe == null) {
                ok = false;
              }
            }
          }
          if (ok) {
            var nodes = Akahuku.getMessageBQ (targetDocument);
            reply = nodes.length - 1;
            node
              = targetDocument.getElementById
              ("akahuku_thread_deletetime");
            if (node) {
              expire = nodes.innerHTML;
            }
            else {
              expire = null;
            }
            node
              = targetDocument.getElementById
              ("akahuku_thread_warning");
            if (node) {
              warning = node.innerHTML;
            }
            else {
              warning = null;
            }
            lastNum
              = Akahuku.getMessageNum (nodes [nodes.length - 1]);
                        
            arAkahukuSidebar.onThreadChange (name,
                                             info.threadNumber,
                                             reply,
                                             expire,
                                             warning,
                                             lastNum);
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    var updateCache = false;
        
    if (param.writer == null) {
      param.writer = new arAkahukuReloadCacheWriter ();
    }
        
    if (param.writer.setText (responseText)) {
      param.writer.responseHead = param.responseHead;
      updateCache = true;
    }
        
    if (updateCache) {
      try {
        param.writer.viewer = info.viewer;
        param.writer.expire
        = arAkahukuConverter.convertToSJIS (info.expire, "");
        param.writer.warning
        = "<font color=\"#f00000\"><b>"
        + arAkahukuConverter.convertToSJIS (info.expireWarning, "")
        + "</b></font>";
                
        var cacheService
        = Components.classes ["@mozilla.org/network/cache-service;1"]
        .getService (Components.interfaces.nsICacheService);
        var httpCacheSession;
        httpCacheSession
        = cacheService
        .createSession ("HTTP",
                        Components.interfaces.nsICache.STORE_ANYWHERE,
                        true);
        httpCacheSession.doomEntriesIfExpired = false;
        httpCacheSession
        .asyncOpenCacheEntry (param.location,
                              Components.interfaces.nsICache
                              .ACCESS_WRITE,
                              param.writer);
                
        if (arAkahukuReload.enableExtCache) {
          /* バックアップキャッシュを更新 */
          if (arAkahukuReload.enableExtCacheFile) {
            param.writer.createFile (param.location);
          }
          else {
            httpCacheSession
              .asyncOpenCacheEntry
              (param.location + ".backup",
               Components.interfaces.nsICache
               .ACCESS_WRITE,
               param.writer);
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
    param.reloadChannel = null;
        
    param.readBytes = "";
    param.stream = null;
    
    if (!param.replied) {
      if (newReplies) {
        arAkahukuSound.playReplyNew ();
      }
      else {
        arAkahukuSound.playReplyReload ();
      }
    }
    else {
      arAkahukuSound.playReply ();
    }
        
    if (param.sync) {
      for (var i = 0; i < arAkahukuReload.listeners.length; i ++) {
        arAkahukuReload.listeners [i].onSync
        (targetDocument, newNodes, addNodes);
      }
    }
    else {
      for (var i = 0; i < arAkahukuReload.listeners.length; i ++) {
        arAkahukuReload.listeners [i].onReload
        (targetDocument, newNodes);
      }
    }
  },
    
  /**
   * 続きを読む
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean sync
   *         同期フラグ
   * @param  Boolean replied
   *         返信後フラグ
   */
  diffReloadCore : function (targetDocument, sync, replied) {
    var param
    = Akahuku.getDocumentParam (targetDocument).reload_param;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    if (param.replying) {
      return;
    }
        
    /* ロードに失敗している画像を読み直す */
    var nodes, i;
    nodes = targetDocument.getElementsByTagName ("img");
    for (i = 0; i < nodes.length; i ++) {
      try {
        var load
          = nodes [i].QueryInterface
          (Components.interfaces.nsIImageLoadingContent);
        var request
          = load.getRequest
          (Components.interfaces.nsIImageLoadingContent
           .CURRENT_REQUEST);
                
        var errorStatus
          = Components.interfaces.imgIRequest.STATUS_ERROR
          | Components.interfaces.imgIRequest.STATUS_LOAD_PARTIAL;
                
        if (!request) {
          continue;
        }
        if (request.imageStatus & errorStatus) {
          nodes [i].src = nodes [i].src;
        }
        else if (request.imageStatus == 0) {
          setTimeout
            (function (node) {
              node.src = node.src;
            }, 100, nodes [i]);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    if (param.reloadChannel) {
      /* リロード中ならば中断する */
      try {
        param.reloadChannel.cancel (0x80020006);
        /* NS_BINDING_ABORTED */
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      param.reloadChannel = null;
      arAkahukuReload.setStatus
      ("\u4E2D\u65AD\u3055\u308C\u307E\u3057\u305F",
       false, targetDocument);
      if (arAkahukuReload.enableNolimit) {
        arAkahukuConfig.restoreTime ();
      }
      return;
    }
        
    if (!targetDocument
        .getElementById ("akahuku_bottom_container")) {
      return;
    }
        
    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.setTime (arAkahukuReload.limitTime);
    }
        
    param.sync = sync;
    param.replied = replied;
        
    param.useRange = false;
        
    var location = targetDocument.location.href;
        
    /* 避難所 patch */
    if (info.isMonaca) {
      location = location.replace
        (/\/([^\/]+)\/res\/.*/, "/monacalib/include/dr.php?board=$1")
        + "&res=" + info.threadNumber
        + "&offset=" + param.nextPosition;
      param.useRange = true;
    }
        
    var ios
    = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (Components.interfaces.nsIIOService);
    param.reloadChannel
    = ios.newChannel (location, null, null)
    .QueryInterface (Components.interfaces.nsIHttpChannel);
        
    param.location = location;
        
    arAkahukuReload.setStatus
    ("\u30ED\u30FC\u30C9\u4E2D (\u30D8\u30C3\u30C0)",
     true, targetDocument);
        
    try {
      param.reloadChannel.asyncOpen (param, null);
    }
    catch (e) {
      /* サーバに接続できなかった場合 */
      arAkahukuReload.setStatus
      ("\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
       true, targetDocument);
    }
        
    if (info.isFutaba
        && !info.isFutasuke) {
      /* 続きを読んでも画像が来ない場合は見てない事になってしまうので
       * 手動で板のリストを更新する */
      if (typeof (Components.interfaces.arIAkahukuP2PServant2)
          != "undefined") {
        var servant
        = Components.classes ["@unmht.org/akahuku-p2p-servant;2"]
        .getService (Components.interfaces.arIAkahukuP2PServant2);
                
        servant.visitBoard (info.server + "/" + info.dir);
      }
    }
  },
    
  /**
   * キャッシュをバックアップする
   *
   * @param  String location
   *         対象の URI
   * @param  arAkahukuReloadParam param
   *         [続きを読む] 管理データ
   */
  backupCache : function (location, param) {
    var cacheService
    = Components.classes ["@mozilla.org/network/cache-service;1"]
    .getService (Components.interfaces.nsICacheService);
    var httpCacheSession;
    httpCacheSession
    = cacheService
    .createSession ("HTTP",
                    Components.interfaces.nsICache.STORE_ANYWHERE,
                    true);
    httpCacheSession.doomEntriesIfExpired = false;
    param.location = location;
        
    try {
      httpCacheSession.asyncOpenCacheEntry
        (location,
         Components.interfaces.nsICache.ACCESS_READ,
         param);
    }
    catch (e) {
      /* キャッシュが存在しなかった場合 */
    }
  },
    
  /**
   * body の unload イベント
   * 各種データを削除する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuDocumentParam documentParam
   *         ドキュメントごとの情報
   */
  onBodyUnload : function (targetDocument, documentParam) {
    var param;
        
    param = documentParam.reload_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.reload_param = null;
  },
    
  /**
   * Not Found の文字列を返す
   *
   * @return String
   *         Not Found の文字列
   */
  getNotFoundText : function () {
    var status;
        
    status
    = [
      "Not Found. \u30B9\u30EC\u30C3\u30C9\u304C\u6D88\u3048\u305F\u3088\u3046\u3067\u3059\u3002"
      ];
        
    if (arAkahukuReload.enableStatusRandom) {
      status
        = [
          "Not Found. \u8077\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u3088\u3046\u3067\u3059\u3002",
          "Not Found. \u5929\u6D25\u98EF\u306E\u6C17\u304C\u6D88\u3048\u305F\u3088\u3046\u3067\u3059",
          "Not Found. \u3059\u307F\u307E\u305B\u3093\u3001\u305D\u308C\u6765\u6708\u304B\u3089\u306A\u3093\u3067\u3059\u3088",
          "Not Found. \u5C45\u5834\u6240\u3092\u5931\u3063\u305F\u3088\u3046\u3067\u3059",
          "Not Found. \u3078\u3093\u3058\u304C\u306A\u3044\u3000\u30B9\u30EC\u30C3\u30C9\u304C\u304D\u3048\u305F\u3088\u3046\u3060",
          "Not Found. \u751F\u304D\u308B\u610F\u5473\u304C\u898B\u3044\u3060\u305B\u307E\u305B\u3093",
          "Not Found. \u3053\u306E\u30B9\u30EC\u30C3\u30C9\u306F\u8CB7\u53CE\u3055\u308C\u307E\u3057\u305F\u3002\uFF8A\uFF8A\uFF6F\uFF08\u7532\u9AD8\u3044\u58F0\uFF09",
          "Not Found. \u3053\u306E\u30B9\u30EC\u30C3\u30C9\u304C\u6D88\u3048\u305F\u306E\u3082\u79C1\u306E\u4ED5\u696D\u3060",
          "Not Found. \u3044\u306A\u3044\u3055\u3093\u306F\u3044\u306A\u3044\u3088\uFF1F",
          "Not Found. \u30B7\u30E7\u30A6\u30B4\u304F\u3093\u304C\u8131\u51FA\u3067\u304D\u305F\u3088\u3046\u3067\u3059\u3002",
          "Not Found. \u305D\u308D\u305D\u308D\u30D6\u30E9\u30A6\u30B6\u9589\u3058\u3088\u3046\u305C\uFF01",
          "Not Found. \u3053\u306E\u30ED\u30EA\u30B3\u30F3\u3069\u3082\u3081\uFF01",
          "Not Found. \u3081\u3069\u3044\u3055\u3093\u3069\u3053\u884C\u304F\u3093\u3067\u3059\u304B\uFF1F\u3081\u3069\u3044\u3055\u3093\u3081\u3069\u3044\u3055\u3093\u2026\u2026",
          "Not Found. \u5E0C\u671B\u304C\u7121\u3044\u3088\u3002",
          "Not Found. \u4FFA\u305F\u3061\u306E\u5192\u967A\u306F\u59CB\u307E\u3063\u305F\u3070\u304B\u308A\u3060\uFF01",
          "Not Found. \u6D88\u3048\u306A\u304B\u3063\u305F\u30B9\u30EC\u30C3\u30C9\u304C\u6D88\u3048\u51FA\u3057\u305F",
          "Not Found. \u3059\u307F\u307E\u305B\u3093\u3001\u3044\u3064\u3082\u306E\u3067\u3002\u306F\u3044\u3001\u9EC4\u8272\u3044\u65B9\u3092\u304A\u9858\u3044\u3057\u307E\u3059\u3002",
          "No Future. \u5922\u3082\u5E0C\u671B\u3082\u3042\u308A\u3083\u3057\u306A\u3044",
          "No Future. \u30D5\u30A1\u30A4\u30EB\u304C\u7121\u3044\u30A2\u30EB\u3088\u3002",
          "Not Found. \u30B9\u30EC\u30C3\u30C9\u304C\u306A\u3044\u3042\u308B\u3088\u3002",
          "Not Found. \u304A\u524D\u305F\u3061\u3000\u3082\u3046\u5BDD\u306A\u3055\u30FC\u3044",
          "Not Found. \u304C\u3042\u308B\u306E\u3088\uFF01",
          "Not Found. \u30D5\u30A1\u30A4\u30EB\u304C\u7121\u3044\u306A\u3093\u3066\u3072\u3069\u3044\u3067\u3059\u30FC\uFF01",
          "Not Found. \u5927\u5224\u713C\u304D",
          "Not Found \u3058\u3083\u306D\u3048\u306E\uFF01\uFF1F",
          "Not Found. \u5909\u614B\uFF01\u5909\u614B\uFF01\u6D3E\u9063\u793E\u54E1\uFF01\u5909\u614B\uFF01",
          "Not Found. \uFF3C\u3046\u308F\u3063\u30A8\u30ED\u30C3\uFF0F",
          "Not Found. \uFF3C\u3068\u3073\u307E\u30FC\u3059\uFF0F",
          "Not Found. \u30B4\u30EB\u30B4\u30E0\u306E\u4ED5\u696D\u3060\uFF01",
          "Not Found. \uFF94\uFF8A\uFF98\uFF7F\uFF73\uFF72\uFF73\uFF7A\uFF84\uFF76!",
          "Not Found. \u300C\u3088\u304F\u3082\u307C\u304F\u3092\u30A9\uFF01\uFF01\u3060\u307E\u3057\u305F\u306A\u30A1\uFF01\uFF01\u300D",
          "Not Found. \u30B9\u30EC\u306E\u6D88\u6EC5\u306F\u30CE\u30B9\u30C8\u30E9\u30C0\u30E0\u30B9\u306B\u3088\u3063\u3066\u4E88\u8A00\u3055\u308C\u3066\u3044\u305F\u3093\u3060\u3088\uFF01",
          "Not Found. \u306A\u3001\u306A\u3093\u3060\u3063\u3066\u30FC\uFF01\uFF01",
          "Not Found. \u4F55\u304B\u6D88\u3048\u305F\u30B3\u30B3",
          "Mot Found."
          ];

    }
        
    var index
    = parseInt (Math.random () * status.length);
    if (index >= status.length) {
      index = 0;
    }
        
    return status [index];
  },
    
  /**
   * [続きを読む] ボタンを追加する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound) {
      if (info.isReply
          && arAkahukuReload.enableExtCache) {
        var div = targetDocument.createElement ("div");
        div.id = "akahuku_cache_link";
                
        div.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_cache_button";
        if (arAkahukuReload.enableExtCacheFile) {
          a.href
            = Akahuku.protocolHandler.enAkahukuURI
            ("filecache", targetDocument.location.href);
        }
        else {
          a.href
          = Akahuku.protocolHandler.enAkahukuURI
          ("cache", targetDocument.location.href);
        }
        a.appendChild (targetDocument.createTextNode
                       ("\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u898B\u308B"));
        div.appendChild (a);
                
        div.appendChild (targetDocument.createTextNode ("]"));
                
        targetDocument.body.insertBefore
        (div, targetDocument.body.firstChild);
      }
            
      return;
    }
        
    if (info.isReply && info.isOnline
        && targetDocument.location.href.match (/^http:/)
        && arAkahukuReload.enable
        && !info.isTsumanne) {
      var param = new arAkahukuReloadParam ();
      Akahuku.getDocumentParam (targetDocument).reload_param = param;
      param.targetDocument = targetDocument;
            
      try {
        targetDocument.defaultView
          .QueryInterface (Components.interfaces
                           .nsIInterfaceRequestor)
          .getInterface (Components.interfaces.nsIWebNavigation)
          .sessionHistory.addSHistoryListener (param);
      }
      catch (e) { Akahuku.debug.exception (e);
        /* フレーム内の可能性あり */
      }
            
      var threadBottomContainer
      = targetDocument.getElementById ("akahuku_bottom_container");
      if (!threadBottomContainer) {
        return;
      }
            
      var div = targetDocument.createElement ("div");
      div.id = "akahuku_reload_container";
      var a, span;
            
      div.appendChild (targetDocument.createTextNode ("["));
            
      a = targetDocument.createElement ("a");
      a.id = "akahuku_reload_button";
      a.appendChild (targetDocument.createTextNode
                     ("\u7D9A\u304D\u3092\u8AAD\u3080"));
      a.addEventListener
      ("click",
       function () {
        arAkahukuReload.onDiffReloadClick (arguments [0]);
      }, false);
      div.appendChild (a);
            
      div.appendChild (targetDocument.createTextNode ("] "));
            
      if (arAkahukuReload.enableSyncButton) {
        div.appendChild (targetDocument.createTextNode ("["));
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_reload_syncbutton";
        a.appendChild (targetDocument.createTextNode ("\u540C\u671F"));
        a.addEventListener
          ("click",
           function () {
            arAkahukuReload.onDiffReloadSyncClick (arguments [0]);
          }, false);
        div.appendChild (a);
                
        div.appendChild (targetDocument.createTextNode ("] "));
      }
      if (info.replyFrom != 1) {
        var textNode;
                
        param.partialNodes = new Array ();
                
        textNode = targetDocument.createTextNode ("[");
        param.partialNodes.push (textNode);
        div.appendChild (textNode);
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_reload_allbutton";
        a.appendChild (targetDocument.createTextNode
                       ("\u3082\u3046"
                        + Akahuku.partialUp
                        + "\u4EF6\u524D\u304B\u3089\u8868\u793A"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuReload.onDiffReloadUpClick (arguments [0]);
        }, false);
        param.partialNodes.push (a);
        div.appendChild (a);
                
        textNode = targetDocument.createTextNode ("] ");
        param.partialNodes.push (textNode);
        div.appendChild (textNode);
                
        textNode = targetDocument.createTextNode ("[");
        param.partialNodes.push (textNode);
        div.appendChild (textNode);
                
        a = targetDocument.createElement ("a");
        a.id = "akahuku_reload_allbutton";
        a.appendChild (targetDocument.createTextNode ("\u5168\u90E8\u8868\u793A"));
        a.addEventListener
        ("click",
         function () {
          arAkahukuReload.onDiffReloadAllClick (arguments [0]);
        }, false);
        param.partialNodes.push (a);
        div.appendChild (a);
                
        textNode = targetDocument.createTextNode ("] ");
        param.partialNodes.push (textNode);
        div.appendChild (textNode);
      }
      if (arAkahukuReload.enableTimeStamp) {
        span = targetDocument.createElement ("span");
        span.id = "akahuku_reload_timestamp";
        div.appendChild (span);
                
        div.appendChild (targetDocument.createTextNode (" "));
      }
            
      span = targetDocument.createElement ("span");
      span.id = "akahuku_reload_status";
      div.appendChild (span);
            
      threadBottomContainer.getElementsByTagName ("td") [1]
      .appendChild (div);
      
      if (arAkahukuReload.enableExtCache
          && info.isFutaba
          && !info.isFutasuke) {
        var location = targetDocument.location.href;
        setTimeout (arAkahukuReload.backupCache,
                    1000,
                    location, param);
      }
    }
  },
    
  listeners : new Array (), /* [続きを読む], [同期] のイベントリスナ */
    
  /**
   * [続きを読む], [同期] のイベントリスナ追加
   */
  addReloadListener : function (listener) {
    for (var i = 0; i < arAkahukuReload.listeners.length; i ++) {
      if (arAkahukuReload.listeners [i] == listener) {
        return;
      }
    }
    arAkahukuReload.listeners.push (listener);
  },
    
  /**
   * [続きを読む], [同期] のイベントリスナ削除
   */
  removeReloadListener : function (listener) {
    for (var i = 0; i < arAkahukuReload.listeners.length; i ++) {
      if (arAkahukuReload.listeners [i] == listener) {
        arAkahukuReload.listeners
        = arAkahukuReload.listeners.splice (i, 1);
        return;
      }
    }
  }
};
