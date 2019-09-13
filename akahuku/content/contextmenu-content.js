'strict mode';

(function () {

  // Capture target of context menu
  let lastTarget;
  document.addEventListener('contextmenu', (cev) => {
    lastTarget = cev.target;

    let data = {};
    try {
      data.link = arAkahukuLink.getContextMenuContentData(lastTarget);
      data.image = arAkahukuImage.getContextMenuContentData(lastTarget);
      data.jpeg = arAkahukuJPEG.getContextMenuContentData(lastTarget);
      data.quote = arAkahukuQuote.getContextMenuContentData(lastTarget);
    }
    catch (e) {
      Akahuku.debug.exception (e);
    }
    // Send context data to update menus
    browser.runtime.sendMessage({
      'target': 'context-menu.js',
      'command': 'setContentData',
      'args': [data],
    });

    // For compatibility
    arAkahukuUI.contextMenuShown = true;
  });

  // Observe menu hidden notification
  let observer = {
    observe: function (contexts, topic, data) {
      if (topic == 'menu-hidden') {
        lastTarget = null;
        arAkahukuUI.contextMenuShown = false;
      }
    }
  };
  ObserverService.addObserver(observer, 'menu-hidden');
  document.addEventListener('unload', (ev) => {
    ObserverService.removeObserver(observer, 'menu-hidden');
  });

  browser.runtime.onMessage.addListener((msg, sender) => {
    if (!(msg.name && msg.method && msg.args)) {
      return;
    }

    switch (msg.name) {
      case 'arAkahukuQuote':
        switch (msg.method) {
          case 'quote':
            arAkahukuQuote.quote(...msg.args, lastTarget);
            break;
          case 'quoteToNameBox':
            arAkahukuQuote.quoteToNameBox(...msg.args, lastTarget);
            break;
          case 'quoteToMailBox':
            arAkahukuQuote.quoteToMailBox(...msg.args, lastTarget);
            break;
          case 'copyToClipboard':
            arAkahukuQuote.copyToClipboard(lastTarget);
            break;
          case 'googleImage':
            arAkahukuQuote.googleImage(lastTarget);
            break;
          case 'wikipedia':
            arAkahukuQuote.wikipedia(lastTarget);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'arAkahukuP2P':
        switch (msg.method) {
          case 'deleteCache':
            arAkahukuP2P.deleteCache(lastTarget);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'arAkahukuLink':
        switch (msg.method) {
          case 'setExt':
            arAkahukuLink.setExt(...msg.args, lastTarget);
            break;
          case 'addUser':
            arAkahukuLink.addUser(lastTarget);
            break;
          case 'openAsAutoLink':
            arAkahukuLink.openAsAutoLink(lastTarget, msg.args[1]);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'arAkahukuJPEG':
        switch (msg.method) {
          case 'closeThumbnail':
            arAkahukuJPEG.closeThumbnail(lastTarget);
            break;
          case 'openThumbnail':
            arAkahukuJPEG.openThumbnail(lastTarget);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'arAkahukuImage':
        switch (msg.method) {
          case 'onSaveImageClick':
            arAkahukuImage.onSaveImageClick(...msg.args);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'arAkahukuUI':
        switch (msg.method) {
          case 'applyDocument': // browser_action
            arAkahukuUI.applyDocument(document);
            break;
          case 'addDocumentToExternalBoards': // browser_action
            arAkahukuUI.addDocumentToExternalBoards(document);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'arAkahukuThread': // browser_action
        switch (msg.method) {
          case 'toggleResPanel':
            arAkahukuThread.toggleResPanel(document);
            break;
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
      case 'contextmenu-content.js': // special action for browser_action
        switch (msg.method) {
          case 'getContentDataForBrowserAction': {
            let data = {
              browser_action: {
                isAkahukuApplied: false,
                isResPanelOpened: false,
                isReplyMode: false,
                isAppliable: document.location.protocol.startsWith('http'),
              },
            };
            let param = Akahuku.getDocumentParam(document);
            if (param) {
              data.browser_action.isAkahukuApplied = true;
              if (param.respanel_param) {
                data.browser_action.isResPanelOpened = true;
              }
              if (param.location_info && param.location_info.isReply) {
                data.browser_action.isReplyMode = true;
              }
            }
            // Send context data to update menus
            browser.runtime.sendMessage({
              'target': 'context-menu.js',
              'command': 'setContentData',
              'args': [data],
            });
            break;
          }
          case 'runCommand': { // for shortcut keys
            switch (msg.args[0]) {
              case 'focus-comment':
                arAkahukuPostForm.focusCommentbox(document);
                break;
              case 'toggle-sage':
                arAkahukuPostForm.toggleSageButton(document);
                break;
              case 'save-MHT':
                if (document.getElementById('akahuku_savemht_button'))
                  arAkahukuMHT.saveMHT(document);
                break;
            }
            break;
          }
          default:
            Akahuku.debug.warn('Unknown method;', msg);
        }
        break;
    }
    return;
  });
})();

