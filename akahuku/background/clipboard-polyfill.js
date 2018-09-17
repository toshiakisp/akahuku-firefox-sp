
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

      case "read": {
        const id = 'clipboard_polyfill_editable';
        const waitPasteMax = 100;//ms
        const waitChildMax = 1000;//ms
        const t0 = Date.now();
        return new Promise((resolve, reject) => {
          let node = document.getElementById(id);
          if (node) {
            // Ensure no child
            while (node.firstChild)
              node.removeChild(node.firstChild);
          }
          else {
            node = document.createElement('div');
            node.id = id;
            node.contentEditable = true;
            document.body.appendChild(node);
          }

          // add one-time listener for current scope
          let pasted = false;
          const pasteHandler = (event) => {
            pasted = true;
            node.removeEventListener('paste', pasteHandler, false);
          };
          node.addEventListener('paste', pasteHandler, false);

          const timer = window.setInterval(() => {
            try {
              const dt = Date.now() - t0;
              const sources = [];
              while (node.firstChild) {
                if (node.firstChild.tagName == 'IMG') {
                  sources.push(node.firstChild.src);
                }
                node.removeChild(node.firstChild);
              }
              if (sources.length > 0) {
                window.clearInterval(timer);
                resolve(sources);
              }
              if (!pasted && dt > waitPasteMax)
                throw new Error('No paste event (clipboard.read)');
              if (pasted && dt > waitChildMax)
                throw new Error('No supported data (clipboard.read)');
            }
            catch (e) {
              window.clearInterval(timer);
              reject(e);
            }
          }, 10);
          node.focus();
          document.execCommand('paste');
        });
      }

    }
  }
});

