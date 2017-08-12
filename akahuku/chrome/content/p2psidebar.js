
/* global Components, document, window,
 *   arAkahukuServerShortName
 */

/**
 * 誘い攻め、誘い受け、襲い攻め、襲い受け の名前
 */
var AcceptName
= new Array (
  "\u756A\u753A\u3055\u3089\u3055\u3089\u5C4B\u6577",
  "\u304A\u8336\u6F2C\u3051\u3055\u3089\u3055\u3089",
  "\u30B5\u30E9\u30B5\u30E9\u5065\u5EB7",
  "\u304A\u3063\u3074\u308D\u3052\u30A2\u30BF\u30C3\u30AF",
  "\u3086\u3060\u306D\u3066\u3054\u3089\u3093",
  "\u7E4B\u3050\u305F\u3081\u306B\u751F\u307E\u308C\u305F\u306E",
  "\u3042\u306A\u305F\u3068\u5408\u4F53\u3057\u305F\u3044",
  "\u79C1\u3068\u3072\u3068\u3064\u306B\u306A\u308A\u305F\u3044\uFF1F",
  "\u62B5\u6297\u306F\u7121\u610F\u5473\u3060\u3000\u79C1\u3068\u540C\u5316\u3057\u308D",
  "\u76F8\u601D\u76F8\u611B",
  "\u7981\u5FCC\u306A\u304D\u95A2\u4FC2",
  "\u304A\u96A3\u3055\u3093\uFF08\u6027\u7684\u306A\u610F\u5473\u3067\uFF09",
  "\u4FFA\u3068\u304A\u524D\u306E\u4EF2\u3058\u3083\u306A\u3044\u304B",
  "\u83EF\u9E97\u306A\u308B\u304A\u3051\u3064",
  "\u9006\u5674\u5C04\u4E2D",
  "\u5996\u8276\u719F\u5973",
  "\u30A2\u30CA\u30EB\u8A13\u7DF4\u751F",
  "\u5929\u4F7F\u3068\u60AA\u9B54",
  "\u3068\u3042\u308B\u4E8C\u6B21\u5143\u7F8E\u5C11\u5973",
  "\u4FFA\u306F\u4FFA\u3060\u305E\u4FFA",
  "\u611B\u306E\u30CF\u30F3\u30BF\u30FC",
  "\u5C3F\u9053\u6C42\u3080\u3000\u521D\u7269\u6B53\u8FCE",
  "\u305D\u3046\u2026\u305D\u306E\u307E\u307E\u3086\u3063\u304F\u308A\u2026",
  "\u30B9\u30B8\u6559\u5F92",
  "\u5BCC\u5C71\u5728\u4F4F",
  "\u5948\u826F\u540D\u7269\u3000\u9E7F\u306E\u7CDE",
  "\u5F53\u65B9\u5149\u3067\u3059\u304C\u30B1\u30FC\u30D6\u30EB\u304C\u3055\u3051\u308B\u30C1\u30FC\u30BA\u3067\u51FA\u6765\u3066\u3044\u307E\u3059",
  "\u30DC\u30AF\u304A\u3068\u3053\u306E\u3053\u3060\u3088\uFF1F\u305D\u308C\u3067\u3082\u3044\u3044\u306E\uFF1F",
  "\u3082\u3046\u5BDD\u306A\u3055\u3044",
  "\u6B32\u60C5\u3057\u305F\u3089\u6BBA\u3059",
  "\u3075\u305F\u306A\u308A",
  "\u3057\u3082\u3093\u304D\u3093\uFF01\u3057\u3082\u3093\u304D\u3093\u3058\u3083\u306A\u3044\u304B\uFF01"
  );

/**
 * 襲い攻め、襲い受け のみの名前
 */
var NoAcceptName
= new Array (
  "\u975E\u901A\u77E5",
  "\u6355\u7372\u30E2\u30FC\u30C9",
  "\u4F4F\u6240\u4E0D\u5B9A\u7121\u8077",
  "\u5175\u5EAB\u770C\u3000\u533F\u540D\u5E0C\u671B\u3055\u3093",
  "\u306F\u3058\u307E\u308A\u306F\u3053\u3061\u3089\u304B\u3089",
  "\u7E4B\u3050\u306E\u3060\u3051\u597D\u304D",
  "\u6D88\u9632\u7F72\u306E\u65B9\u304B\u3089\u6765\u307E\u3057\u305F",
  "\u3053\u3061\u3089\u304B\u3089\u304A\u4F3A\u3044\u81F4\u3057\u307E\u3059",
  "\u5BB6\u5EAD\u8A2A\u554F",
  "\u98DB\u3073\u8FBC\u307F\u55B6\u696D",
  "\u62BC\u3057\u58F2\u308A",
  "\u4FFA\u3060\u3088\u3001\u4FFA",
  "\u3084\u3089\u306A\u3044\u304B",
  "\u611B\u3055\u308C\u308B\u3088\u308A\u611B\u3057\u305F\u3044",
  "\u30D7\u30E9\u30C8\u30CB\u30C3\u30AF\u30E9\u30D6",
  "\u30DA\u30C9",
  "\u30B9\u30B8",
  "\u30BF\u30A4\u30AC\u30FC",
  "\u30EC\u30A4\u30D7\u9B54",
  "\u9AD8\u7D1A\u5A3C\u5A66",
  "\u59EB",
  "\u30BB\u30EC\u30D6",
  "\u6DF1\u7A93\u306E\u4EE4\u5B22",
  "\u30C7\u30FC\u30C8\u306F\u3059\u308B\u3051\u3069\u81EA\u5B85\u306F\u6559\u3048\u306A\u3044\u7537",
  "\u4F53\u306F\u3044\u3044\u3051\u3069\u5FC3\u306F\u3042\u306A\u305F\u306E\u7269\u3058\u3083\u306A\u3044\u308F",
  "\u3042\u3001\u3042\u305F\u3057\u304B\u3089\u7E4B\u3050\u3093\u3060\u304B\u3089\u306D\u3063\uFF01\u3042\u3093\u305F\u306F\u5F85\u3063\u3066\u308C\u3070\u3044\u3044\u306E\u3063\uFF01\uFF01",
  "\u30D0\u30D0\u30A2\u7D50\u5A5A\u3057\u3066\u304F\u308C\uFF01",
  "\u5177\u306A\u3057\u30AB\u30EC\u30FC",
  "\u3075\u3093\u3069\u3057",
  "\uFF2D\u5B57\u958B\u811A",
  "\u8D85\u3048\u3066\u306F\u306A\u3089\u306A\u3044\u4E00\u7DDA",
  "\u5D16\u3063\u3077\u3061"
  );

/**
 * P2P サイドバー
 */
var AkahukuP2PSidebar = {
  initialized : false, /* Boolean  初期化フラグ */
  timerID : null,      /* Number  状態をチェックするタイマー ID */
  count : 0,           /* Number  ステータスバーの更新の何秒目か
                        *   5 秒に 1 回他のノードを更新して 0 に戻す */
    
  selfNoAcceptIndex : 0, /* Number  自分が [襲い攻め、襲い受け のみ] の場合の
                          *   名前のインデックス */
    
  enableP2P : false, /* Boolean  P2P モードかどうか */
  prefBranch : null, /* nsIPrefBranch/nsIPrefBranch2  pref サービス */
    
  /**
   * 初期化処理
   */
  init : function () {
    if (!AkahukuP2PSidebar.initialized) {
      AkahukuP2PSidebar.initialized = true;
            
      /* 自分が襲い専の場合の名前は適当に決める */
      AkahukuP2PSidebar.selfNoAcceptIndex
      = parseInt (Math.random () * NoAcceptName.length);
      if (AkahukuP2PSidebar.selfNoAcceptIndex
          >= NoAcceptName.length) {
        AkahukuP2PSidebar.selfNoAcceptIndex = 0;
      }
            
      if (Components.interfaces.nsIPrefBranch2) {
        AkahukuP2PSidebar.prefBranch
        = Components.classes ["@mozilla.org/preferences-service;1"]
        .getService (Components.interfaces.nsIPrefBranch2);
      }
      else {
        AkahukuP2PSidebar.prefBranch
        = Components.classes ["@mozilla.org/preferences-service;1"]
        .getService (Components.interfaces.nsIPrefBranch);
      }
      AkahukuP2PSidebar.check ();
            
      AkahukuP2PSidebar.timerID
      = setInterval (AkahukuP2PSidebar.check, 1000);
    }
  },
    
  /**
   * ノード追加ボタン
   */
  addNodes : function () {
    var text = document.getElementById ("nodes").value;
    document.getElementById ("nodes").value = "";
        
    var {arAkahukuP2PService}
    = Components.utils.import ("resource://akahuku/p2p-service.jsm", {});
    var servant = arAkahukuP2PService.servant;
    if (!servant) {
      return;
    }
              
    var now = (new Date ()).getTime ();
        
    text.replace
    (/([^\r\n]+)\r?\n?/g,
     function (matched, line) {
      var nodeName = "";
            
      if (line.match (/(=AKA[^=]+=)/)) {
        nodeName = RegExp.$1;
      }
      else if (line.match (/([^:]+):([0-9]+)/)) {
        var address = RegExp.$1;
        var port = parseInt (RegExp.$2);
        nodeName = servant.encodeNodeName (address, port);
      }
            
      if (nodeName) {
        servant.addNode (nodeName, false, parseInt (now / 1000), "");
      }
      return "";
    });
  },
    
  /**
   * P2P の状態を入れ替える
   */
  startStop : function () {
    if (AkahukuP2PSidebar.enableP2P) {
      AkahukuP2PSidebar.prefBranch.setBoolPref ("akahuku.p2p", false);
    }
    else {
      AkahukuP2PSidebar.prefBranch.setBoolPref ("akahuku.p2p", true);
    }
        
    /* 設定を用いて他に通知 */
    AkahukuP2PSidebar.prefBranch
    .setCharPref ("akahuku.savepref",
                  String (new Date ().getTime ()));
        
    setTimeout (AkahukuP2PSidebar.check, 1000);
  },
    
  /**
   * キャッシュを削除する
   */
  clearCache : function () {
    var fail1 = document.getElementById ("clear-fail1");
    var fail2 = document.getElementById ("clear-fail2");
    fail1.hidden = true;
    fail2.hidden = true;

    var button = document.getElementById ("clear");
    button.disabled = true;
    button.label = "\u524A\u9664\u4E2D";
    var {arAkahukuP2PService}
    = Components.utils.import ("resource://akahuku/p2p-service.jsm", {});
    var servant = arAkahukuP2PService.servant;
    if (!servant) {
      return;
    }
        
    if (!servant.forceClearCache ()) {
      fail1.hidden = false;
      fail2.hidden = false;
    }
  },
    
  /**
   * P2P の状態を表示する
   */
  check : function () {
    var {arAkahukuP2PService}
    = Components.utils.import ("resource://akahuku/p2p-service.jsm", {});
    var servant = arAkahukuP2PService.servant;
        
    var locked = document.getElementById ("lock").checked;
        
    if (AkahukuP2PSidebar.prefBranch.prefHasUserValue ("akahuku.p2p")) {
      AkahukuP2PSidebar.enableP2P
        = AkahukuP2PSidebar.prefBranch.getBoolPref ("akahuku.p2p");
    }
    else {
      AkahukuP2PSidebar.enableP2P = false;
    }
    var button = document.getElementById ("start_stop");
    if (AkahukuP2PSidebar.enableP2P) {
      button.label = "OFF \u306B\u3059\u308B";
    }
    else {
      button.label = "ON \u306B\u3059\u308B";
    }
        
    var nodelistNode;
        
    nodelistNode = document.getElementById ("nodelist");
        
    var now = (new Date ()).getTime ();
        
    if (!servant) {
      return;
    }
        
    var button = document.getElementById ("clear");
    if (!servant.getClearCacheState ()) {
      if (button.disabled) {
        button.disabled = false;
        button.label
          = "\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u524A\u9664\u3059\u308B";
      }
    }
        
    var servantStatus = servant.getStatus (false);
        
    var state = 0;
    var node;
    var box = nodelistNode.firstChild;
        
    var re = /([^\n]+)\n/;
    if (AkahukuP2PSidebar.count == 0) {
      /* 5 回に 1 回だけ他のノードも更新する */
      re = /([^\n]+)\n/g;
    }
        
    servantStatus.replace
    (re,
     function (matched, line) {
      var tmp = line.split (/,/);
      if (state == 0) {
        var i = 0;
                
        var nodeName = tmp [i]; i ++;
        var address = tmp [i]; i ++;
        var port = tmp [i]; i ++;
                
        var namedNode = tmp [i]; i ++;
        var aliveNode = tmp [i]; i ++;
                
        var sendSuccess = tmp [i]; i ++;
        var recvSuccess = tmp [i]; i ++;
        var relaySuccess = tmp [i]; i ++;
        var recvFail = tmp [i]; i ++;
                
        var portCheckStatus = tmp [i]; i ++;
                
        var boardList = tmp [i] || ""; i ++;
                
        node = document.getElementById ("nodename");
        if (nodeName == "stop") {
          node.value = "Stop";
        }
        else if (nodeName == "offline") {
          node.value = "\u30AA\u30D5\u30E9\u30A4\u30F3\u30E2\u30FC\u30C9\u3067\u3059";
        }
        else if (nodeName == "noaccept") {
          var illegalAddress = false;
          try {
            illegalAddress
              = document.defaultView.parent
              .arAkahukuP2P.illegalAddress
              }
          catch (e) {
          }
                    
          if (illegalAddress) {
            node.value = "\u81EA\u5206\u306E\u30A2\u30C9\u30EC\u30B9\u304C\u7121\u52B9\u3067\u3059";
          }
          else {
            var index = AkahukuP2PSidebar.selfNoAcceptIndex;
            node.value = NoAcceptName [index];
          }
        }
        else if (nodeName == "") {
          node.value = "\u30A2\u30C9\u30EC\u30B9\u81EA\u52D5\u66F4\u65B0\u4E2D";
        }
        else {
          node.value = nodeName;
        }
                
        node = document.getElementById ("save");
        node.value
          = "\u653B: "
          + sendSuccess
          + " / \u53D7: "
          + recvSuccess;
                
        node = document.getElementById ("save2");
        node.value
          = "\u7D99: "
          + relaySuccess
          + " / "
          + "\u53CC: " + recvFail;
                
        node = document.getElementById ("node");
        node.value
          = "\u30CE\u30FC\u30C9\u6570: "
          + aliveNode
          + " / " + namedNode;
                
        var list = new Array ();
        boardList.replace
          (/([^\/]+)\/([^:_]+)_?([^:]+)?:([^;]+);/g,
           function (matched, server, dir, type, time) {
            if (dir.match (/^([^\-]+)\-([^\-]+)$/)) {
              server = RegExp.$1;
              dir = RegExp.$2;
            }
            list.push (new Array (server, dir, type, time));
                        
            return "";
          });
        list.sort (function (a, b) {
            return b [3] - a [3];
          });
                
        var value = "";
        for (var i = 0; i < list.length; i ++) {
          if (value) {
            value += ", ";
          }
          var name = list [i][0] + "/" + list [i][1];
          var name2 = list [i][0] + ":" + list [i][1];
          if (name2 in arAkahukuServerShortName) {
            name = arAkahukuServerShortName [name2];
          }
          value += name;
          if  (list [i][2] == "cat") {
            value += "/cat";
          }
        }
                
        node = document.getElementById ("board");
        node.value = value;
                
        node = document.getElementById ("port-check-fail");
        if (portCheckStatus == "fail") {
          node.hidden = false;
        }
        else {
          node.hidden = true;
        }
                    
        state = 1;
      }
      else if (!locked
               && state == 1 && box) {
        var i = 0;
                
        var noaccept = (tmp [i] == "true"); i ++;
        var ping = tmp [i]; i ++;
                
        var connectTime = tmp [i]; i ++;
        var successTime = tmp [i]; i ++;
        var relayTime = tmp [i]; i ++;
        var worstTime = tmp [i]; i ++;
        var sendSuccess = tmp [i]; i ++;
        var recvSuccess = tmp [i]; i ++;
        var relaySuccess = tmp [i]; i ++;
                
        var boardList = tmp [i] || ""; i ++;
        var relayBoardList = tmp [i] || ""; i ++;
                
        box.hidden = false;
                
        var value = "";
        var label;
                
        if (noaccept) {
          var index = connectTime % NoAcceptName.length;
          value = NoAcceptName [index];
        }
        else {
          var index = connectTime % AcceptName.length;
          value = AcceptName [index];
        }
        label = box.firstChild;
        label.value = value;
                
        label = label.nextSibling;
        if (ping == -1) {
          ping = "???";
        }
        value
        = "\u653B: "
        + sendSuccess
        + " / \u53D7: "
        + recvSuccess
        + " / \u7D99: "
        + relaySuccess;
        label.value = value;
                
        label = label.nextSibling;
        if (connectTime != 0) {
          connectTime = parseInt ((now - connectTime) / 1000);
        }
        if (relayTime != 0
            && relayTime > successTime) {
          successTime = relayTime;
        }
        if (successTime != 0) {
          successTime = parseInt ((now - successTime) / 1000);
        }
        else {
          successTime = -1;
        }
        value
        = AkahukuP2PSidebar.toTime (successTime)
        + " / " + AkahukuP2PSidebar.toTime (connectTime);
        label.value = value;
                
        label = label.nextSibling;
        var list = new Array ();
        boardList.replace
        (/([^\/]+)\/([^:_]+)_?([^:]+)?:([^;]+);/g,
         function (matched, server, dir, type, time) {
          if (dir.match (/^([^\-]+)\-([^\-]+)$/)) {
            server = RegExp.$1;
            dir = RegExp.$2;
          }
          list.push (new Array (server, dir, type, time));
                    
          return "";
        });
        list.sort (function (a, b) {
            return b [3] - a [3];
          });
        value = "";
        for (var i = 0; i < list.length; i ++) {
          if (value) {
            value += ", ";
          }
          var name = list [i][0] + "/" + list [i][1];
          var name2 = list [i][0] + ":" + list [i][1];
          if (name2 in arAkahukuServerShortName) {
            name = arAkahukuServerShortName [name2];
          }
          value += name;
          if  (list [i][2] == "cat") {
            value += "/cat";
          }
        }
        if (value) {
          label.hidden = false;
          label.value = value;
        }
        else {
          label.hidden = true;
        }
                
        label = label.nextSibling;
        var list = new Array ();
        relayBoardList.replace
        (/([^\/]+)\/([^:_]+)_?([^:]+)?:([^;]+);/g,
         function (matched, server, dir, type, time) {
          if (dir.match (/^([^\-]+)\-([^\-]+)$/)) {
            server = RegExp.$1;
            dir = RegExp.$2;
          }
          list.push (new Array (server, dir, type, time));
                    
          return "";
        });
        list.sort (function (a, b) {
            return b [3] - a [3];
          });
        value = "";
        for (var i = 0; i < list.length; i ++) {
          if (value) {
            value += ", ";
          }
          var name = list [i][0] + "/" + list [i][1];
          var name2 = list [i][0] + ":" + list [i][1];
          if (name2 in arAkahukuServerShortName) {
            name = arAkahukuServerShortName [name2];
          }
          value += name;
          if  (list [i][2] == "cat") {
            value += "/cat";
          }
        }
        if (value) {
          label.hidden = false;
          label.value = value;
          label.style.color = "#789922";
        }
        else {
          label.hidden = true;
        }
                
        box = box.nextSibling;
      }
    });
        
    if (AkahukuP2PSidebar.count == 0
        && !locked) {
      while (box) {
        box.hidden = true;
        box = box.nextSibling;
      }
    }
        
    AkahukuP2PSidebar.count ++;
    if (AkahukuP2PSidebar.count >= 5) {
      AkahukuP2PSidebar.count = 0;
    }
  },
    
  /**
   * 秒数を時間表示に変える
   *
   * @param  Number sec
   *         秒数
   * @return String
   *         時間表示
   */
  toTime : function (sec) {
    var hour = 0;
    var min = 0;
    var text = "";
        
    if (sec == -1) {
      return "-:--";
    }
        
    if (sec >= 60 * 60) {
      hour = parseInt (sec / (60 * 60));
      sec = sec % (60 * 60);
    }
        
    if (sec >= 60) {
      min = parseInt (sec / 60);
      sec = sec % 60;
    }
        
    if (hour > 0) {
      text += hour + ":";
      if (min < 10) {
        text += "0"; 
      }
    }
        
    text += min + ":";
    if (sec < 10) {
      text += "0"; 
    }
    text += sec;
        
    return text;
  },
    
  /**
   * 終了処理
   */
  unload : function () {
    if (AkahukuP2PSidebar.timerID != null) {
      clearInterval (AkahukuP2PSidebar.timerID);
      AkahukuP2PSidebar.timerID = null;
    }
  }
};
