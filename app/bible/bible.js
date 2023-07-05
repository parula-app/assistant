import { JSONApp } from '../../baseapp/JSONApp.js';
import { Obj } from '../../baseapp/datatype/Obj.js';
import { Detail, Person, Place, Event, Source, Topic, Notes, Relation, GeoCoordinate, Media, Image } from "./model/model.js";
import { BibleText } from './model/bibletext.js';
import { loadMainDB } from './model/load-maindb.js';
import StringBundle from './util/stringbundle.js';
import { dataURL, assert } from "./util/util.js";
import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);

const kLanguages = [ "en", "de", "fr", "it", "es" ];
// { Map lang -> {Storage} }
var gStorage = {};
var gBible = {};



////////////
// App

export default class BibleApp extends JSONApp {
  constructor() {
    super("bible");
  }

  async load(userLang) {
    await super.load(userLang);

    // TODO Promise.all()
    for (let lang of kLanguages) {
      let storage = await loadMainDB(lang);
      gStorage[lang] = storage;
      if (lang == userLang) {
        await this.addValues(storage);
      }

      BibleText.loadTranslation(lang);

      // { Map bibleBookCode -> { Array[chapter] -> { Array[verse] -> {string} text } } }
      // i.e. verses[bookCode][chapter][verse], e.g. gBible["en"]["re"][21][4]
      gBible[lang] = storage.bible.verses = JSON.parse(await readFileAsync(dataURL("bible.json", lang), "utf8"));

      for (let langTo of kLanguages) {
        let langNames = getTranslation("language." + langTo, lang, null).split(";");
        for (let langName of langNames) {
          gLanguageNames[langName.toLowerCase()] = langTo;
        }
      }
    }
  }

  async addValues(storage) {
    let personType = this.dataTypes.Person;
    let placeType = this.dataTypes.Place;

    // Value is {Array of Detail}, because there can be
    // several persons with the same name.
    const add = (type, name, detail) => {
      let details = type.entireMap.get(name);
      if (!details) {
        type.addValue(detail.name, new Details(detail));
      } else {
        details.add(detail);
      }
    }

    await storage.iterate(detail => {
      let type;
      if (detail instanceof Person) {
        type = personType;
      } else if (detail instanceof Place) {
        type = placeType;
      }
      if (type) {
        add(type, detail.name, detail);
        if (detail.otherNames && detail.otherNames.length) {
          for (let name of detail.otherNames) {
            add(type, name, detail);
          }
        }
      }
    });
  }

  /**
   * @param client {ClientAPI}
   * @param context {Context}
   */
  home(args, client, context) {
    client.say(getTranslation("welcome", context.lang));
  }

  help(args, client, context) {
    client.say(getTranslation("help", context.lang));
    pause(1000, client);
    this.home(args, client, context);
  }

  fallback(args, client, context) {
    throw new UserError("misunderstood_intent");
  }

  /**
   * @param args {JS obj} contains the variables from the user command
   *    EnumDataTypes are already translated to the ID.
   *    NumberDataTypes are already JS numbers.
   * @param client {ClientAPI}
   * @param context {Context}
   */
  readBibleVerse(args, client, context) {
    var lang = args.Language || context.lang;
    var { bookCode, chapter, chapterVerses } = getChapter(args, client, lang);
    var verse = parseInt(args.Verse);
    console.log(`Bible verse ${bookCode} ${chapter}:${verse} in ${lang}`);
    if (!verse) {
      throw new UserError("misunderstood_verse");
    }
    var verseText = chapterVerses[verse];
    if (!verseText) {
      throw new UserError("unknown_verse", { verse, chapter,
        bibleBook: getBibleBook(bookCode).long[lang] });
    }
    let versesTitle = chapter + ":" + verse;
    readVersesAsText(bookCode, chapter, verse, verse, versesTitle,
                    lang, args, client);
  }

  readBibleVerseRange(args, client, context) {
    if (!args.VerseTo) {
      args.Verse = args.VerseFrom;
      return this.readBibleVerse(args, client, context);
    }
    var lang = args.Language || context.lang;
    var { bookCode, chapter, chapterVerses } = getChapter(args, client, context);
    var verseFrom = parseInt(args.VerseFrom);
    var verseTo = parseInt(args.VerseTo);
    console.log(`Bible verse ${bookCode} ${chapter}:${verseFrom}-${verseTo} in ${lang}`);
    if (!verseFrom) {
      throw new UserError("misunderstood_verse");
    }
    if (!verseTo) {
      throw new UserError("misunderstood_verse_to");
    }
    if (verseFrom > verseTo) {
      throw new UserError("verse_to_from_backwards");
    }
    if (!chapterVerses[verseFrom]) {
      throw new UserError("unknown_verse", { verse: verseFrom, chapter,
        bibleBook: getBibleBook(bookCode).long[lang] });
    }
    if (!chapterVerses[verseTo]) {
      verseTo = chapterVerses.length - 1;
      client.say(getErrorMessage("verse_too_high", lang, { chapter, verseMax: verseTo,
        bibleBook: getBibleBook(bookCode).long[lang] }));
    }
    let versesTitle = chapter + ":" + verseFrom + (verseTo == verseFrom + 1 ? ", " : "-") + verseTo;
    readVersesAsText(bookCode, chapter, verseFrom, verseTo, versesTitle,
                            lang, args, client);
  }

  readBibleChapter(args, client, context) {
    var lang = args.Language || context.lang;
    let { bookCode, chapter, chapterVerses } = getChapter(args, client, context);
    console.log(`Bible chapter ${bookCode} ${chapter} in ${lang}`);

    startChapter(bookCode, chapter, chapterVerses, lang, args, client);
  }

  next(args, client, context) {
    if (typeof(resumeAudio) == "function" && resumeAudio(args, client, context)) {
      return;
    }
    this.nextChapter(args, client, context);
  }

  previous(args, client, context) {
    this.previousChapter(args, client, context);
  }

  nextChapter(args, client, context) {
    var lang = context.lang;
    var session = client.userSession;
    var bookCode = session.get("book");
    var chapter = parseInt(session.get("chapter"));
    if (!bookCode || !chapter) {
      throw new UserError("no_current_reading");
    }

    // next chapter
    chapter++;
    var book = getBibleBook(bookCode);
    if (chapter > book.chapterCount) {
      // next bible book
      book = getBibleBookNum(book.num + 1); // handles off-range cases
      bookCode = book.code;
      chapter = 1;
    }

    startChapter(bookCode, chapter, null, lang, args, client);
  }

  previousChapter(args, client, context) {
    var lang = context.lang;
    var session = client.userSession;
    var bookCode = session.get("book");
    var chapter = parseInt(session.get("chapter"));
    if (!bookCode || !chapter) {
      throw new UserError("no_current_reading");
    }

    // previous chapter
    chapter--;
    var book = getBibleBook(bookCode);
    if (chapter < 1) {
      // previous bible book
      book = getBibleBookNum(book.num - 1); // handles off-range cases
      bookCode = book.code;
      chapter = book.chapterCount;
    }

    startChapter(bookCode, chapter, null, lang, args, client);
  }

  playLatestEpisode(args, client, context) {
    // TODO bible reading: save chapter and continue there or with the next one
  }

  more(args, client, context) {
    return "";
  }

  /**
   * @param args {
   *   Person {Details}  containing multiple `Person` objects
   * }
   */
  openPerson(args, client, context) {
    var lang = context.lang;
    var persons = args.Person.all;
    if (persons.length > 1) {
      client.say(getTranslation("person_multiple", lang,
        { person: "", count: persons.length }));
      pause(1000, client);
    }
    for (let person of persons) {
      outputPerson(person, args, client, lang);
    }
  }

  /**
   * @param args {
   *   Place {Details}  containing multiple `Place` objects
   * }
   */
  openPlace(args, client, context) {
    var lang = context.lang;
    var places = args.Place.all;
    if (places.length > 1) {
      client.say(getTranslation("place_multiple", lang,
        { place: "", count: places.length }));
      pause(1000, client);
    }
    for (let place of places) {
      outputPlace(place, args, client, lang);
    }
  }

  error(exception, client, context) {
    var lang = context.lang;
    if (exception instanceof UserError) {
      var msg = exception.getTranslatedMessage(lang);
      console.log("UserError: " + exception.msgID + " - " + msg);
      msg = getErrorMessage("sorry", lang, null) + " " + msg;
      client.say(msg);
      return;
    }
    if (exception == "NO_INTENT_FOUND") {
      console.log(JSON.stringify(request, null, 2));
      client.say(getErrorMessage("unimplemented_intent", lang, null));
      return;
    }
    console.error(exception);
    client.say(getErrorMessage("exception", lang, { message: exception.message }));
  }
}


/**
 * Holds 1 or more |Detail|
 * Because there can be several Persons or Places with the same name.
 */
class Details extends Obj {
  constructor(detail) {
    assert(detail instanceof Detail, "Need object of type Detail");
    super();
    this._details = [ detail ];
  }

  add(detail) {
    this._details.push(detail);
  }

  get all() {
    return this._details;
  }

  get id() {
    return this._details[0].id;
  }

  get name() {
    return this._details[0].name;
  }
}



////////////
// Util

// { Map {string} language name in any language -> {string} 2-letter lang code }
var gLanguageNames = {};

function ssmlWrap(ssml, lang) {
  return ssml;
}

// Remove special XML chars, for insertion into SSML
// Also do some Alexa-specific fixes for text that Alexa
// otherwise doesn't process properly
function escapeText(text) {
  return text;
}


/////////////////////////////
// Higher level functions

function getBibleBook(bookCode) {
  var book = BibleText.books.find(book => book.code == bookCode);
  if (!book) {
     throw new Error(`No bible book with code ${bookCode}`);
  }
  return book;
}

/**
 * @param bookNum: 1-based number of the bible book.
 * Range: 1..66
 */
function getBibleBookNum(bookNum) {
  if (bookNum < 1) {
    //bookNum = 66;
    throw new UserError("skip_before_beginning");
  }
  if (bookNum > 66) {
    //bookNum = 1;
    throw new UserError("skip_after_end");
  }
  return BibleText.books[bookNum - 1];
}

function getBibleBookName(bookCode, lang) {
  let book = getBibleBook(bookCode)
  return book.long && book.long[lang] || book.code;
}

/**
 * @returns {
 *   {string} bookCode,
 *   {integer} chapter,
 *   {Array of {string}} chapterVerses,
 * }
 */
function getChapter(args, client, context) {
  let lang = context.lang;
  let bookCode = args.BibleBook;
  let chapter = args.Chapter;
  if (!chapter) {
    throw new UserError("misunderstood_chapter");
  }

  var chapterVerses = gBible[lang][bookCode][chapter];
  if (!chapterVerses) {
    throw new UserError("unknown_chapter", {
      chapter,
      bibleBook: getBibleBookName(bookCode, lang),
    });
  }
  return {
    bookCode,
    chapter,
    chapterVerses,
  };
}

function startChapter(bookCode, chapter, chapterVerses, lang, args, client) {
  if (!chapterVerses) {
    chapterVerses = gBible[lang][bookCode][chapter];
  }
  if (!chapterVerses) {
    // normally should not happen. check caller.
    throw new UserError("unknown_chapter", {
      chapter,
      bibleBook: getBibleBookName(bookCode, lang),
    });
  }

  let session = client.userSession;
  session.set("book", bookCode);
  session.set("chapter", chapter);

  let versesTitle = getTranslation("track_title_chapter", lang, { chapter });

  if (typeof(startChapterAsAudio) == "function" &&
    startChapterAsAudio(bookCode, chapter, chapterVerses, versesTitle, lang, args, client)) {
    return;
  }

  readVersesAsText(bookCode, chapter, 1, chapterVerses.length - 1, versesTitle,
                   lang, args, client);
}

// Caller needs to make checks
function readVersesAsText(bookCode, chapter, verseFrom, verseTo, versesTitle,
                          lang, args, client) {
  let chapterVerses = gBible[lang][bookCode][chapter];
  let completeText = "";
  let ssml = `<prosody rate='85%' pitch='-10%'>`;
  for (let verseNo = verseFrom; verseNo <= verseTo; verseNo++) {
    let verseText = chapterVerses[verseNo];
    if (verseText) {
      ssml += `<p>${escapeText(verseText)}</p><break time='300ms'/>`;
      completeText += (completeText ? verseNo + " " : "") + verseText + "\n";
    }
  }
  ssml += `</prosody>`;
  client.say(ssmlWrap(ssml, lang));

  // Card for visible text
  client.card({
    type: "Simple",
    title: getBibleBookName(bookCode, lang) + " " + versesTitle,
    content: completeText,
  });
}

BibleText.prototype.readVerses = function(lang, args, client) {
  let chapterVerses = gBible[lang][this.book.code][this.chapter];

  let verseFrom = this.verse;
  let verseTo = this.verseTo;
  let versesTitle = this.chapter + ":";
  if (verseFrom == 0 && verseTo == 0) {
    verseFrom = 1;
    verseTo = chapterVerses.length - 1;
    versesTitle = getTranslation("track_title_chapter", lang, { chapter: this.chapter });
  } else if (!verseFrom) {
    return;
  } else if (verseFrom && verseTo == 0) {
    verseTo = verseFrom;
    versesTitle += verseFrom;
  } else {
    versesTitle += verseFrom + (verseTo == verseFrom + 1 ? ", " : "-") + verseTo;
  }
  if (verseTo >= chapterVerses.length) {
    return;
  }
  readVersesAsText(this.book.code, this.chapter, verseFrom, verseTo, versesTitle,
                   lang, args, client);
}

/**
 * Returns a string as a list.
 * E.g.
 * object.length == 1: foo
 * object.length == 2: foo and bar
 * object.length == 4: baz, bal, foo and bar
 */
function makeList(objects, lang) {
  var str = objects.pop();
  if (objects.length) {
    str = getTranslation("and", lang,
      { first: objects.pop(), second: str });
  }
  while (objects.length) {
    str = objects.pop() + ", " + str;
  }
  return str;
}

/**
 * Tells all about a person.
 * @param {Person} person
 */
function outputPerson(person, args, client, lang) {
  client.say(getTranslation("person_parrot", lang,
    { person }));
  pause(1000, client);
  let prefix = person.male ? "male_" : "female_";

  // Parents
  let father = person.father;
  let mother = person.mother;
  if (father && mother) {
    client.say(getTranslation(prefix + "child_of_both", lang,
      { father, mother, person }));
  } else if (father) {
    client.say(getTranslation(prefix + "child_of_father", lang,
      { father, person }));
  }
  pause(1000, client);

  // Marriage
  let mates = person.relationsOfType("married", Person);
  if (mates.length) {
    client.say(getTranslation(prefix + "married", lang,
      { mate: makeList(mates, lang) }));
  }
  pause(1000, client);

  // Children
  let children = person.children;
  if (children.length) {
    client.say(getTranslation(prefix + "parent_of", lang,
      { child: makeList(children, lang) }));
  }
  pause(1000, client);

  // Siblings
  let siblings = person.siblingRelations.map(rel => rel.obj);
  if (siblings.length) {
    client.say(getTranslation(prefix + "sibling", lang,
      { sibling: makeList(siblings, lang) }));
  }
  pause(1000, client);

  // Places
  let places = person.places;
  if (places.length) {
    client.say(getTranslation(prefix + "places", lang,
      { places: makeList(places, lang), person: person.name }));
  }
  pause(1500, client);

  // All Bible verses
  let bibleTexts = person.sources;
  outputBibleVersesList(bibleTexts, getTranslation(prefix + "bible", lang),
    args, client, lang);
}

/**
 * Tells all about a place.
 * @param {Place} place
 */
function outputPlace(place, args, client, lang) {
  var prefix = "place_";
  client.say(getTranslation(prefix + "parrot", lang,
    { place }));
  pause(1000, client);

  // People
  let persons = place.persons;
  if (persons.length) {
    client.say(getTranslation(prefix + (persons.length > 1 ? "persons" : "person"), lang,
      { person: makeList(persons, lang), place }));
  }
  pause(1000, client);

  // All Bible verses
  let bibleTexts = place.sources;
  outputBibleVersesList(bibleTexts, getTranslation(prefix + "bible", lang, { place }),
    args, client, lang);
}

/**
 * Reads a long list of Bible verses
 *
 * @param {string} topHeaderText -- What to read before the verses (if any)
 * @param {Array of BibleText} bibleTexts
 */
async function outputBibleVersesList(bibleTexts, topHeaderText, args, client, lang) {
  if (!bibleTexts.length) {
    return;
  }
  client.say(topHeaderText);

  for (let bibleText of bibleTexts) {
    //console.log("bible text: " + bibleText.codeRef);
    let headerText = getTranslation("bible_verse_header", lang, {
      bibleBook: getBibleBookName(bibleText.book.code, lang),
      chapter: bibleText.chapter,
      verse: bibleText.verse,
    });
    client.say(ssmlWrap(`<break time='500ms'/><s>${escapeText(headerText)}</s><break time='300ms'/>`, lang));
    client.say(await bibleText.load());
  }
}

function pause(ms, client) {
  //client.say(`<break time='${ms}ms'/>`);
  // TODO
  client.say(".");
}



class UserError extends Error {
  constructor(msgID, msgParameters) {
    super(msgID);
    this._isUserError = true; // in case instanceof fails
    this.msgID = msgID;
    this.msgParameters = msgParameters || {};
  }

  getTranslatedMessage(lang) {
    return getErrorMessage(this.msgID, lang, this.msgParameters);
  }
}

function getErrorMessage(msgID, lang, msgParameters) {
  var sb = new StringBundle("errors.properties", lang); // make it a global sbErrors[lang]?
  return _getTranslatedFormattedString(sb, msgID, lang, msgParameters);
}

function getTranslation(msgID, lang, msgParameters) {
  var sb = new StringBundle("responses.properties", lang); // make it a global sbResponses[lang]?
  return _getTranslatedFormattedString(sb, msgID, lang, msgParameters);
}

function _getTranslatedFormattedString(sb, msgID, lang, msgParameters) {
  var msg = sb.get(msgID);
  for (let param in msgParameters) {
    msg = msg.replace("%" + param + "%", msgParameters[param]);
  }
  return msg;
}
