'use strict';

browser.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-sage':
    case 'focus-comment':
    case 'save-MHT':
      browser.tabs.query({active: true, currentWindow: true})
        .then((tabs) => {
          return AkahukuCentral.get('param', {tabId: tabs[0].id});
        })
        .then((params) => {
          let msg = {
            name: 'contextmenu-content.js', method: 'runCommand',
            args: [command],
          };
          let opt = {};
          if (params[0].frameId >= 0) {
            opt.frameId = params[0].frameId;
          }
          return browser.tabs.sendMessage(params[0].tabId, msg, opt);
        });
      break;
    case 'open-bloomer': {
      let target = unescape(Prefs.getItem('bloomer.file')).trim();
      let props = {active:true};
      try {
        if (target) {
          // ensure a proper URL with scheme
          let target_url = new URL(target);
          props.url = target_url.href;
        }
      }
      catch (e) {
        console.warn('Invalid URL: "' + target + '"');
      }

      browser.tabs.query({active: true, currentWindow: true})
        .then((tabs) => {
          props.openerTabId = tabs[0].id;
          return browser.tabs.query({currentWindow: true});
        })
        .then((tabs) => {
          props.index = tabs.length;// to last
          return browser.tabs.create(props);
        })
        .catch((err) => {
          // fail safe: open newtab page
          console.warn('browser.tabs.create() failed: ' + err.message);
          delete props.url;
          return browser.tabs.create(props);
        });
    }
  }
});

