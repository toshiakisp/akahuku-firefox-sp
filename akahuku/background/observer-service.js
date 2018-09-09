'strict mode';

const ObserverService = (function () {

  // Listen for port-base message for registering observer
  let ports = new Map();
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'observer-service.js') {
      return;
    }
    // port will be added to topic's set after register info recieved
    let topic = null; // for a port
    port.onMessage.addListener((msg) => {
      if (msg.register && !topic) {
        topic = msg.register;
        let topicSet = ports.get(topic);
        if (!topicSet) {
          topicSet = new Set();
          ports.set(topic, topicSet);
        }
        topicSet.add(port);
      }
    });
    port.onDisconnect.addListener((p) => {
      if (topic && ports.has(topic)) {
        ports.get(topic).delete(port);
      }
      port = null;
    });
  });

  let localObservers = new Map();

  let exports = Object.freeze({
    addObserver: function (observer, topic) {
      if (typeof observer !== 'object') {
        throw new TypeError('observer must be a object')
      }
      if (!('observe' in observer)
        || typeof(observer.observe) !== 'function') {
        throw new TypeError('observer must have observe method')
      }

      let obs = (localObservers.get(topic) || new Set());
      obs.add(observer);
    },

    removeObserver: function (observer, topic) {
      let obs = localObservers.get(topic);
      if (obs && obs.delete(observer)) {
        // actually deleted
        if (obs.size == 0) {
          localObservers.delete(topic);
        }
      }
    },

    notifyObservers: function (subject, topic, data) {
      let obs = localObservers.get(topic);
      if (obs) {
        for (let o of observers) {
          try {
            o.observe(subject, topic, data);
          }
          catch (e) {
            console.error('Error occured while observe() with topic =',
              topic, 'for', o);
          }
        }
      }
      // notify for remote observers
      let topicPorts = ports.get(topic);
      if (!topicPorts) {
        return;
      }
      let msg = {name: 'observe', args: [subject, topic, data]};
      for (let p of topicPorts) {
        try {
          p.postMessage(msg);
        }
        catch (e) {
          console.error(e.message);
        }
      }
    },
  });

  // Listen for message from content scripts
  browser.runtime.onMessage.addListener((msg, sender) => {
    if ('target' in msg && msg.target === 'observer-service.js') {
      if (msg.command == 'notifyObservers') {
        return exports.notifyObservers(...msg.args);
      }
      else {
        throw new Error('Must be sent via port: ' + msg.command);
      }
    }
  });

  return exports;
})();

