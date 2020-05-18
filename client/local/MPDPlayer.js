import * as mpcjs from 'mpc-js';
const MPC = mpcjs.default.MPC;
import { Player } from '../Player.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

/**
 * Plays audio or video streams using MPD.
 *
 * API doc:
 * <https://www.npmjs.com/package/mpc-js>
 * <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
 */
export default class MPDPlayer extends Player {
  constructor() {
    super();
    this._isPlaying = false;
    this._mpc = null;
  }

  /**
   * @see voice app MPD.connect()
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
   * Start playing a new audio stream
   *
   * @param url {URL as string} URL of an MP3 file
   * @param app {AppBase}  App that started this playback.
   * @param nextCallback {Function}  Called once the playback finished.
   */
  async playAudio(url, app, nextCallback) {
    assert(url && typeof(url) == "string" && url.includes(":"), "mp3 URL required");
    //assert(app instanceof AppBase, "app required");
    assert(typeof(nextCallback) == "function", "nextCallback must be a function");
    this.stop(); // quits any currently running instance
    console.log("Playing audio stream " + url);

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    mpc.currentPlaylist.add(url);
    mpc.playback.play();

    mpc.on('changed-player', () => {
      mpc.status.status().then(status => {
        this._isPlaying = status.state == 'play';
        if (!this._isPlaying) {
          // TODO Did the user stop the playback or was the end of the song reached?
          // What's the "playlist finished" callback?
          // We could turn on the consumption mode and check whether the playlist is empty
          // (it will delete the song after it ended, but not when the user stopped),
          // but that would change the user preferences and also affect the other MPD clients,
          // and we don't want that.
          /*
          try {
            nextCallback();
          } catch (ex) {
            console.error(ex);
          }
          */
        }
      });
    });
  }

  /**
   * An audio or video stream is being played at this moment.
   */
  isPlaying() {
    return this._isPlaying;
  }

  /**
   * Stop the current audio or video stream
   */
  async stop() {
    if (!this._isPlaying) {
      return;
    }
    let mpc = await this.connect();
    mpc.playback.stop();
  }

  /**
   * @param volume {integer} 0..100
   */
  async setVolume(volume) {
    assert(typeof(volume) == "number", "volume required");
    volume = Math.round(volume);
    assert(volume >= 0 && volume <= 100);

    let mpc = await this.connect();
    await mpc.playbackOptions.setVolume(volume);
  }

  /**
   * @param volume {integer} 0..100
   */
  async setRelativeVolume(relativeVolume) {
    if (typeof(relativeVolume) != "number") {
      throw new Error("Need relative volume");
    }
    if (relativeVolume < -100 || relativeVolume > 100) {
      throw new Error("Volume number too high or too low");
    }

    let mpc = await this.connect();
    let status = await mpc.status.status();
    await mpc.playbackOptions.setVolume(status.volume + relativeVolume);
  }

  async unload() {
    this.stop();
  }
}
