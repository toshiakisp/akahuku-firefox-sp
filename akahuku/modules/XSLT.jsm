/**
 * XSLTProcessor and XMLSerializer constructors for e10s
 *
 *   For problems that e10s's content processs claim: 
 *     "error:ReferenceError: XSLTProcessor is not defined"
 *     "error:ReferenceError: XMLSerializer is not defined"
 */

var EXPORTED_SYMBOLS = [
  "XSLTProcessor",
  "XMLSerializer",
];

const Cc = Components.classes;
const Ci = Components.interfaces;

function XSLTProcessor () {
  return Cc ["@mozilla.org/document-transformer;1?type=xslt"]
    .createInstance (Ci.nsIXSLTProcessor);
}

function XMLSerializer () {
  return Cc ["@mozilla.org/xmlextras/xmlserializer;1"]
    .createInstance (Ci.nsIDOMSerializer);
}

