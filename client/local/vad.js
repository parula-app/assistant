import VAD from 'node-vad';
import stream from 'stream';
import { assert } from '../../util/util.js';

/**
 * Silence detection
 *
 * Sends the voice data - excluding silence and noise - to the down stream.
 *
 * Input stream: Audio
 * Output stream: Audio, with pause/resume to signal command start/end
 *
 * Triggers `resume` when speech is recognized (independent of a hotword)
 * and `pause` when speech finished and noise or silence is detected
 * or the `maxCommandLength` is reached.
 *
 * @param options {object} with:
 * @param sampleRate {int} (Required)
 *   Audio sample rate of input
 * @param maxCommandLength {int} in seconds. Max time to listen
 *   for speech before calling endCommandCallback().
 */
export default class VADStream extends stream.Transform {
  constructor(options) {
    assert(typeof(options.sampleRate) == "number");
    assert(typeof(options.maxCommandLength) == "number");
    assert(options.sampleRate >= 8000 && options.sampleRate < 200000);
    assert(options.maxCommandLength >= 1 && options.maxCommandLength < 200);
    super(options);
    this.sampleRate = options.sampleRate;
    this.maxCommandLength = options.maxCommandLength;
    // VAD.Mode.NORMAL
    // VAD.Mode.LOW_BITRATE
    // VAD.Mode.AGGRESSIVE
    // VAD.Mode.VERY_AGGRESSIVE
    this.vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);

    // When the speech started
    this.speechStartTime = null;
    this.startBuffer = [];
  }

  async _transform(buffer, encoding, callback) {
    try {
      console.log("VAD transform"); // TODO never called
      let event = await this.vad.processAudio(buffer, this.sampleRate);

      if (event == VAD.Event.ERROR) {
        callback(new Error("VAD error"));
        return;
      } else if (event == VAD.Event.VOICE) {
        if (this.speechStartTime) {
          // speech already ongoing
          this.push(buffer);

          if (new Date() - this.speechStartTime > this.maxCommandLength * 1000) {
            this.speechStartTime = null;
            try {
              this.emit('voice-end');
            } catch (ex) {
              console.error(ex);
              callback(ex);
              return;
            }
          }
        } else { // no speech until now
          // speech start
          console.log('Speech detected');
          this.speechStartTime = new Date();
          try {
            this.emit('voice-start');
            for (let previousBuffer of this.startBuffer) {
              this.push(previousBuffer);
            }
            this.startBuffer.length = 0;
            this.push(buffer);
          } catch (ex) {
            console.error(ex);
            callback(ex);
            return;
          }
        }
      } else { // SILENCE or NOISE
        if (this.speechStartTime) {
          // speech end
          this.speechStartTime = null;
          try {
            this.emit('voice-end');
          } catch (ex) {
            console.error(ex);
            callback(ex);
            return;
          }
        } else { // no speech
          // VAD cuts the start of the command.
          // Workaround: Buffer last 3 frames.
          this.startBuffer.push(buffer);
          if (this.startBuffer.length >= 3) {
            this.startBuffer.shift();
          }
        }
      }
      callback();
    } catch (ex) {
      console.error(ex);
      callback(ex);
    }
  }
}
