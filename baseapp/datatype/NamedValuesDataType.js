import { FiniteDataType } from './FiniteDataType.js';
import { Obj } from './Obj.js';
import { assert } from '../../util/util.js';
import { matchStringWithAlternatives } from '../../intentParser/matchString.js';

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
     * { Map of term {string} -> value {Obj} }
     */
    this._values = new Map();

    /**
     * { Map of ID {string or number} -> value {Obj} }
     */
    //this._valuesByID = new Map();

    /**
     * { Array of term {string} }
     */
    this._terms = [];
  }

  /**
   * Slow
   * @returns {Array of value {Obj}}
   */
  get values() {
    return Array.from(this._values.values());
  }

  /**
   * { Map of term {string} -> value {Obj} }
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
   * @param inputText {string} What the user said
   * @returns {
   *    value {string} the corresponding value, or null/undefined
   *    score {float} Rate how well the inputText matches the data type value.
   *      0..1, whereas
   *      1 = no relation whatsoever
   *      0.5 = half the string matches
   *      0 = perfect match
   * }
   * @overrides FiniteDataType
   */
  valueForInput(inputText, context) {
    let pronounMatch = this.valueForPronoun(inputText, context);
    if (pronounMatch) {
      return pronounMatch;
    }

    // normalize to allowed values
    let matches = matchStringWithAlternatives(inputText, this.terms);
    if (!matches.length) {
      return {
        value: null,
        score: 1,
      };
    }
    for (let match of matches) {
      match.value = this.valueForTerm(match.targetString);
      match.score += (match.value.score - 0.5) * 0.25;
      match.score = Math.max(match.score, 0);
      /*if (oldScore != match.score) {
        console.log(match.value.name, "score changed from", oldScore, "to", match.score, "due to value score", match.value.score); console.log(match.value);
      }*/
    }
    return matches.sort((a, b) => a.score - b.score)[0];
  }

  /**
   * @param term {string}   What the user will say.
   * @param value {Obj}   The value object. Not shown to user.
   *   Can be string, integer or even an object.
   *   Will be passed to your app in `args`.
   */
  addValue(term, value) {
    assert(value && value instanceof Obj, "Need a value of type Obj");
    assert(term && typeof(term) == "string");

    this._values.set(term, value);
    //this._valuesByID.set(value.id, value);
    this._terms.push(term);
  }
}
