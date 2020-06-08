import { loadURL, assert, Exception } from "../util/util.js";
import { Detail, Person, Place, Event, Source, Topic, Notes, Relation, GeoCoordinate, Media, Image } from "../model/model.js";
import { BibleText } from "../model/bibletext.js";

/**
 * Loads the database from a JSON file in the data format
 * native for this application.
 *
 * Format: The JSON contains one big array of all objects of all types.
 * (The type is encoded in the |typename| property.)
 * The relations are listed as part of the objects.
 *
 * Call load() or loadFromURL()
 */
export class LoadNativeJSON {
  /**
   * @param storage {Storage}   where the loaded objects should be added
   * @param lookupStorage {Storage}   where the related objects should be read from
   */
  constructor(storage, lookupStorage) {
    //assert(storage instanceof Storage);
    assert(storage.getID, "Need storage");
    assert(lookupStorage.getID, "Need global storage");

    /**
     * where the loaded objects should be added
     * {Storage}
     */
    this._storage = storage;

    /**
     * where the related objects should be read from
     * {Storage}
     */
    this._lookupStorage = lookupStorage;

    /**
     * {Map of rel ID -> rel obj}
     */
    //this._relations = {};
  }

  /**
   * Convenience function to load the file from a URL,
   * parse it and return the DB.
   *
   * @param url {String}
   * @returns db {Storage}
   */
  async loadFromURL(url) {
    var text = await loadURL(url, "json");
    return this.load(text);
  }

  /**
   * Entry function to parse
   *
   * @param json {JSON or String}   JSON file contents
   * @returns {Storage}   DB with the objects
   */
  load(json) {
    if (typeof(json) == "string") {
      json = JSON.parse(json);
    }
    assert(typeof(json) == "object", "need JSON");

    var needRelations = [];
    for (let detailJSON of json.details) {
      //console.log("parsing " + detailJSON.id + " = " + detailJSON.name);
      this._storage.add(this.parseDetail(detailJSON, needRelations));
    }

    // new rel format
    this.lookupRelations(needRelations);

    /*/ old rel format
    if (json.relations) {
      for (let relJSON of json.relations) {
        this.parseRelation(relJSON);
      }
    }*/

    /* Cleanup
    await this._storage.iterate(obj => {
      if (obj instanceof Event) {
        obj.relationsOfType("birth", BibleText)
            .concat(obj.relationsOfType("death", BibleText))
            .forEach(rel => {
              rel.type = "bibletext";
            });
      }
    });
    */

    return this._storage;
  }

  parseDetail(json, needRelations) {
    assert(json.typename, "NativeJSON parse: not a detail object, because typename is missing");
    var detail = null;
    if (json.typename == "person") {
      detail = new Person();
    } else if (json.typename == "event") {
      detail = new Event();
    } else if (json.typename == "place") {
      detail = new Place();
    } else if (json.typename == "source") {
      detail = new Source();
    } else if (json.typename == "bibletext") {
      detail = new BibleText(this._lookupStorage);
    } else if (json.typename == "image") {
      detail = new Image();
    } else if (json.typename == "topic") {
      detail = new Topic();
    } else if (json.typename == "notes") {
      detail = new Notes();
    } else {
      throw new Exception("unknown type " + json.typename);
    }
    detail.fromJSON(json, needRelations);
    return detail;
  }

  /**
   * New rel format where relations are inline in the objs.
   * After all objs have been parsed,
   * need to look up rel obj ID references.
   */
  lookupRelations(needRelations) {
    for (let relByID of needRelations) {
      let rel = new Relation();
      rel.subj = relByID.subj; // already an Detail obj
      rel.obj = this._lookupStorage.getID(relByID.obj);
      rel.type = relByID.type;
      //assert(rel.id, "relation ID is missing");
      assert(rel.type, "relation type is missing");
      assert(rel.subj instanceof Detail, "relation subject missing or has wrong type");
      for (let r of rel.subj.relations) {
        if ( !(r instanceof Relation)) {
          alert("rel is not a Relation, but " + dumpObject(r, "rel", 2));
        }
        assert(r instanceof Relation);
      }
      assert(rel.obj instanceof Detail, "relation object " + relByID.obj + " not found");
      rel.add();
      //rel.opposite().add(); // if it already exists, it's a no-op
    }
  }

  /**
   * Old format rel where relations are separate and last in file
   *
  parseRelation(json) {
    var rel = new Relation();
    //rel.id = json.id;
    rel.subj = this._storage.getID(json.subj);
    rel.obj = this._storage.getID(json.obj);
    rel.type = json.type;
    //assert(rel.id, "relation ID is missing");
    assert(rel.type, "relation type is missing");
    assert(rel.subj instanceof Detail, "relation subject " + json.subj + " not found");
    assert(rel.obj instanceof Detail, "relation object " + json.obj + " not found");
    rel.subj.relations.push(rel);
    //rel.obj.relations.push(rel);
    return rel;
  }
  */
}
