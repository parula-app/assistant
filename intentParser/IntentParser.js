import { ClientAPI } from '../client/ClientAPI.js';
import { assert } from '../util/util.js';

/**
 * Intent parser
 *
 * Accepts a string from speech input,
 * and selects the right app, command and variables,
 * based on the valid input possibilities of each app.
 *
 * Abstract class
 */
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
    throw new Error("Implement");
  }

  /**
   * Start the Intent, i.e. call the app.
   *
   * @param intent {Intent}
   * @param args {Obj map parameterName {string} -> value {any}}
   * @returns {string} What we will respond to the user. Going to speech synthensis.
   */
  async startIntent(intent, args) {
    let context = this.clientAPI.newCommand(intent, args);

    // Start the app
    let result = await intent.run(args, this.clientAPI, context);

    // Broadcast the result, for UI
    context.resultText = result;
    this.clientAPI.broadcast(context);

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
