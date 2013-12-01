/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: arAkahukuLocationInfo, arAkahukuFile, arAkahukuServerName,
 *          arAkahukuCompat
 */

/* Unicode をエスケープ解除できない場合に unescape を定義しなおす */
if (unescape ("%u3042") == "%u3042") {
  unescape = function (text) {
    var converter
    = Components.classes ["@mozilla.org/intl/scriptableunicodeconverter"]
    .getService (Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "utf-8";
        
    text = text
    .replace (/((%[0-9A-Fa-f][0-9A-Fa-f])+)|%u([0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])/g,
              function (match, part1, part2, part3) {
                if (part1) {
                  var t = part1
                  .replace (/%([0-9A-Fa-f][0-9A-Fa-f])/g,
                            function (submatch, subpart1) {
                              return String
                              .fromCharCode (parseInt ("0x"
                                                       + subpart1));
                            });
                  try {
                    t = converter.ConvertToUnicode (t);
                  }
                  catch (e) {
                  }
                  return t;
                }
                else {
                  return String
                  .fromCharCode (parseInt ("0x" + part3));
                }
              });
    return text;
  }
}

/**
 * キーの名前
 */
var keyNames = {
  "VK_CANCEL" : "control + break",
  "VK_HELP" : "help",
  "VK_BACK_SPACE" : "バックスペース",
  "VK_TAB" : "タブ",
  "VK_CLEAR" : "clear",
  "VK_RETURN" : "リターン",
  "VK_ENTER" : "エンター",
  "VK_SHIFT" : "shift",
  "VK_CONTROL" : "control",
  "VK_ALT" : "alt",
  "VK_PAUSE" : "pause",
  "VK_CAPS_LOCK" : "CapsLock",
  "VK_ESCAPE" : "esc",
  "VK_SPACE" : "スペース",
  "VK_PAGE_UP" : "page up",
  "VK_PAGE_DOWN" : "page down",
  "VK_END" : "end",
  "VK_HOME" : "home",
  "VK_LEFT" : "←",
  "VK_UP" : "↑",
  "VK_RIGHT" : "→",
  "VK_DOWN" : "↓",
  "VK_PRINTSCREEN" : "番長!",
  "VK_INSERT" : "insert",
  "VK_DELETE" : "delete",
  "VK_0" : "0",
  "VK_1" : "1",
  "VK_2" : "2",
  "VK_3" : "3",
  "VK_4" : "4",
  "VK_5" : "5",
  "VK_6" : "6",
  "VK_7" : "7",
  "VK_8" : "8",
  "VK_9" : "9",
  "VK_SEMICOLON" : ";",
  "VK_EQUALS" : "=",
  "VK_A" : "A",
  "VK_B" : "B",
  "VK_C" : "C",
  "VK_D" : "D",
  "VK_E" : "E",
  "VK_F" : "F",
  "VK_G" : "G",
  "VK_H" : "H",
  "VK_I" : "I",
  "VK_J" : "J",
  "VK_K" : "K",
  "VK_L" : "L",
  "VK_M" : "M",
  "VK_N" : "N",
  "VK_O" : "O",
  "VK_P" : "P",
  "VK_Q" : "Q",
  "VK_R" : "R",
  "VK_S" : "S",
  "VK_T" : "T",
  "VK_U" : "U",
  "VK_V" : "V",
  "VK_W" : "W",
  "VK_X" : "X",
  "VK_Y" : "Y",
  "VK_Z" : "Z",
  "VK_CONTEXT_MENU" : "メニュー",
  "VK_NUMPAD0" : "テンキー 0",
  "VK_NUMPAD1" : "テンキー 1",
  "VK_NUMPAD2" : "テンキー 2",
  "VK_NUMPAD3" : "テンキー 3",
  "VK_NUMPAD4" : "テンキー 4",
  "VK_NUMPAD5" : "テンキー 5",
  "VK_NUMPAD6" : "テンキー 6",
  "VK_NUMPAD7" : "テンキー 7",
  "VK_NUMPAD8" : "テンキー 8",
  "VK_NUMPAD9" : "テンキー 9",
  "VK_MULTIPLY" : "テンキー *",
  "VK_ADD" : "テンキー +",
  "VK_SEPARATOR" : "separator",
  "VK_SUBTRACT" : "テンキー -",
  "VK_DECIMAL" : "テンキー .",
  "VK_DIVIDE" : "テンキー /",
  "VK_F1" : "F1",
  "VK_F2" : "F2",
  "VK_F3" : "F3",
  "VK_F4" : "F4",
  "VK_F5" : "F5",
  "VK_F6" : "F6",
  "VK_F7" : "F7",
  "VK_F8" : "F8",
  "VK_F9" : "F9",
  "VK_F10" : "F10",
  "VK_F11" : "F11",
  "VK_F12" : "F12",
  "VK_F13" : "F13",
  "VK_F14" : "F14",
  "VK_F15" : "F15",
  "VK_F16" : "F16",
  "VK_F17" : "F17",
  "VK_F18" : "F18",
  "VK_F19" : "F19",
  "VK_F20" : "F20",
  "VK_F21" : "F21",
  "VK_F22" : "F22",
  "VK_F23" : "F23",
  "VK_F24" : "F24",
  "VK_NUM_LOCK" : "num lock",
  "VK_SCROLL_LOCK" : "scroll lock",
  "VK_COMMA" : ",",
  "VK_PERIOD" : ".",
  "VK_SLASH" : "/",
  "VK_BACK_QUOTE" : "`",
  "VK_OPEN_BRACKET" : "[",
  "VK_BACK_SLASH" : "\\",
  "VK_CLOSE_BRACKET" : "]",
  "VK_QUOTE" : "\' か \"",
  "VK_META" : "meta"
};

/**
 * 設定管理
 */
var AkahukuOptions = {
  prefBranch : null,    /* nsIPrefBranch/nsIPrefBranch2  pref サービス */
  
  loadedTabs : new Object (), /* Object  ロードしたタブ */     
  
  prefList : { /* Object  設定一覧 */
    "title" : [
      ["bool", "title", true],
      ["char", "title.type", "simple"],
      ["bool", "title.comment", false],
      ["bool", "title.mode", true],
      ["bool", "title.thread_info", false],
      ["func", "title.format", null,
       function (map) {
          var defFormat = "%3Cold%3E%u53E4%20%3C/old%3E%3Cnijiura%3E%26server%3B%3C/nijiura%3E%3C_nijiura%3E%26board%3B%3C/_nijiura%3E%0A%3Cmessage%3E%20%26message%3B%3C/message%3E%3Cpage%3E%20%26page%3B%3C/page%3E%3Ccatalog%3E%20%u30AB%u30BF%u30ED%u30B0%3C/catalog%3E%0A%3Cexpire%3E%20%28%26expire%3B%29%3C/expire%3E";
          var value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.title.format", defFormat);
          document.getElementById ("title_format").value
          = AkahukuOptions
          .unescapeExtra (unescape (value));
        },
       function (fstream, deletePath) {
         var value   = document.getElementById ("title_format").value;
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.title.format",
                   escape (value));
       }],
      ["int",  "title.comment.length", 20],
      ["int",  "title.comment.length.type", 0], /* privatemod */
      ["bool", "title.comment.multiline", false, "privatemod"],
      ["bool", "subtitle", false],
      ["bool", "comment.fixup", true],
      ["init",
       function (map) {
          AkahukuOptions.checkTitle ();
          AkahukuOptions.changeFormat ("title_format");
        }]
      ],
    "scroll" : [
      ["bool", "scroll.lock", false],
      ["bool", "scroll.lock.reply", false],
      ["bool", "scroll.gotop", false],
      ["bool", "scroll.gocurrent.reload", false],
      ["bool", "scroll.gocurrent.rule", false],
      ["bool", "scroll.gocurrent.rule.zeroheight", true],
      ["bool", "scroll.gocurrent.rule.random", true],
      ["init",
       function (map) {
          AkahukuOptions.checkScrollLock ();
          AkahukuOptions.checkScrollGoCurrent ();
        }]
      ],
    "banner" : [
      ["bool", "delbanner", false],
      ["bool", "delbanner.image", false],
      ["bool", "delbanner.image.404", false],
      ["bool", "delbanner.flash", false],
      ["char", "delbanner.sites.image", "", "privatemod"],
      ["char", "delbanner.sites.iframe", "", "privatemod"],
      ["char", "delbanner.sites.object", "", "privatemod"],
      ["bool", "delbanner.text", false],
      ["bool", "delbanner.movetailad", false],
      ["bool", "delbanner.movetailad.all", false, "privatemod"],
      ["init",
       function (map) {
          AkahukuOptions.checkDelbanner ();
        }]
      ],
    "wheel" : [
      ["bool", "wheel.reload", true],
      ["int",  "wheel.reload.threshold", 3],
      ["bool", "wheel.reload.0", true],
      ["bool", "wheel.reload.1", true],
      ["bool", "wheel.reload.loop", false],
      ["bool", "wheel.reload.reply", true],
      ["bool", "wheel.reload.reply.sync", false],
      ["bool", "wheel.reload.catalog", true],
      ["bool", "wheel.reload.catalog.up", false, "privatemod"],
      ["bool", "wheel.reload.all", false],
      ["init",
       function (map) {
          AkahukuOptions.checkWheelReload ();
        }]
      ],
    "tab" : [
      ["bool", "tab.sort", true],
      ["bool", "tab.sort.thread", true],
      ["bool", "tab.sort.all", true],
      ["bool", "tab.sort.invert.thread", false],
      ["func", "tab.sort.order.normal", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "int",  "akahuku.tab.sort.order.normal", 2);
          document.getElementById ("tab_sort_order_" + value).value = "normal";
          AkahukuOptions.selectItem
          (document.getElementById ("tab_sort_order_" + value));
        },
       function (fstream, deletePath) {
         var order = {};
         for (var i = 1; i <= 4; i ++) {
           order [document.getElementById ("tab_sort_order_" + i).value] = i;
         }
         AkahukuOptions
         .setPref (fstream, "int",  "akahuku.tab.sort.order.normal",
                   order ["normal"]);
       }],
      ["func", "tab.sort.order.reply", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "int",  "akahuku.tab.sort.order.reply", 3);
          document.getElementById ("tab_sort_order_" + value).value = "reply";
          AkahukuOptions.selectItem
          (document.getElementById ("tab_sort_order_" + value));
        },
       function (fstream, deletePath) {
         var order = {};
         for (var i = 1; i <= 4; i ++) {
           order [document.getElementById ("tab_sort_order_" + i).value] = i;
         }
         AkahukuOptions
         .setPref (fstream, "int",  "akahuku.tab.sort.order.reply",
                   order ["reply"]);
       }],
      ["func", "tab.sort.order.catalog", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "int",  "akahuku.tab.sort.order.catalog", 4);
          document.getElementById ("tab_sort_order_" + value).value = "catalog";
          AkahukuOptions.selectItem
          (document.getElementById ("tab_sort_order_" + value));
        },
       function (fstream, deletePath) {
         var order = {};
         for (var i = 1; i <= 4; i ++) {
           order [document.getElementById ("tab_sort_order_" + i).value] = i;
         }
         AkahukuOptions
         .setPref (fstream, "int",  "akahuku.tab.sort.order.catalog",
                   order ["catalog"]);
       }],
      ["func", "tab.sort.order.other", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "int",  "akahuku.tab.sort.order.other", 1);
          document.getElementById ("tab_sort_order_" + value).value = "other";
          AkahukuOptions.selectItem
          (document.getElementById ("tab_sort_order_" + value));
        },
       function (fstream, deletePath) {
         var order = {};
         for (var i = 1; i <= 4; i ++) {
           order [document.getElementById ("tab_sort_order_" + i).value] = i;
         }
         AkahukuOptions
         .setPref (fstream, "int",  "akahuku.tab.sort.order.other",
                   order ["other"]);
       }],
      ["func", "tab.sort.board_order.list", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.tab.sort.board_order.list", "");
          var newboard = new Object ();
          for (name in arAkahukuServerName) {
            newboard [name] = true;
          }
          var list = new Array ();
          var name;
          if (value == "") {
            for (name in arAkahukuServerName) {
              list.push (name);
            }
            list = list.sort (function (x, y) {
                return x < y ? -1 : 1;
              });
          }
          else {
            /* 値を解析するだけなので代入はしない */
            value.replace
            (/([^,]+),?/g,
             function (matched, part1) {
              list.push (unescape (part1));
              return "";
            });
          }
          var listbox = document.getElementById ("tab_sort_board_order_list");
          var node = listbox.firstChild;
          while (node) {
            var nextNode = node.nextSibling;
            listbox.removeChild (node);
            node = nextNode;
          }
          var listitem, listcell;
          for (var i = 0; i < list.length; i ++) {
            name = list [i];
            if (name in newboard) {
              delete newboard [name];
            }
            if (name in arAkahukuServerName
                && arAkahukuServerName [name]) {
              listitem = document.createElement ("listitem");
              listcell = document.createElement ("listcell");
              listcell.setAttribute ("value", name);
              listcell.setAttribute ("label", arAkahukuServerName [name]);
              listitem.appendChild (listcell);
              listbox.appendChild (listitem);
            }
          }
          for (name in newboard) {
            listitem = document.createElement ("listitem");
            listcell = document.createElement ("listcell");
            listcell.setAttribute ("value", name);
            listcell.setAttribute ("label", arAkahukuServerName [name]);
            listitem.appendChild (listcell);
            listbox.appendChild (listitem);
          }
        },
       function (fstream, deletePath) {
         var listbox = document.getElementById ("tab_sort_board_order_list");
         var value = "";
         var node = listbox.firstChild;
         while (node) {
           if (value != "") {
             value += ",";
           }
            
           value += escape (node.firstChild.getAttribute ("value"));
            
           var nextNode = node.nextSibling;
            
           node = nextNode;
         }
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.tab.sort.board_order.list",
                   value);
       }],
      ["bool", "tabicon", true],
      ["bool", "tabicon.size", true],
      ["int",  "tabicon.size.max", 24],
      ["bool", "tabicon.asfavicon", true, "privatemod"],
      ["init",
       function (map) {
          AkahukuOptions.checkTabSort ();
          AkahukuOptions.checkTabIcon ();
        }]
      ],
    "menu" : [
      ["bool", "quickquote", true],
      ["bool", "quickquote.menu", true],
      ["bool", "quickquote.menu.quote", true],
      ["bool", "quickquote.menu.mail", true],
      ["bool", "quickquote.menu.name", false],
      ["bool", "quickquote.menu.comment", true],
      ["bool", "quickquote.menu.separator", true],
      ["bool", "quickquote.menu.copy", true],
      ["bool", "quickquote.menu.cont", true],
      ["bool", "quickquote.menu.google.image", true],
      ["bool", "quickquote.menu.wikipedia", false],
      ["bool", "quickquote.number", false],
      ["int",  "quickquote.number.type", 1],
      ["bool", "quickquote.number.clear", false],
      ["bool", "quickquote.number.nocomment", false],
      ["bool", "quickquote.clear", false],
      ["bool", "quickquote.untroll", false],
      ["bool", "quickquote.focus", false],
      ["bool", "jpeg.thumbnail", false],
      ["bool", "jpeg.thumbnail.error", false],
      ["init",
       function (map) {
          AkahukuOptions.checkQuickQuote ();
          if (Components.classes ["@mozilla.org/binaryinputstream;1"]
              == undefined) {
            document.getElementById ("jpeg_thumbnail").disabled   = true;
            document.getElementById ("jpeg_thumbnail").checked    = false;
          }
          AkahukuOptions.checkJPEGThumbnail ();
        }]
      ],
    "savemht" : [
      ["bool", "savemht", true],
      ["char", "savemht.base", "", "private"],
      ["char", "savemht.default.type", "simple"],
      ["bool", "savemht.default.server", false],
      ["bool", "savemht.default.dir", false],
      ["bool", "savemht.default.thread", true],
      ["bool", "savemht.default.title", false],
      ["func", "savemht.default.format", null,
       function (map) {
          var defFormat = "%26server%3B_%26thread%3B_%26YY%3B%uFF0F%26MM%3B%uFF0F%26DD%3B_%26hh%3B%uFF1A%26mm%3B%uFF1A%26ss%3B_%26message%3B";
          var value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.savemht.default.format", defFormat);
          document.getElementById ("savemht_default_format").value
          = AkahukuOptions.unescapeExtra (unescape (value));
        },
       function (fstream, deletePath) {
         var value   = document.getElementById ("savemht_default_format").value;
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.savemht.default.format",
                   escape (value));
       }],
      ["bool", "savemht.auto", false],
      ["bool", "savemht.auto.unique", false],
      ["bool", "savemht.auto.saveas", false],
      ["bool", "savemht.nolimit", false],
      ["int",  "savemht.nolimit.time", 0],
      ["bool", "savemht.close_nocachelist", false],
      ["bool", "savemht.usenetwork", true],
      ["bool", "savemht.shortcut", false],
      ["char", "savemht.shortcut.keycode", "VK_S"],
      ["bool", "savemht.shortcut.modifiers.alt", false],
      ["bool", "savemht.shortcut.modifiers.ctrl", false],
      ["bool", "savemht.shortcut.modifiers.meta", true],
      ["bool", "savemht.shortcut.modifiers.shift", true],
      ["bool", "savemht.use8bit", false],
      ["bool", "savemht.imagelink", true],
      ["bool", "savemht.imagelink.thread", false],
      ["bool", "savemht.imagelink.perthread", false],
      ["bool", "savemht.preview", true],
      ["bool", "savemht.preview.count", false],
      ["bool", "savemht.aima.hide_entire_res", false],
      ["bool", "savemht.aima.show_res", false],
      ["bool", "cleanup", false],
      ["init",
       function (map) {
          if (Components.classes ["@mozilla.org/binaryinputstream;1"]
              == undefined) {
            document.getElementById ("savemht").disabled             = true;
            document.getElementById ("savemht").checked              = false;
          }
          AkahukuOptions.checkSaveMHT ();
          AkahukuOptions.changeFormat ("savemht_default_format");
          AkahukuOptions.checkSaveMHTShortcut ();
        }]
      ],
    "saveimage1" : [
      ["bool", "saveimage", false],
      ["bool", "saveimage.autolink.preview", false],
      ["bool", "saveimage.linkmenu", false],
      ["bool", "saveimage.limit", false],
      ["int",  "saveimage.limit.width", 1024],
      ["int",  "saveimage.limit.height", 1024],
      ["char", "saveimage.buttonsize", "1em"],
      ["bool", "saveimage.buttons", false],
      ["init",
       function (map) {
          if (Components.classes ["@mozilla.org/binaryinputstream;1"]
              == undefined) {
            document.getElementById ("saveimage").disabled             = true;
            document.getElementById ("saveimage").checked              = false;
          }
          AkahukuOptions.checkSaveImage ();
        }]
      ],
    "saveimage2" : [
      ["func", "saveimage.base.list2", null,
       function (map) {
          var value;
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.saveimage.base.list2", "null");
          value = AkahukuOptions.checkUndefined (unescape (value));
          if (value != "null") {
            AkahukuOptions.ListManager.fromString
              ("saveimage_base", value);
            
            return;
          }
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.saveimage.base.list", "");
          
          AkahukuOptions.ListManager.clear ("saveimage_base");
          
          var old_instantsrc
          = AkahukuOptions
          .initPref (map, "bool", "akahuku.saveimage.instantsrc", true);
          var old_instantsrc_always
          = AkahukuOptions
          .initPref (map, "bool", "akahuku.saveimage.instantsrc.always", false);
          var default_instantsrc = "";
          
          if (value != "") {
            /* 値を解析するだけなので代入はしない */
            value.replace
            (/([^&,]*)&([^&,]*)&?([^&,]*)?&?([^&,]*)?&?([^&,]*)?,?/g,
             function (matched, name, dir, dialog, subdir, key) {
              var value = {};
              
              if (!dialog) {
                dialog = "xx";
              }
              if (!subdir) {
                subdir = "0";
              }
              if (subdir == 1) {
                subdir = "12";
              }
              
              var dialog_keep = "x";
              if (dialog.match (/(.)(.)/)) {
                dialog = RegExp.$1;
                dialog_keep = RegExp.$2;
              }
              
              value.name = unescape (name);
              value.dir = unescape (dir);
              value.dialog = (unescape (dialog) == "o");
              value.dialog_keep = (unescape (dialog_keep) == "o");
              value.subdir_type = "simple";
              value.key = unescape (key);
              value.instantsrc = old_instantsrc;
              value.instantsrc_always = old_instantsrc_always;
              
              subdir = parseInt (unescape (subdir));
              value.subdir_url = (subdir & 32) ? true : false;
              value.subdir_board = (subdir & 2) ? true : false;
              value.subdir_server = (subdir & 4) ? true : false;
              value.subdir_dir = (subdir & 8) ? true : false;
              value.subdir_thread = (subdir & 16) ? true : false;
              value.subdir_msg8b = (subdir & 64) ? true : false;
              
              AkahukuOptions.ListManager.addItem
                ("saveimage_base", value, null);
            });
          }
        },
       function (fstream, deletePath) {
         var value = AkahukuOptions.ListManager.toString ("saveimage_base");
         if (deletePath) {
           value = "";
         }
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.saveimage.base.list2",
                   escape (value));
       }],
      ["init",
       function (map) {
          AkahukuOptions.ListManager.init ("saveimage_base");
          
          AkahukuOptions.checkSaveImageInstantSrc ();
          AkahukuOptions.checkSaveImageBaseDialog ();
          AkahukuOptions.checkSaveImageBaseSubdir ();
        }]
      ],
    "mail_comment" : [
      ["bool", "mailbox.sagebutton", true],
      ["bool", "mailbox.sagebutton.key", true],
      ["char", "mailbox.sagebutton.key.keycode", "VK_S"],
      ["bool", "mailbox.sagebutton.key.modifiers.alt", navigator.platform.match (/win/i) ? true : false],
      ["bool", "mailbox.sagebutton.key.modifiers.ctrl", navigator.platform.match (/mac/i) ? true : (navigator.platform.match (/win/i) ? false : true)],
      ["bool", "mailbox.sagebutton.key.modifiers.meta", false],
      ["bool", "mailbox.sagebutton.key.modifiers.shift", navigator.platform.match (/mac/i) ? false : true],
      ["bool", "mailbox.extend", false],
      ["bool", "mailbox.memory", false],
      ["bool", "mailbox.clear", false],
      ["bool", "mailbox.clear.sage", false],
      ["bool", "commentbox.status", true],
      ["bool", "commentbox.status.bytes", true],
      ["bool", "commentbox.status.limit", true],
      ["bool", "commentbox.status.size", false],
      ["bool", "commentbox.setrows", false],
      ["int",  "commentbox.setrows.count", 4],
      ["bool", "commentbox.scroll", false],
      ["bool", "commentbox.ime", false],
      ["bool", "commentbox.bg", true],
      ["bool", "commentbox.bg.frame", false],
      ["char", "commentbox.bg.custom", "no"],
      ["bool", "commentbox.preview", false],
      ["int",  "commentbox.preview.size", 64],
      ["bool", "commentbox.shortcut", false],
      ["char", "commentbox.shortcut.keycode", "VK_C"],
      ["bool", "commentbox.shortcut.modifiers.alt", false],
      ["bool", "commentbox.shortcut.modifiers.ctrl", false],
      ["bool", "commentbox.shortcut.modifiers.meta", true],
      ["bool", "commentbox.shortcut.modifiers.shift", true],
      ["init",
       function (map) {
          AkahukuOptions.checkSageButton ();
          AkahukuOptions.checkCommentboxStatus ();
          AkahukuOptions.checkCommentboxBG ();
          AkahukuOptions.checkCommentboxShortcut ();
        }]
      ],
    "form" : [
      ["bool", "postform.normal.hide", false],
      ["bool", "postform.normal.newtab", false],
      ["bool", "postform.normal.purge_history", false],
      ["bool", "postform.reply.hide", false],
      ["bool", "postform.reply.sendclose", true],
      ["bool", "postform.reply.thread", false],
      ["bool", "floatpostform", false],
      ["char", "floatpostform.position", "bottomright"],
      ["int",  "floatpostform.position.x", 0],
      ["int",  "floatpostform.position.y", 0],
      ["char", "floatpostform.width", "50%"],
      ["bool", "floatpostform.clickopen", true],
      ["bool", "floatpostform.clickclose", true],
      ["bool", "floatpostform.hidebutton", false],
      ["bool", "floatpostform.minimize", true],
      ["bool", "floatpostform.alpha", false],
      ["bool", "postform.preview", false],
      ["int",  "postform.preview.size", 250],
      ["bool", "postform.save_attachment", false],
      ["bool", "postform.paste_image_from_clipboard", false, "privatemod"],
      ["bool", "postform.delform.hide", false],
      ["bool", "postform.delform.left", false],
      ["bool", "postform.shimonkin", false],
      ["char", "postform.shimonkin.type", "all"],
      ["bool", "postform.bottom", false],
      ["bool", "postform.bottom_formonly", false, "privatemod"],
      ["init",
       function (map) {
          AkahukuOptions.checkFormCompatibility ();
          AkahukuOptions.checkFloatPostForm ();
          AkahukuOptions.checkPostFormBottom ();
          AkahukuOptions.checkPostFormPreview ();
        }]
      ],
    "reload" : [
      ["bool", "reload", true],
      ["bool", "reload.range.syncbutton", true],
      ["bool", "reload.range.syncbutton.nodelete", true],
      ["bool", "reload.range.syncbutton.id", true, "privatemod"],
      ["bool", "reload.rule", true],
      ["bool", "reload.rule.zeroheight", false],
      ["bool", "reload.rule.random", true],
      ["bool", "reload.reply", true],
      ["bool", "reload.reply.scroll", true],
      ["bool", "reload.hook", false],
      ["bool", "reload.hook.sync", false],
      ["bool", "reload.status.random", true],
      ["bool", "reload.partial.on", false],
      ["int",  "reload.partial.count", 100],
      ["int",  "reload.partial.up", 100],
      ["bool", "reload.status.hold", false],
      ["bool", "reload.timestamp", false],
      ["bool", "reload.nolimit", false],
      ["int",  "reload.nolimit.time", 0],
      ["bool", "reload.status_no_count", false],
      ["bool", "reload.extcache", false],
      ["bool", "reload.extcache.file", false],
      ["char", "reload.extcache.file.base", ""],
      ["bool", "reload.extcache.images", false, "privatemod"],
      ["init",
       function (map) {
          AkahukuOptions.checkPartial ();
          AkahukuOptions.checkReload ();
        }]
      ],
    "throp" : [
      ["bool", "thread_operator", false],
      ["bool", "thread_operator.show.move", true],
      ["bool", "thread_operator.show.thumbnail", true],
      ["bool", "thread_operator.show.reload", true],
      ["bool", "thread_operator.show.savemht", true],
      ["int",  "thread_operator.position.x", 0],
      ["int",  "thread_operator.position.y", 0],
      ["bool", "thread_operator.clickopen", false],
      ["bool", "thread_operator.clickclose", true],
      ["bool", "thread_operator.hide", true],
      ["bool", "thread_operator.threadtime", false],
      ["bool", "thread_operator.expire_diff", false],
      ["bool", "thread_operator.thumbnail", false],
      ["bool", "thread_operator.thumbnail.only", false],
      ["bool", "thread_operator.thumbnail.alpha", false],
      ["bool", "thread_operator.thumbnail.roll", true],
      ["int",  "thread_operator.thumbnail.size", 0],
      ["bool", "thread_operator.thumbnail.size.zoom", true],
      ["init",
       function (map) {
          AkahukuOptions.checkThreadOperator ();
        }]
      ],
    "link" : [
      ["bool", "thread.newtab", false],
      ["bool", "thread.back_new", false],
      ["bool", "thread.catalog_new", false],
      ["bool", "del.newtab", false],
      ["bool", "thread.back_on_bottom", false],
      ["bool", "thread.catalog_on_bottom", false],
      ["bool", "reload_on_bottom", false],
      ["bool", "thread.move_button", false],
      ["bool", "del.inline", false],
      ["init",
       function (map) {
        }]
      ],
    "thread" : [
      ["bool", "thread.numbering", true],
      ["int",  "thread.numbering.max", 100],
      ["bool", "thread.bottom_status", true],
      ["bool", "thread.bottom_status.diff", false],
      ["bool", "thread.bottom_status.hidden", false],
      ["bool", "thread.bottom_status.num", false],
      ["bool", "thread.bottom_status.num.random", true],
      ["bool", "thread.bottom_status.num.short", true],
      ["bool", "thread.bottom_status.num.entire", true],
      ["init",
       function (map) {
          AkahukuOptions.checkNumbering ();
          AkahukuOptions.checkThreadBottomStatus ();
        }]
      ],
    "popupquote" : [
      ["bool", "popupquote", true],
      ["int",  "popupquote.delay", 300,
       function (value) {
          if (value < 10) {
            value = 10;
          }
          return value;
        }],
      ["bool", "popupquote.clickhide", true],
      ["bool", "popupquote.image", true],
      ["int",  "popupquote.image.size", 2],
      ["bool", "popupquote.image.preview", true, "privatemod"],
      ["bool", "popupquote.image.preview.all", true, "privatemod"],
      ["bool", "popupquote.nearest", false],
      ["bool", "popupquote.bottomup", false],
      ["bool", "popupquote.matchbol", false, "privatemod"],
      ["init",
       function (map) {
          AkahukuOptions.checkPopupQuote ();
        }]
      ],
    "hidetroll" : [
      ["bool", "hidetrolls", true],
      ["char", "hidetrolls.mode", "normal"],
      ["char", "hidetrolls.user", ".........."],
      ["bool", "hidetrolls.random", false],
      ["bool", "hidetrolls.red", true],
      ["char", "hidetrolls.red.color", "red"],
      ["char", "hidetrolls.red.color.quote", "red"],
      ["bool", "hidetrolls.nocat", false],
      ["init",
       function (map) {
          if (document.getElementById ("hidetrolls_mode").value != "normal"
              && document.getElementById ("hidetrolls_mode").value != "hide"
              && document.getElementById ("hidetrolls_mode").value != "user") {
            document.getElementById ("hidetrolls_mode").value = "normal";
          }
          AkahukuOptions.checkHidetrolls ();
        }]
      ],
    "res" : [
      ["bool", "cutefont", false],
      ["char", "cutefont.family", escape ("\"\u3053\u3068\u308A\u3075\u3049\u3093\u3068\", \"\u3042\u304F\u3042\u30D5\u30A9\u30F3\u30C8\"")],
      ["bool", "style.ignore_default", false],
      ["bool", "style.ignore_default.font", false],
      ["int",  "style.ignore_default.font.size", 12,
       function (value) {
          if (value < 8) {
            value = 8;
          }
          else if (value > 24) {
            value = 24;
          }
          return value;
        }],
      ["bool", "showmail", true],
      ["bool", "showmail.popup", false],
      ["bool", "reply.limitwidth", true],
      ["bool", "reply.avoidwrap", false],
      ["bool", "reply.marginbottom", false],
      ["bool", "reply.nomargintop", false],
      ["bool", "reply.nomarginbottom", false],
      ["bool", "alertgif", false],
      ["init",
       function (map) {
          var defFormat = "\"\u3053\u3068\u308A\u3075\u3049\u3093\u3068\", \"\u3042\u304F\u3042\u30D5\u30A9\u30F3\u30C8\"";
          document.getElementById ("cutefont_family_example").value
          = "\u4F8B: " + defFormat;
          AkahukuOptions.checkCuteFont ();
          AkahukuOptions.checkStyleIgnoreDefault ();
        }]
      ],
    "autolink" : [
      ["bool", "autolink", true],
      ["bool", "autolink.focus", false],
      ["bool", "autolink.user", true],
      ["bool", "autolink.as", false],
      ["bool", "autolink.subject_name", false],
      ["bool", "autolink.preview", true],
      ["bool", "autolink.preview.multi", false],
      ["int",  "autolink.preview.swf.width", 320],
      ["int",  "autolink.preview.swf.height", 240],
      ["bool", "autolink.preview.autoopen", false],
      ["bool", "autolink.preview.autoopen.noquote", false],
      ["func", "autolink.user.patterns2", null,
       function (map) {
          var value;
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.autolink.user.patterns2",
                     "null");
          value = AkahukuOptions.checkUndefined (unescape (value));
          if (value != "null") {
            AkahukuOptions.ListManager.fromString
              ("autolink_user", value);
            
            return;
          }
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.autolink.user.patterns", "");
          
          AkahukuOptions.ListManager.clear ("autolink_user");
          
          if (value != "") {
            /* 値を解析するだけなので代入はしない */
            value.replace
            (/([^&,]*)&([^&,]*)&([^&,]*),?/g,
             function (matched, pattern, r, url) {
              var value = {};
              
              value.pattern = unescape (pattern);
              value.r = (unescape (r) == "o");
              value.url = unescape (url);
              
              AkahukuOptions.ListManager.addItem
                ("autolink_user", value, null);
            });
          }
        },
       function (fstream, deletePath) {
         var value = AkahukuOptions.ListManager.toString ("autolink_user");
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.autolink.user.patterns2",
                   escape (value));
       }],
      ["init",
       function (map) {
          AkahukuOptions.ListManager.init ("autolink_user");
          
          AkahukuOptions.checkAutoLink ();
        }]
      ],
    "p2p" : [
      ["bool", "p2p", false],
      ["func", "p2p.port.zero", null,
       function (map) {
          var noaccept
          = AkahukuOptions
          .initPref (map, "bool", "akahuku.p2p.port.zero", true);
          if (noaccept) {
            document.getElementById ("p2p_connection_type").value = "noaccept";
          }
          else {
            document.getElementById ("p2p_connection_type").value = "accept";
          }
        },
       function (fstream, deletePath) {
         var noaccept = false;
         var value = document.getElementById ("p2p_connection_type").value;
         if (value == "noaccept") {
           noaccept = true;
         }
         AkahukuOptions
         .setPref (fstream, "bool", "akahuku.p2p.port.zero",
                   noaccept);
       }],
      ["char", "p2p.address", "", "private"],
      ["int",  "p2p.port", 12545],
      ["func", "p2p.dynamic", null,
       function (map) {
          var dynamic
          = AkahukuOptions
          .initPref (map, "bool", "akahuku.p2p.dynamic", true);
          if (dynamic) {
            document.getElementById ("p2p_address_type").value = "dynamic";
          }
          else {
            document.getElementById ("p2p_address_type").value = "static";
          }
        },
       function (fstream, deletePath) {
         var dynamic = false;
         var value = document.getElementById ("p2p_address_type").value;
         if (value == "dynamic") {
           dynamic = true;
         }
         AkahukuOptions
         .setPref (fstream, "bool", "akahuku.p2p.dynamic",
                   dynamic);
       }],
      ["int",  "p2p.cache.check_interval", 0,
       function (value) {
          if (value != 0 && value < 30) {
            value = 30;
          }
          return value;
        }],
      ["int",  "p2p.cache.src_limit", 0,
       function (value) {
          if (value != 0 && value < 200) {
            value = 200;
          }
          return value;
        }],
      ["int",  "p2p.cache.thumb_limit", 0,
       function (value) {
          if (value != 0 && value < 200) {
            value = 200;
          }
          return value;
        }],
      ["int",  "p2p.cache.cat_limit", 0,
       function (value) {
          if (value != 0 && value < 200) {
            value = 200;
          }
          return value;
        }],
      ["char", "p2p.cache.base", "", "private"],
      ["bool", "p2p.treat_as_same", false],
      ["int",  "p2p.accept_slot", 3,
        function (value) {
          if (value < 3) {
            value = 3;
          }
          else if (value > 29) {
            value = 29;
          }
          return value;
        }],
      ["int",  "p2p.transfer.limit", 128,
       function (value) {
          if (value < 10) {
            value = 10;
          }
          return value;
        }],
      ["bool", "p2p.statusbar", true],
      ["bool", "p2p.nocat", false],
      ["bool", "p2p.prefetch.src", false],
      ["bool", "p2p.tatelog", false],
      ["bool", "savemht.usep2p", false],
      ["bool", "p2p.sidebar.shortcut", false],
      ["char", "p2p.sidebar.shortcut.keycode", "VK_P"],
      ["bool", "p2p.sidebar.shortcut.modifiers.alt", false],
      ["bool", "p2p.sidebar.shortcut.modifiers.ctrl", false],
      ["bool", "p2p.sidebar.shortcut.modifiers.meta", true],
      ["bool", "p2p.sidebar.shortcut.modifiers.shift", true],
      ["init",
       function (map) {
          AkahukuOptions.checkP2P ();
          AkahukuOptions.changeAddress ("p2p_address");
        }]
      ],
    "catalog1" : [
      ["bool", "catalog.reorder", true],
      ["int",  "catalog.reorder.width", 10,
       function (value) {
          if (value < 0) {
            value = 0;
          }
          return value;
        }],
      ["bool", "catalog.reorder.save", true],
      ["int",  "catalog.reorder.save.type", 0],
      ["bool", "catalog.reorder.visited", false],
      ["bool", "catalog.reorder.new", false],
      ["bool", "catalog.reorder.fill", false],
      ["bool", "catalog.reorder.info", false, "privatemod"],
      ["bool", "catalog.zoom", false],
      ["bool", "catalog.zoom.click", false],
      ["bool", "catalog.zoom.noanim", false],
      ["int",  "catalog.zoom.delay", 10,
       function (value) {
          if (value < 10) {
            value = 10;
          }
          return value;
        }],
      ["int",  "catalog.zoom.size", 96,
       function (value) {
          if (value < 50) {
            value = 50;
          }
          else if (value > 300) {
            value = 300;
          }
          return value;
        }],
      ["int",  "catalog.zoom.sizetype", 0], /* privatemod */
      ["int",  "catalog.zoom.cache.count", 16],
      ["bool", "catalog.zoom.comment", false],
      ["int",  "catalog.zoom.comment.delay", 10,
       function (value) {
          if (value < 10) {
            value = 10;
          }
          return value;
        }],
      ["init",
       function (map) {
          AkahukuOptions.checkCatalogReorder ();
          AkahukuOptions.checkCatalogZoom ();
        }]
      ],
    "catalog2" : [
      ["bool", "catalog.reload", true],
      ["bool", "catalog.reload.reply_number_delta", false],
      ["bool", "catalog.reload.status.hold", false],
      ["bool", "catalog.reload.update_cache", true],
      ["bool", "catalog.reload.hook", false],
      ["bool", "catalog.reload.timestamp", false],
      ["bool", "catalog.reload.left_before", false],
      ["bool", "catalog.reload.left_before.more", false],
      ["char", "catalog.reload.left_before.more.num", "1L"],
      ["bool", "catalog.reload.left_before.save", false],
      ["bool", "catalog.sidebar", false],
      ["bool", "catalog.sidebar.comment", true],
      ["int",  "catalog.sidebar.comment.length", 12],
      ["bool", "catalog.observe", false, "privatemod"],
      ["bool", "catalog.observe.replynum", false, "privatemod"],
      ["bool", "catalog.observe.opened", false, "privatemod"],
      ["bool", "catalog.clickable", true],
      ["bool", "catalog.visited", true],
      ["bool", "catalog.red", false],
      ["bool", "catalog.left", false],
      ["init",
       function (map) {
          AkahukuOptions.checkCatalogReload ();
          AkahukuOptions.checkCatalogSidebar ();
          AkahukuOptions.checkCatalogObserve ();
        }]
      ],
    "sidebar" : [
      ["bool", "sidebar", false],
      ["bool", "sidebar.background", false],
      ["bool", "sidebar.check.catalog", true],
      ["bool", "sidebar.tab.vertical", false],
      ["bool", "sidebar.tab.hidden", false],
      ["bool", "sidebar.tab.menu", false],
      ["bool", "sidebar.sort.visited", false],
      ["bool", "sidebar.sort.marked", true],
      ["bool", "sidebar.sort.invert", false],
      ["bool", "sidebar.markedtab", true],
      ["bool", "sidebar.save", false],
      ["int",  "sidebar.sort.type", 1],
      ["int",  "sidebar.max.view", 50],
      ["int",  "sidebar.max.cache", 100],
      ["int",  "sidebar.thumbnail.size", 64],
      ["bool", "sidebar.shortcut", false],
      ["char", "sidebar.shortcut.keycode", "VK_R"],
      ["bool", "sidebar.shortcut.modifiers.alt", false],
      ["bool", "sidebar.shortcut.modifiers.ctrl", false],
      ["bool", "sidebar.shortcut.modifiers.meta", true],
      ["bool", "sidebar.shortcut.modifiers.shift", true],
      ["func", "sidebar.list", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.sidebar.list", "");
          AkahukuOptions.initBoard (value, false, "sidebar_", false);
        },
       function (fstream, deletePath) {
         var listbox = document.getElementById ("sidebar_board_select_in_list");
         var value = "";
         var node = listbox.firstChild;
         while (node) {
           if (value != "") {
             value += ",";
           }
            
           value += escape (node.firstChild.getAttribute ("value"));
            
           var nextNode = node.nextSibling;
            
           node = nextNode;
         }
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.sidebar.list",
                   value);
       }],
      ["init",
       function (map) {
          AkahukuOptions.checkSidebar ();
        }]
      ],
    "board" : [
      ["bool", "board_select", false],
      ["func", "board_select.ex_list", null,
       function (map) {
          var value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.board_select.ex_list", "");
          AkahukuOptions.initBoard (value, true, "", true);
        },
       function (fstream, deletePath) {
         var listbox = document.getElementById ("board_select_ex_list");
         var value = "";
         var node = listbox.firstChild;
         while (node) {
           if (value != "") {
             value += ",";
           }
            
           value += escape (node.firstChild.getAttribute ("value"));
            
           var nextNode = node.nextSibling;
            
           node = nextNode;
         }
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.board_select.ex_list",
                   value);
       }],
      ["init",
       function (map) {
          AkahukuOptions.checkBoardSelect ();
        }]
      ],
    "external" : [
      ["bool", "board_external", false],
      ["func", "board_external.patterns2", "",
       function (map) {
          var value;
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.board_external.patterns2",
                     "null");
          value = AkahukuOptions.checkUndefined (unescape (value));
          if (value != "null") {
            AkahukuOptions.ListManager.fromString
              ("board_external", value);
            
            return;
          }
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.board_external.patterns", "");
          
          AkahukuOptions.ListManager.clear ("board_external");
          
          if (value != "") {
            /* 値を解析するだけなので代入はしない */
            value.replace
            (/([^&,]*)&([^&,]*),?/g,
             function (matched, pattern, flag) {
              var value = {};
              
              value.pattern = unescape (pattern);
              flag = parseInt (unescape (flag));
              value.monaca = (flag & 1) ? true : false;
              value.prefix = (flag & 2) ? true : false;
              
              AkahukuOptions.ListManager.addItem
                ("board_external", value, null);
            });
          }
        },
       function (fstream, deletePath) {
         var value = AkahukuOptions.ListManager.toString ("board_external");
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.board_external.patterns2",
                   escape (value));
       }],
      ["init",
       function (map) {
          AkahukuOptions.ListManager.init ("board_external");
          
          AkahukuOptions.checkBoardExternal ();
        }]
      ],
    "bloomer" : [
      ["bool", "bloomer", false],
      ["char", "bloomer.keycode", "VK_F2"],
      ["bool", "bloomer.modifiers.alt", false],
      ["bool", "bloomer.modifiers.ctrl", false],
      ["bool", "bloomer.modifiers.meta", false],
      ["bool", "bloomer.modifiers.shift", false],
      ["char", "bloomer.file", "", "private"],
      ["init",
       function (map) {
          AkahukuOptions.checkBloomer ();
        }]
      ],
    "sound" : [
      ["bool", "sound.reload.normal", false],
      ["char", "sound.reload.normal.file", "", "private"],
      ["bool", "sound.reload.reply", false],
      ["char", "sound.reload.reply.file", "", "private"],
      ["bool", "sound.new.reply", false],
      ["char", "sound.new.reply.file", "", "private"],
      ["bool", "sound.reload.catalog", false],
      ["char", "sound.reload.catalog.file", "", "private"],
      ["bool", "sound.expire", false],
      ["char", "sound.expire.file", "", "private"],
      ["bool", "sound.makethread", false],
      ["char", "sound.makethread.file", "", "private"],
      ["bool", "sound.reply", false],
      ["char", "sound.reply.file", "", "private"],
      ["bool", "sound.reply_fail", false],
      ["char", "sound.reply_fail.file", "", "private"],
      ["bool", "sound.savemht", false],
      ["char", "sound.savemht.file", "", "private"],
      ["bool", "sound.savemht.error", false],
      ["char", "sound.savemht.error.file", "", "private"],
      ["bool", "sound.saveimage", false],
      ["char", "sound.saveimage.file", "", "private"],
      ["bool", "sound.saveimage.error", false],
      ["char", "sound.saveimage.error.file", "", "private"],
      ["init",
       function (map) {
        }]
      ],
    "other" : [
      ["bool", "add_checkbox_id", false],
      ["bool", "statusbar.preferences", true],
      ["bool", "toolbar.preferences", false],
      ["bool", "statusbar.order", true],
      ["func", "statusbar.order.list", null,
       function (map) {
          var statusbarLabels = {
            "unmht" : "UnMHT",
            "aka" : "\u8D64\u798F",
            "aka_p2p" : "\u8D64\u798F P2P",
            "aima" : "\u5408\u9593\u5408\u9593\u306B",
            "aima_ng" : "\u5408\u9593\u5408\u9593\u306B NG\u30EF\u30FC\u30C9"
          };
          var value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.statusbar.order.list",
                     "unmht,aka,aka_p2p,aima,aima_ng");
          var list = new Array ();
          /* 値を解析するだけなので代入はしない */
          value.replace
          (/([^,]+),?/g,
           function (matched, part1) {
            list.push (unescape (part1));
            return "";
          });
          var listbox = document.getElementById ("statusbar_order_list");
          var node = listbox.firstChild;
          while (node) {
            var nextNode = node.nextSibling;
            listbox.removeChild (node);
            node = nextNode;
          }
          var listitem, listcell;
          for (var i = 0; i < list.length; i ++) {
            name = list [i];
            listitem = document.createElement ("listitem");
            listcell = document.createElement ("listcell");
            listcell.setAttribute ("value", name);
            listcell.setAttribute ("label", statusbarLabels [name]);
            listitem.appendChild (listcell);
            listbox.appendChild (listitem);
          }
        },
       function (fstream, deletePath) {
         var listbox = document.getElementById ("statusbar_order_list");
         var value = "";
         var node = listbox.firstChild;
         while (node) {
           if (value != "") {
             value += ",";
           }
           
           value += escape (node.firstChild.getAttribute ("value"));
            
           var nextNode = node.nextSibling;
            
           node = nextNode;
         }
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.statusbar.order.list",
                   value);
       }],
      ["init",
       function (map) {
          AkahukuOptions.checkStatusbarOrder ();
        }]
      ],
    "filename_convert" : [
      ["func", "filename_convert.list", "",
       function (map) {
          var value;
          
          value
          = AkahukuOptions
          .initPref (map, "char", "akahuku.filename_convert.list",
                     "null");
          value = AkahukuOptions.checkUndefined (unescape (value));
          if (value != "null") {
            AkahukuOptions.ListManager.fromString
              ("filename_convert", value);
            
            return;
          }
          
          AkahukuOptions.initFilenameConvert ();
        },
       function (fstream, deletePath) {
         var value = AkahukuOptions.ListManager.toString ("filename_convert");
         AkahukuOptions
         .setPref (fstream, "char", "akahuku.filename_convert.list",
                   escape (value));
       }],
      ["init",
       function (map) {
          AkahukuOptions.ListManager.init ("filename_convert");
        }
        ]
      ]
  },
  
  listList : {
    "saveimage_base" : {
      getValue : function () {
        var value = {};
        
        value.name = document.getElementById ("saveimage_base_name").value;
        value.dir = document.getElementById ("saveimage_base_dir").value;
        value.key = document.getElementById ("saveimage_base_key").value;
        
        value.subdir_type
        = document.getElementById ("saveimage_base_subdir").value;
        
        if (value.subdir_type == "simple") {
          value.subdir_url
            = document.getElementById ("saveimage_base_subdir_url").checked;
          value.subdir_board
            =　document.getElementById ("saveimage_base_subdir_board").checked;
          value.subdir_server
            = document.getElementById ("saveimage_base_subdir_server").checked;
          value.subdir_dir
            = document.getElementById ("saveimage_base_subdir_dir").checked;
          value.subdir_thread
            = document.getElementById ("saveimage_base_subdir_thread").checked;
          value.subdir_msg8b
            = document.getElementById ("saveimage_base_subdir_msg8b").checked;
        }
        else {
          value.subdir_format
          = document.getElementById ("saveimage_base_subdir_format").value;
        }
    
        value.dialog
        = document.getElementById ("saveimage_base_dialog").checked;
        value.dialog_keep
        = document.getElementById ("saveimage_base_dialog_keep").checked;
        
        value.instantsrc
        = document.getElementById ("saveimage_instantsrc").checked;
        value.instantsrc_always
        = document.getElementById ("saveimage_instantsrc_always").checked;
        
        return value;
      },
      
      checkError : function (value) {
        if (value.dir == "") {
          return "\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u7A7A\u3067\u3059";
        }
        
        return "";
      },
      
      isSame : function (value1, value2) {
        if (value1.name == value2.name
            && value1.dir == value2.dir
            && value1.dialog == value2.dialog
            && value1.dialog_keep == value2.dialog_keep
            && value1.subdir_type == value2.subdir_type
            && value1.key == value2.key
            && value1.instantsrc == value2.instantsrc
            && value1.instantsrc_always == value2.instantsrc_always) {
          if (value1.subdir_type == "simple") {
            if (value1.subdir_url == value2.subdir_url
                && value1.subdir_board == value2.subdir_board
                && value1.subdir_server == value2.subdir_server
                && value1.subdir_dir == value2.subdir_dir
                && value1.subdir_thread == value2.subdir_thread
                && value1.subdir_msg8b == value2.subdir_msg8b) {
              return true;
            }
          }
          if (value1.subdir_type == "expert") {
            if (value1.subdir_format == value2.subdir_format) {
              return true;
            }
          }
        }
        
        return false;
      },
      
      onAdd : function () {
        document.getElementById ("saveimage_base_name").value
        = "";
        document.getElementById ("saveimage_base_dir").value
        = "";
        document.getElementById ("saveimage_base_dialog").checked
        = false;
        document.getElementById ("saveimage_base_dialog_keep").checked
        = false;
        document.getElementById ("saveimage_base_key").value
        = "";
        document.getElementById ("saveimage_instantsrc").checked
        = false;
        document.getElementById ("saveimage_instantsrc_always").checked
        = false;
      },
      
      onSelect : function (value) {
        document.getElementById ("saveimage_base_name").value
        = value.name;
        document.getElementById ("saveimage_base_dir").value
        = value.dir;
        document.getElementById ("saveimage_base_dialog").checked
        = value.dialog;
        document.getElementById ("saveimage_base_dialog_keep").checked
        = value.dialog_keep;
        document.getElementById ("saveimage_instantsrc").checked
        = value.instantsrc;
        document.getElementById ("saveimage_instantsrc_always").checked
        = value.instantsrc_always;
        document.getElementById ("saveimage_base_key").value
        = value.key;
        
        document.getElementById ("saveimage_base_subdir").value
        = value.subdir_type;
        
        if (value.subdir_type == "expert") {
          document.getElementById ("saveimage_base_subdir_format").value
            = value.subdir_format;
          AkahukuOptions.changeFormat ("saveimage_base_subdir_format", true);
        }
        else {
          document.getElementById ("saveimage_base_subdir_url").checked
          = value.subdir_url;
          document.getElementById ("saveimage_base_subdir_board").checked
          = value.subdir_board;
          document.getElementById ("saveimage_base_subdir_server").checked
          = value.subdir_server;
          document.getElementById ("saveimage_base_subdir_dir").checked
          = value.subdir_dir;
          document.getElementById ("saveimage_base_subdir_thread").checked
          = value.subdir_thread;
          document.getElementById ("saveimage_base_subdir_msg8b").checked
          = value.subdir_msg8b;
        }
        
        AkahukuOptions.checkSaveImageBaseSubdir ();
        AkahukuOptions.checkSaveImageInstantSrc ();
        AkahukuOptions.checkSaveImageBaseDialog ();
      },
      
      isEnabled : function () {
        return true;
      },
      
      columns : [
        ["text",
         function (value) {
            return value.name;
          }
          ],
        ["text",
         function (value) {
            return value.dir;
          }
          ],
        ["text",
         function (value) {
            var labels = [];
            
            if (value.subdir_type == "simple") {
              if (value.subdir_url) {
                labels.push ("URL");
              }
              if (value.subdir_board) {
                labels.push ("\u677F");
              }
              if (value.subdir_server) {
                labels.push ("\u9BD6");
              }
              if (value.subdir_dir) {
                labels.push ("\u30C7\u30A3");
              }
              if (value.subdir_thread) {
                labels.push ("\u30B9\u30EC");
              }
              if (value.subdir_msg8b) {
                labels.push ("\u672C\u6587"); //"本文"
              }
              if (labels.length == 0) {
                labels.push ("\u306A\u3057");
              }
              return labels.join ("_");
            }
            else {
              return "\u8A73\u7D30";
            }
          }
          ],
        ["check",
         function (value) {
            return value.dialog;
          },
         function (value) {
           value.dialog = !value.dialog;
         }],
        ["check",
         function (value) {
            return value.dialog_keep;
          },
         function (value) {
           value.dialog_keep = !value.dialog_keep;
         }],
        ["text",
         function (value) {
            return value.key;
          }
          ],
        ["check",
         function (value) {
            return value.instantsrc;
          },
         function (value) {
           value.instantsrc = !value.instantsrc;
         }],
        ["check",
         function (value) {
            return value.instantsrc_always;
          },
         function (value) {
           value.instantsrc_always = !value.instantsrc_always;
         }]
        ]
    },
    
    "autolink_user" : {
      getValue : function () {
        var value = {};
        
        value.pattern = document.getElementById ("autolink_user_pattern").value;
        value.r = document.getElementById ("autolink_user_regexp").checked;
        value.url = document.getElementById ("autolink_user_url").value;
        
        return value;
      },
      
      checkError : function (value) {
        if (value.pattern == "") {
          return "\u30D1\u30BF\u30FC\u30F3\u304C\u7A7A\u3067\u3059";
        }
        
        if (value.url == "") {
          return "\u30EA\u30F3\u30AF\u5148\u304C\u7A7A\u3067\u3059";
        }
        
        if (value.r) {
          try {
            "test".search (value.pattern);
          }
          catch (e) {
            return  "\u6B63\u898F\u8868\u73FE\u304C\u4E0D\u6B63\u3067\u3059";
          }
        }
        
        return "";
      },
      
      isSame : function (value1, value2) {
        if (value1.pattern == value2.pattern
            && value1.r == value2.r
            && value1.url == value2.url) {
          return true;
        }
        
        return false;
      },
      
      onAdd : function () {
        document.getElementById ("autolink_user_pattern").value
        = "";
        document.getElementById ("autolink_user_url").value = "";
      },
      
      onSelect : function (value) {
        document.getElementById ("autolink_user_pattern").value
        = value.pattern;
        document.getElementById ("autolink_user_regexp").checked
        = value.r;
        document.getElementById ("autolink_user_url").value
        = value.url;
      },
      
      isEnabled : function () {
        return (document.getElementById ("autolink").checked
                && document.getElementById ("autolink_user").checked);
      },
      
      columns : [
        ["text",
         function (value) {
            return value.pattern;
          }
          ],
        ["check",
         function (value) {
            return value.r;
          },
         function (value) {
           value.r = !value.r;
         }],
        ["text",
         function (value) {
            return value.url;
          }
          ]
        ]
    },
    
    "board_external" : {
      getValue : function () {
        var value = {};
        
        value.pattern
        = document.getElementById ("board_external_pattern").value;
        value.monaca
        = document.getElementById ("board_external_monaca").checked;
        value.prefix
        = document.getElementById ("board_external_prefix").checked;
        
        return value;
      },
      
      checkError : function (value) {
        if (value.pattern == "") {
          return "\u30D1\u30BF\u30FC\u30F3\u304C\u7A7A\u3067\u3059";
        }
        
        if (!value.prefix) {
          try {
            "test".search (value.pattern);
          }
          catch (e) {
            return "\u6B63\u898F\u8868\u73FE\u304C\u4E0D\u6B63\u3067\u3059";
          }
          
          var count = 0;
          value.pattern.replace (/\([^\)]*\)/g,
                                 function (matched) {
                                   count ++;
                                 });
          if (count < 3) {
            return "\u30AB\u30C3\u30B3\u306E\u6570\u304C\u8DB3\u308A\u307E\u305B\u3093";
          }
        }
        
        return "";
      },
      
      isSame : function (value1, value2) {
        if (value1.pattern == value2.pattern
            && value1.monaca == value2.monaca
            && value1.prefix == value2.prefix) {
          return true;
        }
        
        return false;
      },
      
      onAdd : function () {
        document.getElementById ("board_external_pattern").value
        = "";
      },
      
      onSelect : function (value) {
        document.getElementById ("board_external_pattern").value
        = value.pattern;
        document.getElementById ("board_external_monaca").checked
        = value.monaca;
        document.getElementById ("board_external_prefix").checked
        = value.prefix;
      },
      
      isEnabled : function () {
        return document.getElementById ("board_external").checked;
      },
      
      columns : [
        ["text",
         function (value) {
            return value.pattern;
          }
          ],
        ["check",
         function (value) {
            return value.monaca;
          },
         function (value) {
           value.monaca = !value.monaca;
         }],
        ["check",
         function (value) {
            return value.prefix;
          },
         function (value) {
           value.prefix = !value.prefix;
         }]
        ]
    },
    
    "filename_convert" : {
      getValue : function () {
        var value = {};
        
        value.from
        = document.getElementById ("filename_convert_from").value;
        value.to
        = document.getElementById ("filename_convert_to").value;
        
        return value;
      },
      
      checkError : function (value) {
        if (value.from == "") {
          return "\u5909\u63DB\u5143\u304C\u7A7A\u3067\u3059";
        }
        
        return "";
      },
      
      isSame : function (value1, value2) {
        if (value1.from == value2.from
            && value1.to == value2.to) {
          return true;
        }
        
        return false;
      },
      
      onAdd : function () {
        document.getElementById ("filename_convert_from").value = "";
        document.getElementById ("filename_convert_to").value = "";
      },
      
      onSelect : function (value) {
        document.getElementById ("filename_convert_from").value
        = value.from;
        document.getElementById ("filename_convert_to").value
        = value.to;
      },
      
      isEnabled : function () {
        return true;
      },
      
      columns : [
        ["text",
         function (value) {
            if (value.from == "\t") {
              return "[Tab]";
            }
            if (value.from == "\r") {
              return "[CR]";
            }
            if (value.from == "\n") {
              return "[LF]";
            }
            if (value.from == " ") {
              return "[Space]";
            }
            return value.from;
          }
          ],
        ["text",
         function (value) {
            if (value.to == " ") {
              return "[Space]";
            }
            if (value.to == "") {
              return "[削除]";
            }
            return value.to;
          }
          ]
        ]
    }
  },
  
  /**
   * 初期化処理
   */
  init : function () {
    var contentBox = null, buttonBox = null;
    var dialog = document.getElementById ("akahuku_preferences_dialog");
    var nodes = document.getAnonymousNodes (dialog);
    for (var i = 0; i < nodes.length; i ++) {
      var n = nodes [i];
      if ("className" in n
          && n.className.match (/dialog-content-box/)) {
        contentBox = n;
      }
      if ("className" in n
          && n.className.match (/dialog-button-box/)) {
        buttonBox = n;
      }
      n = n.nextSibling;
    }
    window.addEventListener
    ("resize",
     (function (dialog, contentBox, buttonBox) {
       return function () {
         if (buttonBox.boxObject.x + buttonBox.boxObject.width - 8
             > dialog.clientWidth
             || buttonBox.boxObject.y + buttonBox.boxObject.height - 8
             > dialog.clientHeight) {
           contentBox.style.overflow = "auto";
         }
       };
     })(dialog, contentBox, buttonBox), true);
    
    var list = document.getElementById ("category");
    list.addEventListener
    ("select",
     function () {
      if (AkahukuOptions.prefBranch == null) {
        return;
      }
      var id = list.selectedItem.id;
      id = id.replace (/^anchor_/, "");
      if (!(id in AkahukuOptions.loadedTabs)) {
        AkahukuOptions.loadPrefsTab (null, id);
        AkahukuOptions.loadedTabs [id] = true;
      }
      var tab = document.getElementById ("tab_" + id);
      var tabbox = document.getElementById ("tabbox");
      tabbox.selectedPanel = tab;
    }, false);
    var tab = document.getElementById ("tab_title");
    list.selectedItem = list.firstChild;
    var tabbox = document.getElementById ("tabbox");
    tabbox.selectedPanel = tab;
        
    arAkahukuFile.init ();
    
    AkahukuOptions.loadPrefs (null, false);
  },
    
  /**
   * 適用
   */
  apply : function () {
    AkahukuOptions.savePrefs (null, false, false);
    
    arAkahukuFileName.getConfig ();
  },
    
  /**
   * 終了処理
   *
   * @return Boolean
   *         ダイアログを閉じるか
   */
  term : function () {
    if (AkahukuOptions.checkFocus ()) {
      return AkahukuOptions.savePrefs (null, false, false);
    }
    else {
      return false;
    }
  },
    
  /**
   * 古い Mozilla Suite でエスケープ解除できない %uXXXX を解除する
   *
   * @param  String text
   *         解除する文字列
   * @return String
   *         解除した文字列
   */
  unescapeExtra : function (text) {
    return text
    .replace (/%(u[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])/g,
              function (match, part) {
                return eval ("\"\\" + part + "\";");
              });
  },
    
  /**
   * 設定を読み込む
   * 設定が無ければ既定値を書き込む
   *
   * @param Object map
   *        設定のマップ
   *        prefs.js から読む場合は null
   *        <String 設定名, String 設定値>
   * @param  String type
   *         設定の種類
   *          "bool"
   *          "char"
   *          "int"
   * @param  String name
   *         設定名
   * @param  Boolean/String/Number value
   *         既定値
   * @return Boolean/String/Number
   *         取得した値
   *         設定が無ければ既定値
   */
  initPref : function (map, type, name, value) {
    if (map == null) {
      if (AkahukuOptions.prefBranch.prefHasUserValue (name)) {
        ; /* switch のインデント用 */
        switch (type) {
          case "bool":
            value = AkahukuOptions.prefBranch.getBoolPref (name);
            break;
          case "char":
            value = AkahukuOptions.prefBranch.getCharPref (name);
            break;
          case "int":
            value = AkahukuOptions.prefBranch.getIntPref (name);
            break;
        }
      }
      else {
        ; /* switch のインデント用 */
        switch (type) {
          case "bool":
            AkahukuOptions.prefBranch.setBoolPref (name, value);
            break;
          case "char":
            AkahukuOptions.prefBranch.setCharPref (name, value);
            break;
          case "int":
            AkahukuOptions.prefBranch.setIntPref (name, value);
            break;
        }
      }
    }
    else {
      for (var name2 in map) {
        if (name2 == name) {
          ; /* switch のインデント用 */
          switch (type) {
            case "bool":
              value = (map [name2] == "true");
              break;
            case "char":
              value = map [name2];
              break;
            case "int":
              value = parseInt (map [name2]);
              break;
          }
          break;
        }
      }
    }
        
    return value;
  },
    
  /**
   * 設定を読み込む
   *
   * @param Object map
   *        設定のマップ
   *        prefs.js から読む場合は null
   *        <String 設定名, String 設定値>
   */
  loadPrefs : function (map, forAll) {
    AkahukuOptions.t = (new Date ()).getTime ();
    
    var defFormat;
    var value;
    
    if (map == null) {
      if (AkahukuOptions.prefBranch == null) {
        if (Components.interfaces.nsIPrefBranch2) {
          AkahukuOptions.prefBranch
          = Components.classes ["@mozilla.org/preferences-service;1"]
          .getService (Components.interfaces.nsIPrefBranch2);
        }
        else {
          AkahukuOptions.prefBranch
          = Components.classes ["@mozilla.org/preferences-service;1"]
          .getService (Components.interfaces.nsIPrefBranch);
        }
      }
      
      arAkahukuFileName.getConfig ();
      
      document.getElementById ("version").value
        += AkahukuVersion;
            
      var button;
            
      button = document
        .getElementById ("akahuku_preferences_dialog")
        .getButton ("extra1");
      button.addEventListener
        ("command",
         function () {
          AkahukuOptions.apply ();
        }, true);
            
      button = document
        .getElementById ("akahuku_preferences_dialog")
        .getButton ("accept");
      button.addEventListener
        ("mousedown",
         function () {
          arguments [0].explicitOriginalTarget.focus ();
        }, true);
            
      AkahukuOptions.initKeyMenu ("savemht_shortcut_keycode_menu");
      AkahukuOptions.initKeyMenu ("p2p_sidebar_shortcut_keycode_menu");
      AkahukuOptions.initKeyMenu ("sidebar_shortcut_keycode_menu");
      AkahukuOptions.initKeyMenu ("mailbox_sagebutton_key_keycode_menu");
      AkahukuOptions.initKeyMenu ("commentbox_shortcut_keycode_menu");
      AkahukuOptions.initKeyMenu ("bloomer_keycode_menu");
    }
        
    document.getElementById ("all").checked
    = AkahukuOptions
    .initPref (map, "bool", "akahuku.all", true);
    
    AkahukuOptions.loadedTabs = {};
    
    if (forAll) {
      var catbox = document.getElementById ("category");
      var node = catbox.firstChild;
      while (node) {
        var id = node.id.replace (/^anchor_/, "");
        AkahukuOptions.loadPrefsTab (map, id);
        AkahukuOptions.loadedTabs [id] = true;
        
        node = node.nextSibling;
      }
    }
    else {
      var tabbox = document.getElementById ("tabbox");
      var id = tabbox.selectedPanel.id.replace (/^tab_/, "");
      AkahukuOptions.loadPrefsTab (map, id);
      AkahukuOptions.loadedTabs [id] = true;
    }
  },
  
  /**
   * タブごとの設定をロードする
   *
   * @param  Object map
   *         設定のマップ
   *         prefs.js から読む場合は null
   *         <String 設定名, String 設定値>
   * @param  String tab_id
   *         対象のタブの id
   */
  loadPrefsTab : function (map, tab_id) {
    if (!(tab_id in AkahukuOptions.prefList)) {
      return;
    }
    var list = AkahukuOptions.prefList [tab_id];
    for (var i = 0; i < list.length; i ++) {
      var item = list [i];
      var type = item [0];
      var name = item [1];
      var value = item [2];
      var loadFunc = null;
      if (item.length >= 4) {
        loadFunc = item [3];
      }
      if (type == "func") {
        loadFunc (map);
      }
      else if (type == "init") {
        item [1] (map);
      }
      else {
        var id = name.replace (/\./g, "_");
        var node = document.getElementById (id);
        if (type == "bool") {
          node.checked
            = AkahukuOptions.initPref
            (map, "bool", "akahuku." + name, value);
        }
        else if (type == "int") {
          node.value
            = AkahukuOptions.initPref
            (map, "int", "akahuku." + name, value);
        }
        else if (type == "char") {
          value
            = AkahukuOptions.initPref
            (map, "char", "akahuku." + name, value);
          node.value = unescape (value);
        }
        
        if (node.nodeName.match (/radiogroup|menulist/)) {
          AkahukuOptions.selectItem (node);
        }
      }
    }
  },
    
  /**
   * タブごとの設定を保存する
   *
   * @param  nsIFileOutputStream fstream
   *         保存先のファイル
   *         prefs.js に保存する場合は null
   * @param  Boolean deletePath
   *         パス等を削除するか
   * @param  String tab_id
   *         対象のタブの id
   */
  savePrefsTab : function (fstream, deletePath, tab_id) {
    if (!(tab_id in AkahukuOptions.prefList)) {
      return;
    }
    var list = AkahukuOptions.prefList [tab_id];
    for (var i = 0; i < list.length; i ++) {
      var item = list [i];
      var type = item [0];
      var name = item [1];
      var saveFunc = null;
      if (item.length >= 5) {
        saveFunc = item [4];
      }
      var value;
      var id;
      if (type == "bool") {
        id = name.replace (/\./g, "_");
        AkahukuOptions
          .setPref (fstream, "bool", "akahuku." + name,
                    document.getElementById (id).checked);
      }
      else if (type == "int") {
        id = name.replace (/\./g, "_");
        var value = document.getElementById (id).value;
        if (item.length >= 4) {
          var filter = item [3];
          value = filter (value);
        }
        AkahukuOptions
          .setPref (fstream, "int",  "akahuku." + name,
                    parseInt (value, 10));
      }
      else if (type == "char") {
        id = name.replace (/\./g, "_");
        value   = document.getElementById (id).value;
        if (item.length >= 4) {
          var flag = item [3];
          if (flag.match (/private/)
              && deletePath) {
            value = "";
          }
        }
        AkahukuOptions
          .setPref (fstream, "char", "akahuku." + name,
                    escape (value));
      }
      else if (type == "func") {
        item [4] (fstream, deletePath);
      }
    }
  },
  
  /**
   * 板のリストを初期化する
   * 
   * @param  String value
   *         板のリスト
   * @param  Boolean ex
   *         板のリストが除外する側か
   * @param  String type
   *         リストの種類
   *           "" ： 動作する板
   *           "sidebar_" ： サイドバーに表示する板
   * @param  Boolean unmht
   *         UnMHT を含めるか
   */
  initBoard : function (value, ex, type, unmht) {
    var names = new Object ();
    var name;
    for (name in arAkahukuServerName) {
      names [name] = arAkahukuServerName [name];
    }
    if (unmht) {
      names ["UnMHT:UnMHT"] = "UnMHT \u306E\u51FA\u529B";
    }
    var listbox = document.getElementById (type + "board_select_ex_list");
    var node = listbox.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeName == "listitem") {
        listbox.removeChild (node);
      }
      node = nextNode;
    }
    listbox = document.getElementById (type + "board_select_in_list");
    node = listbox.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeName == "listitem") {
        listbox.removeChild (node);
      }
      node = nextNode;
    }
    var listitem, listcell;
    if (value != "") {
      if (ex) {
        listbox
          = document.getElementById (type + "board_select_ex_list");
      }
      else {
        listbox
          = document.getElementById (type + "board_select_in_list");
      }
      /* 値を解析するだけなので代入はしない */
      value.replace
        (/([^,]+),?/g,
         function (matched, part1) {
          name = unescape (part1);
          if (name in names
              && names [name]) {
            listitem = document.createElement ("listitem");
            listcell = document.createElement ("listcell");
            listcell.setAttribute ("value", name);
            listcell.setAttribute ("label", names [name]);
            names [name] = null;
            listitem.appendChild (listcell);
            listbox.appendChild (listitem);
          }
        });
    }
    if (ex) {
      listbox = document.getElementById (type + "board_select_in_list");
    }
    else {
      listbox = document.getElementById (type + "board_select_ex_list");
    }
    for (name in names) {
      if (names [name]) {
        listitem = document.createElement ("listitem");
        listcell = document.createElement ("listcell");
        listcell.setAttribute ("value", name);
        listcell.setAttribute ("label", names [name]);
        listitem.appendChild (listcell);
        listbox.appendChild (listitem);
      }
    }
  },
    
  /**
   * ラヂオボタンの選択肢を表示に反映する
   * (古いバージョンだと value の変更だけでは反映されない)
   *
   */
  selectItem : function (node) {
    var value = node.value;
        
    var nodes = node.getElementsByTagName ("radio");
    for (var i = 0; i < nodes.length; i ++) {
      if (nodes [i].value == value) {
        node.selectedItem = nodes [i];
      }
    }
  },
    
  /**
   * 設定を保存する
   *
   * @param  nsIFileOutputStream fstream
   *         保存先のファイル
   *         prefs.js に保存する場合は null
   * @param  String type
   *         設定の種類
   *          "bool"
   *          "char"
   *          "int"
   * @param  String name
   *         設定名
   * @param  Boolean/String/Number value
   *         既定値
   */
  setPref : function (fstream, type, name, value) {
    if (fstream == null) {
      ; /* switch のインデント用 */
      switch (type) {
        case "bool":
          AkahukuOptions.prefBranch.setBoolPref (name, value);
          break;
        case "char":
          AkahukuOptions.prefBranch.setCharPref (name, value);
          break;
        case "int":
          AkahukuOptions.prefBranch.setIntPref (name, value);
          break;
      }
    }
    else {
      var line = escape (name) + "," + escape (value) + "\r\n";
      fstream.write (line, line.length);
    }
  },
    
  /**
   * 設定を保存する
   *
   * @param  nsIFileOutputStream fstream
   *         保存先のファイル
   *         prefs.js に保存する場合は null
   * @param  Boolean deletePath
   *         パス等を削除するか
   * @return Boolean
   *         成功フラグ
   */
  savePrefs : function (fstream, deletePath, forAll) {
    var value;
    
    if (fstream) {
      AkahukuOptions
        .setPref (fstream, "char", "akahuku.version",
                  AkahukuVersion.split(".").splice(0,3).join("."));
    }
    else {
      if (AkahukuOptions.prefBranch == null) {
        if (Components.interfaces.nsIPrefBranch2) {
          AkahukuOptions.prefBranch
          = Components.classes ["@mozilla.org/preferences-service;1"]
          .getService (Components.interfaces.nsIPrefBranch2);
        }
        else {
          AkahukuOptions.prefBranch
          = Components.classes ["@mozilla.org/preferences-service;1"]
          .getService (Components.interfaces.nsIPrefBranch);
        }
      }
    }
        
    AkahukuOptions
    .setPref (fstream, "bool", "akahuku.all",
              document.getElementById ("all").checked);
    
    if (forAll) {
      var catbox = document.getElementById ("category");
      var node = catbox.firstChild;
      while (node) {
        var id = node.id.replace (/^anchor_/, "");
        
        if (!(id in AkahukuOptions.loadedTabs)) {
          AkahukuOptions.loadPrefsTab (null, id);
          AkahukuOptions.loadedTabs [id] = true;
        }
        node = node.nextSibling;
      }
    }
    
    for (var id in AkahukuOptions.loadedTabs) {
      AkahukuOptions.savePrefsTab (fstream, deletePath, id);
    }
    
    AkahukuOptions
    .setPref (fstream, "char", "akahuku.savepref",
              new Date ().getTime ());
        
    if (fstream == null) {
      var prefService
        = Components.classes ["@mozilla.org/preferences-service;1"].
        getService (Components.interfaces.nsIPrefService);
            
      prefService.savePrefFile (null);
    }
        
    return true;
  },
    
  /**
   * タイトルのフォーマットを初期化する
   */
  initTitleFormat : function () {
    var defFormat;
    defFormat = "%3Cold%3E%u53E4%20%3C/old%3E%3Cnijiura%3E%26server%3B%3C/nijiura%3E%3C_nijiura%3E%26board%3B%3C/_nijiura%3E%0A%3Cmessage%3E%20%26message%3B%3C/message%3E%3Cpage%3E%20%26page%3B%3C/page%3E%3Ccatalog%3E%20%u30AB%u30BF%u30ED%u30B0%3C/catalog%3E%0A%3Cexpire%3E%20%28%26expire%3B%29%3C/expire%3E";
        
    document.getElementById ("title_format").value = unescape (defFormat);
    AkahukuOptions.changeFormat ("title_format");
  },
    
  /**
   * 音を再生する
   *
   * @param  String id
   *         対象の要素の id
   */
  playFile : function (id) {
    var filename = document.getElementById (id).value;
        
    var sound
    = Components.classes ["@mozilla.org/sound;1"]
    .createInstance (Components.interfaces.nsISound);
        
    var ios = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (Components.interfaces.nsIIOService);
        
    var url = arAkahukuFile.getURLSpecFromFilename (filename);
            
    if (url) {
      var uri = ios.newURI (url, null, null);
            
      if (uri) {
        sound.play (uri);
      }
    }
  },
    
  /**
   * カスタムのためのシステムディレクトリを開く
   *
   */
  openSystemDirectory : function () {
    var file
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (Components.interfaces.nsILocalFile);
    file.initWithPath (arAkahukuFile.systemDirectory);
    file.reveal ();
  },
    
  /**
   * タブの並びかたが変わったイベント
   *
   * @param  Number n
   *         順番
   */
  onChangeTabSortOrder : function (n) {
    var selected = {
      "normal" : false,
      "reply" : false,
      "catalog" : false,
      "other" : false
    };
        
    var node;
    var value;
        
    var fromValue = "";
    var toValue = "";
        
    var i, name;
        
    for (i = 1; i <= 4; i ++) {
      node = document.getElementById ("tab_sort_order_" + i);
      value = node.value;
      if (i == n) {
        fromValue = value;
      }
      selected [value] = true;
    }
        
    for (name in selected) {
      if (!selected [name]) {
        toValue = name;
      }
    }
        
    for (i = 1; i <= 4; i ++) {
      node = document.getElementById ("tab_sort_order_" + i);
      value = node.value;
      if (i != n && value == fromValue) {
        node.value = toValue;
        AkahukuOptions.selectItem (node);
        break;
      }
    }
  },
    
  /**
   * ファイル、ディレクトリを選択する
   *
   * @param  String id
   *         対象の要素の id
   * @param  Boolean file
   *         対象
   *           true: ファイル
   *           false: ディレクトリ
   * @param  String message
   *         ダイアログのタイトル
   */
  selectFile : function (id, file, message) {
    var filePicker
    = Components.classes ["@mozilla.org/filepicker;1"]
    .createInstance (Components.interfaces.nsIFilePicker);
    var flag = 0;
    if (file) {
      flag = Components.interfaces.nsIFilePicker.modeOpen;
    }
    else {
      flag = Components.interfaces.nsIFilePicker.modeGetFolder;
    }
        
    filePicker.init (window, message,
                     flag);
        
    try {
      var base = document.getElementById (id).value;
            
      var dir
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (Components.interfaces.nsILocalFile);
      dir.initWithPath (base);
            
      filePicker.displayDirectory = dir;
    }
    catch (e) {
    }
        
    arAkahukuCompat.FilePicker.open (filePicker, function (ret) {
      if (ret == Components.interfaces.nsIFilePicker.returnOK) {
        document.getElementById (id).value
        = filePicker.file
        .QueryInterface (Components.interfaces.nsILocalFile).path;
      }
    });
  },
    
  /**
   * MHT で保存のフォーマットを初期化する
   */
  initSaveMHTDefaultFormat : function () {
    var defFormat;
    defFormat = "%26server%3B_%26thread%3B_%26YY%3B%uFF0F%26MM%3B%uFF0F%26DD%3B_%26hh%3B%uFF1A%26mm%3B%uFF1A%26ss%3B_%26message%3B";
        
    document.getElementById ("savemht_default_format").value
    = unescape (defFormat);
    AkahukuOptions.changeFormat ("savemht_default_format");
  },
    
  /**
   * フォント変更を初期化する
   */
  initCuteFont : function () {
    document.getElementById ("cutefont_family").value
    = "\"\u3053\u3068\u308A\u3075\u3049\u3093\u3068\","
    + " \"\u3042\u304F\u3042\u30D5\u30A9\u30F3\u30C8\"";
  },
    
  /**
   * P2P のポートを初期化する
   */
  initP2PPort : function () {
    document.getElementById ("p2p_port").value = 12545;
  },
  
  /**
   * P2P のアドレスが変更されたイベント
   *
   * @param String id
   *        対象の要素の id
   */
  changeAddress : function (id) {
    var text = document.getElementById (id).value;
    var error = false;
        
    if (!text.match
        (/^[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$/)) {
      error = true;
    }
    if (text.match
        (/^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/)) {
      /* IP アドレス */
      var n1 = parseInt (RegExp.$1);
      var n2 = parseInt (RegExp.$2);
      var n3 = parseInt (RegExp.$3);
      var n4 = parseInt (RegExp.$4);
      if (n1 == 10
          || (n1 == 172 && n2 >= 16 && n2 <= 31)
          || (n1 == 192 && n2 == 168)
          || (n1 == 127 && n2 == 0 && n3 == 0 && n4 == 1)
          || (n1 == 169 && n2 == 254)) {
        error = true;
      }
    }
    else if (text.match (/^[0-9\.]+$/)) {
      error = true;
    }
        
    if (document.getElementById ("p2p_address_type").value == "dynamic"
        && text == "") {
      error = false;
    }
        
    if (error) {
      document.getElementById ("p2p_address_warning").value
      = "\u30A2\u30C9\u30EC\u30B9\u304C\u7121\u52B9\u3067\u3059";
    }
    else {
      document.getElementById ("p2p_address_warning").value = "";
    }
  },
  
  /**
   * フォーマットが変更されたイベント
   *
   * @param  String id
   *         対象の要素の id
   * @param  Boolean isImage
   *         画像か
   */
  changeFormat : function (id, isImage) {
    var text = document.getElementById (id).value;
    
    var info = new arAkahukuLocationInfo (null, false);
    
    info.isOnline = true;
    info.isFutaba = true;
    info.isMonaca = true;
    info.isMht = false;
    info.isNijiura = true;
    
    info.isNormal = false;
    info.isCatalog = false;
    info.isReply = true;
    info.isFutasuke = false;
    info.isNotFound = false;
    
    info.normalPageNumber = 0;
    info.threadNumber = 45296860;
    info.replyCount = 1;
    
    info.nijiuraServer = "img";
    
    info.replyPrefix = "\u2026";
    
    info.server = "img";
    info.dir = "b";
    
    info.isOld = true;
    info.board = "\u8679\u88CF img";
    info.board2 = "\u8679\u88CF";
    info.board3 = "\u4E8C\u6B21\u5143\u88CF";
    info.message = "\u304A\u3063\u3071\u3044\u301C\u3093";
    info.message2 = "\u304A\u3063\u3071\u3044\u301C\u3093";
    info.message8byte = "\u304A\u3063\u3071\u3044";
    info.entiremessage = "\u304A\u3063\u3071\u3044\u301C\u3093";
    info.name = "";
    info.mail = "";
    info.subject = "";
    info.ip = "";
    info.id = "";
    info.mode = "\u8FD4\u4FE1";
    
    info.viewer = "100";
    info.expire = "02:25";
    info.expireWarning = "\u3053\u306E\u30B9\u30EC\u306F\u53E4\u3044\u306E\u3067\u3001\u3082\u3046\u3059\u3050\u6D88\u3048\u307E\u3059\u3002\u000A";
    
    info.year = "06";
    info.month = "07";
    info.day = "28";
    info.week = "\u91D1";
    info.hour = "01";
    info.min = "25";
    info.sec = "43";
    
    text = info.format (text);
    if (id == "savemht_default_format") {
      var tmp = info.escapeForFilename (text, true);
      if (tmp [0]) {
        text = tmp [0] + "/" + tmp [1];
      }
      else {
        text = tmp [1];
      }
    }
    if (id == "saveimage_base_subdir_format") {
      var href = "img.2chan.net<separator />b<separator />src";
      text = text.replace (/<url ?\/>/, href);
      var tmp = info.escapeForFilename (text + "<separator />", true);
      text = tmp [0];
    }
    
    document.getElementById (id + "_sample").value = "\u4F8B: " + text;
  },
  
  /**
   * リストの選択項目を上にずらすボタンのイベント
   *
   * @param  String id
   *         リストの id
   */
  onMoveupList : function (id) {
    var listbox = document.getElementById (id);
        
    var node = listbox.firstChild;
    var nextNode = null;
    var prevNode = null;
    var node1 = null;
    var node2 = null;
    var tmp = "";
    while (node) {
      nextNode = node.nextSibling;
      if (node.nodeName == "listitem") {
        if (node.selected) {
          if (prevNode) {
            node1 = node.firstChild;
            node2 = prevNode.firstChild;
            while (node1 && node2) {
              tmp = node1.getAttribute ("value");
              node1.setAttribute ("value",
                                  node2.getAttribute ("value"));
              node2.setAttribute ("value", tmp);
                            
              if (node1.getAttribute ("class")
                  == "listcell-iconic") {
                tmp = node1.getAttribute ("image");
                node1.setAttribute ("image",
                                    node2
                                    .getAttribute ("image"));
                node2.setAttribute ("image", tmp);
              }
              else {
                tmp = node1.getAttribute ("label");
                node1.setAttribute ("label",
                                    node2
                                    .getAttribute ("label"));
                node2.setAttribute ("label", tmp);
              }
                            
              node1 = node1.nextSibling;
              node2 = node2.nextSibling;
            }
            listbox.toggleItemSelection (node);
            listbox.toggleItemSelection (prevNode);
            prevNode = prevNode;
          }
        }
        else {
          prevNode = node;
        }
      }
      node = nextNode;
    }
  },
    
  /**
   * リストの選択項目を下にずらすボタンのイベント
   *
   * @param  String id
   *         リストの id
   */
  onMovedownList : function (id) {
    var listbox = document.getElementById (id);
        
    var node = listbox.lastChild;
    var nextNode = null;
    var prevNode = null;
    var node1 = null;
    var node2 = null;
    var tmp = "";
    while (node) {
      prevNode = node.previousSibling;
      if (node.nodeName == "listitem") {
        if (node.selected) {
          if (nextNode) {
            node1 = node.firstChild;
            node2 = nextNode.firstChild;
            while (node1 && node2) {
              tmp = node1.getAttribute ("value");
              node1.setAttribute ("value",
                                  node2.getAttribute ("value"));
              node2.setAttribute ("value", tmp);
                            
              if (node1.getAttribute ("class")
                  == "listcell-iconic") {
                tmp = node1.getAttribute ("image");
                node1.setAttribute ("image",
                                    node2
                                    .getAttribute ("image"));
                node2.setAttribute ("image", tmp);
              }
              else {
                tmp = node1.getAttribute ("label");
                node1.setAttribute ("label",
                                    node2
                                    .getAttribute ("label"));
                node2.setAttribute ("label", tmp);
              }
                            
              node1 = node1.nextSibling;
              node2 = node2.nextSibling;
            }
            listbox.toggleItemSelection (node);
            listbox.toggleItemSelection (nextNode);
            nextNode = nextNode;
          }
        }
        else {
          nextNode = node;
        }
      }
      node = prevNode;
    }
  },
    
  /**
   * キーが押されたイベント
   *
   * @param  Event event
   *         対象のイベント
   * @param  Function func
   *         削除関数
   */
  onKeyDown : function (event, func) {
    if (event.keyCode == 8 || event.keyCode == 46) {
      func ();
    }
  },
    
  /**
   * キーコードのメニュー項目を設定する
   *
   * @param  String id
   *         メニューの id
   */
  initKeyMenu : function (id) {
    var menu = document.getElementById (id);
        
    var menuItem;
        
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_(.+))$/)) {
        var code = RegExp.$1;
        var name = RegExp.$2;
        if (code in keyNames) {
          name = keyNames [code];
        }
                
        menuItem = document.createElement ("menuitem");
        menuItem.setAttribute ("label", name);
        menuItem.setAttribute ("value", code);
        menu.appendChild (menuItem);
      }
    }
        
    menu.parentNode.selectedIndex = 0;
  },
    
  /**
   * P2P サイドバーのキー変更イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onP2PSidebarShortcutKeyDown : function (event) {
    var keycode = "";
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_.+)$/)) {
        var code = RegExp.$1;
        if (event.keyCode
            == Components.interfaces.nsIDOMKeyEvent [attribute]) {
          keycode = code;
        }
      }
    }
        
    if (keycode != "") {
      document.getElementById ("p2p_sidebar_shortcut_keycode").value
      = keycode;
      AkahukuOptions.selectItem (document.getElementById
                                 ("p2p_sidebar_shortcut_keycode"));
            
      document.getElementById ("p2p_sidebar_shortcut_modifiers_alt").checked
      = event.altKey;
      document.getElementById ("p2p_sidebar_shortcut_modifiers_ctrl").checked
      = event.ctrlKey;
      document.getElementById ("p2p_sidebar_shortcut_modifiers_meta").checked
      = event.metaKey;
      document.getElementById ("p2p_sidebar_shortcut_modifiers_shift").checked
      = event.shiftKey;
    }
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * サイドバーのキー変更イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSidebarShortcutKeyDown : function (event) {
    var keycode = "";
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_.+)$/)) {
        var code = RegExp.$1;
        if (event.keyCode
            == Components.interfaces.nsIDOMKeyEvent [attribute]) {
          keycode = code;
        }
      }
    }
        
    if (keycode != "") {
      document.getElementById ("sidebar_shortcut_keycode").value
      = keycode;
      AkahukuOptions.selectItem (document.getElementById
                                 ("sidebar_shortcut_keycode"));
            
      document.getElementById ("sidebar_shortcut_modifiers_alt").checked
      = event.altKey;
      document.getElementById ("sidebar_shortcut_modifiers_ctrl").checked
      = event.ctrlKey;
      document.getElementById ("sidebar_shortcut_modifiers_meta").checked
      = event.metaKey;
      document.getElementById ("sidebar_shortcut_modifiers_shift").checked
      = event.shiftKey;
    }
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * MHT で保存のキー変更イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onSaveMHTShortcutKeyDown : function (event) {
    var keycode = "";
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_.+)$/)) {
        var code = RegExp.$1;
        if (event.keyCode
            == Components.interfaces.nsIDOMKeyEvent [attribute]) {
          keycode = code;
        }
      }
    }
        
    if (keycode != "") {
      document.getElementById ("savemht_shortcut_keycode").value
      = keycode;
      AkahukuOptions.selectItem (document.getElementById
                                 ("savemht_shortcut_keycode"));
            
      document.getElementById ("savemht_shortcut_modifiers_alt").checked
      = event.altKey;
      document.getElementById ("savemht_shortcut_modifiers_ctrl").checked
      = event.ctrlKey;
      document.getElementById ("savemht_shortcut_modifiers_meta").checked
      = event.metaKey;
      document.getElementById ("savemht_shortcut_modifiers_shift").checked
      = event.shiftKey;
    }
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * メル欄のキー変更イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onMailboxSageButtonKeyDown : function (event) {
    var keycode = "";
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_.+)$/)) {
        var code = RegExp.$1;
        if (event.keyCode
            == Components.interfaces.nsIDOMKeyEvent [attribute]) {
          keycode = code;
        }
      }
    }
        
    if (keycode != "") {
      document.getElementById ("mailbox_sagebutton_key_keycode").value
      = keycode;
      AkahukuOptions.selectItem (document.getElementById
                                 ("mailbox_sagebutton_key_keycode"));
            
      document.getElementById ("mailbox_sagebutton_key_modifiers_alt").checked
      = event.altKey;
      document.getElementById ("mailbox_sagebutton_key_modifiers_ctrl").checked
      = event.ctrlKey;
      document.getElementById ("mailbox_sagebutton_key_modifiers_meta").checked
      = event.metaKey;
      document.getElementById ("mailbox_sagebutton_key_modifiers_shift").checked
      = event.shiftKey;
    }
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * コメント欄のキー変更イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onCommentboxShortcutKeyDown : function (event) {
    var keycode = "";
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_.+)$/)) {
        var code = RegExp.$1;
        if (event.keyCode
            == Components.interfaces.nsIDOMKeyEvent [attribute]) {
          keycode = code;
        }
      }
    }
        
    if (keycode != "") {
      document.getElementById ("commentbox_shortcut_keycode").value
      = keycode;
      AkahukuOptions.selectItem (document.getElementById
                                 ("commentbox_shortcut_keycode"));
            
      document.getElementById ("commentbox_shortcut_modifiers_alt").checked
      = event.altKey;
      document.getElementById ("commentbox_shortcut_modifiers_ctrl").checked
      = event.ctrlKey;
      document.getElementById ("commentbox_shortcut_modifiers_meta").checked
      = event.metaKey;
      document.getElementById ("commentbox_shortcut_modifiers_shift").checked
      = event.shiftKey;
    }
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * ブルマ女将のキー変更イベント
   *
   * @param  Event event
   *         対象のイベント
   */
  onBloomerKeyDown : function (event) {
    var keycode = "";
    for (var attribute in Components.interfaces.nsIDOMKeyEvent) {
      if (attribute.match (/^DOM_(VK_.+)$/)) {
        var code = RegExp.$1;
        if (event.keyCode
            == Components.interfaces.nsIDOMKeyEvent [attribute]) {
          keycode = code;
        }
      }
    }
        
    if (keycode != "") {
      document.getElementById ("bloomer_keycode").value = keycode;
      AkahukuOptions.selectItem (document
                                 .getElementById ("bloomer_keycode"));
            
      document.getElementById ("bloomer_modifiers_alt").checked
      = event.altKey;
      document.getElementById ("bloomer_modifiers_ctrl").checked
      = event.ctrlKey;
      document.getElementById ("bloomer_modifiers_meta").checked
      = event.metaKey;
      document.getElementById ("bloomer_modifiers_shift").checked
      = event.shiftKey;
    }
        
    event.preventDefault ();
    event.stopPropagation ();
  },
    
  /**
   * 動作する板を追加するボタンのイベント
   * 
   * @param  String type
   *         リストの種類
   *           "" ： 動作する板
   *           "sidebar_" ： サイドバーに表示する板
   */
  onBoardSelectAdd : function (type) {
    var listbox_ex
    = document.getElementById (type + "board_select_ex_list");
    var listbox_in
    = document.getElementById (type + "board_select_in_list");
        
    var node = listbox_ex.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeName == "listitem") {
        if (node.selected) {
          listbox_ex.removeChild (node);
          listbox_in.appendChild (node);
        }
      }
      node = nextNode;
    }
  },
    
  /**
   * 動作する板を削除するボタンのイベント
   * 
   * @param  String type
   *         リストの種類
   *           "" ： 動作する板
   *           "sidebar_" ： サイドバーに表示する板
   */
  onBoardSelectDelete : function (type) {
    var listbox_ex
    = document.getElementById (type + "board_select_ex_list");
    var listbox_in
    = document.getElementById (type + "board_select_in_list");
        
    var node = listbox_in.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeName == "listitem") {
        if (node.selected) {
          listbox_in.removeChild (node);
          listbox_ex.appendChild (node);
        }
      }
      node = nextNode;
    }
  },
  
  initFilenameConvert : function () {
    AkahukuOptions.ListManager.clear ("filename_convert");
    
    var list = arAkahukuFileName.defaultConvertList;
    for (var i = 0; i < list.length; i ++) {
      var value = {};
      
      value.from = list [i][0];
      value.to = list [i][1];
      
      AkahukuOptions.ListManager.addItem
        ("filename_convert", value, null);
    }
  },
    
  /* 親のチェックボックスの状態で子の操作不可を設定する - ここから - */
    
  checkTitle : function () {
    document.getElementById ("title_type").disabled
    = document.getElementById ("title_comment").disabled
    = document.getElementById ("title_mode").disabled
    = document.getElementById ("title_thread_info").disabled
    = document.getElementById ("title_format").disabled
    = !document.getElementById ("title").checked;
        
    AkahukuOptions.checkTitleType ();
  },
    
  checkTitleType : function () {
    if (document.getElementById ("title_type").value == "simple") {
      document.getElementById ("title_type_deck").selectedPanel
      = document.getElementById ("title_type_deck_simple");
      
      document.getElementById ("title_format_init").disabled = true;
    }
    else {
      document.getElementById ("title_type_deck").selectedPanel
      = document.getElementById ("title_type_deck_expert");
            
      document.getElementById ("title_format_init").disabled
      = !document.getElementById ("title").checked;
    }
  },
    
  checkScrollLock : function () {
    document.getElementById ("scroll_lock_reply").disabled
    = !document.getElementById ("scroll_lock").checked;
  },
    
  checkScrollGoCurrent : function () {
    document.getElementById ("scroll_gocurrent_rule").disabled
    = !document.getElementById ("scroll_gocurrent_reload").checked;
        
    AkahukuOptions.checkScrollGoCurrentRule ();
  },
    
  checkScrollGoCurrentRule : function () {
    document.getElementById ("scroll_gocurrent_rule_zeroheight").disabled
    = document.getElementById ("scroll_gocurrent_rule_random").disabled
    = !document.getElementById ("scroll_gocurrent_reload").checked
    || !document.getElementById ("scroll_gocurrent_rule").checked;
  },
    
  checkDelbanner : function () {
    document.getElementById ("delbanner_image").disabled
    = document.getElementById ("delbanner_image_404").disabled
    = document.getElementById ("delbanner_flash").disabled
    = document.getElementById ("delbanner_contentpolicy_group_label").disabled
    = document.getElementById ("delbanner_text").disabled
    = document.getElementById ("delbanner_movetailad").disabled
    = !document.getElementById ("delbanner").checked;
    
    AkahukuOptions.checkDelbannerImage ();
    AkahukuOptions.checkDelbannerFlash ();
    AkahukuOptions.checkDelbannerTailAd ();
  },
    
  checkDelbannerImage : function () {
    document.getElementById ("delbanner_sites_image").disabled
    = document.getElementById ("delbanner_sites_iframe").disabled
    = document.getElementById ("delbanner_sites_image_label").disabled
    = document.getElementById ("delbanner_sites_iframe_label").disabled
    = ((!document.getElementById ("delbanner_image_404").checked
        || document.getElementById ("delbanner_image_404").disabled)
       && (!document.getElementById ("delbanner_image").checked
           || document.getElementById ("delbanner_image").disabled));
  },
    
  checkDelbannerFlash : function () {
    document.getElementById ("delbanner_sites_object").disabled
    = document.getElementById ("delbanner_sites_object_label").disabled
    = !document.getElementById ("delbanner_flash").checked
      || document.getElementById ("delbanner_flash").disabled;
  },
    
  checkDelbannerTailAd : function () {
    document.getElementById ("delbanner_movetailad_all").disabled
    = !document.getElementById ("delbanner_movetailad").checked
      || document.getElementById ("delbanner_movetailad").disabled;
  },
    
  checkWheelReload : function () {
    document.getElementById ("wheel_reload_threshold").disabled
    = document.getElementById ("wheel_reload_0").disabled
    = document.getElementById ("wheel_reload_1").disabled
    = document.getElementById ("wheel_reload_reply").disabled
    = document.getElementById ("wheel_reload_reply_sync").disabled
    = document.getElementById ("wheel_reload_catalog").disabled
    = document.getElementById ("wheel_reload_all").disabled
    = document.getElementById ("wheel_reload_loop").disabled
    = !document.getElementById ("wheel_reload").checked;

    AkahukuOptions.checkWheelReloadCatalog ();
  },

  checkWheelReloadCatalog : function () {
    document.getElementById ("wheel_reload_catalog_up").disabled
    = !document.getElementById ("wheel_reload_catalog").checked
      || document.getElementById ("wheel_reload_catalog").disabled;
  },
    
  checkTabSort : function () {
    document.getElementById ("tab_sort_thread").disabled
    = document.getElementById ("tab_sort_all").disabled
    = !document.getElementById ("tab_sort").checked;
        
    AkahukuOptions.checkTabSortChild ();
  },
    
  checkTabSortChild : function () {
    document.getElementById ("tab_sort_invert_thread").disabled
    = document.getElementById ("tab_sort_order_1").disabled
    = document.getElementById ("tab_sort_order_1_label").disabled
    = document.getElementById ("tab_sort_order_2").disabled
    = document.getElementById ("tab_sort_order_2_label").disabled
    = document.getElementById ("tab_sort_order_3").disabled
    = document.getElementById ("tab_sort_order_3_label").disabled
    = document.getElementById ("tab_sort_order_4").disabled
    = document.getElementById ("tab_sort_order_4_label").disabled
    = document.getElementById ("tab_sort_board_order_list").disabled
    = document.getElementById ("tab_sort_board_order_label").disabled
    = document.getElementById ("tab_sort_board_order_moveup").disabled
    = document.getElementById ("tab_sort_board_order_movedown").disabled
    = (!document.getElementById ("tab_sort_thread").checked
       && !document.getElementById ("tab_sort_all").checked)
    || !document.getElementById ("tab_sort").checked;
  },
    
  checkQuickQuote : function () {
    document.getElementById ("quickquote_menu").disabled
    = document.getElementById ("quickquote_number").disabled
    = document.getElementById ("quickquote_clear").disabled
    = document.getElementById ("quickquote_focus").disabled
    = !document.getElementById ("quickquote").checked;
        
    AkahukuOptions.checkQuickQuoteMenu ();
    AkahukuOptions.checkQuickQuoteNumber ();
  },
    
  checkQuickQuoteMenu : function () {
    document.getElementById ("quickquote_menu_separator").disabled
    = document.getElementById ("quickquote_menu_quote").disabled
    = document.getElementById ("quickquote_menu_mail").disabled
    = document.getElementById ("quickquote_menu_name").disabled
    = document.getElementById ("quickquote_menu_comment").disabled
    = document.getElementById ("quickquote_menu_copy").disabled
    = document.getElementById ("quickquote_menu_cont").disabled
    = document.getElementById ("quickquote_menu_google_image").disabled
    = document.getElementById ("quickquote_menu_wikipedia").disabled
        
    = !document.getElementById ("quickquote").checked
    || !document.getElementById ("quickquote_menu").checked;
  },
    
  checkQuickQuoteNumber : function () {
    document.getElementById ("quickquote_number_type").disabled
    = document.getElementById ("quickquote_number_clear").disabled
    = document.getElementById ("quickquote_number_nocomment").disabled
    = !document.getElementById ("quickquote").checked
    || !document.getElementById ("quickquote_number").checked;
  },
    
  checkJPEGThumbnail : function () {
    document.getElementById ("jpeg_thumbnail_error").disabled
    = !document.getElementById ("jpeg_thumbnail").checked;
  },
    
  checkSaveMHT : function () {
    document.getElementById ("savemht_base_label").disabled
    = document.getElementById ("savemht_base").disabled
    = document.getElementById ("savemht_base_select").disabled
        
    = document.getElementById ("savemht_default_label").disabled
    = document.getElementById ("savemht_default_type").disabled
        
    = document.getElementById ("savemht_auto").disabled
        
    = document.getElementById ("savemht_imagelink").disabled
    = document.getElementById ("savemht_preview").disabled
    = document.getElementById ("savemht_aima_hide_entire_res").disabled
    = document.getElementById ("savemht_aima_show_res").disabled
    = document.getElementById ("savemht_close_nocachelist").disabled
    = document.getElementById ("savemht_usenetwork").disabled
        
    = document.getElementById ("savemht_nolimit").disabled
    = document.getElementById ("savemht_nolimit_time").disabled
    = document.getElementById ("savemht_nolimit_label").disabled
        
    = document.getElementById ("savemht_use8bit").disabled
    = document.getElementById ("savemht_shortcut").disabled
    = !document.getElementById ("savemht").checked;
        
    AkahukuOptions.checkSaveMHTDefaultType ();
    AkahukuOptions.checkSaveMHTAuto ();
    AkahukuOptions.checkSaveMHTImagelink ();
    AkahukuOptions.checkSaveMHTPreview ();
    AkahukuOptions.checkSaveMHTShortcut ();
  },
    
  checkSaveMHTDefaultType : function () {
    if (document.getElementById ("savemht_default_type").value
        == "simple") {
      document.getElementById ("savemht_default_type_deck").selectedPanel
      = document.getElementById ("savemht_default_type_deck_simple");
      document.getElementById ("savemht_default_format_init").disabled
      = true;
    }
    else {
      document.getElementById ("savemht_default_type_deck").selectedPanel
      = document.getElementById ("savemht_default_type_deck_expert");
      document.getElementById ("savemht_default_format_init").disabled
      = !document.getElementById ("savemht").checked;
    }
  },
    
  checkSaveMHTAuto : function () {
    document.getElementById ("savemht_auto_unique").disabled
    = document.getElementById ("savemht_auto_saveas").disabled
    = !document.getElementById ("savemht").checked
    || !document.getElementById ("savemht_auto").checked;
  },
    
  checkSaveMHTImagelink : function () {
    document.getElementById ("savemht_imagelink_thread").disabled
    = document.getElementById ("savemht_imagelink_perthread").disabled
    = !document.getElementById ("savemht").checked
    || !document.getElementById ("savemht_imagelink").checked;
  },
    
  checkSaveMHTPreview : function () {
    document.getElementById ("savemht_preview_count").disabled
    = !document.getElementById ("savemht").checked
    || !document.getElementById ("savemht_preview").checked;
  },
    
  checkSaveMHTShortcut : function () {
    document.getElementById ("savemht_shortcut_input").disabled
    = document.getElementById ("savemht_shortcut_keycode").disabled
    = document.getElementById ("savemht_shortcut_keycode_menu").disabled
    = document.getElementById ("savemht_shortcut_modifiers_alt").disabled
    = document.getElementById ("savemht_shortcut_modifiers_ctrl").disabled
    = document.getElementById ("savemht_shortcut_modifiers_meta").disabled
    = document.getElementById ("savemht_shortcut_modifiers_shift").disabled
    = !document.getElementById ("savemht").checked
    || !document.getElementById ("savemht_shortcut").checked;
  },
    
  checkSaveMHTAima : function (id) {
    if (id == "savemht_aima_show_res") {
      document.getElementById ("savemht_aima_hide_entire_res").checked
      = false;
    }
    else if (id == "savemht_aima_hide_entire_res") {
      document.getElementById ("savemht_aima_show_res").checked
      = false;
    }
  },
  
  checkSaveImage : function () {
    document.getElementById ("saveimage_autolink_preview").disabled
    = document.getElementById ("saveimage_linkmenu").disabled
    
    = document.getElementById ("saveimage_limit").disabled
    = document.getElementById ("saveimage_limit_label").disabled
    = document.getElementById ("saveimage_limit_width").disabled
    = document.getElementById ("saveimage_limit_height").disabled
        
    = document.getElementById ("saveimage_buttonsize").disabled
    = document.getElementById ("saveimage_buttonsize_label").disabled

    = document.getElementById ("saveimage_buttons").disabled
        
    = !document.getElementById ("saveimage").checked;
  },
  
  checkSaveImageBaseSubdir : function () {
    if (document.getElementById ("saveimage_base_subdir").value == "simple") {
      document.getElementById ("saveimage_base_subdir_deck").selectedPanel
      = document.getElementById ("saveimage_base_subdir_deck_simple");
    }
    else {
      document.getElementById ("saveimage_base_subdir_deck").selectedPanel
      = document.getElementById ("saveimage_base_subdir_deck_expert");
    }
  },
  
  checkSaveImageBaseDialog : function () {
    document.getElementById ("saveimage_base_dialog_keep").disabled
    = !document.getElementById ("saveimage_base_dialog").checked;

    document.getElementById ("saveimage_base_subdir").disabled
    = document.getElementById ("saveimage_base_subdir_url").disabled
    = document.getElementById ("saveimage_base_subdir_board").disabled
    = document.getElementById ("saveimage_base_subdir_server").disabled
    = document.getElementById ("saveimage_base_subdir_dir").disabled
    = document.getElementById ("saveimage_base_subdir_thread").disabled
    = document.getElementById ("saveimage_base_subdir_msg8b").disabled
    = document.getElementById ("saveimage_base_subdir_format").disabled
    = document.getElementById ("saveimage_base_dialog").checked;
  },
    
  checkSaveImageInstantSrc : function () {
    document.getElementById ("saveimage_instantsrc_always").disabled
    = !document.getElementById ("saveimage_instantsrc").checked;
  },
    
  checkSageButton : function () {
    document.getElementById ("mailbox_sagebutton_key").disabled
    = !document.getElementById ("mailbox_sagebutton").checked;
        
    AkahukuOptions.checkSageButtonKey ();
  },

  checkSageButtonKey : function () {
    document.getElementById ("mailbox_sagebutton_key_input").disabled
    = document.getElementById ("mailbox_sagebutton_key_keycode").disabled
    = document.getElementById ("mailbox_sagebutton_key_modifiers_alt").disabled
    = document.getElementById ("mailbox_sagebutton_key_modifiers_ctrl").disabled
    = document.getElementById ("mailbox_sagebutton_key_modifiers_meta").disabled
    = document.getElementById ("mailbox_sagebutton_key_modifiers_shift").disabled
    = !document.getElementById ("mailbox_sagebutton_key").checked
    || !document.getElementById ("mailbox_sagebutton").checked;
  },
    
  checkCommentboxStatus : function () {
    document.getElementById ("commentbox_status_bytes").disabled
    = document.getElementById ("commentbox_status_limit").disabled
    = document.getElementById ("commentbox_status_size").disabled
    = !document.getElementById ("commentbox_status").checked;
  },
    
  checkCommentboxBG : function () {
    document.getElementById ("commentbox_bg_frame").disabled
    = !document.getElementById ("commentbox_bg").checked;
  },
    
  checkCommentboxShortcut : function () {
    document.getElementById ("commentbox_shortcut_input").disabled
    = document.getElementById ("commentbox_shortcut_keycode").disabled
    = document.getElementById ("commentbox_shortcut_keycode_menu").disabled
    = document.getElementById ("commentbox_shortcut_modifiers_alt").disabled
    = document.getElementById ("commentbox_shortcut_modifiers_ctrl").disabled
    = document.getElementById ("commentbox_shortcut_modifiers_meta").disabled
    = document.getElementById ("commentbox_shortcut_modifiers_shift").disabled
    = !document.getElementById ("commentbox_shortcut").checked;
  },
    
  checkFormCompatibility : function () {
    if (arAkahukuCompat.comparePlatformVersion ("1.9.1b1") < 0) {
      document.getElementById ("postform_save_attachment").disabled = false;
    }
  },

  checkFloatPostForm : function () {
    if (document.getElementById ("floatpostform").checked) {
      document.getElementById ("postform_bottom").checked = false;
      AkahukuOptions.checkPostFormBottom ();
    }
        
    document.getElementById ("floatpostform_hidebutton").disabled
    = document.getElementById ("floatpostform_minimize").disabled
    = document.getElementById ("floatpostform_alpha").disabled
    = document.getElementById ("floatpostform_clickopen").disabled
        
    = document.getElementById ("floatpostform_position").disabled
    = document.getElementById ("floatpostform_position_x").disabled
    = document.getElementById ("floatpostform_position_y").disabled
        
    = document.getElementById ("floatpostform_position_label").disabled
    = document.getElementById ("floatpostform_position_x_label1").disabled
    = document.getElementById ("floatpostform_position_x_label2").disabled
    = document.getElementById ("floatpostform_position_y_label1").disabled
    = document.getElementById ("floatpostform_position_y_label2").disabled
        
    = document.getElementById ("floatpostform_width").disabled
    = document.getElementById ("floatpostform_width_label").disabled
    = !document.getElementById ("floatpostform").checked;
        
    AkahukuOptions.checkClickOpen ();
  },
    
  checkPostFormPreview : function () {
    document.getElementById ("postform_preview_size").disabled
    = document.getElementById ("postform_preview_size_label").disabled
    = document.getElementById ("postform_preview_size_label2").disabled
    = !document.getElementById ("postform_preview").checked;
  },
    
  checkPostFormBottom : function () {
    if (document.getElementById ("postform_bottom").checked) {
      document.getElementById ("floatpostform").checked = false;
      AkahukuOptions.checkFloatPostForm ();
    }
    document.getElementById ("postform_bottom_formonly").disabled
    = !document.getElementById ("postform_bottom").checked
    AkahukuOptions.checkPostFormBottomFormOnly ();
  },
    
  checkPostFormBottomFormOnly : function () {
    var formonly
    = document.getElementById ("postform_bottom_formonly");
    document.getElementById ("postform_normal_hide").disabled
    = document.getElementById ("postform_reply_hide").disabled
    = document.getElementById ("postform_reply_sendclose").disabled
    = (formonly.checked && !formonly.disabled);
  },
    
  checkClickOpen : function () {
    document.getElementById ("floatpostform_clickclose").disabled
    = !document.getElementById ("floatpostform").checked
    || !document.getElementById ("floatpostform_clickopen").checked;
  },
    
  checkReload : function () {
    document.getElementById ("reload_rule").disabled
    = document.getElementById ("reload_reply").disabled
    = document.getElementById ("reload_reply_scroll").disabled
    = document.getElementById ("reload_hook").disabled
    = document.getElementById ("reload_status_random").disabled
    = document.getElementById ("reload_status_hold").disabled
    = document.getElementById ("reload_timestamp").disabled
    = document.getElementById ("reload_nolimit").disabled
    = document.getElementById ("reload_nolimit_time").disabled
    = document.getElementById ("reload_nolimit_label").disabled
    = document.getElementById ("reload_status_no_count").disabled
    = document.getElementById ("reload_extcache").disabled
    = document.getElementById ("reload_extcache_images").disabled
    = !document.getElementById ("reload").checked;
        
    AkahukuOptions.checkReloadRangeSyncButton ();
    AkahukuOptions.checkReloadRule ();
    AkahukuOptions.checkReloadHook ();
    AkahukuOptions.checkReloadExtCache ();
  },
    
  checkReloadExtCache : function () {
    document.getElementById ("reload_extcache_file").disabled
    = !document.getElementById ("reload").checked
    || !document.getElementById ("reload_extcache").checked;
        
    AkahukuOptions.checkReloadExtCacheFile ();
  },

  checkReloadExtCacheFile : function () {
    document.getElementById ("reload_extcache_file_base").disabled
    = document.getElementById ("reload_extcache_file_base_select").disabled
    = !document.getElementById ("reload").checked
    || !document.getElementById ("reload_extcache").checked
    || !document.getElementById ("reload_extcache_file").checked;
  },
    
  checkReloadRangeSyncButton : function () {
    document.getElementById ("reload_range_syncbutton").disabled
    = !document.getElementById ("reload").checked;
    document.getElementById ("reload_range_syncbutton_nodelete").disabled
    = document.getElementById ("reload_range_syncbutton_id").disabled
    = !document.getElementById ("reload").checked
    || !document.getElementById ("reload_range_syncbutton").checked;
  },
    
  checkReloadRule : function () {
    document.getElementById ("reload_rule_zeroheight").disabled
    = document.getElementById ("reload_rule_random").disabled
    = !document.getElementById ("reload").checked
    || !document.getElementById ("reload_rule").checked;
  },
    
  checkReloadHook : function () {
    document.getElementById ("reload_hook_sync").disabled
    = !document.getElementById ("reload").checked
    || !document.getElementById ("reload_hook").checked;
  },
    
  checkPartial : function () {
    document.getElementById ("reload_partial_count").disabled
    = document.getElementById ("reload_partial_up").disabled
    = document.getElementById ("reload_partial_up_label").disabled
    = document.getElementById ("reload_partial_up_label2").disabled
    = !document.getElementById ("reload_partial_on").checked;
  },
    
  checkTabIcon : function () {
    document.getElementById ("tabicon_size").disabled
    = document.getElementById ("tabicon_asfavicon").disabled
    = !document.getElementById ("tabicon").checked;
        
    AkahukuOptions.checkTabIconSize ();
  },
    
  checkTabIconSize : function () {
    document.getElementById ("tabicon_size_max").disabled
    = document.getElementById ("tabicon_size_max_label").disabled
    = !document.getElementById ("tabicon").checked
    || !document.getElementById ("tabicon_size").checked;
  },
    
  checkThreadOperator : function () {
    document.getElementById ("thread_operator_clickopen").disabled
    = document.getElementById ("thread_operator_threadtime").disabled
    = document.getElementById ("thread_operator_expire_diff").disabled
    = document.getElementById ("thread_operator_thumbnail").disabled
    = document.getElementById ("thread_operator_position_x").disabled
    = document.getElementById ("thread_operator_position_y").disabled
        
    = document.getElementById ("thread_operator_position_label").disabled
    = document.getElementById ("thread_operator_position_x_label1").disabled
    = document.getElementById ("thread_operator_position_x_label2").disabled
    = document.getElementById ("thread_operator_position_y_label1").disabled
    = document.getElementById ("thread_operator_position_y_label2").disabled
        
    = document.getElementById ("thread_operator_show_label").disabled
    = document.getElementById ("thread_operator_show_move").disabled
    = document.getElementById ("thread_operator_show_thumbnail").disabled
    = document.getElementById ("thread_operator_show_reload").disabled
    = document.getElementById ("thread_operator_show_savemht").disabled
        
    = !document.getElementById ("thread_operator").checked;
        
    AkahukuOptions.checkThreadOperatorClickOpen ();
    AkahukuOptions.checkThreadOperatorThumbnail ();
  },
    
  checkThreadOperatorClickOpen : function () {
    document.getElementById ("thread_operator_clickclose").disabled
    = document.getElementById ("thread_operator_hide").disabled
    = !document.getElementById ("thread_operator_clickopen").checked
    || !document.getElementById ("thread_operator").checked;
        
    AkahukuOptions.checkThreadOperatorThumbnailSize ();
  },
    
  checkThreadOperatorThumbnail : function () {
    document.getElementById ("thread_operator_thumbnail_only").disabled
    = document.getElementById ("thread_operator_thumbnail_alpha").disabled
    = document.getElementById ("thread_operator_thumbnail_roll").disabled
    = document.getElementById ("thread_operator_thumbnail_size").disabled
    = document.getElementById ("thread_operator_thumbnail_size_label").disabled
    = !document.getElementById ("thread_operator_thumbnail").checked
    || !document.getElementById ("thread_operator").checked;
        
    AkahukuOptions.checkThreadOperatorThumbnailSize ();
  },
    
  checkThreadOperatorThumbnailSize : function () {
    document.getElementById ("thread_operator_thumbnail_size_zoom").disabled
    = !document.getElementById ("thread_operator_thumbnail").checked
    || !document.getElementById ("thread_operator").checked
    || (document.getElementById ("thread_operator_thumbnail_size").value
        == "0");
  },
    
  checkNumbering : function () {
    document.getElementById ("thread_numbering_max").disabled
    = document.getElementById ("thread_numbering_max_label").disabled
    = !document.getElementById ("thread_numbering").checked;
  },

  checkThreadBottomStatus : function () {
    document.getElementById ("thread_bottom_status_diff").disabled
    = document.getElementById ("thread_bottom_status_hidden").disabled
    = document.getElementById ("thread_bottom_status_num").disabled
    = !document.getElementById ("thread_bottom_status").checked;
        
    AkahukuOptions.checkThreadBottomStatusNum ();
  },

  checkThreadBottomStatusNum : function () {
    document.getElementById ("thread_bottom_status_num_random").disabled
    = document.getElementById ("thread_bottom_status_num_short").disabled
    //= document.getElementById ("thread_bottom_status_num_entire").disabled
    = !document.getElementById ("thread_bottom_status_num").checked
    || !document.getElementById ("thread_bottom_status").checked;
  },
    
  checkCuteFont : function () {
    document.getElementById ("cutefont_family_example").disabled
    = document.getElementById ("cutefont_family").disabled
    = document.getElementById ("cutefont_family_init").disabled
    = !document.getElementById ("cutefont").checked;
  },
    
  checkStyleIgnoreDefault : function () {
    document.getElementById ("style_ignore_default_font").disabled
    document.getElementById ("style_ignore_default_font").disabled
    document.getElementById ("style_ignore_default_font").disabled
    = !document.getElementById ("style_ignore_default").checked;
        
    AkahukuOptions.checkStyleIgnoreDefaultFont ();
  },
    
  checkStyleIgnoreDefaultFont : function () {
    document.getElementById ("style_ignore_default_font_size").disabled
    = document.getElementById ("style_ignore_default_font_size_label")
    .disabled
    = !document.getElementById ("style_ignore_default").checked
    || !document.getElementById ("style_ignore_default_font").checked;
  },
    
  checkHidetrolls : function () {
    document.getElementById ("hidetrolls_mode").disabled
    = document.getElementById ("hidetrolls_user").disabled
    = document.getElementById ("hidetrolls_red").disabled
    = document.getElementById ("hidetrolls_red_color").disabled
    = document.getElementById ("hidetrolls_red_color_label").disabled
    = document.getElementById ("hidetrolls_red_color_quote").disabled
    = document.getElementById ("hidetrolls_red_color_quote_label").disabled
    = document.getElementById ("hidetrolls_random").disabled
    = document.getElementById ("hidetrolls_random_label").disabled
    = document.getElementById ("hidetrolls_nocat").disabled
    = !document.getElementById ("hidetrolls").checked;
  },
    
  checkPopupQuote : function () {
    document.getElementById ("popupquote_delay").disabled
    = document.getElementById ("popupquote_clickhide").disabled
    = document.getElementById ("popupquote_image").disabled
    = document.getElementById ("popupquote_delay_label1").disabled
    = document.getElementById ("popupquote_delay_label2").disabled
    = document.getElementById ("popupquote_nearest").disabled
    = document.getElementById ("popupquote_bottomup").disabled
    = document.getElementById ("popupquote_matchbol").disabled
    = !document.getElementById ("popupquote").checked;
        
    AkahukuOptions.checkPopupQuoteImage ();
  },
    
  checkPopupQuoteImage : function () {
    document.getElementById ("popupquote_image_size").disabled
    = !document.getElementById ("popupquote").checked
    || !document.getElementById ("popupquote_image").checked;
    document.getElementById ("popupquote_image_preview").disabled
    = !document.getElementById ("popupquote").checked
    || !document.getElementById ("popupquote_image").checked;
        
    AkahukuOptions.checkPopupQuoteImagePreview ();
  },
    
  checkPopupQuoteImagePreview : function () {
    document.getElementById ("popupquote_image_preview_all").disabled
    = !document.getElementById ("popupquote").checked
    || !document.getElementById ("popupquote_image").checked
    || !document.getElementById ("popupquote_image_preview").checked;
  },
    
  checkAutoLink : function () {
    document.getElementById ("autolink_focus").disabled
    = document.getElementById ("autolink_user").disabled
    = document.getElementById ("autolink_as").disabled
    = document.getElementById ("autolink_subject_name").disabled
    = document.getElementById ("autolink_preview").disabled
    = !document.getElementById ("autolink").checked;
        
    AkahukuOptions.checkAutoLinkPreview ();
    AkahukuOptions.checkAutoLinkUser ();
  },
    
  checkAutoLinkPreview : function () {
    document.getElementById ("autolink_preview_multi").disabled
    = document.getElementById ("autolink_preview_autoopen").disabled
    = document.getElementById ("autolink_preview_autoopen_noquote").disabled
    = document.getElementById ("autolink_preview_swf_label").disabled
    = document.getElementById ("autolink_preview_swf_label2").disabled
    = document.getElementById ("autolink_preview_swf_label3").disabled
    = document.getElementById ("autolink_preview_swf_width").disabled
    = document.getElementById ("autolink_preview_swf_height").disabled
    = !document.getElementById ("autolink").checked
    || !document.getElementById ("autolink_preview").checked;
  },
    
  checkAutoLinkUser : function () {
    document.getElementById ("autolink_user_label").disabled
    = document.getElementById ("autolink_user_pattern_label").disabled
    = document.getElementById ("autolink_user_pattern").disabled
    = document.getElementById ("autolink_user_regexp").disabled
    = document.getElementById ("autolink_user_url_label").disabled
    = document.getElementById ("autolink_user_url").disabled
    = document.getElementById ("autolink_user_list").disabled
    = document.getElementById ("autolink_user_add").disabled
    = document.getElementById ("autolink_user_moveup").disabled
    = document.getElementById ("autolink_user_movedown").disabled
    = document.getElementById ("autolink_user_delete").disabled
    = !document.getElementById ("autolink").checked
    || !document.getElementById ("autolink_user").checked;
        
    document.getElementById ("autolink_user_modify").disabled
    = !document.getElementById ("autolink").checked
    || !document.getElementById ("autolink_user").checked
    || (document.getElementById ("autolink_user_list").selectedCount > 1);
  },
    
  checkP2P : function () {
    document.getElementById ("p2p_address_label").disabled
        
    = document.getElementById ("p2p_connection_type").disabled
        
    = document.getElementById ("p2p_cache_check_interval_label").disabled
    = document.getElementById ("p2p_cache_check_interval").disabled
    = document.getElementById ("p2p_cache_check_interval_label2").disabled
    = document.getElementById ("p2p_cache_check_interval_label3").disabled

    = document.getElementById ("p2p_cache_limit_label").disabled
    = document.getElementById ("p2p_cache_limit_label2").disabled
        
    = document.getElementById ("p2p_cache_src_limit_label").disabled
    = document.getElementById ("p2p_cache_src_limit").disabled
    = document.getElementById ("p2p_cache_src_limit_label2").disabled

    = document.getElementById ("p2p_cache_thumb_limit_label").disabled
    = document.getElementById ("p2p_cache_thumb_limit").disabled
    = document.getElementById ("p2p_cache_thumb_limit_label2").disabled

    = document.getElementById ("p2p_cache_cat_limit_label").disabled
    = document.getElementById ("p2p_cache_cat_limit").disabled
    = document.getElementById ("p2p_cache_cat_limit_label2").disabled
        
    = document.getElementById ("p2p_cache_base_label").disabled
    = document.getElementById ("p2p_cache_base").disabled
    = document.getElementById ("p2p_cache_base_select").disabled
        
    = document.getElementById ("p2p_treat_as_same").disabled
        
    = document.getElementById ("p2p_statusbar").disabled

    = document.getElementById ("p2p_nocat").disabled
        
    = document.getElementById ("p2p_prefetch_src").disabled
        
    = document.getElementById ("savemht_usep2p").disabled
    = document.getElementById ("savemht_usep2p_label").disabled
        
    = document.getElementById ("p2p_tatelog").disabled
        
    = document.getElementById ("p2p_transfer_limit_label").disabled
    = document.getElementById ("p2p_transfer_limit").disabled
    = document.getElementById ("p2p_transfer_limit_label2").disabled
        
    = document.getElementById ("p2p_accept_slot_label").disabled
    = document.getElementById ("p2p_accept_slot").disabled
        
    = !document.getElementById ("p2p").checked;
    AkahukuOptions.checkP2PConnectionType ();
    AkahukuOptions.checkP2PSidebarShortcut ();
  },
    
  checkP2PConnectionType : function () {
    document.getElementById ("p2p_address_type").disabled
        
    = document.getElementById ("p2p_port_label").disabled
    = document.getElementById ("p2p_port").disabled
    = document.getElementById ("p2p_port_init").disabled
        
    = (document.getElementById ("p2p_connection_type").value == "noaccept")
    || !document.getElementById ("p2p").checked;
        
    AkahukuOptions.checkP2PAddressType ();
  },
        
  checkP2PAddressType : function () {
    document.getElementById ("p2p_address").disabled
        
    = (document.getElementById ("p2p_address_type").value != "static")
    || (document.getElementById ("p2p_connection_type").value == "noaccept")
    || !document.getElementById ("p2p").checked;
        
    AkahukuOptions.changeAddress ("p2p_address");
  },
    
  checkP2PSidebarShortcut : function () {
    document.getElementById ("p2p_sidebar_shortcut_input").disabled
    = document.getElementById ("p2p_sidebar_shortcut_keycode").disabled
    = document.getElementById ("p2p_sidebar_shortcut_keycode_menu").disabled
    = document.getElementById ("p2p_sidebar_shortcut_modifiers_alt").disabled
    = document.getElementById ("p2p_sidebar_shortcut_modifiers_ctrl").disabled
    = document.getElementById ("p2p_sidebar_shortcut_modifiers_meta").disabled
    = document.getElementById ("p2p_sidebar_shortcut_modifiers_shift").disabled
    = !document.getElementById ("p2p").checked
    || !document.getElementById ("p2p_sidebar_shortcut").checked;
  },
    
  checkCatalogReorder : function () {
    document.getElementById ("catalog_reorder_save").disabled
    = document.getElementById ("catalog_reorder_width").disabled
    = document.getElementById ("catalog_reorder_width_label").disabled
    = document.getElementById ("catalog_reorder_width_label2").disabled
    = document.getElementById ("catalog_reorder_visited").disabled
    = document.getElementById ("catalog_reorder_new").disabled
    = document.getElementById ("catalog_reorder_fill").disabled
    = document.getElementById ("catalog_reorder_misc_group_label").disabled
    = document.getElementById ("catalog_reorder_misc_label").disabled
    = document.getElementById ("catalog_reorder_info").disabled
    = document.getElementById ("catalog_reorder_info_label").disabled
    = !document.getElementById ("catalog_reorder").checked;
        
    AkahukuOptions.checkCatalogReorderSave ();
  },
    
  checkCatalogReorderSave : function () {
    document.getElementById ("catalog_reorder_save_type").disabled
    = !document.getElementById ("catalog_reorder").checked
    || !document.getElementById ("catalog_reorder_save").checked
  },
    
  checkCatalogZoom : function () {
    document.getElementById ("catalog_zoom_click").disabled
    = document.getElementById ("catalog_zoom_noanim").disabled
    = document.getElementById ("catalog_zoom_delay").disabled
    = document.getElementById ("catalog_zoom_delay_label1").disabled
    = document.getElementById ("catalog_zoom_delay_label2").disabled
    = document.getElementById ("catalog_zoom_size").disabled
    = document.getElementById ("catalog_zoom_size_label1").disabled
    = document.getElementById ("catalog_zoom_size_label2").disabled
    = document.getElementById ("catalog_zoom_sizetype").disabled
    = document.getElementById ("catalog_zoom_cache_count").disabled
    = document.getElementById ("catalog_zoom_cache_count_label1").disabled
    = document.getElementById ("catalog_zoom_cache_count_label2").disabled
    = document.getElementById ("catalog_zoom_comment").disabled
    = document.getElementById ("catalog_zoom_comment_delay").disabled
    = document.getElementById ("catalog_zoom_comment_delay_label1").disabled
    = document.getElementById ("catalog_zoom_comment_delay_label2").disabled
    = !document.getElementById ("catalog_zoom").checked;
  },
    
  checkCatalogReload : function () {
    document.getElementById ("catalog_reload_reply_number_delta").disabled
    = document.getElementById ("catalog_reload_hook").disabled
    = document.getElementById ("catalog_reload_status_hold").disabled
    = document.getElementById ("catalog_reload_timestamp").disabled
    = document.getElementById ("catalog_reload_update_cache").disabled
    = document.getElementById ("catalog_reload_left_before").disabled
    = !document.getElementById ("catalog_reload").checked;
        
    AkahukuOptions.checkCatalogReloadLeftBefore ();
    AkahukuOptions.checkCatalogReloadUpdateCache ();
  },

  checkCatalogReloadUpdateCache : function () {
    document.getElementById ("catalog_reload_update_cache_warning").disabled
    = document.getElementById ("catalog_reload_update_cache").disabled
    || document.getElementById ("catalog_reload_update_cache").checked;
  },

  checkCatalogReloadLeftBefore : function () {
    document.getElementById ("catalog_reload_left_before_more").disabled
    = document.getElementById ("catalog_reload_left_before_label1").disabled
    = document.getElementById ("catalog_reload_left_before_label2").disabled
    = document.getElementById ("catalog_reload_left_before_label3").disabled
    = document.getElementById ("catalog_reload_left_before_label4").disabled
    = document.getElementById ("catalog_reload_left_before_more_num").disabled
    = document.getElementById ("catalog_reload_left_before_more_num_label").disabled
    = document.getElementById ("catalog_reload_left_before_save").disabled
    = !document.getElementById ("catalog_reload_left_before").checked
    || !document.getElementById ("catalog_reload").checked;
  },
    
  checkCatalogSidebar : function () {
    document.getElementById ("catalog_sidebar_comment").disabled
    = !document.getElementById ("catalog_sidebar").checked;
        
    AkahukuOptions.checkCatalogSidebarComment ();
  },
    
  checkCatalogSidebarComment : function () {
    document.getElementById ("catalog_sidebar_comment_length").disabled
    = document.getElementById ("catalog_sidebar_comment_length_label1").disabled
    = document.getElementById ("catalog_sidebar_comment_length_label2").disabled
    = !document.getElementById ("catalog_sidebar").checked
    || !document.getElementById ("catalog_sidebar_comment").checked;
  },

  checkCatalogObserve : function () {
    document.getElementById ("catalog_observe_replynum").disabled
    document.getElementById ("catalog_observe_opened").disabled
    = !document.getElementById ("catalog_observe").checked;
  },
    
  checkSidebar : function () {
    document.getElementById ("sidebar_background").disabled
    = document.getElementById ("sidebar_check_catalog").disabled
    = document.getElementById ("sidebar_tab_vertical").disabled
    = document.getElementById ("sidebar_tab_hidden").disabled
    = document.getElementById ("sidebar_tab_menu").disabled
    = document.getElementById ("sidebar_sort_type").disabled
    = document.getElementById ("sidebar_sort_visited").disabled
    = document.getElementById ("sidebar_sort_marked").disabled
    = document.getElementById ("sidebar_sort_invert").disabled
    = document.getElementById ("sidebar_markedtab").disabled
    = document.getElementById ("sidebar_max_view").disabled
    = document.getElementById ("sidebar_max_view_label").disabled
    = document.getElementById ("sidebar_max_cache").disabled
    = document.getElementById ("sidebar_max_cache_label").disabled
    = document.getElementById ("sidebar_thumbnail_size").disabled
    = document.getElementById ("sidebar_thumbnail_size_label").disabled
    = document.getElementById ("sidebar_save").disabled
    = document.getElementById ("sidebar_board_select_in_list").disabled
    = document.getElementById ("sidebar_board_select_in_label").disabled
    = document.getElementById ("sidebar_board_select_ex_list").disabled
    = document.getElementById ("sidebar_board_select_ex_label").disabled
    = document.getElementById ("sidebar_board_select_add").disabled
    = document.getElementById ("sidebar_board_select_delete").disabled
    = !document.getElementById ("sidebar").checked;
    AkahukuOptions.checkSidebarShortcut ();
  },
    
  checkSidebarShortcut : function () {
    document.getElementById ("sidebar_shortcut_input").disabled
    = document.getElementById ("sidebar_shortcut_keycode").disabled
    = document.getElementById ("sidebar_shortcut_keycode_menu").disabled
    = document.getElementById ("sidebar_shortcut_modifiers_alt").disabled
    = document.getElementById ("sidebar_shortcut_modifiers_ctrl").disabled
    = document.getElementById ("sidebar_shortcut_modifiers_meta").disabled
    = document.getElementById ("sidebar_shortcut_modifiers_shift").disabled
    = !document.getElementById ("sidebar").checked
    || !document.getElementById ("sidebar_shortcut").checked;
  },
    
  checkBoardSelect : function () {
    document.getElementById ("board_select_in_list").disabled
    = document.getElementById ("board_select_in_label").disabled
    = document.getElementById ("board_select_ex_list").disabled
    = document.getElementById ("board_select_ex_label").disabled
    = document.getElementById ("board_select_add").disabled
    = document.getElementById ("board_select_delete").disabled
    = !document.getElementById ("board_select").checked;
  },
    
  checkBoardExternal : function () {
    document.getElementById ("board_external_pattern_label").disabled
    = document.getElementById ("board_external_pattern").disabled
    = document.getElementById ("board_external_monaca").disabled
    = document.getElementById ("board_external_prefix").disabled
    = document.getElementById ("board_external_list").disabled
    = document.getElementById ("board_external_sample1").disabled
    = document.getElementById ("board_external_sample2").disabled
    = document.getElementById ("board_external_sample3").disabled
    = document.getElementById ("board_external_sample4").disabled
    = document.getElementById ("board_external_add").disabled
    = document.getElementById ("board_external_moveup").disabled
    = document.getElementById ("board_external_movedown").disabled
    = document.getElementById ("board_external_delete").disabled
    = !document.getElementById ("board_external").checked;
        
    document.getElementById ("board_external_modify").disabled
    = !document.getElementById ("board_external").checked
    || (document.getElementById ("board_external_list").selectedCount > 1);
  },
  
  checkBloomer : function () {
    document.getElementById ("bloomer_input").disabled
    = document.getElementById ("bloomer_input_label").disabled
    = document.getElementById ("bloomer_keycode").disabled
    = document.getElementById ("bloomer_keycode_menu").disabled
    = document.getElementById ("bloomer_modifiers_alt").disabled
    = document.getElementById ("bloomer_modifiers_ctrl").disabled
    = document.getElementById ("bloomer_modifiers_meta").disabled
    = document.getElementById ("bloomer_modifiers_shift").disabled
    = document.getElementById ("bloomer_file_label").disabled
    = document.getElementById ("bloomer_file").disabled
    = document.getElementById ("bloomer_file_select").disabled
    = !document.getElementById ("bloomer").checked;
  },
    
  checkStatusbarOrder : function () {
    document.getElementById ("statusbar_order_list").disabled
    = document.getElementById ("statusbar_order_moveup").disabled
    = document.getElementById ("statusbar_order_movedown").disabled
    = !document.getElementById ("statusbar_order").checked;
  },
    
  /* 親のチェックボックスの状態で子の操作不可を設定する - ここまで - */
    
  /**
   * 設定のインポート
   */
  importPrefs : function () {
    try {
      var filename;
            
      var filePicker
      = Components.classes ["@mozilla.org/filepicker;1"]
      .createInstance (Components.interfaces.nsIFilePicker);
      filePicker.init (window,
                       "\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
                       Components.interfaces.nsIFilePicker.modeOpen);
      filePicker.appendFilter ("Text", "*.txt");
      filePicker.defaultString = "akahukuConfig.txt";
      filePicker.appendFilters (Components.interfaces.nsIFilePicker
                                .filterAll);
            
      arAkahukuCompat.FilePicker.open (filePicker, function (ret) {
        if (ret !== Components.interfaces.nsIFilePicker.returnOK) {
          document.getElementById ("import_export_message").value
          = "\u30A4\u30F3\u30DD\u30FC\u30C8\u3092\u4E2D\u65AD\u3057\u307E\u3057\u305F";
          return;
        }

        var file
          = filePicker.file
          .QueryInterface (Components.interfaces.nsILocalFile);
                
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (Components.interfaces.nsIFileInputStream);
        var sstream
          = Components
          .classes ["@mozilla.org/scriptableinputstream;1"]
          .createInstance (Components.interfaces
                           .nsIScriptableInputStream);
        fstream.init (file, 0x01, 292/*0444*/, 0);
        sstream.init (fstream);
        var text = sstream.read (-1);
        sstream.close ();
        fstream.close ();
                
        text = text.replace (/\r\n/g, "\n");
        var map = new Object ();
        var ok = false;
                
        /* ファイルを解析するだけなので代入はしない */
        text.replace
          (/([^\n]+)\n?/g,
           function (matched, part1) {
            if (part1.match (/^(akahuku\..+),(.+)$/)) {
              map [unescape (RegExp.$1)] = unescape (RegExp.$2);
              ok = true;
            }
            return "";
          });
                
        if (ok) {
          AkahukuOptions.loadPrefs (map, true);
          
          document.getElementById ("import_export_message").value
            = "\u30A4\u30F3\u30DD\u30FC\u30C8\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F";
        }
        else {
          document.getElementById ("import_export_message").value
            = "\u4E0D\u6B63\u306A\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u3067\u3059";
        }
      });
    }
    catch (e) {
      document.getElementById ("import_export_message").value
      = "\u30A4\u30F3\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F";
    }
  },
    
  /**
   * 設定のエクスポート
   *
   * @param  Boolean deletePath
   *         パス等を削除するか
   */
  exportPrefs : function (deletePath) {
    try {
      var filename;
            
      var filePicker
      = Components.classes ["@mozilla.org/filepicker;1"]
      .createInstance (Components.interfaces.nsIFilePicker);
      filePicker.init (window,
                       "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3059\u308B\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u000A",
                       Components.interfaces.nsIFilePicker.modeSave);
      filePicker.appendFilter ("Text", "*.txt");
      filePicker.defaultString = "akahukuConfig.txt";
      filePicker.appendFilters (Components.interfaces.nsIFilePicker
                                .filterAll);
            
      arAkahukuCompat.FilePicker.open (filePicker, function (ret) {
        if (ret != Components.interfaces.nsIFilePicker.returnOK &&
            ret != Components.interfaces.nsIFilePicker.returnReplace) {
          document.getElementById ("import_export_message").value
          = "\u30A8\u30B9\u30AF\u30DD\u30FC\u30C8\u3092\u4E2D\u65AD\u3057\u307E\u3057\u305F";
          return;
        }
        var file
          = filePicker.file
          .QueryInterface (Components.interfaces.nsILocalFile);
                
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-output-stream;1"]
          .createInstance (Components.interfaces.nsIFileOutputStream);
        fstream.init (file, 0x02 | 0x08 | 0x20, 420/*0644*/, 0);
                
        AkahukuOptions.savePrefs (fstream, deletePath, true);
                
        fstream.close ();
                
        document.getElementById ("import_export_message").value
          = "\u30A8\u30B9\u30AF\u30DD\u30FC\u30C8\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F";
      });
    }
    catch (e) {
      document.getElementById ("import_export_message").value
      = "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F";
    }
  },
    
  /**
   * 設定の初期化
   */
  initPrefs : function () {
    var map = new Object ();
    AkahukuOptions.loadPrefs (map, true);
  },
  
  /**
   * フォーカスされている要素を調べる
   *
   * @return Boolean
   *         1行のテキストボックスにフォーカスが無ければ true
   */
  checkFocus : function () {
    var node = document.commandDispatcher.focusedElement;
        
    if  (node
         && node.nodeName == "html:input") {
      return false;
    }
        
    return true;
  },
    
  /**
   * サイトを開く
   */
  openWebsite : function () {
    var mediator
    = Components.classes ["@mozilla.org/appshell/window-mediator;1"]
    .getService (Components.interfaces.nsIWindowMediator);
    var chromeWindow = mediator.getMostRecentWindow ("navigator:browser");
    if (chromeWindow) {
      chromeWindow.arAkahukuUI.openWebsite ();
    }
    else {
      window.open ("http://toshiakisp.github.io/akahuku-firefox-sp/");
    }
  },
  
  ListManager : {
    toString : function (id) {
      var listbox = document.getElementById (id + "_list");
      var node = listbox.firstChild;
      var values = [];
      
      while (node) {
        var nextNode = node.nextSibling;
        if (node.nodeName == "listitem") {
          values.push (AkahukuOptions.ListManager.getItem (node));
        }
        node = nextNode;
      }
      
      return arAkahukuJSON.encode (values);
    }, 
    
    fromString : function (id, s) {
      var values = arAkahukuJSON.decode (s);
      while (values.length && values [0] == undefined) {
        values.shift ();
      }
      
      AkahukuOptions.ListManager.clear (id);
      for (var i = 0; i < values.length; i ++) {
        AkahukuOptions.ListManager.addItem (id, values [i], null);
      }
    },
    
    clear : function (id) {
      var listbox = document.getElementById (id + "_list");
      var node = listbox.firstChild;
      while (node) {
        var nextNode = node.nextSibling;
        if (node.nodeName == "listitem") {
          listbox.removeChild (node);
        }
        node = nextNode;
      }
    },
    
    init : function (id) {
      var node;
      
      node = document.getElementById (id + "_list");
      node.addEventListener
      ("select",
       function () {
        AkahukuOptions.ListManager.onSelect (id);
      }, false);
      node.addEventListener
      ("keydown",
       function () {
        AkahukuOptions.ListManager.onKeyDown (id, arguments [0]);
      }, false);
      
      node = document.getElementById (id + "_add");
      node.addEventListener
      ("command",
       function () {
        AkahukuOptions.ListManager.onAdd (id, false);
      }, false);

      node = document.getElementById (id + "_modify");
      node.addEventListener
      ("command",
       function () {
        AkahukuOptions.ListManager.onAdd (id, true);
      }, false);
      
      node = document.getElementById (id + "_moveup");
      node.addEventListener
      ("command",
       function () {
        AkahukuOptions.ListManager.onMoveUp (id);
      }, false);
      
      node = document.getElementById (id + "_movedown");
      node.addEventListener
      ("command",
       function () {
        AkahukuOptions.ListManager.onMoveDown (id);
      }, false);

      node = document.getElementById (id + "_delete");
      node.addEventListener
      ("command",
       function () {
        AkahukuOptions.ListManager.onDelete (id);
      }, false);
    },
    
    onSelect : function (id) {
      var listInfo = AkahukuOptions.listList [id];
      
      var listbox = document.getElementById (id + "_list");
        
      if (listbox.selectedIndex != -1) {
        var value = AkahukuOptions.ListManager.getItem (listbox.selectedItem);
        
        listInfo.onSelect (value);
        
        document.getElementById (id + "_modify").disabled
          = !listInfo.isEnabled ()
          || (listbox.selectedCount > 1);
      }
    },
    
    onKeyDown : function (id, event) {
      if (event.keyCode == 8 || event.keyCode == 46) {
        AkahukuOptions.ListManager.onDelete (id);
      }
    },
    
    onAdd : function (id, modify) {
      var listInfo = AkahukuOptions.listList [id];
      
      document.getElementById (id + "_illegal").value = "";
      
      var value = listInfo.getValue ();
      
      var message = listInfo.checkError (value);
      if (message) {
        document.getElementById (id + "_illegal").value = message;
        return;
      }
      
      var listbox = document.getElementById (id + "_list");
      var exist = false;
      
      var nextNode = null;
      var node = null;
      if (modify) {
        var node = listbox.firstChild;
        while (node) {
          if (node.nodeName == "listitem") {
            if (node.selected) {
              break;
            }
          }
          node = node.nextSibling;
        }
      }
      
      var node2 = listbox.firstChild;
      while (node2) {
        var nextNode2 = node2.nextSibling;
        
        if (node2.nodeName == "listitem") {
          var value2 = AkahukuOptions.ListManager.getItem (node2);
          if (node2 != node
              && listInfo.isSame (value, value2)) {
            exist = true;
            break;
          }
        }
        node2 = nextNode2;
      }
      
      if (!exist) {
        AkahukuOptions.ListManager.addItem (id, value, node);
        
        if (node == null) {
          listInfo.onAdd ();
        }
      }
      else {
        document.getElementById (id + "_illegal").value
        = "\u540C\u3058\u9805\u76EE\u304C\u3042\u308A\u307E\u3059";
      }
    },
    
    onMoveUp : function (id) {
      var listbox = document.getElementById (id + "_list");
        
      var node = listbox.firstChild;
      var nextNode = null;
      var prevNode = null;
      var node1 = null;
      var node2 = null;
      var tmp = "";
      while (node) {
        nextNode = node.nextSibling;
        if (node.nodeName == "listitem") {
          if (node.selected) {
            if (prevNode) {
              node1 = node.firstChild;
              node2 = prevNode.firstChild;
              while (node1 && node2) {
                tmp = node1.getAttribute ("value");
                node1.setAttribute ("value",
                                    node2.getAttribute ("value"));
                node2.setAttribute ("value", tmp);
                            
                if (node1.getAttribute ("class")
                    == "listcell-iconic") {
                  tmp = node1.getAttribute ("image");
                  node1.setAttribute ("image",
                                      node2
                                      .getAttribute ("image"));
                  node2.setAttribute ("image", tmp);
                }
                else {
                  tmp = node1.getAttribute ("label");
                  node1.setAttribute ("label",
                                      node2
                                      .getAttribute ("label"));
                  node2.setAttribute ("label", tmp);
                }
                            
                node1 = node1.nextSibling;
                node2 = node2.nextSibling;
              }
              listbox.toggleItemSelection (node);
              listbox.toggleItemSelection (prevNode);
              prevNode = prevNode;
            }
          }
          else {
            prevNode = node;
          }
        }
        node = nextNode;
      }
    },
    
    onMoveDown : function (id) {
      var listbox = document.getElementById (id + "_list");
        
      var node = listbox.lastChild;
      var nextNode = null;
      var prevNode = null;
      var node1 = null;
      var node2 = null;
      var tmp = "";
      while (node) {
        prevNode = node.previousSibling;
        if (node.nodeName == "listitem") {
          if (node.selected) {
            if (nextNode) {
              node1 = node.firstChild;
              node2 = nextNode.firstChild;
              while (node1 && node2) {
                tmp = node1.getAttribute ("value");
                node1.setAttribute ("value",
                                    node2.getAttribute ("value"));
                node2.setAttribute ("value", tmp);
                            
                if (node1.getAttribute ("class")
                    == "listcell-iconic") {
                  tmp = node1.getAttribute ("image");
                  node1.setAttribute ("image",
                                      node2
                                      .getAttribute ("image"));
                  node2.setAttribute ("image", tmp);
                }
                else {
                  tmp = node1.getAttribute ("label");
                  node1.setAttribute ("label",
                                      node2
                                      .getAttribute ("label"));
                  node2.setAttribute ("label", tmp);
                }
                            
                node1 = node1.nextSibling;
                node2 = node2.nextSibling;
              }
              listbox.toggleItemSelection (node);
              listbox.toggleItemSelection (nextNode);
              nextNode = nextNode;
            }
          }
          else {
            nextNode = node;
          }
        }
        node = prevNode;
      }
    },
    
    onDelete : function (id) {
      var listbox = document.getElementById (id + "_list");
        
      var node = listbox.firstChild;
      while (node) {
        var nextNode = node.nextSibling;
        if (node.selected) {
          listbox.removeChild (node);
        }
        node = nextNode;
      }
    },
    
    addItem : function (id, value, listitem) {
      var listInfo = AkahukuOptions.listList [id];
      
      var listbox = document.getElementById (id + "_list");
      var listcell;
      var append = false;
      var i;
      
      if (listitem == null) {
        append = true;
        listitem = document.createElement ("listitem");
        
        for (var i = 0; i < listInfo.columns.length; i ++) {
          listcell = document.createElement ("listcell");
          listitem.appendChild (listcell);
        }
        
        listitem.addEventListener
          ("mousedown",
           function () {
            AkahukuOptions.ListManager.onMouseDown (id, arguments [0]);
          }, false);
      }
      
      var v;
      var listcell = listitem.firstChild;
      listcell.setAttribute ("value", escape (arAkahukuJSON.encode (value)));
      for (var i = 0; i < listInfo.columns.length; i ++) {
        v = listInfo.columns [i][1] (value);
        
        if (listInfo.columns [i][0] == "check") {
          listcell.setAttribute ("class", "listcell-iconic");
          if (v) {
            listcell.setAttribute
              ("image",
               "chrome://akahuku/content/images/check_o.png");
          }
          else {
            listcell.setAttribute
              ("image",
               "chrome://akahuku/content/images/check_x.png");
          }
        }
        else {
          listcell.setAttribute ("label", v);
        }
        
        listcell = listcell.nextSibling;
      }
      
      if (append) {
        listbox.appendChild (listitem);
      }
    },
    
    getItem : function (listitem) {
      var s = unescape (listitem.firstChild.getAttribute ("value"));
      var v = arAkahukuJSON.decode (s);
      return v;
    },
    
    onMouseDown : function (id, event) {
      var listInfo = AkahukuOptions.listList [id];
      
      var listitem = event.target;
      if (listitem.nodeName.toLowerCase () != "listitem") {
        return;
      }
      
      var value = AkahukuOptions.ListManager.getItem (listitem);
      
      var listcell = listitem.firstChild;
      for (var i = 0; i < listInfo.columns.length; i ++) {
        if (listInfo.columns [i][0] == "check") {
          if (event.clientX > listcell.boxObject.x
              && event.clientX
              < listcell.boxObject.x + listcell.boxObject.width
              && event.clientX < listcell.boxObject.x + 16) {
            listInfo.columns [i][2] (value);
            break;
          }
        }
        
        listcell = listcell.nextSibling;
      }
      
      listInfo.onSelect (value);
      
      AkahukuOptions.ListManager.addItem (id, value, listitem);
    }
  },
  
  checkUndefined : function (value) {
    try {
      var values = arAkahukuJSON.decode (value);
      if (values.length) {
        while (values.length && values [0] == undefined) {
          values.shift ();
        }
        if (values.length) {
          return value;
        }
        else {
          /* 中身が全部 undefined */
          return "null";
        }
      }
      else {
        return value;
      }
    }
    catch (e) {
      return "null";
    }
  }
};

