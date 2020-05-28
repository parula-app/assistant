import r2 from 'r2';
import { URL, URLSearchParams } from 'url';
import fs from 'fs';
import util from 'util';
import langCode from 'iso-639-1';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

async function fetchServer() {
  let params = {
    order: 'clickcount',
    hidebroken: true,
    reverse: true,
  };
  let url = 'https://de1.api.radio-browser.info/json/stations/bytag/?' + new URLSearchParams(params).toString();
  console.info('Fetching ' + url);
  return await r2(url).json;
}

async function readDownload() {
  let text = await readFileAsync('../../../data/radio/radiobrowserinfo-stations.json');
  return JSON.parse(text);
}

function filterStationJSON(stationsJSON) {
  let stations = [];
  for (let stationJSON of stationsJSON) {
    if (!(
      (stationJSON.codec == 'MP3' || stationJSON.codec == 'OGG') &&
      (!stationJSON.bitrate || stationJSON.bitrate >= 128) &&
      stationJSON.url_resolved &&
      stationJSON.lastcheckok)) {
      continue;
    }
    if (stationJSON.favicon.includes("tunein.com")) {
      stationJSON.favicon = null;
    }
    let station = {};
    station.id = stationJSON.stationuuid; // {string}
    station.name = stationJSON.name; // {string} station name. To display to end user.
    station.stream = stationJSON.url_resolved; // {URL as string} The MP3 stream (not M3U)
    station.codec = stationJSON.codec.toLowerCase(); // {enum as string} "mp3" or "ogg"
    station.bitrate = stationJSON.bitrate; // {integer} 128, 320 etc.
    station.logo = stationJSON.favicon; // {URL as string} station logo as PNG, JPEG, GIF or ICO etc.
    station.homepage = stationJSON.homepage; // {URL as string}
    station.country = stationJSON.countrycode; // {string} 2-letter ISO code
    let lang = stationJSON.language.split(/[,\/ ]/)[0]; // {string} Language name
    station.language = langCode.getCode(lang); // {string} 2-letter ISO code
    station.tags = stationJSON.tags.split(",") // {Array of string}
      .filter(tag => tag && !tag.startsWith("#"));
    station.votes = stationJSON.votes; // {integer}
    stations.push(station);
  }
  stations = stations.sort((a, b) => b.votes - a.votes);
  console.info(`Got ${stations.length} usable stations from ${stationsJSON.length} fetched and prefiltered stations`);
  return stations;
}

function filterTags(stations) {
  // Find the common tags
  let allTags = new Map(); // tag {string} -> count {integer}
  for (let station of stations) {
    for (let tag of station.tags) {
      let count = allTags.get(tag);
      allTags.set(tag, count ? ++count : 1);
    }
  }
  console.info(`Got ${allTags.length} tags`);

  // Keep only the tags that were used at least 5 times
  for (let station of stations) {
    station.tags = station.tags.filter(tag => allTags.get(tag) >= 5);
  }
  return stations;
}

async function saveResults(results) {
  await writeFileAsync('../../../data/radio/stations.json', JSON.stringify(results, null, 2));
}

async function start() {
  try {
    //let results = await fetchServer();
    let results = await readDownload();
    await saveResults(filterTags(filterStationJSON(results)));
  } catch (ex) {
    console.error(ex);
  }
}

start();
