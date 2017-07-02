
// Frame script

Components.utils.import("resource://akahuku/akahuku.jsm");
Akahuku.startup (); // if necessary for a process
Akahuku.useFrameScript = true;
Akahuku.addFrame (this);

// Start child-process relay for e10s-multi
Components.utils.import ("resource://akahuku/notification-relay.jsm");

