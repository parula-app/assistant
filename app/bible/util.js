/**
 * (c) 2013-2019 Ben Bucksch
 */

//var fs = require("fs").promises;

/**
 * @param test {Boolean}
 * @param errorMsg {String}
 */
function assert(test, errorMsg) {
  errorMsg = errorMsg || "assertion failed";
  if ( !test) {
    throw new Exception(errorMsg);
  }
}

function ddebug(msg) {
  if (console) {
    console.debug(msg);
  }
}


/**
 * Create a subtype.
 */
function extend(child, supertype)
{
  var properties = Object.create(null);
  Object.getOwnPropertyNames(child.prototype).forEach(function(key) {
    properties[key] = Object.getOwnPropertyDescriptor(child.prototype, key);
  });
  child.prototype = Object.create(supertype.prototype, properties);
}

/**
 * Creates a callback that calls a function with the given parameters.
 *
 * E.g. addEventListener("click", makeCallbackParams(setTitle, title), true);
 * will call: setTitle(title);
 * makeCallbackParams(func, foo, bar, baz)
 * will call: func(foo, bar, baz);
 *
 * @param func {Function}   to be called
 * @param arg, arg, arg {...}   to be passed to |func|
 * @returns {Function}
 */
function cbParams(func) {
  var args = Array.prototype.slice.call(arguments, 1); // remove first arg |func|, keep rest
  return function() {
    func.apply(null, args);
  };
}

/**
 * Creates a callback that calls a method on a given object
 *
 * E.g. addEventListener("click", makeCallbackOnObj(e, setTitle, title), true);
 * will call: e.setTitle(title);
 * makeCallbackParams(obj, func, foo, bar, baz)
 * will call: obj.func(foo, bar, baz);
 *
 * @param obj {Object}   on which instance to call |func|. obj.func() must exist.
 * @param func {Function}   to be called
 * @param arg, arg, arg {...}   to be passed to |func|
 * @returns {Function}
 */
function cbObj(obj, method) {
  var args = Array.prototype.slice.call(arguments, 2); // remove args |obj| and |func|, keep rest
  return function() {
    method.apply(obj, args);
  };
}


/**
 * Removes |element| from |array|.
 * @param array {Array} to be modified. Will be modified in-place.
 * @param element {Object} If |array| has a member that equals |element|,
 *    the array member will be removed.
 * @param all {boolean}
 *     if true: remove all occurences of |element| in |array.
 *     if false: remove only the first hit
 * @returns {Integer} number of hits removed (0, 1 or more)
 */
function arrayRemove(array, element, all)
{
  var found = 0;
  var pos = 0;
  while ((pos = array.indexOf(element, pos)) != -1)
  {
    array.splice(pos, 1);
    found++
    if ( ! all)
      return found;
  }
  return found;
}

/**
 * Check whether |element| is in |array|
 * @param array {Array}
 * @param element {Object}
 * @returns {boolean} true, if |array| has a member that equals |element|
 */
function arrayContains(array, element)
{
  return array.indexOf(element) != -1;
}


function shortenText(text, maxLen) {
  return text.length <= maxLen ? text : text.substr(0, maxLen) + "…";
}

/**
 * Adds leading characters until a certain length is filled.
 * This can be used to add leading 0s, so that a number always has
 * at least n digits.
 * @param str {String or Integer}  the number, e.g. "9"
 * @param pad {String}   what you want to put in front, e.g "0"
 * @param minlen {Integer}   minimum length
 *     determines the number of 0s in front, e.g. 3
 * @returns e.g. "009"
 */
function padLeading(str, pad, minlen) {
    str = str + ""; // convert to String
    while (str.length < minlen) {
      str = pad + str;
    }
    return str;
}

function trim(str) {
  return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
}

/**
 * Translate string
 * @param id {String}   key in "appui.properties" file
 * @param args {String or Array of String}   replacement parameters
 */
function tr(id, args) {
  if (typeof(args) == "string") {
    args = [ args ];
  }
  if ( !tr._sb) {
    tr._sb = new StringBundle("appui")
  }
  return tr._sb.get(id, args);
}

function dataURL(relPath, lang) {
  if (!lang) {
    lang = "en"; // TODO i18n
  }
  assert(relPath && typeof(relPath) == "string");
  return "./data/bible/" + lang + "/" + relPath;
}

function mediaURL(relPath) {
  return "./data/bible/media/" + relPath;
}

/**
 * @param filename {String}  "/data/bar/baz.json" or relative "bar/baz.json"
 * @dataType {String-enum}  Expected type of file contents
 *    "text", "json", "xml" or "html"
 * @param successCallback {Function(result)}
 *    result {String or Object or DOMDocument}
 * @param errorCallback {Function(e {Exception or Error})}
 */
function loadURL(filename, dataType, successCallback, errorCallback) {
  assert(typeof(filename) == "string" && filename, "need filename");
  assert(typeof(dataType) == "string" && dataType, "need type");
  try {
    console.log("Loading " + filename);
    fs = loadURL.fs; // HACK
    fs.readFile(filename, { encoding: "utf8", flag: "r" })
    .then(data => {
      if ( !data) {
        throw "File is empty";
      }
      if (dataType == "json") {
        data = JSON.parse(data);
        //console.log("returning JSON " + JSON.stringify(data, null, 2).substr(0, 1000));
      } else if (dataType == "text") {
        // OK
      } else {
        throw "Unsupported data type " + dataType;
      }
      console.log("file loaded");
      successCallback(data);
    })
    .catch(e => errorCallback(e));
  } catch (e) {
    errorCallback(e);
  }
}




function runAsync(func, errorCallback) {
  assert(typeof(func) == "function");
  assert(typeof(errorCallback) == "function");
  setTimeout(function() {
    try {
      func();
    } catch (e) { errorCallback(e); }
  }, 0);
}

function runLater(millisec, func, errorCallback) {
  assert(typeof(func) == "function");
  assert(typeof(errorCallback) == "function");
  setTimeout(function() {
    try {
      func();
    } catch (e) { errorCallback(e); }
  }, millisec);
}

function Exception(msg)
{
  this._message = msg;

  // get stack
  try {
    not.found.here += 1; // force a native exception ...
  } catch (e) {
    this.stack = e.stack; // ... to get the current stack
  }
  //debug("ERROR (exception): " + msg + "\nStack:\n" + this.stack);
}
Exception.prototype =
{
  get message()
  {
    return this._message;
  },
  set message(msg)
  {
    this._message = msg;
  },
  toString : function()
  {
    return this._message;
  }
}

function NotReached(msg)
{
  Exception.call(this, msg);
}
extend(NotReached, Exception);


function UserCancelledException(msg)
{
  // The user knows they cancelled so I don't see a need
  // for a message to that effect.
  if (!msg)
    msg = "";
  Exception.call(this, msg);
}
UserCancelledException.prototype =
{
}
extend(UserCancelledException, Exception);


/**
 * Return the contents of an object as multi-line string, for debugging.
 * @param obj {Object} What you want to show
 * @param name {String} What this object is. Used as prefix in output.
 * @param maxDepth {Integer} How many levels of properties to access.
 *    1 = just the properties directly on |obj|
 * @param curDepth {Integer} internal, ignore
 */
function dumpObject(obj, name, maxDepth, curDepth)
{
  if (curDepth == undefined)
    curDepth = 1;
  if (maxDepth != undefined && curDepth > maxDepth)
    return "";

  var result = "";
  var i = 0;
  for (var prop in obj)
  {
    i++;
    if (typeof(obj[prop]) == "xml")
    {
      result += name + "." + prop + "=[object]" + "\n";
      result += dumpObject(obj[prop], name + "." + prop, maxDepth, curDepth+1);
    }
    else if (typeof(obj[prop]) == "object")
    {
      if (obj[prop] && typeof(obj[prop].length) != "undefined")
        result += name + "." + prop + "=[probably array, length " + obj[prop].length + "]" + "\n";
      else
        result += name + "." + prop + "=[object]" + "\n";
      result += dumpObject(obj[prop], name + "." + prop, maxDepth, curDepth+1);
    }
    else if (typeof(obj[prop]) == "function")
      result += name + "." + prop + "=[function]" + "\n";
    else
      result += name + "." + prop + "=" + obj[prop] + "\n";
  }
  if ( ! i)
    result += name + " is empty\n";
  return result;
}

/*
module.exports = {
  loadURL: loadURL,
  assert: assert,
  ddebug: ddebug,
  extend: extend,
  cbParams: cbParams,
  cbObj: cbObj,
  arrayRemove: arrayRemove,
  shortenText: shortenText,
  padLeading: padLeading,
  trim: trim,
  tr: tr,
  dataURL: dataURL,
  Exception: Exception,
  NotReached: NotReached,
  dumpObject: dumpObject,
}
*/
