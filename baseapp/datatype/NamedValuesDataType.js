import { FiniteDataType } from './FiniteDataType.js';
import { assert } from '../../util/util.js';

/**
 * A list of names that each have an ID.
 * Like ListDataType, but with IDs.
 * Like EnumDataType, with a dynamic list.
 *
 * It's a known list of values, typically from the application data.
 */
export class NamedValuesDataType extends FiniteDataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);

    /**
     * { Map of term {string} -> valueID {any} }
     */
    this._values = new Map();

    /**
     * { Array of term {string} }
     */
    this._terms = [];
  }

  /**
   * Slow
   * @returns {Array of valueID {any}}
   */
  get valueIDs() {
    return Array.from(this._values.values());
  }

  /**
   * Called often, must be fast.
   * Do not calculate this, but cache it.
   */
  get terms() {
    return this._terms;
  }

  valueIDForTerm(term) {
    return this._values.get(term);
  }

  /**
   * @param term {string}   What the user will say.
   * @param valueID {any}   The internal ID. Not shown to user.
   *   Can be string, integer or even an object.
   *   Will be passed to your app in `args`.
   */
  addValue(term, valueID) {
    assert(valueID, "Need a value");
    assert(term && typeof(term) == "string");

    this._values.set(term, valueID);
    this._terms.push(term);
  }
}
