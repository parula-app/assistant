import { wait } from '../../util/util.js';

export async function load() {
}

/**
 * This is an dummy implementation of the wakeword API
 * that does not listen for a wakeword, but simply feeds
 * the first seconds of audio back.
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
 */
export async function waitForWakeWord(audioInputStream, maxCommandLength,
  newCommandCallback, audioCallback, endCommandCallback) {

  let commandStartTime = new Date();

  audioInputStream.on('data', (buffer) => {
    let seconds = Math.round((new Date() - commandStartTime) / 1000);
    if (commandStartTime) {
      process.stdout.write(seconds + ' ***\r');
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

  console.info('Listening to your command.');
  newCommandCallback();
  audioInputStream.start();
  await wait(maxCommandLength * 5);
}
