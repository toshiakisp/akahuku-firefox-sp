'strict mode';

const HistoryService = (function () {

  let handlers = new Map([
    ['visited', new PortObserverHandler('history-service.js','visited')],
    ['removed', new PortObserverHandler('history-service.js','removed')],
  ]);

  let module = {
    addObserver: function (topic, observer) {
      let observers = handlers.get(topic);
      if (!observers) {
        throw new Error('Undefined topic')
      }
      observers.add(observer);
    },

    removeObserver: function (topic, observer) {
      let observers = handlers.get(topic);
      if (!observers) {
        throw new Error('Undefined topic')
      }
      observers.delete(observer);
    },
  };

  // Message-base methods
  let methods = [
    'isVisited',
  ];
  for (let m of methods) {
    module[m] = async (...args) => {
      return browser.runtime.sendMessage({
        'target': 'history-service.js',
        'command': m,
        'args': [...args],
      });
    };
  }
  return Object.freeze(module);
})();

