/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: Akahuku, arAkahukuConfig, arAkahukuConverter, arAkahukuDelBanner,
 *          arAkahukuDocumentParam, arAkahukuDOM, arAkahukuFile, arAkahukuLink,
 *          arAkahukuP2P, arAkahukuSound, arAkahukuThread, arAkahukuCompat
 */

/**
 * リダイレクトページのキャッシュ書き込み
 *   Inherits From: nsICacheEntryOpenCallback
 */
function arAkahukuMHTRedirectCacheWriter () {
}
arAkahukuMHTRedirectCacheWriter.prototype = {
  body : "",      /* String  本体 */
    
  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheEntryOpenCallback.onCacheEntryAvailable
   * 差分位置を取得する
   *
   * @param  nsICacheEntry descriptor
   *         キャッシュの情報
   * @param  boolean isNew
   * @param  nsIApplicationCache appCache
   * @param  nsresult status
   */
  onCacheEntryAvailable : function (descriptor, isNew, appCache, status) {
    if (descriptor && Components.isSuccessCode (status)) {
      /* キャッシュの書き込み */
            
      descriptor.setExpirationTime ((new Date ()).getTime () / 1000
                                    + 10 * 24 * 60 * 60);
            
      var ostream = descriptor.openOutputStream (0);
      ostream.write (this.body, this.body.length);
      ostream.flush ();
      ostream.close ();
            
      descriptor.markValid ();
            
      var responseHead
      = "HTTP/1.1 200 OK\r\n"
      + "Date: " + (new Date ()).toString () + "\r\n"
      + "Server: unknown\r\n"
      + "Content-Type: text/html; charset=Shift_JIS\r\n";
      var charset = "Shift_JIS";
            
      descriptor.setMetaDataElement ("request-method", "GET");
      descriptor.setMetaDataElement ("response-head",
                                     responseHead);
      descriptor.setMetaDataElement ("charset", charset);
            
      descriptor.close ();
    }
    else if (Akahuku.debug.enabled) {
      var errorStatus = arAkahukuUtil.resultCodeToString (status);
      Akahuku.debug.warn
        ("arAkahukuMHTRedirectCacheWriter.onCacheEntryAvailable: "
         + "failed with " + errorStatus);
    }
  },
  onCacheEntryCheck : function (entry, appCache) {
    try {
      entry.dataSize;
    }
    catch (e if e.result == Components.results.NS_ERROR_IN_PROGRESS) {
      return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
    }
    return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
  },
  mainThreadOnly : true,
};
/**
 * P2P キャッシュの情報
 *   Inherits From: nsICacheEntryDescriptor
 *
 * @param  nsILocalFile targetFile
 *         P2P のキャッシュファイル
 */
function arAkahukuP2PCacheEntryDescriptor (targetFile, ownerDocument) {
  this.targetFile = targetFile;
  this.fstream = null;
  this.dataSize = this.targetFile.fileSize;
  this.ownerDocument = ownerDocument;
}
arAkahukuP2PCacheEntryDescriptor.prototype = {
  targetFile : null,  /* nsILocalFile  P2P のキャッシュファイル */
  fstream : null,     /* nsIFileInputStream  キャッシュファイルの
                       *   入力ストリーム */
    
  dataSize : 0,       /* Number  キャッシュファイルのサイズ */
    
  /* 他に渡すわけではないので QueryInterface は要らない */
    
  /**
   * 入力ストリームを開く
   *   nsICacheEntryDescriptor.openInputStream
   *
   * @param  Number offset
   *         ファイルのオフセット
   *         無視する
   * @return nsIFileInputStream
   *         キャッシュファイルの入力ストリーム
   */
  openInputStream : function (offset) {
    this.fstream
    = arAkahukuFile.createFileInputStream
    (this.targetFile, 0x01, 292/*0444*/, 0,
     this.ownerDocument.defaultView);
        
    return this.fstream;
  },
    
  /**
   * メタデータを返す
   * ただしエラー回避のためなので何も返さない
   *
   * @param  String name
   *         メタデータの名前
   * @return String
   *         メタデータ
   */
  getMetaDataElement : function (name) {
    return "";
  },
    
  /**
   * 入力ストリームを閉じる
   *   nsICacheEntryDescriptor.close
   */
  close : function () {
    try {
      if (this.fstream)
        this.fstream.close ();
    }
    catch (e) {
      // 既に close 済みの場合など
    }
    this.targetFile = null;
    this.ownerDocument = null;
  }
};
/**
 * mht ファイルデータ
 *   Inherits From: nsICacheEntryOpenCallback
 *                  nsIStreamListener, nsIRequestObserver
 */
function arAkahukuMHTFileData () {
  this.status = arAkahukuMHT.FILE_STATUS_NA_CACHE;
  this.anchor_status = arAkahukuMHT.FILE_ANCHOR_STATUS_NA;
  this.type = arAkahukuMHT.FILE_TYPE_IMG;
}
arAkahukuMHTFileData.prototype = {
  status : 0,            /* Number  ファイル取得の状況 */
  statusMessage : "",    /* String  取得失敗結果詳細 */
  anchor_status : 0,     /* Number  a 要素での取得の進行状況 */
  type : 0,              /* Number  参照元のノードの種類 */
  node : null,           /* HTMLElement  参照元のノード */
  ownerDocument : null,  /* HTMLDocument 処理元のドキュメント */
    
  location : false,      /* String  本来のアドレス
                          *   Content-Location に使用する */
  currentlocation : "",  /* String  取得対象のファイルのアドレス */
  imageLocation : "",    /* String  a 要素の転送先のアドレス
                          *   Content-Disposition に使用する*/
  originalLocation : "", /* String  取得開始時のアドレス
                          *   重複チェックに使用する */
    
  content : "",          /* String  base64 でエンコードしたファイルのデータ */
  originalContent : "" , /* String  ファイルのデータ */
  encoding : "",         /* String  Content-Transfer-Encoding の値 */
  contentType : "",      /* String  Content-Type の値 */
  disposition : "",      /* String  Content-Disposition の値 */
  redName : "",          /* String  元画像のリダイレクト先 */
    
  cache : "",            /* String  mht ファイル内のデータ
                          *   ヘッダ+ファイル */
    
  useNetwork : true,    /* Boolean  ネットワークからも取得するか */
  channel : null,       /* nsIChannel  ネットワーク取得用チャネル */
  delay : 0,            /* Number  ネットワーク取得のディレイ */
  converting : false,   /* Boolean  キャッシュ変換中 */

  setLocations : function (url) {
    this.location = url;
    this.currentLocation = url;
    this.originalLocation = url;
    var uriParam
      = Akahuku.protocolHandler.getAkahukuURIParam (url);
    if ("original" in uriParam) {
      url = uriParam.original;
      switch (uriParam.type) {
        case "cache":
          this.currentLocation = url;
        case "p2p":
          this.location = url;
      }
    }
  },
    
  /**
   * データを開放する
   */
  destruct : function () {
    this.status = arAkahukuMHT.FILE_STATUS_NG;
    this.statusMessage = "";
        
    this.node = null;
    this.ownerDocument = null;
    this.content = "";
    this.originalContent = "";
  },
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsICacheOpenCallback
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsISupportsWeakReference)
        || iid.equals (Components.interfaces.nsIStreamListener)
        || iid.equals (Components.interfaces.nsIRequestObserver)
        || iid.equals (arAkahukuCompat.CacheStorageService.CallbackInterface)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
  },
    
  /**
   * ファイルの取得を開始する
   *
   * @param  String location
   *         取得対象の URI
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   *         避難所用
   */
  getFile : function (location, targetDocument) {
    var window = this.ownerDocument.defaultView;
    if (this.status == arAkahukuMHT.FILE_STATUS_NA_NET) {
      window.setTimeout
      ((function (file, location) {
          return function () {
            var ios
            = Components.classes ["@mozilla.org/network/io-service;1"]
            .getService (Components.interfaces.nsIIOService);
            file.channel 
            = ios.newChannel (location, null, null);
            arAkahukuUtil.setChannelContext (file.channel, file.ownerDocument);

            try {
              file.channel.asyncOpen (file, null);
            }
            catch (e) {
            
              /* 状態を取得不可に設定する */
              file.channel = null;
              file.status = arAkahukuMHT.FILE_STATUS_NG;
              file.statusMessage = "Error (net):" + e.message;
              file.anchor_status = arAkahukuMHT.FILE_ANCHOR_STATUS_NG;
            }
          };
        })(this, location), this.delay);
            
      return;
    }
    
    /* 避難所 patch */
    if (targetDocument) {
      var info
      = Akahuku.getDocumentParam (targetDocument).location_info;
            
      if (info.isMonaca) {
        if (location.match (/red\/[0-9]+\.htm$/)) {
          location
            = location.replace (/red\/[0-9]+\.htm$/,
                                "src/" + this.redName);
                    
          this.imageLocation = location;
          this.currentLocation = location;
          this.disposition
            = "attachment; filename=" + this.imageLocation;
          this.anchor_status
            = arAkahukuMHT.FILE_ANCHOR_STATUS_HTML;
          
          this.getFile (this.currentLocation, targetDocument);
                    
          return;
        }
      }
    }
    
    var uinfo = null;
    var isP2P = false;
    
    if (arAkahukuP2P.enable) {
      var uinfo = arAkahukuImageURL.parse (location, false, true);
      if (!(uinfo && uinfo.isImage)) {
        uinfo = null;
      }
    }
        
    if (uinfo) {
      /* P2P の場合は P2P のキャッシュから取得する */
      if (uinfo.leafName.length == 17) {
        /* 末尾にランダム文字列が付いている場合、取り除く */
        uinfo.leafName
        = uinfo.leafName.substr (0, uinfo.leafName.length - 4);
      }
            
      var targetFileName
      = arAkahukuP2P.cacheBase
      + arAkahukuFile.separator
      + uinfo.server
      + arAkahukuFile.separator
      + uinfo.dir
      + arAkahukuFile.separator
      + uinfo.type
      + arAkahukuFile.separator
      + uinfo.leafNameExt;
            
      var targetFile
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
      targetFile.initWithPath (targetFileName);
      if (targetFile.exists ()) {
        if (uinfo.isRedirect) {
          location
            = location.replace (/(red|d)\/[0-9]+\.[a-z]+/,
                                "src/" + this.redName);
          this.imageLocation = location;
          this.currentLocation = location;
          this.disposition
            = "attachment; filename=" + this.imageLocation;
          this.anchor_status
            = arAkahukuMHT.FILE_ANCHOR_STATUS_HTML;
        }
        var descriptor
          = new arAkahukuP2PCacheEntryDescriptor (targetFile, this.ownerDocument);
        this.onCacheEntryAvailable (descriptor, false, null, 0);
        return;
      }

      if (!uinfo.isRedirect) {
        if (!this.useNetwork) {
          /* 状態を取得不可に設定する */
          this.status = arAkahukuMHT.FILE_STATUS_NG;
          this.statusMessage = "Not found in P2P cache";
          this.anchor_status = arAkahukuMHT.FILE_ANCHOR_STATUS_NG;
        }
        else {
          this.status = arAkahukuMHT.FILE_STATUS_NA_NET;
          this.getFile (location, targetDocument);
        }
                
        return;
      }
    }
    
    try {
      if (typeof (Components.interfaces.nsIIDNService) != "undefined") {
        if (location.match (/^([A-Za-z0-9]+):\/\/([^\/]+)\/(.+)/)) {
          var protocol = RegExp.$1;
          var host = RegExp.$2;
          var path = RegExp.$3;
                    
          var idn
          = Components.classes
          ["@mozilla.org/network/idn-service;1"].
          getService (Components.interfaces.nsIIDNService);
                
          host = unescape (host);
          host = idn.convertUTF8toACE (host);
          location = protocol + "://" + host + "/" + path;
        }
      }
      
      Akahuku.Cache.asyncOpenCacheToRead
        ({url: location, triggeringNode: targetDocument}, this);
    }
    catch (e) { Akahuku.debug.exception (e);
      /* キャッシュが存在しなかった場合 */
            
      if (!this.useNetwork) {
        this.node.src = "";
        this.status = arAkahukuMHT.FILE_STATUS_NG;
        this.statusMessage = "Error (cache):" + e.message;
      }
      else {
        this.status = arAkahukuMHT.FILE_STATUS_NA_NET;
        this.getFile (this.location, null);
      }
    }
  },

  asyncGetFileData : function (source, byteSize) {
    var fileData = this;
    var url = (this.imageLocation ? this.imageLocation : this.location);
    arAkahukuUtil.asyncFetchBinary (source, byteSize, function (binstream, result) {
      if (Components.isSuccessCode (result)) {
        try {
          var bindata = binstream.readBytes (byteSize);
          binstream.close ();
          fileData.originalContent = bindata;
          fileData.content = btoa (bindata);
        }
        catch (e) { Akahuku.debug.exception (e);
          result = e.result;
        }
      }
      if (!Components.isSuccessCode (result)) {
        if (Akahuku.debug.enabled) {
          Akahuku.debug.warn ("arAkahukuMHTFileData.asyncGetFileData resulted in " +
            arAkahukuUtil.resultCodeToString (result) + " for " + url);
        }
        if (fileData.status != arAkahukuMHT.FILE_STATUS_NA_NET
          && fileData.useNetwork) {
          fileData.status = arAkahukuMHT.FILE_STATUS_NA_NET;
          fileData.getFile (fileData.location, null);
          return;
        }
        fileData.originalContent = "";
        fileData.content = "";
        if (fileData.status == arAkahukuMHT.FILE_STATUS_NA_NET)
          fileData.statusMessage = "Error (net):";
        else
          fileData.statusMessage = "Error (cache):";
        fileData.statusMessage += arAkahukuUtil.resultCodeToString (result);
      }
      fileData.onGetFileData ();
    });
  },
    
  /**
   * ファイルを取得したイベント
   */
  onGetFileData : function () {
    if (this.type == arAkahukuMHT.FILE_TYPE_IMG) {
      if (this.content.length == 0) {
        /* キャッシュが破損している場合 */
        
        this.node.src = "";
        this.status = arAkahukuMHT.FILE_STATUS_NG;
        if (!this.statusMessage)
          this.statusMessage = "Data length is 0";
      }
      else {
        this.status = arAkahukuMHT.FILE_STATUS_OK;
      }
    }
    else {
      if (this.anchor_status
          == arAkahukuMHT.FILE_ANCHOR_STATUS_NA) {
                
        /* a 要素のリンク対象の場合 */
        if (this.contentType == "text/html"
            || this.location.match (/\/(red|d)\/[0-9]+\.[a-z]+/)) {
          var text = this.originalContent;
                    
          var result = Akahuku.getSrcURL (text, this.location);
          if (result [0]) {
            /* 対象が html ファイルであり
             * かつリフレッシュ先が見付かった場合  */
            this.imageLocation = result [0];
            this.disposition
              = "attachment; filename=" + this.imageLocation;
            this.imageLocation
              = arAkahukuP2P.tryEnP2P (this.imageLocation);
            this.anchor_status
              = arAkahukuMHT.FILE_ANCHOR_STATUS_HTML;
                        
            this.getFile (this.imageLocation, null);
          }
          else {
            /* 対象が html ファイルであり
             * かつリフレッシュ先が見付からなかった場合  */
                            
            /* 状態を取得不可に設定する */
            /* リンクの場合にはキャッシュのみなので即 NG */
            this.status = arAkahukuMHT.FILE_STATUS_NG;
            this.statusMessage = "Not found in cache (link)";
            this.anchor_status
            = arAkahukuMHT.FILE_ANCHOR_STATUS_NG;
          }
        }
        else {
          /* 対象が html でない場合 */
                        
          if (this.content.length == 0) {
            /* キャッシュが破損している場合 */
                            
            /* 状態を取得不可に設定する */
            /* リンクの場合にはキャッシュのみなので即 NG */
            if (this.node && "src" in this.node) {
              this.node.src = "";
            }
            this.status = arAkahukuMHT.FILE_STATUS_NG;
            if (!this.statusMessage)
              this.statusMessage = "Data length is 0";
          }
          else {
            /* 状態を取得完了に設定する */
            this.status = arAkahukuMHT.FILE_STATUS_OK;
            this.anchor_status
            = arAkahukuMHT.FILE_ANCHOR_STATUS_IMAGE;
          }
        }
      }
      else if (this.anchor_status
               == arAkahukuMHT.FILE_ANCHOR_STATUS_HTML) {
        /* リフレッシュ先の場合 */
                    
        if (this.content.length == 0) {
          /* キャッシュが破損している場合 */
                        
          /* 状態を取得不可に設定する */
          /* リンクの場合にはキャッシュのみなので即 NG */
          if (this.node && "src" in this.node) {
            this.node.src = "";
          }
          this.status = arAkahukuMHT.FILE_STATUS_NG;
          if (!this.statusMessage)
            this.statusMessage = "Data length is 0";
        }
        else {
          /* 状態を取得完了に設定する */
          this.status = arAkahukuMHT.FILE_STATUS_OK;
          this.anchor_status
          = arAkahukuMHT.FILE_ANCHOR_STATUS_IMAGE;
        }
      }
    }
  },
    
  /**
   * ファイル情報を取得する
   *
   * @param  nsICacheEntry entry
   *         キャッシュの情報
   */
  asyncGetFileDataFromCacheEntry : function (entry) {
    var url = (this.imageLocation ? this.imageLocation : this.location);
    this.contentType = arAkahukuUtil.getMIMETypeFromURI (url);
    this.encoding = "base64";

    var head = "";
    try {
      head = entry.getMetaDataElement ("response-head");
    }
    catch (e) { Akahuku.debug.exception (e);
    }

    if (head.match (/content-encoding[ \r\n\t]*:[ \r\n\t]*(compress|deflate|gzip|x-compress|x-gzip)/i)) {
      var encoding = (RegExp.$1).toLowerCase ();

      try {
        var converter
          = Components.classes
          ["@mozilla.org/streamconv;1?from="
           + encoding + "&to=uncompressed"]
          .createInstance
          (Components.interfaces.nsIStreamConverter);
        converter.asyncConvertData (encoding, "uncompressed", this, null);

        var istream = entry.openInputStream (0);
        if (istream.isNonBlocking ()) { // cache v2
          var pump
            = Components.classes
            ["@mozilla.org/network/input-stream-pump;1"]
            .createInstance (Components.interfaces.nsIInputStreamPump);
          pump.init (istream, -1, -1, 0, 0, true);
          pump.asyncRead (converter, null);
          this.converting = true;
          return;
        }
        var listener
          = converter.QueryInterface
          (Components.interfaces.nsIStreamListener);
        listener.onStartRequest (null, null);
        listener.onDataAvailable (null, null, istream, 0, entry.dataSize);
        istream.close ();
        this.converting = true;
        listener.onStopRequest (null, null, 0);
      }
      catch (e) { Akahuku.debug.exception (e);
        this.originalContent = "";
        this.content = "";
        this.statusMessage = "Error in deflate (cache):" + e.message;
        this.onGetFileData ();
      }
      return;
    }

    var source = entry.openInputStream (0);
    if (entry instanceof arAkahukuP2PCacheEntryDescriptor) {
      // asyncGetFileData (arAkahukuUtil.asyncFetch) で
      // ファイルを読み込むには nsIInputStream は問題ありのため
      source = entry.targetFile;
    }
    this.asyncGetFileData (source, entry.dataSize);
  },

  /**
   * キャッシュエントリが使用可能になったイベント
   *   nsICacheEntryOpenCallback.onCacheEntryAvailable
   *
   * @param  nsICacheEntry entry
   *         キャッシュの情報
   * @param  boolean isNew
   * @param  nsIApplicationCache appCache
   * @param  nsresult status
   */
  onCacheEntryAvailable : function (entry, isNew, appCache, status) {
    var httpStatus = 200;
    var httpStatusText = "";
    try {
      var text = (entry ? entry.getMetaDataElement ("response-head") : null);
      if (text && text.match (/HTTP\/[0-9]\.[0-9] ([0-9]+) ([^\r\n]+)/)) {
        httpStatus = parseInt (RegExp.$1);
        httpStatusText = RegExp.$1 + " " + RegExp.$2;
      }
      
      if (text && text.match (/Location:[ \t]*([^\r\n]+)/)) {
        /* リダイレクト */
        var location = RegExp.$1;
        this.status = arAkahukuMHT.FILE_STATUS_NA_CACHE;
        this.getFile (location, null);
        return;
      }
    }
    catch (e) { Akahuku.debug.exception (e);
    }
    
    try {
    if (this.type == arAkahukuMHT.FILE_TYPE_IMG) {
      if (entry && httpStatus >= 200 && httpStatus <= 299) {
        /* アクセス権が取得できた場合 */
        
        this.asyncGetFileDataFromCacheEntry (entry);
      }
      else {
        /* アクセス権が取得できなかった場合 */
        
        if (!this.useNetwork) {
          /* 状態を取得不可に設定する */
          this.node.src = "";
          this.status = arAkahukuMHT.FILE_STATUS_NG;
          if (entry) {
            this.statusMessage = "Found in cache but " + httpStatusText;
          }
          else {
            this.statusMessage = "Not found in cache";
            if (!Components.isSuccessCode (status)
                && status != Components.results.NS_ERROR_CACHE_KEY_NOT_FOUND) {
              this.statusMessage += ":" + arAkahukuUtil.resultCodeToString (status);
            }
          }
        }
        else {
          this.status = arAkahukuMHT.FILE_STATUS_NA_NET;
          this.getFile (this.location, null);
        }
      }
    }
    else {
      if (entry && httpStatus >= 200 && httpStatus <= 299) {
        /* アクセス権が取得できた場合 */
        if (this.anchor_status
            == arAkahukuMHT.FILE_ANCHOR_STATUS_NA) {
                    
          /* a 要素のリンク対象の場合 */
                    
          this.asyncGetFileDataFromCacheEntry (entry);
        }
        else if (this.anchor_status
                 == arAkahukuMHT.FILE_ANCHOR_STATUS_HTML) {
          /* リフレッシュ先の場合 */
                    
          this.asyncGetFileDataFromCacheEntry (entry);
        }
      }
      else {
        /* アクセス権が取得できなかった場合
         * もしくはファイルが消えていた場合 */
                
        if (this.status == arAkahukuMHT.FILE_STATUS_NA_CACHE) {
          /* バックアップキャッシュから取得する */
          this.status = arAkahukuMHT.FILE_STATUS_NA_CACHE_BACKUP;
          
          try {
            Akahuku.Cache.asyncOpenCacheToRead
              ({url: this.location + ".backup",
                triggeringNode: this.ownerDocument},
               this);
          }
          catch (e) { Akahuku.debug.exception (e);
            this.status = arAkahukuMHT.FILE_STATUS_NG;
            this.statusMessage = "Error (cache):" + e.message;
            this.anchor_status = arAkahukuMHT.FILE_ANCHOR_STATUS_NG;
          }
        }
        else {
          /* 状態を取得不可に設定する */
          /* リンクの場合にはキャッシュのみなので即 NG */
          this.status = arAkahukuMHT.FILE_STATUS_NG;
          if (entry) {
            this.statusMessage = "Found in cache but " + httpStatusText;
          }
          else {
            this.statusMessage = "Not found in cache";
            if (!Components.isSuccessCode (status)
                && status != Components.results.NS_ERROR_CACHE_KEY_NOT_FOUND) {
              this.statusMessage += ":" + arAkahukuUtil.resultCodeToString (status);
            }
          }
          this.anchor_status = arAkahukuMHT.FILE_ANCHOR_STATUS_NG;
        }
      }
    }
    }
    catch (e) { Akahuku.debug.exception (e);
      this.status = arAkahukuMHT.FILE_STATUS_NG;
      this.statusMessage = "Error (cache):" + e.message;
      if (this.type != arAkahukuMHT.FILE_TYPE_IMG) {
        this.anchor_status = arAkahukuMHT.FILE_ANCHOR_STATUS_NG;
      }
    }
        
    if (entry) {
      entry.close ();
    }
  },
  onCacheEntryCheck : function (entry, appCache) {
    try {
      entry.dataSize;
    }
    catch (e if e.result == Components.results.NS_ERROR_IN_PROGRESS) {
      return arAkahukuCompat.CacheEntryOpenCallback.RECHECK_AFTER_WRITE_FINISHED;
    }
    return arAkahukuCompat.CacheEntryOpenCallback.ENTRY_WANTED;
  },
  mainThreadOnly : true,
    
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
    this.originalContent = "";
    this.content = "";
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
    if (!Components.isSuccessCode (statusCode)) {
      // cancel された場合
      this.channel = null;
      this.originalContent = "";
      if (request instanceof Components.interfaces.nsIHttpChannel)
        this.statusMessage = "Error (net):";
      else
        this.statusMessage = "Error (cache):";
      this.statusMessage += arAkahukuUtil.resultCodeToString (statusCode);
      this.onGetFileData (); // エラー処理のため
      return;
    }
    if (this.converting) {
      this.content = btoa (this.originalContent);
      this.onGetFileData ();
    }
    else {
      var httpStatus = 0;
      try {
        httpStatus
          = request.QueryInterface
          (Components.interfaces.nsIHttpChannel)
          .responseStatus;
      }
      catch (e) {
      }
      
      if (httpStatus >= 400) {
        /* エラーページ */
        this.originalContent = "";
        this.statusMessage = "";
        switch (this.status) {
          case arAkahukuMHT.FILE_STATUS_NA_NET:
            this.statusMessage = "Error (net): ";
            break;
          case arAkahukuMHT.FILE_STATUS_NA_CACHE:
          case arAkahukuMHT.FILE_STATUS_NA_CACHE_BACKUP:
            this.statusMessage = "Found in cache but ";
            break;
        }
        this.statusMessage += httpStatus;
      }
            
      this.channel = null;
      this.content = btoa (this.originalContent);
            
      var url = (this.imageLocation ? this.imageLocation : this.location);
      this.contentType = arAkahukuUtil.getMIMETypeFromURI (url);
      this.encoding = "base64";
      this.onGetFileData ();
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
    var bstream
    = Components.classes ["@mozilla.org/binaryinputstream;1"]
    .createInstance (Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream (inputStream);
    this.originalContent += bstream.readBytes (count);
  }
};
/**
 * mht ファイル作成管理データ
 */
function arAkahukuMHTParam (targetDocument) {
  this.files = new Array ();
  this.previewSaveUrls = new Object ();
  this.previewTotalUrls = new Object ();
  this.targetDocument = targetDocument;
}
arAkahukuMHTParam.prototype = {
  isBusy : false,        /* Boolean  保存中かどうか */
  checkTimerID : null,   /* Number  ファイルチェックのタイマー ID */
  files : null,          /* Array  mht ファイルデータ
                          *   [arAkahukuMHTFileData, ...] */
  file : null,           /* nsILocalFile  保存先のファイル */
  tmpFile : null,        /* nsILocalFile  一時保存先のファイル */
  targetDocument : null, /* HTMLDocument  対象のドキュメント */
  cloneDocument : null,  /* HTMLDocument  処理中のドキュメント */
    
  /**
   * データを開放する
   */
  destruct : function () {
    var window = this.targetDocument.defaultView;
    if (window && this.checkTimerID != null) {
      window.clearInterval (this.checkTimerID);
    }
    this.checkTimerID = null;
        
    for (var i = 0; i < this.files.length; i ++) {
      try {
        this.files [i].destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    this.files = null;
        
    this.file = null;
    this.targetDocument = null;
    this.cloneDocument = null;
    this.isBusy = false;
    if (arAkahukuMHT.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
  }
};
/**
 * mht ファイル作成管理
 *   [[MHT で保存] ボタン]
 *   [[保存用に整形] ボタン]
 */
var arAkahukuMHT = {
  enable : false,                   /* Boolean  mht で保存 */
  base : "",                        /* String  保存先のディレクトリ */
    
  defaultType : "simple",           /* String  デフォルトのファイル名
                                     *   simple: 簡易設定
                                     *   expert: 詳細設定 */
  enableDefaultServer : false,      /* Boolean  サーバ名 */
  enableDefaultDir : false,         /* Boolean  ディレクトリ名 */
  enableDefaultThread : false,      /* Boolean  スレの番号 */
  enableDefaultTitle : false,       /* Boolean  タイトル */
  defaultFormat : "",               /* String  フォーマット */
    
  enableAuto : false,               /* Boolean  ファイル選択を省く */
  enableAutoUnique : false,         /* Boolean  上書きしない */
  enableAutoSaveAs : false,         /* Boolean  別名で保存ボタン */
  enableImagelink : false,          /* Boolean  サムネ表示の場合に
                                     *   元画像も保存する*/
  enableImagelinkThread : false,    /* Boolean  スレ画像のみ */
  enableImagelinkPerThread : false, /* Boolean  スレごとに設定 */
  enablePreview : false,            /* Boolean  プレビューで表示中の
                                     *   画像も保存する */
  enablePreviewCount : false,       /* Boolean  保存した数と総数を表示する */
  enableAimaHideEntireRes : false,  /* Boolean  合間合間に で消したレスを
                                     *   無かった事にする */
  enableAimaShowRes : false,        /* Boolean  合間合間に で消したレスを
                                     *   復活させる */
  enableCloseNoCacheList : false,   /* Boolean  キャッシュに無かったファイルの
                                     *   リストを閉じる */
  enableUseNetwork : false,         /* Boolean  ネットワークからも取得する
                                     *   (元画像以外) */
  enableUseP2P : false,             /* Boolean  元画像を P2P から
                                     *   取得するボタン */
  enableNolimit : false,            /* Boolean  保存中はスクリクトの
                                     *   制限時間を n 秒にする */
  limitTime : 0,                    /* Number  実行時間 */
  enableUse8bit : false,            /* Boolean  HTML 部分を
                                     *   8bit で保存する */
    
  enableCleanup : false,            /* Boolean  [保存用に整形] ボタン */
    
  enableShortcut : false,           /* Boolean  ショートカット */
  shortcutKeycode : 0,              /* Number  ショートカットキーのキーコード */
  shortcutModifiersAlt : false,     /* Boolean  ショートカットキーの Alt */
  shortcutModifiersCtrl : false,    /* Boolean  ショートカットキーの Ctrl */
  shortcutModifiersMeta : false,    /* Boolean  ショートカットキーの Meta */
  shortcutModifiersShift : false,   /* Boolean  ショートカットキーの Shift */
    
  /**
   * arAkahukuMHTFileData.status の値
   *
   *   FILE_STATUS_NA_CACHE - キャッシュから取得中
   *   FILE_STATUS_NA_CACHE_BACKUP - バックアップキャッシュから取得中
   *   FILE_STATUS_NA_NET - ネットワークから取得中
   *   FILE_STATUS_OK - 取得済み
   *   FILE_STATUS_NG - 取得失敗
   */
  FILE_STATUS_NA_CACHE : 0,
  FILE_STATUS_NA_CACHE_BACKUP : 1,
  FILE_STATUS_NA_NET : 2,
  FILE_STATUS_OK : 3,
  FILE_STATUS_NG : -1,
    
  /**
   * arAkahukuMHTFileData.type の値
   *
   *   FILE_TYPE_IMG    - img 要素
   *   FILE_TYPE_ANCHOR - a 要素
   */
  FILE_TYPE_IMG : 0,
  FILE_TYPE_ANCHOR : 1,
    
  /**
   * arAkahukuMHTFileData.anchor_status の値
   *
   * FILE_ANCHOR_STATUS_NA    - 未取得
   * FILE_ANCHOR_STATUS_HTML  - HTML のみ取得済み (取得状況としては途中)
   * FILE_ANCHOR_STATUS_IMAGE - 画像も取得済み
   * FILE_ANCHOR_STATUS_NG    - 取得失敗
   */
  FILE_ANCHOR_STATUS_NA : 0,
  FILE_ANCHOR_STATUS_HTML : 1,
  FILE_ANCHOR_STATUS_IMAGE : 2,
  FILE_ANCHOR_STATUS_NG : -1,
    
  lastFilename : "", /* String  最後に保存したファイル名 */
    
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
            
      if (arAkahukuMHT.enableCleanup) {
        style
        .addRule ("#akahuku_cleanup_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_cleanup_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_cleanup_container",
                  "font-size: 9pt; "
                  + "clear: left;");
      }
      if (arAkahukuMHT.enable) {
        var x_uri
        = Akahuku.protocolHandler.enAkahukuURI
        ("preview", "chrome://akahuku/content/images/check_x.png");
        var o_uri
        = Akahuku.protocolHandler.enAkahukuURI
        ("preview", "chrome://akahuku/content/images/check_o.png");
                
        style
        .addRule ("#akahuku_savemht_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_saveas_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_saveas_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_p2p_button",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_p2p_button:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_error",
                  "font-size: 9pt; "
                  + "color: #ff0000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_status",
                  "font-size: 9pt;"
                  + "clear: left;")
        .addRule ("#akahuku_savemht_container",
                  "font-size: 9pt; "
                  + "clear: left;")
        .addRule ("#akahuku_savemht_progress",
                  "font-size: 9pt;")
        .addRule ("#akahuku_savemht_progress_error",
                  "font-size: 9pt; "
                  + "color: #ff0000;")
        .addRule ("#akahuku_savemht_opennocachelist",
                  "cursor: pointer; "
                  + "color: #0040ee; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_opennocachelist:hover",
                  "cursor: pointer; "
                  + "color: #ff4000; "
                  + "background-color: inherit;")
        .addRule ("#akahuku_savemht_nocachelist",
                  "margin-left: 1em;")
        .addRule ("div.akahuku_savemht_imagelink_check[title='x']",
                  "width: 16px; "
                  + "height: 16px; "
                  + "float: left; "
                  + "background-image: url('" + x_uri + "'); ")
        .addRule ("div.akahuku_savemht_imagelink_check[title='o']",
                  "width: 16px; "
                  + "height: 16px; "
                  + "float: left; "
                  + "background-image: url('" + o_uri + "'); ");
      }
    }
  },

  /**
   * 初期化処理
   */
  initForXUL : function () {
    window.addEventListener
    ("keydown",
     function () {
      arAkahukuMHT.onKeyDown (arguments [0]);
    }, true);
  },
    
  /**
   * キーが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onKeyDown : function (event) {
    if (Akahuku.enableAll
        && arAkahukuMHT.enable
        && arAkahukuMHT.enableShortcut) {
      if (arAkahukuMHT.shortcutKeycode == event.keyCode
          && arAkahukuMHT.shortcutModifiersAlt == event.altKey
          && arAkahukuMHT.shortcutModifiersCtrl == event.ctrlKey
          && arAkahukuMHT.shortcutModifiersMeta == event.metaKey
          && arAkahukuMHT.shortcutModifiersShift == event.shiftKey) {
        var tabbrowser = document.getElementById ("content");
        if (tabbrowser.contentDocument) {
          var button
            = tabbrowser.contentDocument.getElementById
            ("akahuku_savemht_button");
          if (button) {
            arAkahukuMHT.saveMHT (tabbrowser.contentDocument);
            event.preventDefault ();
          }
        }
      }
    }
  },
    
  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuMHT.enable
    = arAkahukuConfig
    .initPref ("bool", "akahuku.savemht", true);
    if (Components.classes ["@mozilla.org/binaryinputstream;1"]
        == undefined) {
      arAkahukuMHT.enable = false;
    }
    if (arAkahukuMHT.enable) {
      arAkahukuMHT.base
      = arAkahukuConfig
      .initPref ("char", "akahuku.savemht.base", "");
      arAkahukuMHT.base = unescape (arAkahukuMHT.base);
            
      arAkahukuMHT.defaultType
      = arAkahukuConfig
      .initPref ("char", "akahuku.savemht.default.type", "simple");
            
      arAkahukuMHT.enableDefaultServer
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.default.server", false);
      arAkahukuMHT.enableDefaultDir
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.default.dir", false);
      arAkahukuMHT.enableDefaultThread
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.default.thread", true);
      arAkahukuMHT.enableDefaultTitle
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.default.title", false);
            
      var defFormat
      = "%26server%3B_%26thread%3B_%26YY%3B%uFF0F%26MM%3B%uFF0F%26DD%3B_%26hh%3B%uFF1A%26mm%3B%uFF1A%26ss%3B_%26message%3B";
            
      arAkahukuMHT.defaultFormat
      = arAkahukuConfig
      .initPref ("char", "akahuku.savemht.default.format", defFormat);
      arAkahukuMHT.defaultFormat    
      = arAkahukuConverter.unescapeExtra
      (unescape (arAkahukuMHT.defaultFormat));
            
      arAkahukuMHT.enableAuto
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.auto", false);
      if (arAkahukuMHT.enableAuto) {
        arAkahukuMHT.enableAutoUnique
          = arAkahukuConfig
          .initPref ("bool", "akahuku.savemht.auto.unique", false);
        arAkahukuMHT.enableAutoSaveAs
          = arAkahukuConfig
          .initPref ("bool", "akahuku.savemht.auto.saveas", false);
      }
      else {
        arAkahukuMHT.enableAutoUnique = false;
        arAkahukuMHT.enableAutoSaveAs = false;
      }
            
      arAkahukuMHT.enableImagelink
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.imagelink", true);
      if (arAkahukuMHT.enableImagelink) {
        arAkahukuMHT.enableImagelinkThread
          = arAkahukuConfig
          .initPref ("bool", "akahuku.savemht.imagelink.thread",
                     false);
        arAkahukuMHT.enableImagelinkPerThread
          = arAkahukuConfig
          .initPref ("bool", "akahuku.savemht.imagelink.perthread",
                     false);
      }
      else {
        arAkahukuMHT.enableImagelinkThread = false;
        arAkahukuMHT.enableImagelinkPerThread = false;
      }
      arAkahukuMHT.enablePreview
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.preview", true);
      arAkahukuMHT.enablePreviewCount
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.preview.count", false);
      if (!arAkahukuMHT.enablePreview) {
        arAkahukuMHT.enablePreviewCount = false;
      }
      arAkahukuMHT.enableAimaHideEntireRes
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.aima.hide_entire_res", false);
      arAkahukuMHT.enableAimaShowRes
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.aima.show_res", false);
      arAkahukuMHT.enableCloseNoCacheList
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.close_nocachelist", false);
      arAkahukuMHT.enableUseNetwork
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.usenetwork", true);
      arAkahukuMHT.enableUseP2P
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.usep2p", false);
      if (!arAkahukuP2P.enable) {
        arAkahukuMHT.enableUseP2P = false;
      }
      arAkahukuMHT.enableNolimit
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.nolimit", false);
      arAkahukuMHT.limitTime
      = arAkahukuConfig
      .initPref ("int",  "akahuku.savemht.nolimit.time", 0);
      arAkahukuMHT.enableUse8bit
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.use8bit", false);
            
      arAkahukuMHT.enableShortcut
      = arAkahukuConfig
      .initPref ("bool", "akahuku.savemht.shortcut", false);
      if (arAkahukuMHT.enableShortcut) {
        var value
          = arAkahukuConfig
          .initPref ("char", "akahuku.savemht.shortcut.keycode",
                     "VK_S");
        value
          = unescape (value);
        arAkahukuMHT.shortcutKeycode
          = Components.interfaces.nsIDOMKeyEvent ["DOM_" + value];
                
        arAkahukuMHT.shortcutModifiersAlt
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.savemht.shortcut.modifiers.alt",
                     false);
        arAkahukuMHT.shortcutModifiersCtrl
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.savemht.shortcut.modifiers.ctrl",
                     false);
        arAkahukuMHT.shortcutModifiersMeta
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.savemht.shortcut.modifiers.meta",
                     true);
        arAkahukuMHT.shortcutModifiersShift
          = arAkahukuConfig
          .initPref ("bool",
                     "akahuku.savemht.shortcut.modifiers.shift",
                     true);
      }
    }
        
    arAkahukuMHT.enableCleanup
    = arAkahukuConfig
    .initPref ("bool", "akahuku.cleanup", false);
  },
    
  /**
   * 赤福、合間合間にが追加した要素を消す
   *
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuMHTParam param
   *         mht ファイル作成管理データ
   * @param  Boolean deletePreview
   *         プレビュー画像も削除するかどうか
   * @param  Boolean isMht
   *         mht 保存かどうか
   */
  cleanup : function (info, targetDocument, param, deletePreview, isMht) {
    var i, s;
    var node;
    var form;
    var nodes;
    
    /* 削除する */
    if (info.isFutaba) {
      arAkahukuDelBanner.deleteImage (targetDocument, info, true);
      arAkahukuDelBanner.deleteText (targetDocument, true);
    }
        
    /* 末尾に移動したフォームを戻す */
    var form = arAkahukuDOM.getElementById
    (targetDocument,
     "form",
     "akahuku_postform");
        
    node
    = arAkahukuDOM.getElementById (targetDocument,
                                   "div",
                                   "akahuku_postform_opener_appendix");
        
    var marker
    = arAkahukuDOM.getElementById
    (targetDocument,
     "div",
     "akahuku_postform_bottom_marker");
    if (marker) {
      form.parentNode.removeChild (form);
      marker.parentNode.insertBefore (form, marker);
      if (node) {
        marker.parentNode.insertBefore (node, marker);
      }
      marker.parentNode.removeChild (marker);
    }
    
    /* 人数などを残してフォームを消す */
    if (node) {
      var n = node.firstChild;
      var ul = targetDocument.createElement ("ul");
      var li = targetDocument.createElement ("li");
      var nodes = new Array ();
      
      var viewer = targetDocument.createElement ("div");
      viewer.setAttribute ("style",
                           "text-align: center; font-size: 9pt;");
      
      node.parentNode.insertBefore (viewer, node);
      viewer.appendChild (ul);
      
      while (n) {
        var nextSibling = n.nextSibling;
        
        if (n.nodeName.toLowerCase () == "br") {
          nodes.push (li);
          li = targetDocument.createElement ("li");
        }
        else {
          li.appendChild (n);
        }
        
        n = nextSibling;
      }
      
      for (i = 0; i < nodes.length; i ++) {
        var text = arAkahukuDOM.getInnerText (nodes [i]);
        if (text.match (/\u73FE\u5728.*/i)
            || text.match (/\u30AB\u30BF\u30ED\u30B0/)
            || text.match (/\u7BA1\u7406\u4EBA/)
            || text.match (/\u4FDD\u5B58\u6570/)) {
          if (added) {
            viewer.appendChild (targetDocument.createElement
                                ("br"));
          }
          added = true;
          arAkahukuDOM.copyChildren (nodes [i], viewer);
        }
      }
      
      node.parentNode.removeChild (node);
    }
    else {
      if (form) {
        var chui = null;
        nodes = form.getElementsByTagName ("td");
        for (i = 0; i < nodes.length; i ++) {
          if (arAkahukuDOM.hasClassName (nodes [i], "chui")) {
            chui = nodes [i];
          }
        }
      
        var viewer = targetDocument.createElement ("div");
        viewer.setAttribute ("style",
                             "text-align: center; font-size: 9pt;");
                
        /* 見ている人数、カタログへのリンク、準備板へのリンクをコピーする */
        var added = false;
        var isli = false;
        /* 避難所 patch */
        if (chui) {
          nodes = form.getElementsByTagName ("li");
          isli = true;
        }
        else {
          if (info.isMonaca) {
            nodes = form.getElementsByTagName ("li");
            isli = true;
          }
          else {
            nodes = form.getElementsByTagName ("small");
          }
        }
        for (i = 0; i < nodes.length; i ++) {
          var text = arAkahukuDOM.getInnerText (nodes [i]);
          if (text.match (/\u73FE\u5728.*/i)
              || text.match (/\u30AB\u30BF\u30ED\u30B0/)
              || text.match (/\u7BA1\u7406\u4EBA/)
              || text.match (/\u4FDD\u5B58\u6570/)) {
            if (added) {
              viewer.appendChild (targetDocument.createElement
                                  ("br"));
            }
            added = true;
            if (isli) {
              arAkahukuDOM.copyChildren (nodes [i], viewer);
            }
            else {
              viewer.appendChild (nodes [i].cloneNode (true));
            }
          }
        }
                
        form.parentNode.insertBefore (viewer, form);
      }
    }
        
    /* レス送信モードの表示を戻す */
    node = arAkahukuDOM.getElementById (targetDocument,
                                        "font",
                                        "akahuku_postmode_container");
    if (node) {
      node.removeAttribute ("id");
      node.removeAttribute ("__id");
      var node2 = node.firstChild;
      while (node2) {
        var nextNode = node2.nextSibling;
        node2.parentNode.removeChild (node2);
        node2 = nextNode;
      }
      node.appendChild (targetDocument.createTextNode
                        ("\u30EC\u30B9\u9001\u4FE1\u30E2\u30FC\u30C9"));
    }
        
    /* id を消す */
    var remove_id = [
      "font",       "akahuku_thread_warning",
      "font",       "akahuku_thread_delcount",
      "small",      "akahuku_thread_deletetime",
      "span",       "akahuku_thread_deletetime",
      "blockquote", "akahuku_thread_text",
      "div",        "akahuku_thread_text",
      "img",        "akahuku_thumbnail",
      "div",        "akahuku_partial_indicator",
      ];
    
    for (i = 0; i < remove_id.length; i += 2) {
      node = arAkahukuDOM.getElementById (targetDocument,
                                          remove_id [i],
                                          remove_id [i + 1]);
      if (node) {
        node.removeAttribute ("id");
        node.removeAttribute ("__id");
      }
    }
        
    /* id の要素自体を消す */
    var remove_element = [
      "div",    "akahuku_respanel",
      "div",    "akahuku_tailad",
      "span",   "akahuku_thread_catalog_new",
      "span",   "akahuku_thread_catalog_new2",
      "span",   "akahuku_thread_back_new",
      "div",    "akahuku_links_on_bottom",
      "div",    "akahuku_cleanup_container",
      "div",    "akahuku_savemht_status",
      "div",    "akahuku_savemht_container",
      "iframe", "akahuku_reply_target_frame",
      "div",    "akahuku_reply_status",
      "table",  "akahuku_bottom_container",
      "div",    "akahuku_new_reply_header",
      "div",    "akahuku_postform_opener",
      "form",   "akahuku_postform",
      "div",    "akahuku_floatpostform_container",
      "div",    "akahuku_thread_operator",
      "small",  "akahuku_postform_opener_appendix_up"
      ];
    
    for (i = 0; i < remove_element.length; i += 2) {
      node = arAkahukuDOM.getElementById (targetDocument,
                                          remove_element [i],
                                          remove_element [i + 1]);
      if (node) {
        node.parentNode.removeChild (node);
      }
    }
        
    /* スレ末尾の広告を消す */
    nodes = targetDocument.getElementsByTagName ("blockquote");
    for (i = 0; i < nodes.length; i ++) {
      var table = arAkahukuDOM.findParentNode (nodes [i], "table");
      if (table && table.getAttribute ("border") == 1) {
        table.parentNode.removeChild (table);
        i --;
      }
      else if (table && arAkahukuDOM.getClassName (table) == "ama") {
        table.parentNode.removeChild (table);
        i --;
      }
      
      table = arAkahukuDOM.findParentNode (nodes [i], "div");
      if (table && arAkahukuDOM.getClassName (table) == "ama") {
        table.parentNode.removeChild (table);
        i --;
      }
    }
        
    /* 右の広告スペースを消す */
    node = arAkahukuDOM.getElementById (targetDocument, "div", "rightad");
    if (node) {
      node.parentNode.removeChild (node);
    }

    /* 赤福、合間の追加したスタイルを消す */
    node = arAkahukuDOM.getElementById (targetDocument,
                                        "th",
                                        "akahuku_postform_header");
    if (node) {
      s = node.getAttribute ("style") || "";
      s = s.replace (/ *background-color *: *[^;]+;? */ig, "")
        node.setAttribute ("style", s);
      node.removeAttribute ("id");
      node.removeAttribute ("__id");
    }

        
    /* 赤福、合間の追加したスタイルを消す */
    nodes = targetDocument.getElementsByTagName ("style");
    for (i = 0; i < nodes.length; i ++) {
      var text = arAkahukuDOM.getInnerText (nodes [i]);
      if (text
          && (text.indexOf ("akahuku") != -1
              || text.indexOf ("aima_aimani") != -1)) {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
    }
    
    /* オートリンクを収集する */
    if (isMht) {
      param.previewSaveUrls = new Object ();
      param.previewTotalUrls = new Object ();
      
      nodes = targetDocument.getElementsByTagName ("span");
      for (i = 0; i < nodes.length; i ++) {
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview_button") {
          param.previewTotalUrls [nodes [i].getAttribute ("dummyhref")] = true;
          
          if (arAkahukuDOM.getInnerText (nodes [i]) == "\u9589\u3058\u308B") {
            param.previewSaveUrls [nodes [i].getAttribute ("dummyhref")] = true;
          }
        }
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview_save_button") {
          param.previewTotalUrls [nodes [i].getAttribute ("dummyhref")] = true;
          
          if (nodes [i].getAttribute ("save") == "1") {
            param.previewSaveUrls [nodes [i].getAttribute ("dummyhref")] = true;
            
            var linkNode = targetDocument.createElement ("span");
            linkNode.setAttribute ("__class", "akahuku_savemht_save");
            linkNode.setAttribute
              ("dummyhref",
               nodes [i].getAttribute ("dummyhref"));
            var body
              = arAkahukuDOM.findParentNode (nodes [i], "body");
            body.appendChild (linkNode);
          }
          else {
            
          }
        }
      }
    }
        
    nodes = targetDocument.getElementsByTagName ("small");
    for (i = 0; i < nodes.length; i ++) {
      s = nodes [i].getAttribute ("style") || "";
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_generated"
          || arAkahukuDOM.getClassName (nodes [i])
          == "aima_aimani_generated"
          || s.match (/rgb *\( *98 *, *127 *, *41 *\)/)) {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      if (nodes [i].parentNode.nodeName.toLowerCase () == "center"
          && arAkahukuDOM.getInnerText (nodes [i]).match
          (/\u4E0B\u8A18\u6599\u91D1\u3067\u306E/)) {
        if (nodes [i].nextSibling
            && nodes [i].nextSibling.nodeName.toLowerCase () == "br") {
          nodes [i].parentNode.removeChild (nodes [i].nextSibling);
        }
                
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
    }
        
    nodes = targetDocument.getElementsByTagName ("span");
    for (i = 0; i < nodes.length; i ++) {
      /* レス番号のクラスを消し、スタイルを指定する */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_replynumber") {
        nodes [i].removeAttribute ("class");
        nodes [i].removeAttribute ("__class");
        nodes [i].setAttribute ("style",
                                "font-size: 10pt;"
                                + "margin-left: 4px;");
      }
      /* JPEG のサムネのエラーを消す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_jpeg_thumbnail_error") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      /* プレビューのエラーを消す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_preview_error") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      /* 画像を保存ボタンを消す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_saveimage_container") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
    }
        
    node = arAkahukuDOM.getElementById (targetDocument,
                                        "span",
                                        "akahuku_partial_indicator_n");
    if (node) {
      while (node.firstChild) {
        node.parentNode.insertBefore (node.firstChild, node);
      }
      node.parentNode.removeChild (node);
    }
        
    nodes = targetDocument.getElementsByTagName ("iframe");
    for (i = 0; i < nodes.length; i ++) {
      /* 広告を消す */
      if (nodes [i].hasAttribute ("__akahuku_banner")) {
        nodes [i].parentNode.removeChild
          (nodes [i]);
        i --;
        continue;
      }
    }

    nodes = targetDocument.getElementsByTagName ("object");
    for (i = 0; i < nodes.length; i ++) {
      /* 広告を消す */
      if (nodes [i].hasAttribute ("__akahuku_banner")) {
        nodes [i].parentNode.removeChild
          (nodes [i]);
        i --;
        continue;
      }
    }
            
    nodes = targetDocument.getElementsByTagName ("img");
    for (i = 0; i < nodes.length; i ++) {
      /* JPEG のサムネを消す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_jpeg_thumbnail") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      /* 画像を保存の大きい画像を削除する */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_saveimage_src") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      /* 広告をリンクごと消す */
      if (nodes [i].hasAttribute ("__akahuku_banner")) {
        if (nodes [i].parentNode
            && nodes [i].parentNode.nodeName.toLowerCase () == "a") {
          var parent = nodes [i].parentNode;
          if (parent.nextSibling
              && parent.nextSibling.nodeName.toLowerCase () == "#text"
              && parent.nextSibling.nodeValue.match
              (/^[ \r\n\t]*$/)) {
            parent.parentNode.removeChild (parent.nextSibling);
          }
          if (parent.nextSibling
              && parent.nextSibling.nodeName.toLowerCase () == "br") {
            parent.parentNode.removeChild (parent.nextSibling);
          }
          if (parent.nextSibling
              && parent.nextSibling.nodeName.toLowerCase () == "br") {
            parent.parentNode.removeChild (parent.nextSibling);
          }
                    
          parent.parentNode.removeChild (parent);
          i --;
          continue;
        }
      }
      /* 合間合間に で小さくなったサムネを元に戻す */
      if (nodes [i].hasAttribute ("__aima_aimani_mini_thumb")) {
        nodes [i].removeAttribute ("__aima_aimani_mini_thumb");
        s = nodes [i].getAttribute ("style") || "";
        s = s.replace (/ *width *: *[^;]+;? */ig, "");
        s = s.replace (/ *height *: *[^;]+;? */ig, "");
        nodes [i].setAttribute ("style", s);
      }
      /* アクセスチェック ? を消す */
      var src = nodes [i].getAttribute ("dummysrc");
      if (src
          && (src.match (/^https?:\/\/[a-z]+\.2chan\.net\/s\.gif$/)
              || src.match (/^\/s\.gif$/)
              || src.match (/^\/c\.gif\/.+\.gif$/))) {
        var br = nodes [i].nextSibling;
        if (br
            && br.nodeName.toLowerCase () == "br") {
          br.parentNode.removeChild (br);
        }
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      /* 画像の保存の小さい画像を表示する */
      if (nodes [i].hasAttribute ("__akahuku_saveimage_thumb")) {
        nodes [i].removeAttribute ("__akahuku_saveimage_thumb");
        s = nodes [i].getAttribute ("style") || "";
        s = s.replace (/ *display *: *[^;]+;? */ig, "");
        nodes [i].setAttribute ("style", s);
      }
      nodes [i].removeAttribute ("__akahuku_jpeg_thumbnail_opened");
    }

    nodes = targetDocument.getElementsByTagName ("video");
    for (i = 0; i < nodes.length; i ++) {
      // webm のインライン再生ノードを削除する
      if (arAkahukuDOM.hasClassName (nodes [i], "extendWebm")) {
        var anchor = nodes [i].parentNode.nextSibling;
        if (anchor && anchor.nodeName.toLowerCase () == "a" &&
            /\bdisplay *: *none\b/i.test (anchor.getAttribute ("style"))) {
          // 非表示化されたサムネを再表示
          arAkahukuDOM.Style.removeProperty (anchor, "display");
        }
        nodes [i].parentNode.parentNode
          .removeChild (nodes [i].parentNode);
        i --;
        continue;
      }
      // 画像を保存の大きい画像(video)を削除する
      if (arAkahukuDOM.hasClassName (nodes [i], "akahuku_saveimage_src")) {
        var bq = nodes [i].parentNode;
        while (bq) {
          arAkahukuDOM.removeClassName (bq, "akahuku_saveimage_defmargin");
          while (bq && bq.nodeType !== 1) { // nextElementSibling
            bq = bq.nextSibling;
          }
        }
        var hrefOriginal = nodes [i].parentNode
          .getAttribute ("__akahuku_saveimage_href");
        if (hrefOriginal) {
          nodes [i].parentNode.setAttribute ("dummyhref", hrefOriginal);
          nodes [i].parentNode.removeAttribute ("__akahuku_saveimage_href");
        }
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
    }
        
    nodes = Akahuku.getMessageBQ (targetDocument);
    for (i = 0; i < nodes.length; i ++) {
      var container = Akahuku.getMessageContainer (nodes [i]);
      if (container) {
        /* 合間が消した時に番号だけ表示している要素を探す */
        var aimaHidden = null;
        if (arAkahukuMHT.enableAimaShowRes
            || arAkahukuMHT.enableAimaHideEntireRes) {
          if (container.main.nodeName.toLowerCase () == "td") {
            var table = arAkahukuDOM.findParentNode (container.main, "table");
            if (table) {
              var tds = table.getElementsByTagName ("td");
              for (var j = 0; j < tds.length; j ++) {
                if (arAkahukuDOM.hasClassName (tds [j], "aima_aimani_hidden")) {
                  aimaHidden = tds [j];
                  break;
                }
              }
            }
          }
          else {
            var n = container.main;
            while (n) {
              if (n.nodeName.toLowerCase () == "br") {
                break;
              }
              if (arAkahukuDOM.hasClassName (n, "aima_aimani_hidden")) {
                aimaHidden = n;
                break;
              }
              
              n = n.nextSibling;
            }
          }
        }
        
        if (aimaHidden) {
          arAkahukuDOM.removeClassName (aimaHidden, "aima_aimani_hidden");
        }
        
        if (arAkahukuMHT.enableAimaShowRes
            && aimaHidden) {
          /* 合間合間に 消したレスを復活させる */
          for (var j = 0; j < container.nodes.length; j ++) {
            var s = container.nodes [j].getAttribute ("style") || "";
            s = s.replace (/ *display *: *[^;]+;? */ig, "");
            container.nodes [j].setAttribute ("style", s);
          }
          var s = container.main.getAttribute ("style") || "";
          s = s.replace (/ *display *: *[^;]+;? */ig, "");
          container.main.setAttribute ("style", s);
          
          aimaHidden.parentNode.removeChild (aimaHidden);
          aimaHidden = null;
        }

        if (arAkahukuMHT.enableAimaHideEntireRes
            && aimaHidden) {
          /* 合間合間に 消したレスを無かった事にする */
          for (var j = 0; j < container.nodes.length; j ++) {
            var s = container.nodes [j].getAttribute ("style") || "";
            s = s.replace (/ *display *: *[^;]+;? */ig, "");
            s = "display: none; " + s;
            container.nodes [j].setAttribute ("style", s);
          }
          aimaHidden.parentNode.removeChild (aimaHidden);
          aimaHidden = null;
        }
        
        if (arAkahukuDOM.hasClassName
            (container.main, "akahuku_skipped_reply")) {
          /* 未取得のレスの表示を変える */
          arAkahukuDOM.removeClassName (container.main, "akahuku_skipped_reply");
        }
        if (arAkahukuDOM.hasClassName
            (container.main, "akahuku_deleted_reply")) {
          /* 削除済みのレスの表示を変える */
          arAkahukuDOM.removeClassName (container.main, "akahuku_deleted_reply");
          
          arAkahukuDOM.Style
            .removeProperty (container.main, "border", "*");
          arAkahukuDOM.Style
            .setProperty (container.main, "border", "2px solid blue");
          var span = targetDocument.createElement ("span");
          span.setAttribute ("style",
                             "font-size: 10px;"
                             + "color: blue;"
                             + "background-color: transparent;");
          span.appendChild
            (targetDocument.createTextNode
             ("\u3053\u306E\u30EC\u30B9\u306F\u524A\u9664\u3055\u308C\u307E\u3057\u305F"));
          container.main.appendChild (span);
        }
        if (arAkahukuDOM.hasClassName
            (container.main, "akahuku_deleted_reply2")) {
          /* 「削除されました」のレスの表示を変える */
          arAkahukuDOM.removeClassName (container.main, "akahuku_deleted_reply2");
          arAkahukuDOM.Style
            .removeProperty (container.main, "border", "*");
          arAkahukuDOM.Style
            .setProperty (container.main, "border", "2px dotted red");
        }
      }

      var thumb = Akahuku.getThumbnailFromBQ (nodes [i]);
      if (thumb && arAkahukuDOM
          .hasClassName (thumb, "akahuku_deleted_reply2")) {
        arAkahukuDOM.removeClassName (thumb, "akahuku_deleted_reply2");
        arAkahukuDOM.Style.removeProperty (thumb, "border", "*");
        arAkahukuDOM.Style.setProperty (thumb, "border", "2px dotted red");
        var span = targetDocument.createElement ("span");
        span.setAttribute ("style",
                           "font-size: 10px;"
                           + "color: red;"
                           + "float: left; clear: left;"
                           + "margin-left: 20px;");
        span.appendChild
          (targetDocument.createTextNode // "この画像は削除されました"
           ("\u3053\u306E\u753B\u50CF\u306F\u524A\u9664\u3055\u308C\u307E\u3057\u305F"));
        thumb.parentNode.parentNode.insertBefore
          (span, thumb.parentNode.nextSibling);
      }
      
      /* Firefox3 でバグ回避のための marginLeft を解除する */
      if (nodes [i].hasAttribute ("__akahuku_margin_left")) {
        var original = "";
        if (nodes [i].hasAttribute ("__akahuku_margin_left_original")) {
          original = " margin-left: " + nodes [i].getAttribute ("__akahuku_margin_left_original") + "; ";
          nodes [i].removeAttribute ("__akahuku_margin_left_original");
        }
        var s = nodes [i].getAttribute ("style") || "";
        s = s.replace (/ *margin-left *: *[^;]+;? */ig, original);
        nodes [i].setAttribute ("style", s);
        nodes [i].removeAttribute ("__akahuku_margin_left");
      }
    }
    
    /* オートリンクでデコードした文字列を元に戻す
     * オートリンクを元に戻す前に行なう */
    nodes = targetDocument.getElementsByTagName ("font");
    for (i = 0; i < nodes.length; i ++) {
      if (nodes [i].hasAttribute ("__akahuku_troll")) {
        nodes [i].removeAttribute ("__akahuku_troll");
      }
      if (nodes [i].hasAttribute ("__akahuku_troll_text")) {
        nodes [i].removeAttribute ("__akahuku_troll_text");
      }
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_generated_link_child") {
        var dummyText
          = unescape (atob (nodes [i].getAttribute
                            ("__akahuku_link_tmp")));
        var newNode = targetDocument.createTextNode (dummyText);
        nodes [i].parentNode.replaceChild (newNode, nodes [i]);
        i --;
        continue;
      }
    }
        
    /* オートリンクのプレビュー、もしくはプレビューのクラスを消す */
    if (deletePreview) {
      nodes = targetDocument.getElementsByTagName ("div");
      for (i = 0; i < nodes.length; i ++) {
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview_container") {
          nodes [i].parentNode.removeChild (nodes [i]);
          i --;
          continue;
        }
      }
    }
    else {
      nodes = targetDocument.getElementsByTagName ("div");
      for (i = 0; i < nodes.length; i ++) {
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview_container") {
          nodes [i].removeAttribute ("class");
          nodes [i].removeAttribute ("__class");
        }
      }
    }
    
    /* 新しいレイアウトには関係ない */
    nodes = targetDocument.getElementsByTagName ("table");
    for (i = 0; i < nodes.length; i ++) {
      /* 元画像を表示する際の回り込みを解除 */
      s = nodes [i].getAttribute ("style") || "";
      s = s.replace (/ *clear *: *[^;]+;? */ig, "");
      nodes [i].setAttribute ("style", s);
    }
        
    nodes = targetDocument.getElementsByTagName ("a");
    for (i = 0; i < nodes.length; i ++) {
      if (nodes [i].hasAttribute ("__akahuku_saveimage_normal")) {
        nodes [i].removeAttribute ("__akahuku_saveimage_normal");
      }
            
      /* NoScript のプレースホルダーを消す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "__noscriptPlaceholder__") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
            
      /* プレビューのエラーを消す */
      if (nodes [i].hasAttribute ("__akahuku_preview_error")) {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
      /* 画像を保存 でサムネが無い場合の疑似サムネノードを消す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_saveimage_anchor") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
            
      if (nodes [i].hasAttribute ("__akahuku_alertgif")) {
        s = nodes [i].getAttribute ("style") || "";
        s = s.replace (/ *color *: *[^;]+;? */ig, "");
        nodes [i].setAttribute ("style", s);
        nodes [i].removeAttribute ("__akahuku_alertgif");
      }
            
      if (nodes [i].hasAttribute ("__akahuku_saveimage_id")) {
        nodes [i].removeAttribute ("__akahuku_saveimage_id");
      }
            
      if (nodes [i].hasAttribute ("__akahuku_newtab")) {
        nodes [i].removeAttribute ("target");
        nodes [i].removeAttribute ("__akahuku_newtab");
      }
            
      if (nodes [i].getAttribute ("href")
          && nodes [i].getAttribute ("href").match
          (/\?mode=cat$/)) {
        nodes [i].removeAttribute ("target");
      }
            
      if (nodes [i].getAttribute ("href")
          && nodes [i].getAttribute ("href").match
          (/futaba\.htm$/)) {
        /* futaba: 未知なので外部には対応しない */
        nodes [i].removeAttribute ("target");
      }
            
      /* メール欄のポップアップを消す */
      if (nodes [i].getAttribute ("href")
          && nodes [i].getAttribute ("href").match (/^mailto:/)) {
        nodes [i].removeAttribute ("title");
      }
            
      /* オートリンクを元に戻す */
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_generated_link") {
        if (nodes [i].firstChild.nodeName.toLowerCase () != "img") {
          var dummyText;
          dummyText
            = arAkahukuConverter.unescapeEntity
            (arAkahukuDOM.getInnerText (nodes [i]));
          var newNode = targetDocument.createTextNode (dummyText);
          nodes [i].parentNode.replaceChild (newNode, nodes [i]);
          i --;
          continue;
        }
      }
    }
        
    /* 空になったプレビューのコンテナ、保存する画像のチェックを削除する */
    nodes = targetDocument.getElementsByTagName ("div");
    for (i = 0; i < nodes.length; i ++) {
      if (!nodes [i].firstChild) {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
    }

    /* P2P ノード名を元に戻す */
    nodes = targetDocument.getElementsByTagName ("small");
    for (i = 0; i < nodes.length; i ++) {
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_p2p_nodename") {
        var dummyText;
        dummyText
          = arAkahukuConverter.unescapeEntity
          (arAkahukuDOM.getInnerText (nodes [i]));
        var newNode = targetDocument.createTextNode (dummyText);
        nodes [i].parentNode.replaceChild (newNode, nodes [i]);
        i --;
        continue;
      }
    }
        
    /* メール欄のクラスを消し、スタイルを指定する */
    nodes = targetDocument.getElementsByTagName ("font");
    for (i = 0; i < nodes.length; i ++) {
      if (arAkahukuDOM.getClassName (nodes [i])
          == "akahuku_shown_mail") {
        nodes [i].removeAttribute ("class");
        nodes [i].removeAttribute ("__class");
        nodes [i].setAttribute ("style",
                                "color: blue;"
                                + "font-weight: normal;");
      }
    }
        
    /* 合間のクラスを消す */
    nodes = targetDocument.getElementsByTagName ("div");
    for (i = 0; i < nodes.length; i ++) {
      if (arAkahukuDOM.getClassName (nodes [i])
          == "aima_aimani_warning") {
        nodes [i].removeAttribute ("class");
        nodes [i].removeAttribute ("__class");
      }
    }
    
    /* del のフレームのクラスを消す */
    nodes = targetDocument.getElementsByTagName ("div");
    for (i = 0; i < nodes.length; i ++) {
      if (arAkahukuDOM.getClassName (nodes [i])
          == "__akahuku_delframe") {
        nodes [i].parentNode.removeChild (nodes [i]);
        i --;
        continue;
      }
    }
    
    /* script を消す */
    nodes = targetDocument.getElementsByTagName ("script");
    for (i = 0; i < nodes.length; i ++) {
      nodes [i].parentNode.removeChild (nodes [i]);
      i --;
      continue;
    }
        
    /* noscript を消す */
    nodes = targetDocument.getElementsByTagName ("noscript");
    for (i = 0; i < nodes.length; i ++) {
      nodes [i].parentNode.removeChild (nodes [i]);
      i --;
      continue;
    }
        
    /* チェックボックスの id を消す */
    nodes = targetDocument.getElementsByTagName ("input");
    for (i = 0; i < nodes.length; i ++) {
      if (("id" in nodes [i]
           && nodes [i].id.match (/^akahuku_dummyid_/))
          || (nodes [i].getAttribute ("__id")
              && nodes [i].getAttribute ("__id").match
              (/^akahuku_dummyid_/))) {
        nodes [i].removeAttribute ("id");
        nodes [i].removeAttribute ("__id");
      }
    }
        
    /* 削除のフォームを消す */
    nodes = targetDocument.getElementsByTagName ("input");
    for (i = 0; i < nodes.length; i ++) {
      if (nodes [i].getAttribute ("type")
          && nodes [i].getAttribute ("type").toLowerCase () == "hidden"
          && nodes [i].getAttribute ("value") == "usrdel") {
        node = arAkahukuDOM.findParentNode (nodes [i], "table");
        if (node) {
          node.parentNode.removeChild (node);
        }
        break;
      }
    }
        
    /* フォーム位置だけ末尾に置いた時の追加スタイルを削除 */
    node = arAkahukuDOM.getElementById (targetDocument,
                                        "div", "ufm");
    if (node) {
      node.removeAttribute ("style");
    }
  },
  
  /**
   * 現在表示しているドキュメントのファイル情報を取得する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String url
   *         対象のドキュメントのアドレス
   * @return arAkahukuMHTFileData
   *         mht ファイルデータ
   */
  getIndexFileData : function (targetDocument, url) {
    var html = targetDocument.documentElement;
        
    var fileData = new arAkahukuMHTFileData ();
    fileData.location = url;
        
    var utf16 = arAkahukuMHT.convertToPlainText (html);
    var sjis = arAkahukuConverter.convertToSJIS (utf16, "\r\n");
        
    if (arAkahukuMHT.enableUse8bit) {
      fileData.content = sjis;
      fileData.encoding = "8bit";
    }
    else {
      fileData.content = btoa (sjis);
      fileData.encoding = "base64";
    }
        
    fileData.contentType = "text/html; charset=Shift_JIS";
        
    fileData.status = arAkahukuMHT.FILE_STATUS_OK;
        
    return fileData;
  },
    
    
  /**
   * mht 用のキャッシュを作成する
   *
   * @param  arAkahukuMHTFileData fileData
   *         mht ファイルデータ
   */
  createFileCache : function (fileData) {
    var location;
    location = fileData.location;
    if (Akahuku.protocolHandler.isAkahukuURI (location)) {
      var p = Akahuku.protocolHandler.getAkahukuURIParam (location);
      if (p.type == "cache"
          || p.type == "filecache") {
        location = p.original;
      }
    }
    /* ヘッダ */
    fileData.cache
    = "Content-Type: " + fileData.contentType + "\r\n"
    + "Content-Transfer-Encoding: " + fileData.encoding + "\r\n"
    + "Content-Location: " + location + "\r\n";
    if (fileData.disposition != "") {
      var value = fileData.disposition;
            
      fileData.cache
        += "Content-Disposition: " + value + "\r\n";
    }
    fileData.cache
    += "\r\n";
        
    /* ボディ */
    if (fileData.encoding == "base64") {
      var width = 76;
      for (var i = 0; i < fileData.content.length; i += width) {
        fileData.cache
          += fileData.content.substr (i, width) + "\r\n";
      }
    }
    else if (fileData.encoding == "8bit") {
      fileData.cache += fileData.content;
    }
        
    fileData.cache
    += "\r\n";
  },
    
  /**
   * 対象のドキュメントを mht に変換して保存する
   *
   * @param  arAkahukuMHTParam param
   *         mht ファイル作成管理データ
   */
  saveMHTCore : function (param) {
    var targetDocument = param.targetDocument;
    var window = targetDocument.defaultView;
        
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    var button
    = targetDocument.getElementById ("akahuku_savemht_button");
    var button2
    = targetDocument.getElementById ("akahuku_savemht_saveas_button");
    var progress
    = targetDocument.getElementById ("akahuku_savemht_progress");
    var status
    = targetDocument.getElementById ("akahuku_savemht_status");
    var progress2
    = targetDocument.getElementById ("akahuku_throp_savemht_progress");
    var status2
    = targetDocument.getElementById ("akahuku_throp_savemht_status");
        
    var imagelink
    = targetDocument.getElementById ("akahuku_savemht_imagelink");
        
    try {
      var i, j;
            
      /* 編集用にドキュメントのクローンを作る */
      param.cloneDocument
        = targetDocument.implementation
        .createDocument (null,
                         "html",
                         null);
            
      var head = targetDocument.getElementsByTagName ("head") [0];
      var cloneHead = arAkahukuMHT.cloneDummy (param.cloneDocument, head);
            
      var body = targetDocument.getElementsByTagName ("body") [0];
      var cloneBody = arAkahukuMHT.cloneDummy (param.cloneDocument, body);
            
      param.cloneDocument.documentElement.appendChild (cloneHead);
      param.cloneDocument.documentElement.appendChild (cloneBody);
            
      /* ドキュメントを整形する */
      arAkahukuMHT.cleanup (info,
                            param.cloneDocument,
                            param,
                            !arAkahukuMHT.enablePreview, true);
            
      /* デフォルトのスタイルを無視している場合適用する */
      arAkahukuThread.restoreIgnoredStyles
        (targetDocument, param.cloneDocument);
            
      /* base 要素の値を img 要素、a 要素に適用する */
      var baseDir
        = Components.classes ["@mozilla.org/network/standard-url;1"]
        .createInstance (Components.interfaces.nsIURI);
      baseDir.spec = targetDocument.location.href;
            
      var href;
      var nodes = param.cloneDocument.getElementsByTagName ("base");
      for (i = 0; i < nodes.length; i ++) {
        href = nodes [i].getAttribute ("dummyhref");
        if (href) {
          baseDir.spec = baseDir.resolve (href);
          break;
        }
      }
            
      nodes = param.cloneDocument.getElementsByTagName ("a");
      for (var i = 0; i < nodes.length; i ++) {
        href = nodes [i].getAttribute ("dummyhref");
        if (href) {
          nodes [i].setAttribute ("dummyhref",
                                  baseDir.resolve (href));
        }
      }
            
      /* 避難所 patch */
      nodes = param.cloneDocument.getElementsByTagName ("link");
      for (var i = 0; i < nodes.length; i ++) {
        href = nodes [i].getAttribute ("dummyhref");
        if (href) {
          nodes [i].setAttribute ("dummyhref",
                                  baseDir.resolve (href));
        }
      }
            
      nodes = param.cloneDocument.getElementsByTagName ("img");
      for (i = 0; i < nodes.length; i ++) {
        href = nodes [i].getAttribute ("dummysrc");
        if (href) {
          nodes [i].setAttribute ("dummysrc",
                                  baseDir.resolve (href));
        }
      }
            
      nodes = param.cloneDocument.getElementsByTagName ("embed");
      for (i = 0; i < nodes.length; i ++) {
        href = nodes [i].getAttribute ("dummysrc");
        if (href) {
          nodes [i].setAttribute ("dummysrc",
                                  baseDir.resolve (href));
        }
      }
            
      var oldFiles = param.files;
      var newFiles = new Array ();
            
      var exists;
      var url;
      var fileData;
      var dup;
      
      /* img, video 要素を収集する */
      nodes = [];
      var imgs = param.cloneDocument.getElementsByTagName ("img");
      for (i = 0; i < imgs.length; i ++) {
        nodes.push (imgs [i])
      }
      var videos = param.cloneDocument.getElementsByTagName ("video");
      for (i = 0; i < videos.length; i ++) {
        nodes.push (videos[i])
      }
      for (i = 0; i < nodes.length; i ++) {
        /* 非表示になった画像は取得しない */
        if ("style" in nodes [i]
            && (nodes [i].getAttribute ("style") || "")
            .match (/display *: *none/i)) {
          /* 画像自身 */
          continue;
        }
        
        var container = Akahuku.getMessageContainer (nodes [i]);
        if (container
            && (container.main.getAttribute ("style") || "")
            .match (/display *: *none/i)) {
          /* 消されているので無視 */
          continue;
        }
                
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview") {
          url = nodes [i].getAttribute ("dummyhref");
        }
        else {
          url = nodes [i].getAttribute ("dummysrc");
        }
        
        if (url) {
          if (url.match (/bin\/uucount\.php/)) {
            continue;
          }
          
          dup = false;
          for (j = 0; j < newFiles.length; j ++) {
            if (newFiles [j].originalLocation == url) {
              dup = true;
              break;
            }
          }
                    
          if (!dup) {
            exists = false;
            for (j = 0; j < oldFiles.length; j ++) {
              if (oldFiles [j].originalLocation == url
                  && oldFiles [j].status
                  == arAkahukuMHT.FILE_STATUS_OK) {
                newFiles.push (oldFiles [j]);
                exists = true;
                break;
              }
            }
            if (!exists) {
              fileData = new arAkahukuMHTFileData ();
              fileData.type = arAkahukuMHT.FILE_TYPE_IMG;
              fileData.setLocations (url);
              fileData.useNetwork = arAkahukuMHT.enableUseNetwork;
              fileData.node = nodes [i];
              fileData.ownerDocument = targetDocument;
                            
              newFiles.push (fileData);
            }
          }
        }
      }
            
      /* embed 要素を収集、削除する */
      nodes = param.cloneDocument.getElementsByTagName ("embed");
      for (i = 0; i < nodes.length; i ++) {
        /* 非表示になった画像は取得しない */
        if ("style" in nodes [i]
            && (nodes [i].getAttribute ("style") || "")
            .match (/display *: *none/i)) {
          /* 画像自身 */
          continue;
        }
        var container = Akahuku.getMessageContainer (nodes [i]);
        if (container
            && (container.main.getAttribute ("style") || "")
            .match (/display *: *none/i)) {
          /* 消されているので無視 */
          continue;
        }
        
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview") {
          url = nodes [i].getAttribute ("dummyhref");
        }
        else {
          url = nodes [i].getAttribute ("dummysrc");
        }
        if (url) {
          dup = false;
          for (j = 0; j < newFiles.length; j ++) {
            if (newFiles [j].originalLocation == url) {
              dup = true;
              break;
            }
          }
                    
          if (!dup) {
            exists = false;
            for (j = 0; j < oldFiles.length; j ++) {
              if (oldFiles [j].originalLocation == url
                  && oldFiles [j].status
                  == arAkahukuMHT.FILE_STATUS_OK) {
                newFiles.push (oldFiles [j]);
                exists = true;
                break;
              }
            }
            if (!exists) {
              fileData = new arAkahukuMHTFileData ();
              fileData.type = arAkahukuMHT.FILE_TYPE_IMG;
              fileData.setLocations (url);
              fileData.useNetwork = arAkahukuMHT.enableUseNetwork;
              fileData.node = nodes [i];
              fileData.ownerDocument = targetDocument;
              newFiles.push (fileData);
            }
          }
        }
                
        if (nodes [i].parentNode.nodeName.toLowerCase () == "object") {
          nodes [i].parentNode.parentNode.removeChild (nodes [i].parentNode);
        }
        else {
          nodes [i].parentNode.removeChild (nodes [i]);
        }
        i --;
        continue;
      }
            
      /* プレビューの iframe 要素は収集せず削除する */
      nodes = param.cloneDocument.getElementsByTagName ("iframe");
      for (i = 0; i < nodes.length; i ++) {
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_preview") {
          nodes [i].parentNode.removeChild (nodes [i]);
          i --;
        }
      }
            
      /* 空になったプレビューのコンテナを削除する */
      nodes = param.cloneDocument.getElementsByTagName ("div");
      for (i = 0; i < nodes.length; i ++) {
        if (!nodes [i].firstChild) {
          nodes [i].parentNode.removeChild (nodes [i]);
          i --;
          continue;
        }
      }
            
      /* 避難所 patch */
      /* link 要素を収集する */
      nodes = param.cloneDocument.getElementsByTagName ("link");
      for (i = 0; i < nodes.length; i ++) {
        if (nodes [i].getAttribute ("rel") == "stylesheet") {
          url = nodes [i].getAttribute ("dummyhref");
          if (url) {
            dup = false;
            for (j = 0; j < newFiles.length; j ++) {
              if (newFiles [j].originalLocation == url) {
                dup = true;
                break;
              }
            }
                        
            if (!dup) {
              exists = false;
              for (j = 0; j < oldFiles.length; j ++) {
                if (oldFiles [j].originalLocation == url
                    && oldFiles [j].status
                    == arAkahukuMHT.FILE_STATUS_OK) {
                  newFiles.push (oldFiles [j]);
                  exists = true;
                  break;
                }
              }
              if (!exists) {
                fileData = new arAkahukuMHTFileData ();
                fileData.type = arAkahukuMHT.FILE_TYPE_IMG;
                fileData.location = url;
                fileData.currentLocation = url;
                fileData.originalLocation = url;
                fileData.useNetwork
                  = arAkahukuMHT.enableUseNetwork;
                fileData.node = nodes [i];
                fileData.ownerDocument = targetDocument;
                            
                newFiles.push (fileData);
              }
            }
          }
        }
      }
            
      /* 保存用の span 要素を収集する */
      nodes = param.cloneDocument.getElementsByTagName ("span");
      for (i = 0; i < nodes.length; i ++) {
        if (arAkahukuDOM.getClassName (nodes [i])
            == "akahuku_savemht_save") {
          url = nodes [i].getAttribute ("dummyhref");
          if (url) {
            dup = false;
            for (j = 0; j < newFiles.length; j ++) {
              if (newFiles [j].originalLocation == url) {
                dup = true;
                break;
              }
            }
                        
            if (!dup) {
              exists = false;
              for (j = 0; j < oldFiles.length; j ++) {
                if (oldFiles [j].originalLocation == url
                    && oldFiles [j].status
                    == arAkahukuMHT.FILE_STATUS_OK) {
                  newFiles.push (oldFiles [j]);
                  exists = true;
                  break;
                }
              }
              if (!exists) {
                fileData = new arAkahukuMHTFileData ();
                fileData.type = arAkahukuMHT.FILE_TYPE_IMG;
                fileData.location = url;
                fileData.currentLocation = url;
                fileData.originalLocation = url;
                fileData.useNetwork
                  = arAkahukuMHT.enableUseNetwork;
                fileData.node = nodes [i];
                fileData.ownerDocument = targetDocument;
                            
                newFiles.push (fileData);
              }
            }
          }
                    
          nodes [i].parentNode.removeChild (nodes [i]);
          i --;
          continue;
        }
      }
            
      /* 画像への a 要素を収集する */
      var enableImagelink;
      var enableImagelinkThread;
      var exList = new Object ();
      var exType = "";
      if (imagelink) {
        enableImagelink = imagelink.checked;
        enableImagelinkThread = false;
        if (targetDocument.getElementById
            ("akahuku_savemht_imagelink_thread").checked) {
          enableImagelinkThread = true;
        }
        else if (targetDocument.getElementById
                 ("akahuku_savemht_imagelink_checked").checked) {
          exType = "x";
        }
        else if (targetDocument.getElementById
                 ("akahuku_savemht_imagelink_unchecked").checked) {
          exType = "o";
        }
        if (exType) {
          nodes = targetDocument.getElementsByTagName ("div");
          for (i = 0; i < nodes.length; i ++) {
            if (arAkahukuDOM.getClassName (nodes [i])
                == "akahuku_savemht_imagelink_check") {
              if (nodes [i].getAttribute ("title") == exType) {
                nodes [i].id.match
                  (/akahuku_savemht_imagelink_([0-9]+)/);
                exList [RegExp.$1] = 1;
              }
            }
          }
        }
      }
      else {
        enableImagelink = arAkahukuMHT.enableImagelink;
        enableImagelinkThread = arAkahukuMHT.enableImagelinkThread;
      }
            
      if (enableImagelink) {
        nodes = param.cloneDocument.getElementsByTagName ("a");
                
        for (i = 0; i < nodes.length; i ++) {
          /* 非表示になったリンクは取得しない */
          if ("style" in nodes [i]
              && (nodes [i].getAttribute ("style") || "")
              .match (/display *: *none/i)) {
            /* リンク自身 */
            continue;
          }
          if (nodes [i].firstChild
              && "getAttribute" in nodes [i].firstChild
              && (nodes [i].firstChild.getAttribute ("style") || "")
              .match (/display *: *none/i)) {
            /* リンク内の要素、主に画像 */
            continue;
          }
          var container = Akahuku.getMessageContainer (nodes [i]);
          if (container
              && (container.main.getAttribute ("style") || "")
              .match (/display *: *none/i)) {
            /* 消されているので無視 */
            continue;
          }
          
          if (container && enableImagelinkThread) {
            /* レスのリンク */
            continue;
          }
                    
          url = nodes [i].getAttribute ("dummyhref");
                    
          if (url
              && !url.match (/^mailto:/)
              && (url.match (/red\/([0-9]+)/)
                  || url.match (/d\/([0-9]+)/)
                  || url.match (/src\/([0-9]+)/)
                  || url.match (/r\.php\?r=([0-9]+)/))) {
            var imageNum = RegExp.$1;
            if (url.match (/^https?:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\/src\/[0-9]+\.jpg\?$/)) {
              /* ダミーなので削除 */
              nodes [i].parentNode.removeChild (nodes [i]);
              i --;
              continue;
            }
            if (imageNum in exList) {
              continue;
            }
                        
            dup = false;
            for (j = 0; j < newFiles.length; j ++) {
              if (newFiles [j].originalLocation == url) {
                dup = true;
                break;
              }
            }
                        
            if (!dup) {
              exists = false;
              for (j = 0; j < oldFiles.length; j ++) {
                if (oldFiles [j].originalLocation == url
                    && oldFiles [j].status
                    == arAkahukuMHT.FILE_STATUS_OK
                    && oldFiles [j].anchor_status
                    == arAkahukuMHT
                    .FILE_ANCHOR_STATUS_IMAGE) {
                  newFiles.push (oldFiles [j]);
                  exists = true;
                  break;
                }
              }
                            
              if (!exists) {
                fileData = new arAkahukuMHTFileData ();
                fileData.type
                  = arAkahukuMHT.FILE_TYPE_ANCHOR;
                fileData.setLocations (url);
                fileData.node = nodes [i];
                fileData.ownerDocument = targetDocument;
                fileData.useNetwork = false;
                fileData.redName
                  = arAkahukuDOM.getInnerText (fileData.node);
                                
                /* 避難所 patch */
                if (info.isMonaca
                    && fileData.redName.indexOf (".gif")
                    != -1) {
                  var node = nodes [i];
                  while (node
                         && node.nodeName.toLowerCase ()
                         != "br") {
                    if (node.nodeName.toLowerCase ()
                        == "span"
                        && arAkahukuDOM.getInnerText (node)
                        .indexOf ("\u30A2\u30CB\u30E1GIF")
                        != -1) {
                      fileData.redName = 
                        fileData.redName.replace
                        (/\.gif/, ".ani.gif");
                    }
                    node = node.nextSibling;
                  }
                }
                            
                newFiles.push (fileData);
              }
            }
          }
        }
      }
      param.files = newFiles;
      oldFiles = null;
      newFiles = null;
            
      var text
        = "\u4FDD\u5B58\u4E2D..."
        + "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u6574\u5F62\u5B8C\u4E86..."
        + "\u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u53CE\u96C6\u4E2D"
        + "(0+0/" + param.files.length + ")...";
      arAkahukuDOM.setText (progress, text);
      if (progress2) {
        var text2
          = "(0+0/" + param.files.length + ")...";
        arAkahukuDOM.setText (progress2, text2);
      }
            
      /* キャッシュからファイルを探す */
      for (i = 0; i < param.files.length; i ++) {
        if (param.files [i].status
            == arAkahukuMHT.FILE_STATUS_NA_CACHE) {
          param.files [i].delay = 500 + i * 500;
          param.files [i].getFile (param.files [i].currentLocation,
                                   targetDocument);
        }
      }
            
      /* 取得状況チェックを開始する */
      param.checkTimerID
        = window.setInterval (arAkahukuMHT.checkFiles,
                       100,
                       param, button, button2, progress, progress2);
    }
    catch (e) {
      /* エラーメッセージを表示する */
      var span;
      span = targetDocument.createElement ("span");
      span.id = "akahuku_savemht_error";
      span.appendChild
      (targetDocument.createTextNode
       ("\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
      arAkahukuDOM.setText (progress, null);
      progress.appendChild (span);
      if (progress2) {
        progress2.appendChild (span);
      }
            
      var s = "\u30A8\u30E9\u30FC";
      if (e.lineNumber) {
        s += " (" + e.fileName + ":" + e.lineNumber + " \u884C\u76EE)";
      }
      s += ": " + e;
      arAkahukuDOM.setText (status, s);
      if (status2) {
        arAkahukuDOM.setText (status2, s);
      }
            
      param.isBusy = false;
      if (arAkahukuMHT.enableNolimit) {
        arAkahukuConfig.restoreTime ();
      }
            
      arAkahukuSound.playSaveMHTError ();
    }
  },
    
  /**
   * キャッシュファイルの取得状況をチェックする
   *
   * @param  arAkahukuMHTParam param
   *         mht ファイル作成管理データ
   * @param  HTMLAnchorElement button
   *         ボタン
   * @param  HTMLAnchorElement button2
   *         別名で保存ボタン
   * @param  HTMLSpanElement progress
   *         進行状況
   * @param  HTMLSpanElement progress2
   *         進行状況
   */
  checkFiles : function (param, button, button2, progress, progress2) {
    var ok = 0, ng = 0, na = 0;
    for (var i = 0; i < param.files.length; i ++) {
      switch (param.files [i].status) {
        case arAkahukuMHT.FILE_STATUS_NA_CACHE:
          na ++;
          break;
        case arAkahukuMHT.FILE_STATUS_NA_CACHE_BACKUP:
          na ++;
          break;
        case arAkahukuMHT.FILE_STATUS_NA_NET:
          na ++;
          break;
        case arAkahukuMHT.FILE_STATUS_OK:
          ok ++;
          break;
        case arAkahukuMHT.FILE_STATUS_NG:
          ng ++;
          break;
      }
    }
        
    var text
    = "\u4FDD\u5B58\u4E2D..."
    + "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u6574\u5F62\u5B8C\u4E86..."
    + "\u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u53CE\u96C6\u4E2D"
    + "(" + ok + "+" + ng + "/" + param.files.length + ")...";
    arAkahukuDOM.setText (progress, text);
    if (progress2) {
      var text2
        = "(" + ok + "+" + ng + "/" + param.files.length + ")...";
      arAkahukuDOM.setText (progress2, text2);
    }
        
    if (na) {
      /* 取得中が残っている場合、チェックを続ける */
      return;
    }
        
    /* 全て取得完了か、取得不可になった場合、チェックをやめる */
        
    button.style.display = "none";
    if (button2) {
      button2.style.display = "none";
    }
    var window = param.targetDocument.defaultView;
    window.clearInterval (param.checkTimerID);
    param.checkTimerID = null;
        
    text
    = "\u4FDD\u5B58\u4E2D..."
    + "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u6574\u5F62\u5B8C\u4E86..."
    + "\u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u53CE\u96C6\u5B8C\u4E86"
    + "(" + ok + "+" + ng + "/" + param.files.length + ")..."
    + "\u30D5\u30A1\u30A4\u30EB\u306B\u51FA\u529B\u4E2D...";
    arAkahukuDOM.setText (progress, text);
    if (progress2) {
      text2
        = "(" + ok + "+" + ng + "/" + param.files.length + ")...";
      arAkahukuDOM.setText (progress2, text2);
    }
        
    window.setTimeout
    (arAkahukuMHT.createMHTFile,
     100,
     param);
  },
    
  /**
   * mht ファイルを作成する
   *
   * @param  arAkahukuMHTParam param
   *         mht ファイル作成管理データ
   */
  createMHTFile : function (param) {
    var error = false;
        
    try {
      var i, j;
      var targetDocument = param.targetDocument;
      var targetWindow = targetDocument.defaultView;
            
      var button
        = targetDocument.getElementById ("akahuku_savemht_button");
      var button2
        = targetDocument.getElementById ("akahuku_savemht_saveas_button");
      var progress
        = targetDocument.getElementById ("akahuku_savemht_progress");
      var status
        = targetDocument.getElementById ("akahuku_savemht_status");
      var progress2
        = targetDocument.getElementById ("akahuku_throp_savemht_progress");
      var status2
        = targetDocument.getElementById ("akahuku_throp_savemht_status");
            
      /* 現在見ているページを取得する */
      var fileData
        = arAkahukuMHT.getIndexFileData (param.cloneDocument,
                                         targetDocument.location.href);
      fileData.ownerDocument = targetDocument;
      param.files.unshift (fileData);
      var title = targetDocument.title;
      param.cloneDocument = null;
            
      /* ヘッダに必要な情報を設定する */
      var subject
        = "=?iso-2022-jp?B?"
        + btoa (arAkahukuConverter.convertToISO2022JP (title)) + "?=";
      var boundary = "----=_NextPart_000_0000_";
      var hex = [
        "0", "1", "2", "3", "4", "5", "6", "7",
        "8", "9", "A", "B", "C", "D", "E", "F"
        ];
      for (i = 0; i < 8; i ++) {
        boundary += hex [parseInt (Math.random () * 15)];
      }
      boundary += ".";
      for (i = 0; i < 8; i ++) {
        boundary += hex [parseInt (Math.random () * 15)];
      }
      var date
        = (new Date ()).toString ()
        .replace (/^([A-Za-z]{3}) /, "$1, ")
        .replace (/ \(.*\)$/, "");
            
      /* ファイルに書き込む */
      var fstream = arAkahukuFile.createFileOutputStream
        (param.tmpFile, 0x02 | 0x08 | 0x20, 420/*0644*/, 0,
         targetWindow);
            
      var data = "";
            
      /* 全体のヘッダ */
      data
        = "From: <Saved by Akahuku>\r\n"
        + "Subject: " + subject + "\r\n"
        + "Date: " + date + "\r\n"
        + "MIME-Version: 1.0\r\n"
        + "Content-Type: multipart/related;\r\n"
        + "\tboundary=\"" + boundary + "\";\r\n"
        + "\ttype=\"text/html\"\r\n"
        + "\r\n";
      fstream.write (data, data.length);
            
      var ignoreFiles = new Array ();
            
      var ok = 0;
      var ng = 0;
      for (i = 0; i < param.files.length; i ++) {
        if (param.files [i].status
            == arAkahukuMHT.FILE_STATUS_OK) {
          ok ++;
          /* 取得完了したファイルは書き込む */
                    
          /* 各ファイルのヘッダ */
          data = "--" + boundary + "\r\n";
          fstream.write (data, data.length);
                    
          if (param.files [i].cache == "") {
            arAkahukuMHT.createFileCache (param.files [i]);
          }
          fstream.write (param.files [i].cache,
                         param.files [i].cache.length);
        }
        else {
          /* 取得できなかったファイルをリストアップ */
                    
          ng ++;
          ignoreFiles.push (param.files [i]);
        }
      }
            
      /* 最後の boundary */
      data = "--" + boundary + "--\r\n";
      fstream.write (data, data.length);
      fstream.close ();
            
      if (Akahuku.useFrameScript) {
        // e10s hack: 親プロセスの処理を少し待たないと
        // 続く moveTo が NS_ERROR_FILE_IS_LOCKED を投げる
        // (100msが妥当な保証は無し)
        arAkahukuUtil.wait (100);
      }
      try {
        arAkahukuFile.moveTo (param.tmpFile, null, param.file.leafName);
      }
      catch (e if e.result === Components.results.NS_ERROR_FILE_IS_LOCKED) {
        // ロックが解けるのを少し待ってリトライ
        arAkahukuUtil.wait (300);
        arAkahukuFile.moveTo (param.tmpFile, null, param.file.leafName);
      }
            
      /* 完了のメッセージを表示する */
      var text = "\u4FDD\u5B58\u306B\u6210\u529F\u3057\u307E\u3057\u305F";
      text += "(\u30D5\u30A1\u30A4\u30EB\u6570: " + (ok - 1);
      if (ng > 0) {
        text += " + " + ng;
      }
      text += "/" +  (ok - 1 + ng) + ")";
      if (arAkahukuMHT.enablePreview
          && arAkahukuMHT.enablePreviewCount) {
        var totalCount = 0, saveCount = 0, n;
        for (n in param.previewSaveUrls) {
          saveCount ++;
        }
        for (n in param.previewTotalUrls) {
          totalCount ++;
        }
        text += "(" + saveCount + "/" + totalCount + ")";
      }
      arAkahukuDOM.setText (progress, text);
            
      var info
        = Akahuku.getDocumentParam (targetDocument).location_info;
      if (info.replyFrom != 1) {
        var span = targetDocument.createElement ("span");
        span.id = "akahuku_savemht_progress_error";
        span.appendChild
          (targetDocument.createTextNode
           ("\u30EC\u30B9\u304C\u5168\u3066\u8868\u793A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002"));
        progress.insertBefore (span, progress.firstChild);
      }
            
      if (progress2) {
        var text2 = "\u6210\u529F";
        text2 += "(" + (ok - 1);
        if (ng > 0) {
          text2 += " + " + ng;
        }
        text2 += "/" +  (ok - 1 + ng) + ")";
        if (arAkahukuMHT.enablePreview
            && arAkahukuMHT.enablePreviewCount) {
          var totalCount = 0, saveCount = 0, n;
          for (n in param.previewSaveUrls) {
            saveCount ++;
          }
          for (n in param.previewTotalUrls) {
            totalCount ++;
          }
          text2 += "(" + saveCount + "/" + totalCount + ")";
        }
        arAkahukuDOM.setText (progress2, text2);
        
      }
      
      if (ng > 0) {
        /* 取得できなかったファイルをリストアップ */
        status.appendChild (targetDocument.createTextNode (ignoreFiles.length + " \u500B\u306E\u30D5\u30A1\u30A4\u30EB\u304C\u4FDD\u5B58\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F"));
        if (status2) {
          status2.appendChild (targetDocument.createTextNode (ignoreFiles.length + " \u500B NG"));
        }
        var text = "";
        var display = "";
        if (arAkahukuMHT.enableCloseNoCacheList) {
          text = "\u30EA\u30B9\u30C8\u3092\u898B\u308B";
          display = "none";
        }
        else {
          text = "\u30EA\u30B9\u30C8\u3092\u6D88\u3059";
          display = "";
        }
                
        var anchor = targetDocument.createElement ("a");
        anchor.id = "akahuku_savemht_opennocachelist"
          anchor.appendChild (targetDocument.createTextNode
                              (text));
        anchor.addEventListener
          ("click",
           function () {
            arAkahukuMHT.onOpenNoCacheList (arguments [0]);
          }, false);
        status.appendChild (targetDocument.createTextNode ("["));
        status.appendChild (anchor);
        status.appendChild (targetDocument.createTextNode ("]"));
        status.appendChild (targetDocument.createElement ("br"));

        var div = targetDocument.createElement ("div");
        div.id = "akahuku_savemht_nocachelist";
        div.style.display = display;
                
        for (i = 0; i < ignoreFiles.length; i ++) {
          var dup = false;
          for (j = 0; j < i; j ++) {
            if (ignoreFiles [j].location == ignoreFiles [i].location) {
              dup = true;
            }
          }
          if (!dup) {
            var uri = ignoreFiles [i].location;
            if (arAkahukuLink.enableAutoLink) {
              var anchor = targetDocument.createElement ("a");
              anchor.className = "akahuku_generated_link";
              anchor.setAttribute ("dummyhref",
                                   uri);
              arAkahukuLink.addAutoLinkEventHandlerCore (anchor);
              arAkahukuLink.updateAutoLinkVisitedCore (anchor);
              anchor.appendChild (targetDocument.createTextNode
                                  (uri));
              div.appendChild (anchor);
            }
            else {
              div.appendChild (targetDocument.createTextNode
                               (uri));
            }
            if (Akahuku.debug.enabled && ignoreFiles [i].statusMessage) {
              div.appendChild (targetDocument.createTextNode (" " + ignoreFiles [i].statusMessage));
            }
            div.appendChild (targetDocument.createElement
                             ("br"));
          }
        }
        status.appendChild (div);
      }
    }
    catch (e) {
      /* エラーメッセージを表示する */
      var span;
      span = targetDocument.createElement ("span");
      span.id = "akahuku_savemht_error";
      span.appendChild
      (targetDocument.createTextNode
       ("\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
      arAkahukuDOM.setText (progress, null);
      if (progress2) {
        arAkahukuDOM.setText (progress2, text);
      }
      progress.appendChild (span);
            
      var s;
      s = e.toString ();
      if (s.match (/FILE_NOT_FOUND/)) {
        s = "\u4FDD\u5B58\u5148\u306B\u7A7A\u304D\u5BB9\u91CF\u304C\u7121\u3044\u3088\u3046\u3067\u3059";
      }
      else if (s.match (/NS_ERROR_FILE_NO_DEVICE_SPACE/)) {
        s = "\u4FDD\u5B58\u5148\u306B\u7A7A\u304D\u5BB9\u91CF\u304C\u7121\u3044\u3088\u3046\u3067\u3059";
      }
      else {
        s = "\u30A8\u30E9\u30FC";
        if (e.lineNumber) {
          s
            += " (" + e.fileName + ":" + e.lineNumber
            + " \u884C\u76EE)";
        }
        s += ": " + e;
      }
      arAkahukuDOM.setText (status, s);
      if (status2) {
        arAkahukuDOM.setText (status2, "error!!!");
      }
            
      error = true;
    }
        
    arAkahukuDOM.setText (button, "MHT \u3067\u4FDD\u5B58");
    button.style.display = "inline";
    
    if (button2) {
      arAkahukuDOM.setText
        (button2, "\u5225\u540D\u3067 MHT \u3067\u4FDD\u5B58");
      button2.style.display = "inline";
    }
        
    param.isBusy = false;
    if (arAkahukuMHT.enableNolimit) {
      arAkahukuConfig.restoreTime ();
    }
        
    if (!error) {
      arAkahukuSound.playSaveMHT ();
    }
    else {
      arAkahukuSound.playSaveMHTError ();
    }
  },
    
  /**
   * [リストを見る] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onOpenNoCacheList : function (event) {
    var targetDocument = event.target.ownerDocument;
    var div
    = targetDocument.getElementById ("akahuku_savemht_nocachelist");
    var anchor
    = targetDocument.getElementById ("akahuku_savemht_opennocachelist");
    if (div.style.display == "none") {
      div.style.display = "";
      arAkahukuDOM.setText (anchor,
                            "\u30EA\u30B9\u30C8\u3092\u6D88\u3059");
    }
    else {
      div.style.display = "none";
      arAkahukuDOM.setText (anchor,
                            "\u30EA\u30B9\u30C8\u3092\u898B\u308B");
    }
    event.preventDefault ();
  },
    
  /**
   * mht で保存する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  Boolean saveas
   *         別名で保存
   */
  saveMHT : function (targetDocument, saveas) {
    var window = targetDocument.defaultView;
    var param
    = Akahuku.getDocumentParam (targetDocument).mht_param;
        
    var button
    = targetDocument.getElementById ("akahuku_savemht_button");
    var button2
    = targetDocument.getElementById ("akahuku_savemht_saveas_button");
    var progress
    = targetDocument.getElementById ("akahuku_savemht_progress");
    var status
    = targetDocument.getElementById ("akahuku_savemht_status");
    var progress2
    = targetDocument.getElementById ("akahuku_throp_savemht_progress");
    var status2
    = targetDocument.getElementById ("akahuku_throp_savemht_status");
        
    param.cloneDocument = null;
        
    if (param.isBusy) {
      arAkahukuDOM.setText (button, "MHT \u3067\u4FDD\u5B58");
      if (button2) {
        arAkahukuDOM.setText
          (button2, "\u5225\u540D\u3067 MHT \u3067\u4FDD\u5B58");
      }
      arAkahukuDOM.setText (progress,
                            "\u4E2D\u65AD\u3057\u307E\u3057\u305F");
      if (progress2) {
        arAkahukuDOM.setText (progress2,
                              "\u4E2D\u65AD\u3057\u307E\u3057\u305F");
      }
      arAkahukuDOM.setText (status, null);
      if (status2) {
        arAkahukuDOM.setText (status2, null);
      }
            
      try {
        if (param.checkTimerID != null) {
          window.clearInterval (param.checkTimerID);
          param.checkTimerID = null;
        }
        for (var i = 0; i < param.files.length; i ++) {
          try {
            param.files [i].status = arAkahukuMHT.FILE_STATUS_NG;
            param.files [i].statusMessage = "";
            param.files [i].node = null;
            param.files [i].content = "";
            param.files [i].originalContent = "";
            // 通信中ならキャンセルする
            if (param.files [i].channel) {
              param.files [i].channel.cancel 
                (Components.results.NS_BINDING_ABORTED);
            }
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
      }
      catch (e) { Akahuku.debug.exception (e);
      }
            
      param.isBusy = false;
      if (arAkahukuMHT.enableNolimit) {
        arAkahukuConfig.restoreTime ();
      }
            
      arAkahukuSound.playSaveMHTError ();
            
      return;
    }
    
    param.isBusy = true;
    if (arAkahukuMHT.enableNolimit) {
      arAkahukuConfig.setTime (arAkahukuMHT.limitTime);
    }
        
    if (!arAkahukuConfig.isObserving) {
      /* 監視していない場合にのみ設定を取得する */
      arAkahukuConfig.loadPrefBranch ();
      arAkahukuMHT.getConfig ();
    }
        
    arAkahukuDOM.setText (button, "\u4E2D\u65AD");
    if (button2) {
      arAkahukuDOM.setText (button2, "\u4E2D\u65AD");
    }
    arAkahukuDOM.setText (progress, "\u4FDD\u5B58\u4E2D...");
    if (progress2) {
      arAkahukuDOM.setText (progress2, "\u4FDD\u5B58\u4E2D...");
    }
    arAkahukuDOM.setText (status, null);
    if (status2) {
      arAkahukuDOM.setText (status2, null);
    }
        
    /* ファイル名を設定する */
    var filename = "";
    var filename_base = "";
    var dirname_base = "";
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
        
    if (arAkahukuMHT.defaultType == "simple") {
      if (arAkahukuMHT.enableDefaultServer) {
        if (filename_base) {
          filename_base += "_";
        }
        filename_base += info.escapeForFilename (info.server);
      }
            
      if (arAkahukuMHT.enableDefaultDir) {
        if (filename_base) {
          filename_base += "_";
        }
        filename_base += info.escapeForFilename (info.dir);
      }
            
      if (arAkahukuMHT.enableDefaultThread) {
        if (filename_base) {
          filename_base += "_";
        }
        filename_base += info.threadNumber;
      }
            
      if (arAkahukuMHT.enableDefaultTitle) {
        if (filename_base) {
          filename_base += "_";
        }
        filename_base += info.escapeForFilename (targetDocument.title);
      }
    }
    else {
      filename_base
      = arAkahukuConverter.unescapeEntity
      (info.format (arAkahukuMHT.defaultFormat));
      var tmp = info.escapeForFilename (filename_base, true);
      dirname_base = tmp [0];
      filename_base = tmp [1];
    }
        
    if (filename_base == "") {
      filename_base = "\u304A\u3063\u3071\u3044\u301C\u3093";
    }
        
    filename = filename_base + ".mht";
        
    if (dirname_base) {
      dirname_base = arAkahukuMHT.base + arAkahukuFile.separator + dirname_base;
            
      try {
        var dir
          = Components.classes ["@mozilla.org/file/local;1"]
          .createInstance (Components.interfaces.nsILocalFile);
        dir.initWithPath (dirname_base);
      }
      catch (e) {
        /* ベースのディレクトリが不正 */
        arAkahukuImage.onSave
          (target, false,
           "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059", "", normal);
        return;
      }
            
      if (!dir.exists ()) {
        arAkahukuFile.createDirectory (dir.path);
      }
    }
    else {
      dirname_base = arAkahukuMHT.base;
    }
    
    if (!saveas && arAkahukuMHT.enableAuto) {
      /* ファイル選択を省略しているので、デフォルトのディレクトリ以下に作成する */
            
      try {
        var file
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (Components.interfaces.nsILocalFile);
        try {
          file.initWithPath (dirname_base
                             + arAkahukuFile.separator
                             + filename);
        }
        catch (e) {
          /* ベースのディレクトリが不正 */
          throw "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059";
        }
        
        if (!file.exists ()) {
          if (!arAkahukuMHT.enableAutoUnique
              && param.lastFilename) {
            /* 上書きする設定の場合で前のファイル名が違う場合、削除する */
            var file2
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (Components.interfaces
                             .nsILocalFile);
            try {
              file2.initWithPath (dirname_base
                                  + arAkahukuFile.separator
                                  + param.lastFilename);
            }
            catch (e) {
              /* ベースのディレクトリが不正 */
              throw "\u4FDD\u5B58\u5148\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8A2D\u5B9A\u304C\u7570\u5E38\u3067\u3059";
            }
                        
            if (file2.exists ()) {
              try {
                file2.remove (false);
              }
              catch (e) { Akahuku.debug.exception (e);
                /* 何故か存在しない事がある */
              }
            }
          }
        }
        else {
          if (arAkahukuMHT.enableAutoUnique) {
            file.createUnique (0x00, 420/*0644*/);
          }
        }
        param.lastFilename = filename;
      }
      catch (e) {
        /* エラーメッセージを表示する */
        var span;
        span = targetDocument.createElement ("span");
        span.id ="akahuku_savemht_error";
        span.appendChild
        (targetDocument.createTextNode
         ("\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
        arAkahukuDOM.setText (progress, null);
        progress.appendChild (span);
        if (progress2) {
          progress2.appendChild (span.cloneNode (true));
        }
                
        var s = "\u30A8\u30E9\u30FC";
        if (e.lineNumber) {
          s += " (" + e.fileName + ":" + e.lineNumber + " \u884C\u76EE)";
        }
        s += ": " + e;
        arAkahukuDOM.setText (status, s);
        if (status2) {
          arAkahukuDOM.setText (status2, "error!!!");
        }
                
        arAkahukuDOM.setText (button, "MHT \u3067\u4FDD\u5B58");
        if (button2) {
          arAkahukuDOM.setText
            (button2, "\u5225\u540D\u3067 MHT \u3067\u4FDD\u5B58");
        }
                
        param.isBusy = false;
        if (arAkahukuMHT.enableNolimit) {
          arAkahukuConfig.restoreTime ();
        }
                
        arAkahukuSound.playSaveMHTError ();
                
        return;
      }
            
      var text
      = "\u4FDD\u5B58\u4E2D..."
      + "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u6574\u5F62\u4E2D...";
      arAkahukuDOM.setText (progress, text);
      if (progress2) {
        var text2
          = "\u4FDD\u5B58\u4E2D...";
        arAkahukuDOM.setText (progress2, text2);
      }
            
      param.file = file;
      param.tmpFile
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
      var tmpFileName
      = new Date ().getTime ()
      + "_" + Math.floor (Math.random () * 1000);
      param.tmpFile.initWithFile (param.file.parent);
      param.tmpFile.appendRelativePath (tmpFileName);
            
      window.setTimeout
      (arAkahukuMHT.saveMHTCore,
       100,
       param);
    }
    else {
      /* ファイル選択ダイアログを表示する */
            
      var browser = arAkahukuWindow.getBrowserForWindow (window);
      arAkahukuMHT.asyncOpenSaveMHTFilePicker
        (browser, filename, dirname_base, function (ret, file, dir) {

      if (ret == Components.interfaces.nsIFilePicker.returnOK
          || ret == Components.interfaces.nsIFilePicker.returnReplace) {
        var text
          = "\u4FDD\u5B58\u4E2D..."
          + "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u6574\u5F62\u4E2D...";
        arAkahukuDOM.setText (progress, text);
        if (progress2) {
          arAkahukuDOM.setText (progress2, text);
        }
                
        param.file = file;
        if (!param.file.leafName.match (/\.mht$/)) {
          var path = param.file.path + ".mht";
          param.file
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (Components.interfaces.nsILocalFile);
          param.file.initWithPath (path);
        }
        param.tmpFile
          = Components.classes ["@mozilla.org/file/local;1"]
          .createInstance (Components.interfaces.nsILocalFile);
        var tmpFileName
          = new Date ().getTime ()
          + "_" + Math.floor (Math.random () * 1000);
        param.tmpFile.initWithPath (dir.path);
        param.tmpFile.appendRelativePath (tmpFileName);
                
        window.setTimeout
          (arAkahukuMHT.saveMHTCore,
           100,
           param);
      }
      else {
        arAkahukuDOM.setText (button, "MHT \u3067\u4FDD\u5B58");
        if (button2) {
          arAkahukuDOM.setText
            (button2, "\u5225\u540D\u3067 MHT \u3067\u4FDD\u5B58");
        }
        arAkahukuDOM.setText (progress,
                              "\u4E2D\u65AD\u3057\u307E\u3057\u305F");
        if (progress2) {
          arAkahukuDOM.setText (progress2,
                                "\u4E2D\u65AD\u3057\u307E\u3057\u305F");
        }
                
        param.isBusy = false;
        if (arAkahukuMHT.enableNolimit) {
          arAkahukuConfig.restoreTime ();
        }
                
        arAkahukuSound.playSaveMHTError ();
      }
        });// asyncOpenSaveMHTFilePicker
    }
  },
  /**
   * 保存先のファイルを選ぶ(要Chrome process)
   */
  asyncOpenSaveMHTFilePicker : function (browser, filename, dirname_base, callback) {
    var chromeWindow = browser.ownerDocument.defaultView.top;
    var filePicker
    = Components.classes ["@mozilla.org/filepicker;1"]
    .createInstance (Components.interfaces.nsIFilePicker);
    filePicker.init
      (chromeWindow,
       // "保存先のファイルを選んでください"
       "\u4FDD\u5B58\u5148\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
       Components.interfaces.nsIFilePicker.modeSave);
    filePicker.appendFilter ("MHT Files", "*.mht");
    filePicker.defaultString = filename;
    filePicker.appendFilters
      (Components.interfaces.nsIFilePicker.filterAll);
    try {
      var dir
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (Components.interfaces.nsILocalFile);
      dir.initWithPath (dirname_base);

      filePicker.displayDirectory = dir;
    }
    catch (e) {
      /* ベースのディレクトリが不正 */
    }

    arAkahukuCompat.FilePicker.open
      (filePicker, function (ret) {
        var file = null;
        var dir = null;
        if (ret == Components.interfaces.nsIFilePicker.returnOK
            || ret == Components.interfaces.nsIFilePicker.returnReplace) {
          file = filePicker.file;
          dir = file.parent;
        }
        callback.apply (null, [ret, file, dir]);
      });
  },
    
  /**
   * 外部への参照を持たない HTML ツリーを生成する
   * src、href 属性をそれぞれ dummysrc、dummyhref に変換する
   *
   * @param  HTMLDocument targetDocument
   *         要素の生成に使用するドキュメント
   * @param  HTMLElement fromNode
   *         対象の要素
   * @return HTMLElement
   *         生成したツリーの根
   */
  cloneDummy : function (targetDocument, fromNode) {
    var node, name, value;
        
    var nodeName = fromNode.nodeName.toLowerCase ();
    if (nodeName == "#text") {
      node = targetDocument.createTextNode (fromNode.nodeValue);
    }
    else if (nodeName == "#comment") {
      node = targetDocument.createComment (fromNode.nodeValue);
    }
    else if (nodeName == "ad-") {
      /* Outpost が生成する広告削除済みを示す img の代替要素 */
      return null;
    }
    else {
      node
      = targetDocument.createElement (fromNode.nodeName.toLowerCase ());
      if (fromNode.attributes) {
        for (var i = 0; i < fromNode.attributes.length; i ++) {
          name = fromNode.attributes.item (i).name.toLowerCase ();
          value = fromNode.attributes.item (i).value;
          if (name == "src") {
            name = "dummysrc";
          }
          else if (name == "href") {
            name = "dummyhref";
          }
          else if (name == "id") {
            name = "__id";
          }
          else if (name == "class") {
            name = "__class";
          }
                    
          try {
            node.setAttribute (name, value);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
        }
      }
            
      fromNode = fromNode.firstChild;
      while (fromNode) {
        var subnode = arAkahukuMHT.cloneDummy (targetDocument,
                                               fromNode);
        if (subnode) {
          node.appendChild (subnode);
        }
        fromNode = fromNode.nextSibling;
      }
    }
        
    return node;
  },
    
  /**
   * HTML ツリーを文字列に変換する
   * mht で保存するためにいくつか変更を行なう
   *
   * @param  HTMLElement element
   *         対象の要素
   * @return String
   *         要素全体の HTML
   */
  convertToPlainText : function (element) {
    var text = "";
    var attributes = "";
    var node = null;
        
    if (element
        && element.nodeName) {
      var nodeName = element.nodeName.toLowerCase ();
            
      if (nodeName == "#text") {
        text += arAkahukuConverter.escapeEntity (element.nodeValue);
      }
      else if (nodeName == "#comment") {
        /* コメントをコメントとして展開する */
        text
          += "<!--"
          + arAkahukuConverter.escapeEntity (element.nodeValue)
          + "-->";
      }
      else {
        if (nodeName == "base") {
          return text;
        }
        else if (nodeName == "wbr") {
          return text;
        }
        else if (nodeName == "a"
                 && (element.getAttribute ("style") || "")
                 .match (/display *: *none/i)) {
          return text;
        }
                
        var isPreview
          = (nodeName == "img"
             && arAkahukuDOM.getClassName (element)
             == "akahuku_preview");
        var isPreviewLink
          = (nodeName == "a"
             && arAkahukuDOM.getClassName (element)
             == "akahuku_generated_link");
        var isP2P
          = element.hasAttribute ("__akahuku_p2p");
                
        var src = "";
        var name, value;
                
        if (isP2P) {
          element.removeAttribute ("__akahuku_p2p");
        }
                
        if (isP2P && !isPreview && !isPreviewLink) {
          if (element.getAttribute ("dummysrc")) {
            src = element.getAttribute ("dummysrc");
          }
          else if (element.getAttribute ("dummyhref")) {
            src = element.getAttribute ("dummyhref");
          }
        }
        if (isPreview) {
          src = element.getAttribute ("dummyhref");
          element.removeAttribute ("title");
          element.removeAttribute ("dummyhref");
        }
        else if (isPreviewLink) {
          src = element.getAttribute ("dummyhref");
        }
        if (element.attributes) {
          for (var i = 0; i < element.attributes.length; i ++) {
            name
              = element.attributes.item (i).name
              .toLowerCase ();
            value = element.attributes.item (i).value;
                        
            if (nodeName == "font"
                && name == "title") {
              continue;
            }
                        
            /* 避難所 patch */
            if (nodeName == "meta"
                && name == "content"
                && value.match (/(EUC-JP|UTF-8)/)) {
              value
                = value.replace (/(EUC-JP|UTF-8)/,
                                 "Shift_JIS");
            }
                        
            if (name == "dummyhref") {
              name = "href";
            }
            else if (name == "dummysrc") {
              name = "src";
            }
            else if (name == "__class") {
              name = "class";
            }
            else if (name == "__id") {
              name = "id";
            }
                        
            if (isP2P) {
              if (name == "src"
                  || name == "href") {
                value = src;
              }
            }
            
            if (isPreview) {
              /* プレビュー画像の場合 */
              if (name == "src") {
                /* src にはドキュメントのアドレスを付ける */
                value = src;
              }
              else if (name == "class"
                       || name == "__class") {
                /* class は消す */
                continue;
              }
            }
            else if (isPreviewLink) {
              /* プレビュー画像の場合 */
              if (name == "href") {
                /* href にはドキュメントのアドレスを付ける */
                value = src;
              }
              else if (name == "class"
                       || name == "__class") {
                /* class は消す */
                continue;
              }
            }
                        
            if (value == "") {
              /* 値のないものは無視する */
              continue;
            }
                        
            if (name == "src" || name == "href") {
              /* p2p や cache のアドレスは元に戻す */
              value = Akahuku.deAkahukuURI (value, ["cache","p2p"]);
            }
                        
            attributes += " " + name +  "=" + "\"" + value + "\"";
          }
        }
                
        text += "<" + nodeName + attributes + ">";
                
        if (nodeName == "style"
            || nodeName == "script") {
          node = element.firstChild;
          while (node) {
            text
              += arAkahukuConverter.unescapeEntity
              (node.nodeValue);
                        
            node = node.nextSibling;
          }
        }
        else {
          node = element.firstChild;
          while (node) {
            text
              += arAkahukuMHT.convertToPlainText (node);
                        
            node = node.nextSibling;
          }
        }
                
        if (nodeName != "br"
            && nodeName != "img"
            && nodeName != "imput"
            && nodeName != "hr"
            && nodeName != "meta") {
          text += "</" + nodeName + ">";
        }
      }
    }
        
    return text;
  },
    
  /**
   * [保存用に整形] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCleanupClick : function (event) {
    var targetDocument = event.target.ownerDocument;
    var info
    = Akahuku.getDocumentParam (targetDocument).location_info;
    arAkahukuMHT.cleanup (info, targetDocument, null, true, false);
    arAkahukuThread.restoreIgnoredStyles (targetDocument);
    event.preventDefault ();
  },
    
  /**
   * [P2P で元画像を取得] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onUseP2PClick : function (event) {
    var targetDocument = event.target.ownerDocument;
    var window = targetDocument.defaultView;
    event.preventDefault ();
        
    var result = arAkahukuP2P.applyP2P (targetDocument,
                                        targetDocument,
                                        true);
        
    var text = "";
    if (result [3] == 0) {
      if (result [2] == 0) {
        text = "\u5BFE\u8C61\u306F\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F";
      }
      else {
        text = result [2] + "\u500B\u306E\u753B\u50CF\u304C\u4FDD\u7559\u4E2D\u3067\u3059";
      }
    }
    else {
      if (result [2] == 0) {
        text = result [3] + "\u500B\u306E\u753B\u50CF\u3092\u30AD\u30E5\u30FC\u306B\u7A81\u3063\u8FBC\u307F\u307E\u3057\u305F";
      }
      else {
        text = result [3] + "\u500B\u306E\u753B\u50CF\u3092\u30AD\u30E5\u30FC\u306B\u7A81\u3063\u8FBC\u307F\u307E\u3057\u305F, ";
        text += result [2] + "\u500B\u306E\u753B\u50CF\u304C\u4FDD\u7559\u4E2D\u3067\u3059";
      }
    }

    var progress
    = targetDocument.getElementById ("akahuku_savemht_progress");
    arAkahukuDOM.setText (progress, text);
    window.setTimeout (function (progress) {
        arAkahukuDOM.setText (progress, null);
      }, 3000, progress);        
  },
    
  /**
   * [mht で保存] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  Boolean saveas
   *         別名で保存
   */
  onSaveMHTClick : function (event, saveas) {
    var targetDocument = event.target.ownerDocument;
    event.preventDefault ();
        
    arAkahukuMHT.saveMHT (targetDocument, saveas);
  },
    
  /**
   * [mht で保存] ボタンのイベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSaveMHTImageLinkClick : function (event) {
    var target = event.explicitOriginalTarget;
    if (target.getAttribute ("title") == "x") {
      target.setAttribute ("title", "o")
        }
    else {
      target.setAttribute ("title", "x")
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
        
    param = documentParam.mht_param;
    if (param) {
      try {
        param.destruct ();
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
    documentParam.mht_param = null;
  },
    
  /**
   * [保存用に整形] ボタン、[mht で保存] ボタンを追加する
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  arAkahukuLocationInfo info
   *         アドレスの情報
   */
  apply : function (targetDocument, info) {
    if (info.isNotFound || info.isTsumanne || info.isCatalog) {
      return;
    }
        
    if (info.isRedirect) {
      /* キャッシュを複製 */
      var html = targetDocument.documentElement;
            
      var utf16 = arAkahukuMHT.convertToPlainText (html);
      var sjis = arAkahukuConverter.convertToSJIS (utf16, "\r\n");
            
      var writer = new arAkahukuMHTRedirectCacheWriter ();
      writer.body = sjis;
            
      try {
        Akahuku.Cache.asyncOpenCacheToWrite
          ({url: targetDocument.location.href + ".backup",
            triggeringNode: targetDocument},
            writer);
      }
      catch (e) { Akahuku.debug.exception (e);
      }
    }
        
    var nodes = Akahuku.getMessageBQ (targetDocument);
    if (nodes.length == 0) {
      /* コメントが 1 つも無い場合は何もしない */
      return;
    }
        
    if (info.isReply) {
      if (info.isOnline && arAkahukuMHT.enableCleanup) {
        var container = targetDocument.createElement ("div");
        container.id = "akahuku_cleanup_container";
                
        var button = targetDocument.createElement ("a");
        button.id = "akahuku_cleanup_button";
        button.addEventListener
        ("click",
         function () {
          arAkahukuMHT.onCleanupClick (arguments [0]);
        }, false);
        button.appendChild (targetDocument.createTextNode
                            ("\u4FDD\u5B58\u7528\u306B\u6574\u5F62"));
                
        container.appendChild (targetDocument.createTextNode ("["));
        container.appendChild (button);
        container.appendChild (targetDocument.createTextNode ("]"));
                
        targetDocument.body.appendChild (container);
      }
            
      if (info.isOnline && arAkahukuMHT.enable && !info.isTsumanne) {
        var param = new arAkahukuMHTParam (targetDocument);
        Akahuku.getDocumentParam (targetDocument).mht_param = param;
                
        var container = targetDocument.createElement ("div");
        container.id = "akahuku_savemht_container";
                
        if (arAkahukuMHT.enableImagelinkPerThread) {
          var checkbox = targetDocument.createElement ("input");
          checkbox.id = "akahuku_savemht_imagelink";
          checkbox.type = "checkbox";
          if (arAkahukuMHT.enableImagelink) {
            checkbox.checked = true;
          }
                
          container.appendChild (checkbox);
          container.appendChild (targetDocument.createTextNode ("\u5143\u753B\u50CF\u3082\u4FDD\u5B58"));
          container.appendChild (targetDocument.createTextNode (" ("));
          var radio, img;
          radio = targetDocument.createElement ("input");
          radio.id = "akahuku_savemht_imagelink_all";
          radio.name = "akahuku_savemht_imagelink_type";
          radio.type = "radio";
          if (!arAkahukuMHT.enableImagelinkThread) {
            radio.checked = true;
          }
          container.appendChild (radio);
          container.appendChild (targetDocument.createTextNode ("\u5168\u90E8 "));
                    
          radio = targetDocument.createElement ("input");
          radio.id = "akahuku_savemht_imagelink_thread";
          radio.name = "akahuku_savemht_imagelink_type";
          radio.type = "radio";
          if (arAkahukuMHT.enableImagelinkThread) {
            radio.checked = true;
          }
          container.appendChild (radio);
          container.appendChild (targetDocument.createTextNode ("\u30B9\u30EC\u753B\u50CF\u306E\u307F "));
                    
          radio = targetDocument.createElement ("input");
          radio.id = "akahuku_savemht_imagelink_checked";
          radio.name = "akahuku_savemht_imagelink_type";
          radio.type = "radio";
          container.appendChild (radio);
          img = targetDocument.createElement ("img");
          img.style.width = "16px";
          img.style.height = "16px";
          img.src
            = Akahuku.protocolHandler.enAkahukuURI
            ("preview", "chrome://akahuku/content/images/check_o.png");
          container.appendChild (img);

          radio = targetDocument.createElement ("input");
          radio.id = "akahuku_savemht_imagelink_unchecked";
          radio.name = "akahuku_savemht_imagelink_type";
          radio.type = "radio";
          container.appendChild (radio);
          img = targetDocument.createElement ("img");
          img.style.width = "16px";
          img.style.height = "16px";
          img.src
            = Akahuku.protocolHandler.enAkahukuURI
            ("preview", "chrome://akahuku/content/images/check_x.png");
          container.appendChild (img);
                    
          container.appendChild (targetDocument.createTextNode (")"));
          container.appendChild (targetDocument.createElement ("br"));
                    
          nodes = Akahuku.getMessageBQ (targetDocument);
          var node;
          var linkNode;
          var imageNum;
          for (var i = 0; i < nodes.length; i ++) {
            node = nodes [i];
            linkNode = null;
            while (node
                   && node.nodeName.toLowerCase () != "hr") {
              if (node.nodeName.toLowerCase () == "a") {
                var href3;
                href3 = node.getAttribute ("href");
                
                if (href3) {
                  if (href3.match (/red\/([0-9]+)/)
                      || href3.match (/d\/([0-9]+)/)
                      || href3.match (/src\/([0-9]+)/)
                      || href3.match (/r\.php\?r=([0-9]+)/)) {
                    /* 画像のリンクの場合 */
                    var n = node.firstChild;
                    if (n
                        && n.nodeName.toLowerCase ()
                        != "img") {
                      linkNode = node;
                      imageNum = parseInt (RegExp.$1);
                      break;
                    }
                  }
                }
              }
              node = node.previousSibling;
            }
            if (linkNode) {
              node = targetDocument.createElement ("div");
              node.className
                = "akahuku_savemht_imagelink_check";
              node.id
                = "akahuku_savemht_imagelink_" + imageNum;
              node.setAttribute ("title", "o");
              node.addEventListener
                ("click",
                 function () {
                  arAkahukuMHT.onSaveMHTImageLinkClick
                    (arguments [0]);
                }, false);
              linkNode.parentNode.insertBefore
                (node, linkNode);
            }
          }
        }
                
        var button = targetDocument.createElement ("a");
        button.id = "akahuku_savemht_button";
        button.addEventListener
        ("click",
         function () {
          arAkahukuMHT.onSaveMHTClick (arguments [0], false);
        }, false);
        button.appendChild (targetDocument.createTextNode
                            ("MHT \u3067\u4FDD\u5B58"));
        var p2p_button = null;
        if (arAkahukuMHT.enableUseP2P) {
          p2p_button = targetDocument.createElement ("a");
          p2p_button.id = "akahuku_savemht_p2p_button";
          p2p_button.addEventListener
            ("click",
             function () {
              arAkahukuMHT.onUseP2PClick (arguments [0]);
            }, false);
          p2p_button.appendChild (targetDocument.createTextNode
                               ("P2P \u3067\u5143\u753B\u50CF\u3092\u53D6\u5F97"));
        }
        var button2 = null;
        if (arAkahukuMHT.enableAuto
            && arAkahukuMHT.enableAutoSaveAs) {
          button2 = targetDocument.createElement ("a");
          button2.id = "akahuku_savemht_saveas_button";
          button2.addEventListener
            ("click",
             function () {
              arAkahukuMHT.onSaveMHTClick (arguments [0], true);
            }, false);
          button2.appendChild (targetDocument.createTextNode
                               ("\u5225\u540D\u3067 MHT \u3067\u4FDD\u5B58"));
        }
                
        var progress = targetDocument.createElement ("span");
        progress.id = "akahuku_savemht_progress";
                
        container.appendChild (targetDocument.createTextNode ("["));
        container.appendChild (button);
        container.appendChild (targetDocument.createTextNode ("]"));
                
        if (button2) {
          container.appendChild (targetDocument.createTextNode ("["));
          container.appendChild (button2);
          container.appendChild (targetDocument.createTextNode ("]"));
        }
        
        if (p2p_button) {
          container.appendChild (targetDocument.createTextNode ("["));
          container.appendChild (p2p_button);
          container.appendChild (targetDocument.createTextNode ("]"));
        }
                
        container.appendChild (progress);
                
        targetDocument.body.appendChild (container);
                
        var status = targetDocument.createElement ("div");
        status.id = "akahuku_savemht_status";
        targetDocument.body.appendChild (status);
      }
    }
  }
};
