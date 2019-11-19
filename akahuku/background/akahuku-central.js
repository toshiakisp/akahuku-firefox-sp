
'strict mode';

const AkahukuCentral = (function () {

  class IdFactory {
    constructor() {
      this._idBase = 0;
      this._idSet = new Set();
    }
    create() {
      this._idBase += 1;
      while (this._idSet.has(this._idBase)) {
        this._idBase += 1;
      }
      this._idSet.add(this._idBase);
      return this._idBase;
    }
    delete(value) {
      this._idSet.delete(value);
    }
  }

  class Registory {
    constructor() {
      this._values = [];
      this._urlMap = new WeakMap();
      this._idFactory = new IdFactory();
    }

    get length() {
      return this._values.length;
    }

    add(value) {
      if ('id' in value) {
        for (let v of this._values) {
          if (v.id == value.id) {
            throw new Error('Already registered');
          }
        }
      }

      // clone
      value = JSON.parse(JSON.stringify(value));

      value.id = this._idFactory.create();
      this._values.push(value);
      this._urlMap.set(value, new URL(value.url || 'about:blank'));
      return {id: value.id};
    }

    delete(value) {
      let target = -1;
      for (let n = 0; n < this._values.length; n++) {
        if (this._values[n].id == value.id) {
          target = n;
          break;
        }
      }
      if (target >= 0) {
        let v = this._values[target];
        this._urlMap.delete(v);
        this._idFactory.delete(v.id);
        this._values.splice(target, 1);
      }
      else {
        throw new Error('Unregisterd value');
      }
      return;
    }

    get(arg) {
      if (arg === null) {
        return [...this._values]; // all params
      }

      var selectors = []
      function parseArg(arg) {
        if (typeof(arg) === 'number') {
          selectors.push({type: 'id', value: arg});
        }
        else if (typeof(arg) === 'string') {
          selectors.push({type: 'name', value: arg});
        }
        else if (arg instanceof URL) {
          selectors.push({type: 'url', value: arg});
        }
        else if (arg instanceof Array) {
          for (let a of arg) {
            parseArg(a)
          }
        }
        else if (typeof(arg) === 'object') {
          if (arg === null) {
            throw new TypeError('Unsupported argument (null)');
          }
          if ('id' in arg)
            selectors.push({type: 'id', value: arg.id});
          else if ('name' in arg)
            selectors.push({type: 'name', value: arg.name});
          else if ('url' in arg)
            selectors.push({type: 'url', value: new URL(arg.url)});
          else if ('tabId' in arg)
            selectors.push({type: 'tabId', value: arg.tabId});
          else {
            throw new TypeError('Unexpected argument object');
          }
        }
        else {
          throw new TypeError('Unsupported argument type: '+typeof(arg));
        }
      }
      parseArg(arg);

      let ret = [];
      for (let sel of selectors) {
        let test = () => {};
        if (sel.type == 'id') {
          test = (v) => {
            if (v.id == sel.value) {
              ret.push(v);
              return true; // id must be unique
            }
            return false;
          };
        }
        else if (sel.type == 'tabId') {
          test = (v) => {
            if (v.tabId == sel.value) {
              ret.push(v);
            }
          };
        }
        else if (sel.type == 'name') {
          test = (v) => {
            if (v.name == sel.value)
              ret.push(v);
          };
        }
        else if (sel.type == 'url') {
          if (sel.value.protocol.startsWith('http')) {
            // easy match (don't care http or https, port, ...)
            test = (v) => {
              let url = this._urlMap.get(v);
              if (url.protocol.startsWith('http')
                && url.hostname == sel.value.hostname
                && url.pathname == sel.value.pathname
                && url.search == sel.value.search)
                ret.push(v);
            };
          }
          else {
            // exact match
            test = (v) => {
              if (this._urlMap.get(v).href == sel.value.href)
                ret.push(v);
            };
          }
        }

        for (let v of this._values) {
          if (test(v))
            break;
        }
      }
      return ret;
    }
  }


  let registories = new Map([
    ['param', new Registory()],
    ['board', new Registory()],
  ]);

  // public methods of module
  let exports = Object.freeze({
    register: async function (type, value) {
      let reg = registories.get(type);
      if (!reg)
        throw new Error('Undefined type: '+type);
      return reg.add(value);
    },

    unregister: function (type, value) {
      // sync because of no response
      let reg = registories.get(type);
      if (!reg)
        throw new Error('Undefined type: '+type);
      reg.delete(value);
      return;
    },

    get: async function (type, arg) {
      let reg = registories.get(type);
      if (!reg)
        throw new Error('Undefined type: '+type);
      return reg.get(arg);
    },

    // Utilities

    getParamsByURL: async function (url) {
      return registories.get('param').get({url: url});
    },

    isURLOpened: async function (url) {
      let params = registories.get('param').get({url: url});
      return (params.length > 0);
    },
  });

  // Listen for content scripts
  browser.runtime.onMessage.addListener((msg, sender) => {
    if ("target" in msg && msg.target === "akahuku-central.js") {
      let methods = Object.getOwnPropertyNames(exports);
      if (methods.indexOf(msg.command) != -1) {
        if (msg.command == 'register'
          && msg.args.length > 1
          && typeof(msg.args[1]) == 'object') {
          // Special props in value
          if ('tabId' in msg.args[1] && sender.tab)
            msg.args[1].tabId = sender.tab.id;
          if ('frameId' in msg.args[1] && sender.frameId >= 0)
            msg.args[1].frameId = sender.frameId;
        }
        return exports[msg.command](...msg.args);
      }
      else {
        throw new Error('Unknwon command: ' + msg.command);
      }
    }
  });

  return exports;
})();

