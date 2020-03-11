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
     * Only the part before the first "{name}"
     * E.g. "Play" for "Play {Song} from {Artist}"
     * {Map command {string} -> { Intent } }
     */
    this.commandsBeforePlaceholders = new Map();
    /**
     * {Array of command {string} }
     */
    this.commandsWithoutPlaceholdersFlat = [];
    /**
     * {Array of command {string} }
     */
    this.commandsBeforePlaceholdersFlat = [];
    /**
     * Length of the longest string in `this.commandsBeforePlaceholdersFlat`
     * {Integer}
     */
    this.longestCommand = 1;
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
    const kPlaceholder = "";

    for (let intent of Object.values(app.intents)) {
      //console.log("Command for intent " + intent.id + ":");
      for (let command of intent.commands) {
        let withoutPlaceholders = command.replace(/{[a-zA-Z0-9]+}/g, kPlaceholder);
        if (withoutPlaceholders.length >= kCommandMinLength) {
          this.commandsWithoutPlaceholders.set(withoutPlaceholders, intent);
        }
        this.commandsWithoutPlaceholdersFlat.push(withoutPlaceholders);
        let beforePlaceholders = command.replace(/{.*/, "");
        if (beforePlaceholders.length >= kCommandMinLength) {
          this.commandsBeforePlaceholders.set(beforePlaceholders, intent);
          this.commandsWithoutPlaceholdersFlat.push(beforePlaceholders);
          if (beforePlaceholders.length > this.longestCommand) {
            this.longestCommand = beforePlaceholders.length;
          }
        }
        //console.log("  " + command, "=", withoutPlaceholders, "=", beforePlaceholders);
      }
    }
  }

  /**
   * @param inputText {string}  What the user said. Coming from speech recognition.
   * @returns {string} What we will respond to the user. Going to speech synthensis.
   */
  async startApp(inputText) {
    let inputBeforeCommand = inputText.substr(0, this.longestCommand); // HACK
    let beforeCommand = didYouMean2(inputBeforeCommand, this.commandsBeforePlaceholdersFlat, { threshold: 0.01 });
    console.log("did you mean command (before): ", beforeCommand);

    const startTime = new Date();
    let command = didYouMean2(inputText, this.commandsWithoutPlaceholdersFlat, { threshold: 0.1 });
    if (!command) {
      return "I did not understand you";
    }
    console.log("did you mean command: ", command);
    console.log("string matching took", (new Date() - startTime) + "ms");
    let intent = this.commandsWithoutPlaceholders.get(command);
    let app = intent.app;

    let args = {
      song: inputText, // TODO only the variable text
    }
    for (let name in args) {
      let validValues = await app.validVariableValues(name);
      args[name] = matchVariable(args[name], validValues);
    }

    try {
      // Start the app
      return await intent.run(args);
    } catch (ex) { // Exceptions should be caught by intent. This is a fallback.
      return ex.message || ex;
    }
  }

  getVariables(inputText, command, intent) {
    // cut common start string

  }

  /**
  * @param inputText {string} user input, only the part for this variable
  * @param validValues {Array of string}
  * @returns {string} one line from validValues, the closest match
  */
  matchVariable(inputText, validValues) {
    if (!validValues) {
      return inputText;
    }
    //let similarity = stringSimilarity.findBestMatch(inputText, validValues).bestMatch.target;
    //console.log("stringSimilarity:", similarity);
    const startTime = new Date();
    let match = didYouMean2(inputText, validValues);
    console.log("did you mean:", match);
    console.log("string matching took", (new Date() - startTime) + "ms");
    return match;
  }
}



/*
async function loadValidInputFromFile(args) {
  if (!args['valid_input']) {
    return;
  }
  let startTime = new Date();
  console.info('Loading valid input from file %s', args['valid_input']);
  validInput = fs.readFileSync(args['valid_input'], 'utf8').split('\n');
  console.info('Read %d lines in %dms', validInput.length, new Date() - startTime);
}
  parser.addArgument(['--valid_input'], {help: 'File with all possible inputs, one per line. The recognition result text will be one line from this file.', nargs: '?'});
*/
