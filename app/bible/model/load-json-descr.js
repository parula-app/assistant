import { loadURL } from "../util/util.js";
import { RAMStorage } from "../model/storage.js";

/**
 * Merges the descr from a JSON file into the objs.
 *
 * This allows to keep the DB file small,
 * by keeping the descr in a separate file.
 *
 * @param storate {Storage}   Adds descriptions to this DB
 * @param url {URL as string}   File content: JSON { ID : descr, ...}, e.g.
 * { "@I00003" : "At the....", "@I0004" : "He was..." }
 */
export async function mergeDescrFromJSONFile(storage, url) {
  var json = await loadURL(url, "json");
  await storage.iterate(obj => {
    let descr = json[obj.id];
    if (descr && !obj.descr) {
      obj.descr = descr;
    }
  });
}

/**
 * Creates a JSON file populated with the descr of the objs.
 *
 * This effectively filters the original insight book to only those entries
 * that we have in the DB and that we could match.
 *
 * Format { ID : descr, ...}, e.g.
 * { "@I00003" : "At the....", "@I0004" : "He was..." }
 *
 * @param storage {Storage}
 * @returns {JSON as String}
 */
export async function exportDescrToJSON(storage) {
  var json = {};
  await storage.iterate(obj => {
    if (obj.descr) {
      json[obj.id] = obj.descr;
    }
  });
  return JSON.stringify(json, null, " ");
}


/**
 * Merges the descr from a JSON file into the objs.
 *
 * This allows to keep the DB file small,
 * by keeping the descr in a separate file.
 *
 * @param targetStorage {Storage}   Objects to be enhanced.
 *     They will be modified in-place.
 * @param sourceStorage {Storage}   Objects to be added
 * @returns {Array of Objects}   Objects that have been added
 *
 */
export async function mergeAdditionalObjects(targetStorage, sourceStorage) {
  var sourceObjects = [];
  await sourceStorage.iterate(detail => {
    sourceObjects.push(detail);
    let existingDetail = targetStorage.getID(detail.id);
    if (existingDetail) {
      // add new descr to existing obj
      if (detail.descr && !existingDetail.descr) {
        existingDetail.descr = detail.descr;
      }
    } else {
      targetStorage.add(detail);
    }
    let sourceRelations = detail.relations;
    detail.relations = [];
    sourceRelations.forEach(sourceRel => {
      let subj = existingDetail || detail;
      let obj = targetStorage.getID(sourceRel.obj.id) || sourceRel.obj;
      let rel = subj.addRelation(obj, sourceRel.type);
      //rel.opposite().add();
    });
  });
  return sourceObjects;
}
