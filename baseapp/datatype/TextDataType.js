import { OpenEndedDataType } from './OpenEndedDataType.js';
import { assert } from '../../util/util.js';

/**
 * Accepts any text as input.
 * It needs to be in the user's language.
 *
 * E.g. searches, dictation for text messages etc.
 */
export class TextDataType extends OpenEndedDataType {
  constructor() {
    super("Pia.Text");
  }

  valueForInput(inputText) {
    return {
      value: inputText,
      score: 0.3, // Prefer known values in FiniteDataType.
    };
  }
}
