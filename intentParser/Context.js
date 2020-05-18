import { Intent } from "../baseapp/Intent.js";
import { DataType } from "../baseapp/datatype/DataType.js";

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
    this._results = [];
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
   * @returns {Obj map parameterName {string} -> value {any}}
   */
  get args() {
    return this._args;
  }

  /**
   * @returns {Obj map parameterName {string} -> {
   *   value {any}  result
   *   dataType {DataType} type of value
   * }
   */
  get results() {
    return this._results;
  }

  /**
   * The result of the Intent.
   * This allows subsequent commands to use the
   * result of the Intent as input.
   *
   * Must not repeat the input,
   * i.e. the objects in the Intent `args` are not repeated here.
   *
   * Called by ClientAPI.addResult(), which is called by the app Intent.
   *
   * @param result {any}
   * @param dataType {DataType}
   */
  addResult(result, dataType) {
    assert(dataType instanceof DataType);
    console.log("Result", dataType.id, result);
    assert(!Object.values(this.args).includes(result), "Input must not be repeated in result");
    this._results.push({
      value: result,
      dataType: dataType,
    });
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
