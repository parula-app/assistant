import { AppBase } from '../../AppBase.js';
import { JSONApp } from '../../JSONApp.js';
import { Intent } from '../../Intent.js';
import { DataType } from '../../datatype/DataType.js';
import { assert } from '../../../util/util.js';

/**
 * This is the app stub. It poses as voice app, but doesn't
 * contain the actual app implementation, but forwards
 * all calls to the voice app in another process, via WebSocket and `WSCall`.
 */
export class WSApp extends JSONApp {
  /**
   * @param wsCall {WSCall}
   */
  constructor(id, wsCall) {
    assert(typeof(wsCall.makeCall) == "function");
    super(id, "none");
    this._wsCall = wsCall;
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
   * Just forward the intent call to the voice app via WebSocket.
   * @see WSAppServer.js for the voice app.
   */
  async runIntent(intent, args, clientAPI) {
    assert(intent.parameters, "Need Intent object");
    assert(clientAPI.lang, "Need ClientAPI object");
    return await this._wsCall.makeCall(intent.app.id + "/" + intent.id, {
      args: args,
      lang: clientAPI.lang,
    });
  }
}
