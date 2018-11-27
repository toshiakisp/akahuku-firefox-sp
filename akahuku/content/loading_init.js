if (document.readyState != 'complete') {
  // Request futher injection
  browser.runtime.connect({name:'content-loader'});
}
