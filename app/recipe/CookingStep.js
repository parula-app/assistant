import { Observable } from "../../util/Observable.js";

let lastID = 0;

/** What the cook has to do to prepare the meal */
export class CookingStep extends Observable {
  constructor() {
    super();
    this._id = lastID++;
    /** {string} */
    this.description = null;
    /** {number} in seconds. Optional */
    this.duration = null;

    /** Whether the cook is currently performing this step */
    this.ongoing = false;
    /** Whether the cook has finished this step */
    this.done = false;
  }

  get name() {
    return this.description;
  }
  get id() {
    return this._id;
  }

  clone() {
    let copy = new CookingStep();
    Object.assign(copy, this);
    return copy;
  }
}
