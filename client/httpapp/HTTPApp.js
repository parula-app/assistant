import { AppBase } from '../../baseapp/AppBase.js';
import { JSONApp } from '../../baseapp/JSONApp.js';
import { Intent } from '../../baseapp/Intent.js';
import { DataType } from '../../baseapp/datatype/DataType.js';
import { EnumDataType } from '../../baseapp/datatype/EnumDataType.js';
import { ListDataType } from '../../baseapp/datatype/ListDataType.js';
import { NamedValuesDataType } from '../../baseapp/datatype/NamedValuesDataType.js';
import { assert } from '../../util/util.js';
import r2 from 'r2';

/**
 * This is the app stub. It poses as voice app, but doesn't
 * contain the actual app implementation, but forwards
 * all calls to the voice app in another process, via HTTP REST.
 */
export class HTTPApp extends JSONApp {
  constructor(id, url) {
    super(id, "none");
    this.url = url;
  }

  /**
   * @param lang {string} 2-digit ISO language code
   */
  async load(lang) {
    await AppBase.prototype.load.call(this, lang);
    // Skip super.load() which tries to load the intents JSON from a file on disk
  }
}
