import { NamedValuesDataType } from './NamedValuesDataType.js';
import { Location } from './Location.js';
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
 * Locations / villages around the contact address
 * with higher granularity and score, and score depending on frequency of contact
 * with that person or address.
 *
 * Also includes locations from personal contacts and calendar.
 * These apps add their location here.
 *
 * The value is an object of type `Location`.
 */
export class LocationDataType extends NamedValuesDataType {
  constructor() {
    super("Pia.Location");
  }

  async load(lang) {
  }

  addValue(term, location) {
    assert(location instanceof Location, "Need a Location object");
    super.addValue(term, location);
  }
}
