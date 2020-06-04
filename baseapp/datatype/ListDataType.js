import { FiniteDataType } from './FiniteDataType.js';
import { assert } from '../../util/util.js';

/**
 * A simple list of values. They have no ID, but the term
 * is identical to the value.
 *
 * Typically from the application data.
 * E.g. song titles, artist names
 */
export class ListDataType extends FiniteDataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);

    /**
     * { Array of id {string} }
     */
    this._values = [];
  }

  get values() {
    return this._values;
  }

  get terms() {
    return this._values;
  }

  valueForTerm(term) {
    return term;
  }

  /**
   * @param value {string}
   */
  addValue(value) {
    assert(value && typeof(value) == "string");

    this._values.push(value);
  }
}
