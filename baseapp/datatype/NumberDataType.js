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

  valueIDForTerm(term) {
    term = term.trim();
    // TODO only English supported
    return this.validate(wordsToNumbers(term, { fuzzy: true }));
  }

  validate(input) {
    if (typeof(input) != "number") {
      throw new Error(this.id + " " + input + " is not a number");
    }
    return input;
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
