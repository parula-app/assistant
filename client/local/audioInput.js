import portAudio from 'naudiodon'; // for input -- output doesn't work for me
import { speechToText } from '../../speech/speech.js'; // sample rate
import { getConfig } from '../../util/config.js';

/**
 * {Int} PortAudio device ID
 *    -1 = default device
 */
var gDeviceID = -1;

export async function load() {
  getDevice();
}

function getDevice() {
  let inputDevice = getConfig().audio.inputDevice;
  for (let cur of portAudio.getDevices()) {
    //if (cur.name.includes(device)) {
    if (cur.name == inputDevice || cur.name.endsWith(" (" + inputDevice + ")")) {
      console.log("using input device " + cur.name);
      gDeviceID = cur.id;
      return;
    }
  }
}

function listDevices() {
  let inputDevice = getConfig().audio.inputDevice;
  if (!inputDevice || inputDevice == -2) {
    let devices = portAudio.getDevices();
    //console.log(devices);
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
      sampleRate: speechToText.sampleRate(),
      // Use -1 to select the default device
      deviceId: gDeviceID,
      closeOnError: true,
    }
  });
  audioInputStream.start();
  return audioInputStream;
}
