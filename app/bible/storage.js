function Storage() {
  this.cache = {};
}
Storage.prototype = {
  cache : null, // {Object}   Allows to add other storages and caches here

  /**
   * Find the Detail (Person, Event etc.) with this ID.
   * This is typically used when it was referenced by another object.
   *
   * @param id { String } IDs of a detail that you're looking for
   * @returns { Detail }
   *    May be null (if not found)
   */
  getID : function(id) {
    throw "abstract function, please subclass";
  },

  /**
   * Find the Details (Person, Event etc.) with these IDs.
   * For some implementations, this may be faster than multiple getID() calls.
   *
   * @param ids { Array of String } list of IDs of the events that you are looking for
   * @returns { Array of Detail }
   *    IDs not found are not included
   *    May be empty
   *    Order may not be the same as the input
   */
  getIDs : function(ids) {
    var result = [];
    for (var i = 0; i < ids.length; i++) {
      var obj = this.getID(ids[i]);
      if (obj) {
        result.push(obj);
      }
    }
    return result;
  },

  /**
   * Searches for an object that contains |text| in the name.
   * Case is ignored. Partial matches are included.
   * E.g "ab" finds "Abraham".
   *
   * @param text { String }
   * @param type { subtype of Detail } e.g. |Person|, |Event| etc.
   *     or |null| for any type
   * @param successCallback { Function(result {Array of Detail })
   *    result   Search result. May be empty
   * @param errorCallback { Function(e) }
   */
  searchName : function(text, successCallback, errorCallback) {
    text = text.toLowerCase();
    var result = [];
    this.iterate(function(obj) { // each
      if (_hasName(obj, text)) {
        result.push(obj);
      }
    }, function() { // finish
      result = _searchRank(text, result);
      successCallback(result);
    }, errorCallback);
  },

  /**
   * Searches for an object that contains |text| in name or description etc.
   *
   * Case is ignored. Partial matches are included.
   *
   * @param text { String }
   * @param successCallback { Function(result {Array of Detail })
   *    result   Search result. May be empty
   * @param errorCallback { Function(e) }
   */
  searchFulltext : function(text, successCallback, errorCallback) {
    text = text.toLowerCase();
    var result = [];
    this.iterate(function(obj) { // each
      if (_hasName(obj, text) ||
          obj.descr && obj.descr.toLowerCase().indexOf(text) >= 0) {
        result.push(obj);
      }
    }, function() { // finish
      result = _searchRank(text, result);
      successCallback(result);
    }, errorCallback);
  },

  /**
   * Return all objects.
   *
   * @param type { subtype of Detail }   only objects of this type
   *     E.g. |Person|, |Event| etc.
   *     |null| for all types
   * @param successCallback { Function(result {Array of Detail })
   * @param errorCallback { Function(e) }
   */
  getAll : function(type, successCallback, errorCallback) {
    assert( !type || typeof(type) == "function", "type parameter missing");
    var result = [];
    this.iterate(function(obj) { // each
      if ( !type || obj instanceof type) {
        result.push(obj);
      }
    }, function() { // finish
      successCallback(result);
    }, errorCallback);
  },

  /**
   * @param eachCallback {Function(obj {Detail})}   called for each
   *     object in the store.
   * @param finishedCallback {Function()}   called after the end of the iteration
   * @param errorCallback { Function(e) }
   */
  iterate : function(eachCallback, finishedCallback, errorCallback) {
    throw "abstract function, please subclass";
  },

  /**
   * Add this detail (Person, Event etc.) to the storage
   * @param detail {Detail}
   */
  add : function(detail) {
    throw "abstract function, please subclass";
  },

  /**
   * Delete this detail (Person, Event etc.) from the storage
   * @param detail {Detail}
   */
  remove : function(detail) {
    throw "abstract function, please subclass";
  },

  /**
   * Helper function for add() implementation.
   * Call before adding to storage.
   */
  _add : function(obj) {
    assert(obj instanceof Detail);
    this._generateID(obj);
    assert(obj.id, "need ID");
  },

  /**
   * Helper function for remove() implementation
   * Call before removing from storage.
   */
  _remove : function(obj) {
    assert(obj instanceof Detail);
    assert(obj.id, "need ID");

    obj.remove(); // remove relations

    // to be sure, check all objects whether there are still
    // relations to the removed obj.
    this.iterate(function(otherObj) { // each
      otherObj.relations = otherObj.relations.filter(function(rel) {
        return rel.obj != obj && rel.subj != obj;
      });
    }, function() { // finish  TODO async
    }, function(e) {}); // TODO error
  },

  _generateID : function(detail) {
    while ( !detail.id) {
      var id = detail.typename + "-" + (++Storage._lastID);
      if ( !this.getID(id)) {
        detail.id = id;
      }
    }
  },
}
Storage._lastID = 0;


/**
 * This keeps all Details as JS objects in RAM.
 */
function RAMStorage() {
  Storage.call(this);
  this._objects = {};
}
RAMStorage.prototype = {
  _objects : null, // { Map of ID -> Detail }

  getID : function(id) {
    return this._objects[id.toString()];
  },
  iterate : function(eachCallback, finishedCallback, errorCallback) {
    var self = this;
    runAsync(function() {
      for (var id in self._objects) {
        eachCallback(self._objects[id]);
      }
      finishedCallback();
    }, errorCallback);
  },
  add : function(obj) {
    this._add(obj);
    this._objects[obj.id] = obj;
  },
  remove : function(obj) {
    this._remove(obj);
    delete this._objects[obj.id];
  },
}
extend(RAMStorage, Storage);


/**
 * This keeps all Details as JS objects in the browser's localStorage
 * persistant store.
 *
 * @param prefix {String}   ID prefix for keys in localStorage.
 */
function LocalStorage(prefix) {
  Storage.call(this);
  assert(prefix && typeof(prefix) == "string");
  this._prefix = prefix + "-";
  this._store = window.localStorage;
}
LocalStorage.prototype = {
  getID : function(id) {
    return this._store.getItem(this._prefix + id.toString());
  },
  add : function(obj) {
    this._add(obj);
    this._store.setItem(this._prefix + obj.id, obj);
  },
  remove : function(obj) {
    this._remove(obj);
    this._store.removeKey(this._prefix + obj.id);
  },
}
extend(LocalStorage, Storage);


/**
 * @param obj {Detail}
 * @param name {String}
 *     already lower case
 */
function _hasName(obj, name) {
  if (obj.name && obj.name.toLowerCase().indexOf(name) >= 0) {
    return true;
  }
  if (obj.role && obj.role.toLowerCase().indexOf(name) >= 0) {
    return true;
  }
  if (obj.otherNames && obj.otherNames.some(function(otherName) {
      return otherName.toLowerCase().indexOf(name) >= 0;
    })) {
    return true;
  }
  return false;
}

/**
 * Given a bunch of search results, rates and ranks them
 * according to what's the best hit for the search term.
 *
 * @param searchTerm {String}   what the user searched for
 * @param objs {Array of Detail}   objs where searchTerm appears somewhere,
 *     e.g. in name or descr
 * @returns {Array of Detail}   same content as |objs|,
 *     but in a different order.
 *     Best hits come first, i.e. have lower array index.
 *     i.e. result[0] is the best hit.
 */
function _searchRank(searchTerm, objs) {
  assert(typeof(searchTerm) == "string", "searchTerm needed");
  assert(typeof(objs.length) == "number", "objs: need array");
  assert(objs.length == 0 || objs[0] instanceof Detail, "objs: wrong type");
  searchTerm = searchTerm.toLowerCase();
  var result = objs.slice(0); // copy

  // function(a, b) result meaning:
  // -1 = a is better than b
  // 0 = same
  // 1 = b is better than a

  // 1. longer description means more important object
  result.sort(function(a, b) {
    try {
      var al = a.descr ? a.descr.length || 0 : 0;
      var bl = b.descr ? b.descr.length || 0 : 0;
      return bl - al; // higher length is better
    } catch (e) { console.log(e); return 0; }
  });

  // 2. the earlier the search term appears in descr, the better
  result.sort(function(a, b) {
    try {
      var ai = a.descr ? a.descr.toLowerCase().indexOf(searchTerm) : -1;
      var bi = b.descr ? b.descr.toLowerCase().indexOf(searchTerm) : -1;
      if (ai >= 0 && bi >= 0) { // in both a.name and b.name. where earlier?
        return ai - bi; // lower index is better
      } else if (ai >= 0) { // in a.name, but not b.name
        return -1;
      } else if (bi >= 0) {
        return 1;
      } else { // search term appears in name of neither a nor b
        return 0;
      }
    } catch (e) { console.log(e); return 0; }
  });

  // 3. if it appears in other names or role, that's better than in descr.
  result.sort(function(a, b) {
    try {
      // search in name
      var aName = _hasName(a, searchTerm);
      var bName = _hasName(b, searchTerm);
      if (aName && bName) {
        return 0;
      } else if (aName) { // in a, but not b
        return -1;
      } else if (bName) {
        return 1;
      } else { // neither
        return 0;
      }
    } catch (e) { console.log(e); return 0; }
  });

  // 4. the earlier the search term appears in name, the better
  // 4b. if it appears in name, that's better than in descr.
  result.sort(function(a, b) {
    try {
      // search in name
      var ai = a.name ? a.name.toLowerCase().indexOf(searchTerm) : -1;
      var bi = b.name ? b.name.toLowerCase().indexOf(searchTerm) : -1;
      if (ai >= 0 && bi >= 0) { // in both a.name and b.name. where earlier?
        return ai - bi; // lower index is better
      } else if (ai >= 0) { // in a.name, but not b.name
        return -1;
      } else if (bi >= 0) {
        return 1;
      } else { // search term appears in name of neither a nor b
        return 0;
      }
    } catch (e) { console.log(e); return 0; }
  });

  // 5. If the name is identical to the search term, that's best
  result.sort(function(a, b) {
    try {
      if (a.name.toLowerCase() == searchTerm) {
        return -1;
      } else if (b.name.toLowerCase() == searchTerm) {
        return 1;
      } else {
        return 0;
      }
    } catch (e) { console.log(e); return 0; }
  });

  return result;
}
