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
}
