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
    let { intent, args } = await this.match(inputText);
    return await this.startIntent(intent, args);
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

    // Find the command candidates
    let commandMatches = matchStringWithAlternatives(inputText, this.commandsFlat);
    if (!commandMatches.length) {
      throw new Error("I did not understand you");
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
        if (!Object.keys(result.intent.parameters).length) { // no params
          result.overallScore = result.score;
          continue;
        }
        let args = result.args = {};
        let argsScores = result.argsScores = [];
        result.overallScore = kMaxScore * 2; // for error cases
        //console.log("Checking variables for command: " + result.targetString);
        // Fix up arg names, which we made lower case during matching :(
        let argsLower = result.variables;
        let orgParams = Object.keys(result.intent.parameters);
        let orgParamsLower = orgParams.map(a => a.toLowerCase());
        for (let nameLower in argsLower) {
          let nameOrg = orgParams[orgParamsLower.indexOf(nameLower)];
          args[nameOrg] = argsLower[nameLower];
        }
        // Match each variable
        for (let name in args) {
          let dataType = result.intent.parameters[name];
          // the actual matching
          let { value, score } = dataType.valueForInput(args[name]);
          argsScores.push(score);
          if (score == 1) {
            break variableMatches;
          }
          args[name] = value;
        }

        let sumArgs = argsScores.reduce((accumulator, current) => accumulator + current);
        // Average over the scores of command and all variables
        result.overallScore = (result.score + sumArgs) / (1 + argsScores.length);

      } catch (ex) {
        console.log(result.intent.id + " is not a match: " + (ex.message || ex));
        //console.error(ex);
        continue;
      }
    }
    console.log("Match results with variables:"); for (let match of intentMatches.sort((a, b) => (a.overallScore - b.overallScore))) { console.log(" ", match.intent.app.id, match.intent.id, ", command score", Math.round(match.score * 100) / 100, ", overall score", Math.round(match.overallScore * 100) / 100, ", args", match.args, match.argsScores); }

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
          throw new Error("I did not understand the " + paramName);
        }
      }
      throw new Error("I did not understand you"); // should have been caught above
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
    try {
      this.clientAPI.newCommand(intent, args);
      // Start the app
      let output = await intent.run(args, this.clientAPI);
      return (output ? output : "") + this.clientAPI.outputSentences.join(". ");
    } catch (ex) { // Exceptions should be caught by intent. This is a fallback.
      console.error(ex);
      return ex.message || ex;
    }
  }
}
