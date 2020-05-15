import mpg123 from 'mpg123';
//import MP3 from 'js-mp3';  -- pure JS, but not streaming :-(
import { Player } from '../Player.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

/**
 * Plays audio or video streams
 */
export class LocalPlayer extends Player {
  constructor() {
    super();
    this._isPlaying = false;
    this._mpg = null;
  }

  /**
   * Start playing a new audio stream
   *
   * @param url {URL as string} URL of an MP3 file
   * @param app {AppBase}  App that started this playback.
   * @param nextCallback {Function}  Called once the playback finished.
   */
  playAudio(url, app, nextCallback) {
    assert(url && typeof(url) == "string" && url.includes(":"), "mp3 URL required");
    //assert(app instanceof AppBase, "app required");
    assert(typeof(nextCallback) == "function", "nextCallback must be a function");
    this.stop(); // quits any currently running instance
    console.log("Playing audio stream " + url);
    console.log("for mp3, using output device " + getConfig().audio.outputDevice);
    let device = getConfig().audio.outputDevice || undefined; // e.g. "hw0,0", and undefined (*not* null!) = default
    this._mpg = new mpg123.MpgPlayer(device, true); // no frame updates
    this._mpg.play(url);
    this._isPlaying = true;
    this._mpg.on('end', () => {
      // Called when the current file finished playing
      this._isPlaying = false;
      try {
        nextCallback();
      } catch (ex) {
        console.error(ex);
      }
    });
    this._mpg.on('pause', () => {
      this._isPlaying = false;
    });
    this._mpg.on('resume', () => {
      this._isPlaying = false;
    });
    this._mpg.on('error', ex => {
      console.error("While attempting to play <" + url + ">:");
      console.error(ex);
      this._isPlaying = false;
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
  stop() {
    if (!this._isPlaying) {
      return;
    }
    try {
      this._mpg.close();
    } catch (ex) {
      console.error(ex);
    }
  }

  /**
   * @param volume {integer} 0..100
   */
  setVolume(volume) {
    assert(typeof(volume) == "number", "volume required");
    volume = Math.round(volume);
    assert(volume >= 0 && volume <= 100);

    this._mpg.volume(volume);
  }

  async unload() {
    this.stop();
  }
}
