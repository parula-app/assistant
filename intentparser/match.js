/**
 * Intent parser
 *
 * Accepts a string from speech input,
 * and selects the right app, command and variables,
 * based on the valid input possibilities of each app.
 */

//import stringSimilarity from 'string-similarity';
import didYouMean from 'didyoumean2';
const didYouMean2 = didYouMean.default;
import wildLeven from './leven.js';
import { AppBase } from '../baseapp/AppBase.js';
import { Intent } from '../baseapp/Intent.js';
import { DataType } from '../baseapp/datatype/DataType.js';
import { ClientAPI } from '../client/ClientAPI.js';
import { assert } from '../util/util.js';

export default class IntentParser {
  constructor(clientAPI) {
    assert(clientAPI instanceof ClientAPI);

    /**
     * {Array of app {AppBase} }
     */
    this.apps = [];

    /**
     * {ClientAPI}
     */
    this.clientAPI = clientAPI;

    /**
     * All commands of all Intents
     * E.g. "Play {Song} from {Artist}"
     * {Map command {string} -> { intent {Intent}, command {string} (as original) } }
     */
    this.commands = new Map();
    /**
     * {Array of command {string} }
     */
    this.commandsFlat = [];
  }

  /**
   * @param apps {Array of AppBase}
   */
  async load(apps) {
    this.apps = apps;
    for (let app of apps) {
      this.loadCommands(app);
    }
  }

  loadCommands(app) {
    assert(app instanceof AppBase);

    const kCommandMinLength = 4;

    for (let intent of Object.values(app.intents)) {
      //console.log("Command for intent " + intent.id + ":");
      for (let command of intent.commands) {
        let withoutPlaceholders = command.replace(/{[a-zA-Z0-9]+}/g, "");
        if (withoutPlaceholders.length < kCommandMinLength) {
          continue;
        }
        this.commands.set(command, { intent: intent, command: command });
        this.commandsFlat.push(command);
      }
    }
  }

  /**
   * @param inputText {string}  What the user said. Coming from speech recognition.
   * @returns {string} What we will respond to the user. Going to speech synthensis.
   */
  async startApp(inputText) {
    console.log("input:", inputText);
    let result = matchVariable(inputText, this.commandsFlat);
    if (!result) {
      return "I did not understand you";
    }
    let { intent, command } = this.commands.get(result.targetString);
    let app = intent.app;
    //console.log("app", app.id, "command", command);

    let args = {};
    let argsLower = result.variables;
    // Fix up arg names, which we made lower case during matching :(
    let orgParams = Object.keys(intent.parameters);
    let orgParamsLower = orgParams.map(a => a.toLowerCase());
    for (let nameLower in argsLower) {
      let nameOrg = orgParams[orgParamsLower.indexOf(nameLower)];
      args[nameOrg] = argsLower[nameLower];
    }
    for (let name in args) {
      let dataType = intent.parameters[name];
      if (dataType.finite) {
        // normalize to allowed values
        args[name] = matchVariable(args[name], dataType.terms).targetString;
      }
      args[name] = dataType.valueIDForTerm(args[name]);
     }

    try {
      // Start the app
      return await intent.run(args, this.clientAPI);
    } catch (ex) { // Exceptions should be caught by intent. This is a fallback.
      console.error(ex);
      return ex.message || ex;
    }
  }
}

/**
* @param inputText {string} user input, only the part for this variable
* @param validValues {Array of string}
* @returns {wildLeven() result} the closest match
*/
function matchVariable(inputText, validValues) {
  if (!validValues) {
    return inputText;
  }
  inputText = inputText.toLowerCase();
  //console.log("input:", inputText);
  //let similarity = stringSimilarity.findBestMatch(inputText, validValues).bestMatch.target;
  //console.log("stringSimilarity:", similarity);
  const startTime = new Date();
  let results = validValues
    .map(targetString => {
      if (!targetString) {
        return { editDistance : inputText.length * 2 };
      }
      let result = wildLeven(inputText, targetString.toLowerCase());
      result.targetString = targetString;
      return result;
    })
    .sort((a, b) => a.editDistance - b.editDistance);
  //console.log(results.slice(0, 5));
  let match = results[0].targetString;
  console.log("did you mean:", match);
  console.log("string matching took", (new Date() - startTime) + "ms");
  if (!match) {
    return inputText; // or throw?
  }
  return results[0];
}
