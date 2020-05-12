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
  playAudio(mp3URL) {
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
  stop() {
    throw new Error("Abstract class");
  }
}
