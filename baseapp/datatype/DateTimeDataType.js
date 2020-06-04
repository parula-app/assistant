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
   * @see DataType.valueForInput()
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

  idForValue(value) {
    return value.valueOf();
  }

  valueForID(id) {
    return new Date(id);
  }
}
