import { AppBase } from './AppBase.js';
import { Intent } from './Intent.js';
import { DataType } from './datatype/DataType.js';
import { EnumDataType } from './datatype/EnumDataType.js';
import { ListDataType } from './datatype/ListDataType.js';
import { NamedValuesDataType } from './datatype/NamedValuesDataType.js';
import { assert, loadJSONFile } from '../util/util.js';

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
    let dataTypeName = this._typeID(typeJSON.basetype);
    let type;
    if (dataTypeName == "Pia.Enum" || !dataTypeName && values.length) {
      type = new EnumDataType(id);
      let values = array(typeJSON.values);
      assert(values.length, "Enum needs the values defined in the intents.*.json file");
      for (let value of values) {
        if (!value.name) {
          throw new Error("Enum value of enum data type " + id + " of app " + this.id + " is not correctly defined in the intents JSON file")
        }
        let terms = [ value.name.value ];
        if (value.name.synonyms && value.name.synonyms.length) {
          terms = terms.concat(value.name.synonyms);
        }
        type.addValue(value.id, terms);
      }
    } else if (dataTypeName == "Pia.List") {
      type = new ListDataType(id);
    } else if (dataTypeName == "Pia.NamedValues") {
      type = new NamedValuesDataType(id);
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
