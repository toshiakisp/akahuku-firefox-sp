
import {default as _console} from '/content/console.js';

import {ObserverService} from '/content/observer-service-content.js';
import {arAkahukuSidebar} from '/content/mod/arAkahukuSidebar.js';

const scope = {
  windowId: browser.windows.WINDOW_ID_NONE,
  tabId: browser.tabs.TAB_ID_NONE,
  frameId: browser.runtime.getFrameId(window),
};
await Promise.allSettled([
  browser.windows.getCurrent().then(w => {
    scope.windowId = w.id;
  }),
  browser.tabs.getCurrent().then(tab => {
    scope.tabId = tab?.id ?? browser.tabs.TAB_ID_NONE;
  }),
]);

const initializedDocs = [];
export default function initContextMenuSidebar (targetDocument=document) {
  if (!targetDocument || !/^moz-extension:/.test(targetDocument.URL)) {
    _console.warn('No valid document specified.');
    return;
  }
  if (initializedDocs.includes(targetDocument)) {
    _console.warn('Already initialized for the document:', targetDocument.URL);
    return;
  }
  initializedDocs.push(targetDocument);

  const isToplevel = (targetDocument == document);
  if (isToplevel) {
    //トップレベル：iframeが追加されたらそちらにも適用する準備
    new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          let tagName = node.tagName?.toLowerCase();
          if (tagName != 'iframe') {
            node = node.querySelector?.('iframe') || node;
            tagName = node.tagName?.toLowerCase();
          }
          if (tagName == 'iframe') {
            node.addEventListener('load', (event) => {
              const doc = event.target.contentDocument;
              if (/^moz-extension:/.test(doc.URL)) {
                initContextMenuSidebar(doc);
              }
            }, true);
          }
        });
      });
    }).observe(document.getElementById('akahuku_sidebar_deck'), {
      subtree: true, childList: true,
    });
  }

  // Capture target of context menu
  let lastTarget;
  targetDocument.addEventListener('contextmenu', (cev) => { try{
    lastTarget = cev.target;

    browser.menus.overrideContext({
      showDefaults: false,
    });

    //メニュー項目設定更新のための"バックグラウンドでは得られない情報"を収集して送る
    const currentTargetDocument = cev.target.ownerDocument || cev.target;
    const sidebarDocument = currentTargetDocument.defaultView.top.document;
    const tabcontainer = cev.target.closest('ak-tabcontainer');
    const deck = cev.target.closest('ak-deck');
    const button = cev.target.closest('button');
    const data = {
      sidebar: {
        inTabbar: tabcontainer ? true : false,
        isTab: tabcontainer && button ? true : false,
        isTabActive: tabcontainer && button && button.getAttribute('selected') ? true : false,
        activeBoardName: tabcontainer ? button?.id?.replace(/^akahuku_sidebar_tab_/,'') : '',
        inDeck: deck ? true : false,
        inDeckControl: false,
        menuType: '',
        menuId: '',
        // inside iframe
        inIframe: false,
        onThread: false,
        isThreadMarked: false,
        threadNum: -1,
        isBusy: sidebarDocument.querySelector('button.refresh[disabled="true"]') ? true : false,
      }
    };
    if (isToplevel) {
      if (tabcontainer) {
        // can ben shadow dom elements
        let t = cev.explicitOriginalTarget;
        if (!t.closest) t = t.parentElement;
        const btn = t.closest('button');
        if (btn?.classList.contains('menubutton')) {
          data.sidebar.menuType = 'tab-menu';
          data.sidebar.menuId = btn.id;
        }
      }
      if (deck) {
        data.sidebar.inDeckControl = true;
        data.sidebar.activeBoardName = deck.selectedPanel?.id?.replace(/^akahuku_sidebar_deck_/,'');
      }
      if (deck && button) {
        data.sidebar.menuId = button.id;
        if (button.classList.contains('refresh_menu')) {
          data.sidebar.menuType = 'refresh';
        }
        else if (button.classList.contains('sortorder_menu')) {
          data.sidebar.menuType = 'sortorder';
        }
      }
    } else {//sub document in iframe
      data.sidebar.inDeck = true;
      data.sidebar.inIframe = true;
      data.sidebar.activeBoardName = cev.target.ownerDocument.location?.hash.substring(1);
      const thread = cev.target.closest('.akahuku_sidebar_thread');
      if (thread) {
        data.sidebar.onThread = true;
        data.sidebar.threadNum = parseInt(thread.getAttribute('__num'));
        data.sidebar.isThreadMarked = (thread.dataset.marked == 'true');
      }
    }
    //data.link = arAkahukuSidebar.getContextMenuContentData(lastTarget);
    // Send context data to update menus
    browser.runtime.sendMessage({
      'target': 'context-menu.js',
      'command': 'setContentData',
      'args': [data],
    });
  } catch (e) {
    _console.exception(e);
  }});

  // Observe menu hidden notification
  let observer = {
    observe: function (contexts, topic, data) {
      if (topic == 'menu-hidden') {
        lastTarget = null;
      }
    }
  };
  ObserverService.addObserver(observer, 'menu-hidden');
  targetDocument.addEventListener('unload', (ev) => {
    ObserverService.removeObserver(observer, 'menu-hidden');
  });
};

