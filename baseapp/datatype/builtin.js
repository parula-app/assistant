import { TextDataType } from './TextDataType.js';
import { NumberDataType } from './NumberDataType.js';
import { DateTimeDataType } from './DateTimeDataType.js';
import { LanguageDataType } from './LanguageDataType.js';
import { LocationDataType } from './LocationDataType.js';

const kBuiltinTypes = [
  new TextDataType(),
  new NumberDataType(),
  new DateTimeDataType(),
  new LanguageDataType(),
  new LocationDataType(),
];

/**
 * For AppBase.js only
 *
 * Returns basic data types that are not defined by the app,
 * but by the system.
 *
 * @param app {AppBase}
 * @param lang {string} language, ISO 2 letter code
 */
export function loadBuiltinTypes(app, lang) {
  for (let type of kBuiltinTypes) {
    app.dataTypes[type.id] = type;
    type.lang = lang; // for NumberDataType
  }
}
