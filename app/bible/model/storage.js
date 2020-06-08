import { assert, runAsync } from "../util/util.js";
import { Detail } from "../model/model.js";

export class Storage {
  constructor(lang) {
    assert(lang && typeof(lang) == "string" && lang.length == 2, "Need language");
    this.lang = lang;
  }

  /**
   * Find the Detail (Person, Event etc.) with this ID.
   * This is typically used when it was referenced by another object.
   *
   * @param id { String } IDs of a detail that you're looking for
   * @returns { Detail }
   *    May be null (if not found)
   */
  getID(id) {
    throw "abstract function, please subclass";
  }

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
  getIDs(ids) {
    var result = [];
    for (let id of ids) {
      let obj = this.getID(id);
      if (obj) {
        result.push(obj);
      }
    }
    return result;
  }

  /**
   * Searches for an object that contains |text| in the name.
   * Case is ignored. Partial matches are included.
   * E.g "ab" finds "Abraham".
   *
   * @param text { String }
   * @param type { subtype of Detail } e.g. |Person|, |Event| etc.
   *     or |null| for any type
   * @returns { Array of Detail }   Search result. May be empty.
   */
  async searchName(text) {
    text = text.toLowerCase();
    var result = [];
    await this.iterate(obj => { // each
      if (_hasName(obj, text)) {
        result.push(obj);
      }
    });
    return _searchRank(text, result);
  }

  /**
   * Searches for an object that contains |text| in name or description etc.
   *
   * Case is ignored. Partial matches are included.
   *
   * @param text { String }
   * @returns { Array of Detail }   Search result. May be empty.
   */
  async searchFulltext(text) {
    text = text.toLowerCase();
    var result = [];
    await this.iterate(obj => { // each
      if (_hasName(obj, text) ||
          obj.descr && obj.descr.toLowerCase().indexOf(text) >= 0) {
        result.push(obj);
      }
    });
    return _searchRank(text, result);
  }

  /**
   * Return all objects.
   *
   * @param type { subtype of Detail }   only objects of this type
   *     E.g. |Person|, |Event| etc.
   *     |null| for all types
   * @returns { Array of Detail }
   */
  async getAll(type) {
    assert( !type || typeof(type) == "function", "type parameter missing");
    var result = [];
    await this.iterate(obj => { // each
      if ( !type || obj instanceof type) {
        result.push(obj);
      }
    });
    return result;
  }

  /**
   * @param eachCallback {Function(obj {Detail})}   called for each
   *     object in the store.
   */
  async iterate(eachCallback) {
    throw "abstract function, please subclass";
  }

  /**
   * Add this detail (Person, Event etc.) to the storage
   * @param detail {Detail}
   */
  add(detail) {
    throw "abstract function, please subclass";
  }

  /**
   * Delete this detail (Person, Event etc.) from the storage
   * @param detail {Detail}
   */
  remove(detail) {
    throw "abstract function, please subclass";
  }

  /**
   * Helper function for add() implementation.
   * Call before adding to storage.
   */
  _add(obj) {
    assert(obj instanceof Detail);
    this._generateID(obj);
    assert(obj.id, "need ID");
  }

  /**
   * Helper function for remove() implementation
   * Call before removing from storage.
   * But usually no need to await it.
   */
  async _remove(obj) {
    assert(obj instanceof Detail);
    assert(obj.id, "need ID");

    obj.remove(); // remove relations

    // to be sure, check all objects whether there are still
    // relations to the removed obj.
    await this.iterate(otherObj => { // each
      otherObj.relations = otherObj.relations.filter(function(rel) {
        return rel.obj != obj && rel.subj != obj;
      });
    });
  }

  _generateID(detail) {
    while ( !detail.id) {
      let id = detail.typename + "-" + (++Storage._lastID);
      if ( !this.getID(id)) {
        detail.id = id;
      }
    }
  }
}
Storage._lastID = 0;


/**
 * This keeps all Details as JS objects in RAM.
 */
export class RAMStorage extends Storage {
  constructor(lang) {
    super(lang);

    /**
     * { Map of ID -> Detail }
     */
    this._objects = {};
  }

  getID(id) {
    return this._objects[id.toString()];
  }
  async iterate(eachCallback) {
    await runAsync();
    for (let id in this._objects) {
      eachCallback(this._objects[id]);
    }
  }
  add(obj) {
    this._add(obj);
    this._objects[obj.id] = obj;
  }
  remove(obj) {
    this._remove(obj);
    delete this._objects[obj.id];
  }
}


/**
 * This keeps all Details as JS objects in the browser's localStorage
 * persistant store.
 *
 * @param prefix {String}   ID prefix for keys in localStorage.
 */
export class LocalStorage extends Storage {
  constructor(prefix) {
    assert(prefix && typeof(prefix) == "string");
    super();
    this._prefix = prefix + "-";
    this._store = window.localStorage;
  }

  getID(id) {
    return this._store.getItem(this._prefix + id.toString());
  }
  add(obj) {
    this._add(obj);
    this._store.setItem(this._prefix + obj.id, obj);
  }
  remove(obj) {
    this._remove(obj);
    this._store.removeKey(this._prefix + obj.id);
  }
}

/**
 * Merges several storages and finds the items in
 * any of the underlying storages.
 * They are checked in order.
 *
 * Delegator design pattern
 */
export class CombinedStorage extends Storage {
  constructor(lang) {
    super(lang);

    /**
     * Where to read objects from
     * {Array of Storage}
     */
    this._storages = [];

    /**
     * Where to write objects to.
     * You should probably also add it to |addStorages()|.
     * {Storage}
     */
    this._writeStorage = null;
  }

  /**
   * Add an underlying storage to check items in
   * @param storage {Storage}
   */
  addStorage(storage) {
    assert(storage instanceof Storage);
    this._storages.push(storage);
  }

  /**
   * Which storage new objects should be written to.
   * Note that modifications to the existing objects,
   * e.g. added relations, will not be automatically added here.
   * @see |this.write|
   *
   * You should probably also add this storage via |addStorages()|.
   *
   * @param storage {Storage}
   */
  setWritableStorage(storage) {
    assert(storage instanceof Storage);
    this._writeStorage = storage;
  }

  /**
   * Get the writable storage.
   * This is useful to add existing objects which have been
   * modified or relations added.
   * @param storage {Storage}
   */
  get write() {
    return this._writeStorage;
  }

  getID(id) {
    let userObj = this.write.getID(id);
    for (let storage of this._storages) {
      let obj = storage.getID(id);
      if (obj) {
        /*if (userObj) {
          return mergeObj(obj, userObj);
        }*/
        return obj;
      }
    }
    return userObj || null;
  }

  async iterate(eachCallback) {
    for (let storage of this._storages) {
      await storage.iterate(eachCallback);
    }
  }

  add(obj) {
    this.write.add(obj);
  }
  remove(obj) {
    this.write.remove(obj);
  }
}


/**
 * @param obj {Detail}
 * @param name {String}
 *     already lower case
 */
function _hasName(obj, name) {
  return
    (obj.name && obj.name.toLowerCase().indexOf(name) >= 0) ||
    (obj.role && obj.role.toLowerCase().indexOf(name) >= 0) ||
    (obj.otherNames &&
      obj.otherNames.some(otherName =>
        otherName.toLowerCase().indexOf(name) >= 0
      ));
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
  result.sort((a, b) => {
    try {
      let al = a.descr ? a.descr.length || 0 : 0;
      let bl = b.descr ? b.descr.length || 0 : 0;
      return bl - al; // higher length is better
    } catch (e) { console.log(e); return 0; }
  });

  // 2. the earlier the search term appears in descr, the better
  result.sort((a, b) => {
    try {
      let ai = a.descr ? a.descr.toLowerCase().indexOf(searchTerm) : -1;
      let bi = b.descr ? b.descr.toLowerCase().indexOf(searchTerm) : -1;
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
  result.sort((a, b) => {
    try {
      // search in name
      let aName = _hasName(a, searchTerm);
      let bName = _hasName(b, searchTerm);
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
  result.sort((a, b) => {
    try {
      // search in name
      let ai = a.name ? a.name.toLowerCase().indexOf(searchTerm) : -1;
      let bi = b.name ? b.name.toLowerCase().indexOf(searchTerm) : -1;
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
  result.sort((a, b) => {
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
