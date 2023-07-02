import { Client } from "./Client.js";
import { Context } from "../intentParser/Context.js";
import { assert } from '../util/util.js';

/**
 * The API for the `client` object that gets passed to the voice app.
 *
 * It exposes only selected functions of the client.
 * The voice app should not be able to call exit() :-) .
 */
export class ClientAPI {
  /**
   * @param client {Client}
   */
  constructor(client) {
    assert(client instanceof Client);
    this.client = client;

    /**
     * @see context() getter
     * {Array of Context}
     */
    this._context = [];

    /**
     * Output that the app returned using `say()`
     *
     * {Array of String} Human-readable output
     *    in the user's language.
     *    Will be returned to the user as speech and/or text.
     *    The array content will be concatenated.
     */
    this._sentences = [];

    this._userSession = new Map();

    setInterval(() => this._removeOldContext(), 60 * 1000); // every minute
  }

  /**
   * @param intent {Intent}
   * @param args {Obj map parameterName {string} -> value {any}}
   * @returns {Context}
   */
  newCommand(intent, args) {
    this._sentences = [];
    let context = new Context(intent, args);
    this._context.push(context);
    return context;
  }

  /**
   * The language of the current user session.
   * The voice app should translate all responses into this language.
   * @returns {string} 2-letter ISO language code
   */
  get lang() {
    return this.client.lang;
  }

  /**
   * The previous intents that ran and the current one.
   * This allows the intent parser and intents to look back
   * and consider the context of the conversation.
   *
   * For example, this allows to resolve pronouns like
   * "it", "there" etc. to be included in commands.
   *
   * It also allows playlist control to call the right app.
   *
   * @returns {Array of Context}
   *   Ordered by increasing time, i.e. most recent command is last entry in array.
   */
  get context() {
    return this._context.slice(); // protects from modifications, but slow
  }

  /**
   * @returns {Context}
   */
  get currentContext() {
    return this._context[this._context.length - 1];
  }

  /**
   * Temporary session data for this user interaction.
   * Will not be saved to disk.
   *
   * @returns {Map}
   */
  get userSession() {
    return this._userSession;
  }

  /**
   * Output that the app returned using `say()`
   */
  get outputSentences() {
    return this._sentences.slice();
  }

  /**
   * Output a specific text to the user
   * @param outputText {string} text for the end user,
   *   translated into language `this.lang`.
   */
  say(outputText) {
    // remove <ssml> tags
    outputText = outputText.replace(/<[^>]*>/g, " ").replace(/ +/g, " ").trim();
    //this._sentences.push(outputText);
    for (let sentence of outputText.split(". ")) { // TODO "2."
      this._sentences.push(sentence);
    }
  }

  card(card) {
    if (card.type == "simple") {
      console.log("\n  " + card.title + "\n\n" + card.content + "\n");
    } else {
      console.log(card);
    }
  }

  /**
   * The result of the Intent.
   * This allows subsequent commands to use the
   * result of the Intent as input.
   * Call this when you have additional data
   * that is produced by processing the input.
   *
   * Must not repeat the input,
   * i.e. the objects in the Intent `args` are not repeated here.
   * Returning the data in a different data type is legit, though,
   *
   * @param result {any}
   * @param dataType {DataType}
   */
  addResult(result, dataType) {
    this.currentContext.addResult(result, dataType);
  }

  /**
   * @returns {Player}
   */
  get player() {
    return this.client.player;
  }

  /**
   * Remove all context that is more than N minutes old
   * and therefore no longer relevant to the current discussion.
   *
   * Internal function. Called regularly, every minute.
   */
  _removeOldContext() {
    if (!this._context.length) {
      return;
    }
    const maxAgeMins = 30; // minutes
    let earliest = new Date();
    earliest.setMinutes(earliest.getMinutes - maxAgeMins);
    while (this._context.length && this._context[0].startTime < earliest) {
      this._context.shift();
    }
  }
}
