
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
  },

  term : function () {
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
    Akahuku.debug.error('NotYetImplemented');
    return '';
    /*
    return arAkahukuIPC.sendSyncCommand ("File/getDirectory", arguments);
    */
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
    
  initFile : function (filename) {
    throw new Error('NotYetImplemented, deprecated');
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
    throw new Error('NotYetImplemented, deprecated');
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
    throw new Error('NotYetImplemented, deprecated');
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
    throw new Error('NotYetImplemented, deprecated');
  },

  /**
   * ファイルを移動させる
   *
   * @param  nsIFile file
   * @param  nsIFile newParentDir
   * @param  string newName
   */
  moveTo : function (file, newParentDir, newName) {
    throw new Error('NotYetImplemented, deprecated');
  },

  /**
   * ディレクトリを作成する
   *
   * @param  String dirname
   *         ディレクトリ名
   */
  createDirectory : function (dirname) {
    throw new Error('NotYetImplemented, deprecated');
  },
  
  /**
   * gzip されたファイルを展開する
   */
  gunzip : function (data, callback) {
    throw new Error('NotYetImplemented, deprecated');
  }
};
