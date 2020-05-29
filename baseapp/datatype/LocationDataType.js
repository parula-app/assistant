import { NamedValuesDataType } from './NamedValuesDataType.js';
import { assert } from '../../util/util.js';
import fs from 'fs';
import readline from 'readline';

/**
 * Places like cities or addresses with their name and
 * optionally coordinates.
 *
 * By default, contains a list of large cities of the world,
 * and the villages close to the user. The further away,
 * the larger the city needs to be to be in the list.
 *
 * The score is calculated similarly.
 * Granularity and score depend on current user location from GPS and home.
 * Function of inhabitants in relation to distance.
 * - World biggest cities (all)
 * - cities in continent
 * - mid-size towns in certain distance
 * - small villages around the user.
 *
 * Also includes locations from personal contacts and calendar.
 * These apps add their location here.
 * Not implemented yet: Also locations / villages around the contact address
 * with higher granularity and score, and score depending on frequency of contact
 * with that person or address.
 *
 * The value will be an object with: {
 *   name {string}  What the user says to mean this place
 *   lat {float}   (optional) latitude
 *   lon {float}   (optional) longtitude
 *   population {integer}  (optional) How many inhabitants that country, city or village has
 * }
 */
export class LocationDataType extends NamedValuesDataType {
  constructor() {
    super("Pia.Location");
  }

  async load(lang) {
  }
}
