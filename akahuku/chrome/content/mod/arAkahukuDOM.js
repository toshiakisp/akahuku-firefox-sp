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
      node.setAttribute ("class", name);
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
  }
};
