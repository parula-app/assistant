//import { MPC } from 'mpc-js';
import * as mpcjs from 'mpc-js';
const MPC = mpcjs.default.MPC;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';

const kArtistSeparator = " by ";

/**
 * API doc:
 * <https://www.npmjs.com/package/mpc-js>
 * <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
 */
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
    //
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
    if (this._mpc) {
      // TODO check whether the connection is still alive
      return this._mpc;
    }
    let mpc = new MPC();
    let config = getConfig();
    console.info("Loading from MPD at " + config.mpc.server);
    await mpc.connectTCP(config.mpc.server, config.mpc.port || 6600);
    this._mpc = mpc;
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

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async stop(args, client) {
    let mpc = await this.connect();
    await mpc.playback.stop();
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async next(args, client) {
    let mpc = await this.connect();
    await mpc.playback.next();
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async previous(args, client) {
    let mpc = await this.connect();
    await mpc.playback.previous();
  }

  /**
   * Command
   * @param args {object}
   *    Volume {Number} 0..100
   * @param client {ClientAPI}
   */
  async volume(args, client) {
    let volume = args.Volume;
    if (!volume) {
      throw new Error("Need new volume as number");
    }
    // Range 0..100
    if (volume < 0 || volume > 100) {
      throw new Error("Volume number too high or too low");
    }
    // We'll interpret 0..10 as if 10 is the max
    if (volume > 0 && volume <= 10) {
      volume *= 10;
    }
    let mpc = await this.connect();
    await mpc.playbackOptions.setVolume(volume);
  }

  /**
   * Command
   * @param args {object}
   *    RelativeVolume {Number}  -10..10
   * @param client {ClientAPI}
   */
  async relativeVolume(args, client) {
    let relativeVolume = args.RelativeVolume;
    if (!relativeVolume) {
      throw new Error("Need relative volume");
    }
    // Range -10..10
    if (relativeVolume < -10 || relativeVolume > 10) {
      throw new Error("Relative volume too high or too low");
    }
    // Convert to range -100..100
    relativeVolume *= 10;

    let mpc = await this.connect();
    let status = await mpc.status.status();
    await mpc.playbackOptions.setVolume(status.volume + relativeVolume);
  }
}
