import { assert } from "../util/util.js";
import fs from 'fs';

/**
 * A string bundle.
 *
 * This object presents two APIs: a deprecated one that is equivalent to the API
 * for the stringbundle XBL binding, to make it easy to switch from that binding
 * to this module, and a new one that is simpler and easier to use.
 *
 * The benefit of this module over the XBL binding is that it can also be used
 * in JavaScript modules and components, not only in chrome JS.
 *
 * To use this module, import it, create a new instance of StringBundle,
 * and then use the instance's |get| and |getAll| methods to retrieve strings
 * (you can get both plain and formatted strings with |get|):
 *
 *   var strings =
 *     new StringBundle("strings.properties");
 *   var foo = strings.get("foo");
 *   var barFormatted = strings.get("bar", [arg1, arg2]);
 *   for each (var string in strings.getAll())
 *     dump (string.key + " = " + string.value + "\n");
 *
 * @param path {String}
 *        relative filename of the string bundle, in your addon's locale/<lang>/ directory
 */
export default function StringBundle(path, lang) {
  this._filename = "./app/bible/locale/" + lang + "/" + path;
}

StringBundle.prototype = {
  /**
   * Relative file path of the string bundle
   * {string}
   */
  _filename: null,

  /**
   * { map property ID {String} -> translation {String} }
   */
  _properties : null,

  /**
   * Read the string bundle from disk.
   * Only if necessary.
   */
  _ensureLoaded : function() {
    if (this._properties)
      return;
    var fileContent = fs.readFileSync(this._filename, 'utf8');
    this._properties = {};
    //console.log(this._url + ": " + fileContent);
    var spLines = StringBundle.splitLines(fileContent);
    for (var i in spLines) {
      var line = spLines[i];
      if (line.length > 0 && line[0] == "#") // comment
        continue;
      var sp = line.split("=", 2);
      if (sp.length < 2)
        continue;
      var id = StringBundle.trim(sp[0]);
      var translation = StringBundle.trim(sp[1]);
      this._properties[id] = translation;
    }
    //console.dir(this._properties);
  },

  _get: function(key) {
    try {
      this._ensureLoaded();
    } catch (e) {
      console.error("Could not get stringbundle <" + this._url +
          ">, error: " + e);
      throw e;
    }
    if (this._properties[key] === undefined) {
      var msg = "Could not get key " + key + " from stringbundle <" +
          this._url + ">";
      console.error(msg);
      throw msg;
    }

    return this._properties[key];
  },

  /**
   * Get a string from the bundle.
   *
   * @param key {String}
   *        the identifier of the string to get
   * @param args {array} [optional]
   *        an array of arguments that replace occurrences of %S in the string
   *
   * @returns {String} the value of the string
   */
  get: function(key, args) {
    if (args)
      return this.getFormattedString(key, args);
    else
      return this._get(key);
  },

  /**
   * Get a string from the bundle.
   * @deprecated use |get| instead
   *
   * @param key {String}
   *        the identifier of the string to get
   *
   * @returns {String}
   *          the value of the string
   */
  getString: function(key) {
    return this._get(key);
  },

  /**
   * Get a formatted string from the bundle.
   * @deprecated use |get| instead
   *
   * @param key {string}
   *        the identifier of the string to get
   * @param args {array}
   *        an array of arguments that replace occurrences of %S in the string
   *
   * @returns {String}
   *          the formatted value of the string
   */
  getFormattedString: function(key, args) {
    var result = this._get(key);
    if (result.indexOf("%1") > -1) {
      for (var i = 0; i < args.length; i++)
        result = result.replace("%" + (i+1), args[i]);
    } else { // Just simple %S
      for (var i in args) {
        result = result.replace("%S", args[i]);
      }
    }
    return result;
  },

  /**
   * @see pluralform()
   * @param key {string}
   *        the identifier of the stringbundle string
   * @param number {Integer}
   *        %S in the string will be replaced with this number
   */
  getPluralForm : function(key, number) {
    return StringBundle.pluralform(number, this.get(key));
  },

  /**
   * Get all the strings in the bundle.
   *
   * @returns {Array}
   *          an array of objects with key and value properties
   */
  getAll: function() {
    this._ensureLoaded();
    var strings = [];
    for (var i in this._properties) {
      var id = this._properties[i];
      strings.push({ key: id, value: this._properties[id] });
    }
    return strings;
  },
  
}



/**
 * Reads UTF8 data from a URL.
 *
 * @param url {String}   what you want to read
 * @return {String}   the contents of the file, as one long string
 */
StringBundle.readURLasUTF8 = function(url)
{
  assert(url && typeof(url) == "string", "uri must be a string");
  var req = new XMLHttpRequest();
  console.log("trying to open " + url);
  req.onerror = function (e) { console.error(e); }
  req.onload = function () {}
  //req.overrideMimeType("text/plain; charset=UTF-8");
  req.open("GET", url, false); // sync
  req.send(); // blocks
  return req.responseText;
}

/**
 * Takes a string (which is typically the content of a file,
 * e.g. the result returned from readURLUTF8() ), and splits
 * it into lines, and returns an array with one string per line
 *
 * Linebreaks are not contained in the result,,
 * and all of \r\n, (Windows) \r (Mac) and \n (Unix) counts as linebreak.
 *
 * @param content {String} one long string with the whole file
 * @return {Array of String} one string per line (no linebreaks)
 */
StringBundle.splitLines = function(content)
{
  content = content.replace("\r\n", "\n");
  content = content.replace("\r", "\n");
  return content.split("\n");
}

/**
 * Strip trailing and preceeding spaces from a string
 * @param str {String}
 * @returns {String}
 */
StringBundle.trim = function(str) {
  return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
}


/**
 * 3-way plural form for 0, 1 and >1
 * @param count {Integer}
 * @param str {String} a;b;c
 * @return {String}
 *   if count = 0, use a
 *   if count = 1, use b
 *   if count > 1, use c
 *   replace %S with count
 */
StringBundle.pluralform = function(count, str)
{
  var sp = str.split(";");
  assert(sp.length == 3, "pluralform: expected 3 parts in str: " + str);
  var index;
  if (count == 0)
    index = 0;
  else if (count == 1)
    index = 1;
  else
    index = 2;
  return sp[index].replace("%S", count);
}
