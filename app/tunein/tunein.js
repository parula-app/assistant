import r2 from 'r2';
import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';

export default class TuneIn extends JSONApp {
  constructor() {
    super("tunein", "app/tunein/");
    this._genres = new Map(); // title -> Genre JSON
    this._stations = new Map(); // name -> Station JSON
  }

  async load(lang) {
    await super.load(lang);
    await this.loadStations();
  }

  async loadStations() {
    let genres = JSON.parse(await readFileAsync(this.directory + "fetch/genres-stations.json"));
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
    if (!args.Station) {
      throw new Error("Need station");
    }
    let station = this._stations.get(args.Station);
    if (!station) {
      throw new Error("I don't know this station");
    }
    if (station.stream) {
      client.player.playAudio(station.stream, this, () => this.next({}, client));
      return;
    }
    return await this.playM3U(station.m3u, client);
  }

  /**
   * Command
   * @param args {object}
   *    Genre {string}
   * @param client {ClientAPI}
   * @returns {URL}  The streaming MP3
   */
  async playGenre(args, client) {
    if (!args.Genre) {
      throw new Error("Need genre");
    }
    let genre = this._genres.get(args.Genre);
    if (!genre) {
      throw new Error("I don't know this genre");
    }
    let stations = genre.popularStations && genre.popularStations.length ? genre.popularStations : genre.stations || [];
    if (!stations.length) {
      throw new Error("I found no radio station for this genre");
    }
    let station = pickRandom(stations);
    let session = client.userSession;
    session.currentStation = station;
    session.stations = stations;
    return await this.playM3U(station.m3u, client);
  }

  /**
   * Play songs
   *
   * Starts the audio player
   *
   * @param m3u {URL}
   * @param client {ClientAPI}
   */
  async playM3U(m3u, client) {
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
      throw new Error("The radio station is not available");
    }
    client.player.playAudio(url, this, () => {
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
    client.player.stop();
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
    await this.playM3U(station.m3u, client);
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
    await this.playM3U(station.m3u, client);
  }

  /**
   * Command
   * @param args {object}
   *    Volume {Number} 0..100
   * @param client {ClientAPI}
   */
  async volume(args, client) {
    let volume = args.Volume;
    if (typeof(volume) != "number") {
      throw new Error("Need new volume as number");
    }
    // Range 0..100
    if (volume < 0 || volume > 100) {
      throw new Error("Volume number too high or too low");
    }
    throw new Error("Not yet implemented");
  }

  /**
   * Command
   * @param args {object}
   *    RelativeVolume {Number}  -100..100
   * @param client {ClientAPI}
   */
  async relativeVolume(args, client) {
    let relativeVolume = args.RelativeVolume;
    if (typeof(relativeVolume) != "number") {
      throw new Error("Need relative volume");
    }
    if (relativeVolume < -100 || relativeVolume > 100) {
      throw new Error("Volume number too high or too low");
    }
    throw new Error("Not yet implemented");
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
