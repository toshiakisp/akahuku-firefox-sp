/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: arAkahukuConfig, arAkahukuJSON
 */

function arAkahukuBoardInfo (id) {
  this.id = id;
  this.name = "";
  this.shortName = "";
  this.trueName = "";
  this.newestNum = 0;
  this.maxNum = 0;
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
        arAkahukuBoard.externalList = arAkahukuJSON.decode (unescape (value));
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
      else {
        value
          = arAkahukuConfig
          .initPref ("char", "akahuku.board_external.patterns", "");
        if (value != "") {
          /* 値を解析するだけなので代入はしない */
          value.replace
            (/([^&,]*)&([^&,]*),?/g,
             function (matched, pattern, flag) {
              var value = {};
              
              value.pattern = unescape (pattern);
              flag = parseInt (flag);
              value.monaca = (flag & 1) ? true : false;
              value.prefix = (flag & 2) ? true : false;
              
              if (!value.prefix) {
                value.pattern = new RegExp (value.pattern);
              }
              
              arAkahukuBoard.externalList.push (value);
              
              return "";
            });
        }
      }
    }
  },
    
  /**
   * 外部板に追加できるか
   */
  isAbleToAddExternal : function (targetDocument) {
    try {
      if (!targetDocument) {
        targetDocument
        = document.commandDispatcher.focusedWindow.document;
      }
      var param = Akahuku.getDocumentParam (targetDocument);
          
      if (param) {
        return false;
      }
          
      targetDocument
      = document.commandDispatcher.focusedWindow.document;

      var base = targetDocument.location.href;
          
      base = base
      .replace (/\/res\/([0-9]+)\.html?$/, "/")
      .replace (/\/(([^\.\/]+)\.php)?([#\?].*)?$/, "/")
      .replace (/\/(([^\.\/]+)\.html?)?([#\?].*)?$/, "/");
          
      if (!/\/$/.test (base)) {
        return false;
      }
          
      return true;
    }
    catch (e) { Akahuku.debug.exception (e);
      return false;
    }
  },
    
  /**
   * 外部板に追加する
   */
  addExternal : function () {
    if (!arAkahukuBoard.isAbleToAddExternal ()) {
      return;
    }
        
    var targetDocument
    = document.commandDispatcher.focusedWindow.document;
        
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
      var list = arAkahukuJSON.decode (unescape (tmp2));
      list.push (value);
      tmp2 = arAkahukuJSON.encode (list);
      arAkahukuConfig.prefBranch.setCharPref
      ("akahuku.board_external.patterns2", tmp2);
    }
    else {
      var tmp
      = arAkahukuConfig
      .initPref ("char", "akahuku.board_external.patterns", "");
          
      if (tmp) {
        tmp += ",";
      }
      tmp += escape (base)
      + "&" + escape (flag);
          
      arAkahukuConfig.prefBranch.setCharPref
      ("akahuku.board_external.patterns", tmp);
    }
        
    arAkahukuBoard.getConfig ();
        
    arAkahukuBoard.enableExternal = true;
    arAkahukuConfig.prefBranch.setBoolPref
    ("akahuku.board_external", true);
        
    Akahuku.apply (targetDocument, false);
  },

  /**
   * 板全体の最新のレスを更新する
   *
   * @param  arAkahukuLocationInfo idOrInfo
   *         アドレス情報 あるいは板ID(String)
   * @param  Number num
   *         レス番号
   */
  updateNewestNum : function (idOrInfo, num) {
    if (!(num > 0)) {
      return;
    }
    var updated = false;
    if (!this.boardList.contains (idOrInfo)) {
      this.boardList.addBoardInfo (idOrInfo);
    }
    var id = this.boardList.getBoardProperty (idOrInfo, "id");
    var oldNum = this.boardList.getBoardProperty (id, "newestNum");
    if (num > oldNum) {
      this.boardList.setBoardProperty (id, "newestNum", num);
      updated = true;
    }
    else {
      num = oldNum;
    }
    if (updated) {
      var observerService
        = Components.classes ["@mozilla.org/observer-service;1"]
        .getService (Components.interfaces.nsIObserverService);
      var subject
        = Components.classes ["@mozilla.org/supports-string;1"]
        .createInstance (Components.interfaces.nsISupportsString);
      subject.data = arAkahukuJSON.encode ({
        name: id,
        value: num,
      });
      observerService.notifyObservers
        (subject, "arakahuku-board-newest-num-updated", null);
    }
  },
  getNewestNum : function (idOrInfo) {
    return this.boardList.getBoardProperty (idOrInfo, "newestNum");
  },
  knows : function (idOrInfo) {
    return this.boardList.contains (idOrInfo);
  },
  getMaxNum : function (idOrInfo) {
    return this.boardList.getBoardProperty (idOrInfo, "maxNum");
  },
  setMaxNum : function (idOrInfo, value) {
    this.boardList.setBoardProperty (idOrInfo, "maxNum", value);
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

  getBoardIDs : function (optType) {
    return this.boardList.getIDs (optType);
  },

};

(function () {
  var scope = {};
  try {
    scope.arAkahukuServerData = arAkahukuServerData;
  }
  catch (e) {
    Components.utils.reportError ("no arAkahukuServerData");
    try {
      var loader
        = Components.classes ["@mozilla.org/moz/jssubscript-loader;1"]
        .getService (Components.interfaces.mozIJSSubScriptLoader);
      loader.loadSubScript
        ("chrome://akahuku/content/mod/arAkahukuServerName.js", scope);
    }
    catch (e) {
      Components.utils.reportError (e);
    }
  }

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
    arAkahukuBoard.boardList.addBoardInfo (id, board);
  }
})();

