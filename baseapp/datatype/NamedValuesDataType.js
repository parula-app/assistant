import { FiniteDataType } from './FiniteDataType.js';
import { assert } from '../../util/util.js';

/**
 * A list of names that each have a value or JS object associated.
 * Like ListDataType, but with values independent of the terms.
 * Like EnumDataType, but with a dynamic list generated at runtime.
 *
 * It's a known list of values, typically from the application data.
 * For example, a city or a person. The names would be the terms,
 * and the value can be a JS object to capture the person data.
 *
 * The value can also be just a string ID.
 */
export class NamedValuesDataType extends FiniteDataType {
  /**
   * @param
   */
  constructor(id) {
    super(id);

    /**
     * { Map of term {string} -> value {any} }
     */
    this._values = new Map();

    /**
     * { Map of ID {string or number} -> value {any} }
     */
    //this._valuesByID = new Map();

    /**
     * { Array of term {string} }
     */
    this._terms = [];
  }

  /**
   * Slow
   * @returns {Array of value {any}}
   */
  get values() {
    return Array.from(this._values.values());
  }

  /**
   * { Map of term {string} -> value {any} }
   */
  get entireMap() {
    return this._values;
  }

  /**
   * Called often, must be fast.
   * Do not calculate this, but cache it.
   */
  get terms() {
    return this._terms;
  }

  valueForTerm(term) {
    return this._values.get(term);
  }

  /**
   * For any value, return a unique ID that allows to
   * find the value again in the internal list of values.
   * The ID must be unique (only this value has this ID)
   * and stable within the lifetime of this application
   * (until it stops running), ideally even after a restart.
   *
   * You need to overwrite this function to customize
   * it to your values and their properties.
   *
   * @param value {any}
   * @returns {string or number} ID
   */
  idForValue(value) {
    return value.id || value.name || value.term;
  }

  valueForID(id) {
    // memory vs. speed
    //this._valuesByID.get(id);
    return this.values.find(value => this.idForValue(value) == id);
  }

  /**
   * @param term {string}   What the user will say.
   * @param value {any}   The value object. Not shown to user.
   *   Can be string, integer or even an object.
   *   Will be passed to your app in `args`.
   */
  addValue(term, value) {
    assert(value, "Need a value");
    assert(term && typeof(term) == "string");

    this._values.set(term, value);
    //this._valuesByID.set(this.idForValue(value), value);
    this._terms.push(term);
  }
}
