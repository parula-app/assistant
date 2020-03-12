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
import { AppBase } from '../baseapp/AppBase.js';
import { Intent } from '../baseapp/Intent.js';
import { DataType } from '../baseapp/datatype/DataType.js';
import { assert } from '../util/util.js';

export default class IntentParser {
  constructor() {
    /**
     * {Array of app {AppBase} }
     */
    this.apps = [];

    /**
     * "{name}" removed
     * E.g. "Play  from  " for "Play {Song} from {Artist}"
     * {Map command {string} -> { Intent } }
     */
    this.commandsWithoutPlaceholders = new Map();
    /**
     * {Array of command {string} }
     */
    this.commandsWithoutPlaceholdersFlat = [];
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
    const kCommandMaxLength = 10;
    const kPlaceholder = "";

    for (let intent of Object.values(app.intents)) {
      //console.log("Command for intent " + intent.id + ":");
      for (let command of intent.commands) {
        let withoutPlaceholders = command.replace(/{[a-zA-Z0-9]+}/g, kPlaceholder);
        if (withoutPlaceholders.length >= kCommandMinLength) {
          this.commandsWithoutPlaceholders.set(withoutPlaceholders, { intent, command });
        }
        this.commandsWithoutPlaceholdersFlat.push(withoutPlaceholders);
      }
    }
  }

  /**
   * @param inputText {string}  What the user said. Coming from speech recognition.
   * @returns {string} What we will respond to the user. Going to speech synthensis.
   */
  async startApp(inputText) {
    const startTime = new Date();
    let commandWithout = didYouMean2(inputText, this.commandsWithoutPlaceholdersFlat, { threshold: 0.1 });
    if (!commandWithout) {
      return "I did not understand you";
    }
    console.log("did you mean command: ", commandWithout);
    console.log("string matching took", (new Date() - startTime) + "ms");
    let { intent, command } = this.commandsWithoutPlaceholders.get(commandWithout);
    let app = intent.app;
    console.log("app", app.id, "command with placeholders:", command);

    // process variables
    let args = getVariables(inputText, command, intent);
    for (let name in args) {
      let dataType = intent.parameters[name];
      if (dataType.finite) {
        // normalize to allowed values
        args[name] = matchVariable(args[name], dataType.terms);
      }
      args[name] = dataType.valueIDForTerm(args[name]);
    }

    try {
      // Start the app
      return await intent.run(args);
    } catch (ex) { // Exceptions should be caught by intent. This is a fallback.
      console.error(ex);
      return ex.message || ex;
    }
  }
}

/**
  * This is a simplistic attempt at matching the input string
  * with its variables with the expected command string and its placeholders.
  * HACK TODO Instead, need levenshtein with wildcards.
  */
function getVariables(inputText, command, intent) {
  let args = {};
  let inputWords = inputText.split(" ");
  let commandWords = command.split(" ");
  let iCommand = 0;
  for (let inputWord of inputWords) {
    let commandWord = commandWords[iCommand];
    if (commandWord[0] == "{") {
      // This is a placeholder
      let argName = commandWord.substr(1, commandWord.length - 2);
      console.log("detected variable:", argName, "=", inputWord);
      if (args[argName]) {
        args[argName] += inputWord;
      } else {
        args[argName] = inputWord;
      }
      iCommand++;
    } else if (didYouMean2(inputWord, [ commandWord ])) {
      // Word is part of the static command
      console.log("detected command word:", inputWord, "=", commandWord);
      iCommand++;
    } else if (didYouMean2(inputWord, [ commandWords[iCommand + 1] ])) {
      // Already next command word. Maybe there are superflous words in the sample command.
      console.log("detected command word:", inputWord, "=", commandWords[iCommand + 1], ", while skipping:", commandWord);
      iCommand++; // skip the superflous command word
      iCommand++;
    } else { // neither placeholder nor detected command word
      console.log("skipping input word:", inputWord);
      // Superflous word in input, e.g. "could you". Just skip it.
    }
  }
  return args;
}

/**
* @param inputText {string} user input, only the part for this variable
* @param validValues {Array of string}
* @returns {string} one line from validValues, the closest match
*/
function matchVariable(inputText, validValues) {
  if (!validValues) {
    return inputText;
  }
  //let similarity = stringSimilarity.findBestMatch(inputText, validValues).bestMatch.target;
  //console.log("stringSimilarity:", similarity);
  const startTime = new Date();
  let match = didYouMean2(inputText, validValues);
  console.log("did you mean:", match);
  console.log("string matching took", (new Date() - startTime) + "ms");
  if (!match) {
    return inputText; // or throw?
  }
  return match;
}
