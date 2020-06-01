import { FiniteDataType } from './FiniteDataType.js';
import { assert } from '../../util/util.js';

/**
 * A list of values, pre-defined by the application.
 * The values are specific to the application and not the user.
 * For example, a status.
 * They will typically come from the app model and app translation.
 *
 * The terms are translated into different languages,
 * but their corresponding IDs are language-independent.
 *
 * E.g. one value might be:
 *   ID = "ge"
 *   English = "Genesis", "First book of Moses"
 *   German = "Erste Mose"
 *   etc.
 */
export class EnumDataType extends FiniteDataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);

    /**
     * @see FiniteDataType.valueIDs
     * E.g. [ "ge", "nu", ... ]
     * { Set of id {string} }
     */
    this._valueIDs = new Set();

    /**
     * @see FiniteDataType.terms
     * E.g. {
     *   "Genesis": "ge",
     *   "First book of Moses": "ge",
     *   "First Moses": "ge",
     *   "Numbers": "nu",
     *   ...
     * }
     * {Map of term {string} -> value ID {string}}
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
   * @returns {Array of string} IDs of the different enum values
   */
  get valueIDs() {
    return [...this._valueIDs.values()];
  }

  /**
   * @returns {Array of string} What the user can say
   */
  get terms() {
    return this._termsFlat;
  }

  /**
   * @param term {string} What the user said
   * @returns {string} the corresponding value ID, or null/undefined
   */
  valueIDForTerm(term) {
    return this._terms.get(term);
  }

  termForValueID(valueID) {
    for (let [ term, curValueID ] of this._terms.entries()) {
      if (valueID == curValueID) {
        return term;
      }
    }
  }

  /**
   * Adds a new unique value for this data type.
   * @param id {string}  ID for the new value
   * @param terms {Array of string}  Words that the user can say
   *     that each mean this value.
   */
  addValue(id, terms) {
    assert(id && typeof(id) == "string");

    this._valueIDs.add(id);
    this.addTerms(id, terms);
  }

  /**
   * Adds additional terms for an existing value.
   * @param id {string}  ID of the value
   * @param terms {Array of string}  Words that the user can say
   *     that each mean this value.
   */
  addTerms(id, terms) {
    assert(id && typeof(id) == "string");
    assert(this._valueIDs.has(id));

    for (let term of terms) {
      this._terms.set(term, id);
      this._termsFlat.push(term);
    }
  }
}
