import { AppBase } from './AppBase.js';
import { Intent } from './Intent.js';
import { DataType, EnumDataType, ListDataType } from './DataType.js';
import { assert, loadJSONFile } from '../util.js';

/**
 * Reads intents and commands from a JSON file.
 * Including variables, their types and possible values.
 */
export class JSONApp extends AppBase {
  /**
   * @param id {string} App ID
   * @param directory {string} path (relative from project root dir)
   *   where the JSON files are. Their names must be "intents.<lang>.json",
   *   whereas lang is a 2-digit ISO language code, e.g. "en" or "de".
   */
  constructor(id, directory) {
    super(id);
    assert(directory && typeof(directory) == "string");
    if (!directory.endsWith("/")) {
      directory += "/";
    }
    if (!directory.startsWith(".")) {
      directory = "./" + directory;
    }
    this.directory = directory;
  }

  /**
   * @param lang {string} 2-digit ISO language code
   */
  async load(lang) {
    await super.load(lang);
    await this._loadIntentsFile(lang);
  }

  async _loadIntentsFile(lang) {
    console.info("Loading from " + this.directory + "intents." + lang + ".json");
    let json = loadJSONFile(this.directory + "intents." + lang + ".json");
    assert(json);
    json = json.interactionModel.languageModel;
    //this.id = json.invocationName;
    for (let typeJSON of array(json.types)) {
      await this._loadDataType(typeJSON);
    }
    for (let intentJSON of array(json.intents)) {
      await this._loadIntent(intentJSON);
    }
  }

  async _loadIntent(intentJSON) {
    let id = this._typeID(intentJSON.name);
    let intent = new Intent(this, id);
    for (let parameterJSON of array(intentJSON.slots)) {
      let id = parameterJSON.name;
      let type = this.dataTypes[this._typeID(parameterJSON.type)];
      if (!type) {
        console.error("Unknown type " + parameterJSON.type); // TODO built-in types
        continue;
      }
      intent.addParameter(id, type);
    }
    for (let command of array(intentJSON.samples)) {
      intent.addCommand(command);
    }
    this.intents[id] = intent;
  }

  async _loadDataType(typeJSON) {
    let id = this._typeID(typeJSON.name);
    let values = array(typeJSON.values);
    let type;
    if (values.length) {
      type = new EnumDataType(id);
      for (let value of values) {
        let id = value.id;
        let terms = [ value.name.value ];
        terms = terms.concat(value.name.synonyms);
        type.addValue(id, terms);
      }
    } else {
      type = new ListDataType(id);
    }
    this.dataTypes[id] = type;
  }

  _typeID(name) {
    if (name.startsWith("AMAZON.")) { // compatibility
      name.replace("AMAZON.", "Pia.");
    }
    if (name == "Pia.NUMBER") {
      name = "Pia.Number";
    }
    return name;
  }
}

function array(a) {
  if (!a) {
    return [];
  } else if (Array.isArray(a)) {
    return a;
  } else {
    throw new Error("Not an array");
  }
}
