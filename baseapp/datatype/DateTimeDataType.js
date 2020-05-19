import Sugar from 'sugar-date';
import { OpenEndedDataType } from './OpenEndedDataType.js';
import { assert } from '../../util/util.js';

/**
 * An date or time
 */
export class DateTimeDataType extends OpenEndedDataType {
  constructor() {
    super("Pia.DateTime");
    this.lang = null; // set by builtin.js
    this._terms = null;
  }

  /**
   * @param inputText {string} What the user said
   * @returns {
   *    value {number} the corresponding value ID, or null/undefined
   *    score {float} Rate how well the inputText matches the data type value.
   *      0..1, whereas
   *      1 = no relation whatsoever
   *      0.5 = half the string matches
   *      0 = perfect match
   * }
   */
  valueForInput(input) {
    if (input instanceof Date) {
      return {
        value: input,
        score: 0,
      };
    }
    let date = Date(input);
    if (!isNaN(date)) {
      return {
        value: date,
        score: 0,
      };
    }

    // TODO Limit vocabulary
    input = input.replace(" p m", "PM").replace(" a m", "AM").replace("to morrow", "tomorrow");
    console.log("Sugar.Date", input);
    date = Sugar.Date.create(input);

    if (!isNaN(date)  && date instanceof Date) {
      return {
        value: date,
        score: 0.1,
      };
    }
    return {
      value: input,
      score: 1,
    };
  }

  get terms() {
    // TODO implement samples, see NumberDataType
    return [];
  }
}
