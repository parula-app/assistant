//import { MPC } from 'mpc-js';
import * as mpcjs from 'mpc-js';
const MPC = mpcjs.MPC;
import { config } from '../../util.js';

var gArtists = [];
var gSongs = [];

/**
 * @param variableType {string}
 * @returns {Array of string} valid input, as array entry
 */
export async function validVariableValues(variableType) {
  if (variableType == "song") {
    return gSongs;
  } else if (variableType == "artist") {
    return gArtists;
  } else {
    return [];
  }
}

export async function load() {
  await loadSongs();
}

async function loadSongs() {
  let startTime = new Date();
  return; // TODO MPC not loaded
  let mpc = new MPC();
  console.info("Connecting to MPD at " + config.mpc.server);
  await mpc.connectTCP(config.mpc.server, config.mpc.port || 6600);
  // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
  let artistSongs = await mpc.database.list('Title', [], [ 'Artist' ]);
  for (let artistEntry of artistSongs.entries()) {
    let artist = artistEntry[0][0];
    let songs = artistEntry[1];
    gArtists.push(artist);
    for (let title of songs) {
      gSongs.push(title);
      if (artist) {
        gSongs.push(title + " by " + artist);
      }
    }
  }
  console.info('Read %d songs in %dms', gSongs.length / 2, new Date() - startTime);
}

/**
 * Command
 * @param args {object}
 *    song {string}
 *    artist {string}
 */
async function playMusic(args) {
  let song = args.song;
  let artist = args.artist;
  if (!artist && song.includes(" by ")) {
    [ song, artist ] = song.split(" by ");
  }

  let mpc = new MPC();
  console.info("Connecting to MPD at " + config.mpc.server);
  await mpc.connectTCP(config.mpc.server, config.mpc.port || 6600);
  // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
  await mpc.currentPlaylist.clear();
  if (song && artist) {
    await mpc.database.findAdd([['Title', song], ['Artist', artist]]);
  } else {
    await mpc.database.findAdd([['Title', song]]);
  }
  await mpc.playback.play();

  //let songs = await mpc.database.find([['Title', searchText]]);
  //console.log(songs.map(song => ({ title: song.title, artist: song.artist, file: song.path })));
  let songObj = (await mpc.currentPlaylist.playlistInfo(0))[0];
  if (songObj) {
    console.log("\nPlaying: " + songObj.title + " by " + songObj.artist + "\n");
  } else {
    console.log("No such song found");
  }
}
