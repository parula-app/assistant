import { FiniteDataType } from './FiniteDataType.js';
import { assert } from '../../util/util.js';

/**
 * A simple list of values. They have no ID.
 *
 * It's a known list of values, typically from the application data.
 *
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

  get valueIDs() {
    return this._values;
  }

  get terms() {
    return this._values;
  }

  valueIDForTerm(term) {
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
