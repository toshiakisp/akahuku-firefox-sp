
"use strict";

browser.runtime.onMessage.addListener((msg, sender) => {
  if ("target" in msg && msg.target === "clipboard-polyfill.js") {
    switch (msg.command) {
      case "writeText":
        return new Promise((resolve, reject) => {
          let node = document.createElement('textarea');
          node.value = msg.args[0];
          document.body.appendChild(node);
          node.select();
          document.execCommand('copy');
          document.body.removeChild(node);
          resolve();
        });
        break;
    }
  }
});

