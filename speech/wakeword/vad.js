import VAD from 'node-vad';
import { wait } from '../../util/util.js';

/**
 * Takes all speech as command.
 * As soon as you start speaking, attempts to interpret that as command.
 * When you stop talking for 2 seconds, it runs whatever you said as command.
 *
 * @param audioInputStream {Stream} audio data from microphone
 * @param maxCommandLength {int} in seconds. How long to listen max
 * @param newCommandCallback {Function()} Will be called
 *   when you start speaking.
 * @param audioCallback {Function(Buffer)}
 *   More audio for an ongoing command, after `newCommandCallback`.
 * @param endCommandCallback {Function()} Will be called
 *   after newCommandCallback and continuedCallback() and
 *   there is silence.
 *   NOTE: If the user listens to music while giving a command,
 *   will not be called until `maxCommandLength`.
 */
export async function waitForWakeWord(audioInputStream, maxCommandLength,
  newCommandCallback, audioCallback, endCommandCallback) {
  const sampleRate = audioInputStream.audio.rate;

  // VAD.Mode.NORMAL
  // VAD.Mode.LOW_BITRATE
  // VAD.Mode.AGGRESSIVE
  // VAD.Mode.VERY_AGGRESSIVE
  let vad = new VAD(VAD.Mode.NORMAL);

  // Whether is an active command
  let speechStartTime = null;
  let startBuffer = [];

  audioInputStream.on('data', async (buffer) => {
    try {
      let event = await vad.processAudio(buffer, sampleRate);

      if (event == VAD.Event.ERROR) {
        console.error("VAD error");
        return;
      } else if (event == VAD.Event.VOICE) {
        if (speechStartTime) {
          // speech already ongoing
          audioCallback(buffer);

          if (new Date() - speechStartTime > maxCommandLength * 1000) {
            speechStartTime = null;
            endCommandCallback();
          }
        } else { // no speech until now
          // speech start
          console.log('Speech detected');
          speechStartTime = new Date();
          newCommandCallback();
          for (let previousBuffer of startBuffer) {
            audioCallback(previousBuffer);
          }
          startBuffer.length = 0;
          audioCallback(buffer);
        }
      } else { // SILENCE or NOISE
        if (speechStartTime) {
          // speech end
          speechStartTime = null;
          endCommandCallback();
        } else { // no speech
          // VAD cuts the start of the command.
          // Workaround: Buffer last 3 frames.
          startBuffer.push(buffer);
          if (startBuffer.length >= 3) {
            startBuffer.shift();
          }
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  });

  console.info('Listening to your command.');
  await wait(64^5); // 34 years TODO
}

export async function load() {
}

export async function unload() {
}
