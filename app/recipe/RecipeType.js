import { Observable } from "../../util/Observable.js";
import { ArrayColl } from "svelte-collections";

let lastID = 0;

export class Recipe extends Observable {
  /** @param {string} */
  constructor(name) {
    super();
    this._id = lastID++;
    this._name = name;
    /** { ArrayColl<URLString>} */
    this.pictures = new ArrayColl();
    /** Text that describes more what this meal is.
     * May be multiple paragraphs.
     * Not the steps to prepare it.
     * {string} */
    this.description = null;
    /** { ArrayColl<Ingredient>} */
    this.ingredients = new ArrayColl();
    /** { ArrayColl<CookingStep>} */
    this.steps = new ArrayColl();
    this._servings = 0;
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

  /** How many people the ingredients amount will feed.
   * E.g. 2 slices of bread and 1 egg (ingredients) for 2 servings. 
   * The assumption is that the cook can multiply the ingredients
   * to feed more or less people. 
   * {number} */
   get servings() {
    return this._servings;
  }
  set servings(val) {
    let oldServings = this._servings;
    this._servings = val;
    if (oldServings == undefined) {
      return;
    }
    let multiplier = this._servings / oldServings;
    for (let ingredient of this.ingredients) {
      ingredient.amount *= multiplier;
    }
  }

  /**
   * @param servings {number}
   * @returns {Recipe}
   */
  newPreparation(servings) {
    let copy = this.clone();
    copy.servings = servings;
    for (let ingredient of copy.ingredients) {
      ingredient.done = false;
      ingredient.amount = ingredient.amount / this.servings * copy.servings;
    }
    for (let step of copy.steps) {
      step.ongoing = false;
      step.done = false;
    }
    return copy;
  }

  clone() {
    let copy = new Recipe(this.name);
    copy.description = this.description;
    copy.servings = this.servings;
    copy.pictures.addAll(this.pictures);
    copy.ingredients.addAll(this.ingredients.map(i => i.clone()));
    copy.steps.addAll(this.steps.map(i => i.clone()));
    return copy;
  }
}
