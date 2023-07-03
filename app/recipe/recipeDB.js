import { Recipe } from './RecipeType.js';
import { Ingredient } from './Ingredient.js';
import { CookingStep } from './CookingStep.js';
import { getTime, wordToNumber } from '../../util/time.js';
import { ArrayColl } from "svelte-collections"
import csvParser from "csvtojson";
import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);

/**
 * Takes 160 ms for 7000 recipes
 * @returns ArrayColl<Recipe>
 */
export async function loadRecipes(dataDir) {
  console.time("Loading recipes");
  let allRecipes = new ArrayColl();
  let response = await readFileAsync(dataDir + "recipes.csv", "utf8");
  const json = await csvParser().fromString(response.toString());
  for (let fields of json) {
    try {
      let name = fields.recipe_name;
      let recipe = new Recipe(name);
      let ingredientsStrs = fields.ingredients?.split(", ");
      let ingredient;
      for (let ingredientStr of ingredientsStrs) {
        let ingredientFields = ingredientStr.split(" ");
        let amount = wordToNumber(ingredientFields[0]);
        if (!amount && ingredient) { // TODO
          ingredient.name += ", " + ingredientStr;
          continue;
        }
        ingredient = new Ingredient();
        ingredient.amount = amount;
        ingredient.unit = ingredientFields[1];
        ingredient.name = ingredientFields.slice(2).join(" ");
        recipe.ingredients.add(ingredient);
      }
      let stepsStrs = fields.directions?.split(". ");
      for (let stepStr of stepsStrs) {
        let step = new CookingStep();
        step.description = stepStr;
        step.duration = getTime(step.description);
        recipe.steps.add(step);
      }
      let pic = fields.img_src;
      if (pic) {
        recipe.pictures.add(pic);
      }
      recipe.servings = parseInt(fields.servings);
      allRecipes.add(recipe);
    } catch (ex) {
      console.log("Failed to parse recipe:", fields);
      console.error(ex);
    }
  }
  console.timeEnd("Loading recipes");
  console.log(`Found ${ allRecipes.length } recipes`);
  return allRecipes;
}
