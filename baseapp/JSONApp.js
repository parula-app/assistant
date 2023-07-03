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
   * @param directory {string} (Optional) path (relative from project root dir)
   *   where the JSON files are. Their names must be "intents.<lang>.json",
   *   whereas lang is a 2-digit ISO language code, e.g. "en" or "de".
   *   If null, defaults to ./app/<id>/
   */
  constructor(id, directory) {
    super(id);
    if (directory) {
      assert(typeof(directory) == "string");
      if (!directory.endsWith("/")) {
        directory += "/";
      }
      if (!directory.startsWith(".")) {
        directory = "./" + directory;
      }
    } else {
      directory = "./app/" + id + "/";
    }
    this.directory = directory;
    this.dataDir = "./data/" + id + "/";

    /**
     * Sentence may be either a string or an Array of strings.
     * The array contains alternative sentences with the same meaning.
     *
     * {Object Map ID {string} -> sentence {string or Array of string}}
     */
    this._responses = {};
  }

  /**
   * @param lang {string} 2-digit ISO language code
   */
  async load(lang) {
    await super.load(lang);
    await this._loadIntentsFile(lang);
  }

  async _loadIntentsFile(lang) {
    let filename = this.directory + "intents." + lang + ".json";
    console.info("Loading from " + filename);
    let json = loadJSONFile(filename);
    assert(json);
    this.loadIntentsJSON(json, lang);
  }

  loadIntentsJSON(json, lang) {
    json = json.interactionModel.languageModel;
    //this.id = json.invocationName;
    for (let typeJSON of array(json.types)) {
      this._loadDataType(typeJSON);
    }
    for (let intentJSON of array(json.intents)) {
      this._loadIntent(intentJSON);
    }
    this._responses = json.responses;
  }

  _loadIntent(intentJSON) {
    let id = this._typeID(intentJSON.name);
    let intent = new Intent(this, id);
    for (let parameterJSON of array(intentJSON.slots)) {
      let id = parameterJSON.name;
      assert(parameterJSON.type, "slot type is missing");
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

  _loadDataType(typeJSON) {
    let id = this._typeID(typeJSON.name);
    let dataTypeName = this._typeID(typeJSON.basetype || "Pia.Enum");
    let type;
    if (dataTypeName == "Pia.Enum") {
      type = new EnumDataType(id);
      let values = array(typeJSON.values);
      assert(values.length, "Enum needs the values defined in the intents.*.json file");
      for (let value of values) {
        if (!value.name) {
          throw new Error("Enum value of enum data type " + id + " of app " + this.id + " is not correctly defined in the intents JSON file")
        }
        let terms = [ value.name.value ];
        if (value.name.synonyms && value.name.synonyms.length) {
          for (let synonym of value.name.synonyms) {
            terms = terms.concat(Intent.expandAlternatives(synonym));
          }
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

  /**
   * Translates the response into the user language.
   * Uses the ID to look up the response in the user's language,
   * replaces the placeholders with the values you supply,
   * and returns the sentence for the end user.
   *
   * @param id {string} ID of the response string.
   * @param args {Object Map} Values for the placeholders in the string.
   *    E.g. translated string "We are %place%" with args `{ place: "home" }`
   *    will return "We are home".
   * @returns {string}  Sentence to speak to the end user.
   */
  getResponse(id, args) {
    args = args || [];
    let response = this._responses[id];
    if (!response) {
      console.error("DEVELOPER: Missing string for ID " + id);
      return id;
    }
    if (Array.isArray(response)) {
      // Pick a random response from the alternatives
      response = response[Math.floor(Math.random() * response.length)];
    }
    // Replace placeholders
    for (let name in args) {
      let value = args[name];
      if (Array.isArray(value)) {
        value = value.join(", ");
      }
      response = response.replace("%" + name + "%", value);
    }
    return response;
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
