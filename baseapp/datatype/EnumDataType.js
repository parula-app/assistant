import { FiniteDataType } from './FiniteDataType.js';
import { assert } from '../../util/util.js';

/**
 * A list of values, pre-defined by the application.
 * The values are specific to the application and not the user.
 * For example, a status.
 * They will typically come from the app model and app translation.
 *
 * The terms are translated into different languages,
 * but their corresponding IDs (= values) are language-independent.
 * Each value can have several terms associated, even for the same language.
 * For this class: value = ID.
 *
 * E.g. one entry might be:
 *   ID = "ge"
 *   English = "Genesis", "1. book of Moses", ...
 *   German = "1. Mose", "Erste Mose", ...
 *   etc.
 */
export class EnumDataType extends FiniteDataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);

    /**
     * @see FiniteDataType.values
     * E.g. "ge", "nu", ...
     * { Set of ID {string} }
     */
    this._values = new Set();

    /**
     * @see FiniteDataType.terms
     * E.g. {
     *   "Genesis": "ge",
     *   "First book of Moses": "ge",
     *   "First Moses": "ge",
     *   "Numbers": "nu",
     *   ...
     * }
     * {Map of term {string} -> value {string}}
     */
    this._terms = new Map();

    /**
     * The list of words that the user can say for the this placeholder.
     *
     * {Array of term {string}}
     */
    this._termsFlat = [];
  }

  /**
   * @returns {Array of string} All possible values = IDs
   */
  get values() {
    return [...this._values.values()];
  }

  /**
   * @returns {Array of string} What the user can say
   */
  get terms() {
    return this._termsFlat;
  }

  /**
   * @param term {string} What the user said
   * @returns {string} the corresponding value = ID, or null/undefined
   */
  valueForTerm(term) {
    return this._terms.get(term);
  }

  termForValue(value) {
    for (let [ term, curValue ] of this._terms.entries()) {
      if (value == curValue) {
        return term;
      }
    }
  }

  /**
   * Adds a new unique value for this data type.
   * @param id {string}  ID = value
   * @param terms {Array of string}  Words that the user can say
   *     that each mean this value.
   */
  addValue(id, terms) {
    assert(id && typeof(id) == "string");

    this._values.add(id);
    this.addTerms(id, terms);
  }

  /**
   * Adds additional terms for an existing value.
   * @param id {string}  ID = value
   * @param terms {Array of string}  Words that the user can say
   *     that each mean this value.
   */
  addTerms(id, terms) {
    assert(id && typeof(id) == "string");
    assert(this._values.has(id));

    for (let term of terms) {
      this._terms.set(term, id);
      this._termsFlat.push(term);
    }
  }
}
