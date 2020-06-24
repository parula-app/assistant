import { HTTPApp } from './HTTPApp.js';
import { assert } from '../../../util/util.js';
import express from 'express';
import http from 'http';

const kPort = 12777;

/**
 */
export class HTTPAppHub {
  /**
   * @param client {Client}
   */
  constructor(client) {
    this.apps = []; // {Array of AppBase}
    this._client = client; // {Client}
    this._expressApp = null; // {Express}
  }

  async start() {
    await this._createServer();
  }

  async _createServer() {
    let expressApp = this._expressApp = express();
    let server = http.createServer(expressApp);
    //expressApp.set("json spaces", 2);
    await listen(server, kPort);

    expressApp.put(`/app/http`, express.json(), (req, resp) => catchHTTPJSON(req, resp, async () =>
      await this.registerApp(req.body)));
  }

  /**
   * A Pia HTTP app tells us about its existance.
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

/**
 * Calls `func`, returns the JSON as response to the HTTP client,
 * and catches exceptions and returns them to the HTTP client.
 *
 * @param func {async function} A function that returns JSON
 */
async function catchHTTPJSON(request, response, func) {
  try {
    let json = await func();
    response.json(json || { success: true });
  } catch (ex) {
    console.error(ex);
    response.status(ex.httpErrorCode || 400).json({
      errorMessage: ex.message,
      errorCode: ex.code,
    });
  }
}

class HTTPError extends Error {
  constructor(httpErrorCode, message) {
    super(message);
    this.httpErrorCode = httpErrorCode;
  }
}

/**
 * http server listen() returns and then errors out.
 * This function allows to await it, including in error cases.
 *
 * https://github.com/nodejs/node/issues/21482
 */
function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.listen(port)
      .once('listening', resolve)
      .once('error', ex => {
        if (ex.code == "EADDRINUSE") {
          reject(new Error(`Pia is already running on port ${kPort}`));
        } else {
          reject(ex);
        }
      });
  });
}
