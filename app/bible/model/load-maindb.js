import { dataURL, parseURLQueryString } from "../util/util.js";
import { RAMStorage, CombinedStorage } from "../model/storage.js";
import { LoadNativeJSON } from "../model/load-json.js";
import { mergeDescrFromJSONFile, mergeAdditionalObjects } from "../model/load-json-descr.js";
import { LoadCrossrefJSON } from "../model/load-json-crossref.js";

export async function loadMainDB(lang) {
  let combinedStorage = new CombinedStorage();
  let dbStorage = new RAMStorage();
  let publicationsStorage = new RAMStorage();
  let userStorage = new RAMStorage();
  let bibleStorage = new RAMStorage();
  // order of adding matters for speed, it's the order in which objects will be checked
  combinedStorage.addStorage(dbStorage);
  combinedStorage.addStorage(publicationsStorage);
  combinedStorage.addStorage(userStorage);
  combinedStorage.setWritableStorage(userStorage);

  await new LoadNativeJSON(dbStorage, combinedStorage).loadFromURL(dataURL("mine.json", lang));
  combinedStorage.bible = bibleStorage;
  combinedStorage.crossref = new LoadCrossrefJSON(new RAMStorage());
  await mergeDescrFromJSONFile(dbStorage, dataURL("descr.json", lang));

  let jesusbURL = dataURL("jesus-book.en.json", lang);
  try {
    let jesusbStorage = new RAMStorage();
    await new LoadNativeJSON(jesusbStorage, combinedStorage).loadFromURL(jesusbURL);
    await mergeAdditionalObjects(publicationsStorage, jesusbStorage);
  } catch (ex) {
    // if jesus book is not there, just continue
  }

  await mergeAdditionalObjects(dbStorage, userStorage); // TODO separate targetStorage from globalStorage=combinedStorage

  return combinedStorage;
}
