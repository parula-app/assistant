import { getConfig } from '../util/config.js';
import { arrayRemove, assert } from '../util/util.js';
import WebSocket from 'ws';

const kPort = 12779;

/**
 * Distributes the currently running Intent (app) via WebSocket.
 * This allows a client to display a UI for this app.
 *
 * Also allows the client to push new state (`Context`) to Pia core,
 * e.g. when the user makes changes using the UI.
 */
export default class WSContextServer {
  /**
   * @param client {Client}
   */
  constructor(client) {
    assert(client && client.intentParser, "Need Client");
    this._intentParser = client.intentParser;
    this._webSocketConns = []; /** {Array of WS WebSocket} */
  }

  async start() {
    await this._connect();
    console.log("WebSocket Context server started");
    return this;
  }

  /** @returns {WS WebSocket} */
  async _connect() {
    let port = getConfig()?.core?.contextWebSocketPort || kPort;
    let server = new WebSocket.Server({ port: port });
    server.on("connection", connection => {
      try {
        this._newConnection(connection);
      } catch (ex) {
        console.error(ex);
      }
    });
  }

  /**
   * A new UI process connected to core
   * @param connection {WS Connection}
   */
  _newConnection(connection) {
    this._webSocketConns.push(connection);
    console.log("New UI WebSocket connect for context");
    connection.on("close", () => {
      arrayRemove(this._webSocketConns, connection);
    });
    connection.on("message", data => {
      try {
        let json = JSON.parse(data);
        this._incomingContext(json);
      } catch (ex) {
        console.error("Could not parse Context server input on WebSocket");
        console.error(ex);
      }
    });
  }

  /**
   * The user made some action in the UI which creates a new state.
   * The UI has informed us by pushing a new context via the web socket.
   *
   * Add it to context stack.
   * This allows it to be considered as context in the next voice command.
   *
   * @param {plain JS object}
   */
  _incomingContext(json) {
    assert(typeof(json) == "object", "json: Need plain JS object, not JSON string");
    let app = this._intentParser.apps.find(app => app.id == json.app);
    assert(app, `App ID ${json.app} not found`);
    let intent = app.intents[json.intent];
    assert(intent, `Intent name ${json.intent} not found`);

    this._intentParser.clientAPI.newCommand(intent, json.args);
  }

  /**
   * The user invoked an intent command.
   * We tell all WebSocket listeners about it.
   *
   * @param context {Context}
   */
  async broadcast(context) {
    try {
      let jsonStr = JSON.stringify(context.toJSON(), null, 2);
      for (let connection of this._webSocketConns) {
        try {
          connection.send(jsonStr);
          console.log("sent", jsonStr);
        } catch (ex) {
          console.error("Sending context to one of the UIs failed");
          console.error(ex);
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  }
}
