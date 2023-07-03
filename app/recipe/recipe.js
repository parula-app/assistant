import { JSONApp } from '../../baseapp/JSONApp.js';
import { loadRecipes } from './recipeDB.js';

/**
 * Primary purpose of this app is to load cities into the LocationDataType
 * for use as location by other apps.
 *
 * @see LocationDataType for more info
 */
export default class RecipeApp extends JSONApp {
  constructor() {
    super("recipe");
    this._recipes = [];
  }

  async load(lang) {
    await super.load(lang);
    let mealDataType = this.dataTypes.Meal;
    this._recipes = await loadRecipes(this.dataDir);
    for (let recipe of this._recipes) {
      mealDataType.addValue(recipe.name, recipe);
    }
  }

  show(args, client) {
    let meal = args.Meal;
    return this.getResponse("recipe", {
      name: meal.name,
      ingredients: meal.ingredients.map(i => i.name),
      steps: meal.steps.map(i => i.description),
    });
  }
}
