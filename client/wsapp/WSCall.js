import { assert } from '../../util/util.js';

/**
 * Creates a very thin generic wrapper around WebSockets that allows to make
 * request/response function calls.
 *
 * It implements:
 * - The notion of paths to call a specific function on the other end
 * - The notion of a response to a call, or an exception
 * - async waiting for the response
 *
 * To expose a function, you `register()` it,
 * which allows the other side to call it.
 * To call a function on the other side, you use `await makeCall()`.
 *
 * E.g. server:
 * register("/user", arg => {
 *   if (!name) {
 *     throw new Error("I don't know what you're talking about");
 *   }
 *   return "I've seen " + arg.name + " before, yes";
 * })
 * client:
 * let result = await makeCall("/user", { name: "Fred" });
 * result == "I've seen Fred before, yes";
 * whereas:
 * await makeCall("/user", { license: "4" });
 * throws an exception with .message == "I don't know what you're talking about";
 */
export class WSCall  {
  /**
   * @param webSocket {WebSocket from ws}
   */
  constructor(webSocket) {
    assert(typeof(webSocket.on) == "function");

    /**
     * Obj map ID {string} ->
     */
    this._functions = {};

    /**
     * Obj map ID {string} -> {
     *   resolve {function(result)} called when the function succeeded
     *   reject {function(ex)}  called when the function had an error or exception on the other end
     * }
     */
    this._callsWaiting = {};

    this._lastID = 0;

    this._webSocket = webSocket;
    webSocket.on("message", message => this._incomingMessage(message));
  }

  /**
   * @param path {string}  URL relative to the root, e.g. "/app/user"
   * @param func {async function(arg)} will be called when the path is invoked
   *   arg {Object} parameter from the caller
   *   Whatever the function returns will be sent back to the caller.
   *   If the function throws, the error .message {string} and .code {string} will
   *   be sent to the caller as exception.
   */
  register(path, func) {
    assert(path && typeof(path) == "string");
    assert(typeof(func) == "function");
    this._functions[path] = func;
  }

  _incomingMessage(message) {
    try {
      message = JSON.parse(message);
    } catch (ex) {
      return;
    }
    if (!message.id || !(message.path || message.success || message.error)) {
      return; // not for us
    }
    try {
      if (message.success || message.error) {
        // We called a function on the other side, and they responded
        this._response(message);
        return;
      }
      // The other side is calling a function here
      let func = this._functions[message.path];
      assert(func, "404 " + message.path + ": No such function registered");
      let result = func(message.arg); // TODO await?
      this._webSocket.send(JSON.stringify({
        id: message.id,
        success: true,
        result: result,
      }));
    } catch (ex) {
      console.error(ex);
      this._webSocket.send(JSON.stringify({
        id: message.id,
        error: true,
        message: ex.message,
        code: ex.code,
        //exception: ex,
      }));
    }
  }

  /**
   * Calls a function on other side
   */
  async makeCall(path, arg) {
    assert(path && typeof(path) == "string");
    assert(!arg || typeof(arg) == "object");

    return new Promise((resolve, reject) => {
      let id = this._generateID();
      this._callsWaiting[id] = {
        resolve: resolve,
        reject: reject,
      };
      this._webSocket.send(JSON.stringify({
        id: id,
        path: path,
        arg: arg,
      }));
      // message will be processed on the other side
      // then they will send us a response with message.result
    });
  }

  _response(message) {
    let callWaiting = this._callsWaiting[message.id];
    delete this._callsWaiting[message.id];
    assert(callWaiting, "Got a response for call ID " + message.id + ", but we did not make such a call, or we already got the response for it");
    if (message.error) {
      let ex = new Error();
      ex.message = message.message;
      ex.code = message.code;
      try {
        callWaiting.reject(ex);
      } catch (ex) {
        console.error("Our error handling threw");
        console.error(ex);
      }
      return;
    } else if (message.success) {
      try {
        callWaiting.resolve(message.result);
      } catch (ex) {
        console.error(ex); // TODO remove
        callWaiting.reject(ex); // TODO can I call reject() after resolve()?
      }
    } else {
      throw new Error("Not reached");
    }
  }

  _generateID() {
    return this._lastID++;
  }
}
