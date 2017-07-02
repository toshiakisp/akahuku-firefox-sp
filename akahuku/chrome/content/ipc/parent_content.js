/**
 * This js is loaded to overwrite methods of e10s XUL Akahuku in the
 * main process so that XUL-dependent (UI) codes cooperates e10s
 * Akahuku modules in the content process.
 */

(function () {

arAkahukuImage.selectSaveImageDirFromXUL = function (targetDirIndex, linkmenu, browser) {
  var targetFrame = browser.messageManager;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Image/selectSaveImageDirFromXUL", [targetDirIndex, linkmenu],
     targetFrame);
};



arAkahukuJPEG.onClickOpenThumbnail = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("JPEG/openThumbnail",
     [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuJPEG.onClickCloseThumbnail = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("JPEG/closeThumbnail",
     [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};



arAkahukuLink.onClickSetExt = function (event, type, ext) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/setExt", [type, ext, window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuLink.onClickAddUser = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/addUser", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuLink.onClickOpenLink = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/openLink", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuLink.onClickSaveLink = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/saveLink", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuLink.onClickCopyLink = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/copyLink", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuLink.onClickOpenAsAutoLink = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/openAsAutoLink", [window.gContextMenu.target, event.shiftKey],
     window.gContextMenu.browser.messageManager);
};



arAkahukuMHT.saveMHTForBrowser = function (browser) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("MHT/saveMHTForBrowser", [null],
     browser.messageManager);
};



arAkahukuQuote.onClickQuote = function (event, addQuotePrefix, focusTextArea) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quote", [addQuotePrefix, focusTextArea, window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuQuote.onClickQuoteToMailBox = function (event, focusMailBox) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quoteToMailBox", [focusMailBox, window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuQuote.onClickQuoteToNameBox = function (event, focusNameBox) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quoteToNameBox", [focusNameBox, window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuQuote.onClickGoogleImage = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/googleImage", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuQuote.onClickWikipedia = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/wikipedia", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};
arAkahukuQuote.onClickCopyToClipboard = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/copyToClipboard", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};



arAkahukuThread.showResPanelForBrowser = function (targetBrowser) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Thread/showResPanel", [],
     targetBrowser.messageManager);
};
arAkahukuThread.closeResPanelForBrowser = function (targetBrowser) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Thread/closeResPanel", [],
     targetBrowser.messageManager);
};



function broadcastNavHistoryMessage (eventName, aURI) {
  switch (eventName) {
    case "ClearHistory":
    case "DeleteURI":
    case "EndUpdateBatch":
    case "Visit":
      arAkahukuIPCRoot.broadcastAsyncCommandToChildProcesses
        ("NavHistoryObserver/observe", [eventName, aURI]);
      break;
    default:
      Akahuku.debug.error
        ("invalid name for broadcastNavHistoryMessage; "+eventName);
  }
}
arAkahukuCatalog.onClearHistory = function () {
  broadcastNavHistoryMessage ("ClearHistory");
};
arAkahukuCatalog.onDeleteURI = function (aURI, aGUID) {
  broadcastNavHistoryMessage ("DeleteURI", aURI);
};
arAkahukuCatalog.onDeleteVisits = function (aURI, aVisitTime, aGUID) {
  broadcastNavHistoryMessage ("DeleteVisits", aURI);
};
arAkahukuCatalog.onEndUpdateBatch = function () {
  broadcastNavHistoryMessage ("EndUpdateBatch");
};
arAkahukuCatalog.onVisit = function (aURI, aVisitID, aTime, aSessionID,
    aReferringID, aTransitionType, aGUID) {
  broadcastNavHistoryMessage ("Visit", aURI);
};
arAkahukuLink.onVisit = function (aURI, aVisitID, aTime, aSessionID,
    aReferringID, aTransitionType, aGUID) {
  broadcastNavHistoryMessage ("Visit", aURI);
};



arAkahukuP2P.onClickDeleteCache = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("P2P/deleteCache", [window.gContextMenu.target],
     window.gContextMenu.browser.messageManager);
};



arAkahukuPostForm.focusCommentboxForBrowser = function (browser) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("PostForm/focusCommentboxForBrowser", [null],
     browser.messageManager);
};
arAkahukuPostForm.toggleSageButtonForBrowser = function (browser) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("PostForm/toggleSageButtonForBrowser", [null],
     browser.messageManager);
};



arAkahukuReload.diffReloadForBrowser = function (browser, doSync) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Reload/diffReloadForBrowser", [null, doSync],
     browser.messageManager);
};
arAkahukuReload.reloadOnDemandForBrowser = function (browser, trySync) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Reload/reloadOnDemandForBrowser", [null, trySync],
     browser.messageManager);
};



//
// In XUL, document params are registered by linking its browser.
//
Akahuku.getFocusedDocumentParam = function (window) {
  var focusedBrowser = window.document.commandDispatcher.focusedElement;
  if (!focusedBrowser
      || !focusedBrowser instanceof Components.interfaces.nsIDOMXULElement
      || !/(?:xul:)?browser/i.test (focusedBrowser.nodeName)) {
    return null;
  }
  return Akahuku.getDocumentParamForBrowser (focusedBrowser);
};



arAkahukuUI.getFocusedDocumentInfo = function (window) {
  var param = Akahuku.getFocusedDocumentParam (window);
  var focusedBrowser = param ? param.targetBrowser : null;
  var info = {
    isAkahukuApplied: param != null,
    isAbleToAddExternal: param == null && focusedBrowser
      && arAkahukuBoard.isAbleToAddExternal (focusedBrowser.currentURI.spec),
    isRespanelOpenable: param && param.location_info.isReply,
    isRespanelOpened: param && param.flags.respanel_param,
    isRespanelOrphaned: false,
    targetDocument: null,
  };
  return info;
};
arAkahukuUI.addFocusedToExternalBoards = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("UI/addDocumentToExternalBoards", [],
     window.gBrowser.selectedBrowser.messageManager);
};
arAkahukuUI.applyFocusedDocument = function (event) {
  var window = event.currentTarget.ownerDocument.defaultView;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("UI/applyDocument", [],
     window.gBrowser.selectedBrowser.messageManager);
};
arAkahukuUI._onContextMenuHidden_orig = arAkahukuUI.onContextMenuHidden;
arAkahukuUI.onContextMenuHidden = function () {
  arAkahukuUI._onContextMenuHidden_orig ();
  arAkahukuIPCRoot.broadcastAsyncCommandToChildProcesses
    ("UI/onContextMenuHidden", []);
};



})();

