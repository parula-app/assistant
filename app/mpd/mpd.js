//import { MPC } from 'mpc-js';
import * as mpcjs from 'mpc-js';
const MPC = mpcjs.default.MPC;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';

export default class MPD extends JSONApp {
  constructor() {
    super("mpd", "app/mpd/");
  }

  async load(lang) {
    await super.load(lang);
    await this.loadSongs();
  }

  async loadSongs() {
    let songType = this.dataTypes["SongTitle"];
    let artistType = this.dataTypes["Artist"];
    let startTime = new Date();
    let mpc = await this.connect();
    // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
    let artistSongs = await mpc.database.list('Title', [], [ 'Artist' ]);
    for (let artistEntry of artistSongs.entries()) {
      let artist = artistEntry[0][0];
      let songs = artistEntry[1];
      if (artist) {
        artistType.addValue(artist);
      }
      for (let title of songs) {
        if (title) {
          songType.addValue(title);
        }
      }
    }
    console.info('Read %d songs in %dms', songType.valueIDs.length, new Date() - startTime);
  }

  /**
   * @returns { MPC }
   */
  async connect() {
    let mpc = new MPC();
    let config = getConfig();
    console.info("Loading from MPD at " + config.mpc.server);
    await mpc.connectTCP(config.mpc.server, config.mpc.port || 6600);
    return mpc;
  }

  /**
   * Command
   * @param args {object}
   *    song {string}
   *    artist {string}
   */
  async playMusic(args) {
    let song = args.song;
    let artist = args.artist;
    if (!song && !artist) {
      throw new Error("I found no such song");
    }

    let mpc = await this.connect();
    // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
    await mpc.currentPlaylist.clear();
    if (song && artist) {
      await mpc.database.findAdd([['Title', song], ['Artist', artist]]);
    } else if (song) {
      await mpc.database.findAdd([['Title', song]]);
    } else if (artist) {
      await mpc.database.findAdd([['Artist', artist]]);
    }
    await mpc.playback.play();

    //let songs = await mpc.database.find([['Title', searchText]]);
    //console.log(songs.map(song => ({ title: song.title, artist: song.artist, file: song.path })));
    let songObj = (await mpc.currentPlaylist.playlistInfo(0))[0];
    if (songObj) {
      console.log("\nPlaying: " + songObj.title + " by " + songObj.artist + "\n");
    } else {
      console.error("No such song found");
    }
  }
}
