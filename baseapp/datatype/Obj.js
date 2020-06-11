
/**
 * An application object.
 * May be an argument or result of an Intent.
 */
export class Obj {
  constructor() {
  }

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
   * What we can display to the user.
   *
   * Does not have to be unique.
   * @returns {string}
   */
  get name() {
    throw new Error("Implement");
  }

  /**
   * How much the user will like this object compared to other
   * objects of the same type. Or how likely he is to mean this.
   *
   * @returns {float} 0..1, whereas
   *   0.1 = very much
   *   0.5 = average
   *   1 = not at all
   */
  get score() {
    return 0.5;
  }
}
