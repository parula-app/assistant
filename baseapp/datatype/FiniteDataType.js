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
  valueForInput(inputText, context) {
    let pronounMatch = this.valueForPronoun(inputText, context);
    if (pronounMatch) {
      return pronounMatch;
    }

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

  /**
   * Checks whether the input text is a valid pronoun for this type,
   * and matches something the user said recently.
   *
   * If no match, returns null. Data types are free not to implement
   * this and to to just always return null.
   *
   * @see pronouns
   *
   * @param inputText {string} What the user said, in the user's language
   * @param context {Array of Context} allows access to data from recent commands
   *   Ordered by increasing time, i.e. most recent command is last entry in array.
   * @returns same as valueForInput(), or null
   */
  valueForPronoun(inputText, context) {
    // Require exact, non-fuzzy match, because speech recognition engines
    // should properly recognize such common words. And they are short.
    if (!this.pronouns.includes(inputText)) {
      return null;
    }
    let candidate; // {Obj} Most recent object of fitting type
    let time = null; // {Date} When the candidate was mentioned
    let objectDistance = null; // {int} How many other objects came after the candidate

    // Check whether there's an object of fitting type in the context
    for (let c of context) {
      for (let [ paramName, paramProp ] of Object.entries(c.intent.parameters)) {
        if (paramProp.dataType instanceof this.constructor) {
          candidate = c.args[paramName];
          time = c.startTime;
          objectDistance = 0;
        } else {
          objectDistance++;
        }
      }
    }
    if (!candidate) {
      return null;
    }

    // Calculate score
    // We matched the pronoun string perfectly, and the data type perfectly.
    // Now check the distance, in terms of time and other objects.
    let kFurthestTime = new Date();
    kFurthestTime.setUTCMinutes(kFurthestTime.getUTCMinutes() - 3); // 5 minutes ago
    let kFurthestObjects = 5; // max 5 other objects between candidate and now
    let kMaxScore = 0.5;
    let score = (
        (objectDistance / kFurthestObjects) * kMaxScore +
        ((Date.now() - time) / (Date.now() - kFurthestTime)) * kMaxScore
      ) / 2;
    return {
      value: candidate,
      score: score,
    };
  }
}
