'use strict';

let updating_commands = false;

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

  // Send all shortcut key settings for commands to Prefs
  // (for each fired timing because of no observation method)
  if (!updating_commands) {
    updating_commands = true;
    browser.commands.getAll()
      .then((commands) => {
        let setting = {};
        for (let c of commands) {
          let pref_name = null;
          switch (c.name) {
            case 'focus-comment':
              pref_name = 'commentbox.shortcut';
              break;
            case 'toggle-sage':
              pref_name = 'mailbox.sagebutton.key';
              break;
            case 'save-MHT':
              pref_name = 'savemht.shortcut';
              break;
            case 'open-bloomer':
              pref_name = 'bloomer';
              break;
          }
          if (pref_name) {
            setting[pref_name] = Boolean(c.shortcut);
            if (c.shortcut) {
              // Note: preserve setting even if disabled
              setting[pref_name+'.keycombo'] = c.shortcut;
            }
          }
          else {
            console.warn('Unknown command:', c.name, c.shortcut);
          }
        }
        return Prefs.set(setting);
      })
      .finally(() => {
        updating_commands = false;
      });
  }
});

// Monitor Prefs to make shortcuts disable/enable via options UI
Prefs.onChanged.addListener((updates) => {
  [
    ['focus-comment','commentbox.shortcut'],
    ['toggle-sage','mailbox.sagebutton.key'],
    ['open-bloomer','bloomer'],
    ['save-MHT','savemht.shortcut'],
  ].forEach((args) => {
    let [command_name, enable_pref] = args;
    let keycombo_pref = enable_pref+'.keycombo';
    if (enable_pref in updates) {
      if (updates[enable_pref]) {
        browser.commands.update({name: command_name,
          shortcut: updates[keycombo_pref] || Prefs.getItem(keycombo_pref)});
      }
      else {
        // Note: To disable commands by calling commands.reset(),
        // commands must be declared w/o suggested_key in manifest.
        browser.commands.reset(command_name);
      }
    }
    else if (keycombo_pref in updates && Prefs.getItem(enable_pref)) {
      browser.commands.update({name: command_name,
        shortcut: updates[keycombo_pref]});
    }
  });
});

