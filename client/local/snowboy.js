import * as snowboy from 'snowboy';
const Models = snowboy.default.Models;
const Detector = snowboy.default.Detector;
import { wait } from '../../util/util.js';

var detector;

export async function load() {
  let models = new Models();
  models.add({
    hotwords : 'computer',
    file: './node_modules/snowboy/resources/models/computer.umdl',
    // <https://github.com/Kitt-AI/snowboy#pretrained-universal-models>
    sensitivity: '0.6',
  });
  detector = new Detector({
    resource: "./node_modules/snowboy/resources/common.res",
    models: models,
    audioGain: 2.0,
    applyFrontend: true,
  });
}

/**
 * Listens to microphone, and waits for the wake word.
 * Sends the voice data after the wake word to the
 * callback.
 *
 * Uses Snowboy for wake word and voice detection.
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
  let silenceCounter = 0;

  detector.on('silence', () => {
    process.stdout.write((silenceCounter++ % 2 == 0 ? '-' : '|') + '   \r');
    if (commandStartTime) {
      commandStartTime = null;
      try {
        endCommandCallback();
      } catch (ex) {
        console.error(ex);
      }
    }
  });

  detector.on('sound', (buffer) => {
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

  detector.on('hotword', (index, hotword, buffer) => {
    // <buffer> contains the last chunk of the audio that triggers the "hotword"
    // event. It could be written to a wav stream. You will have to use it
    // together with the <buffer> in the "sound" event if you want to get audio
    // data after the hotword.
    console.log('hotword', hotword);
    commandStartTime = new Date();
    try {
      newCommandCallback();
      audioCallback(buffer);
    } catch (ex) {
      console.error(ex);
    }
  });

  console.info('Listening to your command.');
  audioInputStream.start();
  audioInputStream.pipe(detector);
  await wait(64^5); // 34 years TODO
}
