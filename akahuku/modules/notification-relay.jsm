/**
 * Global notification relay for multi-process environment (e10s-multi hack)
 *
 * Broadcast simple notification topics from a process to other processes
 */

/* global Components */

var EXPORTED_SYMBOLS = [
  "AkahukuNotificationRelay",
];

const ipcBaseName = "akahuku.fx.sp@toshiakisp.github.io/Topic-Relay/";

const targetTopics = [
  "arakahuku-location-info-changed",
  "arakahuku-board-newest-num-updated",
  "arakahuku-thread-unload",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import ("resource://akahuku/console.jsm");
var console = new AkahukuConsole ();
console.prefix = "Akahuku debug(topic-relay#root)";

var isE10sReady = false;
var inMainProcess = true;
try {
  var appinfo
    = Cc ["@mozilla.org/xre/app-info;1"]
    .getService (Ci.nsIXULRuntime);
  if (typeof appinfo.browserTabsRemoteAutostart !== "undefined") {
    isE10sReady = true;

    // Check Palemoon 25+ (Goanna)
    var ai = Cc ["@mozilla.org/xre/app-info;1"]
      .getService (Ci.nsIXULAppInfo);
    if (ai.ID === "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}") {
      isE10sReady = false;
    }
  }
  if (appinfo.processType !== appinfo.PROCESS_TYPE_DEFAULT) {
    inMainProcess = false;
    console.prefix = "Akahuku debug(topic-relay#" + appinfo.processID + ")";
  }
}
catch (e) {
  console.exception (e);
}

var messageTopic = ipcBaseName + "Topic";

var rootListener = null;
var childListener = null;
var observers = [];

if (isE10sReady) {
  var os
    = Cc ["@mozilla.org/observer-service;1"]
    .getService (Ci.nsIObserverService);

  if (inMainProcess) {
    var broadcaster = Cc ["@mozilla.org/parentprocessmessagemanager;1"]
      .getService (Ci.nsIMessageBroadcaster);
    var gpmm = Cc ["@mozilla.org/parentprocessmessagemanager;1"]
      .getService (Ci.nsIMessageListenerManager);

    rootListener = {
      receiveMessage : function (message) {
        // Analyze message
        var obj = message.data;
        var subject = Cc ["@mozilla.org/supports-string;1"]
          .createInstance (Ci.nsISupportsString);  
        subject.data = obj.subject;
        var topic = obj.topic;
        var data = obj.data;
        // Notify topic in the process
        os.notifyObservers (subject, topic, data);
        // Send to all child processes
        broadcaster.broadcastAsyncMessage (messageTopic, obj);
      },
    };
    gpmm.addMessageListener (messageTopic, rootListener, false);

    // Observe local topics in the main processes
    for (var i = 0; i < targetTopics.length; i ++) {
      observers [i] = {id: i,
        topic: targetTopics [i],
        observed: false,
        paused: false,
        observe : function (subject, topic, data) {
          if (this.paused) {
            return;
          }
          subject.QueryInterface (Ci.nsISupportsString);
          // send topic data to all child processes
          var obj = {from: appinfo.processID,
            subject: subject.data, topic: topic, data: data};
          broadcaster.broadcastAsyncMessage (messageTopic, obj);
        },
      };
    }
  }
  else { // in child processes

    childListener = {
      receiveMessage : function (message) {
        // Analyze data
        var obj = message.data;
        var subject = Cc ["@mozilla.org/supports-string;1"]
          .createInstance (Ci.nsISupportsString);  
        subject.data = obj.subject;
        var topic = obj.topic;
        var data = obj.data;
        var topicIndex = -1;
        for (var i = 0; i < targetTopics.length; i ++) {
          if (targetTopics [i] == topic) {
            topicIndex = i;
            break;
          }
        }
        if (topicIndex < 0) {
          return;
        }
        // Break if message is originally sent from itself
        if (obj.from == appinfo.processID) {
          return;
        }
        // Notify topic in the process (don't observe by itself)
        observers [topicIndex].paused = true;
        os.notifyObservers (subject, topic, data);
        observers [topicIndex].paused = false;
      },
    };

    var cpmm = Cc ['@mozilla.org/childprocessmessagemanager;1']
      .getService (Ci.nsIMessageListenerManager);
    cpmm.addMessageListener (messageTopic, childListener, false);


    var mm = Cc ['@mozilla.org/childprocessmessagemanager;1']
      .getService (Ci.nsIMessageSender);

    // Observe local topics in child processes
    for (var i = 0; i < targetTopics.length; i ++) {
      observers [i] = {id: i,
        topic: targetTopics [i],
        observed: false,
        paused: false,
        observe : function (subject, topic, data) {
          if (this.paused) {
            return;
          }
          subject.QueryInterface (Ci.nsISupportsString);
          // send topic data to the root process
          var obj = {from: appinfo.processID,
            subject: subject.data, topic: topic, data: data};
          mm.sendAsyncMessage (messageTopic, obj);
        },
      };
    }
  }

  for (var i = 0; i < observers.length; i ++) {
    try {
      os.addObserver (observers [i], observers [i].topic, false);
      observers [i].observed = true;
    }
    catch (e) {
      console.exception (e);
    }
  }
}


/**
 * Exporting module
 */
var AkahukuNotificationRelay = {
  shutdown : function () {
    if (!isE10sReady) {
      return;
    }
    if (inMainProcess) {
      if (rootListener) {
        gpmm.removeMessageListener (messageTopic, rootListener);
        rootListener = null;
      }
    }
    else {
      if (childListener) {
        cpmm.removeMessageListener (messageTopic, childListener);
        childListener = null;
      }
    }
    for (var i = 0; i < observers.length; i ++) {
      if (observers [i].observed) {
        os.removeObserver (observers [i], observers [i].topic, false);
      }
    }
    observers = [];
  },
};

