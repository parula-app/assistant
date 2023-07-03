import { Observable } from "../../util/Observable.js";

let lastID = 0;

/** Which materials are needed to make this meal */
export class Ingredient extends Observable {

  constructor() {
    super();
    this._id = lastID++;
    this._name = null;
    /** How much, in `unit`, per servings (in Recipe) */
    this.amount = null;
    /** Unit of measure
     * E.g. "liter", "tea spoon", or "cup" */
    this.unit = null;
    /* Whether the cook has the ingredient */
    this.done = false;
  }

  get name() {
    return this._name;
  }
  set name(val) {
    this._name = val;
  }
  get id() {
    return this._id;
  }

  clone() {
    let copy = new Ingredient();
    Object.assign(copy, this);
    return copy;
  }
}
