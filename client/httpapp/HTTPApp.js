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
  constructor(id, url, authKey) {
    super(id, "none");
    assert(url && typeof(url) == "string", "Need URL");
    assert(authKey && typeof(authKey) == "string", "Need the auth key");
    if (!url.endsWith("/")) {
      url += "/";
    }
    this.url = url;
    this._authKey = authKey;
  }

  async load(lang) {
    await AppBase.prototype.load.call(this, lang);
    // Skip super.load() which tries to load the intents JSON from a file on disk
  }

  loadIntentsJSON(json, lang) {
    super.loadIntentsJSON(json, lang);
    this.defineIntents();
  }

  /**
   * Creates functions on this object to mimic the intent
   * functions of the actual app. They all are `runIntent()`.
   */
  defineIntents() {
    for (let intent of Object.values(this.intents)) {
      this[intent.functionName()] = (args, clientAPI) => this.runIntent(intent, args, clientAPI);
    }
  }

  /**
   * Just forward the intent call to the voice app via HTTP REST.
   *
   * It calls http://localhost:12127/:appid/:intentid (POST) with body {
   *   args: {
   *     <slotname>: <value>,
   *     ...
   *   }
   * }
   *
   * @see HTTPAppServer.js for the HTTP server = voice app.
   */
  async runIntent(intent, args, clientAPI) {
    assert(intent.parameters, "Need Intent object");
    assert(clientAPI.lang, "Need ClientAPI object");
    let call = {
      args: args,
    }
    let response = await r2.post(this.url + intent.app.id + "/" + intent.id, {
      json: call,
      headers: {
        "Accept-Langauge": `${clientAPI.lang}, en;q=0.8`,
        "X-AuthToken": this._authKey,
      },
    }).json;
    if (response.responseText) {
      return response.responseText;
    } else if (response.errorMessage) {
      let ex = new Error(response.errorMessage);
      ex.code = response.errorCode;
      throw ex;
    } else {
      console.log(ex);
      throw new Error("Unknown JSON response from HTTP app");
    }
  }
}
