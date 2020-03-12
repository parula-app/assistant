/**
 * Base type of the objects (Person, Place, Event, ...) in the system.
 *
 * Before you can access .description or .relations or
 * the corresponding helper getters, you need to call load().
 */
function Detail() {
  this.relations = [];
  this.otherNames = [];
}
Detail.prototype = {
  /**
   * Reflection, to know the object time.
   * Overwrite in all subclasses
   * {String-enum}
   */
  typename : "detail",
  /**
   * Uniquely identifies this object internally.
   * This must be unique within the whole |Storage|, even across types.
   * {String}
   */
  id : null,
  /**
   * Alternate ID, given by external authority.
   * E.g. Insight book article number.
   * {String}
   */
  idExt : null,
  /**
   * Article/resource name on dbpedia.
   * Should be verified, not just generated.
   * Just the part after "dbpedia:"
   * Valid mostly for Person and Place.
   * Allows to automatically combine data sources
   * and automatically fetch properties like geo coordinates.
   */
  dbpediaID : null,
  /**
   * Short text (usually <30 chars) that identifies the object to the end user
   * {String}
   */
  name : "",
  /**
   * Other names, e.g. "Abram"
   * {Array of String}
   */
  otherNames : null,
  /**
   * E.g. "King", "Apostle", "Nation" (for Person) or "Land", "Mount" (for Place) etc.
   * {String}
   */
  role : null,
  /**
   * Long text that describes the objects.
   *
   * Before accessing this, call load().
   * {String}
   */
  descr : "",
  /**
   * Links to other objects.
   * You can also use the getter functions like .persons, .events etc.,
   * or relationsOfType().
   * { Array of Relation }
   */
  relations : null,

  get descriptiveName() {
    var name = this.name;
    if (this.role) {
      name += " (" + this.role + ")";
    }
    return name;
  },

  toString : function() {
    return this.name;
  },

  get persons() {
    return this.relationsOfType(null, Person);
  },
  get events() {
    return this.relationsOfType(null, Event);
  },
  get sources() {
    return this.relationsOfType(null, Source);
  },
  get places() {
    return this.relationsOfType(null, Place);
  },
  get media() {
    return this.relationsOfType(null, Media);
  },
  get allRelatedObjs() {
    return this.relations.map(function(e) {
      return e.obj;
    });
  },

  /**
   * Returns only those relations that match the given criteria.
   * Both params can be null, in which case any passes.
   *
   * @param relType {String}   must be |rel.type == relType|
   * @param objType {subclass of Detail}  |rel.obj| must be of type
   *     E.g. |Person|, |Source|, |Event|
   * @returns {Array of Detail}   the relation objects
   */
  relationsOfType : function(relType, objType) {
    return this.relations.filter(function(e) {
      return (!relType || e.type == relType) &&
          (!objType || e.obj instanceof objType);
    }).map(function(e) {
      return e.obj;
    });
  },

  /**
   * Removes all relations.
   *
   * This is called by storage.remove(obj).
   */
  remove : function() {
    var self = this;
    this.relations.forEach(function(rel) {
      var other = rel.obj;
      other.relations = other.relations.filter(function(relOfOther) {
        return relOfOther.obj != self; // && relOfOther.subj != self;
      });
    });
    return this;
  },

  /**
   * Adds a relation to another object to this object.
   *
   * @param obj {Detail or Relation}
   * @param type {String-enum}   @see Relation.type
   *    Only passed when obj is Detail, not Relation.
   * @returns {Relation}   the new relation.
   *    It's already added to this obj, so you can ignore the result.
   */
  addRelation : function(obj, type) {
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
  },

  /**
   * for Array.sort()
   */
  compare : function(other) {
    if (this.name < other.name) return -1;
    if (this.name > other.name) return 1;
    return 0;
  },

  /**
   * Fetch the full |description| from network or files.
   *
   * Dummy implementation. Subclasses can override.
   */
  load : function(successCallback, errorCallback) {
    successCallback();
  },
};


function Person() {
  Detail.call(this);
}
Person.prototype = {
  typename : "person",
  male : true, // {Boolean}

  get descriptiveName() {
    var name = this.name;
    if (this.role) {
      name += " (" + this.role + ")";
    } else if (this.father) {
      name += " (" + (this.male ? "son" : "daugher") + " of " + this.father.name + ")";
    }
    return name;
  },

  /**
   * @return { Array of Person }
   */
  get relatedPersons() {
    return this.persons;
  },
  /**
   * @return { Array of Relation }  with rel.obj being Person
   */
  get personRelations() {
    return this.relations.filter(function(e) {
      return e.obj instanceof Person;
    });
  },
  /**
   * @return Person or null
   */
  get father() {
    var rels = this.relations.filter(function(e) {
      return e.obj instanceof Person && e.obj.male && e.type == "father";
    });
    if (rels.length == 0) {
      return null;
    }
    return rels[0].obj;
  },
  /**
   * @return Person or null
   */
  get mother() {
    var rels = this.relations.filter(function(e) {
      return e.obj instanceof Person && !e.obj.male && e.type == "mother";
    });
    if (rels.length == 0) {
      return null;
    }
    return rels[0].obj;
  },
  /**
   * @return {Array of Person}
   */
  get children() {
    return this.relationsOfType("child", Person);
  },
  /**
   * Returns siblings with relation
   * They are *not* included in the other person relations getters.
   * @returns { Array of Relation}   with rel.type == "brother" or "sister"
   * or TODO "half-brother" or "half-sister"
   */
  get siblingRelations() {
    var self = this;
    var result = [];
    [ this.father, this.mother ].forEach(function(parent) {
      if ( !parent) {
        return;
      }
      parent.relations.forEach(function(rel) {
        if (rel.type != "child") {
          return;
        }
        var sibling = rel.obj;
        if (sibling == self) {
          return;
        }
        if (result.some(function(oRel) { return oRel.obj == sibling; })) {
          // TODO half-siblings
          return; // already there from other parent, don't double-add
        }
        var sibRel = new Relation();
        sibRel.subj = self
        sibRel.obj = sibling
        sibRel.type = sibling.male ? "brother" : "sister";
        result.push(sibRel);
      });
    });
    return result;
  },
  /**
   * Returns siblings
   * They are *not* included in the other person getters.
   * @returns { Array of Person}
   */
  get siblings() {
    return this.siblingRelations.map(function(e) {
      return e.obj;
    });
  },
  /*
  get persons() {
    var result = Detail.prototype.__lookupGetter__("persons").apply(this);
    return result.concat(this.siblings);
  },
  get allRelatedObjs() {
    var result = Detail.prototype.__lookupGetter__("allRelatedObjs").apply(this);
    return result.concat(this.siblings);
  },
  */
};
extend(Person, Detail);


function Source() {
  Detail.call(this);
}
Source.prototype = {
  typename : "source",

  /**
   * Text from source, but only the part that is referenced.
   * Can be long.
   * {String}
   */
  get quote() {
    return this.descr;
  },
  set quote(val) {
    this.descr = val;
  },

  fetch : function(successCallback) {
    successCallback();
  },
};
extend(Source, Detail);


function Event() {
  Detail.call(this);
}
Event.prototype = {
  typename : "event",

  /**
   * When the event happened.
   * Yes, JS Date can represent year 250000 BC - pretty nice.
   * {Date}
   */
  time : null,

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
  },
  wasAfterEvent : function(after) {
    assert(after instanceof Event);
    // double-add caught in |Relation|
    var rel1 = this.addRelation(after, "afterEvent");
    var rel2 = after.addRelation(this, "beforeEvent");
    return [ rel1, rel2 ];
  },

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
  setAfterEventWithRelativeTime : function(before, relativeTime) {
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
  },
  get afterEventWithRelativeTime() {
    return this.relationsOfType("afterEventWithRelativeTime", Event)[0];
  },
  /**
   * Relative time to another event
   * We know this event happened 3 days after another event A.
   * But we don't know when exactly event A happened.
   * So, after = A and timeAfterEvent = 3 days.
   * Should never be negative (meaning before), because in that case
   * the other event should have |afterEvent| and |timeAfterEvent| set.
   * {Integer} Unixtime, relative
   */
  timeAfterEvent : null,

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
  timePlusMinus : null,

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
  },
  set timeGenerated(val) {
    this._timeGenerated = !!val;
    if ( !val) {
      // TODO place?
      calculateEventTimes(gStorage, function() {}, alert);
    }
  },
  _timeGenerated : false,

  /**
   * Which one should be listed first, if lacking any other criteria.
   * E.g. for Array.sort()
   * Do not use this on relationship targets.
   */
  compare : function(other) {
    if (this.time && other.time) return this.time - other.time;
    if (this.afterEvent == other) return other;
    return Detail.prototype.compare.apply(this, arguments);
  },

};
extend(Event, Detail);

// Handle JS |Date|
function dateCopy(date) {
  return date ? new Date(date.getTime()) : null;
};
function dateAdd(a, b) {
  if (b instanceof Date) {
    b = b.getTime();
  }
  assert(typeof(b) == "number");
  return new Date(a.getTime() + b);
};


function GeoCoordinate(long, lat) {
  if (typeof(lat) == "number" && typeof(long) == "number") {
    this.long = long;
    this.lat = lat;
  }
}
GeoCoordinate.prototype = {
  long : 0, // {Float} Longitude in WGS1984, X axis
  lat : 0, // {Float} Latitude in WGS1984, Y axis
};

function Place() {
  Detail.call(this);
  this.area = [];
}
Place.prototype = {
  typename : "place",
  point : null, // {GeoCoordinate}   Single point. (Set either |point| or |area|.)
  area : null, // {Array of GeoCoordinate}   Region
};
extend(Place, Detail);


// abstract base class
function Media() {
  Detail.call(this);
}
Media.prototype = {
  url : null, // {URL as String} absolute or relative URL
};
extend(Media, Detail);

function Image() {
  Media.call(this);
}
Image.prototype = {
  typename : "image",
};
extend(Image, Media);


function Relation() {
  //this.id = "rel-" + (++Relation._lastID); // feel free to overwrite this |id|
}
Relation.prototype = {
  //id : null, // {String}
  subj : null, // {Detail}
  obj : null, // {Detail}
  type : null, // {String-enum}

  /**
   * Returns a relation in the other direction,
   * i.e. subj and obj exchanged.
   * That sometimes also changes the type, e.g. father -> child.
   * @returns {Relation}   new relation
   */
  opposite : function() {
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
    // Symmetric
    default:
      rel.type = this.type;
      break;
    }
    return rel;
  },

  /**
   * Add this relation to the subject's relation list.
   * If the rel already exists, this is a no-op.
   *
   * It does *not* add it to the object's relation list,
   * but you can do that easily using: rel.opposite().add();
   */
  add : function() {
    if ( !this.exists()) {
      this.subj.addRelation(this);
    }
  },

  remove : function() {
    // This creates a new array. This is also necessary,
    // otherwise the forEach() in Detail.remove() goes wrong.
    var self = this;
    this.subj.relations = this.subj.relations.filter(function(rel) {
      return rel != self;
    });

    var opp = this.opposite();
    // remove opp from obj.relations
    this.obj.relations = this.obj.relations.filter(function(rel) {
      return !rel.eq(opp);
    });
  },

  /**
   * Checks whether subj already has such a relation.
   * @returns {Boolean}
   */
  exists : function() {
    var self = this;
    return this.subj.relations.some(function(rel) {
      return rel.eq(self);
    });
  },

  /**
   * Whether some other rel matches this one.
   * @param o {Relation}   other relation
   * @returns {Boolean}
   */
  eq : function(o) {
    return o.subj == this.subj && o.obj == this.obj && o.type == this.type;
  },

  get typeLabel() {
    try {
      return tr("genealogy.rel." + this.type);
    } catch (e) {}
    return this.type;
  },

  dump : function() {
    return "rel " + this.type + " from " + this.subj.name + " to " + this.obj.name;
  },

};
//Relation._lastID = 0;
