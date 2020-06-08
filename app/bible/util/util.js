/**
 * (c) 2013-2019 Ben Bucksch
 */

import StringBundle from "../util/stringbundle.js";
import fs from 'fs';

/**
 * @param test {Boolean}
 * @param errorMsg {String}
 */
export function assert(test, errorMsg) {
  errorMsg = errorMsg || "assertion failed";
  if ( !test) {
    throw new Exception(errorMsg);
  }
}

export function ddebug(msg) {
  if (console) {
    console.debug(msg);
  }
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
export function cbParams(func) {
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
export function cbObj(obj, method) {
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
export function arrayRemove(array, element, all)
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


export function shortenText(text, maxLen) {
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
export function padLeading(str, pad, minlen) {
    str = str + ""; // convert to String
    while (str.length < minlen) {
      str = pad + str;
    }
    return str;
}

export function trim(str) {
  return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
}

/**
 * @param path {String}
 *        the filename of the string bundle, in your addon's locale/<lang>/ directory
 * @param lang {String} ISO 2-letter language code
 */
export function dataURL(relPath, lang) {
  assert(relPath && typeof(relPath) == "string");
  assert(lang && typeof(lang) == "string" && lang.length == 2, "Need language");
  return "data/bible/" + lang + "/" + relPath;
}

export function mediaURL(relPath) {
  return "data/bible/media/" + relPath;
}

/**
 * @param filePath {String}   file path relative to project root
 * @param dataType {String-enum}  Expected type of file contents
 *    "text", "json", "xml" or "html"
 * @returns {String or Object or DOMDocument}
 */
export async function loadURL(filePath, dataType) {
  assert(dataType == "json", "Only JSON supported for now");
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Parses a URL query string into an object.
 *
 * @param queryString {String} query ("?foo=bar&baz=3") part of the URL,
 *     with or without the leading question mark
 * @returns {Object} JS map, e.g. { foo : "bar", baz: "3" } for the example above
 */
export function parseURLQueryString(queryString)
{
  if (URLSearchParams) {
    let params = new URLSearchParams(queryString);
    let result = {}
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  var queryParams = {};
  if (queryString.charAt(0) == "?")
    queryString = queryString.substr(1); // remove leading "?", if it exists
  var queries = queryString.split("&");
  for (var i = 0; i < queries.length; i++) {
    try {
      if ( !queries[i]) {
        continue;
      }
      var querySplit = queries[i].split("=");
      var value = querySplit[1].replace(/\+/g, " "); // "+" is space, before decoding
      queryParams[querySplit[0]] = decodeURIComponent(value);
    } catch (e) {
      // Errors parsing the query string are not fatal, we should just continue
      errorNonCritical(e);
    }
  }
  return queryParams;
}

export async function runAsync() {
  return new Promise((successCallback, errorCallback) => {
    setTimeout(function() {
      try {
        successCallback();
      } catch (ex) { errorCallback(ex); }
    }, 0);
  });
}

export async function runLater(millisec) {
  assert(typeof(millisec) == "number");
  return new Promise((successCallback, errorCallback) => {
    setTimeout(function() {
      try {
        successCallback();
      } catch (ex) { errorCallback(ex); }
    }, millisec);
  });
}

/**
 * @param promise {Promise}  Pass a called async function in here,
 *     e.g. noAwait(load(), errorCallback);
 */
export function noAwait(promise, errorCallbback) {
  assert(typeof(promise.resolve) == "function");
  assert(typeof(errorCallback) == "function");
  (async () => {
    try {
      await promise;
    } catch (ex) {
      errorCallback(ex);
    }
  })();
}

export class Exception {
  constructor(msg) {
    this._message = msg;

    // get stack
    try {
      not.found.here += 1; // force a native exception ...
    } catch (e) {
      this.stack = e.stack; // ... to get the current stack
    }
    //debug("ERROR (exception): " + msg + "\nStack:\n" + this.stack);
  }

  get message() {
    return this._message;
  }
  set message(msg) {
    this._message = msg;
  }
  toString() {
    return this._message;
  }
}

export class NotReached extends Exception {
  constructor(msg) {
    super(msg);
  }
}

export class UserCancelledException extends Exception {
  constructor(msg) {
    // The user knows they cancelled, so I don't see a need
    // for a message to that effect.
    super(msg || "");
  }
}

export class ServerException extends Exception {
  constructor(serverMsg, code, uri) {
    super(serverMsg);
    this.rootErrorMsg = serverMsg;
    this.code = code;
    this.uri = uri;
  }
}

export function removeChildElements(domElement) {
  while (domElement.firstChild) {
    domElement.firstChild.remove();
  }
}

/**
 * Return the contents of an object as multi-line string, for debugging.
 * @param obj {Object} What you want to show
 * @param name {String} What this object is. Used as prefix in output.
 * @param maxDepth {Integer} How many levels of properties to access.
 *    1 = just the properties directly on |obj|
 * @param curDepth {Integer} internal, ignore
 */
export function dumpObject(obj, name, maxDepth, curDepth)
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
