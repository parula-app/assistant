import { DataType } from './DataType.js';
import { assert } from '../../util/util.js';

/**
 * A finite list of values.
 *
 * The values can have different names and translations into different languages,
 * but they all have the same ID.
 *
 * They will typically come from the app model and app translation.
 *
 * E.g.
 *   ID = "ge"
 *   English = "Genesis", "First book of Moses"
 *   German = "Erste Mose"
 *   etc.
 */
export class EnumDataType extends DataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);
    this.finite = true;

    /**
     * The different IDs that this type can have.
     * e.g. [ "ge", "nu", ... ]
     * { Set of id {string} }
     */
    this._valueIDs = new Set();

    /**
     * The list of words that the user can say for the this placeholder,
     * and mapping them to the ID for this value.
     * e.g. {
     *   "Genesis": "ge",
     *   "First book of Moses": "ge",
     *   "First Moses": "ge",
     *   "Numbers": "nu",
     *   ...
     * }
     * {Map of term {string} -> id {string}}
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
