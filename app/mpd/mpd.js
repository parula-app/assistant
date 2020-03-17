//import { MPC } from 'mpc-js';
import * as mpcjs from 'mpc-js';
const MPC = mpcjs.default.MPC;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';

const kArtistSeparator = " by ";

export default class MPD extends JSONApp {
  constructor() {
    super("mpd", "app/mpd/");
  }

  async load(lang) {
    await super.load(lang);
    await this.loadSongs();
  }

  async loadSongs() {
    let songType = this.dataTypes.SongTitle;
    let artistType = this.dataTypes.Artist;
    let songAndArtistType = this.dataTypes.SongAndArtist;
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
        if (title && artist) {
          songAndArtistType.addValue(title + kArtistSeparator + artist);
        }
      }
    }
    console.info('Read %d songs in %dms', songAndArtistType.valueIDs.length, new Date() - startTime);
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
   *    Song {string}
   *    Artist {string}
   * @param client {ClientAPI}
   */
  async playSong(args, client) {
    let song = args.Song;
    let artist = args.Artist;
    let songAndArtist = args.SongAndArtist;
    if (!song && !artist && songAndArtist) {
      let split = songAndArtist.split(kArtistSeparator);
      if (split.length == 2) {
        song = split[0];
        artist = split[1];
      }
    }
    if (!song && !artist) {
      throw new Error("I found no such song");
    }

    let mpc = await this.connect();
    // <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
    await mpc.currentPlaylist.clear();
    if (song && artist) {
      mpc.database.findAdd([['Title', song], ['Artist', artist]]);
    } else if (song) {
      mpc.database.findAdd([['Title', song]]);
    } else if (artist) {
      mpc.database.findAdd([['Artist', artist]]);
    }
    mpc.playback.play();

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
