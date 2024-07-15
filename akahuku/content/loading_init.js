if (document.readyState != 'complete'
  && document.contentType == 'text/html'
  && !(window.frameElement
    && window.frameElement.id == 'akahuku_reply_target_frame')
) {
  // Request futher injection
  browser.runtime.connect({name:'content-loader'});
}
