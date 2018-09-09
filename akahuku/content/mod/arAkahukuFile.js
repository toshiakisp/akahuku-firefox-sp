
/* global Components, arAkahukuUtil */

/**
 * gzip ファイル展開用
 *   Inherits From: nsIStreamListener, nsIRequestObserver
 */
function arAkahukuGZIPReader (callback) {
  this.callback = callback;
}
arAkahukuGZIPReader.prototype = {
  data : "",
  callback : null,
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (Components.interfaces.nsISupports)
        || iid.equals (Components.interfaces.nsIStreamListener)
        || iid.equals (Components.interfaces.nsIRequestObserver)) {
      return this;
    }
        
    throw Components.results.NS_NOINTERFACE;
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
    this.callback (this.data);
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
    this.data += bstream.readBytes (count);
  }
};

/**
 * ファイル管理
 */
var arAkahukuFile = {
  separator : "\\",           /* String  ネイティブパスのセパレータ */
  systemDirectory : "",       /* String  システムディレクトリ
                               *   Profile ディレクトリ/Akahuku となる */
    
  /**
   * 初期化
   */
  init : function () {
    /* 各種ディレクトリを作る */
    arAkahukuFile.makeSystemDirectory ();
  },

  term : function () {
    arAkahukuFile.systemDirectory = "";
  },
    
  /**
   * 現在のユーザの Profile ディレクトリを取得する
   *
   * @return  String
   *          現在のユーザの Profile ディレクトリ
   */
  getProfileDirectory : function () {
    return arAkahukuFile.getDirectory ("ProfD");
  },

  getDirectory : function (key) {
    var dirname;
        
    try {
      dirname
        = Components.classes ["@mozilla.org/file/directory_service;1"]
        .getService (Components.interfaces.nsIProperties)
        .get (key, Components.interfaces.nsIFile).path;
    }
    catch (e) {
      dirname = "";
    }
        
    return dirname;
  },
    
  /**
   * システムディレクトリを作成する
   */
  makeSystemDirectory : function () {
    var dirname = arAkahukuFile.getProfileDirectory ();
    if (dirname.indexOf ("\\") != -1) {
      arAkahukuFile.separator = "\\";
    }
    else if (dirname.indexOf ("/") != -1) {
      arAkahukuFile.separator = "/";
    }
    else if (dirname.indexOf (":") != -1) {
      arAkahukuFile.separator = ":";
    }
    arAkahukuFile.systemDirectory
    = dirname + arAkahukuFile.separator + "Akahuku";
        
    arAkahukuFile.createDirectory (arAkahukuFile.systemDirectory);
  },

  // nsILocalFile is removed since Fx57, being merged to nsIFile
  nsIFile : ("nsILocalFile" in Components.interfaces
             ? Components.interfaces.nsILocalFile
             : Components.interfaces.nsIFile),
    
  /**
   * nsIFile オプジェクトを作成する
   * ファイルの実体は作成しない
   *
   * @param  String filename
   *         ファイル名
   * @return nsIFile
   */
  initFile : function (filename) {
    var file = null;
    try {
      file
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (arAkahukuFile.nsIFile);
      file.initWithPath (filename);
    }
    catch (e) {
      Components.utils.reportError (e.message + "; '" + filename + "'");
    }
        
    return file;
  },

  NORMAL_FILE_TYPE : 0,
  DIRECTORY_TYPE : 1,

  /**
   * ユニークな名前を持つファイル/ディレクトリを作成する
   * @param  String ファイル名(候補)
   * @param  Number NORMAL_FILE_TYPE or DIRECTORY_TYPE
   * @param  Number UNIX-style permission value
   */
  createUnique : function (filename, type, permissions) {
    var file = arAkahukuFile.initFile (filename);
    file.createUnique (type, permissions);
    return file;
  },

  /**
   * 書込用ファイルストリームを作成する
   *
   * @param  nsIFile file
   * @param  long ioFlags
   * @param  long perm
   * @param  long behaviorFlags
   * @param  Window contentWindow (e10s対応用)
   * @return nsIFileOutputStream
   */
  createFileOutputStream : function (file, ioFlags, perm, behaviorFlags, contentWindow) {
    var fstream
      = Components.classes
      ["@mozilla.org/network/file-output-stream;1"]
      .createInstance (Components.interfaces.nsIFileOutputStream);
    fstream.init (file, ioFlags, perm, behaviorFlags);
    return fstream;
  },

  /**
   * 読込用ファイルストリームを作成する
   *
   * @param  nsIFile file
   * @param  long ioFlags
   * @param  long perm
   * @param  long behaviorFlags
   * @param  Window contentWindow (e10s対応用)
   * @return nsIFileInputStream
   */
  createFileInputStream : function (file, ioFlags, perm, behaviorFlags, contentWindow) {
    var fstream
      = Components.classes
      ["@mozilla.org/network/file-input-stream;1"]
      .createInstance (Components.interfaces.nsIFileInputStream);
    fstream.init (file, ioFlags, perm, behaviorFlags);
    return fstream;
  },

  /**
   * ファイルを移動させる
   *
   * @param  nsIFile file
   * @param  nsIFile newParentDir
   * @param  string newName
   */
  moveTo : function (file, newParentDir, newName) {
    file.moveTo (newParentDir, newName);
  },

  /**
   * ディレクトリを作成する
   *
   * @param  String dirname
   *         ディレクトリ名
   */
  createDirectory : function (dirname) {
    try {
      var dir
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (arAkahukuFile.nsIFile);
      dir.initWithPath (dirname);
      if (!dir.exists ()) {
        dir.create (0x01, 493/*0o755*/);
      }
    }
    catch (e) {
    }
  },
  
  /**
   * gzip されたファイルを展開する
   */
  gunzip : function (data, callback) {
    var sstream
    = Components.classes ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (Components.interfaces.nsIStringInputStream);
    sstream.setData (data, data.length);
    
    var listener = new arAkahukuGZIPReader (callback);
    
    var converter
    = Components.classes
    ["@mozilla.org/streamconv;1?from=gzip&to=uncompressed"]
    .createInstance (Components.interfaces.nsIStreamConverter);
    converter.asyncConvertData ("gzip", "uncompressed", listener, null);
    
    var listener
    = converter.QueryInterface
    (Components.interfaces.nsIStreamListener);
    listener.onStartRequest (null, null);
    listener.onDataAvailable (null, null,
                              sstream, 0, data.length);
    sstream.close ();
    listener.onStopRequest (null, null, 0);
  }
};
