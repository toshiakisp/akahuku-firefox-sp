/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * Require: arAkahukuConverter
 */

/**
 * DOM 拡張
 */
var arAkahukuDOM = {
  /**
   * ノードの子をコピーする
   *
   * @param  HTMLElement from
   *         コピー元のノード
   * @param  HTMLElement from
   *         コピー先のノード
   */
  copyChildren : function (from, to) {
    var node;
    node = from.firstChild;
        
    while (node) {
      to.appendChild (node.cloneNode (true));
      node = node.nextSibling;
    }
  },
    
  /**
   * 指定したノードの子をテキストノードのみにする
   *
   * @param  HTMLElement node
   *         対象のノード
   * @param  String text
   *         テキストの内容
   *         null の場合追加しない
   */
  setText : function (node, text) {
    while (node.firstChild) {
      node.removeChild (node.firstChild);
    }
    if (text != null) {
      node.appendChild (node.ownerDocument.createTextNode (text));
    }
  },
  
  /**
   * クラス名を返す
   * 自作のドキュメントで className 属性がアヤシイため
   *
   * @param  HTMLElement node
   *         対象の要素
   * @return String
   *         クラス名 もしくは ""
   */
  getClassName : function (node) {
    if (node.getAttribute ("__class")) {
      return node.getAttribute ("__class");
    }
    if ("className" in node) {
      return node.className;
    }
    if (node.getAttribute ("class")) {
      return node.getAttribute ("class");
    }
    
    return "";
  },
  
  /**
   * クラス名を持つかどうか返す
   *
   * @param  HTMLElement node
   *         対象の要素
   * @param  String className
   *         クラス名
   * @return Boolean
   *         クラス名を持つかどうか
   */
  hasClassName : function (node, className) {
    var name = "";
    if ("className" in node
        && node.className) {
      name = node.className;
    }
    else if ("getAttribute" in node) {
      if (node.getAttribute ("class")) {
        name = node.getAttribute ("class");
      }
      else if (node.getAttribute ("__class")) {
        name = node.getAttribute ("__class");
      }
    }
    
    if (name) {
      var names = name.split (/ +/);
      for (var i = 0; i < names.length; i ++) {
        if (names [i] == className) {
          return true;
        }
      }
    }
    
    return false;
  },
  
  /**
   * クラス名を追加する
   *   自作のドキュメントでは使えない
   *
   * @param  HTMLElement node
   *         対象の要素
   * @param  String className
   *         クラス名
   */
  addClassName : function (node, className) {
    arAkahukuDOM.removeClassName (node, className);
    
    var name = "";
    if ("className" in node) {
      name = node.className;
    }
    
    if (name) {
      node.className = name + " " + className;
    }
    else {
      node.className = className;
    }
  },
  
  /**
   * クラス名を追加する
   *
   * @param  HTMLElement node
   *         対象の要素
   * @param  String className
   *         クラス名
   */
  removeClassName : function (node, className) {
    var name;
    
    if ("className" in node) {
      name = node.className;
      var p = name.indexOf (className);
      if (p != -1) {
        name = name.substr (0, p) + name.substr (p + className.length);
      }
      node.className = name;
    }
    
    name = node.getAttribute ("class");
    if (name) {
      var p = name.indexOf (className);
      if (p != -1) {
        name = name.substr (0, p) + name.substr (p + className.length);
      }
      if (name) {
        node.setAttribute ("class", name);
      } else {
        node.removeAttribute ("class");
      }
    } else if (node.hasAttribute ("class")) {
      node.removeAttribute ("class");
    }
    
    name = node.getAttribute ("__class");
    if (name) {
      p = name.indexOf (className);
      if (p != -1) {
        name = name.substr (0, p) + name.substr (p + className.length);
      }
      node.setAttribute ("__class", name);
    }
  },
  
  /**
   * 指定したノード名の親ノードを探す
   *
   * @param  HTMLElement node
   *         対象のノード
   * @param  String nodeName
   *         親ノードのノード名
   * @return HTMLElement
   *         見付からなかった場合 null
   */
  findParentNode : function (node, nodeName) {
    while (node) {
      if (node.nodeName.toLowerCase () == nodeName) {
        return node;
      }
      node = node.parentNode;
    }
    
    return null;
  },
    
  /**
   * 指定したクラス名の親ノードを探す
   *
   * @param  HTMLElement node
   *         対象のノード
   * @param  String className
   *         親ノードのクラス名
   * @return HTMLElement
   *         見付からなかった場合 null
   */
  findParentNodeByClassName : function (node, className) {
    while (node) {
      if (arAkahukuDOM.hasClassName (node, className)) {
        return node;
      }
      node = node.parentNode;
    }
    
    return null;
  },
    
  /**
   * Opera/IE の HTMLElement.getInnerText と同等の機能を提供する
   * ただし、赤福、合間合間に が追加したアンカーは削除する
   *
   * @param  HTMLElement element
   *         対象の要素
   * @return String
   *         要素の中の文字列
   */
  getInnerText : function (element) {
    if ("className" in element
        && (element.className == "akahuku_generated"
            || element.className == "aima_aimani_generated")) {
      return "";
    }
        
    if (element.nodeName.toLowerCase () == "br") {
      return "\n";
    }
    else if (element.firstChild) {
      var text = "";
      var node = element.firstChild;
      while (node) {
        text += arAkahukuDOM.getInnerText (node);
        node = node.nextSibling;
      }
      return text;
    }
    else if (element.nodeName.toLowerCase () == "#text") {
      return arAkahukuConverter.escapeEntity (element.nodeValue);
    }
    else if (element.alt) {
      return element.alt;
    }
        
    return "";
  },
    
  /**
   * Opera/IE の HTMLElement.getInnerText と同等の機能を提供する
   * ただし、赤福、合間合間に が追加したアンカーは削除する
   * さらに芝刈りを元に戻す
   *
   * @param  HTMLElement element
   *         対象の要素
   * @return String
   *         要素の中の文字列
   */
  getInnerText2 : function (element) {
    if ("className" in element
        && (element.className == "akahuku_generated"
            || element.className == "aima_aimani_generated")) {
      return "";
    }
        
    if ("hasAttribute" in element
        && element.hasAttribute ("__akahuku_troll")) {
      return element.title;
    }
    else if (element.nodeName.toLowerCase () == "br") {
      return "\n";
    }
    else if (element.firstChild) {
      var text = "";
      var node = element.firstChild;
      while (node) {
        text += arAkahukuDOM.getInnerText2 (node);
        node = node.nextSibling;
      }
      return text;
    }
    else if (element.nodeName.toLowerCase () == "#text") {
      return arAkahukuConverter.escapeEntity (element.nodeValue);
    }
    else if (element.alt) {
      return element.alt;
    }
        
    return "";
  },
    
  /**
   * タグ名と id でノードを取得する
   * 自作のドキュメントで getElementById が使用できないため
   *
   * @param  HTMLDocument targetDocument
   *         対象のドキュメント
   * @param  String tagName
   *         タグ名
   * @param  String id
   *         id
   * @return HTMLElement
   *         見付かればその要素、見付からなければ null
   */
  getElementById : function (targetDocument, tagName, id) {
    var nodes, i;
        
    nodes = targetDocument.getElementsByTagName (tagName);
    for (i = 0; i < nodes.length; i ++) {
      if ("id" in nodes [i]
          && nodes [i].id == id) {
        return nodes [i];
      }
      if (nodes [i].getAttribute ("__id") == id) {
        return nodes [i];
      }
    }
        
    return null;
  },
  
  /**
   * 続く BR を探す
   *
   * @param  HTMLElement node
   *         開始要素の次の要素
   * @return HTMLElement
   *         BR もしくは null
   */
  findBR : function (node) {
    var n2 = node;
    while (n2) {
      var nn = n2.nodeName.toLowerCase ();
      if (nn == "#text") {
        n2 = n2.nextSibling;
      }
      else if (nn == "br") {
        return n2;
      }
      else {
        break;
      }
    }
    return null;
  },

  /**
   *  危険な要素を除外しながら innerHTML と同等に子要素を構築する
   *
   * @param  HTMLElement targetElement
   *         対象の要素
   * @param  String htmlText
   *         HTMLの部分テキスト
   */
  setInnerHTMLSafely : function (targetElement, htmlText)
  {
    while (targetElement.lastChild) {
      targetElement.removeChild (targetElement.lastChild);
    }

    try {
      // require: Gecko 1.8/Firefox 1.5 +
      var unescaper
        = Components.classes ["@mozilla.org/feed-unescapehtml;1"]
        .getService (Components.interfaces.nsIScriptableUnescapeHTML);
      var fragment
        = unescaper.parseFragment (htmlText, false, null, targetElement);
      targetElement.appendChild (fragment);
    }
    catch (e) { Akahuku.debug.exception (e);
      // 最悪でもテキストとしてセットしてあげる
      var text = targetElement.ownerDocument.createTextNode (htmlText);
      targetElement.appendChild (text);
    }
  },

  /**
   * タグ名とクラス名で子ノードを1つ取得する
   * (頻出パターンの可読性を上げる)
   *
   * @param  HTMLElement targetElement
   *         対象の要素
   * @param  String tagName
   *         タグ名
   * @param  String className
   *         クラス名、未指定ならクラス名で絞り込まない
   * @return HTMLElement
   *         見付かればその要素、見付からなければ null
   */
  getFirstElementByNames : function (targetElement, tagName, className) {
    var nodes, i;
        
    nodes = targetElement.getElementsByTagName (tagName);
    if (className) {
      for (i = 0; i < nodes.length; i ++) {
        if ("className" in nodes [i]
            && nodes [i].className == className) {
          return nodes [i];
        }
      }
    }
    else {
      return nodes [0];
    }
        
    return null;
  },
  
};

/**
 * ノードのインラインスタイル (CSS) を操作するサブモジュール
 * (Node.style プロパティの有無にかかわらず)
 */
arAkahukuDOM.Style = new function () {
  "use strict";

  this.setProperty = function (node, propertyName, value) {
    var styles = new StyleDeclaration ();
    styles.importText (node.getAttribute ("style"));
    styles.setProperty (propertyName, value);
    node.setAttribute ("style", styles.getCssText ());
  };
  this.removeProperty = function (node, propertyName, optWild) {
    var styles = new StyleDeclaration ();
    styles.importText (node.getAttribute ("style"));
    styles.removeProperty (propertyName);
    if (optWild) { // 短縮形がカバーするプロパティまで削除する
      var pattern = _getShorthandPattern (propertyName);
      if (pattern) {
        for (var i = styles.getLength () - 1; i >= 0; i --) {
          if (pattern.test (styles.getPropertyAt (i).name)) {
            styles.removePropertyAt (i);
          }
        }
      }
    }
    node.setAttribute ("style", styles.getCssText ());
  };

  // 短縮形 
  const SHORTHANDS = [
    {name:"border",         pattern:/^border(|(-(top|right|bottom|left))?(-width|-style|-color))$/},
    {name:"margin",         pattern:/^margin(-(top|right|bottom|left))?$/},
    {name:"padding",        pattern:/^padding(-(top|right|bottom|left))?$/},
    {name:"font",           pattern:/^font(-(style|variant|weight|size|height|family))?$/},
    {name:"border-radius",  pattern:/^border(-(top|bottom)-(left|right))?-radius$/},
    {name:"border-top",     pattern:/^border-top(-width|-style|-color)?$/},
    {name:"border-right",   pattern:/^border-right(-width|-style|-color)?$/},
    {name:"border-bottom",  pattern:/^border-bottom(-width|-style|-color)?$/},
    {name:"border-left",    pattern:/^border-left(-width|-style|-color)?$/},
    {name:"border-color",   pattern:/^border(-(top|right|bottom|left))?-color$/},
    {name:"border-style",   pattern:/^border(-(top|right|bottom|left))?-style$/},
    {name:"border-width",   pattern:/^border(-(top|right|bottom|left))?-width$/},
    {name:"background",     pattern:/^background(-(color|image|position|repeat|size|attachment))?$/},
    {name:"columns",        pattern:/^column(s|-width|-count)$/},
    {name:"column-rule",    pattern:/^column-rule(-(width|style|color))?$/},
    {name:"list-style",     pattern:/^list-style(-(type|image|position))?$/},
    {name:"outline",        pattern:/^outline(-(style|width|color))?$/},
    {name:"transition",     pattern:/^transition(-(property|duration|timing-function|delay))?$/},
  ];
  function _getShorthandPattern (name) {
    for (var i = 0; i < SHORTHANDS.length; i ++) {
      if (SHORTHANDS [i].name === name) {
        return SHORTHANDS [i].pattern;
      }
    }
    return null;
  };

  /**
   * minimum CSS property & property list classes
   */
  function Property (name, value, priority) {
    this.name = name.toLowerCase ();
    this.value = value;
    this.priority = priority || "";
  };
  Property.prototype = {
    getCssText : function () {
      return this.name + ": " + this.getValue () + ";"
    },
    getValue : function () {
      var val = this.value;
      if (this.priority) {
        val += " !" + this.priority;
      }
      return val;
    },
  };
  function StyleDeclaration (text) {
    this._item = [];
    if (text) this.importText (text);
  };
  StyleDeclaration.prototype = {
    getLength: function () {
      return this._item.length;
    },
    getCssText : function () {
      var val = "";
      for (var i = 0; i < this._item.length; i ++) {
        val += this._item [i].getCssText ();
      }
      return val;
    },
    // see browser/devtools/styleinspector/CssRuleView.jsm
    // (mozilla-central/rev/7fb03c72dbb0 (2012-01-20 16:36 +0100))
    CSS_LINE_RE: /(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g,
    CSS_PROP_RE: /\s*([^:\s]*)\s*:\s*(.*?)\s*(?:!\s*(important))?;?$/,
    importText: function (text) {
      if (!text) return;
      var properties = text.match (this.CSS_LINE_RE);
      for (var i = 0; i < properties.length; i ++) {
        var matches = this.CSS_PROP_RE.exec (properties [i]);
        if (!matches) continue;
        this.setProperty (matches [1], matches [2], matches [3]);
      }
    },
    getPropertyIndex: function (name) {
      for (var i = 0; i < this._item.length; i ++) {
        if (this._item [i].name === name) {
          return i;
        }
      }
      return -1;
    },
    getPropertyAt: function (index) {
      return this._item [index];
    },
    removePropertyAt: function (index)
    {
      var prop = this._item [index];
      if (prop) {
        this._item.splice (index, 1);
        return prop;
      }
      return null;
    },
    setProperty: function (name, value, priority) {
      var prop = this.getProperty (name);
      if (prop)
        prop.setValue (value, priority);
      else
        this._item.push (new Property (name, value, priority));
      return;
    },
    getProperty: function (name) {
      var i = this.getPropertyIndex (name);
      if (i < 0) return null;
      return this.getPropertyAt (i);
    },
    removeProperty: function (name) {
      var i = this.getPropertyIndex (name);
      return this.removePropertyAt (i);
    },
    getPropertyValue: function (name) {
      var prop = this.getProperty (name);
      if (prop)
        return prop.getValue ();
      else
        return null;
    },
  };

};

