/**
 * @param name {String}
 * must be an abbr. bible reference in English of the form
 * "1. Cor. 3:2-5".
 *
 * |quote| is the full text of the verses in |name|.
 */
function BibleText(name, lang, storage) {
  Source.call(this);

  if (!lang) {
    lang = "en"; // TODO i18n
  }
  this._lang = lang;
  if (storage instanceof Storage) {
    this.storage = storage;
  } else {
    this.storage = null;
  }

  if ( !BibleText.books[0].num) {
    BibleText.loadTranslation(lang);
  }
  if (name) {
    this.name = name;
    this.init();
  }
}
BibleText.prototype = {
  typename : "bibletext",
  book : null, // one entry from |BibleText.books|
  chapter : 0, // {Integer}
  verse : 0, // {Integer}
  /**
   * {Integer-enum}
   * 0 = single verse
   * 1 = from a to b, e.g. "1-3"
   * 2 = a and b, e.g. "3, 4"
   * 3 = whole chapter
   */
  range : 0,
  verseTo : 0, // {Integer}
  storage : null, // {Storage}

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
  footnotes : null,

  /**
   * Must be called after setting |name|.
   * Parses the reference and sets internal variables
   * like book, chapter etc.
   */
  init : function() {
    if ( !this.book && this.name) {
      this._parse();
    } else {
      this._setFromVars();
    }
    this.name = this.prettyName;
    this.id = this.codeRef;
  },

  _setFromVars : function() {
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
  },

  /**
   * Contructor function
   * Make a copy of |this|, initing the new object
   * with the same values has |this| has,
   * and return the new object.
   */
  clone : function() {
    var n = new BibleText();
    n.book = this.book;
    n.chapter = this.chapter;
    n.verse = this.verse;
    n.range = this.range;
    n.verseTo = this.verseTo;
    n.init();
    return n;
  },

  /**
   * Makes the values of |this| match |other|.
   * @param other {BibleText}
   */
  copyFrom : function(other) {
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
  },

  _regexpExact : /^(\d)?\.?\s*([a-zA-Zöäü]+)\.?\s*(\d+)\s*:?\s*(\d+)?(\s*([\-\,])\s*(\d+))?/,
  _regexpSearch : /(\d)?\.?\s*([a-zA-Zöäü]+)\.?\s*(\d+)\s*:?\s*(\d+)?(\s*([\-\,])\s?(\d+))?/,
  _regexpExtensionChVerse : /\s*(\d+)\s*:\s*(\d+)(\s*([\-\,])\s*(\d+))?/,
  _regexpExtensionVerse : /\s*(\d+)(\s*([\-\,])\s?(\d+))?/,

  /**
   * Takes |this.name| as Bible reference and tries
   * to get bible book, chapter and verse(s) from it.
   */
  _parse : function() {
    assert(this.name, "BibleText.name must be set");
    // digit (optional), dot (optional), spaces (optional),
    // letters (mandatory), dot (optional), spaces (optional),
    // digits (mandatory), spaces (optional),
    // ":" (optional), spaces (optional),
    // digits (optional), spaces (optional),
    // "," or "-" (optional), spaces (optional),
    // digits (optional)
    var matches = this._regexpExact.exec(this.name);
    assert(matches, "BibleText: could not parse " + this.name);
    var bookNumPrefix = "";
    if (matches[1]) {
      bookNumPrefix = parseInt(matches[1]);
    }
    var bookName = matches[2];
    // bookCode = "1co"
    var bookCode = bookNumPrefix + bookName.toLowerCase();
    var self = this;
    BibleText.books.forEach(function(o) {
      if (o.code == bookCode) { self.book = o; }
    });
    /*
    // Can't do that in the same loop, because
    // pr = Proverbs, but pr = Eccl. in German,
    // but we normally need the Engl code.
    // TODO Fix Pr when it's really German, by passing in |lang|
    if ( !this.book) {
      BibleText.books.forEach(function(o) {
        if (o.longTrNoSpace == bookCode) { self.book = o; }
      });
    }
    if ( !this.book) {
      BibleText.books.forEach(function(o) {
        if (o.abbrTrNoSpace == bookCode) { self.book = o; }
      });
    }
    */
    assert(this.book, "Bible book " + bookCode + " not found");
    this.chapter = parseInt(matches[3]);
    if (this.book.chapterCount == 1) {
      this.verse = this.chapter;
      this.chapter = 1;
      return;
    }
    if (this.chapter > this.book.chapterCount) {
      throw new UserError(this.book.longTr + " chapter " + this.chapter + " does not exist");
    }
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
  },

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
  },

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
  },

  _fetchFromCache : function() {
    assert(this.book, "You need to call this._parse() first");
    if (this.quote) {
      return;
    }
    /*if (this.range == 3 && !this.book.maxVerse[this.chapter]) {
      return;
    }*/
    var missing = false;
    var self = this;
    this.quote = this.verses().map(function(verse) {
      var quote = self._verseCacheGet(self.book, self.chapter, verse);
      if (!quote) {
        missing = true;
      }
      return (self.range == 3 ? "(" + verse + ") " : "") + quote;
    }).join(" ");
    if (missing) {
      this.quote = "";
    }
  },

  verses : function() {
    var verses = [ this.verse ];
    if (this.range == 1) { // from a to b
      for (var i = this.verse + 1; i <= this.verseTo; i++) {
        verses.push(i);
      }
    } else if (this.range == 2) { // a and b
      verses.push(this.verseTo);
    } else if (this.range == 3) { // whole chapter
      var maxVerse = this.book.maxVerse[this.chapter];
      if ( !maxVerse) {
        return []; // happens to work
      }
      verses = [];
      for (var i = 1; i <= maxVerse; i++) {
        verses.push(i);
      }
    }
    return verses;
  },

  /**
   * @param ref {BibleText}   other text to compare
   * @returns {Boolean} |ref| is part of |this| or identical.
   */
  contains : function(ref) {
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
  },

  /**
   * Based on the reference in |this.name|,
   * loads the source text from internet or
   * files, and fills |this.quote| with it.
   * @param successCallback({string} quote)
   */
  load : function(successCallback, errorCallback) {
    this._fetchFromCache();
    if (this.quote) {
      successCallback(this.quote);
      return;
    } else {
      errorCallback(new UserError(this.book.longTr + " " + this.chapter + " verse " + this.verse + " does not exist"));
    }
  },

  /**
   * In case an object is not listed in this.relations, but the object
   * references this bible text, find it.
   * This is very common when the ranges differ, e.g. |this| is a whole
   * chapter, but the object references a specific verse. This would break
   * the backlink. This function finds these.
   *
   * @successCallback {Function(results {Array of Detail})}
   */
  findAllReferencingObjects : function(storage, successCallback, errorCallback) {
    var self = this;
    var result = [];
    storage.iterate(function(obj) {
      if (obj.sources.some(function(ref) {
          if ( !(ref instanceof BibleText)) {
            return false;
          }
          return self.contains(ref);
        })) {
        result.push(obj);
      }
    }, function() {
      successCallback(result);
    }, errorCallback);
  },

  /**
   *
   * Loads cross references (between bible verses) from the server.
   *
   * @successCallback {Function(results {Array of BibleText})}
   */
  findCrossReferences : function(successCallback, errorCallback) {
    var self = this;
    this.storage.cache.crossref.loadForBibleBook(this.book, function(storage) {
      var result = [];
      storage.iterate(function(subj) {
        if (self.contains(subj)) {
          result = result.concat(subj.sources);
        }
      }, function() {
        successCallback(result);
      }, errorCallback);
    }, errorCallback);
  },

  /**
   * Loads footnotes from the server
   *
   * @successCallback {Function(results = this.footnotes)}
   */
  findFootnotes : function(successCallback, errorCallback) {
    if (this.footnotes) {
      successCallback(this.footnotes);
      return;
    }
    var self = this;
    var result = this.footnotes || {};
    this.footnotes = result;
    this.storage.cache.footnote.loadForBibleBook(this.book, function(storage) {
      storage.iterate(function(subj) {
        if (self.contains(subj)) {
          for (var quote in subj.footnotes) {
            result[quote] = subj.footnotes[quote]; // add
          }
        }
      }, function() {
        successCallback(result);
      }, errorCallback);
    }, errorCallback);
  },

  /**
   * @returns {BibleText} new object that represents
   * the next verse.
   * If this is the last verse in the chapter, goes to the next chapter.
   */
  nextVerse : function() {
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
  },

  /**
   * @returns {BibleText} new object that represents
   * the previous verse.
   * If this is the first verse in the chapter, goes to the previous chapter.
   */
  prevVerse : function() {
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
  },

  /**
   * @returns {BibleText} new object that represents
   * the (whole) next chapter.
   * If this is the last chapter, goes to the next book.
   */
  nextChapter : function() {
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
  },

  /**
   * @returns {BibleText} new object that represents
   * the (whole) previous chapter.
   * If this is the first chapter, goes to the previous book.
   */
  prevChapter : function() {
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
  },

  /**
   * Give context
   * @param highlight {Boolean}   highlight |this| verse in the chapter
   * @returns {BibleText} new object that represents
   * the (whole) chapter in which this verse is.
   * E.g. if you have Mt. 24:14, you'll get Mt. 24.
   */
  wholeChapter : function(highlight) {
    var n = this.clone();
    n.verse = 0;
    n.verseTo = 0;
    n.range = 3;
    n.init();
    if (highlight) {
      n.highlight = this;
    }
    return n;
  },

  /**
   * @param book {one entry from |books|}
   * @param chapter {Integer}
   * @param verse {Integer} single verse
   * @returns {String} source or null/undefined
   */
  _verseCacheGet : function(book, chapter, verse) {
    try {
      return BibleText.gBible[this.lang][book.code][chapter][verse];
    } catch (e) {
      return undefined;
    }
  },

}
extend(BibleText, Source);

// static functions

BibleText.loadTranslation = function(lang) {
  var sb = new StringBundle("biblebooks", lang);
  // TODO use this.storage.cache.bibleBooks and adapt all callers
  var i = 0;
  BibleText.books.forEach(function(o) { // TODO l18n
    o.num = ++i;
    o.maxVerse = [];
    if (!o.abbr) {
      o.abbr = {};
      o.long = {};
    }
    o.abbr[lang] = sb.get("abbr." + o.code);
    o.long[lang] = sb.get("long." + o.code);
    //o.abbrTrNoSpace = o.abbrTr.replace(/ /, "").replace(/\./g, "").toLowerCase();
    //o.longTrNoSpace = o.longTr.replace(/ /, "").replace(/\./g, "").toLowerCase();
  });
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

// Array of book num, chapter, verse
BibleText._verseCache = [];


/**
 * Automatically advances with the reader.
 *
 * The object instance stays and changes the text it points to.
 */
function BibleBookmark(name) {
  BibleText.apply(this, arguments);
}
BibleBookmark.prototype = {

  /**
   * Changes the current bookmark to this text.
   */
  changeTo : function(bibleText) {
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
  },

  nextChapter : function() {
    var n = BibleText.prototype.nextChapter.apply(this, arguments);
    this.changeTo(n);
    return this;
  },
  prevChapter : function() {
    var n = BibleText.prototype.prevChapter.apply(this, arguments);
    this.changeTo(n);
    return this;
  },
  wholeChapter : function() {
    var n = BibleText.prototype.wholeChapter.apply(this, arguments);
    this.changeTo(n);
    return this;
  },

  /**
   * Caller must overwrite this function with its own implementation.
   * @param str {String}   what you need to store
   *
   * Use BibleBookmark(str) to load it again.
   */
  save : function(str) {
    // IMPLEMENT THIS IN CALLER
  },
};
extend(BibleBookmark, BibleText);



/**
 * Search for Bible references in a text.
 * @param text {String}   a paragraph or more of human-language text
 *     that may contain e.g. "Mt. 3:1"
 * @returns {Array of {
 *    index {Integer}  position in |text| where bible ref starts
 *        this is the link text.
 *    length {Integer}  length (in characters) of bible ref in |text|
 *    obj {BibleText}  the referenced text
 *        this is the link target.
 * }}
 */
function findBibleTexts(text) {
  assert(typeof(text) == "string");
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
    ["(", ";", "—"].forEach(function(delim) {
      var i = text.lastIndexOf(delim, iColon);
      if (i != -1 && i > startIndex) {
        startIndex = i;
      }
    });
    [")", ";", "—", "."].forEach(function(delim) {
      var i = text.indexOf(delim, iColon);
      if (i != -1 && i < endIndex) {
        endIndex = i;
      }
    });
    var area = trim(text.substring(startIndex, endIndex));
    var bt = new BibleText();
    var ref;
    var match = bt._regexpSearch.exec(area);
    if (match) {
      ref = match[0];
      bt.name = ref;
    } else if (lastResult && area[0] == ";") { // e.g. "6:17" from  "Mt 5:1, 2; 6:17"
      match = bt._regexpExtensionChVerse.exec(area);
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

      var comma = trim(area.substr(match.index + ref.length));
      if (comma[0] == ",") { // e.g. ", 17" from  "Mt 5:1, 2, 17"
        match = bt._regexpExtensionVerse.exec(comma.substr(1));
        if (match) {
          ref = match[0];
          var lastBt = bt;
          bt = new BibleText()
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
function convertSourceToBibleText(storage, successCallback, errorCallback) {
  storage.getAll(Source, function(sources) {
    sources.forEach(function(source) {
      try {
        var b = new BibleText(source.name);
        source.__proto__ = BibleText.prototype; // HACK: Changing type
        source.init();
      } catch (e) { console.log(e); }
      successCallback();
    });
  }, errorCallback);
}
*/
