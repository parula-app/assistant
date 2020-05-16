// import wordsToNumbers from 'words-to-numbers';
import * as wtn from 'words-to-numbers';
const wordsToNumbers = wtn.default.wordsToNumbers;
import writtenNumber from 'written-number';
import { OpenEndedDataType } from './OpenEndedDataType.js';
import { assert } from '../../util/util.js';
import leven from '../../intentParser/leven.js';

/**
 * An integer
 *
 * E.g. 3, 2013, or 5000000, or 3.14
 *
 * TODO: Other languages than en
 */
export class NumberDataType extends OpenEndedDataType {
  constructor() {
    super("Pia.Number");
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
    if (typeof(input) == "number") {
      return {
        value: input,
        score: 0,
      };
    }
    let number = parseInt(input);
    if (!isNaN(number) && number + "" == input) {
      return {
        value: number,
        score: 0,
      };
    }
    number = wordsToNumbers(input);
    // Attention: typeof(NaN) == "number" is true!
    if (!isNaN(number)  && typeof(number) == "number") {
      return {
        value: number,
        score: 0.1,
      };
    }
    number = wordsToNumbers(input, { fuzzy: true });
    if (!isNaN(number)  && typeof(number) == "number") {
      let score = leven(input, writtenNumber(number, { lang: this.lang })).score;
      return {
        value: number,
        score: score,
      };
    }
    return {
      value: input,
      score: 1,
    };
  }

  get terms() {
    if (this._terms) {
      return this._terms;
    }
    let lang = this.lang;
    // TODO German and Italian not supported :-(
    let samples = [];
    for (let i = -1; i < 300; i++) {
      samples.push(writtenNumber(i, { lang: lang }));
    }
    for (let i = 1; i < 10^15; i = i * 10) {
      samples.push(writtenNumber(i, { lang: lang }));
    }
    for (let i = 1; i < 5; i++) {
      samples.push(writtenNumber(i, { lang: lang }));
    }
    return this._terms = samples;
  }
}
