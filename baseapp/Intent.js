import { AppBase } from './AppBase.js';
import { DataType } from './datatype/DataType.js';
import { assert } from '../util/util.js';

export class Intent {
  /**
   * @param app {AppBase}
   * @param id {string}
   */
  constructor(app, id) {
    assert(app instanceof AppBase);
    assert(id && typeof(id) == "string");

    /**
     * The app which implements this intent.
     * {AppBase}
     */
    this.app = app;

    /**
     * Internal ID of the Intent.
     *
     * Translates to the function name,
     * e.g. ID "PlaySong" invokes function playSong().
     *
     * {sŧring}
     */
    this.id = id;

    /**
     * The list of sentences that the user can say to invoke this Intent.
     *
     * They may contain placeholders of the form `{typeID}`.
     * The placeholder must have already been added to `this.parameters`
     * before adding the command here.
     *
     * Alternatives like "(foo|bar) command" need to have been expanded already
     * into 2 commands "foo command" and "bar command" before adding them here.
     *
     * {Array of string}
     */
    this.commands = [];

    /**
     * The parameters for this Intent.
     *
     * They appear as placeholders in the commands.
     * All placeholders used in the commands must be in this list.
     * However, not all commands have to necessarily use all placeholders.
     * If not used, the argument will be null.
     *
     * {JS obj: type ID {string} -> type {DataType}}
     */
    this.parameters = {};
  }

  /**
   * @param id {string}
   * @param type {DataType}
   */
  addParameter(id, type) {
    assert(id && typeof(id) == "string");
    assert(type instanceof DataType);
    assert(this.app.dataTypes[type.id] == type);

    this.parameters[id] = type;
  }

  /**
   * @param command {string}
   * @see this.commands
   * Alternatives are expanded here.
   */
  addCommand(command) {
    // validate placeholders before adding
    for (let placeholderID of this.getPlaceholders(command)) {
      if (!this.parameters[placeholderID]) {
        console.error("Placeholder " + placeholderID + " in command '" + command + "' unknown");
      }
    }

    let alternatives = this.expandAlternatives(command);
    if (alternatives) {
      this.commands = this.commands.concat(alternatives);
    } else {
      this.commands.push(command);
    }
  }

  /**
   * @param command {string} e.g. "Read {book} chapter {chapter}"
   * @returns {Array of id {string}} e.g. [ "book", "chapter"]
   */
  getPlaceholders(command) {
    return [...command.matchAll(/{([a-zA-Z0-9]+)}/g)]
      .map(result => result[1]);
  }

  /**
   * @param command {string} e.g. "From (here|there) to (Paris|Berlin|Frankfurt)"
   * @returns {Array of string} e.g. [
   *   "From here to Paris",
   *   "From there to Paris",
   *   "From here to Berlin",
   *   "From there to Berlin",
   *   "From here to Frankfurt",
   *   "From there to Frankfurt",
   *   ]
   *   or null, if there's nothing to expand
   */
  expandAlternatives(command) {
    let matches = command.match(/\([^\)]+\)/);
    if (!matches) { // stops the recursion
      // Could return array with 1 element, but caller would have to always
      // call Array.concat(), and that's more expensive than Array.push().
      return null;
    }
    let firstList = matches[0]; // e.g. "(here|there)", only 1 result
    let alternatives = firstList.substr(1, firstList.length - 2).split("|");
    let commands = alternatives.map(alternative => command.replace(firstList, alternative));

    // recursive, to expand the other alternatives as well
    let result = [];
    for (let expCommand of commands) {
      let expCommands = this.expandAlternatives(expCommand);
      if (expCommands) {
        result = result.concat(expCommands);
      } else {
        result.push(expCommand);
      }
    }
    return result;
  }

  /**
   * Function name for this Intent.
   *
   * @returns {string}
   */
  functionName() {
    // camelCase, e.g. "playSong" for intent ID "PlaySong".
    return this.id[0].toLowerCase() + this.id.substr(1);
  }

  /**
   * An intent "PlaySong" will call `app.playSong();`.
   *
   * @param args {JS obj: Parameter ID {string} -> value }
   *   Before calling this function, the enum variables will already be translated
   *   from the translated word that the user spoke to their value ID.
   * @returns {string} Text to say to the end user. Needs to be translated.
   */
  async run(args) {
    let intent = this;
    // validate
    for (let argID in args) {
      let type = intent.parameters[argID];
      if (!type) {
        throw new Error("Parameter ID " + argID + " is unknown for intent " + intent.id);
      }
      if (type.finite) {
        let valueID = args[argID];
        if (!type.valueIDs.includes(valueID)) {
          throw new Error("Argument " + valueID + " is unknown for datatype " + type.id + ". This happened while calling intent " + intent.id);
        }
      }
    }

    // Call app implementation function
    // e.g. `this.playSong(args)`
    try {
      return this.app[this.functionName()](args);
    } catch (ex) {
      console.error(ex);
      return "I had a problem. " + (ex.message || ex);
    }
  }
}
