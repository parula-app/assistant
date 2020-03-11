import { DataType } from './DataType.js';
import { assert } from '../../util/util.js';

/**
 * A simple list of values.
 *
 * The values have no ID and are the same in all languages.
 * They will typically from data.
 *
 * E.g. song titles, artist names
 */
export class ListDataType extends DataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);
    this.finite = true;

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
