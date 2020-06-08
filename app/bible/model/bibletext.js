import { assert, dataURL, loadURL } from "../util/util.js";
import StringBundle from "../util/stringbundle.js";
import { Source } from "../model/model.js";

export class BibleText extends Source {
  /**
   * |quote| will be the full text of the verses in |name|.
   *
   * @param storage {Storage}
   * @param name {String}
   * must be an abbr. bible reference in English of the form
   * "1. Cor. 3:2-5".
   */
  constructor(storage, name) {
    assert(storage.getID, "Need storage");
    super("bibletext");

    /**
     * one entry from |BibleText.books|
     */
    this.book = null;
    /**
     * {Integer}
     */
    this.chapter = 0;
    /**
     * {Integer}
     */
    this.verse = 0;
    /**
     * {Integer-enum}
     * 0 = single verse
     * 1 = from a to b, e.g. "1-3"
     * 2 = a and b, e.g. "3, 4"
     * 3 = whole chapter
     */
    this.range = 0;
    /**
     * {Integer}
     */
    this.verseTo = 0;

    /**
     * Footnotes from the bible
     *
     * |quote| here is a substring of |this.quote| = |this.descr| and
     * shows to which word/phrase the footnote belongs.
     *
     * The value is the foot note, as plaintext
     * Do not add HTML here. This isn't verified, though, so when you process
     * this, do not use innerHTML = footnote or similar, but textContent = footnote;
     *
     * {Map quote {String} -> footnote {String}}
     */
    this.footnotes = null;

    this._storage = storage;

    if (name) {
      this.name = name;
      this.init();
    }
  }

  /**
   * Must be called after setting |name|.
   * Parses the reference and sets internal variables
   * like book, chapter etc.
   */
  init() {
    if ( !this.book && this.name) {
      this._parse();
    } else {
      this._setFromVars();
    }
    this.name = this.prettyName;
    this.id = this.codeRef;
  }

  _setFromVars() {
    assert(this.book && this.book.code, "BibleText: name or book missing");
    assert(this.chapter, "chapter missing");
    if (this.verse == 0 && this.verseTo == 0) {
      this.range = 3;
    } else if (this.verseTo == 0 || this.verseTo == this.verse) {
      this.range = 0;
      this.verseTo = 0;
    } else if (this.verseTo == this.verse + 1) {
      this.range = 2;
    } else if (this.verseTo > this.verse) {
      this.range = 1;
    } else {
      assert(false, "can't process verses " + this.verse + "-" + this.verseTo);
    }
  }

  /**
   * Make a copy of |this|, initing the new object
   * with the same values has |this| has,
   * and return the new object.
   */
  clone() {
    var n = new BibleText(this._storage);
    n.book = this.book;
    n.chapter = this.chapter;
    n.verse = this.verse;
    n.range = this.range;
    n.verseTo = this.verseTo;
    n.init();
    return n;
  }

  /**
   * Makes the values of |this| match |other|.
   * @param other {BibleText}
   */
  copyFrom(other) {
    assert(other instanceof BibleText);
    assert(other.book);
    this.book = other.book;
    this.chapter = other.chapter;
    this.verse = other.verse;
    this.range = other.range;
    this.verseTo = other.verseTo;
    this.descr = "";
    this.init();
    return this;
  }

  /**
   * Takes |this.name| as Bible reference and tries
   * to get bible book, chapter and verse(s) from it.
   */
  _parse() {
    assert(this.name, "BibleText.name must be set");
    // digit (optional), dot (optional), spaces (optional),
    // letters (mandatory), dot (optional), spaces (optional),
    // digits (mandatory), spaces (optional),
    // ":" (optional), spaces (optional),
    // digits (optional), spaces (optional),
    // "," or "-" (optional), spaces (optional),
    // digits (optional)
    var matches = BibleText._regexpExact.exec(this.name);
    assert(matches, "BibleText: could not parse " + this.name);
    var bookNumPrefix = "";
    if (matches[1]) {
      bookNumPrefix = parseInt(matches[1]);
    }
    var bookName = matches[2];
    // bookCode = "1co"
    var bookCode = bookNumPrefix + bookName.toLowerCase();
    this.book = BibleText.books.find(o => o.code == bookCode);
    // Can't do that in the same loop, because
    // pr = Proverbs, but pr = Eccl. in German,
    // but we normally need the Engl code.
    // TODO Fix Pr when it's really German, by passing in |lang|
    if ( !this.book) {
      this.book = BibleText.books.find(o => o.longTrNoSpace == bookCode);
    }
    if ( !this.book) {
      this.book = BibleText.books.find(o => o.abbrTrNoSpace == bookCode);
    }
    assert(this.book, "BibleText: book " + bookCode + " not found");
    this.chapter = parseInt(matches[3]);
    if (this.book.chapterCount == 1) {
      this.verse = this.chapter;
      this.chapter = 1;
      return;
    }
    assert(this.chapter <= this.book.chapterCount,
        this.book.longTr + " chapter " + this.chapter + "does not exist");
    if ( !matches[4]) {
      this.range = 3;
      return;
    }
    this.verse = parseInt(matches[4]);
    if ( !matches[6]) {
      this.range = 0; // single verse
    } else if (matches[6] == "-") {
      this.range = 1; // range = from ... to
    } else if (matches[6] == ",") {
      this.range = 2; // and = 2 verses
    } else {
      assert(false, "BibleText: Bad range marker");
    }
    if (this.range) {
      this.verseTo = parseInt(matches[7]);
    }
  }

  /**
   * Creates a standardized, computer-readable Bible reference
   */
  get codeRef() {
    var result = this.book.code + " " + this.chapter;
    if (this.range != 3) {
      result += ":" + this.verse;
      if (this.range) {
        result += (this.range == 1 ? "-" : ",") + this.verseTo;
      }
    }
    return result;
  }

  /**
   * @returns {String} (translated) e.g. "1. Mo. 5:3, 4"
   */
  get prettyName() {
    assert(this.book, "You need to call this._parse() first");
    var result;
    if (this.range == 3) {
      result = this.book.longTr + " " + this.chapter;
    } else {
      result = this.book.abbrTr + " " + this.chapter;
      result += ":" + this.verse;
    }
    if (this.range == 1 || this.range == 2) {
      result += (this.range == 1 ? "-" : ", ") + this.verseTo;
    }
    return result;
  }

  get pageURL() {
    let url = "/bible/" + this.book.code + "/" + this.chapter;
    if (this.range != 3) {
      url += "/" + this.verse;
      if (this.range == 1 || this.range == 2) {
        url += "/to/" + this.verseTo;
      }
    }
    return url;
  }

  _fetchFromCache() {
    assert(this.book, "You need to call this._parse() first");
    if (this.quote) {
      return;
    }
    /*if (this.range == 3 && !this.book.maxVerse[this.chapter]) {
      return;
    }*/
    var missing = false;
    this.quote = this.verses().map(verse => {
      var quote = this._verseCacheGet(this.book, this.chapter, verse);
      if (!quote) {
        missing = true;
      }
      return (this.range == 3 ? "(" + verse + ") " : "") + quote;
    }).join(" ");
    if (missing) {
      this.quote = "";
    }
  }

  verses() {
    var verses = [ this.verse ];
    if (this.range == 1) { // from a to b
      for (let i = this.verse + 1; i <= this.verseTo; i++) {
        verses.push(i);
      }
    } else if (this.range == 2) { // a and b
      verses.push(this.verseTo);
    } else if (this.range == 3) { // whole chapter
      let maxVerse = this.book.maxVerse[this.chapter];
      if ( !maxVerse) {
        return []; // happens to work
      }
      verses = [];
      for (let i = 1; i <= maxVerse; i++) {
        verses.push(i);
      }
    }
    return verses;
  }

  /**
   * @param ref {BibleText}   other text to compare
   * @returns {Boolean} |ref| is part of |this| or identical.
   */
  contains(ref) {
    assert(ref instanceof BibleText);
    if (ref.book != this.book || ref.chapter != this.chapter) {
      return false;
    }
    if (this.range == 3) {
      return true;
    }
    // shortcut
    if (this.range == ref.range && this.verse == ref.verse && this.verseTo == ref.verseTo) {
      return true;
    }
    var refVerses = "," + ref.verses().join(",") + ","; // TODO use array diffing
    var thisVerses = "," + this.verses().join(",") + ",";
    return thisVerses.indexOf(refVerses) >= 0;
  }

  /**
   * Based on the reference in |this.name|,
   * loads the source text from internet or
   * files, and fills |this.quote| with it.
   */
  async load() {
    this._fetchFromCache();
    if (this.quote) {
      return this.quote;
    }
    assert(false, "Bible should be loaded already");
    assert(this.book, "You need to call this._parse() first");
    this.quote = "";
    var url = dataURL("bible/chapters/" + this.book.code + "-" + this.chapter + ".json", this._storage.lang);
    var json = await loadURL(url, "json");
    try {
      let curVerse;
      for (let verse in json) {
        let text = json[verse];
        text = text.replace(/[′·]/g, "");
        curVerse = parseInt(verse);
        this._verseCacheSet(this.book, this.chapter, curVerse, text);
      };
      this.book.maxVerse[this.chapter] = curVerse;

      this._fetchFromCache();
      return this.quote;
    } catch (ex) {
      if (ex.code == 404) {
        throw new Exception(this.book.longTr + " chapter " + this.chapter + " does not exist");
      } else {
        throw ex;
      }
    }
  }

  /**
   * In case an object is not listed in this.relations, but the object
   * references this bible text, find it.
   * This is very common when the ranges differ, e.g. |this| is a whole
   * chapter, but the object references a specific verse. This would break
   * the backlink. This function finds these.
   *
   * @returns {Array of Detail}
   */
  async findAllReferencingObjects(storage) {
    var result = [];
    await storage.iterate(obj => {
      if (obj.sources.some(ref => {
          if ( !(ref instanceof BibleText)) {
            return false;
          }
          return this.contains(ref);
        })) {
        result.push(obj);
      }
    });
    return result;
  }

  /**
   *
   * Loads cross references (between bible verses) from the server.
   *
   * @returns {Array of BibleText}
   */
  async findCrossReferences() {
    var storage = await this._storage.crossref.loadForBibleBook(this.book);
    var result = [];
    await storage.iterate(subj => {
      if (this.contains(subj)) {
        result = result.concat(subj.sources);
      }
    });
    return result;
  }

  /**
   * Loads footnotes from the server
   *
   * @returns this.footnotes
   */
  async findFootnotes() {
    if (this.footnotes) {
      return this.footnotes;
    }
    var result = this.footnotes || {};
    this.footnotes = result;
    var storage = await this._storage.footnote.loadForBibleBook(this.book);
    await storage.iterate(subj => {
      if (this.contains(subj)) {
        for (let quote in subj.footnotes) {
          result[quote] = subj.footnotes[quote]; // add
        }
      }
    });
    return result;
  }

  /**
   * @returns {BibleText} new object that represents
   * the next verse.
   * If this is the last verse in the chapter, goes to the next chapter.
   */
  nextVerse() {
    var n = this.clone();
    n.verse++;
    n.range = 0;
    if (n.verse > this.book.maxVerse[this.chapter]) {
      n.verse = 1;
      n = n.nextChapter();
      n.verse = 1;
      n.range = 0;
    }
    n.init();
    return n;
  }

  /**
   * @returns {BibleText} new object that represents
   * the previous verse.
   * If this is the first verse in the chapter, goes to the previous chapter.
   */
  prevVerse() {
    var n = this.clone();
    n.verse--;
    n.range = 0;
    if (n.verse < 1) {
      n.verse = 1;
      n = n.prevChapter();
      n.verse = n.book.maxVerse[n.chapter];
      n.range = 0;
    }
    n.init();
    return n;
  }

  /**
   * @returns {BibleText} new object that represents
   * the (whole) next chapter.
   * If this is the last chapter, goes to the next book.
   */
  nextChapter() {
    var n = this.clone();
    n.chapter++;
    if (n.chapter > n.book.chapterCount) {
      // num is 1-based, array is 0-based
      n.book = BibleText.books[n.book.num];
      if ( !n.book) { // after Revelations
        n.book = BibleText.books[0]; // start over with Genesis
      }
      n.chapter = 1;
    }
    n.init();
    return n;
  }

  /**
   * @returns {BibleText} new object that represents
   * the (whole) previous chapter.
   * If this is the first chapter, goes to the previous book.
   */
  prevChapter() {
    var n = this.clone();
    n.chapter--;
    if (n.chapter < 1) {
      // num is 1-based, array is 0-based
      n.book = BibleText.books[n.book.num - 2];
      if ( !n.book) { // before Genesis
        n.book = BibleText.books[65]; // go to Revelations
      }
      n.chapter = n.book.chapterCount;
    }
    n.init();
    return n;
  }

  /**
   * Give context
   * @param highlight {Boolean}   highlight |this| verse in the chapter
   * @returns {BibleText} new object that represents
   * the (whole) chapter in which this verse is.
   * E.g. if you have Mt. 24:14, you'll get Mt. 24.
   */
  wholeChapter(highlight) {
    var n = this.clone();
    n.verse = 0;
    n.verseTo = 0;
    n.range = 3;
    n.init();
    if (highlight) {
      n.highlight = this;
    }
    return n;
  }

  /**
   * @param book {one entry from |books|}
   * @param chapter {Integer}
   * @param verse {Integer} single verse
   * @returns {String} source or null/undefined
   */
  _verseCacheGet(book, chapter, verse) {
    // TODO rewrite caller to use storage.bible as Storage
    if ( !this._storage.bible.verses) {
      return undefined;
    }
    var bookA = this._storage.bible.verses[book.code];
    if ( !bookA) {
      return undefined;
    }
    var chA = bookA[chapter];
    if ( !chA) {
      return undefined;
    }
    return chA[verse];
  }

  /**
   * writes to cache
   */
  _verseCacheSet(book, chapter, verse, source) {
    assert(false, "Bible should be loaded already");
    // TODO rewrite caller to use storage.bible as Storage
    if ( !this._storage.bible.verses) {
      this._storage.bible.verses = {};
    }
    var bookArray = this._storage.bible.verses[book.num];
    if ( !bookArray) {
      bookArray = this._storage.bible.verses[book.num] = [];
    }
    var chapterArray = bookArray[chapter];
    if ( !chapterArray) {
      chapterArray = bookArray[chapter] = [];
    }
    chapterArray[verse] = source;
  }

  fromJSON(json, needRelations) {
    // not calling super
    this.name = json.name || json.id.replace("bible-", "");
    this.init();
    this.id = json.id;
  }

  toJSON() {
    // Do *not* call super, save *only* the ref
    var json = {};
    json.typename = this.typename;
    json.id = this.id;
    json.name = this.codeRef;
    json.userModified = this.userModified;
    return json;
  }
  /* Full save would be:
  toJSON() {
    var json = super.toJSON();
    json.bookNum = this.book.num;
    json.chapter = this.chapter;
    json.verse = this.verse;
    if (this.range) {
      json.range = this.range;
      json.verseTo = this.verseTo;
    }
    return json;
  }
  */

  static loadTranslation(lang) {
    var sb = new StringBundle("biblebooks.properties", lang);
    // TODO? use storage.bible.books and adapt all callers
    var i = 0;
    BibleText.books.forEach(o => {
      o.num = ++i;
      o.maxVerse = [];
      o.abbrTr = sb.get("abbr." + o.code);
      o.longTr = sb.get("long." + o.code);
      if (!o.long) {
        o.long = {};
      }
      o.long[lang] = sb.get("long." + o.code);
      o.abbrTrNoSpace = o.abbrTr.replace(/ /, "").replace(/\./g, "").toLowerCase();
      o.longTrNoSpace = o.longTr.replace(/ /, "").replace(/\./g, "").toLowerCase();
      o.pageURL = "/bible/" + o.code + "/";
    });
    return sb;
  }

  static bookFromCode(bookCode) {
    for (let book of BibleText.books) {
      if (book.code == bookCode) {
        return book;
      }
    }
    throw new Error("Bible book code " + bookCode + " not found");
  }
}

/**
 * This contains all information about the bible books (Mat, Luk etc.),
 * including abbreviations, etc.
 * Array of {
 *   num {Integer}   Number of Bible book, e.g. 1 = Genesis, 66 = Revelations
 *   code {String}   Short name of bible book,in English, no dots or spaces, all lowercase, e.g. "1co" or "gen"
 *   abbrTr {String}   Short name of bible book, translated, e.g. "1. Mo.".
 *   longTr {String}   Full name of bible book, translated, e.g. "1. Mose" or "Offenbarung"
 *   abbrTrNoSpace {String}   abbrTr, but in form of |code|, e.g. "1mo"
 *   longTrNoSpace {String}   longTr, but in form of |code|, e.g. "1mose"
 *   maxVerse {Array of Integer}   for each chapter (index), how many verses there are (value)
 * }
 */
BibleText.books = [
  { code : "ge", chapterCount : 50, group: "mose" },
  { code : "ex", chapterCount : 40, group: "mose" },
  { code : "le", chapterCount : 27, group: "mose" },
  { code : "nu", chapterCount : 36, group: "mose" },
  { code : "de", chapterCount : 34, group: "mose" },
  { code : "jos", chapterCount : 24, group: "history" },
  { code : "jg", chapterCount : 21, group: "history" },
  { code : "ru", chapterCount : 4, group: "history" },
  { code : "1sa", chapterCount : 31, group: "history" },
  { code : "2sa", chapterCount : 24, group: "history" },
  { code : "1ki", chapterCount : 22, group: "history" },
  { code : "2ki", chapterCount : 25, group: "history" },
  { code : "1ch", chapterCount : 29, group: "history" },
  { code : "2ch", chapterCount : 36, group: "history" },
  { code : "ezr", chapterCount : 10, group: "history" },
  { code : "ne", chapterCount : 13, group: "history" },
  { code : "es", chapterCount : 10, group: "history" },
  { code : "job", chapterCount : 42, group: "special" },
  { code : "ps", chapterCount : 150, group: "wisdom" },
  { code : "pr", chapterCount : 31, group: "wisdom" },
  { code : "ec", chapterCount : 12, group: "wisdom" },
  { code : "ca", chapterCount : 8, group: "wisdom" },
  { code : "isa", chapterCount : 66, group: "gproph" },
  { code : "jer", chapterCount : 52, group: "gproph" },
  { code : "la", chapterCount : 5, group: "gproph" },
  { code : "eze", chapterCount : 48, group: "gproph" },
  { code : "da", chapterCount : 12, group: "gproph" },
  { code : "hos", chapterCount : 14, group: "sproph" },
  { code : "joe", chapterCount : 3, group: "sproph" },
  { code : "am", chapterCount : 9, group: "sproph" },
  { code : "ob", chapterCount : 1, group: "sproph" },
  { code : "jon", chapterCount : 4, group: "sproph" },
  { code : "mic", chapterCount : 7, group: "sproph" },
  { code : "nah", chapterCount : 3, group: "sproph" },
  { code : "hab", chapterCount : 3, group: "sproph" },
  { code : "zep", chapterCount : 3, group: "sproph" },
  { code : "hag", chapterCount : 2, group: "sproph" },
  { code : "zec", chapterCount : 14, group: "sproph" },
  { code : "mal", chapterCount : 4, group: "sproph" },
  { code : "mt", chapterCount : 28, group: "evang" },
  { code : "mr", chapterCount : 16, group: "evang" },
  { code : "lu", chapterCount : 24, group: "evang" },
  { code : "joh", chapterCount : 21, group: "evang" },
  { code : "ac", chapterCount : 28, group: "special" },
  { code : "ro", chapterCount : 16, group: "paul" },
  { code : "1co", chapterCount : 16, group: "paul" },
  { code : "2co", chapterCount : 13, group: "paul" },
  { code : "ga", chapterCount : 6, group: "paul" },
  { code : "eph", chapterCount : 6, group: "paul" },
  { code : "php", chapterCount : 4, group: "paul" },
  { code : "col", chapterCount : 4, group: "paul" },
  { code : "1th", chapterCount : 5, group: "paul" },
  { code : "2th", chapterCount : 3, group: "paul" },
  { code : "1ti", chapterCount : 6, group: "paul" },
  { code : "2ti", chapterCount : 4, group: "paul" },
  { code : "tit", chapterCount : 3, group: "paul" },
  { code : "phm", chapterCount : 1, group: "paul" },
  { code : "heb", chapterCount : 13, group: "paul" },
  { code : "jas", chapterCount : 5, group: "letter" },
  { code : "1pe", chapterCount : 5, group: "letter" },
  { code : "2pe", chapterCount : 3, group: "letter" },
  { code : "1jo", chapterCount : 5, group: "letter" },
  { code : "2jo", chapterCount : 1, group: "letter" },
  { code : "3jo", chapterCount : 1, group: "letter" },
  { code : "jud", chapterCount : 1, group: "letter" },
  { code : "re", chapterCount : 22, group: "special" },
];


BibleText._regexpExact = /^(\d)?\.?\s*([a-zA-Zöäü]+)\.?\s*(\d+)\s*:?\s*(\d+)?(\s*([\-\,])\s*(\d+))?/;
BibleText._regexpSearch = /(\d)?\.?\s*([a-zA-Zöäü]+)\.?\s*(\d+)\s*:?\s*(\d+)?(\s*([\-\,])\s?(\d+))?/;
BibleText._regexpExtensionChVerse = /\s*(\d+)\s*:\s*(\d+)(\s*([\-\,])\s*(\d+))?/;
BibleText._regexpExtensionVerse = /\s*(\d+)(\s*([\-\,])\s?(\d+))?/;


/**
 * Automatically advances with the reader.
 *
 * The object instance stays and changes the text it points to.
 */
export class BibleBookmark extends BibleText {
  constructor(name) {
    super(name);
  }

  /**
   * Changes the current bookmark to this text.
   */
  changeTo(bibleText) {
    this.copyFrom(bibleText);
    /*
    this.book = n.book;
    this.chapter = n.chapter;
    this.range = 3; // bookmark should always be the whole chapter
    this.verse = 0;
    this.verseTo = 0;
    this.init();
    */

    this.save(this.codeRef);
  }

  nextChapter() {
    var n = super.nextChapter();
    this.changeTo(n);
    return this;
  }
  prevChapter() {
    var n = super.prevChapter();
    this.changeTo(n);
    return this;
  }
  wholeChapter() {
    var n = super.wholeChapter();
    this.changeTo(n);
    return this;
  }

  /**
   * Caller must overwrite this function with its own implementation.
   * @param str {String}   what you need to store
   *
   * Use BibleBookmark(str) to load it again.
   */
  save(str) {
    // IMPLEMENT THIS IN CALLER
  }
}



/**
 * Search for Bible references in a text.
 * @param text {String}   a paragraph or more of human-language text
 *     that may contain e.g. "Mt. 3:1"
 * @param storage {Storage}  with bible texts
 * @returns {Array of {
 *    index {Integer}  position in |text| where bible ref starts
 *        this is the link text.
 *    length {Integer}  length (in characters) of bible ref in |text|
 *    obj {BibleText}  the referenced text
 *        this is the link target.
 * }}
 */
export function findBibleTexts(text, storage) {
  assert(typeof(text) == "string");
  assert(storage.getID, "Need storage");
  var result = [];
  var iColon = 0;
  while ((iColon = text.indexOf(":", iColon + 2)) != -1) { // find : (colon)
    var startIndex = iColon - 20; // 20/15 chars around
    var endIndex = iColon + 15;
    var lastResult = result[result.length - 1];
    if (lastResult) {
      // Never overlap
      startIndex = Math.max(startIndex, lastResult.index + lastResult.length);
      // use only close texts
      if (lastResult.index < startIndex - 20) {
        lastResult = null;
      }
    }
    ["(", ";", "—"].forEach(delim => {
      let i = text.lastIndexOf(delim, iColon);
      if (i != -1 && i > startIndex) {
        startIndex = i;
      }
    });
    [")", ";", "—", "."].forEach(delim => {
      let i = text.indexOf(delim, iColon);
      if (i != -1 && i < endIndex) {
        endIndex = i;
      }
    });
    var area = text.substring(startIndex, endIndex).trim();
    var bt = new BibleText(storage);
    var ref;
    var match = BibleText._regexpSearch.exec(area);
    if (match) {
      ref = match[0];
      bt.name = ref;
    } else if (lastResult && area[0] == ";") { // e.g. "6:17" from  "Mt 5:1, 2; 6:17"
      match = BibleText._regexpExtensionChVerse.exec(area);
      if (match) {
        ref = match[0];
        // add "Mt " before "6:17"
        bt.name = lastResult.obj.book.code + " " + ref;
      }
    }
    if (bt.name) {
      try {
        bt.init();
      } catch (e) { console.log(e.toString()); continue; }
      result.push({
        index : text.indexOf(ref, startIndex),
        length : ref.length,
        obj : bt,
      });

      var comma = area.substr(match.index + ref.length).trim();
      if (comma[0] == ",") { // e.g. ", 17" from  "Mt 5:1, 2, 17"
        match = BibleText._regexpExtensionVerse.exec(comma.substr(1));
        if (match) {
          ref = match[0];
          var lastBt = bt;
          bt = new BibleText(storage);
          // add "Mt 5:" before ", 17"
          bt.name = lastBt.book.code + " " + lastBt.chapter + ":" + ref;
          try {
            bt.init();
          } catch (e) { console.log(e.toString()); continue; }
          result.push({
            index : text.indexOf(ref, startIndex + match.index + ref.length),
            length : ref.length,
            obj : bt,
          });
        }
      }
    }
  }
  return result;
}

/*
  var iSpaceLast = -1;
  while (var iSpace = text.indexOf(" ", iSpaceLast + 1) != -1) {
    var word = text.substring(iSpaceLast + 1, iSpace);

    iSpaceLast = iSpace;
  }
*/

/**
 * Iterates over all |Source|s in the DB
 * and converts then into |BibleText| objects.
 *
function convertSourceToBibleText(storage) {
  var sources = await storage.getAll(Source);
  sources.forEach(source => {
    try {
      var b = new BibleText(storage, source.name);
      source.__proto__ = BibleText.prototype; // HACK: Changing type
      source.init();
    } catch (e) { console.log(e); }
  });
}
*/
