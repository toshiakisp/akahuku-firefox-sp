/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: arAkahukuConfig
 */

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
  }
};
