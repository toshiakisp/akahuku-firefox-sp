
function arAkahukuBoardInfo (id) {
  this.id = id;
  this.name = "";
  this.shortName = "";
  this.trueName = "";
  this.newestNum = 0;
  this.maxNum = 0;
  this.preserveMin = -1; // 最低保持時間(分)
  this.hasCatalog = false;
  this.isInternal = false;
};

function arAkahukuBoardList () {
  this._boards = {};
};

arAkahukuBoardList.prototype = {
  _getBoardId : function (idOrInfo) {
    var id = null;
    if (typeof (idOrInfo) === "string") {
      id = idOrInfo;
    }
    else if ("server" in idOrInfo && "dir" in idOrInfo) {
      // arAkahukuLocationInfo
      id = idOrInfo.server + ":" + idOrInfo.dir;
    }
    return id;
  },

  getBoardInfo : function (idOrInfo) {
    var id = this._getBoardId (idOrInfo);
    return id in this._boards ? this._boards [id] : null;
  },
  addBoardInfo : function (idOrInfo, board) {
    var id = this._getBoardId (idOrInfo);
    board = board || new arAkahukuBoardInfo (id);
    this._boards [id] = board;
    return board;
  },
  removeBoardInfo : function (idOrInfo) {
    var id = this._getBoardId (idOrInfo);
    delete this._boards [id];
  },

  getBoardProperty : function (idOrInfo, prop) {
    var board = this.getBoardInfo (idOrInfo);
    if (!board) {
      return null;
    }
    if (!(prop in board)) {
      throw "invalid property specified";
    }
    return board [prop];
  },
  setBoardProperty : function (idOrInfo, prop, value) {
    var board
      = this.getBoardInfo (idOrInfo) || this.addBoardInfo (idOrInfo);
    if (!(prop in board)) {
      throw "invalid property specified";
    }
    board [prop] = value;
  },

  contains : function (idOrInfo) {
    return this.getBoardInfo (idOrInfo) ? true : false;
  },

  getIDs : function (optType) {
    var list = [];
    for (var id in this._boards) {
      if (optType === "internal"
          && !this._boards [id].isInternal) {
        continue;
      }
      list.push (id);
    }
    return list;
  },
};


/**
 * 板管理
 *   [動作する板を指定する]、[外部の板でも動作させる]
 */
var arAkahukuBoard = {
  enableSelect : false,         /* Boolean  動作する板を指定する */
  selectExList : new Object (), /* Object  動作しない板
                                 *   <String 板名, Boolean ダミー> */

  enableExternal : false,      /* Boolean  外部の板 */
  externalList : new Array (), /* Array  外部の板のリスト */

  boardList : new arAkahukuBoardList (),
  internalList: new Array (),  /* Array  内部の板のリスト */
  
  observed : false,
  observePaused : false,

  /**
   * 初期化処理
   */
  init : function () {
    if (!this.observed) {
      ObserverService.addObserver(this,
        "arakahuku-board-newest-num-updated");
      ObserverService.addObserver(this,
        "arakahuku-board-lifetime-updated");
      this.observed = true;
    }
  },
  
  /**
   * 終了処理
   */
  term : function () {
    if (this.observed) {
      ObserverService.removeObserver(this,
        "arakahuku-board-newest-num-updated");
      ObserverService.removeObserver(this,
        "arakahuku-board-lifetime-updated");
      this.observed = false;
    }
  },

  /**
   * 設定を読み込む
   */
  getConfig : function () {
    arAkahukuBoard.enableSelect
    = arAkahukuConfig
    .initPref ("bool", "akahuku.board_select", false);
    if (arAkahukuBoard.enableSelect) {
      var value
        = arAkahukuConfig
        .initPref ("char", "akahuku.board_select.ex_list", "");
      arAkahukuBoard.selectExList = new Object ();
            
      if (value) {
        /* 値を解析するだけなので代入はしない */
        value.replace
          (/([^,]+),?/g,
           function (matched, part1) {
            arAkahukuBoard.selectExList [unescape (part1)] = true;
            return "";
          });
      }
    }
        
    arAkahukuBoard.enableExternal
    = arAkahukuConfig
    .initPref ("bool", "akahuku.board_external", false);
    if (arAkahukuBoard.enableExternal) {
      arAkahukuBoard.externalList = new Array ();
      
      var value;
      value
        = arAkahukuConfig
        .initPref ("char", "akahuku.board_external.patterns2", "null");
      if (value != "null") {
        arAkahukuBoard.externalList = JSON.parse (unescape (value));
        while (arAkahukuBoard.externalList.length
               && arAkahukuBoard.externalList [0] == undefined) {
          arAkahukuBoard.externalList.shift ();
        }
        for (var i = 0; i < arAkahukuBoard.externalList.length; i ++) {
          if (!arAkahukuBoard.externalList [i].prefix) {
            arAkahukuBoard.externalList [i].pattern
              = new RegExp (arAkahukuBoard.externalList [i].pattern);
          }
        }
      }
    }
  },

  /**
   * nsIObserver.observe
   */
  observe : function (subject, topic, data) {
    if (this.observePaused) {
      return;
    }
    try {
      if (topic == "arakahuku-board-newest-num-updated") {
        var decodedData = JSON.parse (subject.data);
        this.onNotifiedThreadNewestNumber (decodedData, data);
      }
      else if (topic == "arakahuku-board-lifetime-updated") {
        var decodedData = JSON.parse (subject.data);
        this.onNotifiedBoardLifeTime (decodedData, data);
      }
    }
    catch (e) {
      Akahuku.debug.exception (e);
    }
  },
  /**
   * 板の最新レス番号の更新通知イベント
   */
  onNotifiedThreadNewestNumber : function (newestNum, data) {
    // e10s-multi: 他プロセスからの新情報は通知せず反映
    this.updateNewestNum (newestNum.name, newestNum.value, true);
  },
  /**
   * 板の保持数の更新通知イベント
   */
  onNotifiedBoardLifeTime : function (prop, data) {
    // 他からの新情報は通知せず反映
    switch (prop.property) {
      case "maxNum":
        this.setMaxNum (prop.name, prop.value, true);
        break;
      case "preserveMin":
        this.setPreserveMin (prop.name, prop.value, true);
        break;
    }
  },
    
  /**
   * 外部板に追加する
   */
  addExternal : function (targetDocument) {
    var base = targetDocument.location.href;
        
    base = base
    .replace (/\/res\/([0-9]+)\.html?$/, "/")
    .replace (/\/(([^\.\/]+)\.php)?([#\?].*)?$/, "/")
    .replace (/\/(([^\.\/]+)\.html?)?([#\?].*)?$/, "/");
        
    var flag = 2;
    var value = {
      prefix: true,
      monaca: false,
      pattern: base
    };
        
    var form = targetDocument.getElementById ("postbox");
    if (form) {
      if ("action" in form
          && form.action
          && form.action.match (/monaca\.php/)) {
        flag |= 1;
        value.monaca = true;
      }
    }
        
    var tmp2 = arAkahukuConfig
    .initPref ("char", "akahuku.board_external.patterns2", "null");
    if (tmp2 != "null") {
      var list = JSON.parse (unescape (tmp2));
      list.push (value);
      tmp2 = JSON.stringify (list);
      arAkahukuConfig.setCharPref
      ("akahuku.board_external.patterns2", tmp2);
    }
        
    arAkahukuBoard.getConfig ();
        
    arAkahukuBoard.enableExternal = true;
    arAkahukuConfig.setBoolPref
    ("akahuku.board_external", true);
  },

  updatePropertyNum : function (idOrInfo, name, num, dontNotify) {
    var updated = false;
    var notifyName = "";
    if (!this.boardList.contains (idOrInfo)) {
      this.boardList.addBoardInfo (idOrInfo);
    }
    var id = this.boardList.getBoardProperty (idOrInfo, "id");
    var oldNum = this.boardList.getBoardProperty (id, name);
    switch (name) {
      case "newestNum":
        updated = (num > 0 && num > oldNum);
        notifyName = "newest-num-updated";
        break;
      case "maxNum":
      case "preserveMin":
        updated = (num != oldNum);
        notifyName = "lifetime-updated";
        break;
    }
    if (updated) {
      this.boardList.setBoardProperty (id, name, num);
    }
    if (updated && !dontNotify) {
      var subject = {};
      subject.data = JSON.stringify ({
        name: id,
        property: name,
        value: num,
      });
      this.observePaused = true;
      ObserverService.notifyObservers
        (subject, "arakahuku-board-" + notifyName, null);
      this.observePaused = false;
    }
  },

  /**
   * 板全体の最新のレスを更新する
   *
   * @param  arAkahukuLocationInfo idOrInfo
   *         アドレス情報 あるいは板ID(String)
   * @param  Number num
   *         レス番号
   * @param  Boolean dontNotify
   *         通知をせずに更新するか
   */
  updateNewestNum : function (idOrInfo, num, dontNotify) {
    this.updatePropertyNum (idOrInfo, "newestNum", num, dontNotify);
  },
  getNewestNum : function (idOrInfo) {
    return this.boardList.getBoardProperty (idOrInfo, "newestNum");
  },
  knows : function (idOrInfo) {
    return this.boardList.contains (idOrInfo);
  },
  knowsAsInternal : function (idOrInfo) {
    var board = this.boardList.getBoardInfo (idOrInfo);
    return (board && board.isInternal);
  },
  getMaxNum : function (idOrInfo) {
    return this.boardList.getBoardProperty (idOrInfo, "maxNum");
  },
  setMaxNum : function (idOrInfo, value, dontNotify) {
    this.updatePropertyNum (idOrInfo, "maxNum", value, dontNotify);
  },
  getServerName : function (idOrInfo, optType) {
    if (optType === "true") {
      return this.boardList.getBoardProperty (idOrInfo, "trueName");
    }
    else if (optType === "short") {
      return this.boardList.getBoardProperty (idOrInfo, "shortName");
    }
    return this.boardList.getBoardProperty (idOrInfo, "name");
  },
  hasCatalog : function (idOrInfo) {
    return this.boardList.getBoardProperty (idOrInfo, "hasCatalog");
  },
  // スレの最低保持時間
  getPreserveMin : function (idOrInfo) {
    return this.boardList.getBoardProperty (idOrInfo, "preserveMin");
  },
  setPreserveMin : function (idOrInfo, value, dontNotify) {
    this.updatePropertyNum (idOrInfo, "preserveMin", value, dontNotify);
  },

  getBoardIDs : function (optType) {
    return this.boardList.getIDs (optType);
  },

};

(function () {
  var scope = {};
  scope.arAkahukuServerData = arAkahukuServerData;

  for (var id in scope.arAkahukuServerData) {
    var board = new arAkahukuBoardInfo (id);
    board.isInternal = true;
    board.name = scope.arAkahukuServerData [id][0];
    board.shortName = scope.arAkahukuServerData [id][1];
    board.trueName = scope.arAkahukuServerData [id][2];
    if (scope.arAkahukuServerData [id][3] != -1) {
      board.maxNum = scope.arAkahukuServerData [id][3];
    }
    if (scope.arAkahukuServerData [id][4]) {
      board.hasCatalog = (scope.arAkahukuServerData [id][4] == true);
    }
    if (scope.arAkahukuServerData [id].length > 5) {
      var extra = scope.arAkahukuServerData [id][5];
      for (var prop in extra) {
        board [prop] = extra [prop];
      }
    }
    arAkahukuBoard.boardList.addBoardInfo (id, board);
  }
})();

