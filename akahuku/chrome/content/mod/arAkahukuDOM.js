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
   * ノードを複製する
   *
   * @param  HTMLElement node 元のノード
   * @param  Boolean deeply 子孫ノードも複製するかどうか
   * @param  Object conf [optional]挙動設定
   * @return HTMLElement
   *         複製されたノード or null
   */
  cloneNodeCustom : function (node, deeply, conf) {
    conf = conf || {};

    // 場合によっては複製せず null を返す
    if (conf.exculdeIds &&
        conf.exculdeIds instanceof Array &&
        typeof node.id !== "undefined") {
      // 特定IDの要素を複製しない
      for (var n = 0; n < conf.exculdeIds.length; n ++) {
        if (node.id == conf.exculdeIds [n]) {
          return null;
        }
      }
    }
    if (conf.exculdeClasses &&
        conf.exculdeClasses instanceof Array &&
        typeof node.getAttribute !== "undefined") {
      // 特定クラス名の要素を複製しない
      for (var n = 0; n < conf.exculdeClasses.length; n ++) {
        if (arAkahukuDOM.hasClassName (node, conf.exculdeClasses [n])) {
          return null;
        }
      }
    }

    var dupNode = node.cloneNode (false);

    var nodeName = node.nodeName.toLowerCase ();
    if (conf.noMediaAutoPlay &&
        (nodeName == "video" || nodeName == "audio")) {
      // HTMLMediaElement を自動再生させない
      if (dupNode.autoplay) {
        dupNode.autoplay = false;
        var srcOrig = node.getAttribute ("src");
        if (srcOrig) {
          // 確実に autoplay させない
          dupNode.removeAttribute ("src");
          dupNode.load ();
          dupNode.setAttribute ("src", srcOrig);
          dupNode.load ();
        }
      }
    }

    if (conf.stripId &&
        typeof dupNode.removeAttribute !== "undefined") {
      dupNode.removeAttribute ("id");
    }

    if (conf.stopNodes && conf.stopNodes instanceof Array) {
      // 特定ノード以下の子孫の複製は省く
      for (var n = 0; n < conf.stopNodes.length; n ++) {
        if (conf.stopNodes [n] === node) {
          deeply = false;
          break;
        }
      }
    }

    node = node.firstChild;
    while (deeply && node) {
      var newChild = arAkahukuDOM.cloneNodeCustom (node, deeply, conf);
      if (newChild) {
        dupNode.appendChild (newChild);
      }
      node = node.nextSibling;
    }
    return dupNode;
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
    if (node.hasAttribute ("__class")) {
      return node.getAttribute ("__class");
    }
    if ("className" in node) {
      return node.className;
    }
    if (node.hasAttribute ("class")) {
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
    var hasToken = function (node, attr, token) {
      var value = node.getAttribute (attr);
      value = value.replace (/^\s+|\s+$/g, "");
      var tokens = value.split (/\s+/);
      return (tokens.indexOf (token) !== -1);
    };
    if (!node.getAttribute) {
      return false;
    }
    if (node.hasAttribute ("class")) {
      if (node.classlist) {
        // requires Gecko 1.9.2 (Firefox 3.6) or above
        return node.classList.contains (className);
      }
      return hasToken (node, "class", className);
    }
    else if (node.hasAttribute ("__class")) {
      return hasToken (node, "__class", className);
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
    if (node.classList) {
      // requires Gecko 1.9.2 (Firefox 3.6) or above
      node.classList.add (className);
      return;
    }

    if (!arAkahukuDOM.hasClassName (node, className)) {
      node.className
        = (node.className ? node.className + " " : "") + className;
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
    var removeTokenFrom = function (node, attr, token) {
      if (!node.hasAttribute (attr)) {
        return;
      }
      var value = node.getAttribute (attr).replace (/^\s+|\s+$/g, "");
      var tokens = value.split (/\s+/);
      var index = tokens.indexOf (token);
      if (index !== -1) {
        tokens.splice (index, 1);
        if (tokens.length > 0) {
          node.setAttribute (attr, tokens.join (" "));
        }
        else {
          node.removeAttribute (attr);
        }
      }
    };

    if (node.classList) {
      // requires Gecko 1.9.2 (Firefox 3.6) or above
      node.classList.remove (className);
    }
    else {
      removeTokenFrom (node, "class", className);
    }
    removeTokenFrom (node, "__class", className);
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
      // sanitize by nsIParserUtils (Gecko14+)
      // (nsIScriptableUnescapeHTML is obsolete)
      if ("@mozilla.org/parserutils;1" in Components.classes) {
        var parserUtils
          = Components.classes ["@mozilla.org/parserutils;1"]
          .getService (Components.interfaces.nsIParserUtils);
        if (typeof (parserUtils.parseFragment) === "function") {
          var flags
            = parserUtils.SanitizerDropForms
            | parserUtils.SanitizerDropMedia;
          var fragment
            = parserUtils.parseFragment
            (htmlText, flags, false, null, targetElement);
          targetElement.appendChild (fragment);
          return;
        }
      }
    }
    catch (e) { Akahuku.debug.exception (e);
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
    if (targetElement.querySelector) {
      // requires Gecko 1.9.1 (Firefox 3.5) or above
      var selector = (tagName || "") + (className ? "." + className : "");
      return (selector ? targetElement.querySelector (selector) : null);
    }

    var nodes, i;

    if (!tagName) {
      if (className) {
        nodes = targetElement.getElementsByClassName (className);
      }
      return ((nodes && nodes.length > 0) ? nodes [0] : null);
    }
        
    nodes = targetElement.getElementsByTagName (tagName);
    if (className) {
      for (i = 0; i < nodes.length; i ++) {
        if ("className" in nodes [i]
            && nodes [i].className == className) {
          return nodes [i];
        }
      }
    }
    else if (nodes && nodes.length > 0) {
      return nodes [0];
    }
        
    return null;
  },

  /**
   * タグ名とクラス名で子ノードのリスト(非 live)を取得する
   * @param  HTMLElement 対象の要素
   * @param  String タグ名
   * @param  String クラス名、未指定ならクラス名で絞り込まない
   * @return NodeList (あるいはArray)
   */
  getElementsByNames : function (targetElement, tagName, className) {
    if (targetElement.querySelectorAll) {
      // requires Gecko 1.9.1 (Firefox 3.5) or above
      var selector = (tagName || "") + (className ? "." + className : "");
      return targetElement.querySelectorAll (selector);
    }

    var nodes = [];
    var filterClass = false;

    if (!tagName) {
      if (className) {
        nodes = targetElement.getElementsByClassName (className);
      }
    }
    else {
      nodes = targetElement.getElementsByTagName (tagName);
      filterClass = true;
    }

    // 非 live 化
    var list = [];
    for (var i = 0; i < nodes.length; i ++) {
      if (filterClass &&
          arAkahukuDOM.hasClassName (nodes [i], className)) {
        continue;
      }
      list.push (nodes [i]);
    }
    return list;
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

/**
 * factory of DOM Mutation Observer for DOM3/4
 */
arAkahukuDOM.createMutationObserver = function (callback, optNode) {
  if (optNode && optNode instanceof Components.interfaces.nsIDOMDocument
      && "MutationObserver" in optNode.defaultView) {
    return new optNode.defaultView
      .MutationObserver (callback);
  }
  if (optNode && optNode instanceof Components.interfaces.nsIDOMElement
      && "MutationObserver" in optNode.ownerDocument.defaultView) {
    return new optNode.ownerDocumenet.defaultView
      .MutationObserver (callback);
  }
  if (typeof (MutationObserver) != "undefined") {
    return new MutationObserver (callback);
  }

  return new arAkahukuDOM.MutationObserverOnDOM3 (callback);
};

/**
 * DOM3 Mutation Events で DOM4 の Mutation Observer を真似る
 */
arAkahukuDOM.MutationObserverOnDOM3 = function (callback) {
  this._callback = callback;
  this._targets = [];
  this._options = [];
  this._handles = [];
  this._timer = null;
  this._queue = [];
  this._incomingQueue = [];
  this._applying = false;
};
arAkahukuDOM.MutationObserverOnDOM3.prototype = {
  observe : function (target, options) {
    if (!(options.childList || options.attributes || options.characterData)) {
      throw new SyntaxError ();
    }
    if (options.attributeOldValue && !options.attributes) {
      throw new SyntaxError ();
    }
    if (options.attributeFilter && options.attributeFilter.length > 0
        && !options.attributes) {
      throw new SyntaxError ();
    }
    if (options.characterDataOldValue  && !options.characterData) {
      throw new SyntaxError ();
    }

    // if target is already asociated, replace options
    for (var i = 0; i < this._targets.length; i++) {
      if (this._targets [i] == target) {
        this._disconnectFromTargetAt (i);
        this._targets.splice (i, 1);
        this._options.splice (i, 1);
        this._handles.splice (i, 1);
        break;
      }
    }

    var mo = this;
    var handler = function (event) {
      try {
      var record = mo._createMutationRecord (event, target, options);
      if (!record) {
        return;
      }
      mo._appendToQueue (record);

      if (!mo._timer) {
        mo._timer
        = target.ownerDocument.defaultView.setTimeout
        (function () {
          mo._timer = null;
          mo._applying = true;
          try {
            // "Invoke _mo_'s callback with _queue_ as first argument,
            // and _mo_ (itself) as second argument and callback this value."
            mo._callback.apply (mo, [mo._queue, mo]);
          }
          catch (e) { Akahuku.debug.exception (e);
          }
          finally {
            mo._applying = false;
            mo._queue = mo._incomingQueue;
            mo._incomingQueue = [];
          }
        }, 0);
      }
      } catch (e) {Akahuku.debug.exception (e);}
    };
    this._targets.push (target);
    this._options.push (options);
    this._handles.push (handler);

    var targetEvents = this._optionsToEvents (options);
    for (var i = 0; i < targetEvents.length; i ++) {
      target.addEventListener (targetEvents [i], handler, false);
    }
  },

  disconnect : function () {
    for (var i = 0; i < this._targets.length; i ++) {
      this._disconnectFromTargetAt (i);
    }
    this._targets.splice (0);
    this._options.splice (0);
    this._handles.splice (0);
    window.clearTimeout (this._timer);
    // "empty context object's record queue."
    this._queue.splice (0);
    this._incomingQueue.splice (0);
  },

  _disconnectFromTargetAt : function (index) {
    var target = this._targets [index];
    var options = this._options [index];
    var handler = this._handles [index];
    var targetEvents = this._optionsToEvents (options);
    for (var i = 0; i < targetEvents.length; i ++) {
      target.removeEventListener (targetEvents [i], handler, false);
    }
  },

  _appendToQueue : function (record) {
    (this._applying ? this._incomingQueue : this._queue).push (record);
  },

  _optionsToEvents : function (options) {
    var types = [];
    if ("childList" in options && options.childList) {
      types.push ("DOMNodeInserted");
      types.push ("DOMNodeRemoved");
    }
    if ("attributes" in options && options.attributes) {
      types.push ("DOMAttrModified");
    }
    if ("characterData" in options && options.characterData) {
      types.push ("DOMCharacterDataModified");
    }
    return types;
  },

  _createMutationRecord : function (event, target, options) {
    function isTarget () {
      if (("subtree" in options && options.subtree)
          || record.target == target) {
        return true;
      }
      return false;
    }
    var record = {
      type : "",
      target : event.target,
      addedNodes : null,
      removedNodes : null,
      previousSibling : null,
      nextSibling : null,
      attributeName : null,
      attributeNamespace : null,
      oldValue : null,
    };
    switch (event.type) {
      case "DOMAttrModified":
        if ("attributes" in options && options.attributes) {
          if (!isTarget ()) return null;
          record.type = "attributes";
          if ("attributeFilter" in options && options.attributeFilter) {
            for (var i = 0; i < options.attributeFilter.length; i ++) {
              if (options.attributeFilter [i] == event.attrName) {
                return null;
              }
            }
          }
          record.attributeName = event.attrName;
          record.attributeNamespace = null;//TODO
          if ("attributeOldValue" in options && options.attributeOldValue) {
            var recordWithOldValue = record.clone ();
            recordWithOldValue.oldValue = event.prevValue;
            this._appendToQueue (recordWithOldValue);
          }
        }
        break;
      case "DOMCharacterDataModified":
        if ("characterData" in options && options.characterData) {
          if (!isTarget ()) return null;
          record.type = "characterData";
          if ("characterDataOldValue" in options && options.characterDataOldValue) {
            var recordWithOldValue = record.clone ();
            recordWithOldValue.oldValue = event.prevValue;
            this._appendToQueue (recordWithOldValue);
          }
        }
      case "DOMNodeInserted":
      case "DOMNodeRemoved":
        if ("childList" in options && options.childList) {
          record.target = event.relatedNode;// parent node of the node that has been inserted/removed
          if (!isTarget ()) return null;
          record.type = "childList";
          var addedNodes = [];
          var removedNodes = [];
          if (event.type == "DOMNodeInserted") {
            addedNodes.push (event.target);
          }
          else {
            removedNodes.push (event.target);
          }
          record.addedNodes = addedNodes;
          record.removedNodes = removedNodes;
          record.previousSibling = event.target.previousSibling;
          record.nextSibling = event.target.nextSibling;
        }
        break;
      default:
        Akahuku.debug.warn ("Unexpected event type: " + event.type);
    }

    return (record.type ? record : null);
  },

};

