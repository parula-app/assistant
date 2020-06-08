import { loadURL, dataURL, assert } from "../util/util.js";
import { BibleText } from "../model/bibletext.js";

/**
 * Loads cross references of a bible verse to another.
 * This is in a special data format written by fetcher/bible.js.
 *
 * JSON format:
 * {
 *    "Ge 1:1" : [
 *      "He 10:2",
 *      "Joh 1:4"
 *    ],
 *    "Ge 1:2" : [
 *      "Mk 10:2",
 *      "Re 1:4"
 *    ]
 * }
 *
 * Call loadForBibleBook()
 */
export class LoadCrossrefJSON {
  /**
   * @param storage {Storage}   where the loaded objects should be added
   * @param lookupStorage {Storage}   where the Bible text is stored
   */
  constructor(storage, lookupStorage) {
    //assert(storage instanceof Storage);
    assert(storage.getID, "Need storage");
    assert(lookupStorage.getID, "Need global storage");

    /**
     * {Storage}
     */
    this._storage = storage;

    /**
     * {Storage}
     */
    this._lookupStorage = lookupStorage;

    /**
     * have loaded this already
     * {Map book.code -> true/false}
     */
    this._loaded = {};
  }

  /**
   * Convenience function to load the file from a URL,
   * parse it and return the DB
   *
   * @param book {BibleText.books[n]}
   * @returns db {Storage}
   */
  async loadForBibleBook(book) {
    if (this._loaded[book.code]) {
      return this._storage;
    }
    // language independent
    var url = dataURL("../en/bible/crossref/" + book.code + ".crossref.json", "en");
    var storage = await this._loadFromURL(url);
    this._loaded[book.code] = true;
    return storage;
  }

  /**
   * Convenience function to load the file from a URL,
   * parse it and return the DB.
   *
   * @param url {String}
   * @returns db {Storage}
   */
  async _loadFromURL(url) {
    //console.log("Loading URL " + url);
    var text = await loadURL(url, "json");
    return this._load(text);
  }

  /**
   * Entry function to parse
   *
   * @param json {JSON or String}   JSON file contents
   * @returns {Storage}   DB with the objects
   */
  _load(json) {
    if (typeof(json) == "string") {
      json = JSON.parse(json);
    }
    assert(typeof(json) == "object", "need JSON");

    for (let btSubjID in json) {
      //console.log("for " + btSubjID);
      let btSubj = this.getBibleText(btSubjID)
      json[btSubjID].forEach(btObjID => {
        let btObj = this.getBibleText(btObjID)
        let rel = btSubj.addRelation(btObj, "crossref");
        rel.opposite().add();
      });
    };

    return this._storage;
  }

  getBibleText(ref) {
    var existing = this._storage.getID("bible-" + ref);
    if (existing) {
      return existing;
    }
    //console.log("  loading " + ref);
    var bt = new BibleText(this._lookupStorage, ref);
    bt.id = "bible-" + ref;
    this._storage.add(bt);
    return bt;
  }
}
