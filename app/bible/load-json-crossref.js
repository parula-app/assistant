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
function LoadCrossrefJSON(storage) {
  assert(storage instanceof Storage);
  this._storage = storage;
  this._loaded = {};
}
LoadCrossrefJSON.prototype = {
  _storage : null, // {Storage}
  _loaded : null, // {Map book.code -> true/false}   have loaded this already

  /**
   * Convenience function to load the file from a URL,
   * parse it and return the DB.
   * @param book {BibleText.books[n]}
   * @param successCallback {Function(db {Storage})}
   * @param errorCallback
   */
  loadForBibleBook : function(book, successCallback, errorCallback) {
    if (this._loaded[book.code]) {
      successCallback(this._storage);
      return;
    }
    var self = this;
    var url = dataURL("bible/crossref/" + book.code + ".crossref.json", "en"); // language-independent
    this._loadFromURL(url, function(storage) {
      self._loaded[book.code] = true;
      successCallback(storage);
    }, errorCallback);
  },

  /**
   * Convenience function to load the file from a URL,
   * parse it and return the DB.
   * @param url {String}
   * @param successCallback {Function(db {Storage})}
   * @param errorCallback
   */
  _loadFromURL : function(url, successCallback, errorCallback) {
    var self = this;
    //console.log("Loading URL " + url);
    loadURL(url, "json", function(text) {
      successCallback(self._load(text));
    }, errorCallback);
  },

  /**
   * Entry function to parse
   * @param json {JSON or String}   JSON file contents
   * @returns {Storage}   DB with the objects
   */
  _load : function(json) {
    if (typeof(json) == "string") {
      json = JSON.parse(json);
    }
    assert(typeof(json) == "object", "need JSON");

    var self = this;
    for (var btSubjID in json) {
      //console.log("for " + btSubjID);
      var btSubj = self.getBibleText(btSubjID)
      json[btSubjID].forEach(function(btObjID) {
        var btObj = self.getBibleText(btObjID)
        var rel = btSubj.addRelation(btObj, "crossref");
        rel.opposite().add();
      });
    };

    return this._storage;
  },

  getBibleText: function(ref) {
    var existing = this._storage.getID("bible-" + ref);
    if (existing) {
      return existing;
    }
    //console.log("  loading " + ref);
    var bt = new BibleText(ref);
    bt.id = "bible-" + ref;
    this._storage.add(bt);
    return bt;
  },
}
