import BumblebeeNode from 'bumblebee-hotword-node';
import VAD from 'node-vad';
import { speechToText } from '../../speech/speech.js'; // sample rate
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
  const kMaxSilence = 1.5; // seconds
  const kSampleRate = speechToText.sampleRate();

  let detector = new BumblebeeNode();
  detector.addHotword('grasshopper');
  detector.addHotword('hey_edison');
  detector.addHotword('bumblebee');
  detector.setSensitivity(0.6);

  detector.start(audioInputStream, kSampleRate);

  let vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);

  // Whether this is an active command
  let commandStartTime = null;
  let lastVoiceTime = null;

  function endCommand() {
    commandStartTime = null;
    lastVoiceTime = null;
    try {
      endCommandCallback();
    } catch (ex) {
      console.error(ex);
    }
  }

  detector.on('hotword', (wakeword) => {
    console.info('Wakeword', wakeword);
    if (commandStartTime) {
      endCommand();
    }
    commandStartTime = new Date();
    try {
      newCommandCallback();
    } catch (ex) {
      console.error(ex);
    }
  });

  detector.on('data', async (buffer) => {
    // <buffer> contains the last chunk of the audio that triggers the "sound"
    // event. It could be written to a wav stream.
    if (commandStartTime) {
      try {
        audioCallback(buffer);

        // Use silence detection to know when the command finished
        let voice = await vad.processAudio(buffer, kSampleRate);
        if (voice == VAD.Event.VOICE) {
          lastVoiceTime = Date.now();
          process.stdout.write('##########\r');
        } else { // ERROR, NOISE or SILENCE
          process.stdout.write('***       \r');
          if (lastVoiceTime && Date.now() - lastVoiceTime > kMaxSilence * 1000) {
            console.info("Command finished due to silence");
            endCommand();
            return;
          }
        }
      } catch (ex) {
        console.error(ex);
      }
      // maximum command time, in case there's background noise
      if (new Date() - commandStartTime > maxCommandLength * 1000) {
        console.info("Command finished due to timeout");
        endCommand();
      }
    } else {
      process.stdout.write('...       \r');
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
  console.info('Listening to your command...');
  await wait(64^5); // 34 years TODO
}


export async function load() {
}

export async function unload() {
}
