
var Cu = Components.utils;

Cu.import ("resource://akahuku/p2p-channel.jsm");
Cu.import ("resource://gre/modules/XPCOMUtils.jsm");
var components = [
  arAkahukuP2PChannel,
];

if ("generateNSGetFactory" in XPCOMUtils) {
  // Gecko 2.0+
  var NSGetFactory = XPCOMUtils.generateNSGetFactory (components);
}
else {
  // Gecko 1.9.x
  var NSGetModule = XPCOMUtils.generateNSGetModule (components);
}

