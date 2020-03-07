//import { MPC } from 'mpc-js';
const MPC = require('mpc-js').MPC;
const config = require('../../config.json');

export async function load() {
  await loadSongs();
}

async function loadSongs() {
  let startTime = new Date();
  let mpc = new MPC();
  console.info("Connecting to MPD at " + config.mpc.server);
  await mpc.connectTCP(config.mpc.server, config.mpc.port || 6600);
  // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
  let artistSongs = await mpc.database.list('Title', [], [ 'Artist' ]);
  validInput = [];
  for (let artistEntry of artistSongs.entries()) {
    let artist = artistEntry[0][0];
    let songs = artistEntry[1];
    for (let title of songs) {
      validInput.push(title);
      if (artist) {
        validInput.push(title + " by " + artist);
      }
    }
  }
  console.info('Read %d songs in %dms', validInput.length / 2, new Date() - startTime);
}

async function playMusic(searchText) {
  let mpc = new MPC();
  console.info("Connecting to MPD at " + config.mpc.server);
  await mpc.connectTCP(config.mpc.server, config.mpc.port || 6600);
  // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
  await mpc.currentPlaylist.clear();
  if (searchText.includes(" by ")) {
    let [ song, artist ] = searchText.split(" by ");
    await mpc.database.findAdd([['Title', song], ['Artist', artist]]);
  } else {
    await mpc.database.findAdd([['Title', searchText]]);
  }
  await mpc.playback.play();

  //let songs = await mpc.database.find([['Title', searchText]]);
  //console.log(songs.map(song => ({ title: song.title, artist: song.artist, file: song.path })));
  let song = (await mpc.currentPlaylist.playlistInfo(0))[0];
  if (song) {
    console.log("\nPlaying: " + song.title + " by " + song.artist + "\n");
  } else {
    console.log("No such song found");
  }
}
