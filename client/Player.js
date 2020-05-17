/**
 * Plays audio or video streams.
 *
 * Needs to be implemented by the Client implementation.
 */
export class Player {
  constructor() {
  }

  /**
   * Start playing a new audio stream
   *
   * @param mp3URL {URL as string} URL of an MP3 file
   */
  async playAudio(mp3URL) {
    throw new Error("Abstract class");
  }

  /**
   * An audio or video stream is being played at this moment.
   */
  isPlaying() {
    throw new Error("Abstract class");
  }

  /**
   * Stop the current audio or video stream
   */
  async stop() {
    throw new Error("Abstract class");
  }

  /**
   * @param volume {integer} 0..100
   */
  async setVolume(volume) {
    throw new Error("Abstract class");
  }

  /**
   * @param volume {integer} -100..100  By how much to increase or decrease
   */
  async setRelativeVolume(volume) {
    throw new Error("Abstract class");
  }
}
