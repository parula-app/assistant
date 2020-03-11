import { DataType } from './DataType.js';
import { assert } from '../../util/util.js';

// TODO
var kBuiltinTypes = [];
// export for AppBase.js only
export function loadBuiltinTypes(app) {
  if (!kBuiltinTypes.length) {
    for (let id of [ "Number", "Language" ]) {
      let type = new DataType("Pia." + id);
      type.finite = false;
      kBuiltinTypes.push(type);
    }
  }
  for (let type of kBuiltinTypes) {
    app.dataTypes[type.id] = type;
  }
}
