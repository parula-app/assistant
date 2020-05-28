import r2 from 'r2';
import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

export default class TuneIn extends JSONApp {
  constructor() {
    super("tunein");
    this._genres = new Map(); // title -> Genre JSON
    this._stations = new Map(); // name -> Station JSON
  }

  async load(lang) {
    await super.load(lang);
    await this.loadStations();
  }

  async loadStations() {
    let genres = JSON.parse(await readFileAsync(this.dataDir + "genres-stations.json"));
    for (let genre of genres) {
      this.loadGenre(genre);
    }
  }

  loadGenre(genre) {
    let stationType = this.dataTypes.Station;
    let genreType = this.dataTypes.Genre;

    genreType.addValue(genre.title);
    this._genres.set(genre.title, genre);

    for (let station of genre.popularStations || []) {
      stationType.addValue(station.name);
      this._stations.set(station.name, station);
    }
    for (let station of genre.stations || []) {
      stationType.addValue(station.name);
      this._stations.set(station.name, station);
    }
    delete genre.stations;

    for (let subgenre of genre.subgenres || []) {
      this.loadGenre(subgenre);
    }
  }

  /**
   * Command
   * @param args {object}
   *    Station {string}
   * @param client {ClientAPI}
   * @returns {URL}  The streaming MP3
   */
  async playStation(args, client) {
    assert(args.Station, "Need station");
    let station = this._stations.get(args.Station);
    if (!station) {
      throw this.error("not-found-station");
    }
    return await this._playStation(station, client);
  }

  /**
   * Command
   * @param args {object}
   *    Genre {string}
   * @param client {ClientAPI}
   * @returns {URL}  The streaming MP3
   */
  async playGenre(args, client) {
    assert(args.Genre, "Need genre");
    let genre = this._genres.get(args.Genre);
    if (!genre) {
      throw this.error("not-found-genre");
    }
    let stations = genre.popularStations && genre.popularStations.length ? genre.popularStations : genre.stations || [];
    if (!stations.length) {
      throw this.error("not-found-station-in-genre");
    }
    let station = pickRandom(stations);
    let session = client.userSession;
    session.currentStation = station;
    session.stations = stations;

    // Add the chosen station as result
    let stationType = this.dataTypes.Station;
    if (stationType.terms.includes(station.name)) {
      client.addResult(station.name, stationType);
    }

    return await this._playStation(station, client);
  }

  /**
   * Internal helper function
   * Starts playing the station
   * @param station {station from JSON}
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
  * Returns a random element from the array
  * @param array {Array}
  * @returns {Object} one array element
  */
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}
