import { DataType } from './DataType.js';

export class OpenEndedDataType extends DataType {
  constructor(id) {
    super(id);
    this.finite = false;
  }

  get valueIDs() {
    return [];
  }

  get terms() {
    return [];
  }

  valueIDForTerm(term) {
    return term;
  }
}
