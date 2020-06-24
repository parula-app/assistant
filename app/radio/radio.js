import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
import { JSONApp } from '../../baseapp/JSONApp.js';
import { Obj } from '../../baseapp/datatype/Obj.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

export default class Radio extends JSONApp {
  constructor() {
    super("radio");
  }

  async load(lang) {
    await super.load(lang);
    await this.loadStations();
  }

  async loadStations() {
    let stationType = this.dataTypes.Station; // NamedValues
    let genreType = this.dataTypes.Genre; // NamedValues

    let stations = JSON.parse(await readFileAsync(this.dataDir + "stations.json"));
    for (let stationJSON of stations) {
      let station = new Station(stationJSON);
      stationType.addValue(station.name, station);

      // Genres
      for (let genreName of station.tags) {
        let genre = genreType.valueForTerm(genreName);
        if (genre) {
          genre.stations.push(station);
        } else {
          genre = new Genre(genreName, [ station ]);
          genreType.addValue(genreName, genre);
        }
      }
    }
  }

  /**
   * Command
   * @param args {object}
   *    Station {Station}
   * @param client {ClientAPI}
   * @returns {URL}  The streaming MP3
   */
  async playStation(args, client) {
    assert(args.Station && args.Station instanceof Station, "Need station");
    // if (!args.Station) { throw this.error("not-found-station"); }
    return await this._playStation(args.Station, client);
  }

  /**
   * Command
   * @param args {object}
   *    Genre {Genre}
   * @param client {ClientAPI}
   * @returns {URL}  The streaming MP3
   */
  async playGenre(args, client) {
    assert(args.Genre && args.Genre instanceof Genre, "Need genre");
    // if (!genre) { throw this.error("not-found-genre"); }
    let stations = args.Genre.stations;
    if (!stations.length) {
      throw this.error("not-found-station-in-genre");
    }
    let station = pickRandom(stations);
    let session = client.userSession;
    session.currentStation = station;
    session.stations = stations;

    // Add the chosen station as result
    let stationType = this.dataTypes.Station;
    client.addResult(station, stationType);

    return await this._playStation(station, client);
  }

  /**
   * Internal helper function
   * Starts playing the station
   * @param station {Station}
   * @param client {ClientAPI}
   */
  async _playStation(station, client) {
    if (station.stream) {
      await client.player.playAudio(station.stream, this, () => this.next({}, client));
      return;
    }
    return await this._playM3U(station.m3u, client);
  }

  /**
   * Play songs
   *
   * Starts the audio player
   *
   * Not currently used, because the data source resolves the M3U for us.
   *
   * @param m3u {URL}
   * @param client {ClientAPI}
   */
  async _playM3U(m3u, client) {
    console.log("Fetching " + m3u);
    let headers = {
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": client.lang + ",en-US",
      //"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      //"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:76.0) Gecko/20100101 Firefox/76.0 Pia/0.1",
    };
    let m3uContents = await r2(m3u, { headers }).text;
    let url = m3uContents.split("\n")[0];
    if (url.toLowerCase().includes("html")) {
      console.error("Got an HTML page while trying to fetch m3u for the radio station at <" + m3u + ">", m3uContents.substr(0, 50));
      throw this.error("station-not-available");
    }
    await client.player.playAudio(url, this, () => {
      // called when the stream ends
      this.next({}, client);
    });
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async stop(args, client) {
    await client.player.stop();
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async next(args, client) {
    let session = client.userSession;
    let stations = session.stations;
    if (!stations) {
      throw this.error("nothing-playing");
    }
    let station;
    let pos = stations.indexOf(session.currentStation);
    if (!pos) {
      station = pickRandom(stations);
    } else {
      pos++;
      station = stations[pos >= stations.length ? 0 : pos];
    }
    return await this._playStation(station, client);
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async previous(args, client) {
    let session = client.userSession;
    let stations = session.stations;
    if (!stations) {
      throw this.error("nothing-playing");
    }
    let pos = stations.indexOf(session.currentStation);
    if (!pos) {
      station = pickRandom(stations);
    } else {
      pos--;
      station = stations[pos < 0 ? stations.length - 1 : pos];
    }
    return await this._playStation(station, client);
  }

  /**
   * Command
   * @param args {object}
   *    Volume {Number} 0..100
   * @param client {ClientAPI}
   */
  async volume(args, client) {
    let volume = args.Volume;
    assert(typeof(volume) == "number", "Need new volume as number");
    // Range 0..100
    if (volume > 100) {
      throw this.error("volume-too-high");
    }
    if (volume < 0) {
      throw this.error("volume-too-low");
    }

    await client.player.setVolume(volume);
  }

  /**
   * Command
   * @param args {object}
   *    RelativeVolume {Number}  -100..100
   * @param client {ClientAPI}
   */
  async relativeVolume(args, client) {
    let relativeVolume = args.RelativeVolume;
    assert(typeof(relativeVolume) == "number", "Need relative volume");
    if (relativeVolume > 100) {
      throw this.error("relative-volume-too-high");
    }
    if (relativeVolume < -100) {
      throw this.error("relative-volume-too-low");
    }

    await client.player.setRelativeVolume(relativeVolume);
  }
}

/**
 * A radio station
 */
class Station extends Obj {
  /**
   * @param json {Object}
   */
  constructor(json) {
    super();
    this._id = json.name; // {string}
    this._name = json.name; // {string}
    this.stream = json.stream; // {URL as string}   Direct HTTP URL to the mp3 stream
    this.m3u = json.m3u; // {URL as string}   HTTP URL to the M3U playlist, which in turn contains the stream URLs
    this.tags = json.tags; // {Array of string}
  }
  get id() {
    return this._id;
  }
  get name() {
    return this._name;
  }
}

/**
 * A music genre
 * with a list of radio stations
 */
class Genre extends Obj {
  /**
   * @param name {string}
   * @param stations {Array of Station}
   */
  constructor(name, stations) {
    super();
    this._id = name; // {string}
    this._name = name; // {string}
    this.stations = stations; // {Array of Station}
  }
  get id() {
    return this._id;
  }
  get name() {
    return this._name;
  }
}


/**
  * Returns a random element from the array
  * @param array {Array}
  * @returns {Object} one array element
  */
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}
