import BumblebeeNode from 'bumblebee-hotword-node';
import { sampleRate as inputSampleRate } from '../../speechToText.js';
import { wait } from '../../util/util.js';

/**
 * Listens to audio, and waits for the wake word.
 * Sends the voice data after the wake word to the callback.
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

  let detector = new BumblebeeNode();
  detector.addHotword('grasshopper');
  detector.setSensitivity(0.6);

  detector.start(audioInputStream, inputSampleRate());

  // Whether this is an active command
  let commandStartTime = null;

  detector.on('hotword', (wakeword) => {
    // `buffer` contains the last chunk of the audio that triggers the "hotword"
    // event. It could be written to a wav stream. You have to use it
    // together with the `buffer` in the "data" event, if you want to get audio
    // data after the hotword.
    console.log('Wakeword', wakeword);
    commandStartTime = new Date();
    try {
      newCommandCallback();
    } catch (ex) {
      console.error(ex);
    }
  });

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
    this.destroy(ex);
  });

  detector.on('destroy', () => {
    detector.stop();
  });

  audioInputStream.start();
  console.info('Listening to your command.');
  await wait(64^5); // 34 years TODO
}


export async function load() {
}

export async function unload() {
}
