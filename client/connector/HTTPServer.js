import { getConfig } from '../../util/config.js';
import express from 'express';
import http from 'http';

const kPort = 12777;

/**
 * Accepts commands in text form via HTTP,
 * runs the NLP and IntentParser and voice apps,
 * and returns the app response as HTTP result.
 *
 * This allows to implement an assistant client/UI
 * in a separate process, and it 
 */
export default class HTTPServer {
  constructor() {
    this._expressApp = null; // {Express}
  }

  async start() {
    await this._createServer();
    return this;
  }

  async _createServer() {
    let port = getConfig()?.core?.httpPort | kPort;
    let expressApp = this._expressApp = express();
    let server = http.createServer(expressApp);
    expressApp.set("json spaces", 2);
    expressApp.use(fromWebsite);
    expressApp.options("/*");
    await listen(server, port);
  }

  get expressApp() {
    return this._expressApp;
  }
}

/**
 * Calls `func`, returns the JSON as response to the HTTP client,
 * and catches exceptions and returns them to the HTTP client.
 *
 * @param func {async function} A function that returns JSON
 */
export async function catchHTTPJSON(request, response, func) {
  try {
    let json = await func();
    response.json(json || { success: true });
  } catch (ex) {
    if (ex.code == "intent-match-failed") {
      ex.httpErrorCode = 422;
    } else {
      console.error(ex);
    }
    response.status(ex.httpErrorCode || 400).json({
      errorMessage: ex.message,
      errorCode: ex.code,
    });
  }
}

export class HTTPError extends Error {
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
          reject(new Error(`Parula is already running on port ${kPort}`));
        } else {
          reject(ex);
        }
      });
  });
}

// CORS to allow our website to call us
export function fromWebsite(request, response, next) {
  // TODO Allows EVERYBODY
  response.header("Access-Control-Allow-Origin", request.headers.origin);
  response.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type,X-AuthToken");
  next();
};
