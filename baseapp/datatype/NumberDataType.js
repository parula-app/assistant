// import wordsToNumbers from 'words-to-numbers';
import * as wtn from 'words-to-numbers';
const wordsToNumbers = wtn.default.wordsToNumbers;
import writtenNumber from 'written-number';
import { OpenEndedDataType } from './OpenEndedDataType.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

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
    this._terms = null;
  }

  /**
   * @param term {string} e.g. "9" or "nine" or "nine hundred fifty five"
   * @returns {number}
   * @throws Error if conversion failed
   */
  valueIDForTerm(term) {
    term = term.trim();
    let number = parseInt(term);
    if (isNaN(number)) {
      number = parseFloat(term);
    }
    if (!isNaN(number) && number + "" == term) {
      return number;
    }
    // TODO only English supported
    return this.validate(wordsToNumbers(term, { fuzzy: true }));
  }

  validate(input) {
    if (typeof(input) != "number") {
      throw new Error("'" + input + "' is not a number");
    }
    return input;
  }

  score(input) {
    if (typeof(input) == "number") {
      return 0;
    } else if (parseInt(input) + "" == input) {
      return 0;
    } else if (typeof(wordsToNumbers(input)) == "number") {
      return 0.1;
    } else if (typeof(wordsToNumbers(input, { fuzzy: true })) == "number") {
      return 0.4;
    } else {
      return 1;
    }
  }

  get terms() {
    if (this._terms) {
      return this._terms;
    }
    let lang = getConfig().language;
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
