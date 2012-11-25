/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * JSON 変換器
 */
var arAkahukuJSONState = function (text) {
  this.text = text;
  this.length = text.length;
};
arAkahukuJSONState.prototype = {
  ok : false,
  text : "",
  i : 0,
  length : 0
};
var arAkahukuJSON = {
  decode : function (text) {
    var value;
    var state = new arAkahukuJSONState (text);
    
    return arAkahukuJSON.decodeValue (state);
  },
  
  decodeValue : function (state) {
    var value;
    
    value = arAkahukuJSON.decodeString (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeNumber (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeObject (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeArray (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeTrue (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeFalse (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeNull (state);
    if (state.ok) {
      return value;
    }
    value = arAkahukuJSON.decodeUndefined (state);
    if (state.ok) {
      return value;
    }
    
    return undefined;
  },
  
  decodeString : function (state) {
    var s = 0;
    var value = "", u;
    var i = state.i;
    
    for (; i < state.length; i ++) {
      var c = state.text [i];
      
      switch (s) {
        case 0: {
          if (c == "\"") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "\\") {
            s = 2;
          }
          else if (c == "\"") {
            state.ok = true;
            state.i = i + 1;
            return value;
          }
          else {
            value += c;
          }
          break;
        }
        case 2: {
          if (c == "\"") {
            value += "\"";
            s = 1;
          }
          else if (c == "\\") {
            value += "\\";
            s = 1;
          }
          else if (c == "/") {
            value += "/";
            s = 1;
          }
          else if (c == "b") {
            value += "\b";
            s = 1;
          }
          else if (c == "f") {
            value += "\f";
            s = 1;
          }
          else if (c == "n") {
            value += "\n";
            s = 1;
          }
          else if (c == "r") {
            value += "\r";
            s = 1;
          }
          else if (c == "t") {
            value += "\t";
            s = 1;
          }
          else if (c == "u") {
            s = 3;
            u = "";
          }
          else {
            value += "\\";
            s = 1;
            //return undefined;
          }
          break;
        }
        case 3:
        case 4:
        case 5: {
          if (c.match (/[0-9A-Fa-f]/)) {
            u += c;
            s ++;
          }
          else {
            return undefined;
          }
          
          break;
        }
        case 6: {
          if (c.match (/[0-9A-Fa-f]/)) {
            u += c;
            value += String.fromCharCode (parseInt (u, 16));
            s = 1;
          }
          else {
            return undefined;
          }
          
          break;
        }
      }
    }
    
    return undefined;
  },
  
  decodeNumber : function (state) {
    var s = 0;
    var value = "";
    
    var i = state.i;
    
    for (; i <= state.length; i ++) {
      var c = state.text [i];
      
      switch (s) {
        case 0: {
          if (c == undefined) {
            return undefined
          }
          else if (c == "-") {
            value += "-";
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            s = 1;
            i --;
          }
          break;
        }
        case 1: {
          if (c == undefined) {
            return undefined;
          }
          else if (c == "0") {
            value += c;
            s = 3;
          }
          else if (c.match (/[1-9]/)) {
            value += c;
            s = 2;
          }
          else {
            return undefined;
          }
          
          break;
        }
        case 2: {
          if (c == undefined) {
            s = 3;
            i --;
          }
          else if (c.match (/[0-9]/)) {
            value += c;
          }
          else {
            s = 3;
            i --;
          }
          break;
        }
        case 3: {
          if (c == ".") {
            value += c;
            s = 4;
          }
          else {
            s = 5;
            i --;
          }
          break;
        }
        case 4: {
          if (c == undefined) {
            s = 5;
            i --;
          }
          else if (c.match (/[0-9]/)) {
            value += c;
          }
          else {
            s = 5;
            i --;
          }
          break;
        }
        case 5: {
          if (c == "e"
              || c == "E") {
            value += c;
            s = 6;
          }
          else {
            s = 8;
            i --;
          }
          break;
        }
        case 6: {
          if (c == "+"
              || c == "-") {
            value += c;
            s = 7;
          }
          else {
            s = 7;
            i --;
          }
          break;
        }
        case 7: {
          if (c == undefined) {
            s = 8;
            i --;
          }
          else if (c.match (/[0-9]/)) {
            value += c;
          }
          else {
            s = 8;
            i --;
          }
          
          break;
        }
        case 8: {
          state.ok = true;
          state.i = i;
          
          return parseFloat (value, 10);
        }
      }
    }
    
    return undefined;
  },
  
  decodeObject : function (state) {
    var s = 0;
    var value = {}, n, v;
    var j = state.i;
    
    for (; state.i < state.length; state.i ++) {
      var c = state.text [state.i];
      
      switch (s) {
        case 0: {
          if (c == "{") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "}") {
            state.i ++;
            state.ok = true;
            return value;
          }
          else if (c == " ") {
          }
          else {
            s = 2;
            state.i --;
          }
          break;
        }
        case 2: {
          n = arAkahukuJSON.decodeString (state);
          if (state.ok) {
            state.ok = false;
            s = 3;
            state.i --;
          }
          else if (c == " ") {
          }
          else {
            state.i = j;
            return undefined;
          }
          
          break;
        }
        case 3: {
          if (c == ":") {
            s = 4;
          }
          else if (c == " ") {
          }
          else {
            state.i = j;
            return undefined;
          }
          break;
        }
        case 4: {
          v = arAkahukuJSON.decodeValue (state);
          if (state.ok) {
            state.ok = false;
            value [n] = v;
            s = 5;
            state.i --;
          }
          else if (c == " ") {
          }
          else {
            state.i = j;
            return undefined;
          }
          break;
        }
        case 5: {
          if (c == ",") {
            s = 2;
          }
          else if (c == "}") {
            state.i ++;
            state.ok = true;
            return value;
          }
          else if (c == " ") {
          }
          else {
            state.i = j;
            return undefined;
          }
          
          break;
        }
      }
    }
    
    state.i = j;
    return undefined;
  },
  
  decodeArray : function (state) {
    var s = 0;
    var value = [], v;
    var j = state.i;
    
    for (; state.i < state.length; state.i ++) {
      var c = state.text [state.i];
      
      switch (s) {
        case 0: {
          if (c == "[") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "]") {
            state.i ++;
            state.ok = true;
            return value;
          }
          else if (c == " ") {
          }
          else {
            s = 2;
            state.i --;
          }
          break;
        }
        case 2: {
          v = arAkahukuJSON.decodeValue (state);
          if (state.ok) {
            state.ok = false;
            value.push (v);
            s = 3;
            state.i --;
          }
          else if (c == " ") {
          }
          else {
            state.i = j;
            return undefined;
          }
          break;
        }
        case 3: {
          if (c == ",") {
            s = 2;
          }
          else if (c == "]") {
            state.i ++;
            state.ok = true;
            return value;
          }
          else if (c == " ") {
          }
          else {
            state.i = j;
            return undefined;
          }
          
          break;
        }
      }
    }
    
    state.i = j;
    return undefined;
  },
  
  decodeTrue : function (state) {
    var s = 0;
    
    var i = state.i;
    
    for (; i < state.length; i ++) {
      var c = state.text [i];
      
      switch (s) {
        case 0: {
          if (c == "t") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "r") {
            s = 2;
          }
          else {
            return undefined;
          }
          break;
        }
        case 2: {
          if (c == "u") {
            s = 3;
          }
          else {
            return undefined;
          }
          break;
        }
        case 3: {
          if (c == "e") {
            state.ok = true;
            state.i = i + 1;
            return true;
          }
          else {
            return undefined;
          }
          break;
        }
      }
    }
    
    return undefined;
  },
  
  decodeFalse : function (state) {
    var s = 0;
    
    var i = state.i;
    
    for (; i < state.length; i ++) {
      var c = state.text [i];
      
      switch (s) {
        case 0: {
          if (c == "f") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "a") {
            s = 2;
          }
          else {
            return undefined;
          }
          break;
        }
        case 2: {
          if (c == "l") {
            s = 3;
          }
          else {
            return undefined;
          }
          break;
        }
        case 3: {
          if (c == "s") {
            s = 4;
          }
          else {
            return undefined;
          }
          break;
        }
        case 4: {
          if (c == "e") {
            state.ok = true;
            state.i = i + 1;
            return false;
          }
          else {
            return undefined;
          }
          break;
        }
      }
    }
    
    return undefined;
  },
  
  decodeNull : function (state) {
    var s = 0;
    
    var i = state.i;
    
    for (; i < state.length; i ++) {
      var c = state.text [i];
      
      switch (s) {
        case 0: {
          if (c == "n") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "u") {
            s = 2;
          }
          else {
            return undefined;
          }
          break;
        }
        case 2: {
          if (c == "l") {
            s = 3;
          }
          else {
            return undefined;
          }
          break;
        }
        case 3: {
          if (c == "l") {
            state.ok = true;
            state.i = i + 1;
            return null;
          }
          else {
            return undefined;
          }
          break;
        }
      }
    }
    
    return undefined;
  },
  
  decodeUndefined : function (state) {
    var s = 0;
    
    var i = state.i;
    
    for (; i < state.length; i ++) {
      var c = state.text [i];
      
      switch (s) {
        case 0: {
          if (c == "u") {
            s = 1;
          }
          else if (c.match (/[ \t\r\n]/)) {
          }
          else {
            return undefined;
          }
          break;
        }
        case 1: {
          if (c == "n") {
            s = 2;
          }
          else {
            return undefined;
          }
          break;
        }
        case 2: {
          if (c == "d") {
            s = 3;
          }
          else {
            return undefined;
          }
          break;
        }
        case 3: {
          if (c == "e") {
            s = 4;
          }
          else {
            return undefined;
          }
          break;
        }
        case 4: {
          if (c == "f") {
            s = 5;
          }
          else {
            return undefined;
          }
          break;
        }
        case 5: {
          if (c == "i") {
            s = 6;
          }
          else {
            return undefined;
          }
          break;
        }
        case 6: {
          if (c == "n") {
            s = 7;
          }
          else {
            return undefined;
          }
          break;
        }
        case 7: {
          if (c == "e") {
            s = 8;
          }
          else {
            return undefined;
          }
          break;
        }
        case 8: {
          if (c == "d") {
            state.ok = true;
            state.i = i + 1;
            return undefined;
          }
          else {
            return undefined;
          }
          break;
        }
      }
    }
    
    return undefined;
  },
  
  encode : function (value) {
    var i, s = "";
    
    if (value === undefined) {
      s = "undefined";
    }
    else if (value === null) {
      s = "null";
    }
    else if (value instanceof Array) {
      s = "[";
      for (i = 0; i < value.length; i ++) {
        if (i > 0) {
          s += ",";
        }
        s += arAkahukuJSON.encode (value [i]);
      }
      s += "]";
    }
    else if (value instanceof Object) {
      s = "{";
      var first = true;
      for (var n in value) {
        if (!first) {
          s += ",";
        }
        s += arAkahukuJSON.encode (n);
        s += ":";
        s += arAkahukuJSON.encode (value [n]);
        first = false;
      }
      s += "}";
    }
    else if (typeof (value) == "string") {
      s = "\"";
      s += value
      .replace (/\\/g, "\\\\")
      .replace (/\"/g, "\\\"")
      .replace (/\n/g, "\\n")
      .replace (/\r/g, "\\r")
      .replace (/\t/g, "\\t")
      .replace (/[\u0080-\uffff]/g, function (matched) {
          var i, code = "";
          var c = matched.charCodeAt (0);
          var hex = "0123456789abcdef";
          
          for (i = 0; i < 4; i ++) {
            code = hex [c % 16] + code;
            c = Math.floor (c / 16);
          }
          
          return "\\u" + code;
        })
      ;
      s += "\"";
    }
    else if (typeof (value) == "number") {
      s = "" + value;
    }
    else if (typeof (value) == "boolean") {
      s = "" + value;
    }
    
    return s;
  }
};

