import { assert } from '../../util/util.js';

export class DataType {
  /**
   * @param id {string}
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

    /**
     * Keeps the language model for speech recognition
     * to be used when recognizing values of this data type.
     * Allows to train the speech recognition on the specific
     * words that are allowed for this data type.
     *
     * If null, the standard language model with the
     * full dictionary will be used.
     *
     * {LanguageModel}
     */
    this.languageModel = null;
  }

  /**
   * Allows to load possible values,
   * in a given language.
   */
  async load(lang) {
  }

  /**
   * TODO make it a Set?
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
