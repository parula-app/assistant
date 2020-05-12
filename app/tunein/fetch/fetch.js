import r2 from 'r2';
import { URL, URLSearchParams } from 'url';
import fs from 'fs';
import util from 'util';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const genresFlat = [];

async function fetchServer(params) {
  params.render = 'json';
  params.partnerId = 'hai0ooR0';
  params.serial = 'hai0ooR1';
  let url = 'http://opml.radiotime.com/Browse.ashx?' + new URLSearchParams(params).toString();
  console.info('Fetching ' + url);
  return await r2(url).json;
}

async function fetchTopLevel() {
  // e.g. <http://opml.radiotime.com/Browse.ashx?render=json&c=music>
  let genresJSON = await fetchServer({
    c: 'music',
  });
  let genres = [];
  for (let genreJSON of genresJSON.body) {
    if (genreJSON.guide_id == "g22") { // Countries
      continue;
    }
    let genre = await fetchGenre(genreJSON.guide_id);
    genres.push(genre);
  }
  return genres;
}

/**
 * @returns {
 *   title: 'Electro',
 *   subgenres: [
 *     ... same as this, i.e. hierarchy
 *   ],
 *   popularStations: [
 *     {
 *       name: 'EinsLive',
 *       m3u: 'https://...',
 *       subtitle: 'Nur das beste',
 *       ... @see filterStationJSON()
 *     },
 *     ...
 *   ],
 *   stations: [
 *     ...
 *   ],
 * }
 */
async function fetchGenre(id) {
  let genre = {};
  genre.title = genreJSON.text.replace(/ Music$/, "");
  genre.guide_id = genreJSON.guide_id;
  // e.g. <http://opml.radiotime.com/Browse.ashx?render=json&id=c57941>
  let genreJSON = await fetchServer({
    id: genre.guide_id,
  });
  let stationsJSONParent = getKeyJSON(genreJSON, 'stations');
  if (stationsJSONParent) {
    genre.stations = filterStationJSON(stationsJSONParent.children);
  }
  let relatedJSONParent = getKeyJSON(genreJSON, 'related');
  if (relatedJSONParent) {
    let subgenres = genre.subgenres = [];
    let relatedJSON = relatedJSONParent.children;
    for (let genreJSON of relatedJSON) {
      if (genreJSON.type != 'link' ||
        genreJSON.key) {
        continue;
      }
      let genre = await fetchGenre(genreJSON);
      subgenres.push(genre);
    }

    //let popularStationsURL = getKeyJSON(relatedJSON, 'popular').URL;
    let popularStationsJSON = await fetchServer({
      id: genre.guide_id,
      filter: 's:popular',
    });
    genre.popularStations = filterStationJSON(popularStationsJSON.body);
  }

  let flatCopy = JSON.parse(JSON.stringify(genre));
  delete flatCopy.subgenres;
  genresFlat.push(flatCopy);

  return genre;
}

function getKeyJSON(json, key) {
  return json.body.find(entry => entry.key == key);
}

function filterStationJSON(stationsJSON) {
  let stations = [];
  for (let stationJSON of stationsJSON) {
    if (stationJSON.type != 'audio' ||
      !stationJSON.formats.split(',').includes('mp3')) {
      continue;
    }
    let station = {};
    station.name = stationJSON.text.replace(/ \(.*\)$/, ""); // remove "... (Deutschland)"
    station.m3u = stationJSON.URL;
    station.bitrate = stationJSON.bitrate;
    station.formats = stationJSON.formats;
    station.genre_id = stationJSON.genre_id;
    station.guide_id = stationJSON.guide_id;
    station.reliability = stationJSON.reliability;
    station.image = stationJSON.image;
    station.subtitle = stationJSON.subtitle;
    station.bitrate = stationJSON.bitrate;
    stations.push(station);
  }
  return stations;
}

async function saveResults(results) {
  await writeFileAsync('./genres-stations.json', JSON.stringify(results, null, 2));
  await writeFileAsync('./genres-stations-flat.json', JSON.stringify(genresFlat, null, 2));
}

async function start() {
  try {
    let results = await fetchTopLevel();
    await saveResults(results);
  } catch (ex) {
    console.error(ex);
  }
}

start();
