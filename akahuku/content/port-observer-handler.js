'strict mode';

class PortObserverHandler {
  constructor(name, topic) {
    this.targetName = name;
    this.topic = topic;
    this.observers = new Set();
    this.port = null;
  }

  get size() {
    return this.observers.size;
  }

  recieveMessage(message) {
    let handler = message.name;
    let args = message.args;
    for (let o of this.observers) {
      try {
        if (typeof(o) === 'function')
          o.call(null, ...args);
        else
          o[handler].call(o, ...args);
      }
      catch (e) {
        console.error('port-observer-content.js:',
          this.targetName, this.topic,
          'Observer call failed;', e.message);
      }
    }
  }

  add(observer) {
    if (typeof(observer) !== 'function'
      && (typeof(observer) !== 'object'
        || typeof(observer.observe) !== 'function')) {
      throw new TypeError('observer must be a function or object with observe method)')
    }
    if (!this.port) {
      // Connect by single port par topic
      this.port = browser.runtime.connect({name: this.targetName});
      this.port.onMessage.addListener((m) => {
        this.recieveMessage(m);
      });
      this.port.postMessage({register: this.topic});
    }
    this.observers.add(observer);
  }

  delete(observer) {
    let ret = this.observers.delete(observer);
    if (this.observers.size == 0 && this.port) {
      this.port.disconnect();
      this.port = null;
    }
    return ret;
  }
}

