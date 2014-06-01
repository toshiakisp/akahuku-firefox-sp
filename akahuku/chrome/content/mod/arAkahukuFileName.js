/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var arAkahukuFileName = {
  defaultConvertList : [
    ["&amp;", "&"],
    ["&gt;", "\uFF1E"],
    ["&lt;", "\uFF1C"],
    ["&quot;", "\u201D"],
    ["&apos;", "\u2019"],
    ["\\", "\uFFE5"],
    ["/", "\uFF0F"],
    [":", "\uFF1A"],
    [",", "\uFF0C"],
    [";", "\uFF1B"],
    ["*", "\uFF0A"],
    ["?", "\uFF1F"],
    ["\"", "\u201D"],
    ["\'", "\u2019"],
    ["<", "\uFF1C"],
    [">", "\uFF1E"],
    ["|", "\uFF5C"],
    ["\t", ""],
    ["\r", ""],
    ["\n", ""],
    [" ", "_"]
    ],
  
  getConfig : function () {
    var value;
    
    try {
      value
        = arAkahukuConfig
        .initPref ("char", "akahuku.filename_convert.list", "null");
    }
    catch (e) {
      value
      = AkahukuOptions
      .initPref (null, "char", "akahuku.filename_convert.list", "null");
    }
    if (value != "null") {
      arAkahukuFileName.convertList = arAkahukuJSON.decode (unescape (value));
      while (arAkahukuFileName.convertList.length
             && arAkahukuFileName.convertList [0] == undefined) {
        arAkahukuFileName.convertList.shift ();
      }
    }
    else {
      arAkahukuFileName.convertList = new Array ();
      
      for (var i = 0; i < arAkahukuFileName.defaultConvertList.length; i ++) {
        var item = {};
        item.from = arAkahukuFileName.defaultConvertList [i][0];
        item.to = arAkahukuFileName.defaultConvertList [i][1];
        arAkahukuFileName.convertList.push (item);
      }
    }
    
    for (var i = 0; i < arAkahukuFileName.convertList.length; i ++) {
      arAkahukuFileName.convertList [i].from
      = arAkahukuFileName.convertList [i].from.replace
      (/([\(\)\[\]\{\}\\\^\$\+\*\?\|\-])/g, "\\$1");
      
      arAkahukuFileName.convertList [i].from
      = new RegExp (arAkahukuFileName.convertList [i].from, "g");
    }
  },
  
  escapeForFilename : function (text) {
    for (var i = 0; i < arAkahukuFileName.convertList.length; i ++) {
      text
      = text.replace (arAkahukuFileName.convertList [i].from,
                      arAkahukuFileName.convertList [i].to);
    }
    text
    = text.replace (/\.+$/, "");
    
    return text;
  }
};

