import { EnumDataType } from './EnumDataType.js';
import { assert } from '../../util/util.js';

/**
 * A human language that is supported by the system,
 * e.g. "English", "German" or "Spanish".
 *
 * The ID is the 2-letter ISO language code.
 */
export class LanguageDataType extends EnumDataType {
  constructor() {
    super("Pia.Language");

    this.addValue("en", [ "english" ]);
    this.addValue("de", [ "deutsch", "german" ]);
    this.addValue("fr", [ "français", "french" ]);
    this.addValue("it", [ "italian" ]);
    this.addValue("es", [ "spanish" ]);
  }

  async load(lang) {
    // Add translations for each language
    // in the current language and in the target language
    // using `addTerm()`
  }
}
