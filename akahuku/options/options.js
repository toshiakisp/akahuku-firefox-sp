'use strict';

function warn(...args) {
  console.warn('akahuku-ext/options:',...args);
}
function error(...args) {
  console.error('akahuku-ext/options: ERROR',...args);
}

function setFormInputs(prefs, temporal=false) {
  for (let key in prefs) {
    let nodes = document.getElementsByName(key);
    if (nodes.length == 0) {
      warn('No node has a pref name: ' + key);
      continue;
    }
    for (let i = 0; i < nodes.length; i ++) {
      let node = nodes[i];
      if (node.tagName == 'TABLE' && node.classList.contains('listbox')) {
        // listbox
        gListboxManager.fromString(node.id, unescape(prefs[key]));
        continue;
      }
      if (!node.form) { // HTMLInputElement
        warn('unexpeced node has a name: ' + key);
        continue;
      }
      switch (node.type) {
        case 'checkbox':
          node.checked = prefs[key];
          // fire emulated change event for grouping
          node.dispatchEvent(new Event('change'));
          if (!temporal)
            node.dataset.prefChecked = node.checked;
          break;
        case 'radio':
          if (node.value == prefs[key]) {
            node.checked = true;
            // fire emulated change event for deck control
            node.dispatchEvent(new Event('change'));
          }
          if (!temporal)
            node.dataset.prefChecked = node.checked;
          break;
        case 'select-one': {
          let selected = false;
          for (let opt of node.options) {
            if (opt.value == prefs[key]) {
              opt.selected = true;
              if (!temporal)
                opt.dataset.prefSelected = true;
              selected = true;
              break;
            }
          }
          if (!selected) {
            warn('A "select-one" type node for', key,
              'has no option for', prefs[key]);
            continue;
          }
          break;
        }
        case 'number':
          node.valueAsNumber = prefs[key];
          if (!temporal)
            node.dataset.prefValue = node.value;
          break;
        case 'text':
        case 'textarea':
          node.value = unescape(prefs[key]);
          if (!temporal)
            node.dataset.prefValue = node.value;
          break;
        case 'hidden': {
          node.value = prefs[key];
          let nx = node.nextElementSibling;
          if (nx && nx.classList.contains('hiddeninput-label')) {
            nx.innerText = prefs[key];
          }
          break;
        }
        default:
          warn('Unsupported node type', node.type, 'has a name:', key);
      }
    }
  }
}

function getFormInputs(prefs) {
  let newPrefs = {};
  for (let key in prefs) {
    newPrefs[key] = prefs[key];
    let nodes = document.getElementsByName(key);
    for (let node of nodes) {
      if (node.tagName == 'TABLE' && node.classList.contains('listbox')) {
        // listbox
        prefs[key] = escape(gListboxManager.toString(node.id));
        continue;
      }
      if (!node.form) { // HTMLInputElement
        warn('Unexpeced node has a name:', key);
        continue;
      }
      switch (node.type) {
        case "checkbox":
          newPrefs[key] = node.checked;
          break;
        case "radio":
          if (node.checked) {
            newPrefs[key] = node.value;
          }
          break;
        case "text":
        case "textarea":
          newPrefs[key] = escape(node.value);
          break;
        case 'number':
          newPrefs[key] = node.valueAsNumber;
          break;
        case "select-one": {
          let v = node.options[node.selectedIndex].value;
          if (node.dataset.prefType == 'int')
            v = parseInt(v);
          else if (node.dataset.prefType == 'float')
            v = parseFloat(v);
          else if (node.dataset.prefType)
            warn('Unkown pref-type specified:', node.dataset.prefType);
          newPrefs[key] = v;
          break;
        }
      }
    }
  }
  return newPrefs;
}

/* listbox UI by table */

let gListboxManager = {
  _lists: new Map(),
  register: function (listbox) {
    this._lists.set(listbox.id, listbox);
  },

  parseString: function (value) {
    try {
      var values = JSON.parse(value);
      if (values.length) {
        while (values.length && values [0] == undefined) {
          values.shift ();
        }
        if (values.length) {
          return values;
        }
        else { // 中身が全部 undefined
          return [];
        }
      }
      else {
        return values;
      }
    }
    catch (e) {
      return [];
    }
  },

  toString: function (id) {
    var values = [];
    var listbox = this._lists.get(id)
    if (!listbox) {
      return 'null';
    }
    for (let value of listbox) {
      values.push(value);
    }
    return JSON.stringify (values);
  }, 
  
  fromString: function (id, s) {
    var values = this.parseString(s);
    let list = this._lists.get(id)
    if (values.length == 0 || !list) {
      return;
    }
    list.clear();
    for (var i = 0; i < values.length; i ++) {
      list.addItem(values [i], null);
    }
  },
  
  onSelect : function (id) {
    var listInfo = AkahukuOptions.listList [id];
    
    var listbox = document.getElementById (id + "_list");
      
    if (listbox.selectedIndex != -1) {
      var value = this.getItem (listbox.selectedItem);
      
      listInfo.onSelect (value);
      
      document.getElementById (id + "_modify").disabled
        = !listInfo.isEnabled ()
        || (listbox.selectedCount > 1);
    }
  },
  
  onKeyDown : function (id, event) {
    if (event.keyCode == 8 || event.keyCode == 46) {
      this.onDelete (id);
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
        var value2 = this.getItem (node2);
        if (node2 != node
            && listInfo.isSame (value, value2)) {
          exist = true;
          break;
        }
      }
      node2 = nextNode2;
    }
    
    if (!exist) {
      this.addItem (id, value, node);
      
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
    // move to ListboxTable.addItem
  },
  
  getItem : function (listitem) {
    var s = unescape (listitem.firstChild.getAttribute ("value"));
    var v = JSON.parse (s);
    return v;
  },
  
  onMouseDown : function (id, event) {
    var listInfo = AkahukuOptions.listList [id];
    
    var listitem = event.target;
    if (listitem.nodeName.toLowerCase () != "listitem") {
      return;
    }
    
    var value = this.getItem (listitem);
    
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
    
    this.addItem (id, value, listitem);
  }
};

class ListboxTable {
  constructor(id, listInfo) {
    this.node = document.getElementById(id);
    this.id = id;
    this.listInfo = listInfo;
    this.seltypeMultiple = false;
    if (this.node.dataset.listboxSeltype == 'multiple') {
      this.seltypeMultiple = true;
    }

    this.selectedItem = null;
    this.selectedItems = [];

    this.node.addEventListener('click', (event) => {
      this.onClick(event);
    }, false);

    if (this.listInfo.itemDefinitions) {
      this.node.addEventListener('select', (event) => {
        this.onSelect(event);
      }, false);
    }

    this.node.addEventListener("keydown", (event) => {
      this.onKeyDown(id, event);
    }, false);
    
    /* Connect to control buttons
    id = id.replace(/_list$/, '');
    let node = document.getElementById (id + "_add");
    node.addEventListener("command", () => {
      this.onAdd (id, false);
    }, false);

    node = document.getElementById (id + "_modify");
    node.addEventListener("command", () => {
      this.onAdd (id, true);
    }, false);
    
    node = document.getElementById (id + "_moveup");
    node.addEventListener("command", () => {
      this.onMoveUp (id);
    }, false);
    
    node = document.getElementById (id + "_movedown");
    node.addEventListener("command", () => {
      this.onMoveDown (id);
    }, false);

    node = document.getElementById (id + "_delete");
    node.addEventListener("command", () => {
      this.onDelete (id);
    }, false);
    */
  }

  clear() {
    let tbody = this.node.querySelector(':scope tbody');
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
  }

  addItem(value, listitem) {
    var append = false;
    if (!listitem) {
      append = true;
      listitem = document.createElement('tr');
      for (let i = 0; i < this.listInfo.columns.length; i++) {
        let listcell = document.createElement('td');
        listitem.appendChild(listcell);
      }
    }
    
    let listcell = listitem.firstChild;
    listcell.dataset.value = escape(JSON.stringify(value));

    for (let i = 0; i < this.listInfo.columns.length; i++) {
      let v = this.listInfo.columns [i][1] (value);
      
      if (this.listInfo.columns [i][0] == "check") {
        listcell.setAttribute ("class", "listcell-iconic");
        listcell.dataset.checked = !!v;
      }
      else {
        listcell.innerText = v;
      }
      listcell = listcell.nextSibling;
    }
    
    if (append) {
      let tbody = this.node.querySelector(':scope tbody');
      tbody.appendChild (listitem);
    }
  }

  getItem(listitem) {
    return JSON.parse(unescape(listitem.firstChild.dataset.value));
  }

  [Symbol.iterator]() {
    let tbody = this.node.querySelector(':scope tbody');
    let item = tbody.firstElementChild;
    return {
      next() {
        if (item) {
          let listcell = item.firstElementChild;
          if (listcell) {
            let s = unescape(listcell.dataset.value);
            item = item.nextElementSibling;
            return {done: false, value: JSON.parse(s)}
          }
        }
        return {done: true}
      }
    }
  }

  onClick(event) {
    if (event.target.tagName != 'TD'
      || event.currentTarget.tagName != 'TABLE')
      return;
    let table = event.currentTarget;
    let td = event.target;
    if (td.parentNode.tagName != 'TR')
      return;
    let tr = td.parentNode;
    if (tr.parentNode.tagName == 'TBODY') {
      let items = tr.parentNode.querySelectorAll(':scope tr');
      let selected = [];
      if (this.seltypeMultiple && event.ctrlKey) {
        // Add/remove from selection
        tr.dataset.selected = !(tr.dataset.selected == 'true');
        for (let i=0; i < items.length; i++) {
          if (items[i].dataset.selected == 'true')
            selected.push(items[i]);
        }
      }
      else if (this.seltypeMultiple && event.shiftKey) {
        // Select range
        if (!this.selectedItem) {
          this.selectedItem = (items.length > 0 ? items[0] : null);
        }
        if (tr === this.selectedItem) {
          for (let i=0; i < items.length; i++) {
            items[i].dataset.selected = 'false';
          }
          tr.dataset.selected = 'true';
          selected = [tr];
        }
        else {
          let range = [tr, this.selectedItem];
          let selecting = false;
          for (let i=0; i < items.length; i++) {
            let item = items[i];
            if (range.includes(item)) {
              range.splice(i, 1);
              item.dataset.selected = 'true';
              selected.push(item);
              selecting = !selecting;
            }
            else {
              item.dataset.selected = (selecting ? 'true' : 'false');
              if (selecting)
                selected.push(item);
            }
          }
        }
      }
      else {
        for (let i=0; i < items.length; i++) {
          items[i].dataset.selected = 'false';
        }
        tr.dataset.selected = 'true';
        this.selectedItem = tr;
        selected = [tr];
      }
      this.selectedItems = selected;

      if (selected.length > 0) {
        let ev = new CustomEvent('select', {
          bubbles: false,
          cancelable: false,
          detail: this,
        });
        table.dispatchEvent(ev);
      }
    }
  }

  onSelect(event) {
    if ('itemDefinitions' in this.listInfo) {
      let json = this.getItem(this.selectedItem);
      this.extractValuesToEdit(json);
    }
  }

  extractValuesToEdit(json, defs=undefined) {
    if (!defs) {
      defs = this.listInfo.itemDefinitions;
    }
    for (let def of defs) {
      if (def.type == 'id') {
        let id = this.listInfo.itemIdPrefix + def.value;
        let node = document.getElementById(id);
        if (node) {
          if (node.type == 'checkbox') {
            node.checked = json[def.value];
            node.dispatchEvent(new Event('change'));
          }
          else if ('value' in node) {
            node.value = json[def.value];
          }
        }
        else {
          console.warn('Node not found:', id);
        }
      }
      else if (def.type == 'radio') {
        let nodes = document.getElementsByName(def.name);
        for (let node of nodes) {
          if (node.type == 'radio'
            && node.value == json[def.value]) {
            node.checked = true;
            node.dispatchEvent(new Event('change'));
            if (def.cases) {
              for (let key of Object.getOwnPropertyNames(def.cases)) {
                if (node.value == key || key == '_default') {
                  this.extractValuesToEdit(json, def.cases[key]);
                  break;
                }
              }
            }
            break;
          }
        }
      }
      else {
        console.warn('Unknown type of item definition:', def.type);
      }
    }
  };
}


gListboxManager.register(new ListboxTable('saveimage_base_list', {
  itemIdPrefix: 'saveimage_base_',
  itemDefinitions: [
    {type: 'id', value: 'name', initial: ''},
    {type: 'id', value: 'dir', initial: ''},
    {type: 'id', value: 'dialog', initial: false},
    {type: 'id', value: 'dialog_keep', initial: false},
    {type: 'id', value: 'instantsrc', initial: false},
    {type: 'id', value: 'instantsrc_always', initial: false},
    {type: 'id', value: 'key'},
    {type: 'radio', name: 'saveimage.base.subdir', value: 'subdir_type',
      cases: {
        'expert': [
          {type: 'id', value: 'subdir_format'},
        ],
        '_default': [
          {type: 'id', value: 'subdir_url'},
          {type: 'id', value: 'subdir_board'},
          {type: 'id', value: 'subdir_server'},
          {type: 'id', value: 'subdir_dir'},
          {type: 'id', value: 'subdir_thread'},
          {type: 'id', value: 'subdir_msg8b'},
        ],
      },
    },
  ],
  editControls: [
    {type: 'add', id: 'add'},
    {type: 'modify', id: 'modify'},
    {type: 'moveUp', id: 'moveup'},
    {type: 'moveDown', id: 'movedown'},
    {type: 'delete', id: 'delete'},
  ],
  
  checkError : function (value) {
    if (value.dir == "") {
      return "\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u7A7A\u3067\u3059";
    }
    
    return "";
  },
  
  isEnabled : function () {
    return true;
  },

  columns : [
    ["text", (value) => value.name],
    ["text", (value) => value.dir],
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
    ["check", (value) => value.dialog, (value) => {
       value.dialog = !value.dialog;
     }],
    ["check", (value) => value.dialog_keep, (value) => {
       value.dialog_keep = !value.dialog_keep;
     }],
    ["text", (value) => value.key],
    ["check", (value) => value.instantsrc, (value) => {
       value.instantsrc = !value.instantsrc;
     }],
    ["check", (value) => value.instantsrc_always, (value) => {
       value.instantsrc_always = !value.instantsrc_always;
     }]
  ],
}));

gListboxManager.register(new ListboxTable("autolink_user_list", {
  itemIdPrefix: 'autolink_user_',
  itemDefinitions: [
    {type: 'id', value: 'pattern', initial: ''},
    {type: 'id', value: 'r', initial: false},
    {type: 'id', value: 'url', initial: ''},
  ],
  editControls: [
    {type: 'add', id: 'add'},
    {type: 'modify', id: 'modify'},
    {type: 'moveUp', id: 'moveup'},
    {type: 'moveDown', id: 'movedown'},
    {type: 'delete', id: 'delete'},
  ],

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
  
  isEnabled : function () {
    return (document.getElementById ("autolink").checked
            && document.getElementById ("autolink_user").checked);
  },
  
  columns : [
    ["text", (value) => value.pattern ],
    ["check",
      (value) => value.r,
      (value) => {
       value.r = !value.r;
      }],
    ["text", (value) => value.url],
  ]
}));
    
gListboxManager.register(new ListboxTable('board_external_list', {
  itemIdPrefix: 'board_external_',
  itemDefinitions: [
    {type: 'id', value: 'pattern', initial: ''},
    {type: 'id', value: 'monaca', initial: false},
    {type: 'id', value: 'prefix', initial: false},
  ],
  editControls: [
    {type: 'add', id: 'add'},
    {type: 'modify', id: 'modify'},
    {type: 'moveUp', id: 'moveup'},
    {type: 'moveDown', id: 'movedown'},
    {type: 'delete', id: 'delete'},
  ],

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
  
  isEnabled : function () {
    return document.getElementById ("board_external").checked;
  },
  
  columns : [
    ["text", (value) => value.pattern ],
    ["check", (value) => value.monaca,
      (value) => {
        value.monaca = !value.monaca;
      }],
    ["check", (value) => value.prefix,
      (value) => {
        value.prefix = !value.prefix;
      }]
  ],
}));
    
gListboxManager.register(new ListboxTable('filename_convert_list', {
  itemIdPrefix: 'filename_convert_',
  itemDefinitions: [
    {type: 'id', value: 'from', initial: ''},
    {type: 'id', value: 'to', initial: ''},
  ],
  editControls: [
    {type: 'add', id: 'add'},
    {type: 'modify', id: 'modify'},
    {type: 'moveUp', id: 'moveup'},
    {type: 'moveDown', id: 'movedown'},
    {type: 'delete', id: 'delete'},
    {type: 'init', id: 'init'},
  ],

  checkError : function (value) {
    if (value.from == "") {
      return "\u5909\u63DB\u5143\u304C\u7A7A\u3067\u3059";
    }
    
    return "";
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
}));


/* Automatical dependency check mechanism for grouped inputs */

function getChildControls(container) {
  let getCandidates = function (node) {
    return [
      ...node.getElementsByTagName('input'),
      ...node.getElementsByTagName('select'),
      ...node.getElementsByTagName('textarea')];
  };

  let candidates = getCandidates(container);

  // Collect excludes from sub groups' children
  let excludes = new Set();
  let subgroups = [
    ...container.getElementsByClassName('group'),
    ...container.getElementsByClassName('groupbox')];
  for (let subgroup of subgroups) {
    if (subgroup == container)
      continue; // not a sub group
    let subRoot = getRootInputOfGroup(subgroup);
    if (!subRoot)
      continue; // invalid group
    let subChildren = getChildControls(subgroup);
    for (let child of subChildren) {
      if (subRoot !== child) {
        excludes.add(child);
      }
    }
  }

  let ret = []
  for (let c of candidates) {
    if (excludes.has(c))
      continue;
    if (c.classList.contains('disable'))
      continue; // permanently disabled
    ret.push(c);
  }
  return ret;
}
function getRootInputOfGroup(container) {
  if (container.classList.contains('group')) {
    // root is limited for input[type=checkbox]
    let inputs = container.getElementsByTagName('input');
    if (inputs.length > 1) {
      if (inputs[0].type != 'checkbox') {
        warn('Unexpected type of grouped inputs',
          inputs[0].name, inputs[0].type);
        return null;
      }
      return inputs[0];
    }
  }
  else if (container.classList.contains('groupbox')) {
    let caption = container.getElementsByClassName('caption');
    if (caption.length == 0) {
      return null; // ignore (no caption)
    }
    caption = caption[0];
    let root = caption.getElementsByTagName('input');
    if (root.length == 0) {
      return null; // ignore (no input in caption)
    }
    if (root[0].type != 'checkbox') {
      warn('Unexpected type of groupbox caption input',
        root.name, root.type);
      return null;
    }
    return root[0];
  }
  return null;
}
function initGroupHandler() {
  let groups = [];

  let containers = [
    ...document.getElementsByClassName('group'),
    ...document.getElementsByClassName('groupbox'),
  ];
  for (let group of containers) {
    let inputs = getChildControls(group);
    if (inputs.length > 1) {
      let root = getRootInputOfGroup(group);
      if (!root) 
        continue;
      let entry = {container: group, root: root, children: []};
      for (let i = 0; i < inputs.length; i++) {
        if (inputs[i] == root)
          continue;
        entry.children.push(inputs[i]);
      }
      groups.push(entry);
    }
  }

  for (let entry of groups) {
    let disabled = entry.root.disabled || !entry.root.checked;
    for (let child of entry.children) {
      //child.disabled = disabled;
      child.readonly = disabled;
    }
    // listen futher change
    let listener = (event) => {
      let disabled = entry.root.disabled || !entry.root.checked;
      if (entry.root.dataset.disabling == 'true') {
        disabled = true;
      }
      for (let child of entry.children) {
        if (child.disabled != disabled) {
          child.dataset.disabling = disabled;
          child.disabled = false; // necessary for dispatching events

          // fire change event to notify sub groups
          child.dispatchEvent(new CustomEvent('changeDisabled'));

          window.setTimeout(()=>{
            child.disabled = disabled;
            delete child.dataset.disabling;
          }, 10);
        }
      }
    };
    entry.root.addEventListener('change', listener, false);
    entry.root.addEventListener('changeDisabled', listener, true);
  }
}


/**
 * キーの名前
 */
const keyNames = {
  'VK_CANCEL' : 'control + break',
  'VK_HELP' : 'help',
  'VK_BACK_SPACE' : 'バックスペース',
  'VK_TAB' : 'タブ',
  'VK_CLEAR' : 'clear',
  'VK_RETURN' : 'リターン',
  'VK_ENTER' : 'エンター',
  'VK_SHIFT' : 'shift',
  'VK_CONTROL' : 'control',
  'VK_ALT' : 'alt',
  'VK_PAUSE' : 'pause',
  'VK_CAPS_LOCK' : 'CapsLock',
  'VK_ESCAPE' : 'esc',
  'VK_SPACE' : 'スペース',
  'VK_PAGE_UP' : 'page up',
  'VK_PAGE_DOWN' : 'page down',
  'VK_END' : 'end',
  'VK_HOME' : 'home',
  'VK_LEFT' : '←',
  'VK_UP' : '↑',
  'VK_RIGHT' : '→',
  'VK_DOWN' : '↓',
  'VK_PRINTSCREEN' : '番長!',
  'VK_INSERT' : 'insert',
  'VK_DELETE' : 'delete',
  'VK_0' : '0',
  'VK_1' : '1',
  'VK_2' : '2',
  'VK_3' : '3',
  'VK_4' : '4',
  'VK_5' : '5',
  'VK_6' : '6',
  'VK_7' : '7',
  'VK_8' : '8',
  'VK_9' : '9',
  'VK_SEMICOLON' : ';',
  'VK_EQUALS' : '=',
  'VK_A' : 'A',
  'VK_B' : 'B',
  'VK_C' : 'C',
  'VK_D' : 'D',
  'VK_E' : 'E',
  'VK_F' : 'F',
  'VK_G' : 'G',
  'VK_H' : 'H',
  'VK_I' : 'I',
  'VK_J' : 'J',
  'VK_K' : 'K',
  'VK_L' : 'L',
  'VK_M' : 'M',
  'VK_N' : 'N',
  'VK_O' : 'O',
  'VK_P' : 'P',
  'VK_Q' : 'Q',
  'VK_R' : 'R',
  'VK_S' : 'S',
  'VK_T' : 'T',
  'VK_U' : 'U',
  'VK_V' : 'V',
  'VK_W' : 'W',
  'VK_X' : 'X',
  'VK_Y' : 'Y',
  'VK_Z' : 'Z',
  'VK_CONTEXT_MENU' : 'メニュー',
  'VK_NUMPAD0' : 'テンキー 0',
  'VK_NUMPAD1' : 'テンキー 1',
  'VK_NUMPAD2' : 'テンキー 2',
  'VK_NUMPAD3' : 'テンキー 3',
  'VK_NUMPAD4' : 'テンキー 4',
  'VK_NUMPAD5' : 'テンキー 5',
  'VK_NUMPAD6' : 'テンキー 6',
  'VK_NUMPAD7' : 'テンキー 7',
  'VK_NUMPAD8' : 'テンキー 8',
  'VK_NUMPAD9' : 'テンキー 9',
  'VK_MULTIPLY' : 'テンキー *',
  'VK_ADD' : 'テンキー +',
  'VK_SEPARATOR' : 'separator',
  'VK_SUBTRACT' : 'テンキー -',
  'VK_DECIMAL' : 'テンキー .',
  'VK_DIVIDE' : 'テンキー /',
  'VK_F1' : 'F1',
  'VK_F2' : 'F2',
  'VK_F3' : 'F3',
  'VK_F4' : 'F4',
  'VK_F5' : 'F5',
  'VK_F6' : 'F6',
  'VK_F7' : 'F7',
  'VK_F8' : 'F8',
  'VK_F9' : 'F9',
  'VK_F10' : 'F10',
  'VK_F11' : 'F11',
  'VK_F12' : 'F12',
  'VK_F13' : 'F13',
  'VK_F14' : 'F14',
  'VK_F15' : 'F15',
  'VK_F16' : 'F16',
  'VK_F17' : 'F17',
  'VK_F18' : 'F18',
  'VK_F19' : 'F19',
  'VK_F20' : 'F20',
  'VK_F21' : 'F21',
  'VK_F22' : 'F22',
  'VK_F23' : 'F23',
  'VK_F24' : 'F24',
  'VK_NUM_LOCK' : 'num lock',
  'VK_SCROLL_LOCK' : 'scroll lock',
  'VK_COMMA' : ',',
  'VK_PERIOD' : '.',
  'VK_SLASH' : '/',
  'VK_BACK_QUOTE' : '`',
  'VK_OPEN_BRACKET' : '[',
  'VK_BACK_SLASH' : '\\',
  'VK_CLOSE_BRACKET' : ']',
  'VK_QUOTE' : '\' か \"',
  'VK_META' : 'meta',
};

function initKeycodeMenu() {
  let keyDefs = [];
  let keyCodeIndex = new Map();
  let i = 0;
  for (let attr in KeyboardEvent) {
    if (attr.match (/^DOM_(VK_(.+))$/)) {
      let code = RegExp.$1;
      let name = RegExp.$2;
      if (code in keyNames) {
        name = keyNames[code];
      }
      keyDefs.push({value: code, name: name});
      keyCodeIndex.set(KeyboardEvent[attr], i);
      i += 1;
    }
  }

  for (let select of document.getElementsByClassName('keycode_menu')) {
    if (!('options' in select)) { // not a <select>
      continue;
    }
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
    for (let key of keyDefs) {
      let opt = document.createElement('option');
      opt.innerText = key.name;
      opt.value = key.value;
      select.appendChild(opt);
    }
    select.selectedIndex = 0;

    if (select.dataset.keycodeInput) {
      let input = document.getElementById(select.dataset.keycodeInput);
      if (input) {
        let modAlt = null;
        let modCtrl = null;
        let modMeta = null;
        let modShift = null;
        if (select.dataset.keycodeInputAlt)
          modAlt = document.getElementById(select.dataset.keycodeInputAlt);
        if (select.dataset.keycodeInputCtrl)
          modCtrl = document.getElementById(select.dataset.keycodeInputCtrl);
        if (select.dataset.keycodeInputMeta)
          modMeta = document.getElementById(select.dataset.keycodeInputMeta);
        if (select.dataset.keycodeInputShift)
          modShift = document.getElementById(select.dataset.keycodeInputShift);

        input.addEventListener('keydown', (event) => {
          event.preventDefault ();
          event.stopPropagation ();
          let i = keyCodeIndex.get(event.keyCode);
          if (i >= 0) {
            select.selectedIndex = i;
            if (modAlt)
              modAlt.checked = event.altKey;
            if (modCtrl)
              modCtrl.checked = event.ctrlKey;
            if (modMeta)
              modMeta.checked = event.metaKey;
            if (modShift)
              modShift.checked = event.shiftKey;
          }
          else {
            warn('Unknown keycode', event.keyCode);
          }
        }, false);
      }
      else {
        warn('No element for keycode-input',
          select.dataset.keycodeInput, 'for', event.keyCode);
      }
    }
    else {
      warn('No data-keycode-input attr for element;',
        'name =', select.name);
    }
  }
}

function initDeck() {
  for (let deck of document.getElementsByClassName('deck')) {
    if (!deck.dataset.deckSelector) {
      warn('A deck must have data-deck-selector attr', deck);
      continue;
    }
    let radios = document.getElementsByName(deck.dataset.deckSelector);
    if (radios.length == 0) {
      warn('No element with deck\'s data-deck-selector attr',
        deck.dataset.deckSelector);
      continue;
    }

    let deck_contents = deck.querySelectorAll(':scope > *[data-deck-name]');
    let radioListener  = (event) => {
      if (event.target.checked) {
        for (let cont of deck_contents) {
          if (cont.dataset.deckName == event.target.value) {
            cont.style.visibility = 'visible';
          }
          else {
            cont.style.visibility = 'hidden';
          }
        }
      }
    };
    for (let btn of radios) {
      btn.addEventListener('change', radioListener, false);
      if (btn.checked) {
        radioListener({target: btn});
      }
    }
  }
}


// Pre-process after restoring from storage
function preprocess(prefs) {
  preprocessTabSortOrder(prefs);
  preprocessP2P(prefs);
}
// Post-process to store storage
function postprocess(prefs) {
  postprocessTabSortOrder(prefs);
  postprocessP2P(prefs);
}

// tab.sort.order.*
function preprocessTabSortOrder(prefs) {
  const orders = ['normal', 'reply', 'catalog', 'other'];
  let tab_sort_order = [];
  for (let i=0; i < orders.length; i++) {
    let o = orders[i];
    tab_sort_order.push({
      value: o, index: prefs['tab.sort.order.'+o]*10+i,
    });
  }
  tab_sort_order.sort((a, b) => a.index - b.index);
  for (let i = 0; i < orders.length; i++) {
    prefs['tab.sort.order.' + (i+1)] = tab_sort_order[i].value;
  }
  for (let o of orders) {
    delete prefs['tab.sort.order.'+o]
  }
}
function postprocessTabSortOrder(prefs) {
  let orders = [];
  let candidates = ['normal', 'reply', 'catalog', 'other'];
  for (let i = 1; i <= 4; i++) {
    let value = prefs['tab.sort.order.' + i];
    let index = candidates.indexOf(value);
    if (index >= 0) {
      orders.push(value);
      candidates.splice(index, 1);
    }
    delete prefs['tab.sort.order.' + i];
  }
  orders = [...orders, ...candidates];

  for (let i = 0; i < orders.length; i++) {
    prefs['tab.sort.order.' + orders[i]] = i+1;
  }
}
//p2p.port.zero, p2p.dynamic
function preprocessP2P(prefs) {
  if (prefs['p2p.port.zero'])
    prefs['p2p.connection.type'] = 'noaccept';
  else
    prefs['p2p.connection.type'] = 'accept';
  delete prefs['p2p.port.zero'];

  if (prefs['p2p.dynamic'])
    prefs['p2p.address.type'] = 'dynamic';
  else
    prefs['p2p.address.type'] = 'static';
  delete prefs['p2p.dynamic'];
}
function postprocessP2P(prefs) {
  if (prefs['p2p.connection.type'] == 'noaccept')
    prefs['p2p.port.zero'] = true;
  else
    prefs['p2p.port.zero'] = false;
  delete prefs['p2p.connection.type'];

  if (prefs['p2p.address.type'] == 'dynamic')
    prefs['p2p.dynamic'] = true;
  else
    prefs['p2p.dynamic'] = false;
  delete prefs['p2p.address.type'];
}


let prefSetMsg = {
  'target': 'pref.js',
  'command': 'set',
};
let prefGetMsg = {
  'target': 'pref.js',
  'command': 'get',
  'args': [null]
};

function onPrefsLoaded(prefs, temporal=false) {
  prefs = JSON.parse(JSON.stringify(prefs));
  preprocess(prefs);
  setFormInputs(prefs, temporal);
}

function onClickSaveButton(event, prefs) {
  event.target.disabled = true;
  prefs = JSON.parse(JSON.stringify(prefs));
  preprocess(prefs);
  let newPrefs = getFormInputs(prefs);
  postprocess(newPrefs);
  browser.runtime.sendMessage({'args': [newPrefs], ...prefSetMsg})
    .then((a) => {
      let updated = false;
      for (let key of Object.getOwnPropertyNames(a)) {
        if (key in basePrefs && basePrefs[key] != a[key].newValue) {
          updated = true;
          basePrefs[key] = a[key].newValue;
        }
      }
      if (updated) {
        onPrefsLoaded(basePrefs);
      }
    }, (e) => { // rejected
      error('pref.js/set failure;' + e);
    })
    .finally(() => {
      event.target.disabled = false;
    });
}

function restoreDefaultPrefs() {
  if (transaction) {
    return transaction.then(() => {
      transaction = null;
      restoreDefaultPrefs();
    });
  }
  let msg = {...prefGetMsg};
  msg.command = 'getDefault';
  transaction = browser.runtime.sendMessage(msg)
    .then((prefs) => {
      // Exclude live values
      delete prefs['savepref'];

      for (let key of Object.getOwnPropertyNames(prefs)) {
        if (key in basePrefs && basePrefs[key] != prefs[key]) {
          basePrefs[key] = prefs[key];
        }
      }
      onPrefsLoaded(basePrefs, true);
    }, function (e) {
      // on rejected
      error('sendMessage was rejected! ' + e);
    });
  return transaction;
}


let btn_init = document.getElementById('init');
btn_init.addEventListener('click', function (event) {
  btn_init.disabled = true;
  restoreDefaultPrefs()
    .then(() => {
      btn_init.disabled = false;
      document.getElementById('import_export_message')
        .innerText = 'All preferences are initialized (not saved yet)';
    });
}, false);

function exportPrefs(deletePath) {
  // Parse prefs from current form state
  let prefs = getFormInputs(basePrefs);
  postprocess(prefs);
  prefs['savepref'] = new Date().getTime();

  // Build blob
  let bufs = [];
  const privates = [
    'savemht.base',
    'p2p.address',
    'p2p.cache.base',
    'bloomer.file',
    'sound.reload.normal.file',
    'sound.reload.reply.file',
    'sound.new.reply.file',
    'sound.reload.catalog.file',
    'sound.expire.file',
    'sound.makethread.file',
    'sound.reply.file',
    'sound.reply_fail.file',
    'sound.savemht.file',
    'sound.savemht.error.file',
    'sound.saveimage.file',
    'sound.saveimage.error.file',
  ];
  for (let key in prefs) {
    let value = prefs[key];
    if (deletePath && typeof(value) === 'string') {
      if (privates.includes(key)) {
        value = '';
      }
    }
    bufs.push(escape('akahuku.'+key) + ',' + escape(value) + '\r\n');
  }
  let blob = new Blob(bufs, {type: 'text/plain'});

  let anchor = document.createElement('a');
  document.body.appendChild(anchor);
  anchor.download = 'akahukuConfig.txt';
  anchor.href = window.URL.createObjectURL(blob);
  anchor.click();
  document.body.removeChild(anchor);
}

let btn_export = document.getElementById('export');
btn_export.addEventListener('click', (event) => {
  btn_export.disabled = true;
  exportPrefs(false);
  btn_export.disabled = false;
  document.getElementById('import_export_message')
    .innerText = 'Exported successfully';
}, false)

let btn_export2 = document.getElementById('export2');
btn_export2.addEventListener('click', (event) => {
  btn_export2.disabled = true;
  exportPrefs(true);
  btn_export2.disabled = false;
  document.getElementById('import_export_message')
    .innerText = 'Exported successfully';
}, false);


function importPrefs() {
  return new Promise((resolve, reject) => {
    let fileinput = document.getElementById('importfile');
    if (fileinput.files.length > 0) {
      let file = fileinput.files[0];
      let reader = new FileReader()
      reader.onload = (result) => {
        let prefs = parseImportedText(reader.result);
        if (prefs)
          resolve(prefs);
        else
          reject(new Error('Parse error'));
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsText(file);
    }
    else {
      reject(new Error('No file'));
    }
  });
}
function parseImportedText(text) {
  let map = {};
  var ok = false;

  // Just parse
  text = text.replace(/\r\n/g, "\n");
  text.replace(/([^\n]+)\n?/g, (matched, part1) => {
    if (part1.match (/^akahuku\.([^,]+),(.+)$/)) {
      map [unescape(RegExp.$1)] = unescape(RegExp.$2);
      ok = true;
    }
    return '';
  });
          
  return (ok? map : null);
}
let btn_import = document.getElementById('import');
btn_import.disabled = false;
btn_import.addEventListener('click', (event) => {
  btn_import.disabled = true;
  importPrefs()
    .then((prefs) => {
      // Exclude live values
      delete prefs['version'];
      delete prefs['savepref'];

      let livePrefs = JSON.parse(JSON.stringify(basePrefs));
      for (let key of Object.getOwnPropertyNames(prefs)) {
        if (key in livePrefs && livePrefs[key] != prefs[key]) {
          livePrefs[key] = prefs[key];
        }
      }
      onPrefsLoaded(livePrefs, true);
      document.getElementById('import_export_message')
        .innerText = 'Imported successfully (not saved yet)';
    })
    .catch((err) => {
      document.getElementById('import_export_message')
        .innerText = 'Import failed: ' + err.message;
    })
    .finally(() => {
      btn_import.disabled = false;
    });
}, false);


let btn_save = document.getElementById('save-button');
let btn_cancel = document.getElementById('cancel-button');

let form = document.getElementById('prefs');

initKeycodeMenu();
initGroupHandler();
initDeck();


let basePrefs = null;

// initialize after receiving prefs respons from background
let transaction = browser.runtime.sendMessage(prefGetMsg)
  .then((initPrefs) => {
    // on success
    if (!initPrefs) {
      error('No response for pref.js/get message!');
      return;
    }

    // Activate buttons for ready
    btn_init.disabled = false;
    btn_export.disabled = false;
    btn_export2.disabled = false;

    basePrefs = initPrefs;
    onPrefsLoaded(initPrefs);

    let button = document.getElementById('save-button');
    button.disabled = false;
    button.addEventListener('click', (event) => {
      onClickSaveButton(event, initPrefs);
    }, false);

    button = document.getElementById('cancel-button');
    button.disabled = false;
    button.addEventListener('click', (event) => {
      // restore to initial values
      onPrefsLoaded(initPrefs);
    }, false);
  }, function (e) {
    // on rejected
    error('sendMessage was rejected! ' + e);
  });


