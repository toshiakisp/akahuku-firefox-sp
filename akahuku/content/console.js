/**
 * For debug
 */
'strict mode';

function AkahukuConsole(optPrefix) {
  this.enabled = true;
  this.prefix = optPrefix || "Akahuku";
  this._prefixSep = ": ";
};
AkahukuConsole.prototype = {

  log: function() {
    if (!this.enabled) return;
    console.log(this._format(arguments));
  },

  info: function() {
    if (!this.enabled) return;
    console.info(this._format(arguments));
  },

  warn: function() {
    if (!this.enabled) return;
    console.warn(this._format(arguments));
  },

  error: function() {
    if (!this.enabled) return;
    console.error(this._format(arguments));
  },

  exception: function(error) {
    if (!this.enabled) return;
    var err_str = String(error);
    var str = this.prefix + this._prefixSep;
    str += 'Exception: ' + err_str;
    if ('stack' in error && typeof(error.stack) === 'string') {
      let traces = error.stack.split(/\r\n|\r|\n/);
      if (traces.length > 0) {
        let ext_match = traces[0].match(/@moz-extension:\/\/[^\/]+/);
        let n = 0;
        const maxTraceLines = 5;
        traces.forEach((t, i) => {
          if (!t) return;
          n += 1;
          if (n == maxTraceLines
            && i < traces.length-1) {
            str += '\n\t...';
          }
          else if (n <= maxTraceLines) {
            str += '\n\t';
            if (ext_match) {
              str += t.replace(ext_match[0],'\t');
            }
            else {
              str += t.replace(/@/,'\t');
            }
          }
        });
      }
    }
    console.warn(str);
  },

  _format: function(messages)
  {
    var str = this.prefix + this._prefixSep;
    for (let i = 0; i < messages.length; i++) {
      str += this._toString(messages [i]);
      if (i < messages.length-1) {
        str += " ";
      }
    }
    return str;
  },
  _toString: function(message)
  {
    var str = "";
    if (message !== null && typeof message === "object") {
      if ("nodeName" in message) { // Node
        str += this._NodeToString(message);
      }
      else if ("cancelable" in message) { // Event
        str += this._DOMEventToString(message);
      }
      else if (typeof JSON === "object") {
        str += "[" + typeof message;
        if (typeof Symbol !== "undefined"
            && typeof Symbol.toStringTag !== "undefined"
            && message [Symbol.toStringTag]) {
          // require Firefox 51.0+
          str += " " + message [Symbol.toStringTag];
        }
        str += "]";
        try {
          str += JSON.stringify(message);
        }
        catch (e) {
        }
      }
      else {
        str += String(message);
      }
    }
    else {
      try {
        str += String(message);
      }
      catch (e) {
        str += "[" + typeof message + "]";
      }
    }
    return str;
  },

  tic: function() {
    var start = new Date();
    start.toc = function(){
      let now = new Date();
      let ms = now.getTime() - this.getTime();
      this.setTime(now.getTime());
      return ms;
    };
    return start;
  },

  _DOMEventToString: function(event)
  {
    var str = "Event(" + event.type;
    str += " target=" + this._toString(event.target);
    if (event.originalTarget
        && event.target !== event.originalTarget) {
      str += " originalTarget=" + this._toString(event.originalTarget);
    }
    if (event.explicitOriginalTarget
        && event.target !== event.explicitOriginalTarget) {
      str += " explicitoriginalTarget=" + this._toString(event.explicitOriginalTarget);
    }
    str += " bubbles=" + event.bubbles;
    str += " cancelable=" + event.cancelable;
    str += ")";
    return str;
  },

  _NodeToString: function(node)
  {
    var str = String(node.nodeName);
    var cur = node;
    while (cur.parentNode) {
      str = cur.parentNode.nodeName + ">" + str;
      cur = cur.parentNode;
    }
    if (node.nodeType == node.DOCUMENT_NODE) {
      str += "(" + String(node.location) + ")";
    }
    return str;
  },

  nsresultToString: function(code) {
    return "(0x" + code.toString(16) + ")";
  },
};

