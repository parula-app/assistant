import * as pvporcupine from 'pv-porcupine';
const porcupine = pvporcupine.default.default;
import { wait } from '../../util/util.js';
console.log("porcupine version", porcupine.version());
var detector;

export async function load() {
  const keywordPath = '../computer.ppn';
  const detector = new porcupine.Porcupine('node_modules/pv-porcupine/Porcupine/lib/common/porcupine_params.pv', keywordPath);
}

export async function unload() {
  detector.destroy();
}

/**
 * Listens to microphone, and waits for the wake word.
 * Sends the voice data after the wake word to the
 * callback.
 *
 * @param audioInputStream {Stream} audio data from microphone
 * @param maxCommandLength {int} in seconds. How long to listen
 *   after the wake word before calling endCommandCallback().
 * @param newCommandCallback {Function()} Will be called
 *   when the wake word was heard and audio data is available.
 *   To be passed to voice recognition.
 *   It is not the complete command, but just the first few ms.
 * @param audioCallback {Function(Buffer)}
 *   More audio for an ongoing command, after `newCommandCallback`.
 * @param endCommandCallback {Function()} Will be called
 *   after newCommandCallback and continuedCallback() and
 *   there is silence.
 *   NOTE: If the user listens to music while giving a command,
 *   this will not be called (there is no general voice detection),
 *   but `continuedCallback()` will be called many times,
 *   until `maxCommandLength`.
 */
export async function waitForWakeWord(audioInputStream, maxCommandLength,
  newCommandCallback, audioCallback, endCommandCallback) {

  // Whether this is an active command
  let commandStartTime = null;

  detector.on('data', (buffer) => {
    // <buffer> contains the last chunk of the audio that triggers the "sound"
    // event. It could be written to a wav stream.
    process.stdout.write('***\r');
    if (commandStartTime) {
      try {
        audioCallback(buffer);
      } catch (ex) {
        console.error(ex);
      }
      if (new Date() - commandStartTime > maxCommandLength * 1000) {
        commandStartTime = null;
        try {
          endCommandCallback();
        } catch (ex) {
          console.error(ex);
        }
      }
    }
  });

  detector.on('error', ex => {
    console.error(ex);
  });

  detector.on('keyword', (buffer, wakeword) => {
    // `buffer` contains the last chunk of the audio that triggers the "hotword"
    // event. It could be written to a wav stream. You have to use it
    // together with the `buffer` in the "data" event, if you want to get audio
    // data after the hotword.
    console.log('wakeword', wakeword);
    commandStartTime = new Date();
    try {
      newCommandCallback();
      audioCallback(buffer);
    } catch (ex) {
      console.error(ex);
    }
  });

  console.info('Listening to your command.');
  audioInputStream.pipe(detector);
  await wait(64^5); // 34 years TODO
}
