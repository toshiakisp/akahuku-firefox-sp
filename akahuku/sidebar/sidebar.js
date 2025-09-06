// Main module of Akahuku Sidebar

import {Deck, TabContainer} from './uielements.js';

import {Loader} from '/content/loading_begin.js';
import {arAkahukuBoard} from '/content/mod/arAkahukuBoard.js';
import {arAkahukuConfig} from '/content/mod/arAkahukuConfig.js';
import {arAkahukuP2P} from '/content/mod/arAkahukuP2P.js';
import {arAkahukuSidebar} from '/content/mod/arAkahukuSidebar.js';

import {default as _console} from '/content/console.js';
import {default as initContextMenu} from '/sidebar/contextmenu-sidebar.js';

_console.prefix = 'Akahuku debug(sidebar)';

let Akahuku = { // minimal impl. for sidebar
  debug: _console,
  getConfig : function () {
    Akahuku.enableAll
    = arAkahukuConfig
    .initPref ("bool", "akahuku.all", true);
    Akahuku.debug.enabled
    = arAkahukuConfig
    .initPref ("bool",  "akahuku.ext.debug", false);
  }
};

let gettingCurrentWin = browser.windows.getCurrent();

customElements.define('ak-tabcontainer', TabContainer);
customElements.define('ak-deck', Deck);

arAkahukuConfig.modules = [
  Akahuku,
  arAkahukuSidebar,
  arAkahukuP2P,
  arAkahukuBoard,
];
arAkahukuConfig.init();
initContextMenu();
arAkahukuSidebar.attachToWindow(window);
window.addEventListener('unload', (event) => {
  arAkahukuSidebar.dettachFromWindow(window);
});

Loader.initialize(document),
Loader.addEventListener('DOMContentLoaded', (event) => {
  arAkahukuSidebar.onSidebarLoad(document);
});
Loader.pumpEvents();

// Listen for message
const commands = new Set([
  'updateThreadItem',
  'asyncUpdateVisited',
  'resetCatalogOrder',
  'asyncGetThread',
  'markThread',
  'clearAllThreads',
  'openCatalogSetting',
]);
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== "sidebar.js") {
    return;
  }
  if (!commands.has(msg.command)) {
    throw new Error('Unknwon command: ' + msg.command);
  }
  return arAkahukuSidebar[msg.command](...msg.args);
});

// For debugging
export default {
  Akahuku: Akahuku,
  Config : arAkahukuConfig,
  Loader : Loader,
  Sidebar: arAkahukuSidebar,
  Board  : arAkahukuBoard,
  Elements: {
    TabContainer: TabContainer,
    Deck: Deck,
  },
};
