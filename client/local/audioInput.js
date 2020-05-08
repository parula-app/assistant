import portAudio from 'naudiodon'; // for input -- output doesn't work for me
import { sampleRate as inputSampleRate } from '../../speechToText.js';
import { getConfig } from '../../util/config.js';

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
 * Listens to microphone, and returns the audio data.
 *
 * @returns {ReadableStream} audio data as stream
 *   Flows after this function returned.
 */
export default function audioInput() {
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
