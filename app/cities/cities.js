import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';
import langCodes from 'iso-639-1';
import fs from 'fs';
import readline from 'readline';

/**
 * Primary purpose of this app is to load cities into the LocationDataType
 * for use as location by other apps.
 *
 * @see LocationDataType for more info
 */
export default class Cities extends JSONApp {
  constructor() {
    super("cities");
    /**
     * {LocationDataType}
     */
    this._dataType = null;
    /**
     * {ISO 2-letter code {string} -> Country {JSON}}
     */
    this._countries = new Map();

    let config = getConfig().homeLocation;
    this._lat = config.lat;
    this._lon = config.lon;
    if (!config.lat) {
      config.log("\nPlease set your city and lat/lon GPS coordinates in config.homeLocation. This is needed for any location lookups.\n");
    }
  }

  async load(lang) {
    await super.load(lang);
    this._dataType = this.dataTypes["Pia.Location"];
    //assert(this._dataType instanceof LocationDataType);

    console.time("Loading cities");
    await this.loadCountries();
    await this.loadCities();
    console.timeEnd("Loading cities");

    for (let city of this._dataType.valueIDs.sort((a, b) => a.distance - b.distance)) {
      console.log(city.name, city.distance, city.population);
    }
    console.log(`Kept ${ this._dataType.valueIDs.length } cities`);
  }

  async loadCountries(lang) {
    await this.readByLine(this.dataDir + "countryInfo.txt", "\t", fields => this.processCountry(fields));
  }

  async loadCities(lang) {
    // Read all 140000 cities and villages of the world
    await this.readByLine(this.dataDir + "cities1000.txt", "\t", fields => this.processCity(fields));
  }

  /**
   * Reads a CSV file line by line, and feeds it line by line to `processFunc()`
   *
   * @param filename {string} relative file path
   * @param fieldSeparator {string} single character or regexp to split the fields of a single line
   * @param processFunc {Function(fields {Array of string})} Called for each line, with an array of the fields
   */
  async readByLine(filename, fieldSeparator, processFunc) {
    const fileStream = fs.createReadStream(filename);
    const readByLine = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity, // takes '\r\n' are 1 linebreak
    });

    for await (let line of readByLine) {
      try {
        processFunc(line.split(fieldSeparator));
      } catch (ex) {
        console.error(ex);
      }
    }
  }

  /**
   * @param fields {Array of string} in order:
   * 0. geonameid         : integer id of record in geonames database
   * 1. name              : name of geographical point (utf8) varchar(200)
   * 2. asciiname         : name of geographical point in plain ascii characters, varchar(200)
   * 3. alternatenames    : name in other languages, comma separated, varchar(10000)
   * 4. latitude          : latitude in decimal degrees (wgs84)
   * 5. longitude         : longitude in decimal degrees (wgs84)
   * 6. feature class     : see http://www.geonames.org/export/codes.html, char(1)
   * 7. feature code      : see http://www.geonames.org/export/codes.html, varchar(10)
   * 8. country code      : ISO-3166 2-letter country code, 2 characters
   * 9. cc2               : alternate country codes, comma separated, ISO-3166 2-letter country code, 200 characters
   * 10. admin1 code       : fipscode (soon iso code), see file admin1Codes.txt for display names of this code; varchar(20)
   * 11. admin2 code       : code for the second administrative division, a county in the US, see file admin2Codes.txt; varchar(80)
   * 12. admin3 code       : code for third level administrative division, varchar(20)
   * 13. admin4 code       : code for fourth level administrative division, varchar(20)
   * 14. population        : bigint (8 byte int)
   * 15. elevation         : in meters, integer
   * 16. dem               : digital elevation model, srtm3 or gtopo30, average elevation of 3''x3'' (ca 90mx90m) or 30''x30'' (ca 900mx900m) area in meters, integer. srtm processed by cgiar/ciat.
   * 17. timezone          : the iana timezone id (see file timeZone.txt) varchar(40)
   * 18. modification date : date of last modification in yyyy-MM-dd format
   */
  processCity(fields) {
    let city = {
      name: fields[1],
      //alternativeNames: fields[3].split(",").filter(n => n),
      population: parseInt(fields[14]),
      lat: parseFloat(fields[4]),
      lon: parseFloat(fields[5]),
      countryCode: fields[8],
      timezone: fields[17],
      modDate: new Date(fields[18]),
    };

    // determine whether to add this city,
    // depending on population size and distance from user
    const kLonMultiplier = 0.5;
    let distance = Math.abs(city.lat - this._lat) + Math.abs(city.lon - this._lon) * kLonMultiplier;
    // if distance > roughly 100-200 km, drop cities < 10000 population
    // if distance > roughly 1000 km, drop cities < 100000 population
    // if distance > roughly 5000 km, drop cities < 1000000 population
    // keep all cities world-wide > 1000000 population
    /* but this is too coarse:
    if (distance > 2 && city.population < 10000 ||
      distance > 8 && city.population < 100000 ||
      distance > 50 && city.population < 1000000) {
      return;
    } so calculate the ratio of population and distance² */
    if (distance > 1 &&
      city.population / (distance * distance) < 1000) {
      return;
    }
    city.distance = distance;

    this._dataType.addValue(city.name, city);
    /*for (let alternativeName of city.alternativeNames) {
      this._dataType.addValue(alternativeName, city);
    }*/
  }

  /**
   * @param fields {Array of string} in order:
   * 0. ISO code 2 letter
   * 1. ISO code 3 letter
   * 2. ISO code numeric
   * 3. FIPS
   * 4. Name, in English
   * 5. Capital city
   * 6. Size. Area in km² {integer}
   * 7. Population/inhabitants {integer}
   * 8. Continent
   * 9. Internet top level domain, with dot, e.g. ".de"
   * 10. Currency, 3 letter code, e.g. "EUR"
   * 11. Currency name in English, e.g. "Euro"
   * 12. Telephone dial code, without +, e.g. 49
   * 13. Postal Code Format, whereby # is a digit and @ is a letter
   * 14. Postal Code Regex
   * 15. languages, comma-separated list of locales, 2 or 5 chars
   * 16. geoname ID
   * 17. neighbor countries. comma-separated list of 2-letter ISO codes
   * 18. Equivalent FIPS code
   */
  processCountry(fields) {
    if (!fields[0] || fields[0][0] == "#") { // empty line or comment
      return;
    }
    let country = {
      name: fields[4],
      population: parseInt(fields[7]),
      continent: fields[8],
      isoCode: fields[0],
      neighbors: fields[17].split(",").filter(n => n),
      phonePrefix: parseInt(fields[12]),
      lang: fields[15].substr(0, 2),
    };
    this._dataType.addValue(country.name, country);
    this._countries.set(country.isoCode, country);
  }

  where(args, client) {
    let location = args.Location;
    assert(location, "Need the location");
    if (location.continent) {
      let neighborCountries = location.neighbors.map(isoCode => {
        let country = this._countries.get(isoCode);
        return country ? country.name : isoCode;
      }).join(", ");
      return this.getResponse("where-country", {
        location: location.name,
        continent: location.continent,
      }) + " \n" + neighborCountries;
    } else {
      let country = this._countries.get(location.countryCode);
      return this.getResponse("where-city", {
        location: location.name,
        country: country ? country.name : "",
      });
    }
  }

  population(args, client) {
    let location = args.Location;
    assert(location, "Need the location");
    if (location.modTime) {
      return this.getResponse("population-at-year", {
        location: location.name,
        population: location.population,
        year: location.modDate.getFullYear(),
      });
    } else {
      return this.getResponse("population", {
        location: location.name,
        population: location.population,
      });
    }
  }

  language(args, client) {
    let location = args.Location;
    assert(location, "Need the location");
    let lang = location.lang;
    if (!lang && location.countryCode) {
      let country = this._countries.get(location.countryCode);
      if (country) {
        lang = country.lang;
      }
    }
    let langName = langCodes.getName(lang); // TODO returns English
    // langCodes.getNativeName(lang); // returns thier language, not ours
    return this.getResponse("language", {
      location: location.name,
      language: langName,
    });
  }

  info(args, client) {
    return this.where(args, client) + " \n" +
      this.population(args, client) + " \n" +
      this.language(args, client);
  }
}
