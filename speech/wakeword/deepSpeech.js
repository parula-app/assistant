import { SpeechRecognizer, audioProperties } from '../recognition/deepSpeech.js';
import VAD from 'node-vad';
import { wait, assert } from '../../util/util.js';

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
  const kSampleRate = audioInputStream.audio.rate;
  assert(JSON.stringify(audioInputStream.audio) == JSON.stringify(audioProperties()), "Audio input stream is not in the expected format. Received: " + JSON.stringify(audioInputStream.audio, null, 2) + ", but expected: " + JSON.stringify(audioProperties(), null, 2));

  let detector = new SpeechRecognizerOngoing();
  detector.addWakeWord("please");

  let vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);

  // Whether this is an active command
  let commandStartTime = null;
  let lastVoiceTime = null;

  // Cache the last few audio chunks before the wake word triggers
  let startBuffer = [];
  const kBufferFrames = 0;

  function endCommand() {
    commandStartTime = null;
    lastVoiceTime = null;
    try {
      endCommandCallback();
    } catch (ex) {
      console.error(ex);
    }
  }

  detector.onWakeWord((wakeword) => {
    console.info('Wakeword', wakeword);
    try {
      if (commandStartTime) {
        endCommand();
      }

      commandStartTime = new Date();
      newCommandCallback();

      for (let previousBuffer of startBuffer) {
        audioCallback(previousBuffer);
      }
      startBuffer.length = 0;
    } catch (ex) {
      console.error(ex);
    }
  });

  audioInputStream.on('data', async (buffer) => {
    try {
      // Use silence detection to know when the command finished
      let voice = await vad.processAudio(buffer, kSampleRate);
      if (!commandStartTime && voice == VAD.Event.VOICE) {
        process.stdout.write('...       \r');
        detector.processAudio(buffer);

        // Wakeword cuts the start of the command.
        // Workaround: Buffer last 3 frames.
        startBuffer.push(buffer);
        if (startBuffer.length >= kBufferFrames) {
          startBuffer.shift();
        }
      } else if (commandStartTime) {
        if (voice == VAD.Event.VOICE) {
          process.stdout.write('##########\r');
          lastVoiceTime = Date.now();
          audioCallback(buffer);
        } else { // ERROR, NOISE or SILENCE
          process.stdout.write('***       \r');
          if (lastVoiceTime && Date.now() - lastVoiceTime > kMaxSilence * 1000) {
            console.info("Command finished due to silence");
            endCommand();
            return;
          }
        }
        // maximum command time, in case there's background noise
        if (new Date() - commandStartTime > maxCommandLength * 1000) {
          console.info("Command finished due to timeout");
          endCommand();
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  });

  audioInputStream.on('error', ex => {
    console.error(ex);
    this.destroy(ex);
  });

  audioInputStream.on('destroy', () => {
    detector.stop();
  });
  console.info('Listening to your command...');
  await wait(64^5); // 34 years TODO
}


export async function load() {
  // presumes that deepSpeech imported module is already loaded()
}

export async function unload() {
}



class SpeechRecognizerOngoing extends SpeechRecognizer {
  constructor() {
    super();
    this.wakewords = [];
    this.callback = null;
  }

  addWakeWord(wakeword) {
    assert(wakeword && typeof(wakeword) == "string");
    assert(wakeword.length > 1, "wakeword is too short");
    this.wakewords.push(wakeword);
  }

  onWakeWord(callback) {
    assert(typeof(callback) == "function");
    this.callback = callback;
  }

  processAudio(buffer) {
    super.processAudio(buffer);

    let currentText = this.modelStream.intermediateDecode();
    console.info("detected: " + currentText);
    if (!currentText) {
      return;
    }
    let words = currentText.split(" ");
    let currentWord = words.pop();
    if (this.wakewords.includes(currentWord)) {
      assert(this.callback, "No onWakeWord callback set");
      try {
        this.callback(currentWord);
      } catch (ex) {
        console.error(ex);
      }
    }
  }
}
