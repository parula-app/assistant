//import { MPC } from 'mpc-js';
import * as mpcjs from 'mpc-js';
const MPC = mpcjs.default.MPC;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { Obj } from '../../baseapp/datatype/Obj.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';


/**
 * API doc:
 * <https://www.npmjs.com/package/mpc-js>
 * <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
 */
export default class MPD extends JSONApp {
  constructor() {
    super("mpd");
  }

  async load(lang) {
    await super.load(lang);
    await this.loadSongs();
  }

  async loadSongs() {
    const kArtistSeparator = this.getResponse("song-artist-separator"); // " by "
    let songType = this.dataTypes.SongTitle;
    let artistType = this.dataTypes.Artist;
    let songAndArtistType = this.dataTypes.SongAndArtist;
    let startTime = new Date();
    let mpc = await this.connect();
    let artistSongs = await mpc.database.list('Title', [], [ 'Artist' ]);
    for (let artistEntry of artistSongs.entries()) {
      let artistName = artistEntry[0][0];
      let songs = artistEntry[1];
      let artist;
      if (artistName) {
        let score = Math.max(0.8 - (Math.log(songs.length) / Math.log(artistSongs.size)), 0);
        artist = new Artist(artistName, score);
        artistType.addValue(artistName, artist);
      }
      for (let title of songs) {
        if (!title) {
          continue;
        }
        let song = new Song(title, artist);
        songType.addValue(title, song);
        if (title && artistName) {
          let term = title + kArtistSeparator + artistName;
          songAndArtistType.addValue(term, song);
        }
      }
    }
    console.info('Read %d songs in %dms', songAndArtistType.values.length, new Date() - startTime);
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
    let config = getConfig().mpd;
    console.info("Loading from MPD at " + config.server);
    await mpc.connectTCP(config.server, config.port || 6600);
    this._mpc = mpc;
    return mpc;
  }

  /**
   * Command
   * @param args {object}
   *    SongAndArtist {Song}
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async playSongAndArtist(args, client, context) {
    let song = args.SongAndArtist;

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    mpc.database.findAdd([['Title', song.title], ['Artist', song.artist.name]]);
    mpc.playback.play();
    await this.debugShowPlaying();

    let artistType = this.dataTypes.Artist;
    if (song.artist) {
      context.addResult(song.artist, artistType);
    }
  }

  /**
   * Command
   * @param args {object}
   *    Song {Song}
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async playSongTitle(args, client) {
    let song = args.Song;
    if (!song) {
      throw this.error("not-found-song");
    }

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    //mpc.database.findAdd([['Title', song.title], ['Artist', song.artist]]);
    // For cover songs, i.e. multiple songs with the same title from different artists
    mpc.database.findAdd([['Title', song.title]]);
    mpc.playback.play();
    await this.debugShowPlaying();

    // Add Artist as Intent result for subsequent commands
    // (Song is already in the context, as input argument.)
    let artistType = this.dataTypes.Artist;
    //context.addResult(song.artist, artistType);
    // For cover songs
    try {
      let songMPD = await mpc.status.currentSong();
      if (songMPD) {
        let artistName = songMPD.artist;
        let artist = artistType.valueForTerm(artistName);
        if (artist) {
          context.addResult(artist, artistType);
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  /**
   * Command
   * @param args {object}
   *    Artist {Artist}
   * @param client {ClientAPI}
   */
  async playArtist(args, client) {
    let artist = args.Artist;
    if (!artist) {
      throw this.error("not-found-artist");
    }

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    mpc.database.findAdd([['Artist', artist.name]]);
    mpc.playback.play();
    await this.debugShowPlaying();
  }

  async info() {
    let mpc = await this.connect();
    let songObj = await mpc.status.currentSong();
    if (songObj && songObj.title) {
      return this.getResponse(songObj.artist ? "song-info" : "song-info-without-artist", {
        title: songObj.title,
        artist: songObj.artist,
      });
    } else {
      return this.getResponse("donotknow");
    }
  }

  async debugShowPlaying() {
    let mpc = await this.connect();
    let songObj = await mpc.status.currentSong();
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
    assert(typeof(volume) == "number", "Need new volume as number");
    // Range 0..100
    if (volume > 100) {
      throw this.error("volume-too-high");
    }
    if (volume < 0) {
      throw this.error("volume-too-low");
    }

    let mpc = await this.connect();
    await mpc.playbackOptions.setVolume(volume);
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

    let mpc = await this.connect();
    let status = await mpc.status.status();
    await mpc.playbackOptions.setVolume(status.volume + relativeVolume);
  }
}

class Artist extends Obj {
  /**
   * @param name {string} Name of the artist
   * @param score {float}
   */
  constructor(name, score) {
    super();
    this._name = name;
    this._score = score;
  }
  get id() {
    return this._name;
  }
  get name() {
    return this._name;
  }
  get score() {
    return this._score;
  }
}

class Song extends Obj {
  /**
   * @param title {string} Song title, without artist
   * @param artist {Artist} (Optional)
   */
  constructor(title, artist) {
    super();
    this.title = title;
    this.artist = artist;
  }
  get id() {
    return this.title + " - " + (this.artist && this.artist.id || "");
  }
  get name() {
    return this.title + " - " + (this.artist && this.artist.name || "");
  }
}
