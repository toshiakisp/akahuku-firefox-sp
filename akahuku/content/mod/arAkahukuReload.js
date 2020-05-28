
/**
 * [続きを読む] のキャッシュ書き込み
 *   Inherits From: nsICacheEntryOpenCallback
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

  pending : false,
    
  /**
   * キャッシュの各パートを構築する
   *
   * @param  String text
   *         キャッシュの全体
   * @param  String charset
   *         textの文字コード
   * @return Boolean
   *         構築できたか
   */
  setText : function (text, charset) {
    var start_pos, end_pos;
    start_pos = 0;
    end_pos = 0;
    
    // "<li>現在123人" || "<li>現在???人" (Shift_JIS)
    end_pos = text.search (/<li>(?:|[^<]*\.\s*)\x8C\xBB\x8D\xDD(?:[0-9]+|\?+)\x90\x6C/i,
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
      Akahuku.debug.warn ("arAkahukuReloadCacheWriter.setText missed 'head' and 'viewer'.");
      this.head = "";
      this.viewer = "";
      start_pos = 0;
    }
        
    // /<span\b[^>]* class="cntd"[^>]*>((?:[0-9]+日)?[0-9]+:[0-9]+|[0-9]+年[0-9]+月|[0-9]+月[0-9]+日)頃消えます</span>/
    end_pos = text.search
    (/<span\b[^>]* class="cntd"[^>]*>((?:[0-9]+\x93\xFA)?[0-9]+:[0-9]+|[0-9]+\x94\x4E[0-9]+\x8C\x8E|[0-9]+\x8C\x8E[0-9]+\x93\xFA)\x8D\xA0\x8F\xC1\x82\xA6\x82\xDC\x82\xB7<\/span>/,
     start_pos);
    if (end_pos < 0) {
      // older format
      end_pos = text.search
      (/<small>((?:[0-9]+\x93\xFA)?[0-9]+:[0-9]+|[0-9]+\x94\x4E[0-9]+\x8C\x8E|[0-9]+\x8C\x8E[0-9]+\x93\xFA)\x8D\xA0\x8F\xC1\x82\xA6\x82\xDC\x82\xB7<\/small>/,
       start_pos);
    }
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
    else {
      Akahuku.debug.warn
        ("arAkahukuReloadCacheWriter.setText missed 'head2' and 'expire'.");
      this.head2 = "";
      this.expire = "";
    }
        
    end_pos = text.search
    (/<font color=['"]?#f00000['"]?><b>\x82\xB1\x82\xCC\x83\x58\x83\x8C\x82\xCD[^<]+<\/b><\/font>/,
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
        Akahuku.debug.warn ("arAkahukuReloadCacheWriter.setText failed! (No reply or footer tag)");
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
    else {
      Akahuku.debug.warn ("arAkahukuReloadCacheWriter.setText missed 'foot'.");
      this.body = text.substr (start_pos);
      this.foot = "";
      return true; // 一応全データを割り振りしたことになるので
    }
  },

  setTextMonaca : function (text, charset) {
    var start_pos, end_pos;
    start_pos = 0;
    end_pos = 0;

    var diffMode = /^<span id=time>/.test (text);
    
    // "id=viewer>現在" (EUC-JP)
    var pat = new RegExp (arAkahukuReload._convertFromEUCJP ("id=viewer>(\xB8\xBD\xBA\xDF)?", charset));
    end_pos = text.search (pat, start_pos);
    if (end_pos != -1) {
      end_pos += 10 + (RegExp.$1 || "").length;
      this.head = text.substr (0, end_pos);
            
      start_pos = end_pos;
      if (diffMode) {
        end_pos = text.indexOf ("</span>", start_pos);
      }
      else {
        end_pos = text.indexOf (arAkahukuReload._convertFromEUCJP ("\xBF\xCD", charset), start_pos); // "人" (EUC-JP)
      }
      if (end_pos != -1) {
        this.viewer = text.substr (start_pos, end_pos - start_pos);
      }
            
      start_pos = end_pos;
    }
    else {
      Akahuku.debug.warn ("arAkahukuReloadCacheWriter.setTextMonaca missed 'head' and 'viewer'.");
      this.head = "";
      this.viewer = "";
      start_pos = 0;
    }
        
    end_pos = text.search (/id=expire>/, start_pos);
    if (end_pos != -1) {
      end_pos += 10;
      this.head2 = text.substr (start_pos, end_pos - start_pos);

      start_pos = end_pos;
      end_pos = text.indexOf ("</", start_pos);
      if (end_pos != -1) {
        this.expire = text.substr (start_pos, end_pos - start_pos);
      }

      start_pos = end_pos;
    }
    else {
      Akahuku.debug.warn
        ("arAkahukuReloadCacheWriter.setTextMonaca missed 'head2' and 'expire'.");
      this.head2 = "";
      this.expire = "";
    }
        
    end_pos = text.search (/id=warning class=s6>/, start_pos);
    if (end_pos != -1) {
      end_pos += 20;
      this.head3 = text.substr (start_pos, end_pos - start_pos);
            
      start_pos = end_pos;
      end_pos = text.indexOf ("</", start_pos);
      if (end_pos != -1) {
        this.warning = text.substr (start_pos, end_pos - start_pos);
      }
            
      start_pos = end_pos;
    }
    else {
      /* 警告はまだ出ていない */
      end_pos = text.search (/<table><tr><th>([^<]+)<\/th><td>/, start_pos);
      if (end_pos == -1) {
        /* レスがない */
        end_pos = text.indexOf ("<hr class=c1>", start_pos);
      }
      
      if (end_pos == -1) {
        if (diffMode) {
          this.head3 = text.substr (start_pos);
        }
        else {
          Akahuku.debug.warn ("arAkahukuReloadCacheWriter.setTextMonaca failed! (No reply or footer tag)");
        }
        return false;
      }
            
      this.head3 = text.substr (start_pos, end_pos - start_pos);
      //this.warning = "";
            
      start_pos = end_pos;
    }
        
    end_pos = text.indexOf ("<hr class=c1>", start_pos);
    if (end_pos != -1) {
      this.body = text.substr (start_pos, end_pos - start_pos);
      this.foot = text.substr (end_pos);
            
      return true;
    }
    else {
      if (!diffMode) {
        Akahuku.debug.warn ("arAkahukuReloadCacheWriter.setTextMonaca missed 'foot'.");
      }
      this.body = text.substr (start_pos);
      //this.foot = "";
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
    if (this.pending) {
      Akahuku.debug.warn ("arAkahukuReloadCacheWriter:",
          "Abort createFile() because of pending");
      return;
    }
    try {
      var base
      = AkahukuFileUtil.getURLSpecFromNativeDirPath
      (arAkahukuReload.extCacheFileBase);
      var path = location
      .replace (/^https?:\/\//, "");

      // futaba.php?res=123 形式は res/123.htm と読み替える
      path = path.replace (/\/[^\/]+\.php\?res=(\d+)$/, "/res/$1.htm");
                        
      path
      = AkahukuFileUtil.getNativePathFromURLSpec (base + path);
            
      var text
        = this.head
        + this.viewer
        + this.head2
        + this.expire
        + this.head3
        + this.warning
        + this.body
        + this.foot;

      this.pending = true;
      // TODO: save text in cache (to path?)
      Akahuku.debug.error('NotYetImplemented (save to cachefile)');
      this.pending = false;
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },
    
  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheEntryOpenCallback.onCacheEntryAvailable
   * キャッシュを更新する
   *
   * @param  nsICacheEntry descriptor
   *         キャッシュの情報
   * @param  boolean isNew
   * @param  nsIApplicationCache appCache
   * @param  nsresult status
   */
  onCacheEntryAvailable : function (descriptor, isNew, appCache, status) {
    if (descriptor && Akahuku.Cache.isSuccessCode(status)) {
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
          + "Content-Type: text/html; charset=" + this.charset + "\r\n";
      }
            
      descriptor.setMetaDataElement ("request-method", "GET");
      descriptor.setMetaDataElement ("response-head",
                                     this.responseHead);
      descriptor.setMetaDataElement ("charset", this.charset);
            
      descriptor.close ();
    }
    else if (Akahuku.debug.enabled) {
      var errorStatus = arAkahukuUtil.resultCodeToString (status);
      Akahuku.debug.warn
        ("arAkahukuReloadCacheWriter.onCacheEntryAvailable: "
         + "failed with " + errorStatus);
    }
  },
  onCacheEntryCheck : function (entry, appCache) {
    return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
  },
  mainThreadOnly : true,
};
/**
 * [続きを読む] 管理データ
 *   Inherits From: nsICacheEntryOpenCallback,
 */
function arAkahukuReloadParam () {
}
arAkahukuReloadParam.prototype = {
  nextPosition : 0,            /* Number  差分の開始位置 */
  replying : false,            /* Boolean  返信中フラグ */
  replied : false,             /* Boolean  返信後フラグ */
  targetDocument : null,       /* HTMLDocument  対象のドキュメント */
  lastModified : NaN,          /* Number  ドキュメントの更新日時 */
  lastEtag : '',
  reloadRequestInit : null,
  reloadRequestController : null,
    
  requestMode : 0,             /* Number  リクエスト方法 0:HEAD-GET, 1:GET(Etag), -1:GET(no-more-HEAD) */
  useRange : false,            /* Boolean  この板で差分取得を行うか */
  sync : false,                /* Boolean  同期したか */
    
  responseHead : "",           /* String  応答のヘッダ */
  responseText : "",           /* String  応答のデータ */
  responseCharset : "",        /* String  応答の文字コード */
  responseJson : null,
    
  location : "",               /* リロード中のアドレス */
    
  writer : null,               /* arAkahukuReloadCacheWriter
                                *   キャッシュ書き込み */
    
  partialNodes : null,         /* Array  部分表示の時のボタン用の要素 */
    
  statusTimerID : null,        /* Number ステータスを消すタイマーID */

  replyPattern : null,  // リロード後のレス書式解析パターン (appendNewRepliesで初期化)
  dispdelDisplayStyleValue : "table", // "削除されたレスを*する"を表示するための値
  showMessageInPanel : false, // ステータスパネルでもメッセージ表示するか

  /**
   * データを開放する
   */
  destruct : function () {
    if (this.reloadRequestController) {
      try {
        this.reloadRequestController.abort();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      this.reloadRequestController = null;
      this.reloadRequestInit = null;
      if (arAkahukuReload.enableNolimit) {
        arAkahukuConfig.restoreTime ();
      }
    }
    this.targetDocument.defaultView.clearTimeout (this.statusTimerID);
    this.statusTimerID = null;
    this.targetDocument = null;
  },
    
  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheEntryOpenCallback.onCacheEntryAvailable
   * キャッシュ情報を収集, バックアップを作成する
   *
   * @param  nsICacheEntry descriptor
   *         キャッシュの情報
   * @param  boolean isNew
   * @param  nsIApplicationCache appCache
   * @param  nsresult status
   */
  onCacheEntryAvailable : function (descriptor, isNew, appCache, status) {
    if (descriptor && Akahuku.Cache.isSuccessCode(status)) {
      try {
        var charset = descriptor.getMetaDataElement ("charset") || "Shift_JIS";
      }
      catch (e) {
        throw e;
      }
      var responseHead = "";
      try {
        // バックアップ用には最低限だけ記録
        var headerPattern = /^(HTTP\/|(Date|Content-Type|Last-Modified|Server):)/;
        responseHead = descriptor.getMetaDataElement ("response-head");
        var headers = responseHead.match (/[^\r\n]*\r\n/g);
        responseHead = "";
        for (var i = 0; i < headers.length; i ++) {
          if (headerPattern.test (headers [i])) {
            responseHead += headers [i];
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      var istream = descriptor.openInputStream (0);
      var self = this;
      arAkahukuUtil.asyncFetchBinary (istream, descriptor.dataSize, function (binstream, result) {
        if (!arAkahukuUtil.isSuccessCode (result)) {
          if (Akahuku.debug.enabled) {
            Akahuku.debug.warn ("arAkahukuReloadParam.onCacheEntryAvailable" +
              arAkahukuUtil.resultCodeToString (result) + " for " + descriptor.key);
          }
          return;
        }
        var bindata = binstream.readBytes (binstream.available ());
        binstream.close ();
        descriptor.close ();

        var cont = function (self, bindata) {
          try {
            if (self.writer == null) {
              self.writer = new arAkahukuReloadCacheWriter ();
            }
                
            if (!self.writer.setText (bindata, charset)) {
              return;
            }
            self.writer.charset = charset;
            self.writer.responseHead = responseHead
                
            if (arAkahukuReload.enableExtCache) {
              /* 現在のキャッシュをバックアップ */
              if (arAkahukuReload.enableExtCacheFile) {
                self.writer.createFile (self.location);
              }
              else {
                Akahuku.Cache.asyncOpenCacheToWrite
                  ({url: self.location + ".backup",
                    triggeringNode: self.targetDocument},
                   self.writer);
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
             })(self, cont));
        }
        else {
          cont (self, bindata);
        }
      });
    }
    else if (Akahuku.debug.enabled) {
      var errorStatus = arAkahukuUtil.resultCodeToString (status);
      Akahuku.debug.warn
        ("arAkahukuReloadParam.onCacheEntryAvailable: "
         + "failed with " + errorStatus);
    }
  },
  onCacheEntryCheck : function (entry, appCache) {
    try {
      entry.dataSize;
    }
    catch (e) {
      if (e.result == 0x804b000f) { // NS_ERROR_IN_PROGRESS
        return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
      }
      throw e;
    }
    return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
  },
  mainThreadOnly : true,
    
  onHttpResponse : function (httpStatus, statusText='') {
    var param = Akahuku.getDocumentParam (this.targetDocument);
    if (param == null) {
      return;
    }
    var info = param.location_info;
        
    if (!this.reloadRequestInit) {
      return;
    }
        
    ; /* switch のインデント用 */
    switch (httpStatus) {
      case 200:
      case 206:
        arAkahukuReload.setStatus
          ("\u66F4\u65B0\u4E2D", //"更新中"
           false, this.targetDocument);
        
        if (this.responseText.search (/<html/i) != -1) {
          if (this.responseText.search (/<blockquote/i) == -1
              && this.responseText.search (/<div class=\"t\"/i) == -1) {
            // ">操作が早すぎ"(以下略) (Shift_JIS) の場合
            if (/>\x91\x80\x8d\xec\x82\xaa\x91\x81\x82\xb7\x82\xac/
                .test (this.responseText)) {
              arAkahukuReload.setStatus
                ("\u64CD\u4F5C\u304C\u65E9\u3059\u304E\u307E\u3059", // "操作が早すぎます"
                 false, this.targetDocument);
              break;
            }
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
              expireBox2.style.removeProperty ("display");
            }
            arAkahukuReload.setStatus
              (arAkahukuReload.getNotFoundText (),
               true, this.targetDocument);
                        
            if (arAkahukuSidebar.enable) {
              try {
                var name;
                name = info.server + "_" + info.dir;
                                
                var browser = arAkahukuWindow
                  .getBrowserForWindow (this.targetDocument.defaultView);
                if (arAkahukuSidebar.hasBoard (name, browser)) {
                  var ok = true;
                  if (!arAkahukuSidebar.enableBackground) {
                    ok = arAkahukuSidebar.hasTabForBoard (name, browser);
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
            ("\u6E80\u54E1\u3067\u3059", //"満員です"
             true, this.targetDocument);
          break;
                        
        }
        
        this.targetDocument.defaultView
          .setTimeout (function (targetDocument, replied) {
            arAkahukuReload.update (targetDocument, replied);
          }, 10, this.targetDocument, this.replied);
        return;
      case 304:
        /* ファイルが更新されていない場合 */
        /* 区切りの削除 */
        var newReplyHeader
          = this.targetDocument
          .getElementById ("akahuku_new_reply_header");
        if (newReplyHeader) {
          newReplyHeader.parentNode
            .removeChild (newReplyHeader);
        }
        arAkahukuReload.setStatus
          ("\u65B0\u7740\u306A\u3057", //"新着なし"
           false, this.targetDocument);
        // 残りレス数の更新
        arAkahukuReload.updateExpireDiffNum (this.targetDocument);
        // 更新時間の更新
        if (arAkahukuReload.enableTimeStamp) {
          arAkahukuReload.setTimeStamp (this.targetDocument);
        }
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
          expireBox2.style.removeProperty ("display");
        }
        arAkahukuReload.setStatus
          (arAkahukuReload.getNotFoundText (),
           true, this.targetDocument);
        if (arAkahukuSidebar.enable) {
          try {
            var name;
            name = info.server + "_" + info.dir;
            var browser = arAkahukuWindow
              .getBrowserForWindow (this.targetDocument.defaultView);
                                
            if (arAkahukuSidebar.hasBoard (name, browser)) {
              var ok = true;
              if (!arAkahukuSidebar.enableBackground) {
                ok = arAkahukuSidebar.hasTabForBoard (name, browser);
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
        // スレ消滅情報を通知
        info.isNotFound = true;
        info.notifyUpdate ("thread-updated");
        if (arAkahukuReload.enableExtCacheImages) {
          // 消滅後は全画像をキャッシュにして保護する
          Akahuku.Cache.enCacheURIForImages (this.targetDocument);
        }
        break;
      default:
        arAkahukuReload.setStatus
          ('load error: ' + statusText + ' (' + httpStatus + ')',
           false,
           this.targetDocument);
    }
    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
    this.reloadRequestInit = null;
    this.reloadRequestController = null;
        
    this.responseText = "";
    this.responseCharset = "";
    
    /* HTML が正しく取得できなかった場合の音 */
    if (!this.replied) {
      arAkahukuSound.playReplyReload ();
    }
    else {
      arAkahukuSound.playReply ();
    }
  },

  onHttpResponseJson : function (httpStatus, statusText='') {
    let param = Akahuku.getDocumentParam (this.targetDocument);
    if (param == null) {
      Akahuku.debug.warning ('no param');
      return;
    }
    let info = param.location_info;
    if (!this.reloadRequestInit) {
      Akahuku.debug.warning ('reloadRequestInit is false');
      return;
    }
    if (!this.responseJson) {
      Akahuku.debug.warning ('no json response');
      return;
    }

    //"更新中"
    arAkahukuReload.setStatus ("\u66F4\u65B0\u4E2D",
      false, this.targetDocument);

    if (!this.responseJson.res) {
      // 区切りの削除
      let newReplyHeader
        = this.targetDocument
        .getElementById ("akahuku_new_reply_header");
      if (newReplyHeader) {
        newReplyHeader.parentNode.removeChild (newReplyHeader);
      }
      arAkahukuReload.setStatus
        ("\u65B0\u7740\u306A\u3057", //"新着なし"
         false, this.targetDocument);
      arAkahukuReload.updateExpireDiffNum (this.targetDocument);
      if (arAkahukuReload.enableTimeStamp) {
        arAkahukuReload.setTimeStamp (this.targetDocument);
      }
    }
    else {
      this.targetDocument.defaultView
        .setTimeout (function (targetDocument, replied) {
          arAkahukuReload.updateJson (targetDocument, replied);
        }, 10, this.targetDocument, this.replied);
      return;
    }

    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
    this.reloadRequestInit = null;
    this.reloadRequestController = null;
    this.responseText = "";
    this.responseCharset = "";
    this.responseJson = null;

    // HTML が正しく取得できなかった場合の音
    if (!this.replied) {
      arAkahukuSound.playReplyReload ();
    }
    else {
      arAkahukuSound.playReply ();
    }
  },

  /**
   * リロードのリクエストを送る
   */
  asyncReload: function (method) {
    this.reloadRequestController = new AbortController();
    this.reloadRequestInit = {
      method: method,
      mode: 'same-origin',
      credentials: 'include',
      cache: 'no-cache', // 常に更新問い合わせさせる (If-Modified-Sence 等を使って)
      signal: this.reloadRequestController.signal,
    };

    if (this.sync || this.useRange) {
      // [同期]では If-Modified-Since などを効かせずに取得しなおす
      this.reloadRequestInit.cache = 'reload';
    }

    class ConnectionError extends Error {
      constructor (message) {
        super(message)
        this.name = 'ConnectionError';
      }
    }
    class NotModified extends Error {
      constructor (message) {
        super(message)
        this.name = 'NotModified';
      }
    }
    class HttpStatusError extends Error {
      constructor (response) {
        super(response.statusText);
        this.name = 'HttpStatusError';
        this.status = response.status;
      }
    }

    //'ロード中 (ヘッダ)'
    arAkahukuReload.setStatus('\u30ED\u30FC\u30C9\u4E2D (\u30D8\u30C3\u30C0)',
      true, this.targetDocument);

    let isJson = false;
    let promise = fetch(this.location, this.reloadRequestInit)
      .then((resp) => {
        if (this.reloadRequestInit.method == 'GET') {
          return resp;
        }
        // HEAD response
        if (!resp.ok) {
          throw new HttpStatusError(resp);
        }
        let resLastMod = Date.parse(resp.headers.get('Last-Modified'));
        let etag = resp.headers.get('Etag');
        if (!resLastMod && !etag) {
          // このページではもう HEAD リクエストをしない
          this.requestMode = -1; //GET(no-more-HEAD)
          Akahuku.debug.log
            ("arAkahukuReloadParam: no more HEAD requests for " + this.location);
        }
        // 以降HEADリクエストを省略できるか判定
        if (this.requestMode == 0 && etag){ //HEAD-GET
          this.requestMode = 1; //GET(Etag)
        }
        if (this.lastEtag == etag
          || this.lastModified == resLastMod) {
          // Maybe 304
          throw new NotModified();
        }
        else if (this.requestMode == 2) { //HEAD-GET(json)
          //"ロード中 (差分)"
          arAkahukuReload.setStatus("\u30ED\u30FC\u30C9\u4E2D (\u5DEE\u5206)",
            true, this.targetDocument);
          this.lastModified = resLastMod;
          this.lastEtag = etag;
          this.reloadRequestInit.method = 'GET';
          let lastReply = arAkahukuThread.getLastReply (this.targetDocument);
          let info = Akahuku.getDocumentParam (this.targetDocument).location_info;
          let jsonloc = this.location.replace (/\/([^\/]+)\/res\/.*/,
            "/$1/futaba.php?mode=json")
            + "&res=" + info.threadNumber
            + "&start=" + (lastReply.num+1);
          isJson = true;
          let p = fetch(jsonloc, this.reloadRequestInit)
            .then((resp) => {
              if (resp.ok) {
                return resp;
              }
              // fallback to html
              Akahuku.debug.warn ("arAkahukuReloadParam: no more JSON requests for " + this.location);
              this.requestMode = 0;
              isJson = false;
              return fetch(this.location, this.reloadRequestInit);
            })
            .catch((e) => {
              throw new ConnectionError(e.message);
            });
          return p;
        }
        else {
          this.reloadRequestInit.method = 'GET';
          return fetch(this.location, this.reloadRequestInit)
            .then((resp) => resp)
            .catch((e) => {
              throw new ConnectionError(e.message);
            });
        }
      })
      .then((resp) => {
        // GET response
        if (!resp.ok) {
          throw new HttpStatusError(resp);
        }

        const CRLF = '\r\n';
        let headText = 'HTTP/';
        if (resp.statusText)
          headText += '1.1 ' + resp.status + ' ' + resp.statusText + CRLF;
        else
          headText += '2.0 ' + resp.status + CRLF;
        for (let h of resp.headers) {
          let hn = h[0].trim()
            .replace(/(^|(?:-))[a-z]/g, (match) => match.toUpperCase())
          headText += hn + ': ' + h[1] + CRLF;
        }
        this.responseHead = headText;

        if (resp.url == this.location) {
          let resLastMod = Date.parse(resp.headers.get('Last-Modified'));
          let etag = resp.headers.get('Etag');
          if (this.lastEtag == etag
            || (resLastMod && this.lastModified == resLastMod)) {
            // Raw response may be 304 Not Modified
            throw new NotModified();
          }
          this.lastModified = resLastMod;
          this.lastEtag = etag;
        }
        let re
          = (resp.headers.get('Content-Type') || '')
          .match(/^[^;]*;\s*charset=([\-A-Za-z0-9_]+)/m);
        this.responseCharset = re ? re [1] : '';

        // レスポンスヘッダー次第で以降HEADリクエストを省略するか決める
        if (this.requestMode == 0//HEAD-GET
            && this.lastEtag) {
          this.requestMode = 1;//GET(Etag)
        }

        //"ロード中 (ボディ)"
        arAkahukuReload.setStatus('\u30ED\u30FC\u30C9\u4E2D (\u30DC\u30C7\u30A3)',
          true, this.targetDocument);

        return resp.arrayBuffer();
      })
      .then((buffer) =>
        arAkahukuConverter.asyncConvertArrayBufToBinStr(buffer))
      .then((binstr) => {
        if (isJson) {
          binstr = arAkahukuConverter.convert (binstr, this.responseCharset);
          try {
            this.responseJson = window.JSON.parse(binstr);
          }
          catch (e) { Akahuku.debug.exception (e);
            // fallback to html request for next fetch
            this.requestMode = 0;//HEAD-GET
            this.lastEtag = '';
            this.lastModified = NaN;
            Akahuku.debug.warn ("Invalid JSON response:", binstr);
            throw new Error ("Invalid JSON response");
          }
          this.onHttpResponseJson(200);
        }
        else {
          this.responseText = binstr;
          this.onHttpResponse(200);
        }
      })
      .catch((err) => {
        if (err instanceof NotModified) {
          this.onHttpResponse(304);
        }
        else if (err instanceof HttpStatusError) {
          this.onHttpResponse(err.status, err.message);
        }
        else if (err instanceof ConnectionError) {
          //"接続できませんでした"
          arAkahukuReload.setStatus('\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F',
            true, this.targetDocument);
        }
        else if (err instanceof DOMException && err.name == 'AbortError') {
          // Aborted
        }
        else {
          arAkahukuReload.setStatus('load error: ' + err,
            false, this.targetDocument);
          throw err;
        }
      })
      .finally(() => {
        this.reloadRequestInit = null;
        this.reloadRequestController = null;
      });
  },
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
  enableSyncMessageID : false,           /* Boolean  IDも同期する */
  enableRule : false,                    /* Boolean  区切り */
  enableRuleZeroHeight : false,          /* Boolean  ズレないようにする */
  enableRuleRandom : false,              /* Boolean  ランダム */
  enableReply : false,                   /* Boolean  レス送信と連携 */
  enableReplyScroll : false,             /* Boolean  最新位置にスクロール */
  enableHook : false,                    /* Boolean  リロードの代わりに
                                          *   続きを読む */
  enableHookSync : false,                /* Boolean  同期する */
  enableOnDemand : false,                /* Boolean  必要に応じて自動的に続きを読む */
  enableOnDemandSync : false,            /* Boolean    同期する */
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
  enableExtCacheImages : false,          /* Boolean  消えそうな画像のキャッシュを保護する */
    
  expireLength : 80, /* Number このスレは〜 のタグ付きの長さ */
  adMargin : 80,     /* Number  テキスト広告の変化による差分位置のマージン
                      *   (実際の測定結果は 40 程度) */
  imageMargin : 400, /* Number  スレ消滅情報が出た時にスレ画像が消える板で
                      *       該当部分のソース消滅による差分位置のマージン
                      *   (実際の測定結果は 300 程度) */
  enableJson : true,
    
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
        .addRule (".akahuku_deleted_reply2",
                  "border: 2px dotted red !important;")
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
        arAkahukuReload.enableSyncMessageID
          = arAkahukuConfig
          .initPref ("bool", "akahuku.reload.range.syncbutton.id", true);
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
      arAkahukuReload.enableOnDemand
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.ondemand", false);
      arAkahukuReload.enableOnDemandSync
        = arAkahukuReload.enableOnDemand &&
        arAkahukuConfig
        .initPref ("bool", "akahuku.reload.ondemand.sync", false);
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
      arAkahukuReload.enableExtCacheImages
        = arAkahukuConfig
        .initPref ("bool", "akahuku.reload.extcache.images", false);
    }
    arAkahukuReload.enableJson
      = arAkahukuConfig
      .initPref ("bool", "akahuku.reload.use_futaba_json", true);
  },
    
  /**
   * 見ている人数を更新する
   *
   * @param  String responseText
   *         取得した差分
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String optCharset
   *         応答の文字コード
   */
  updateViewersNumber : function (responseText, targetDocument, optCharset) {
    var responseCharset = optCharset || targetDocument.characterSet || "Shift_JIS";
        
    var viewersNumber = "";
    if (responseText.match
        (new RegExp (arAkahukuReload._convertFromSJIS ("<li>(?:|[^<]*\\.\\s*)\x8c\xbb\x8d\xdd([0-9]+|\\?+)\x90\x6c"),"i"))) {
      /* <li>現在(xx)人 (Shift_JIS) */
      viewersNumber = RegExp.$1;
    }
    arAkahukuReload.updateViewersNumberCore (targetDocument, viewersNumber);
  },

  updateViewersNumberJson : function (responseJson, targetDocument) {
    // 現状mode=jsonの応答から取得できない
    arAkahukuReload.updateViewersNumberCore (targetDocument, "");
  },

  updateViewersNumberCore : function (targetDocument, viewersNumber) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    if (viewersNumber) {
      info.viewer = viewersNumber;
    }
    else if (parseInt(info.viewer) >= 0) {
      viewersNumber = info.viewer + "?";
    }
            
    if (viewersNumber) {
      var node
      = targetDocument
      .getElementById ("akahuku_postform_opener_appendix");
      if (node) {
        var startNode = node;
        node = node.firstChild;
        while (node) {
          if (node.nodeName.toLowerCase () == "#text") {
            if (node.nodeValue.match
                (/\u73FE\u5728(?:[0-9]+|\?+)\u4EBA/)) {
              node.nodeValue
                = node.nodeValue
                .replace (/\u73FE\u5728(?:[0-9]+|\?+)\u4EBA/,
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
        // (現在(?:[0-9]+|?+)人)
        if (nodes [i].innerHTML
            .match (/^(<small>|.*\.\s*)?(\u73FE\u5728(?:[0-9]+|\?+)\u4EBA)/)) {
          var startNode = nodes [i];
          node = nodes [i].firstChild;
          while (node) {
            if (node.nodeName.toLowerCase () == "#text") {
              if (node.nodeValue.match
                  (/\u73FE\u5728(?:[0-9]+|\?+)\u4EBA/)) {
                node.nodeValue
                  = node.nodeValue
                  .replace (/\u73FE\u5728(?:[0-9]+|\?+)\u4EBA/,
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
    else {
      Akahuku.debug.warn ("updateViewersNumber(): pattern not found");
    }
  },
    
  /**
   * スレの消滅時刻を更新する
   *
   * @param  String responseText
   *         取得した差分
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String optCharset
   *         応答の文字コード
   */
  updateExpireTime : function (responseText, targetDocument, optCharset) {
    var responseCharset = optCharset || targetDocument.characterSet || "Shift_JIS";
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var expireTime = "";
    if (responseText.match
        (/<span\b[^>]* class="cntd"[^>]*>((?:[0-9]+\x93\xFA)?[0-9]+:[0-9]+|[0-9]+\x94\x4E[0-9]+\x8C\x8E|[0-9]+\x8C\x8E[0-9]+\x93\xFA)\x8D\xA0\x8F\xC1\x82\xA6\x82\xDC\x82\xB7<\/span>/)) {
      /* /<span class="cntd">((?:[0-9]+日)?[0-9]+:[0-9]+|[0-9]+年[0-9]+月|[0-9]+月[0-9]+日)頃消えます</span>/ (Shift_JIS) */
      expireTime = RegExp.$1;
    }
    else if (responseText.match
        (/<small>((?:[0-9]+\x93\xFA)?[0-9]+:[0-9]+|[0-9]+\x94\x4E[0-9]+\x8C\x8E|[0-9]+\x8C\x8E[0-9]+\x93\xFA)\x8D\xA0\x8F\xC1\x82\xA6\x82\xDC\x82\xB7<\/small>/)) {
      /* /<small>((?:[0-9]+日)?[0-9]+:[0-9]+|[0-9]+年[0-9]+月|[0-9]+月[0-9]+日)頃消えます</small>/ (Shift_JIS) */
      expireTime = RegExp.$1;
    }
    /* 避難所 patch */
    if (info.isMonaca) {
      var pat = new RegExp (arAkahukuReload._convertFromEUCJP ("id=expire>(([0-9]+\xc7\xaf)?([0-9]+\xb7\xee)?([0-9]+\xc6\xfc)?[0-9]+:[0-9]+)\xba\xa2\xbe\xc3\xa4\xa8\xa4\xde\xa4\xb9<\\/span>", responseCharset));
      /* id=expire>((xx日)?xx:xx)頃消えます</span> (EUC-JP) */
      if (responseText.match (pat)) {
        expireTime = RegExp.$1;
      }
    }
        
    if (expireTime) {
      expireTime = arAkahukuConverter.convert (expireTime, responseCharset);
    }
    arAkahukuReload.updateExpireTimeCore (targetDocument, expireTime);
  },

  updateExpireTimeJson : function (responseJson, targetDocument) {
    arAkahukuReload.updateExpireTimeCore (targetDocument, responseJson.die);
  },

  updateExpireTimeCore : function (targetDocument, expireTime) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    if (expireTime) {
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
    else {
      Akahuku.debug.warn ("No expire time found in", targetDocument.location.href);
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
    var node, node_throp;
        
    var expireBox
    = targetDocument
    .getElementById ("akahuku_throp_expire_box");
    if (expireBox) {
      expireBox.style.removeProperty ("display");
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
    node_throp
    = targetDocument.getElementById
    ("akahuku_throp_expire_diff");
    if (node || node_throp) {
      var expireDiff;
      expireDiff
        = arAkahukuThread.getExpireDiff (targetDocument,
                                         info.expire);
    }
    if (node) {
      arAkahukuDOM.setText (node, expireDiff);
    }
    if (node_throp) {
      node = node_throp;
      arAkahukuDOM.setText (node, expireDiff);
    }
    
    var lastReply = arAkahukuThread.getLastReply (targetDocument);
    // ステータス表示有無に関わらず最新レス番号更新
    arAkahukuBoard.updateNewestNum (info, lastReply.num);
    node
    = targetDocument.getElementById
    ("akahuku_bottom_status_expire_num");
    node_throp
    = targetDocument.getElementById
    ("akahuku_throp_expire_num");
    if (node || node_throp) {
      var expireNum
        = arAkahukuThread.getExpireNum (targetDocument, info,
                                        info.threadNumber,
                                        lastReply.num);
      var expireMax
        = arAkahukuThread.getExpireNum (targetDocument, info,
                                        0, 0);
      var node2
        = targetDocument.getElementById ("akahuku_thread_warning");
    }
    if (node) {
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
    }
                
    if (node_throp) {
      node = node_throp;
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
      arAkahukuReload.showDeletedMessage (targetDocument);
    }
  },

  updateDeletedMessageJson : function (responseJson, targetDocument) {
    if (responseJson.res) {
      for (let [num, dat] of Object.entries(responseJson.res)) {
        if (dat.del) {
          arAkahukuReload.showDeletedMessage (targetDocument);
          return;
        }
      }
    }
  },

  showDeletedMessage : function (targetDocument) {
    var ddel = targetDocument.getElementById ("ddel");
    if (!ddel) {
      ddel = targetDocument.createElement ("span");
      ddel.id = "ddel";
      ddel.style.display = "inline";
      
      // 「削除されたレスを残す」設定なら「隠す」表示にする
      var dispdel = targetDocument.defaultView.wrappedJSObject.dispdel;
      if (dispdel != 1 && arAkahukuReload.enableSyncButtonNoDelete) {
        targetDocument.defaultView.wrappedJSObject.dispdel = 1;
        dispdel = 1;
      }
      ddel.innerHTML 
      = "\u524A\u9664\u3055\u308C\u305F\u8A18\u4E8B\u304C<span id=ddnum>0</span>\u4EF6\u3042\u308A\u307E\u3059.<span id=ddbut onclick=\"onddbut()\">"
      + (dispdel ? "\u96A0\u3059" : "\u898B\u308B") + "</span><br>";
      var bq
        = targetDocument.getElementById ("akahuku_thread_text");
      if (bq.nextSibling
          && "id" in bq.nextSibling
          && bq.nextSibling.id == "akahuku_preview_container") {
        // 直後にプレビューコンテナがある場合
        // 後ろへ挿入位置をずらさないとプレビューを消せなくなる
        bq = bq.nextSibling;
      }
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
   * @param  String optCharset
   *         応答の文字コード
   */
  updateExpireWarning : function (responseText, targetDocument, optCharset) {
    var responseCharset = optCharset || targetDocument.characterSet || "Shift_JIS";
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    
    var expireWarning = "";
    if (responseText.match
        (/<font color=['"]?#f00000['"]?><b>(\x82\xb1\x82\xcc\x83\x58\x83\x8c\x82\xcd[^<]+)<\/b><\/font>/)) {
      /* <font color="?#f00000"?><b>(このスレは〜)</b></font>
         (Shift_JIS) */
      expireWarning = RegExp.$1;
    }
    /* 避難所 patch */
    if (info.isMonaca) {
      /* id=warning class=s6>(このスレは〜)</span> (EUC-JP) */
      var pat = new RegExp (arAkahukuReload._convertFromEUCJP ("id=warning class=s6>(\xa4\xb3\xa4\xce\xa5\xb9\xa5\xec\xa4\xcf[^<]+)<\\/span>", responseCharset));
      if (responseText.match (pat)) {
        expireWarning = RegExp.$1;
      }
    }
    
    if (expireWarning) {
      expireWarning
      = arAkahukuConverter.convert (expireWarning, responseCharset);
    }

    var delWarning = "";
    if (responseText.match
        (/<font color=['"]?#f00000['"]?>(\x82\xb1\x82\xcc\x83\x58\x83\x8c\x82\xc9\x91\xce\x82\xb7\x82\xe9\x8d\xed\x8f\x9c\x88\xcb\x97\x8a.+)<\/font>/)) {
      /* <font color="?#f00000"?>(このスレに対する削除依頼.+)</font>
         (Shift_JIS) */
      delWarning = RegExp.$1;
      delWarning = arAkahukuConverter.convertFromSJIS (delWarning, "");
    }

    arAkahukuReload.updateExpireWarningCore (targetDocument, expireWarning, delWarning);
  },

  updateExpireWarningJson : function (responseJson, targetDocument) {
    var expireWarning = "";
    var delWarning = "";
    if (responseJson.old > 0) {
      // "このスレは古いので、もうすぐ消えます。"
      expireWarning = "\u3053\u306E\u30B9\u30EC\u306F\u53E4\u3044\u306E\u3067\u3001\u3082\u3046\u3059\u3050\u6D88\u3048\u307E\u3059\u3002";
    }
    arAkahukuReload.updateExpireWarningCore (targetDocument, expireWarning, delWarning);
  },

  updateExpireWarningCore : function (targetDocument, expireWarning, delWarning) {
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;

    if (expireWarning) {
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
    
    if (delWarning) {
      info.isDel = arAkahukuConverter.convertToSJIS (delWarning, "");
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

    var param = Akahuku.getDocumentParam (targetDocument).reload_param;

    if (param.showMessageInPanel) {
      // ステータス表示要素が画面内に無い状態から開始されていたら
      // ステータスパネルでも状況を表示する
      var statusText = (param.sync
          ? "[\u540C\u671F] " // "[同期] "
          : "[\u7D9A\u304D\u3092\u8AAD\u3080] " // "[続きを読む] "
          ) + message;
      var browser = arAkahukuWindow
        .getBrowserForWindow (targetDocument.defaultView);
      arAkahukuUI.setStatusPanelText (statusText, "overLink", browser);
      // permanent フラグとは関係無く全てのメッセージを時間でクリア
      targetDocument.defaultView
      .setTimeout (function () {
        arAkahukuUI.clearStatusPanelText (statusText, browser);
      }, 5000);
    }
        
    if (!permanent && !arAkahukuReload.enableStatusHold) {
      targetDocument.defaultView.clearTimeout (param.statusTimerID);
      param.statusTimerID
      = targetDocument.defaultView.setTimeout
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

    var _asyncLoadCacheAndUpdate = function (istream, dataSize, url, callback) {
      arAkahukuUtil.asyncFetchBinary (istream, dataSize, function (binstream, result) {
        if (arAkahukuUtil.isSuccessCode (result)) {
          param.responseText = binstream.readBytes (binstream.available ());
          binstream.close ();
          _updateCache ();
        }
        else {
          if (Akahuku.debug.enabled) {
            Akahuku.debug.warn ("_asyncLoadCacheAndUpdate resulted in " +
              arAkahukuUtil.resultCodeToString (result) + " for " + url);
          }
        }
        if (callback) {
          callback (result);
        }
      });
    };
    var _updateCache = function () {
      if (arAkahukuReload.enableNolimit) {
        arAkahukuConfig.setTime (arAkahukuReload.limitTime);
      }

      param.reloadRequestInit = null;
      param.reloadRequestController = null;
      param.sync = true;
      param.replied = false;
      param.useRange = false;
      param.location = null; // キャッシュから読んだので更新させない

      if (param.responseText.match (/^\x1f\x8b\x08/)) {
        // gzip 圧縮されている場合
        arAkahukuFile.gunzip
          (param.responseText, function (data) {
            param.responseText = data;
            targetDocument.defaultView
              .setTimeout (function () {
                arAkahukuReload.update (targetDocument);
              }, 10);
          });
      }
      else {
        targetDocument.defaultView
          .setTimeout (function () {
            arAkahukuReload.update (targetDocument);
          }, 10);
      }
    };

    var location = targetDocument.location.href;

    if (arAkahukuReload.enableExtCache) {
      param.responseText = "";
            
      if (arAkahukuReload.enableExtCacheFile) {
        var base
          = AkahukuFileUtil.getURLSpecFromNativeDirPath
          (arAkahukuReload.extCacheFileBase);
        var path = location
          .replace (/^https?:\/\//, "");

        // futaba.php?res=123 形式は res/123.htm と読み替える
        path = path.replace (/\/[^\/]+\.php\?res=(\d+)$/, "/res/$1.htm");
                
        path
          = AkahukuFileUtil.getNativePathFromURLSpec
          (base + path);
                
        var targetFile = arAkahukuFile.initFile (path);
        if (targetFile && targetFile.exists ()) {
          var fstream = arAkahukuFile.createFileInputStream
            (targetFile, 0x01, 292/*0o444*/, 0,
             targetDocument.defaultView);
          _asyncLoadCacheAndUpdate (fstream, targetFile.fileSize, path);
          location = null; // キャッシュ読み不要
        }
      }
      else {
        // バックアップキャッシュを優先
        location += ".backup";
      }
    }

    if (location) {
      var finder = new Akahuku.Cache.RedirectedCacheFinder ();
      finder.init (targetDocument.defaultView);
      finder.asyncOpen (location, function (descriptor) {
        try {
          if (descriptor) {
            var istream = descriptor.openInputStream (0);
            _asyncLoadCacheAndUpdate (istream, descriptor.dataSize, location, function () {
              descriptor.close ();
            });
          }
          else {
            // キャッシュが存在しなかった場合
            arAkahukuReload.diffReloadCore (targetDocument, true, false);
          }
        }
        catch (e) { Akahuku.debug.exception (e);
        }
      });
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
   * @param  Boolean isNotTable
   *         tableによる構造ではないかどうか
   * @param  String optCharset
   *         応答の文字コード
   * @return Object
   *         レスのコンテナ
   */
  createContainer : function (responseText, targetDocument, isNotTable, optCharset) {
    var responseCharset = optCharset || targetDocument.characterSet || "Shift_JIS";
    var container = {};
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param = documentParam.reload_param;
    
    if (!isNotTable) {
      var table = targetDocument.createElement ("table");
      var tbody = targetDocument.createElement ("tbody");
      var tr = targetDocument.createElement ("tr");
    
      try {
        for (var attrName in param.replyPattern.containerNodeAttrs) {
          table [attrName] = param.replyPattern.containerAttrs [attrName];
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }

      table.appendChild (tbody);
      tbody.appendChild (tr);
        
      var info = documentParam.location_info;

      var prefixNode = targetDocument.createElement ("td");
      var mainNode = targetDocument.createElement ("td");

      if (responseText.match (/<table[^>]*><tr><td[^>]*>([^<]+)<\/td><td[^>]*>/)) {
        info.replyPrefix
          = arAkahukuConverter.convert (RegExp.$1, responseCharset);
      }
      /* 避難所 patch */
      else if (responseText
               .match (/<table><tr><th>([^<]+)<\/th><td>/)) {
        info.replyPrefix
          = arAkahukuConverter.convert (RegExp.$1, responseCharset);

        prefixNode = targetDocument.createElement ("th");
      }
            
      /* レスの前の文字を反映する */
      var head = targetDocument
        .getElementById ("akahuku_bottom_container_head");
      if (head && info.replyPrefix) {
        var tmp = arAkahukuConverter.unescapeEntity (info.replyPrefix);
        arAkahukuDOM.setText (head, tmp);
      }

      /* HTML のソースから構築するので innerHTML を使用する  */
      prefixNode.innerHTML = info.replyPrefix;
      try {
        for (var attrName in param.replyPattern.prefixNodeAttrs) {
          prefixNode [attrName] = param.replyPattern.prefixNodeAttrs [attrName];
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      tr.appendChild (prefixNode);
            
      try {
        for (var attrName in param.replyPattern.mainNodeAttrs) {
          mainNode [attrName] = param.replyPattern.mainNodeAttrs [attrName];
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      tr.appendChild (mainNode);
      
      container.main = mainNode;
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
    // Check new layout 2019/11/29- (native res numbering)
    var rsc = Akahuku.getMessageReplyNumber (element, true);
    if (rsc) { // already numbered
      return;
    }
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
   * @param  String optCharset
   *         応答の文字コード
   * @return Array
   *         [Number 新規のレス,
   *          Number 取得していなかったレス, Number 削除されたレス,
   *          Array 追加したレスの BLOCKQUOTE のリスト,
   *          Array 途中に追加したレスの BLOCKQUOTE のリスト]
   */
  appendNewReplies : function (responseText, terminator, sync,
                               targetDocument, retNode, optCharset) {
    var responseCharset = optCharset || targetDocument.characterSet || "Shift_JIS";
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param = documentParam.reload_param;
    var info = documentParam.location_info;
        
    var lastReply = arAkahukuThread.getLastReply (targetDocument);
    
    if (!param.replyPattern) {
      // 解析パターンの初期化
      param.replyPattern = {
        threadStart : "<form ", // スレ全体のコンテナの開始
        startTag : "<td bgcolor=", // レスのコンテナの開始文字列
        endTag : "</td>", // レスのコンテナの終端文字列(1)
        endTag2 : null, // 終端文字列(1)の後にある真の終端文字列
        tagStop : ">", // レスコンテナのタグの終端文字列
        checkBGColor : true, // コンテナの bgcolor の値まで判定するかどうか
        // スレ文&レス固有の要素を特定する属性のパターン
        startPatternForNum : "<input\\s[^>]*name=[\"']?([0-9]+:)?",
        containerIsTable : true, // レスのコンテナの親が TABLE かどうか

        prefixNodeAttrs : {
          nowrap : "nowrap",
          align : "right",
          valign : "top"
        },
        mainNodeAttrs : {
          bgColor : "#F0E0D6",
        },
        containerNodeAttr : {
          border: "0",
        },
      };
    }
    /* 避難所 patch */
    if (info.isMonaca) {
      param.replyPattern.checkBGColor = false;
      param.replyPattern.startTag  = arAkahukuReload._convertFromEUCJP ("<th>\xa1\xc4</th><td", responseCharset);
      /* <th>…</th><td (EUC-JP) */
      param.replyPattern.tagStop = "<td>";
      param.replyPattern.startPatternForNum = "<input\\s[^>]*name=\"edit\\[\\]\" value=[\"']?([0-9]+:)?",
      param.replyPattern.prefixNodeAttrs = {};
      param.replyPattern.mainNodeAttrs = {};
      param.replyPattern.containerNodeAttrs = {};
    }

    var maxByteForTestSearch = 16*1024; // テスト検索の上限範囲

    // 書式違いでレスが見つからない場合の対応
    if (!info.isMonaca &&
        responseText.lastIndexOf (param.replyPattern.startTag, maxByteForTestSearch) == -1) {
      
      if (responseText.lastIndexOf ("<td class=rtd>", maxByteForTestSearch) != -1) {
        // 2016/05/31?～ レイアウト変更
        param.replyPattern.startTag = "<td class=rtd>";
        param.replyPattern.checkBGColor = false;
        param.replyPattern.prefixNodeAttrs = {className : "rts"},
        param.replyPattern.mainNodeAttrs =   {className : "rtd"};
      }
      else if (responseText.lastIndexOf ("<div class=t>", maxByteForTestSearch) != -1) {
        // 旧仕様(table ではなくて divがコンテナに使われていた時代)
        param.replyPattern.containerIsTable = false;
        param.replyPattern.startTag = "<div class=r>";
        param.replyPattern.checkBGColor = false;
        param.replyPattern.tagStop = ">";
        param.replyPattern.endTag = "</div>";
        param.replyPattern.endTag2 = "</div>";
        param.dispdelDisplayStyleValue = "block";
      }
      else {
        Akahuku.debug.warn ("proper parsing rule was not found!");
      }
    }

    if (!info.isMonaca
      && responseText.lastIndexOf (" value=delete id=delcheck", maxByteForTestSearch) == -1
      && responseText.lastIndexOf ("<span id=\"delcheck", maxByteForTestSearch) >= 0) {
      // New layout 2019/11/18~ (no input for messages)
      param.replyPattern.startPatternForNum = "<span id=\"delcheck";
      param.replyPattern.threadStart = "<div class=\"thre\"";
    }

    var patternBGColor = null;
    if (param.replyPattern.checkBGColor) {
      patternBGColor = new RegExp ("^[^>]*\\sbgcolor=[\"']?" + param.replyPattern.mainNodeAttrs.bgColor,"i");
    }
    
    var startPosition = 0;
    var endPosition = 0;
    var newReplies = 0;
    var data = {
      thread: {ext:"",com:"",id:""},
      res: [], sd: {}, sync: sync, updatesd: false};
    /* レスの追加 */
    if (sync) {
      startPosition = 0;
      // スレ文の同期
      try {
        startPosition
          = responseText.search
          (new RegExp (param.replyPattern.startPatternForNum + "[0-9]+","i"));
        if (startPosition < 0) throw "no pattrn startPatternForNum=\"" + param.replyPattern.startPatternForNum + "\"";
        startPosition
          = responseText.lastIndexOf ("<", startPosition);
        if (startPosition < 0) throw "no pattrn last \"<\"";
        var threadStartPos
          = responseText.lastIndexOf (param.replyPattern.threadStart, startPosition);
        if (threadStartPos < 0) throw "no pattrn '<form '";
        threadStartPos
          = responseText.indexOf (">", threadStartPos);
        if (threadStartPos < 0) throw "no pattrn '>'";
        var threadHeaderText
          = responseText.substring (threadStartPos, startPosition);

        var imgTagExp = /<img\b[^>]*\bsrc=["']?(?:[^>"']+)\.([^.>"'\/]+)["']?[^>]*>/i;
        if (imgTagExp.test (threadHeaderText)) {
          data.thread.ext = RegExp.$1;
        }

        var threadEndPos
          = responseText.indexOf ("</blockquote>", startPosition);
        if (threadEndPos < 0) throw "no pattrn '</blockquote>'";
        threadEndPos
          = responseText.indexOf (">", threadEndPos);
        var threadBodyText
          = responseText.substring (startPosition, threadEndPos+1);
        threadBodyText
        = arAkahukuConverter.convert (threadBodyText, responseCharset);

        var div = targetDocument.createElement ("div");
        div.innerHTML = threadBodyText;
        bqs = Akahuku.getMessageBQ (div);
        var bqS = (bqs && bqs.length > 0 ? bqs [0] : null);
        if (bqS) {
          data.thread.com = bqS.innerHTML;
          let idtext = Akahuku.getMessageID (bqS);
          if (idtext) {
            data.thread.id = "ID:"+idtext;
          }
          let sodS = arAkahukuReload._getMessageSod (bqS.previousSibling);
          if (sodS.elm) {
            data.sd[info.threadNumber] = sodS.num;
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
        startPosition = 0;
      }
    }
    else {
      startPosition
      = responseText
      .search (new RegExp (param.replyPattern.startPatternForNum + lastReply.num + "[\"']?"));
    }
    for (startPosition
           = responseText.indexOf (param.replyPattern.startTag, startPosition);
         startPosition >= 0;
         startPosition
           = responseText.indexOf (param.replyPattern.startTag, endPosition)) {
      var isDeleted = false;
      if (param.replyPattern.checkBGColor) {
        var s = responseText.substr (startPosition, 100);
        if (!s.match ( patternBGColor )) {
          endPosition = startPosition + 1;
          if (Akahuku.debug.enabled) {
            Akahuku.debug.warn
              ("checkBGColor logic skips response text;\n" + s);
          }
          continue;
        }
        
        var p = responseText.substr (0, startPosition).lastIndexOf ("<table");
        if (p != -1) {
          if (responseText.substr (p, startPosition - p).match (/<table [^>]*class=[\'\"]?deleted[\'\"]?/)) {
            isDeleted = true;
          }
        }
      }
      
      endPosition = responseText.indexOf (param.replyPattern.endTag, startPosition);
      if (endPosition < 0) {
        break;
      }
      
      if (param.replyPattern.endTag2) {
        endPosition += param.replyPattern.endTag.length;
        endPosition = responseText.indexOf (param.replyPattern.endTag2, endPosition);
        if (endPosition < 0) {
          break;
        }
      }
      
      var tagStopPosition = responseText.indexOf (param.replyPattern.tagStop, startPosition);
      if (tagStopPosition == -1) {
        break;
      }
      var currentReplyTextTmp
      = responseText.substr (tagStopPosition + param.replyPattern.tagStop.length,
                             endPosition
                             - (tagStopPosition + param.replyPattern.tagStop.length));
      
      var currentReplyText
      = arAkahukuConverter.convert (currentReplyTextTmp, responseCharset);
            
      var num = 0;
      if (currentReplyText.match (/<span\b[^>]* id=['"]?delcheck([0-9]+)/)) {
        // New layout 2019/11/18~ (no input for messages)
        num = parseInt (RegExp.$1);
      }
      else if (currentReplyText.match (/name=['"]?([0-9]+:)?([0-9]+)['"]?/)) {
        num = parseInt (RegExp.$2);
      }
      /* 避難所 patch */
      else if (currentReplyText.match (/value=['"]?([0-9]+)['"]?/)) {
        num = parseInt (RegExp.$1);
      }
      else if (currentReplyText.match (/No.([0-9]+)/)) {
        num = parseInt (RegExp.$1);
      }
      if (sync || num > lastReply.num) {
        if (!lastReply.container) {
          lastReply.container
          = arAkahukuReload.createContainer (responseText,
                                             targetDocument,
                                             !param.replyPattern.containerIsTable,
                                             responseCharset);
        }

        // Parse & check container tag for deleted reply class
        var lastEndPosition = (endPosition == 0 ? startPosition - 64 : endPosition);
        if (param.replyPattern.containerIsTable) {
          lastEndPosition = responseText.lastIndexOf ("<table", lastEndPosition);
        }
        else { // div
          lastEndPosition = startPosition;
        }
        if (lastEndPosition >= 0) {
          var currentContainerText
          = responseText.substr (lastEndPosition, endPosition-lastEndPosition-currentReplyTextTmp.length);
          if (param.replyPattern.containerIsTable
            && /^<table [^>]*class=[\'\"]?deleted[\'\"]?/.test (currentContainerText)) {
            isDeleted = true;
          }
        }

        var currentContainer
        = Akahuku.cloneMessageContainer
        (lastReply.container, {skipMainInner: true});
        arAkahukuDOM.removeClassName
        (currentContainer.main, "akahuku_skipped_reply");
        arAkahukuDOM.removeClassName
        (currentContainer.main, "akahuku_deleted_reply");
        arAkahukuDOM.removeClassName
        (currentContainer.main, "akahuku_deleted_reply2");

        /* HTML のソースから構築するので innerHTML を使用する  */
        currentContainer.main.innerHTML = currentReplyText;

        var bqs = Akahuku.getMessageBQ (currentContainer.main);
        var bqS = (bqs.length ? bqs [0] : null);
        if (bqS) {
          let sodS = arAkahukuReload._getMessageSod (bqS.previousSibling);
          if (sodS.elm) {
            data.sd[num] = sodS.num;
          }
        }
        currentContainer.isDeleted = isDeleted;
        currentContainer.num = num;
        data.res.push(currentContainer);

        if (num > lastReply.num) {
          newReplies ++;
        }
        if (newReplies == 1) {
          /* 最初の新規レス */
          arAkahukuThread.updateReplyPrefix
          (lastReply.container, info);
        }
      }
    }

    return arAkahukuReload.appendNewRepliesCore (data, terminator, targetDocument, retNode);
  },

  appendNewRepliesCore : function (data, terminator, targetDocument, retNode) {
    var sync = data.sync;
    var newNodes = new Array ();
    var addNodes = new Array ();
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param = documentParam.reload_param;
    var info = documentParam.location_info;
    var isUpdated = false;

    var lastReply = arAkahukuThread.getLastReply (targetDocument);

    var dispdel = -1;
    try {
      var ddbut = targetDocument.getElementById ("ddbut");
      if (ddbut) {
        if (ddbut.innerHTML == "\u898B\u308B") { // "見る"
          dispdel = 0;
        }
        else if (ddbut.innerHTML == "\u96A0\u3059") { // "隠す"
          dispdel = 1;
        }
      }
      if (dispdel == -1) {
        dispdel = (arAkahukuReload.enableSyncButtonNoDelete ? 1 : 0);
        targetDocument.defaultView.wrappedJSObject.dispdel = dispdel;
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }

    var lastReplyNumber = 0;
    var newReplies = 0;
    var skippedReplies = 0;
    var noSkippedReplies = 0;
    var deletedReplies = 0;
    var nodeletedReplies = 0;
    var redDeletedReplies = 0;
    var redHiddenReplies = 0;
    var deletedThumbnails = 0;
    var redReplies = 0;

    var idSyncResults = {
      removed: 0,
      appended: 0,
      removedIDs: [],
      appendedIDs: [],
      removedIDsText: "",
      appendedIDsText: "",
    };
    var countSyncIDResult = function (results, ret) {
      var ids = null;
      if (ret.op > 0) {
        results.appended ++;
        ids = results.appendedIDs;
      }
      else if (ret.op < 0) {
        results.removed ++;
        ids = results.removedIDs;
      }
      if (ids) {
        for (var nId = 0; ids && nId < ids.length; nId ++) {
          if (ids [nId] === ret.id) {
            return;
          }
        }
        ids.push (ret.id);
        var s = (ids.length > 1 ? " ID:" : "ID:") + ret.id;
        if (ret.op > 0) {
          results.appendedIDsText += s;
        }
        else {
          results.removedIDsText += s;
        }
      }
    };
        
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
        
    if (!sync) {
      lastReplyNumber = arAkahukuThread.numberingMax + 1;
      /* 最後のレスの通し番号の取得 */
      if (arAkahukuThread.enableNumbering
          && lastReply.container) {
        var rsc = Akahuku.getMessageReplyNumber (lastReply.container.main, true);
        if (rsc) {
          lastReplyNumber = parseInt (rsc.textContent);
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
        
    var nodes = Akahuku.getMessageBQ (targetDocument).slice (1);
    var nodesIndex = 0;
    
    /* レスの追加 */
    if (sync) {
      // スレ文の同期
      try {
        var thumbnail = targetDocument.getElementById ("akahuku_thumbnail");
        if (thumbnail && data.thread.ext == "") {
          // サムネ画像が消えている場合
          if (!arAkahukuDOM.hasClassName
              (thumbnail, "akahuku_deleted_reply2")) {
            deletedThumbnails ++;
            arAkahukuDOM.addClassName
            (thumbnail, "akahuku_deleted_reply2");
            if (arAkahukuReload.enableExtCacheImages) {
              Akahuku.Cache.enCacheURIContextIfCached (thumbnail);
            }
          }
        }

        var bqs = Akahuku.getMessageBQ (targetDocument);
        var bqT = (bqs && bqs.length > 0 ? bqs [0] : null);
        var bqS = targetDocument.createElement ("blockquote");
        bqs.innerHTML = data.thread.com;

        if (bqS && bqT) {
          // 赤字の同期
          var syncdata
            = arAkahukuReload._syncMessageBQ (bqS, bqT);
          if (syncdata.red) {
            if (syncdata.redType === "deleted") {
              redDeletedReplies ++;
            }
            else if (syncdata.redType === "hidden") {
              redHiddenReplies ++;
            }
            else {
              redReplies ++;
            }
          }
          // ID同期
          if (arAkahukuReload.enableSyncMessageID) {
            var ret = arAkahukuReload._syncMessageID (data.thread.id.replace(/^ID:/,''), bqT);
            countSyncIDResult (idSyncResults, ret);
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    for (let currentContainer of data.res) {
      let num = currentContainer.num;
      let isDeleted = currentContainer.isDeleted;
      if (sync || num > lastReply.num) {
        /* レスの追加 */
        if (!isUpdated) {
          isUpdated = true;
          /* MessageBQ cache があればここで消す */
          Akahuku._setMessageBQCache (documentParam, null);
        }
        if (!lastReply.container) {
          /* レスが無い時 */
          lastReplyNumber = 0;
        }
        
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
                var bqS = (bqs.length ? bqs [0] : null);
                bqs = Akahuku.getMessageBQ (container.main);
                var bqT = (bqs.length ? bqs [0] : null);
                var syncdata
                = arAkahukuReload._syncMessageBQ (bqS, bqT);
                if (syncdata.red) {
                  if (syncdata.deleted) {
                    arAkahukuDOM.addClassName
                      (container.main, "akahuku_deleted_reply2");
                    if (dispdel) {
                      container.nodes [0].style.display = param.dispdelDisplayStyleValue;
                    }
                    arAkahukuDOM.addClassName
                      (container.nodes [0], "deleted");
                    if (arAkahukuReload.enableExtCacheImages) {
                      Akahuku.Cache.enCacheURIForImages (container.main);
                    }
                  }
                  if (syncdata.redType === "deleted") {
                    redDeletedReplies ++;
                  }
                  else if (syncdata.redType === "hidden") {
                    redHiddenReplies ++;
                  }
                  else {
                    redReplies ++;
                  }
                }

                if (bqT && bqS && !arAkahukuDOM.hasClassName
                    (container.main, "akahuku_deleted_reply2")) {
                  var thumbS = Akahuku.getThumbnailFromBQ (bqS);
                  var thumbT = Akahuku.getThumbnailFromBQ (bqT);
                  if (thumbT && !thumbS // 画像が削除された
                      && !arAkahukuDOM.hasClassName
                      (thumbT, "akahuku_deleted_reply2")) {
                    deletedThumbnails ++;
                    arAkahukuDOM.addClassName
                      (thumbT, "akahuku_deleted_reply2");
                    if (arAkahukuReload.enableExtCacheImages) {
                      Akahuku.Cache.enCacheURIContextIfCached (thumbT);
                    }
                  }

                  if (arAkahukuReload.enableSyncMessageID) {
                    var ret = arAkahukuReload._syncMessageID (Akahuku.getMessageID (bqS), bqT);
                    countSyncIDResult (idSyncResults, ret);
                  }
                  arAkahukuReload._syncMessageSod (bqS, bqT);
                }
                
                if (arAkahukuThread.enableNumbering
                    && skippedReplies + deletedReplies
                    + nodeletedReplies) {
                  // レス番号がズレている時
                  rsc = Akahuku.getMessageReplyNumber (container.main, true);
                  if (rsc) {
                    arAkahukuDOM.setText
                      (rsc,
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
                    // レス番号がズレている時
                    rsc = Akahuku.getMessageReplyNumber (container.main, true);
                    if (rsc) {
                      arAkahukuDOM.setText
                        (rsc,
                         nodesIndex
                         + skippedReplies
                         - deletedReplies
                         + 1);
                    }
                  }

                  if (arAkahukuReload.enableExtCacheImages) {
                    // 削除されたレス中の画像はキャッシュにする
                    Akahuku.Cache.enCacheURIForImages (container.main);
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

          // 連携したい他の拡張機能の支援(カスタムイベント)
          var appendEvent = targetDocument.createEvent ("Events");
          appendEvent.initEvent ("AkahukuContentAppend", true, true);
          var appendCancelled
            = !currentContainer.main.dispatchEvent (appendEvent);
          // preventDefault された場合はレスを非表示にする
          for (var i = 0; i < currentContainer.nodes.length; i ++) {
            currentContainer.nodes [i].style.display
              = (appendCancelled ? "none" : "");
          }
                    
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
                
        var container = Akahuku.getMessageContainer (nodes [nodesIndex]);

        if (arAkahukuReload.enableSyncButtonNoDelete) {
          nodeletedReplies ++;
          
          arAkahukuDOM.addClassName
          (container.main, "akahuku_deleted_reply");
          
          if (arAkahukuThread.enableNumbering
              && skippedReplies + deletedReplies + nodeletedReplies) {
            // レス番号がズレている時
            rsc = Akahuku.getMessageReplyNumber (container.main, true);
            if (rsc) {
              arAkahukuDOM.setText
                (rsc,
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
    
    if (!sync && data.sd && data.updatesd) {
      //update sod counters
      for (let sonum in data.sd) {
        let sodd = document.getElementById ("sd"+sonum);
        if (sodd) {
          if (data.sd[sonum] > 0) {
            //"そうだねx"
            sodd.textContent = "\u305D\u3046\u3060\u306Dx" + data.sd[sonum];
          }
          else {
            sodd.textContent = "+";
          }
        }
      }
    }

    arAkahukuReload.updateDDel (targetDocument);
    
    skippedReplies -= noSkippedReplies;
        
    if (newReplies + skippedReplies + nodeletedReplies + deletedReplies
      + redDeletedReplies + redHiddenReplies
        > 0) {
      /* レス数の表示 */
      arAkahukuThread.updateReplyNumber (targetDocument);
      if (arAkahukuThread.enableBottomStatus) {
        var bottomStatus
          = targetDocument.getElementById ("akahuku_bottom_status");
        if (!bottomStatus) {
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
                            false,
                            true),
                           td.firstChild);
        }
      }
      arAkahukuThread.displayReplyNumber (targetDocument);
    }
        
    return new Array (newReplies, skippedReplies,
                      nodeletedReplies + deletedReplies,
                      newNodes, addNodes, redReplies, deletedThumbnails,
                      idSyncResults, redDeletedReplies, redHiddenReplies);
  },

  appendNewRepliesJson : function (json, terminator, sync, targetDocument, retNode) {
    const data = {res: [], sd: json.sd, sync: sync, updatesd: true};
    const documentParam = Akahuku.getDocumentParam (targetDocument);
    const info = documentParam.location_info;
    if (sync && json._thread) {
      // スレ文
      // Note: jsonモード応答では現状スレ文は取得できない
      data.thread = {};
      data.thread.com = json._thread.com;
      data.thread.id = json._thread.id;
      data.sd[info.threadNumber] = json.sd[info.threadNumber] || "";
    }

    let newReplies = 0;
    const lastReply = arAkahukuThread.getLastReply (targetDocument);
    let jsonResNums = Object.keys(json.res).map(n => parseInt(n));
    jsonResNums.sort();
    for (let num of jsonResNums) {
      if (sync || num > lastReply.num) {
        let cont = arAkahukuReload.createResJson(targetDocument, json, num);
        cont.num = num;
        cont.isDeleted = false;
        if (json.res[num].del) {
          // "del"(スレを立てた人), "selfdel"(書き込みをした人),
          // "del2"(削除依頼), "admindel"(なー)
          cont.isDeleted = true;
        }
        data.res.push(cont);
        if (num > lastReply.num) {
          newReplies ++;
        }
        if (newReplies == 1) {
          // 最初の新規レス
          arAkahukuThread.updateReplyPrefix (cont, info);
        }
      }
    }

    return arAkahukuReload.appendNewRepliesCore (data, terminator, targetDocument, retNode);
  },

  createResJson: function (document, json, no) {
    // based on makeArticle()

    var fragmentFromString = function (document, strHTML) {
      var frag = document.createDocumentFragment();
      var tmp = document.createElement('body');
      tmp.innerHTML = strHTML;
      while (tmp.firstChild) {
        frag.appendChild(tmp.firstChild);
      }
      return frag;
    };

    var resd = json.res[no];
    var t = document.createElement('table');
    t.border = 0;
    if (resd.del == 'del' || resd.del == 'del2'
      || resd.del == 'selfdel' || resd.del == 'admindel') {
      t.className = "deleted";
    }
    var tb = document.createElement('tbody');
    var tr = document.createElement('tr');
    var rts = document.createElement('td');
    rts.className = "rts";
    rts.appendChild(document.createTextNode("\u2026"));//"…"
    var rtd = document.createElement('td');
    rtd.className = "rtd";

    var inp = document.createElement('span');
    inp.id = "delcheck"+no;
    inp.className = "rsc";
    inp.innerHTML = resd.rsc;

    var t1,t2,t3,t12,a5;
    var t11 = '';
    if (resd.id != ''){
      t11 = ' '+resd.id;
    }
    t12 = document.createElement('span');
    t12.className = "cnw";
    if (json.dispname > 0) {
      t1 = document.createElement('span');
      t1.innerHTML += resd.sub;
      t1.className = "csb";
      t2 = document.createTextNode('Name');
      t3 = document.createElement('span');
      if (resd.email != '') {
        a5 = document.createElement('a');
        a5.href = "mailto:"+(arAkahukuConverter.unescapeEntity(resd.email));
        a5.innerHTML += resd.name;
        t3.appendChild(a5);
      }
      else {
        t3.innerHTML += resd.name;
      }
      t3.className = "cnm";
      t12.appendChild(fragmentFromString(document, resd.now + t11));
    }
    else {
      if (resd.email != ''){
        var t12a = document.createElement('a');
        t12a.innerHTML += resd.now;
        t12a.href = "mailto:"+(arAkahukuConverter.unescapeEntity(resd.email));
        t12.appendChild(t12a);
        t12.appendChild(document.createTextNode(t11));
      }
      else {
        t12.innerHTML += (resd.now + t11);
      }
    }

    var t4a = document.createElement('span');
    t4a.className = "cno";
    t4a.innerHTML = "No." + no;

    var a2;
    if (json.dispsod > 0) {
      a2 = document.createElement('a');
      a2.appendChild(document.createTextNode("+"));
      a2.className = "sod";
      a2.id = "sd"+no;
      a2.href = "javascript:void(0)";
      a2.setAttribute("onclick", "sd("+no+");return(false);");
    }

    if (resd.ext != '') {
      // 添付ファイル
      var b1 = document.createElement('br');
      var t5 = document.createTextNode(" \u00A0 \u00A0 ");
      var a3 = document.createElement('a');
      a3.appendChild(document.createTextNode(resd.tim + resd.ext));
      a3.href = resd.src;
      a3.target = "_blank";
      var t6 = document.createTextNode('-('+resd.fsize+' B) ');
      var t7 = document.createElement('span');
      //"サムネ表示"
      t7.appendChild(document.createTextNode("\u30B5\u30E0\u30CD\u8868\u793A"));
      t7.style.fontSize = "small";
      var b2 = document.createElement('br');
      var a4 = document.createElement('a');
      a4.href = resd.src;
      a4.target = "_blank";
      var i1 = document.createElement('img');
      i1.src = resd.thumb;
      i1.border = 0;
      i1.align = "left";
      i1.width = resd.w;
      i1.height = resd.h;
      i1.hspace = 20;
      i1.alt = resd.fsize + " B";
    }

    var bl = document.createElement('blockquote');
    if (resd.w > 0) {
      bl.style.marginLeft = (resd.w + 40)+"px";
    }
    if (resd.del == 'del' || resd.del == 'del2') {
      var t9 = document.createElement('font');
      t9.setAttribute('color', '#ff0000');
      if (resd.del == 'del') {
        //"スレッドを立てた人によって削除されました"
        t9.appendChild(document.createTextNode("\u30B9\u30EC\u30C3\u30C9\u3092\u7ACB\u3066\u305F\u4EBA\u306B\u3088\u3063\u3066\u524A\u9664\u3055\u308C\u307E\u3057\u305F"));
      }
      else {
        //'削除依頼によって隔離されました'
        t9.appendChild(document.createTextNode("\u524A\u9664\u4F9D\u983C\u306B\u3088\u3063\u3066\u9694\u96E2\u3055\u308C\u307E\u3057\u305F"));
      }
      bl.appendChild(t9);
      bl.appendChild(document.createElement('br'));
    }
    if (resd.host != '') {
      bl.appendChild(document.createTextNode('['));
      var t10 = document.createElement('span');
      t10.style.color = "#ff0000";
      t10.appendChild(document.createTextNode(resd.host));
      bl.appendChild(t10);
      bl.appendChild(document.createTextNode(']'));
      bl.appendChild(document.createElement('br'));
    }
    bl.innerHTML += resd.com;

    rtd.appendChild(inp);
    if (json.dispname > 0) {
      rtd.appendChild(t1);
      rtd.appendChild(t2);
      rtd.appendChild(t3);
    }
    rtd.appendChild(t12);
    rtd.appendChild(t4a);//No
    if (json.dispsod > 0) {
      rtd.appendChild(a2);
    }
    if (resd.ext != '') {
      rtd.appendChild(b1);
      rtd.appendChild(t5);
      rtd.appendChild(a3);
      rtd.appendChild(t6);
      rtd.appendChild(t7);
      rtd.appendChild(b2);
      a4.appendChild(i1);
      rtd.appendChild(a4);
    }
    rtd.appendChild(bl);
    tr.appendChild(rts);
    tr.appendChild(rtd);
    tb.appendChild(tr);
    t.appendChild(tb);

    return {nodes:[t], main: rtd};
  },
    
  /**
   * 広告を更新する
   *
   * @param  String responseText
   *         応答の HTML
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String optCharset
   *         応答の文字コード
   */
  updateAd : function (responseText, targetDocument, optCharset) {
    var responseCharset = optCharset || targetDocument.characterSet || "Shift_JIS";
    var startPosition = 0;
    var endPosition = 0;
    var heading = "<div class=\"ama\">";
    var heading2 = "<table class=\"ama\"><tr><td>";
    var heading3 = "<table width=468 border><tr><td>";
    var startTag = heading + "<a href=\"http://www.amazon.co.jp/";
    var startTag2 = heading2 + "<a href=\"http://www.amazon.co.jp/";
    var startTag3 = heading3 + "<a href=\"http://www.amazon.co.jp/";
    var mode = 2;
    var endTag = "</td>";
    var trailing2 = "</blockquote>";
    var endTag2 = "</blockquote></div>";
    
    if (responseText.length > 4096) {
      // 長いスレでの探索コストを抑える
      startPosition = responseText.length - 4096;
    }
    startPosition = responseText.indexOf (startTag, startPosition);
    if (startPosition != -1) {
      startPosition += heading.length;
    }
    else {
      mode = 1;
      startPosition = responseText.indexOf (startTag2, startPosition);
      
      if (startPosition != -1) {
        startPosition += heading2.length;
      }
      else {
        startPosition = responseText.indexOf (startTag3, startPosition);
      
        if (startPosition != -1) {
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
      for (var i = nodes.length - 1; i >= 0; i --) {
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
      adCell.innerHTML = arAkahukuConverter.convert (adText, responseCharset);
    }
  },
  
  /**
   * レスを更新する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  update : function (targetDocument) {
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param = documentParam.reload_param;
    var info = documentParam.location_info;
    var stats = {
      updated: false, counts: [],
      info: info, param: param,
      die: false,
    };
        
    /* 応答を解析する */
    var responseText = param.responseText;
    var responseCharset = param.responseCharset || targetDocument.characterSet || "Shift_JIS";
    
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
                                          retNode, responseCharset);
            
      /* 広告に反映する */
      arAkahukuReload.updateAd (responseText,
                                targetDocument, responseCharset);
            
      /* スレ消滅情報に反映する */
      arAkahukuReload.updateViewersNumber (responseText,
                                           targetDocument, responseCharset);
      arAkahukuReload.updateDeletedMessage (responseText,
                                           targetDocument);
      arAkahukuReload.updateExpireWarning (responseText,
                                           targetDocument, responseCharset);
      arAkahukuReload.updateExpireTime (responseText,
                                        targetDocument, responseCharset);

      stats.updated = true;
      stats.counts = array;
    }

    if (arAkahukuReload.enableExtCache && param.location) {
      if (param.writer == null) {
        param.writer = new arAkahukuReloadCacheWriter ();
        /* 避難所 patch */
        if (info.isMonaca) {
          param.writer.setText = param.writer.setTextMonaca;
        }
      }
      if (param.writer.setText (responseText, responseCharset)) {
        param.writer.responseHead = param.responseHead;
        param.writer.charset = responseCharset;
        if (arAkahukuReload.enableExtCacheFile) {
          param.writer.createFile (param.location);
        }
        else {
          Akahuku.Cache.asyncOpenCacheToWrite
            ({url: param.location  + ".backup",
              triggeringNode: targetDocument},
             param.writer);
        }
      }
    }

    arAkahukuReload.updatePostprocess (targetDocument, stats);
  },

  updatePostprocess : function (targetDocument, stats) {
    var info = stats.info;
    var param = stats.param;
    var newReplies = 0;
    var newNodes = new Array (), addNodes = new Array ();

    if (stats.updated) {
      var array = stats.counts;
      newReplies = array [0];
      var skippedReplies = array [1];
      var deletedReplies = array [2];
      newNodes = array [3];
      addNodes = array [4];
      var redReplies = array [5];
      var deletedThumbnails = array [6];
      var idSyncResults = array [7];
      var redDeletedReplies = array [8];
      var redHiddenReplies = array [9];
            
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
        if (deletedReplies + redDeletedReplies > 0) {
          /* 削除されたレスがあった場合 */
          s += ", \u524A\u9664: " + (deletedReplies + redDeletedReplies);
          parm = true;
        }
        if (redHiddenReplies > 0) {
          // 隔離
          s += ", \u9694\u96E2: " + redHiddenReplies;
          parm = true;
        }
        if (deletedThumbnails > 0) {
          /* 画像が削除されたレスがあった場合 */
          s += ", \u753B\u50CF\u524A\u9664: " + deletedThumbnails;
          parm = true;
        }
        if (redReplies > 0) {
          /* 赤字が変わったレスがあった場合 */
          s += ", \u8D64\u5B57\u5909\u5316: " + redReplies;
          parm = true;
        }
        if (idSyncResults.appended > 0) {
          // IDが新たに付いたレスがあった場合
          s += ", ID\u4ED8\u52A0: " + idSyncResults.appended //", ID付加: "
            + " (" + idSyncResults.appendedIDsText + ")";
          parm = true;
        }
        if (idSyncResults.removed > 0) {
          // IDが消えたレスがあった場合
          s += ", ID\u524A\u9664: " + idSyncResults.removed //", ID削除: "
            + " (" + idSyncResults.removedIDsText + ")";
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
        var browser = arAkahukuWindow
          .getBrowserForWindow (targetDocument.defaultView);
            
        if (arAkahukuSidebar.hasBoard (name, browser)) {
          var ok = true;
          if (!arAkahukuSidebar.enableBackground) {
            ok = arAkahukuSidebar.hasTabForBoard (name, browser);
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

    // スレ情報の更新を通知 (連携)
    info.notifyUpdate ("thread-updated");
        
    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
    param.reloadRequestInit = null;
    param.reloadRequestController = null;

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
   * レスを更新する(json)
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   */
  updateJson : function (targetDocument) {
    var documentParam = Akahuku.getDocumentParam (targetDocument);
    var param = documentParam.reload_param;
    var info = documentParam.location_info;
    var stats = {
      updated: false, counts: [],
      info: info, param: param,
      die: false,
    };

    const json = param.responseJson;
    if (json) {
      var container
      = targetDocument.getElementById ("akahuku_bottom_container");
      var retNode = (arAkahukuReload.listeners.length > 0);

      // レスに反映する
      var array
        = arAkahukuReload.appendNewRepliesJson (json,
                                                container,
                                                param.sync,
                                                targetDocument,
                                                retNode);

      // 広告に反映する
      arAkahukuReload.updateAd ("", targetDocument, "");

      // スレ消滅情報に反映する
      arAkahukuReload.updateViewersNumberJson (json, targetDocument);
      arAkahukuReload.updateDeletedMessageJson (json, targetDocument);
      arAkahukuReload.updateExpireWarningJson (json, targetDocument);
      arAkahukuReload.updateExpireTimeJson (json, targetDocument);

      stats.updated = true;
      stats.counts = array;
    }
    arAkahukuReload.updatePostprocess (targetDocument, stats);
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
        
    if (!param || param.replying) {
      return;
    }
        
    /* ロードに失敗している画像を読み直す */
    var nodes, i;
    nodes = targetDocument.getElementsByTagName ("img");
    for (i = 0; i < nodes.length; i ++) {
      try {
        var imgStatus = arAkahukuUtil.getImageStatus (nodes [i]);
        if (!imgStatus.requestURI) {
          continue;
        }
        if (imgStatus.isErrored) {
          nodes [i].src = nodes [i].src;
        }
        else if (imgStatus.requestImageStatus == 0) {
          targetDocument.defaultView.setTimeout
            (function (node) {
              node.src = node.src;
            }, 100, nodes [i]);
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    if (param.reloadRequestInit) {
      /* リロード中ならば中断する */
      try {
        param.reloadRequestController.abort();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
      param.reloadRequestController = null;
      param.reloadRequestInit = null;
      arAkahukuReload.setStatus
      ("\u4E2D\u65AD\u3055\u308C\u307E\u3057\u305F",
       false, targetDocument);
      if (arAkahukuReload.enableNolimit) {
        arAkahukuConfig.restoreTime ();
      }
      return;
    }
        
    if (!targetDocument.getElementById ("akahuku_bottom_container")) {
      return;
    }

    // この時点でステータス表示要素が無い or 非表示 or 見えないなら
    // ステータスパネルにも表示させる
    param.showMessageInPanel = false;
    var isElementVisible = function (elem) {
      return !!(elem.clientWidth || elem.clientHeight ||
                elem.getClientRects ().length);
    };
    var elem = targetDocument.getElementById ("akahuku_reload_status");
    if (!elem ||
        !isElementVisible (elem) ||
        !arAkahukuReload._checkElementYInScreen (elem, true)) {
      elem = targetDocument.getElementById ("akahuku_throp_reload_status");
      // trhop は fixed なのでスクリーン位置は不問
      if (!elem || !isElementVisible (elem)) {
        param.showMessageInPanel = true;
      }
    }

    if (arAkahukuReload.enableNolimit) {
      arAkahukuConfig.setTime (arAkahukuReload.limitTime);
    }
        
    param.sync = sync;
    param.replied = replied;
        
    param.useRange = false;
        
    var location = targetDocument.location.href;
        
    /* 避難所 patch */
    if (info.isMonaca && !param.sync) {
      // X-Content-Range 相当の情報を文書中から取得する
      if (param.nextPosition == 0) {
        var node = targetDocument.getElementById ("textlog_size");
        if (node && node.hasAttribute ("value")) {
          param.nextPosition = parseInt (node.getAttribute ("value"));
        }
        else {
          param.nextPosition = 0;
        }
      }
      location = location.replace
        (/\/([^\/]+)\/res\/.*/, "/monacalib/include/dr.php?board=$1")
        + "&res=" + info.threadNumber
        + "&offset=" + param.nextPosition;
      param.useRange = true;
    }
        
    let method = 'GET';
    if ((param.requestMode == 0 //HEAD-GET
      || param.requestMode == 2) //HEAD-GET(json)
        && !param.sync && !info.isMonaca
        && !/\.php\?/.test (location)) {
      method = 'HEAD';
    }
        
    param.location = location;
        
    param.asyncReload(method);
        
    if (info.isFutaba
        && !info.isFutasuke) {
      /* 続きを読んでも画像が来ない場合は見てない事になってしまうので
       * 手動で板のリストを更新する */
      /*
      arAkahukuP2PService
        .servant.visitBoard (info.server + "/" + info.dir);
      */
    }
  },

  /**
   * 指定 browser のコンテンツで可能なら"続きを読む"
   */
  diffReloadForBrowser : function (browser, doSync) {
    var targetDocument = browser.contentDocument;
    var param = Akahuku.getDocumentParam (targetDocument);
    if (param.reload_param) {
      arAkahukuReload.diffReloadCore (targetDocument, doSync, false);
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
    param.location = location;
    try {
      Akahuku.Cache.asyncOpenCacheToRead
        ({url:location,
          triggeringNode: param.targetDocument},
         param);
    }
    catch (e) { Akahuku.debug.exception (e);
    }
  },

  /**
   * 必要なら続きを読むかリロードする
   *
   * @param  HTMLDocument
   * @param  boolean 同期を優先するか
   */
  reloadOnDemand : function (doc, trySync) {
    if (arAkahukuCompat.isDeadWrapper (doc)) {
      return;
    }

    var param = Akahuku.getDocumentParam (doc);
    if (!param) {
      // 非管理ページはロード終了していたら普通にリロード
      if (!doc.readyState || doc.readyState == "complete") {
        doc.defaultView.location.reload();
      }
      return;
    }

    if (param.reload_param &&
        param.reload_param.reloadRequestInit) {
      // [続きを読む]が処理中ならなにもしない
      return;
    }

    if (typeof trySync === "undefined") {
      trySync = arAkahukuReload.enableOnDemandSync;
    }

    var doDiffReload = false;
    if (param.location_info &&
        param.location_info.incomingReply > 0) {
      doDiffReload = true;
    }
    if (!doDiffReload) {
      var elem = doc.getElementById ("akahuku_bottom_container");
      if (elem) {
        // 画面内Y軸に(少なくとも8px分)入っていれば
        doDiffReload
        = arAkahukuReload._checkElementYInScreen (elem, false, 8);
      }
    }

    if (doDiffReload) {
      arAkahukuReload.diffReloadCore (doc, trySync, false);
    }
  },

  reloadOnDemandForBrowser : function (browser, trySync) {
    var targetDocument = browser.contentDocument;
    arAkahukuReload.reloadOnDemand (targetDocument, trySync);
  },

  _checkElementYInScreen : function (targetNode, checkWhole, marginTop, marginBottom) {
    var doc = targetNode.ownerDocument;

    marginTop = parseFloat (marginTop);
    marginBottom = parseFloat (marginBottom);
    if (marginTop !== marginTop) { // isNaN
      marginTop = 0;
    }
    if (marginBottom !== marginBottom) { // isNaN
      marginBottom = marginTop;
    }

    var elem = targetNode;
    var offsetTop = elem.offsetTop|0; //as a number
    while (elem.offsetParent) {
      elem = elem.offsetParent;
      offsetTop += elem.offsetTop|0;
    }
    var offsetBottom = offsetTop
      + (targetNode.offsetHeight || targetNode.clientHeight);

    offsetTop += marginTop;
    offsetBottom -= marginBottom;

    var base = doc.body; //後方互換モード用
    if (doc.compatMode != "BackCompat") {
      base = doc.documentElement; //標準準拠モード用
    }
    var baseScrollBottom = base.scrollTop + base.clientHeight;

    if (offsetTop > baseScrollBottom ||
        offsetBottom < base.scrollTop) { // 完全にスクリーン外
      return false;
    }
    else if (offsetTop < base.scrollTop) { //上端で一部隠れ
      return (checkWhole ? false : true);
    }
    else if (baseScrollBottom < offsetBottom) { // 下端で一部隠れ
      return (checkWhole ? false : true);
    }
    return true;
  },

  /**
   * ドキュメントのタブ切替(visibilitychange)
   */
  onDocumentVisibilityChange : function (event) {
    var targetDocument = event.target;
    var param = Akahuku.getDocumentParam (targetDocument);
    var info = param.location_info;
    if (targetDocument.visibilityState === "visible") {
      // 必要に応じて続きを読む
      if (arAkahukuReload.enableOnDemand &&
          info.isReply && info.isOnline && !info.isNotFound) {
        // 瞬間的なフォーカスでは動作しないようにタイマー処理
        targetDocument.defaultView
        .setTimeout (function () {
          if (arAkahukuCompat.isDeadWrapper (targetDocument)) {
            return;
          }
          if (targetDocument.hasFocus ()) {
            arAkahukuReload.reloadOnDemand (targetDocument);
          }
        }, 100);
      }
    }
    else { // "hidden"
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
          var href = targetDocument.location.href;
          // futaba.php?res=123 形式は res/123.htm と読み替える
          href = href.replace (/\/[^\/]+\.php\?res=(\d+)$/, "/res/$1.htm");
          a.href
            = Akahuku.protocolHandler.enAkahukuURI
            ("filecache", href);
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
        && arAkahukuReload.enable
        && !info.isTsumanne) {
      var param = new arAkahukuReloadParam ();
      Akahuku.getDocumentParam (targetDocument).reload_param = param;
      param.targetDocument = targetDocument;
      param.lastModified = Date.parse (targetDocument.lastModified);
      if (info.isFutaba && arAkahukuReload.enableJson) {
        param.requestMode = 2; //HEAD-GET(json)
      }
            
      // TODO: hook reload
            
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
        a.id = "akahuku_reload_upbutton";
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
        targetDocument.defaultView
          .setTimeout (function () {
            arAkahukuReload.backupCache (location, param);
          }, 1000);
      }

      // タブ切替を検知 (Firefox 18~)
      if ("visibilityState" in targetDocument) {
        targetDocument
        .addEventListener ("visibilitychange", function (event) {
          arAkahukuReload.onDocumentVisibilityChange (event);
        }, false);
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
  },

  _convertFromEUCJP : function (text, charset) {
    return arAkahukuReload._convert (text, "EUC-JP", charset);
  },
  _convertFromSJIS : function (text, charset) {
    return arAkahukuReload._convert (text, "Shift_JIS", charset);
  },
  _convert : function (text, textCharset, charset) {
    if (charset && charset != textCharset) {
      try {
        var unicodetext = arAkahukuConverter.convert (text, textCharset);
        arAkahukuConverter.converter.charset = charset;
        return arAkahukuConverter.converter.ConvertFromUnicode (unicodetext);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    return text;
  },

  _syncMessageBQ : function (sourceBQ, targetBQ) {
    var isRed = function (node) {
      var c = node.getAttribute ("color");
      return (c == "#f00000" || c == "#ff0000");
    };
    var getSiblingsUntilBR = function (node, backword) {
      var sibling = (backword ? "previousSibling" : "nextSibling");
      var ret = [];
      while (node) {
        if (node.nodeType === node.ELEMENT_NODE &&
            node.nodeName.toLowerCase () == "br") {
          break;
        }
        ret.push (node);
        node = node [sibling];
      }
      if (backword) ret.reverse ();
      return ret;
    };
    var getSiblingsInLine = function (node) {
      var nodes = getSiblingsUntilBR (node, true);
      return nodes.concat (getSiblingsUntilBR (node.nextSibling));
    };
    var getTextOfNodes = function (nodes) {
      var ret = "";
      for (var i = 0; i < nodes.length; i ++) {
        ret += arAkahukuDOM.getInnerText (nodes [i]);
      }
      return ret;
    };
    var RedData = function (node, bq) {
      this.node = node;
      while (node && bq && node.parentNode != bq) {
        node = node.parentNode;
      }
      this.siblings = getSiblingsInLine (node);
      this.text = getTextOfNodes (this.siblings);
    };

    var ret = {red: false, redType: "", deleted: false};

    if ((sourceBQ instanceof Node
          && !Akahuku.isMessageBQ (sourceBQ))
        || (targetBQ instanceof Node
          && !Akahuku.isMessageBQ (targetBQ))) {
      return ret;
    }

    // 赤字を収集
    var redsS = [];
    var redsT = [];
    var bqh = [sourceBQ, targetBQ];
    var redsj = [redsS, redsT];
    for (var h = 0; h < 2; h ++) {
      var elms = bqh [h].getElementsByTagName ("font");
      for (var i = 0; i < elms.length; i ++) {
        if (isRed (elms [i])) {
          if (("className" in elms [i]
               && elms [i].className
               == "akahuku_generated_link_child")
              || elms [i].hasAttribute ("__akahuku_troll")) {
            continue;
          }
          redsj [h].push (new RedData (elms[i], bqh [h]));
        }
      }
      elms = bqh [h].getElementsByTagName ("b");
      for (var i = 0; i < elms.length; i ++) {
        if (elms [i].parentNode.nodeName.toLowerCase () == "font"
            && isRed (elms [i].parentNode)) {
          continue; // 追加済のはず
        }
        redsj [h].push (new RedData (elms[i], bqh [h]));
      }
    }

    // 共通する赤字をリストから削除
    // (新しい赤字と消えた赤字が残される)
    for (var i = 0; i < redsS.length; i ++) {
      for (var j = 0; j < redsT.length; j ++) {
        if (redsT [j].text == redsS [i].text) {
          redsS.splice (i, 1);
          redsT.splice (j, 1);
          i --; // splice した分の調整
          break;
        }
      }
    }

    // 無くなった赤字行の削除
    for (var i = 0; i < redsT.length; i ++) {
      var next = null;
      for (var j = 0; j < redsT [i].siblings.length; j ++) {
        next = redsT [i].siblings [j].nextSibling;
        targetBQ.removeChild (redsT [i].siblings [j]);
      }
      if (next) {// 続くBRも削除
        targetBQ.removeChild (next);
      }
    }

    // 新しい赤字行の追加
    for (var i = redsS.length - 1; i >= 0; i --) {
      var br = targetBQ.ownerDocument.createElement ("br");
      if (targetBQ.firstChild) {
        targetBQ.insertBefore (br, targetBQ.firstChild);
      }
      else {
        targetBQ.appendChild (br);
      }
      for (var j = redsS [i].siblings.length - 1; j >= 0; j --) {
        targetBQ.insertBefore (redsS [i].siblings [j], targetBQ.firstChild);
      }
    }

    // 赤字変化を解析 (1番上のみ)
    if (redsS.length > 0) {
      ret.red = true;
      if (redsS [0].text.lastIndexOf
          // "削除されました"
          ("\u524A\u9664\u3055\u308C\u307E\u3057\u305F") >= 0) {
        ret.redType = "deleted";
        ret.deleted = true;
      }
      else if (redsS [0].text.lastIndexOf
          // (削除依頼によって) "隔離されました"
          ("\u9694\u96E2\u3055\u308C\u307E\u3057\u305F") >= 0) {
        ret.redType = "hidden";
        ret.deleted = true;
      }
      else if (redsS [0].text == "\u306A\u30FC") { //なー"
        ret.redType = "na";
        ret.deleted = true;
      }
    }
    return ret;
  },

  _syncMessageID : function (idS, bqT)
  {
    var idT = Akahuku.getMessageID (bqT);
    var ret = {id: idT, op: 0, err:false};
    if (idS == idT) {
      return ret;
    }
    else if (idS && !idT) { // ID挿入
      ret.err = !arAkahukuReload._insertMessageID (bqT, idS);
      ret.op = 1;
      ret.id = idS;
    }
    else if (!idS && idT) { // ID削除
      ret.err = !arAkahukuReload._removeMessageID (bqT, idT);
      ret.op = -1;
    }
    return ret;
  },

  _insertMessageID : function (bqnode, id) {
    var node = bqnode.previousElementSibling;
    while (node) {
      if (node.matches ("span.cnw")) {
        var cnw = node;
        // insert to the last text-node child
        node = node.lastChild;
        while (node) {
          if (node.nodeType === node.TEXT_NODE) {
            var t = node.textContent;
            t = t.replace (/(?: ID:[A-Za-z0-9.\/]{8}| ?$)/, " ID:" + id);
            if (node.textContent != t) {
              node.textContent = t;
              return true;
            }
            break;
          }
          node = node.previousSibling;
        }
        // create if no text-node child exists
        cnw.appendChild (cnw.ownerDocument.createTextNode (" ID:" + id));
        return true;
      }
      node = node.previousElementSibling;
    }
    // old layout(-2019/11/18)
    var regexpTimeNum = /^(.*[0-9]+\/[0-9]+\/[0-9]+\([^\)]+\)[0-9]+:[0-9]+(?::[0-9]+)?) (No\.[1-9][0-9]*.*)$/;
    var nextToNum = false;
    var lastText = "";
    node = bqnode.previousSibling;
    while (node) {
      var text = "";
      if (node.nodeType === node.TEXT_NODE) {
        text = node.nodeValue;
        if (nextToNum) { //No.を含むノードの前のテキストノード末尾に
          node.nodeValue = text.replace
            (/ ?$/, " ID:" + id + (/^ /.test (lastText) ? "" : " "));
          return true;
        }
        if (node.nodeValue.match (regexpTimeNum)) {
          // 日付もNo.も含むテキストノード (標準)
          node.nodeValue = RegExp.$1 + " ID:" + id + " " + RegExp.$2;
          return true;
        }
      }
      else if (node.nodeType === node.ELEMENT_NODE) {
        if (/^br$/i.test (node.nodeName)) {
          lastText = "";
        }
        else if (!(/^(font|b|a)$/i.test (node.nodeName))) {
          text = arAkahukuDOM.getInnerText (node);
        }
      }
      if (text.length > 0) {
        lastText = text + lastText;
        nextToNum = nextToNum || /\bNo\.[1-9][0-9]*/.test (lastText);
      }
      node = node.previousSibling;
    }
    if (Akahuku.debug.enabled) {
      Akahuku.debug.warn ("_insertMessageID failed: '" + lastText + "'");
    }
    return false;
  },
  _removeMessageID : function (bqnode, optId) {
    var pattern = /^(.*)(\bID:[A-Za-z0-9.\/]{8}) ?(No\.[0-9]*)?$/;
    if (optId) {
      optId = optId.replace (/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
      pattern = new RegExp ("^(.*)(\\bID:" + optId + ") ?(.*)$");
    }
    var node = bqnode.previousElementSibling;
    while (node) {
      if (node.matches ("span.cnw")) {
        node = node.lastChild;
        while (node) {
          if (node.nodeType === node.TEXT_NODE) {
            if (node.nodeValue.match (pattern)) {
              var t = RegExp.$1 + RegExp.$3;
              if (/^\s*$/.test (t)) {
                node.parentNode.removeChild (node);
              }
              else {
                node.nodeValue = RegExp.$1 + RegExp.$3;
              }
              return true;
            }
          }
          node = node.previousSibling;
        }
        return false;
      }
      node = node.previousElementSibling;
    }
    // old layout(-2019/11/18)
    node = bqnode.previousSibling;
    while (node) {
      if (node.nodeType === node.TEXT_NODE) {
        if (node.nodeValue.match (pattern)) {
          node.nodeValue = RegExp.$1 + RegExp.$3;
          return true;
        }
      }
      node = node.previousSibling;
    }
    return false;
  },

  _getMessageSod : function (elm) {
    var ret = {elem:null, text:"", num:0};
    while (elm) {
      if ("className" in elm && elm.className == "sod") {
        ret.elem = elm;
        var t = arAkahukuDOM.getInnerText (elm);
        var re = t.match (/\d+$/);
        if (re) {
          ret.num = parseInt (re [0]) || 0;
          ret.text = t.substr (0, t.length - re [0].length);
        }
        else {
          ret.text = t
        }
        return ret;
      }
      elm = elm.previousSibling;
    }
    return ret;
  },

  _syncMessageSod : function (bqS, bqT) {
    var sodT = arAkahukuReload._getMessageSod (bqT.previousSibling);
    var sodS;
    if (typeof bqS == "string") {// for json
      sodS = {elem: null, text: "", num: parseInt(bqS)};
      sodS.elem = bqT.ownerDocument.createElement("span");
      if (bqS) {
        sodS.text = "\u305D\u3046\u3060\u306Dx"; //"そうだねx"
        sodS.elem.textContent = sodS.text + bqS;
      }
    }
    else {
      sodS = arAkahukuReload._getMessageSod (bqS.previousSibling);
    }
    if (sodS.elem && sodT.elem) {
      if (sodS.text != sodT.text
          || sodS.num > sodT.num) {
        // 投票後に数が巻き戻らないよう増加のみ反映
        sodT.elem.innerHTML = sodS.elem.innerHTML;
      }
    }
    else if (!sodS.elem && sodT.elem) {
      sodT.elem.parentNode.removeChild (sodT.elem);
    }
  },
};
