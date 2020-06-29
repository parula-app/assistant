/**
 * Intent parser
 *
 * Accepts a string from speech input,
 * and selects the right app, command and variables,
 * based on the valid input possibilities of each app.
 */

import { AppBase } from '../baseapp/AppBase.js';
import { Intent } from '../baseapp/Intent.js';
import { DataType } from '../baseapp/datatype/DataType.js';
import { ClientAPI } from '../client/ClientAPI.js';
import { matchString, matchStringWithAlternatives } from './matchString.js';
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
  async loadApps(apps) {
    for (let app of apps) {
      this.loadApp(app);
    }
  }

  /**
   * @param app {AppBase}
   */
  async loadApp(app) {
    assert(app.intents, "App has wrong type");
    this.apps.push(app);
    this.loadCommands(app);
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
    try {
      let { intent, args } = await this.match(inputText);
      return await this.startIntent(intent, args);
    } catch (ex) { // Intent had an error, or we didn't find a match
      console.error(ex);
      return ex.message || ex;
    }
  }

  /**
   * Find the Intent and variables matching the user input
   *
   * @param inputText {string}  What the user said. Coming from speech recognition.
   * @returns {
   *   intent {Intent}
   *   args {Obj map parameterName {string} -> value {any}}
   * }
   */
  async match(inputText) {
    const kMaxScore = 0.5;
    let startTime = new Date();
    let context = this.clientAPI.context;

    // Find the command candidates
    let commandMatches = matchStringWithAlternatives(inputText, this.commandsFlat);
    if (!commandMatches.length) {
      throw new IntentMatchFailed();
    }
    //console.log("command matches", commandMatches);
    let intentMatches = [];
    for (let result of commandMatches) {
      // Find the Intent
      let { intent } = this.commands.get(result.targetString);
      result.intent = intent;
      // Avoid duplicate results for the same Intent
      // find() is not efficient, but better than using Map and then converting to Array
      if (intentMatches.find(previous => previous.intent == result.intent)) {
        continue;
      }
      intentMatches.push(result);
    }

    /* Match the variables
     * Check how well the variable input matches the known values for the
     * command, and consider that in the overall score and command selection. */
    variableMatches:
    for (let result of intentMatches) {
      try {
        result.args = propertyNamesLowerCaseToOriginal(result.variables, result.intent.parameters);
        if (!Object.keys(result.intent.parameters).length) { // no params
          result.overallScore = result.score;
          continue;
        }
        let args = result.args;
        let argsScores = [];
        result.argsScores = {};
        result.overallScore = kMaxScore * 2; // for error cases
        //console.log("Checking variables for command: " + result.targetString);
        // Match each variable
        for (let name in args) {
          let dataType = result.intent.parameters[name].dataType;
          // the actual matching
          let { value, score } = dataType.valueForInput(args[name], context);
          argsScores.push(score);
          result.argsScores[name] = score;
          if (score == 1) {
            continue variableMatches;
          }
          args[name] = value;
        }

        if (!argsScores.length) {
          // There are parameters, but no arguments passed
          // TODO Make optional parameters explicit
          continue;
        }
        let sumArgs = argsScores.reduce((accumulator, current) => accumulator + current);
        // Average over the scores of command and all variables
        result.overallScore = (result.score + sumArgs) / (1 + argsScores.length);

      } catch (ex) {
        console.log(result.intent.id + " is not a match: " + (ex.message || ex));
        console.error(ex); // debug DataType implementations
        continue;
      }
    }
    console.log("Match results with variables:"); for (let result of intentMatches.sort((a, b) => (a.overallScore - b.overallScore)).slice(0, 5)) { console.log(" ", result.intent.app.id, result.intent.id, ", overall score", Math.round(result.overallScore * 100) / 100, ", command score", Math.round(result.score * 100) / 100, ", args", result.args ? Object.entries(result.args).map(([ name, value]) => name + ": " + (value.name ? value.name : value) + ", score " + result.argsScores[name] ).join(", ") : ""); }

    /* Take the best match, considering score of command and variables.
     * A strong variable match should be preferred over a good command
     * match.
     * That also allows multiple e.g. "Play" commands, e.g. "Play {Artist}"
     * and "Play {Song}" and "Play {Playlist}", and find the best variable match.
     * This works even across apps.
     * The actual calculation of overallScore and selection happened above. */
    intentMatches = intentMatches
      .sort((a, b) => (a.overallScore - b.overallScore));
    let bestMatch = intentMatches[0];
    console.log("Matching took " + (new Date() - startTime) + "ms");
    if (bestMatch.overallScore > kMaxScore) {
       // No match. Give useful error message to end user.
      for (let paramName in bestMatch.intent.parameters) {
        if (!bestMatch.args[paramName]) {
          throw new IntentMatchFailed({ param: paramName });
        }
      }
      throw new IntentMatchFailed(); // should have been caught above
    }
    return {
      intent: bestMatch.intent,
      args: bestMatch.args,
    }
  }

  /**
   * Start the Intent, i.e. call the app.
   *
   * @param intent {Intent}
   * @param args {Obj map parameterName {string} -> value {any}}
   * @returns {string} What we will respond to the user. Going to speech synthensis.
   */
  async startIntent(intent, args) {
    this.clientAPI.newCommand(intent, args);

    // Start the app
    let result = await intent.run(args, this.clientAPI);

    // Assemble output string
    let output = this.clientAPI.outputSentences.join(". ");
    if (result && typeof(result) == "string") {
      output += result;
    } else if (result && result.responseText && typeof(result.responseText) == "string") {
      output += result.responseText;
    }
    return output;
  }
}

/**
  * Restores the original casing (upper/lower case) of the property names.
  * This helps to fix up arg names, which we made lower case during matching.
  *
  * @param obj {Object} A JS object.
  *    The properties are all lower case.
  * @param originalPropertyNames {Object}
  *    An object with the same properties as `obj`, but the property names
  *    may be capitalizes, camelCase etc.
  * @returns {Object} The same properties and values as in `obj`,
  *    but the property names have the same casing (upper/lower case)
  *    as in `originalPropertyNames`.
  */
function propertyNamesLowerCaseToOriginal(obj, originalPropertyNames) {
  let restored = {};
  let orgParamsNames = Object.keys(originalPropertyNames);
  let orgParamsLower = orgParamsNames.map(a => a.toLowerCase());
  for (let nameLower in obj) {
    let nameOrg = orgParamsNames[orgParamsLower.indexOf(nameLower)];
    restored[nameOrg] = obj[nameLower];
  }
  return restored;
}

export class IntentMatchFailed extends Error {
  constructor(options) {
    let msg = "I did not understand you";
    if (options && options.param) {
      msg = "I did not understand the " + options.param;
    }
    super(msg);
    this.code = "intent-match-failed";
  }
}
