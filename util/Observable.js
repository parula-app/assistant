import { Obj } from "../baseapp/datatype/Obj.js";

export class Observable extends Obj {
  constructor() {
    super();
    this._observers = [];
    this._properties = {};
  }

  subscribe(observerFunc) {
    if (typeof (observerFunc) != "function") {
      throw new Error("Need function as observer");
    }
    this._observers.push(observerFunc);
    observerFunc(this);
    return () => {
      arrayRemove(this._observers, observerFunc);
    };
  }

  notifyChanged(propertyName) {
    for (const observer of this._observers) {
      try {
        observer(propertyName);
      } catch (ex) {
        console.error(ex);
      }
    }
  }
}

function arrayRemove(array, item) {
  const pos = array.indexOf(item);
  if (pos != -1) {
    array.splice(pos, 1);
  }
}
