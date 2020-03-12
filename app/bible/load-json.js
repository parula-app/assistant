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
function LoadNativeJSON() {
  this._storage = new RAMStorage();
  //this._relations = {};
}
LoadNativeJSON.prototype = {
  _storage : null, // {Storage}
  //_relations : null, // {Map of rel ID -> rel obj}

  /**
   * Convenience function to load the file from a URL,
   * parse it and return the DB.
   * @param url {String}
   * @param successCallback {Function(db {Storage})}
   * @param errorCallback
   */
  loadFromURL : function(url, successCallback, errorCallback) {
    var self = this;
    loadURL(url, "json", function(text) {
      successCallback(self.load(text));
    }, errorCallback);
  },

  /**
   * Entry function to parse
   * @param json {JSON or String}   JSON file contents
   * @returns {Storage}   DB with the objects
   */
  load : function(json) {
    if (typeof(json) == "string") {
      json = JSON.parse(json);
    }
    assert(typeof(json) == "object", "need JSON");

    var needRelations = [];
    var self = this;
    json.details.forEach(function(detailJSON) {
      //alert("parsing " + detailJSON.id + " = " + detailJSON.name);
      self._storage.add(self.parseDetail(detailJSON, needRelations));
    });
    // new rel format
    this.lookupRelations(needRelations);

    /*/ old rel format
    if (json.relations) {
      json.relations.forEach(function(relJSON) {
        self.parseRelation(relJSON);
      });
    }*/

    /* Cleanup
    this._storage.iterate(function(obj) {
      if (obj instanceof Event) {
        obj.relationsOfType("birth", BibleText)
            .concat(obj.relationsOfType("death", BibleText))
            .forEach(function(rel) {
              rel.type = "bibletext";
            });
      }
    }, function() { alert("converted"); }, alert);
    */

    return this._storage;
  },

  parseDetail : function(json, needRelations) {
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
      detail = new BibleText();
    } else if (json.typename == "image") {
      detail = new Image();
    } else {
      throw new Exception("unknown type " + json.typename);
    }
    detail.fromJSON(json, needRelations);
    return detail;
  },

  /**
   * New rel format where relations are inline in the objs.
   * After all objs have been parsed,
   * need to look up rel obj ID references.
   */
  lookupRelations : function(needRelations) {
    var self = this;
    needRelations.forEach(function(relByID) {
      var rel = new Relation();
      rel.subj = relByID.subj; // already an Detail obj
      rel.obj = self._storage.getID(relByID.obj);
      rel.type = relByID.type;
      //assert(rel.id, "relation ID is missing");
      assert(rel.type, "relation type is missing");
      assert(rel.subj instanceof Detail, "relation subject missing or has wrong type");
      rel.subj.relations.forEach(function(r) {
        if ( !(r instanceof Relation)) {
          alert("rel is not a Relation, but " + dumpObject(r, "rel", 2));
        }
        assert(r instanceof Relation);
      });
      assert(rel.obj instanceof Detail, "relation object " + relByID.obj + " not found");
      rel.add();
      //rel.opposite().add(); // if it already exists, it's a no-op
    });
  },

  /**
   * Old format rel where relations are separate and last in file
   *
  parseRelation : function(json) {
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
  },
  */
}

Detail.prototype.fromJSON = function(json, needRelations) {
  for (var prop in json) {
     // process maps and arrays specifically
    if (typeof(json[prop]) == "object") {
      continue;
    }
    this[prop] = json[prop];
  }
  this.otherNames = json.otherNames; // Array of String

  var self = this;
  if (json.relations) {
    json.relations.forEach(function(rel) {
      rel.subj = self;
      assert(rel.type, "relation type is missing");
      assert(rel.obj, "relation obj is missing");
      needRelations.push(rel);
    });
  }
}

Person.prototype.fromJSON = function(json) {
  Detail.prototype.fromJSON.apply(this, arguments);
  //this.male = json.male;
}


Event.prototype.fromJSON = function(json) {
  Detail.prototype.fromJSON.apply(this, arguments);
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

Place.prototype.fromJSON = function(json) {
  Detail.prototype.fromJSON.apply(this, arguments);
  var sp = this.name.split(" (");
  if (sp.length > 1) {
    this.role = sp[1].substr(0, sp[1].length - 1);
    this.name = sp[0];
  }
  if (json.point) {
    var geo = new GeoCoordinate();
    geo.fromJSON(json.point);
    this.point = geo;
  }
  if (json.area) {
    this.area = [];
    self = this;
    json.area.forEach(function(coord) {
      var geo = new GeoCoordinate();
      geo.fromJSON(coord);
      self.area.push(geo);
    });
  }
}

GeoCoordinate.prototype.fromJSON = function(json){
  this.lat = json.lat;
  this.long = json.long;
  assert(typeof(this.lat) == "number");
  assert(typeof(this.long) == "number");
}


BibleText.prototype.fromJSON = function(json) {
  this.name = json.name || json.id.replace("bible-", "");
  this.init();
  this.id = json.id;
}
