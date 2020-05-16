import { DataType } from './DataType.js';

export class OpenEndedDataType extends DataType {
  constructor(id) {
    super(id);
  }

  get terms() {
    return [];
  }
}
