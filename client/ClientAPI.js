import { Client } from "./Client.js";
import { AppBase } from "../baseapp/AppBase.js";
import { Intent } from "../baseapp/Intent.js";

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
     * {AppBase}
     */
    this._currentMediaPlayer = null;

    /**
     * Output that the app returned using `say()`
     *
     * {Array of String} Human-readable output
     *    in the user's language.
     *    Will be returned to the user as speech and/or text.
     *    The array content will be concatenated.
     */
    this._sentences = [];

    setInterval(() => this._removeOldContext(), 60 * 1000); // every minute
  }

  /**
   * @param intent {Intent}
   * @param args {Map of Object}
   */
  newCommand(intent, args) {
    this._sentences = [];
    this._context.push(new Context(intent, args));

    if (typeof(intent.app.volume) == "function") {
      this._setCurrentMediaPlayer(intent.app);
    }
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
   */
  get context() {
    return this._context().slice();
  }

  /**
   * The current or last media playing app.
   * Allows to control playback (stop, pause, skip etc.)
   * and volume.
   *
   * The app needs to implement standard intents like
   * - Pia.Stop
   * - Pia.Volume
   * - Pia.RelativeVolume
   * and optionally
   * - Pia.Pause
   * - Pia.Resume
   * - Pia.Next
   * - Pia.Previous
   * The client can then offer a standard user interface
   * (by voice or GUI) that allows to control playback.
   *
   * @returns {AppBase}
   */
  get currentMediaPlayer() {
    return this._currentMediaPlayer;
  }

  /**
   * The app that is currently playing audio or video files.
   */
  _setCurrentMediaPlayer(app) {
    assert(app instanceof AppBase);
    assert(typeof(app.stop) == "function");
    assert(typeof(app.volume) == "function");
    assert(typeof(app.relativeVolume) == "function");
    this._currentMediaPlayer = app;
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

/**
 * @see ClientAPI.context
 */
class Context {
  /**
   * @param intent {Intent}
   * @param args {Map of Object}
   */
  constructor(intent, args) {
    assert(intent instanceof Intent);
    this._intent = intent;
    this._args = args;
    this._startTime = new Date();
    this._objects = null;
  }

  /**
   * @returns {Intent}
   */
  get intent() {
    return this._intent;
  }

  /**
   * @returns {Map of Object}
   */
  get args() {
    return this._args;
  }

  /**
   * When this command was started.
   * @returns {Date}
   */
  get startTime() {
    return this._startTime;
  }

  /**
   * Additional objects that the app intent wants to store.
   *
   * @returns {Array of Object}
   */
  get objects() {
    return this._objects || [];
  }

  /**
   * To be used by app intent.
   *
   * @param obj {Object}
   */
  addObject(obj) {
    if (!this._objects) {
      this._objects = [];
    }
    this._objects.push(obj);
  }
}
