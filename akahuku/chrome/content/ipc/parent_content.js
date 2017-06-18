/**
 * This js is loaded to overwrite methods of e10s XUL Akahuku in the
 * main process so that XUL-dependent (UI) codes cooperates e10s
 * Akahuku modules in the content process.
 */

(function () {

arAkahukuImage.selectSaveImageDirFromXUL = function () {
  var targetFrame = (gContextMenu
      ? gContextMenu.browser.messageManager
      : arAkahukuImage.__IPC_popupFrame);
  arAkahukuImage.__IPC_popupFrame = null;
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Image/selectSaveImageDirFromXUL", arguments,
     targetFrame);
};



arAkahukuJPEG.openThumbnail = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("JPEG/openThumbnail",
     [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuJPEG.closeThumbnail = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("JPEG/closeThumbnail",
     [gContextMenu.target],
     gContextMenu.browser.messageManager);
};



arAkahukuLink.setExt = function (type, ext) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/setExt", [type, ext, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.addUser = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/addUser", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.openLink = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/openLink", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.saveLink = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/saveLink", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.copyLink = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/copyLink", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuLink.openAsAutoLink = function (event) {
  var eventDummy = {shiftKey: event.shiftKey}; // minimum requirements
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Link/openAsAutoLink", [eventDummy, gContextMenu.target],
     gContextMenu.browser.messageManager);
};



arAkahukuMHT.saveMHTForBrowser = function (browser) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("MHT/saveMHTForBrowser", [null],
     browser.messageManager);
};



arAkahukuQuote.quote = function (addQuotePrefix, focusTextArea, optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quote", [addQuotePrefix, focusTextArea, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.quoteToMailBox = function (focusMailBox, optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quoteToMailBox", [focusMailBox, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.quoteToNameBox = function (focusNameBox, optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/quoteToNameBox", [focusNameBox, gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.googleImage = function (optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/googleImage", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};
arAkahukuQuote.wikipedia = function (optTarget) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Quote/wikipedia", [gContextMenu.target],
     gContextMenu.browser.messageManager);
};



arAkahukuThread.showResPanel = function () {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Thread/showResPanel", [],
     gBrowser.selectedBrowser.messageManager);
};
arAkahukuThread.closeResPanel = function (targetDocument) {
  arAkahukuIPCRoot.sendAsyncCommandToFrame
    ("Thread/closeResPanel", [],
     gBrowser.selectedBrowser.messageManager);
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



//
// In XUL, document params are registered by linking its browser.
//
Akahuku.getFocusedDocumentParam = function () {
  var focusedBrowser = document.commandDispatcher.focusedElement;
  if (!focusedBrowser
      || !focusedBrowser instanceof Components.interfaces.nsIDOMXULElement
      || !/(?:xul:)?browser/i.test (focusedBrowser.nodeName)) {
    return null;
  }
  return Akahuku.getDocumentParamForBrowser (focusedBrowser);
};



arAkahukuUI.getFocusedDocumentInfo = function () {
  var param = Akahuku.getFocusedDocumentParam ();
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


})();

