'strict mode';

const ObserverService = (function () {
  var registry = new Map();

  return Object.freeze({
    addObserver: function (observer, topic) {
      if (typeof observer !== 'object') {
        throw new TypeError('observer must be a object')
      }
      if (!('observe' in observer)
        || typeof(observer.observe) !== 'function') {
        throw new TypeError('observer must have observe method')
      }

      let handler = registry.get(topic);
      if (!handler) {
        handler = new PortObserverHandler('observer-service.js', topic);
        registry.set(topic, handler);
      }
      handler.add(observer);
    },

    removeObserver: function (observer, topic) {
      let handler = registry.get(topic);
      if (handler && handler.delete(observer)) {
        // actually deleted
        if (handler.size == 0) {
          registry.delete(topic);
        }
      }
    },

    notifyObservers: function (subject, topic, data) {
      browser.runtime.sendMessage({
        'target': 'observer-service.js',
        'command': 'notifyObservers',
        'args': [subject, topic, data],
      });
    },
  });
})();

