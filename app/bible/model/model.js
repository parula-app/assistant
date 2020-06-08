import { assert, tr } from "../util/util.js";

/**
 * Abstract base class of the objects (Person, Place, Event, ...) in the system.
 *
 * Before you can access .description or .relations or
 * the corresponding helper getters, you need to call load().
 */
export class Detail {
  constructor(typename) {
    /**
     * Reflection, to know the object time.
     * Overwrite in all subclasses
     * {String-enum}
     */
    this.typename = typename;
    /**
     * Uniquely identifies this object internally.
     * This must be unique within the whole |Storage|, even across types.
     * {String}
     */
    this.id = null;
    /**
     * Alternate ID, given by external authority.
     * E.g. Insight book article number.
     * {String}
     */
    this.idExt = null;
    /**
     * Article/resource name on dbpedia.
     * Should be verified, not just generated.
     * Just the part after "dbpedia:"
     * Valid mostly for Person and Place.
     * Allows to automatically combine data sources
     * and automatically fetch properties like geo coordinates.
     */
    this.dbpediaID = null;
    /**
     * Short text (usually <30 chars) that identifies the object to the end user
     * {String}
     */
    this.name = "";
    /**
     * Other names, e.g. "Abram"
     * {Array of String}
     */
    this.otherNames = [];
    /**
     * E.g. "King", "Apostle", "Nation" (for Person) or "Land", "Mount" (for Place) etc.
     * {String}
     */
    this.role = null;
    /**
     * Long text that describes the objects.
     *
     * Before accessing this, call load().
     * {String}
     */
    this.descr = "";
    /**
     * Links to other objects.
     * You can also use the getter functions like .persons, .events etc.,
     * or relationsOfType().
     * { Array of Relation }
     */
    this.relations = [];

    /**
     * This object was changed by the user *and* the latest change
     * not yet been saved yet and needs to be saved to disk or network.
     * {Boolean}
     */
    this.needsSave = false;
  }

  get descriptiveName() {
    var name = this.name;
    if (this.role) {
      name += " (" + this.role + ")";
    }
    return name;
  }

  toString() {
    return this.name;
  }

  get pageURL() {
    return "/" + this.typename + "/" + this.id;
  }

  get persons() {
    return this.relationsOfType(null, Person);
  }
  get events() {
    return this.relationsOfType(null, Event);
  }
  get sources() {
    return this.relationsOfType(null, Source);
  }
  get places() {
    return this.relationsOfType(null, Place);
  }
  get media() {
    return this.relationsOfType(null, Media);
  }
  get allRelatedObjs() {
    return this.relations.map(e => e.obj);
  }

  /**
   * Returns the related |Detail| objects that match the given criteria.
   * Both params can be null, in which case any passes.
   *
   * @param relType {String}   must be |rel.type == relType|
   * @param objType {subclass of Detail}  |rel.obj| must be of objType
   *     E.g. |Person|, |Source|, |Event|
   * @returns {Array of Detail}   related objects
   */
  relationsOfType(relType, objType) {
    return this.relationshipsOfType(relType, objType)
      .map(rel => rel.obj);
  }

  /**
   * Returns the relations that match the given criteria.
   * Both params can be null, in which case any passes.
   *
   * @param relType {String}   must be |rel.type == relType|
   * @param objType {subclass of Detail}  |rel.obj| must be of objType
   *     E.g. |Person|, |Source|, |Event|
   * @returns {Array of Relation}   relationship objects
   */
  relationshipsOfType(relType, objType) {
    return this.relations.filter(rel =>
        (!relType || rel.type == relType) &&
        (!objType || rel.obj instanceof objType)
    );
  }

  /**
   * Removes all relations.
   *
   * This is called by storage.remove(obj).
   */
  remove() {
    this.relations.forEach(rel => {
      let other = rel.obj;
      other.relations = other.relations.filter(relOfOther => relOfOther.obj != this); // && relOfOther.subj != this
    });
    return this;
  }

  /**
   * Adds a relation to another object to this object.
   *
   * @param obj {Detail or Relation}
   * @param type {String-enum}   @see Relation.type
   *    Only passed when obj is Detail, not Relation.
   * @returns {Relation}   the new relation.
   *    It's already added to this obj, so you can ignore the result.
   */
  addRelation(obj, type) {
    if (obj instanceof Relation) {
      assert(obj.subj == this);
      assert(obj.obj instanceof Detail);
      this.relations.push(obj);
      return obj;
    }
    assert(obj instanceof Detail);
    assert(typeof(type) == "string");
    var rel = new Relation();
    rel.subj = this;
    rel.obj = obj;
    rel.type = type;
    this.relations.push(rel);
    return rel;
  }

  /**
   * for Array.sort()
   */
  compare(other) {
    if (this.name < other.name) return -1;
    if (this.name > other.name) return 1;
    return 0;
  }

  /**
   * Fetch the full |description| from network or files.
   *
   * Dummy implementation. Subclasses can override.
   */
  async load() {
  }

  fromJSON(json, needRelations) {
    for (let prop in json) {
       // process maps and arrays specifically
      if (typeof(json[prop]) == "object") {
        continue;
      }
      this[prop] = json[prop];
    }
    this.otherNames = json.otherNames; // Array of String

    if (json.relations) {
      json.relations.forEach(rel => {
        rel.subj = this;
        assert(rel.type, "relation type is missing");
        assert(rel.obj, "relation obj is missing");
        needRelations.push(rel);
      });
    }
  }

  toJSON() {
    var json = {};
    json.typename = this.typename;
    json.id = this.id;
    json.name = this.name;
    //json.firstName = this.firstName;
    //json.lastName = this.lastName;
    if (this.idExt) {
      json.idExt = this.idExt;
    }
    if (this.dbpediaID) {
      json.dbpediaID = this.dbpediaID;
    }
    if (this.role) {
      json.role = this.role;
    }
    if (this.otherNames && this.otherNames.length > 0) {
      json.otherNames = this.otherNames; // Array of String
    }
    json.descr = this.descr;

    if (this.relations.length > 0) {
      json.relations = [];
      this.relations.forEach(function(rel) {
        json.relations.push({
          // skiping ID: not needed
          // skipping subj: implicitly |this|
          obj : rel.obj.id,
          type : rel.type,
        });
      });
    }
    return json;
  }
}


export class Person extends Detail {
  constructor() {
    super("person");

    /**
     * Gender, male or female
     * {Boolean}
     */
    this.male = true;
  }

  get descriptiveName() {
    var name = this.name;
    if (this.role) {
      name += " (" + this.role + ")";
    } else if (this.father) {
      name += " (" + (this.male ? "son" : "daugher") + " of " + this.father.name + ")";
    }
    return name;
  }

  /**
   * @return { Array of Person }
   */
  get relatedPersons() {
    return this.persons;
  }
  /**
   * @return { Array of Relation }  with rel.obj being Person
   */
  get personRelations() {
    return this.relations.filter(e => e.obj instanceof Person);
  }
  /**
   * @return Person or null
   */
  get father() {
    var rels = this.relations.filter(e =>
      e.obj instanceof Person && e.obj.male && e.type == "father"
    );
    if (rels.length == 0) {
      return null;
    }
    return rels[0].obj;
  }
  /**
   * @return Person or null
   */
  get mother() {
    var rels = this.relations.filter(e =>
      e.obj instanceof Person && !e.obj.male && e.type == "mother"
    );
    if (rels.length == 0) {
      return null;
    }
    return rels[0].obj;
  }
  /**
   * @return {Array of Person}
   */
  get children() {
    return this.relationsOfType("child", Person);
  }
  /**
   * Returns siblings with relation
   * They are *not* included in the other person relations getters.
   * @returns { Array of Relation}   with rel.type == "brother" or "sister"
   * or TODO "half-brother" or "half-sister"
   */
  get siblingRelations() {
    var result = [];
    [ this.father, this.mother ].forEach(parent => {
      if ( !parent) {
        return;
      }
      parent.relations.forEach(rel => {
        if (rel.type != "child") {
          return;
        }
        var sibling = rel.obj;
        if (sibling == this) {
          return;
        }
        if (result.some(oRel => oRel.obj == sibling)) {
          // TODO half-siblings
          return; // already there from other parent, don't double-add
        }
        var sibRel = new Relation();
        sibRel.subj = this;
        sibRel.obj = sibling;
        sibRel.type = sibling.male ? "brother" : "sister";
        result.push(sibRel);
      });
    });
    return result;
  }
  /**
   * Returns siblings
   * They are *not* included in the other person getters.
   * @returns { Array of Person}
   */
  get siblings() {
    return this.siblingRelations.map(e => e.obj);
  }
  /*
  get persons() {
    return super.persons.concat(this.siblings);
  }
  get allRelatedObjs() {
    return super.allRelatedObjs.concat(this.siblings);
  }
  */

  toJSON() {
    var json = super.toJSON();
    json.male = this.male;
    return json;
  }
}


export class Source extends Detail {
  constructor(typename) {
    super(typename || "source");
  }

  /**
   * Text from source, but only the part that is referenced.
   * Can be long.
   * {String}
   */
  get quote() {
    return this.descr;
  }
  set quote(val) {
    this.descr = val;
  }
}


export class Event extends Detail {
  constructor() {
    super("event");

    /**
     * When the event happened.
     * Yes, JS Date can represent year 250000 BC - pretty nice.
     * {Date}
     */
    this.time = null;

    this._timeGenerated = false;

    /**
     * Relative time to another event
     * We know this event happened 3 days after another event A.
     * But we don't know when exactly event A happened.
     * So, after = A and timeAfterEvent = 3 days.
     * Should never be negative (meaning before), because in that case
     * the other event should have |afterEvent| and |timeAfterEvent| set.
     * {Integer} Unixtime, relative
     */
    this.timeAfterEvent = null;

    /**
     * TODO not yet implemented
     * If we don't know the exact time, but an approximation,
     * |time| contains the approximation and timePlusMinus
     * the time span before and after during which the event
     * might have happened.
     * For example, we know something happened between
     * years 30 and 34, then time = year 32 and
     * timePlusMinus = 2 years.
     * {Date}, used as relative time
     */
    this.timePlusMinus = null;
  }

  /**
   * We don't know when exactly this event happened,
   * but we know it (|this| == event B) happened after event A.
   * so B.afterEvent = A.
   * Should also be expressed as relations "after" and "before":
   * B --after--> A
   * A --before--> B
   * {Event}
   */
  get afterEvents() {
    return this.relationsOfType("afterEvent", Event);
    /*if (this._afterEvents) return this._afterEvents; // Just a cache
    return this._afterEvents = this.relationsOfType("afterEvent", Event); */
  }
  wasAfterEvent(after) {
    assert(after instanceof Event);
    // double-add caught in |Relation|
    var rel1 = this.addRelation(after, "afterEvent");
    var rel2 = after.addRelation(this, "beforeEvent");
    return [ rel1, rel2 ];
  }

  /**
   * We know that |this| event was 70 years after event A
   * this.setAfterEventWithRelativeTime(A, reltime);
   * with reltime e.g. 70*365.25*24*3600*1000 or better:
   *     var relDate = new Date(0); // 0 is necessary
   *     relDate.setFullYear(70); // Full is necessary
   *     relTime = relDate.getTime();
   * @param before {Event}  an event that happened before this
   * @param relativeTime {Integer} Unixtime time difference in milliseconds
   */
  setAfterEventWithRelativeTime(before, relativeTime) {
    assert(before instanceof Event);
    assert(typeof(relativeTime) == "number", "Relative time must be a Unixtime as Integer");
    //assert(relativeTime instanceof Date, "Relative time must be a JS Date");
    // TODO remove old, must be only 1
    /*this.relationsOfType("afterEventWithRelativeTime", Event).forEach(event) {
      event.remove();
    });*/
    this.wasAfterEvent(before);
    var rel = this.addRelation(before, "afterEventWithRelativeTime");
    this.timeAfterEvent = relativeTime;
    if ( !this.time && before.time) {
      this.time = dateAdd(before.time, relativeTime);
      this.timeGenerated = true; // = before.timeGenerated;
    }
    return rel;
  }
  get afterEventWithRelativeTime() {
    return this.relationsOfType("afterEventWithRelativeTime", Event)[0];
  }

  /**
   * false = editor user manually set |this.time|
   *     and - if applicable - |this.timePlusMinus|
   *     This means we should rely on it and not overwrite it.
   * true = algo calculated the time based on other
   *     event times and relations.
   *     This means that a re-calculation based on new data
   *     can overwrite |this.time| and |this.timePlusMinus|
   */
  get timeGenerated() {
    return this._timeGenerated;
  }
  set timeGenerated(val) {
    this._timeGenerated = !!val;
  }

  /**
   * Which one should be listed first, if lacking any other criteria.
   * E.g. for Array.sort()
   * Do not use this on relationship targets.
   */
  compare(other) {
    if (this.time && other.time) {
      return this.time - other.time;
    }
    if (this.afterEvent == other) {
      return other;
    }
    return super.compare(other);
  }

  fromJSON(json, needRelations) {
    super.fromJSON(json, needRelations);

    if (json.time) {
      this.time = new Date(json.time); // Unixtime
    }
    if (json.timePlusMinus) {
      this.timePlusMinus = new Date(json.timePlusMinus); // Unixtime
    }
    if (json.timeAfterEvent) {
      this.timeAfterEvent = json.timeAfterEvent; // Unixtime
    }
  }

  toJSON() {
    var json = super.toJSON();
    if (this.time) {
      json.time = this.time.getTime(); // Unixtime
    }
    if (this.timePlusMinus) {
      json.timePlusMinus = this.timePlusMinus.getTime(); // Unixtime
    }
    if (this.timeAfterEvent) {
      json.timeAfterEvent = this.timeAfterEvent; // Unixtime
    }
    if (this.timeGenerated) {
      json.timeGenerated = this.timeGenerated; // Boolean
    }
    return json;
  }
}

// Handle JS |Date|
export function dateCopy(date) {
  return date ? new Date(date.getTime()) : null;
}
export function dateAdd(a, b) {
  if (b instanceof Date) {
    b = b.getTime();
  }
  assert(typeof(b) == "number");
  return new Date(a.getTime() + b);
}


export class Place extends Detail {
  constructor() {
    super("place");

    this.area = [];
    /**
     * {GeoCoordinate}   Single point. (Set either |point| or |area|.)
     */
    this.point = null;
    /**
     * {Array of GeoCoordinate}   Region
     */
    this.area = [];
  }

  fromJSON(json, needRelations) {
    super.fromJSON(json, needRelations);

    var sp = this.name.split(" (");
    if (sp.length > 1) {
      this.role = sp[1].substr(0, sp[1].length - 1);
      this.name = sp[0];
    }
    if (json.point) {
      let geo = new GeoCoordinate();
      geo.fromJSON(json.point);
      this.point = geo;
    }
    if (json.area) {
      this.area = [];
      json.area.forEach(coord => {
        let geo = new GeoCoordinate();
        geo.fromJSON(coord);
        this.area.push(geo);
      });
    }
  }

  toJSON() {
    var json = super.toJSON();
    if (this.point) {
      json.point = this.point.toJSON(); // GeoCoordinate
    }
    if (this.area && this.area.length > 0) {
      json.area = [];
      this.area.forEach(function(coord) {
        json.area.push(coord.toJSON());
      });
    }
    return json;
  }
}


export class GeoCoordinate {
  constructor(long, lat) {
    /**
    * {Float} Longitude in WGS1984, X axis
    */
    this.long = 0;
    /**
    * {Float} Latitude in WGS1984, Y axis
    */
    this.lat = 0;
    if (typeof(long) == "number" && typeof(lat) == "number") {
      this.long = long;
      this.lat = lat;
    }
  }

  fromJSON(json) {
    this.lat = json.lat;
    this.long = json.long;
    assert(typeof(this.lat) == "number");
    assert(typeof(this.long) == "number");
  }

  toJSON() {
    var json = {};
    json.lat = this.lat;
    json.long = this.long;
    return json;
  }
}


/**
 * An abstract topic, concept or teaching.
 * E.g. laws, kindness, death.
 *
 * Topics are sorted hierarchically with subtopics
 * (relation types "parentTopic" vs. "childTopic").
 *
 * Topics can have also other relations to Notes, Events and Persons.
 *
 * Note: The millenial reign is an Event, not a Topic.
 */
export class Topic extends Detail {
  constructor() {
    super("topic");
  }

  /**
   * Parent topic, i.e. broader concept.
   * {Topic}
   */
  get parent() {
    return this.relationsOfType("parentTopic", Topic)[0];
  }

  /**
   * @param parent {Topic}
   */
  set parent(parent) {
    assert(parent instanceof Topic);
    // clear previous, if any
    this.relationshipsOfType("parentTopic").forEach(rel => rel.remove());
    this.addRelation(parent, "parentTopic");
  }

  /**
   * Children topics, i.e. more details about this topic.
   * {Array of Topic}
   */
  get children() {
    return this.relationsOfType("childTopic", Topic);
  }

  /**
   * @param child {Topic}
   */
  addChild(child) {
    assert(child instanceof Topic);
    this.addRelation(child, "childTopic");
  }
}


// abstract base class
export class Media extends Detail {
  constructor(typename) {
    super(typename);

    /**
     * {URL as String} absolute or relative URL
     */
    this.url = null;
  }

  toJSON() {
    var json = super.toJSON();
    json.url = this.url;
    return json;
  }
}

export class Image extends Media {
  constructor() {
    super("image");
  }
}


/**
 * Captures user notes attached to another object.
 */
export class Notes extends Detail {
  /**
   * @param subjects {Array of Detail}   What the notes are about
   * @param subjectsStorage {Storage}   Where the subjects are stored
   */
  constructor(subjects, subjectsStorage) {
    super("notes");
    this.id = this.getNewID();
    this.name = "Notes " + this.id;
    this.plaintext = null;
    this.subjects = [];

    if (subjects) {
      assert(typeof(subjects.length) == "number", "need subjects");
      assert(typeof(subjectsStorage.add) == "function", "need storage where the subjects are");
      for (let subject of subjects) {
        assert(subject instanceof Detail);
      }
      this.subjects = subjects;
      this.ensureSubjectsInStorage(subjects, subjectsStorage);
    }
  }

  ensureSubjectsInStorage(subjects, subjectsStorage) {
    // Bible verses are normally not in Storage, so add them there
    for (let subject of subjects) {
      if (!subjectsStorage.getID(subject.id)) {
        subjectsStorage.add(subject);
      }
    }
  }

  fromJSON(json, needRelations) {
    super.fromJSON(json, needRelations);
    //TODO this.ensureSubjectsInStorage(...);
  }

  toJSON() {
    var json = super.toJSON();
    json.plaintext = this.plaintext;
    json.html = this.html;
    return json;
  }

  getNewID() {
    return "n" + Math.floor(Math.random() * 100000000);
  }

  addToStorage(notesStorage) {
    for (let subject of this.subjects) {
      assert(subject instanceof Detail);
      let rel = this.addRelation(subject, "subject");
      let backRel = rel.opposite().add(); // add "notes" rel to subject
      //console.log("rel: " + rel.dump() + ", back rel: " + backRel.dump());
      subject.needsSave = true;
      notesStorage.add(subject);
    }
    this.needsSave = true;
    notesStorage.add(this);
  }
}



export class Relation {
  constructor() {
    /**
     * {Detail}
     */
    this.subj = null;
    /**
     * {Detail}
     */
    this.obj = null;
    /**
     * {String-enum}
     */
    this.type = null;

    /**
     * {String}
     */
    //this.id = "rel-" + (++Relation._lastID); // feel free to overwrite this |id|
  }

  /**
   * Returns a relation in the other direction,
   * i.e. subj and obj exchanged.
   * That sometimes also changes the type, e.g. father -> child.
   * @returns {Relation}   new relation
   */
  opposite() {
    var rel = new Relation();
    rel.obj = this.subj;
    rel.subj = this.obj;
    switch (this.type) {
    // Person
    case "father":
    case "mother":
      rel.type = "child";
      break;
    case "child":
      rel.type = rel.obj.male ? "father" : "mother";
      break;
    // Event
    case "afterEvent":
      rel.type = "beforeEvent";
      break;
    case "beforeEvent":
      rel.type = "afterEvent";
      break;
    // Notes
    case "notes":
      rel.type = "subject";
      break;
    case "subject":
      rel.type = "notes";
      break;
    // Topic
    case "parentTopic":
      rel.type = "childTopic";
      break;
    case "childTopic":
      rel.type = "parentTopic";
      break;
    // Symmetric
    default:
      rel.type = this.type;
      break;
    }
    return rel;
  }

  /**
   * Add this relation to the subject's relation list.
   * If the rel already exists, this is a no-op.
   *
   * It does *not* add it to the object's relation list,
   * but you can do that easily using: rel.opposite().add();
   */
  add() {
    if ( !this.exists()) {
      this.subj.addRelation(this);
    }
    return this;
  }

  remove() {
    // This creates a new array. This is also necessary,
    // otherwise the forEach() in Detail.remove() goes wrong.
    this.subj.relations = this.subj.relations.filter(rel => rel != this);

    var opp = this.opposite();
    // remove opp from obj.relations
    this.obj.relations = this.obj.relations.filter(rel => !rel.eq(opp));
  }

  /**
   * Checks whether subj already has such a relation.
   * @returns {Boolean}
   */
  exists() {
    return this.subj.relations.some(rel => rel.eq(this));
  }

  /**
   * Whether some other rel matches this one.
   * @param o {Relation}   other relation
   * @returns {Boolean}
   */
  eq(o) {
    return o.subj == this.subj && o.obj == this.obj && o.type == this.type;
  }

  get typeLabel() {
    try {
      return tr("genealogy.rel." + this.type);
    } catch (e) {}
    return this.type;
  }

  dump() {
    return this.subj.name + " ---" + this.type + "--> " + this.obj.name;
  }
}
//Relation._lastID = 0;
