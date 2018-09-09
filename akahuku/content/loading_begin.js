/**
 * To be injected while 'loading' status
 */

const Loader = {
  STATES : {
    INIT: 0,
    LOADING: 1,
    INTERACTIVE: 2,
    COMPLETE: 3,
    UNEXPECTED: -1,
  },

  _listenersDCL: [],
  _listenersL: [],
  _handler: null,
  _pending: true,
  _pendingStates: [],
  doc: null,
  url: null,
  state: 0,

  initialize: function (doc, pending=true) {
    this.setPending(pending);
    this.doc = doc;
    this.state = this.STATES.INIT;
    this.url = doc.URL;
    //console.log('loader: initialized for', this.url);

    this.updateState(doc.readyState);
    if (this.state != this.STATES.COMPLETE) {
      this._handler = (event) => {
        this.readyStateChanged(event);
      };
      doc.addEventListener('readystatechange', this._handler);
    }
  },

  readyStateChanged: function (event) {
    let doc = event.target;
    //console.log('readystatechange', doc.readyState, doc.URL);
    if (this._pending) {
      this._pendingStates.push(doc.readyState);
    }
    else {
      this.updateState(doc.readyState);
    }
  },

  updateState: function (stateStr) {
    newState = this.getStateValue(stateStr);
    if (this.state == this.STATES.INIT) {
      this.state = newState;

      // Emit already-fired event
      if (this.state == this.STATES.INTERACTIVE) {
        this.notifyDOMContentLoaded();
      }
      else if (this.state == this.STATES.COMPLETE) {
        this.notifyLoad();
      }
    }
    else if (this.state == this.STATES.LOADING
      && newState == this.STATES.INTERACTIVE) {
      this.state = newState;
      this.notifyDOMContentLoaded();
    }
    else if (this.state == this.STATES.INTERACTIVE
      && newState == this.STATES.COMPLETE) {
      this.state = newState;
      this.notifyLoad();
    }
    else if (this.state == this.STATES.LOADING
      && newState == this.STATES.COMPLETE) {
      this.state = newState;
      // interactive state is missed
      this.notifyDOMContentLoaded();
      this.notifyLoad();
    }

    if (this.state == this.STATES.COMPLETE && this._handler) {
      this.doc.removeEventListener('readystatechange', this._handler);
    }
  },

  getStateValue: function (stateStr) {
    switch (stateStr) {
      case 'loading':
        return this.STATES.LOADING;
      case 'interactive':
        return this.STATES.INTERACTIVE;
      case 'complete':
        return this.STATES.COMPLETE;
      default:
        return this.STATES.UNEXPECTED;
    }
  },

  setPending: function (pending) {
    if (!pending && this._pending) {
      this._pending = false;
      while (this._pendingStates.length > 0) {
        let readyState = this._pendingStates.shift();
        this.updateState(readyState);
      }
    }
    else if (pending && !this._pending) {
      this._pending = true;
    }
  },

  addEventListener: function (type, handler) {
    function addHandlers(list, handler) {
      if (handler in list) {
        return;
      }
      list.push(handler);
    }

    if (type == 'DOMContentLoaded') {
      addHandlers(this._listenersDCL, handler)
    }
    else if (type == 'load') {
      addHandlers(this._listenersL, handler)
    }
    else {
      throw Error('Unknown event type specified: ' + type)
    }
  },

  _notifyToListeners: function (listeners, type) {
    for (let listener of listeners) {
      let event = {
        type: type,
        target: this.doc,
      };
      listener.call(null, event);
    }
  },
  notifyDOMContentLoaded: function () {
    this._notifyToListeners(this._listenersDCL, 'DOMContentLoaded');
  },
  notifyLoad: function () {
    this._notifyToListeners(this._listenersL, 'load');
  },
};

Loader.initialize(document);

