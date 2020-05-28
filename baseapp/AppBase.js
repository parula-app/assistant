import { Intent } from './Intent.js';
import { DataType } from './datatype/DataType.js';
import { loadBuiltinTypes } from './datatype/builtin.js';
import { assert } from '../util/util.js';

/**
 * Base class for all voice apps.
 * This defines the API for apps and how the core calls the voice apps.
 *
 * Subclasses of this can implement different types of voice apps.
 */
export class AppBase {
  /**
   * @param id {string} App ID
   */
  constructor(id) {
    assert(id && typeof(id) == "string");

    /**
     * Internal ID of the app.
     *
     * {string}
     */
    this.id = id;

    /**
     * {JS obj: id {string} -> Intent}
     */
    this.intents = {};

    /**
     * {JS obj: id {string} -> DataType}
     */
    this.dataTypes = {};
  }

  /**
   * @param lang {string} 2-digit ISO language code
   */
  async load(lang) {
    assert(lang && typeof(lang) == "string" && lang.length == 2);

    loadBuiltinTypes(this, lang);
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
   *    Optional
   * @returns {string}  Sentence to speak to the end user.
   */
  getResponse(id, args) {
    throw new Error("Abstract function");
  }

  /**
   * Shortcut for @see getResponse()
   */
  tr(id, args) {
    return this.getResponse(id, args);
  }

  error(id, args) {
    let message = this.getResponse(id, args);
    return new AppError(message, id, args, false);
  }

  unexpectedError(id, args) {
    let message = this.getResponse(id, args);
    return new AppError(message, id, args, true);
  }
}

export class AppError extends Error {
  constructor(message, id, args, isBug) {
    super(message);
    this.id = id;
    this.args = args || [];
    this.doNotShow = !isBug;
  }
}
