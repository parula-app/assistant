import * as snowboy from 'snowboy';
const Models = snowboy.default.Models;
const Detector = snowboy.default.Detector;
import VAD from 'node-vad';
import { getConfig } from '../../util/config.js';
import { wait } from '../../util/util.js';

var detector;

export async function load() {
  let config = getConfig().snowboy;
  let file = config.file || `./node_modules/snowboy/resources/models/${ config.hotword }.umdl`;

  let models = new Models();
  models.add({
    hotwords: config.hotword,
    file: file,
    // <https://github.com/Kitt-AI/snowboy#pretrained-universal-models>
    sensitivity: "0.6",
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
  const kMaxSilence = 1.5; // seconds
  const kSampleRate = audioInputStream.audio.rate;

  let vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);

  // Whether this is an active command
  let commandStartTime = null;
  let lastVoiceTime = null;
  let silenceCounter = 0;

  // Cache the last few audio chunks before the wake word triggers
  let startBuffer = [];
  const kBufferFrames = 5;

  function endCommand() {
    commandStartTime = null;
    lastVoiceTime = null;
    try {
      endCommandCallback();
    } catch (ex) {
      console.error(ex);
    }
  }

  detector.on('silence', () => {
    process.stdout.write((silenceCounter++ % 2 == 0 ? '-' : '|') + '         \r');
    if (commandStartTime) {
      commandStartTime = null;
      try {
        endCommand();
      } catch (ex) {
        console.error(ex);
      }
    }
  });

  detector.on('sound', async (buffer) => {
    // <buffer> contains the last chunk of the audio that triggers the "sound"
    // event. It could be written to a wav stream.
    if (commandStartTime) {
      let commandStartTimeOriginal = commandStartTime;
      try {
        audioCallback(buffer);

        // Use silence detection to know when the command finished
        let voice = await vad.processAudio(buffer, kSampleRate);
        if (commandStartTimeOriginal != commandStartTime) {
          // The command was aborted during silence detection in a parallel run.
          // Fixes reentrancy race condition.
          return;
        }
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
          // Wakeword cuts the start of the command.
          // Workaround: Buffer last 3 frames.
          startBuffer.push(buffer);
          if (startBuffer.length >= kBufferFrames) {
            startBuffer.shift();
          }
        }
        if (new Date() - commandStartTime > maxCommandLength * 1000) {
          console.info("Command finished due to timeout");
          try {
            endCommand();
          } catch (ex) {
            console.error(ex);
          }
        }
      } catch (ex) {
        console.error(ex);
      }
    } else {
      process.stdout.write('...       \r');
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
      audioCallback(buffer);
    } catch (ex) {
      console.error(ex);
    }
  });

  console.info('Listening to your command.');
  audioInputStream.pipe(detector);
  await wait(64^5); // 34 years TODO
}
