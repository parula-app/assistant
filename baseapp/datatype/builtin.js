import { TextDataType } from './TextDataType.js';
import { NumberDataType } from './NumberDataType.js';
import { LanguageDataType } from './LanguageDataType.js';

const kBuiltinTypes = [
  new TextDataType(),
  new NumberDataType(),
  new LanguageDataType(),
];

/**
 * For AppBase.js only
 *
 * Returns basic data types that are not defined by the app,
 * but by the system.
 *
 * @param app {AppBase}
 */
export function loadBuiltinTypes(app) {
  for (let type of kBuiltinTypes) {
    app.dataTypes[type.id] = type;
  }
}
