
'strict mode';

const HistoryService = (function () {

  // public methods of module
  let exports = Object.freeze({
    isVisited: async function (url) {
      let visits = await browser.history.getVisits({
        url: url,
      });
      return (visits.length > 0);
    },

    addObserver: async function (topic, observer) {
      throw new Error('NotYetImplemented');
    },

    removeObserver: async function (topic, observer) {
      throw new Error('NotYetImplemented');
    },

  });


  // Listen for port-base message for registering observer
  const TOPICS = ['visited', 'removed'];
  let ports = new Map();
  for (let t of TOPICS) {
    ports.set(t, new Set());
  }
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'history-service.js') {
      return;
    }
    // port will be added to topic's set after register info recieved
    let topic = null; // for a port
    port.onMessage.addListener((msg) => {
      if (msg.register && !topic) {
        topic = msg.register;
        if (TOPICS.includes(topic)) {
          ports.get(topic).add(port);
        }
      }
    });
    port.onDisconnect.addListener((p) => {
      if (topic && ports.has(topic)) {
        ports.get(topic).delete(port);
      }
      port = null;
    });
  });

  // Listen history events to notify for observers
  browser.history.onVisited.addListener((historyItem) => {
    let msg = {
      name: 'observe',
      args: ['visited',
        {
          url: historyItem.url,
          lastVisitTime: historyItem.lastVisitTime,
        },
      ],
    };
    for (let port of ports.get('visited')) {
      try {
        port.postMessage(msg);
      }
      catch (e) {
        console.error(e.message);
      }
    }
  });
  browser.history.onVisitRemoved.addListener((historyItem) => {
    let msg = {
      name: 'observe',
      args: ['removed', {url: historyItem.url}],
    };
    for (let port of ports.get('removed')) {
      try {
        port.postMessage(msg);
      }
      catch (e) {
        console.error(e.message);
      }
    }
  });

  // Listen for message from content scripts
  browser.runtime.onMessage.addListener((msg, sender) => {
    if ('target' in msg && msg.target === 'history-service.js') {
      if (msg.command == 'addObserver'
        || msg.command == 'removeObserver') {
        throw new Error('Must be sent via port: ' + msg.command);
      }
      let methods = Object.getOwnPropertyNames(exports);
      if (methods.indexOf(msg.command) != -1) {
        return exports[msg.command](...msg.args);
      }
    }
  });

  return exports;
})();

