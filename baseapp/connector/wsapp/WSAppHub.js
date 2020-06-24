import { WSApp } from './WSApp.js';
import { WSCall } from '../../../util/WSCall.js';
import { assert } from '../../../util/util.js';
import WebSocket from 'ws';

const kPort = 12778;

/**
 */
export class WSAppHub {
  /**
   * @param client {Client}
   */
  constructor(client) {
    this.apps = []; // {Array of AppBase}
    this._client = client; // {Client}
  }

  async start() {
    await this._createServer();
  }

  async _createServer() {
    let server = new WebSocket.Server({ port: kPort });
    server.on("connection", webSocket => {
      try {
        let wsCall = new WSCall(webSocket);
        wsCall.register("registerApp", json => this.registerApp(json, wsCall));
      } catch (ex) {
        console.error(ex);
      }
    });
  }

  /**
   * A Pia WebSocket voice app tells us about its existance.
   *
   * @param intents {JSON} describing the app and its intents
   * @param wsCall {WSCall} the web socket connection with the app
   */
  async registerApp(json, wsCall) {
    let appID = json.interactionModel.languageModel.invocationName;
    assert(appID && typeof(appID) == "string");
    let app = new WSApp(appID, wsCall);
    await app.load("en");
    app.loadIntentsJSON(json);
    this.apps.push(app);
    await this._client.intentParser.loadApp(app);
    console.log("Application", appID, "loaded: success");
  }
}
