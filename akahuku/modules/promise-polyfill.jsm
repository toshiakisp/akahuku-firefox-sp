/**
 * Promise polyfill (with drawbacks)
 *
 * Specification: http://www.ecma-international.org/ecma-262/6.0/
 */
/* global Components, Symbol, Promise */

var EXPORTED_SYMBOLS = [
  "Promise", // export global Promise or polyfill
];

// easy Function.bind polyfill
function bind (func, thisObj) {
  return function () {
    return func.apply (thisObj, arguments);
  };
}

function akPromise (executor) {
  if (typeof this !== "object") {
    throw TypeError ("calling a akPromise constructor without new is forbidden");
  }
  if (typeof executor !== "function") {
    throw TypeError (String (executor) + " is not a function");
  }

  this._state = "pending";
  this._result = undefined;
  this._fulfillReactions = [];
  this._rejectReactions = [];

  let rf = fCreateResolvingFunctions (this);
  try {
    executor.call (null, rf.resolve, rf.reject);
  }
  catch (e) {
    rf.reject.call (null, e);
  }
}

function isPromise (x) {
  if (typeof x == "object" &&
      "_state" in x &&
      "_result" in x &&
      "_fulfillReactions" in x &&
      "_rejectReactions" in x) {
    return true;
  }
  return false;
}

function fCreateResolvingFunctions (promise) {
  let alreadyResolved = false;
  let rf = {};
  rf.resolve = function (resolution) {
    // Promise Resolve Functions
    if (alreadyResolved) {
      return undefined;
    }
    alreadyResolved = true;
    if (resolution === promise) {
      return fRejectPromise (promise, TypeError ("self resolution error"));
    }
    if (typeof resolution !== "object") {
      return fFulfillPromise (promise, resolution);
    }
    let thenAction = resolution.then;
    if (typeof thenAction !== "function") {
      return fFulfillPromise (promise, resolution);
    }
    enqueue (fPromiseResolveThenableJob, promise, resolution, thenAction);
    return undefined;
  };
  rf.reject = function (reason) {
    // Promise Reject Functions
    if (alreadyResolved) {
      return undefined;
    }
    alreadyResolved = true;
    return fRejectPromise (promise, reason);
  };
  return rf;
}

function fRejectPromise (promise, reason) {
  let reactions = promise._rejectReactions;
  promise._result = reason;
  promise._fulfillReactions = undefined;
  promise._rejectReactions = undefined;
  promise._state = "rejected";
  return fTriggerPromiseReactions (reactions, reason);
}

function fFulfillPromise (promise, value) {
  let reactions = promise._fulfillReactions;
  promise._result = value;
  promise._fulfillReactions = undefined;
  promise._rejectReactions = undefined;
  promise._state = "fulfilled";
  return fTriggerPromiseReactions (reactions, value);
}

function fTriggerPromiseReactions (reactions, argument) {
  for (var i = 0; i < reactions.length; i ++) {
    enqueue (reactions [i].getJob (), argument);
  }
  return undefined;
}

function fPromiseResolveThenableJob (promiseToResolve, thenable, then) {
  let rf = fCreateResolvingFunctions (promiseToResolve);
  try {
    return then.call (thenable, rf.resolve, rf.reject);
  }
  catch (e) {
    return rf.reject.call (null, e);
  }
}

/**
 * Promise.all -- limited for ArrayLike only
 */
akPromise.all = function (iterable) {
  let C = this;
  let resultCapability = new PromiseCapability (C);
  // simply support ArrayLike object, not iterable object
  if (typeof iterable.length == "undefined") {
    // IfAbruptRejectPromise
    resultCapability.reject.call (null, TypeError ("not a ArrayLike"));
    return resultCapability.promise;
  }
  try {
    // PerformPromiseAll (Array specific)
    let values = [];
    let remainingElementsCount = 1;
    let index = 0;
    for (;;) {
      if (!(index < iterable.length)) {
        remainingElementsCount --;
        if (remainingElementsCount == 0) {
          resultCapability.resolve.call (null, values);
        }
        return resultCapability.promise;
      }
      let nextValue = iterable [index];
      values.push (undefined);
      let nextPromise = C.resolve (nextValue);
      let resolveElement_alreadyCalled = false;
      let resolveElement_index = index;
      let resolveElement = function (x) {
        // Promise.all Resolve Element Functions
        if (resolveElement_alreadyCalled) {
          return undefined;
        }
        resolveElement_alreadyCalled = true;
        values [resolveElement_index] = x;
        remainingElementsCount --;
        if (remainingElementsCount == 0) {
          return resultCapability.resolve.call (null, values);
        }
        return undefined;
      };
      remainingElementsCount ++;
      nextPromise.then (resolveElement, resultCapability.reject);
      index ++;
    }
  }
  catch (e) {
    resultCapability.reject.call (null, e);
    return resultCapability.promise;
  }
};

/**
 * Promise.race
 */
akPromise.race = function (iterable) {
  let C = this;
  let resultCapability = new PromiseCapability (C);
  // simply support ArrayLike object, not iterable object
  if (typeof iterable.length == "undefined") {
    // IfAbruptRejectPromise
    resultCapability.reject.call (null, TypeError ("not a ArrayLike"));
    return resultCapability.promise;
  }
  try {
    // PerformPromiseRace (Array specific)
    for (let i = 0; i < iterable.length; i ++) {
      C.resolve (iterable [i])
      .then (resultCapability.resolve, resultCapability.reject);
    }
  }
  catch (e) {
    resultCapability.reject.call (null, e);
  }
  return resultCapability.promise;
};

/**
 * Promise.reject
 */
akPromise.reject = function (r) {
  let C = this;
  let promiseCapability = new PromiseCapability (C);
  promiseCapability.reject.call (null, r);
  return promiseCapability.promise;
};

akPromise.resolve = function (x) {
  let C = this;
  if (isPromise (x) &&
      x.constructor == C) {
    return x;
  }
  let promiseCapability = new PromiseCapability (C);
  promiseCapability.resolve.call (null, x);
  return promiseCapability.promise;
};

/**
 * Promise.prototype.catch
 */
akPromise.prototype ["catch"] = function (onRejected) {
  return this.then (undefined, onRejected);
};

/**
 * Promise.prototype.then
 */
akPromise.prototype.then = function (onFulfilled, onRejected) {
  if (!isPromise (this)) {
    throw TypeError (String (this) + " is not a akPromise");
  }
  var C = this.constructor || akPromise;
  var resultCapability = new PromiseCapability (C);

  // PerformPromiseThen
  if (typeof onFulfilled !== "function") {
    onFulfilled = function (arg) { return arg; }; // "Identity"
  }
  if (typeof onRejected !== "function") {
    onRejected = function (arg) { throw arg; }; // "Thrower"
  }
  let fulfillReaction = new PromiseReaction (resultCapability, onFulfilled);
  let rejectReaction = new PromiseReaction (resultCapability, onRejected);
  if (this._state === "pending") {
    this._fulfillReactions.push (fulfillReaction);
    this._rejectReactions.push (rejectReaction);
  }
  else if (this._state === "fulfilled") {
    enqueue (fulfillReaction.getJob (), this._result);
  }
  else if (this._state === "rejected") {
    enqueue (rejectReaction.getJob (), this._result);
  }
  return resultCapability.promise;
};

function PromiseCapability (ctor) {
  if (typeof ctor !== "function") {
    throw TypeError ("is not a constructor");
  }
  this.resolve = null;
  this.reject = null;

  // GetCapabilitiesExecutor
  let capability = this;
  let executor = function (resolve, reject) {
    capability.resolve = resolve;
    capability.reject = reject;
  };

  let promise = new ctor (executor);

  if (typeof this.resolve !== "function") {
    throw TypeError ("[[resolve]] is not callable");
  }
  if (typeof this.reject !== "function") {
    throw TypeError ("[[reject]] is not callable");
  }
  this.promise = promise;
}

function PromiseReaction (resultCapability, handler) {
  this.capabilities = resultCapability;
  this.handler = handler;
}
PromiseReaction.prototype.getJob = function () {
  // GetPromiseReactionJob
  let reaction = this;
  return function (argument) {
    try {
      var value = reaction.handler.call (null, argument);
    }
    catch (e) {
      return reaction.capabilities.reject.call (null, e);
    }
    return reaction.capabilities.resolve.call (null, value);
  };
}


/**
 * Promise.prototype [@@toStringTag]
 */
if (typeof Symbol !== "undefined" &&
    typeof Symbol.toStringTag !== "undefined") {
  // require Firefox 51.0+
  akPromise.prototype [Symbol.toStringTag] = "akPromise";
}


/**
 * enqueue a job into event
 */
function enqueue (job) {
  let args = Array.prototype.slice.call (arguments, 1);
  if (typeof job !== "function") {
    throw TypeError ("not a function");
  }
  executeSoon (job, args);
}

var executeSoon;
try {
  var scope = {};
  Components.utils.import ("resource://gre/modules/Timer.jsm", scope);
  executeSoon = function (func, args) {
    scope.setTimeout (function (args) {
      func.apply (null, args);
    }, 0, args);
  }
}
catch (e) {
  Components.utils.reportError (e);
  executeSoon = function (func, args) {
    // requires XPCOM (for JSM)
    var tm = Components.classes ["@mozilla.org/thread-manager;1"]
      .getService (Components.interfaces.nsIThreadManager);
    var f = Components.interfaces.nsIThread.DISPATCH_NORMAL;
    var r = {run: function () { func.apply (null, args); }};
    tm.mainThread.dispatch (r, f);
  }
}

// export global Promise or polyfill
if (typeof Promise !== "undefined") {
  this.Promise = Promise;
}
else { // Firefox -28.*
  // Promise.jsm (24.0+) is not standard-compliant
  this.Promise = akPromise;
}

