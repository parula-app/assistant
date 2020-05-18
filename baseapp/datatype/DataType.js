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
   * @see FiniteDataType.terms
   * This is also useful for some non-finite types, returning common
   * sample terms, which may be used to train the speech recognizer.
   *
   * @returns {Array of string}
   */
  get terms() {
    throw new Error("Implement this");
  }

  /**
   * List of pronouns
   * E.g. "it", "that", "she", "there", "here".
   * @see valueForPronoun()
   *
   * In the user's language, @see load().
   * Some pronouns like "it", "this", "that",
   * "this "+ name of type, etc. will be defined
   * by default for all types. Use them by calling
   * super.pronouns().
   *
   * @returns {Array of string}
   */
  get pronouns() {
    let typeName = this.id.toLowerCase(); // TODO translate
    return [
      "it",
      "this",
      "that",
      "this " + typeName,
      "that " + typeName,
    ];
  }

  /**
   * @param inputText {string} What the user said
   * @returns {
   *    value {any} the corresponding value, or null/undefined
   *    score {float} Rate how well the inputText matches the data type value.
   *      0..1, whereas
   *      1 = no relation whatsoever
   *      0.5 = half the string matches
   *      0 = perfect match
   * }
   */
  valueForInput(inputText) {
    // see FiniteDataType and NumberDataType for sample implementations
    throw new Error("Implement this");
  }

  /**
   * Checks whether the input text is a valid pronoun for this type,
   * and matches something the user said recently.
   *
   * If no match, returns null. Data types are free not to implement
   * this and to to just always return null.
   *
   * @see pronouns
   *
   * @param inputText {string} What the user said, in the user's language
   * @param context {Array of Context} allows access to data from recent commands
   *   Ordered by increasing time, i.e. most recent command is last entry in array.
   * @returns same as valueForInput(), or null
   */
  valueForPronoun(inputText, context) {
    return null;
  }
}
