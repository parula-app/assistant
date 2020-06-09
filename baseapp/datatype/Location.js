import { Obj } from './Obj.js';

/**
 * An application object for a geographic location.
 * Can be a country, city, business, monument or park, etc..
 */
export class Location extends Obj {
  /**
   * Unique ID for this object.
   * Wherever possible, this should be an inherent property of the
   * underlying entity.
   *
   * Must be stable at least within the runtime of the app.
   * If possible, use a property that is stable after restarts, too.
   * @returns {string or number}
   */
  get id() {
    throw new Error("Implement");
  }

  /**
  *  What the user says to mean this place.
   * What we can display to the user.
   *
   * Does not have to be unique.
   * @returns {string}
   */
  get name() {
    throw new Error("Implement");
  }

  /**
   * Latitude in GPS coordinates
   * @returns {float}
   */
  get lat() {
    throw new Error("Implement");
  }

  /**
   * Longitude in GPS coordinates
   * @returns {float}
   */
  get lon() {
    throw new Error("Implement");
  }
}
