import HTTPApp from './HTTPApp.js';
import { catchHTTPJSON } from '../../../client/connector/HTTPServer.js';
import express from 'express';

/**
 * Allows voice apps implemented in another process
 * to register with Parula core, using a single HTTP call.
 * Each app will be represented by an `HTTPApp` instance.
 * They will then be called back via HTTP by Parula core
 * once they are invoked.
 */
export default class HTTPAppHub {
  /**
   * @param client {Client}
   * @param expressApp {Express}
   */
  constructor(client, expressApp) {
    this._client = client; // {Client}
    this.apps = []; // {Array of AppBase}

    expressApp.put(`/app/http`, express.json(), (req, resp) => catchHTTPJSON(req, resp, async () =>
      await this.registerApp(req.body)));
  }

  /**
   * A Parula HTTP app tells us about its existance.
   *
   * @param json {
   *   appID {string}
   *   url {URL as string}
   *   intents {JSON}
   * }
   */
  async registerApp(json) {
    let app = new HTTPApp(json.appID, json.url, json.authKey);
    await app.load("en");
    app.loadIntentsJSON(json.intents);
    this.apps.push(app);
    await this._client.intentParser.loadApp(app);
  }
}
