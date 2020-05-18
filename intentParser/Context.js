import { Intent } from "../baseapp/Intent.js";

/**
 * @see ClientAPI.context
 */
export class Context {
  /**
   * @param intent {Intent}
   * @param args {Map of Object}
   */
  constructor(intent, args) {
    assert(intent instanceof Intent);
    this._intent = intent;
    this._args = args;
    this._startTime = new Date();
    this._objects = null;
  }

  /**
   * @returns {Intent}
   */
  get intent() {
    return this._intent;
  }

  /**
   * @returns {AppBase}
   */
  get app() {
    return this._intent.app;
  }

  /**
   * @returns {Map of Object}
   */
  get args() {
    return this._args;
  }

  /**
   * When this command was started.
   * @returns {Date}
   */
  get startTime() {
    return this._startTime;
  }

  /**
   * Additional objects that the app intent wants to store.
   *
   * @returns {Array of Object}
   */
  get objects() {
    return this._objects || [];
  }

  /**
   * To be used by app intent.
   *
   * @param obj {Object}
   */
  addObject(obj) {
    if (!this._objects) {
      this._objects = [];
    }
    this._objects.push(obj);
  }
}
