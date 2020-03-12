// freedata
function loadMainDB(lang, successCallback, errorCallback) {
  new LoadNativeJSON().loadFromURL(dataURL("mine.json", lang), function(storage) {
    storage.cache.crossref = new LoadCrossrefJSON(new RAMStorage());
    successCallback(storage);
  }, errorCallback);
}
