import { assert } from '../../util/util.js';

export class DataType {
  /**
   * @param
   */
  constructor(id) {
    assert(id && typeof(id) == "string");

    /**
     * Internal ID of the DataType.
     * E.g. "book"
     *
     * {sŧring}
     */
    this.id = id;

    /**
     * If true, then only values in `this.values` are allowed.
     * {boolean}
     */
    this.finite = true;
  }

  /**
   * @returns {Array of string} IDs of the different enum values
   */
  get valueIDs() {
    throw new Error("Implement this");
  }

  /**
   * @returns {Array of string}
   */
  get terms() {
    throw new Error("Implement this");
  }

  /**
   * @param term {string} What the user said
   * @returns {string} the corresponding value ID, or null/undefined
   */
  valueIDForTerm(term) {
    throw new Error("Implement this");
  }
}
