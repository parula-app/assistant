import { Client } from "./Client.js";
import { Context } from "../intentParser/Context.js";
import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

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
    this._userSettings = null;
    this._userData = null;

    setInterval(() => this._removeOldContext(), 60 * 1000); // every minute
  }

  async load() {
    this._userSettings = JSON.parse(await readFileAsync("./userSettings.json"));
    this._userSettingsSaved = JSON.stringify(this._userSettings);
  }

  async save() {
    let cur = JSON.stringify(this._userSettings);
    if (cur != this._userSettingsSaved) {
      await writeFileAsync("./userSettings.json", JSON.stringify(this._userSettings, null, 2));
    }
  }

  /**
   * @param intent {Intent}
   * @param args {Obj map parameterName {string} -> value {any}}
   */
  newCommand(intent, args) {
    this._sentences = [];
    this._context.push(new Context(intent, args));
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
   * Temporary session data for this user interaction.
   * Will not be saved to disk.
   *
   * @returns {Map}
   */
  get userSession() {
    return this._userSession;
  }

  /**
   * Configuration information for this user:
   * Setup, credentials, settings, preferences.
   *
   * This must be small.
   *
   * @returns {Map}
   */
  get userSettings() {
    setTimeout(() => this.save, 10000); // 10s TODO HACK
    return this._userSettings;
  }

  /**
   * Data that the user generates during normal usage.
   *
   * @returns {Map}
   */
  get userData() {
    return this._userData;
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
