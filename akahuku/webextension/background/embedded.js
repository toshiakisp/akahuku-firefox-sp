/**
 * Embedded WebExtension background script
 */

"use strict";

// send a message to embedding legacy addon
console.log("sending message to legacy add-on");
browser.runtime.sendMessage("message-from-webextension").then(reply => {
  if (reply) {
    console.log("response from legacy add-on: " + reply.content);
  }
  else {
    console.log("no reply from legacy add-on");
  }
});

