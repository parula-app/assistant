import { DataType } from './DataType.js';
import { matchString } from '../../intentParser/matchString.js';


/**
 * Has a limited list of values that the user can say.
 * For example, contact names of the user's address book,
 * cites in the world, and artists and songs that the user can play.
 *
 * The lists may be large, with 100000 entries, but they are
 * required to get match with what the user user said and
 * specifically for the speech recognition. Without this list,
 * there's no chance that the speech recognition will
 * recognize the name of an artist or even the last name
 * of your colleague in your contacts list.
 *
 * The terms are translated into different languages,
 * but their corresponding IDs are language-independent.
 *
 * The string matching with user input and the mapping to ID is done
 * here in `valueForInput()`.
  */
export class FiniteDataType extends DataType {
  /**
   * @param id {string}
   */
  constructor(id) {
    super(id);
  }

  /**
   * Allows to load possible values,
   * in a given language.
   */
  async load(lang) {
  }

  /**
   * The complete set of all IDs that are valid for this type.
   * They are the IDs for the terms, e.g. "ge" for "Genesis".
   * They are not shown to the user and not translated.
   * In some cases, e.g. for artists, they may be identical to the terms.
   *
   * @returns {Array of string} IDs of the different enum values
   * TODO make it a Set?
   */
  get valueIDs() {
    throw new Error("Implement this");
  }

  /**
   * The complete list of all objects that the user might say.
   * They should be translated to the end user's current langauge
   * where that makes sense.
   *
   * E.g. if you are an address book type ContactPerson, you will return
   * all the names of the contacts in the user's address book.
   * E.g. if this is type BibleBook, "Genesis", "Exodus" in English and
   * "1. Mose", "2. Mose" in German.
   *
   * This function will be called when the said something, to
   * match it with your list. So, this function must be very fast (< 1ms) and
   * read from RAM. You will typically load the values from disk in `load()`
   * and cache them in a class member variable.
   *
   * If something is not included here, the speech recognition will probably
   * not recognize it.
   *
   * @returns {Array of string}
   */
  get terms() {
    throw new Error("Implement this");
  }

  /**
   * @param term {string} What the user said
   * @returns {string} the corresponding value ID, or null/undefined
   */
  valueIDForTerm(term) {
    throw new Error("Implement this");
  }

  /**
   * @param inputText {string} What the user said
   * @returns {
   *    value {string} the corresponding value ID, or null/undefined
   *    score {float} Rate how well the inputText matches the data type value.
   *      0..1, whereas
   *      1 = no relation whatsoever
   *      0.5 = half the string matches
   *      0 = perfect match
   * }
   */
  valueForInput(inputText) {
    // normalize to allowed values
    let match = matchString(inputText, this.terms);
    if (!match) {
      return {
        value: null,
        score: 1,
      };
    }
    let value = this.valueIDForTerm(match.targetString);
    return {
      value: value,
      score: match.score,
    };
  }
}
