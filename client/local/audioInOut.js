/**
 * Reads microphone input from the local soundcard,
 * and plays result over local speaker.
 */

import portAudio from 'naudiodon';
import { sampleRate as inputSampleRate } from '../../speechToText.js';
import { sampleRate as outputSampleRate } from '../../textToSpeech.js';
import { getConfig } from '../../util/config.js';
import sox from 'sox-stream';

var config;

export async function load() {
  config = getConfig().audio;
  listDevices();
}

function listDevices() {
  if (!config.inputDevice || config.inputDevice == -2) {
    let devices = portAudio.getDevices();
    console.log("\nAudio devices:");
    for (let device of devices) {
      console.log(device.id + " = " + device.name);
    }
    throw new Error("Select an audio device for input and output");
  }
}

/**
 * Play sound at the loudspeakers.
 *
 * @param waveStream {ReadableStream} audio
 *    WAV format, outputSampleRate(), 1 channel, 16 bit
 */
export function audioOutput(waveStream) {
  let ao = new portAudio.AudioIO({
    outOptions: {
      channelCount: 1,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: outputSampleRate(),
      deviceId: config.outputDevice,
      closeOnError: true,
    }
  });
  let waveToRaw = sox({
    input: {
        bits: 16,
        rate: outputSampleRate(),
        channels: 1,
        type: "wav",
    },
    output: {
        bits: 16,
        rate: outputSampleRate(),
        channels: 1,
        type: "raw",
    },
  });
  waveStream.pipe(waveToRaw).pipe(ao);
  return new Promise((resolve, reject) => {
    waveStream.on('finish', resolve);
  });
}

/**
 * Listens to microphone, and returns the audio data.
 *
 * @returns {ReadableStream} audio data as stream
 *   Flows after this function returned.
 */
export function audioInput() {
  let audioInputStream = new portAudio.AudioIO({
    inOptions: {
      channelCount: 1,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: inputSampleRate(),
      // Use -1 to select the default device
      deviceId: config.inputDevice,
      closeOnError: true,
    }
  });
  return audioInputStream;
}
