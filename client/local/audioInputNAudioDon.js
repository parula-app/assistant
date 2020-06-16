import portAudio from 'naudiodon'; // for input -- output doesn't work for me
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

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
 * @params audioProperties {AudioProperties}  the desired format type, sample rate etc.
 * @returns {ReadableStream} audio data as stream
 *   Flows after this function returned.
 *   `.audio` {AudioProperties} the format type, sample rate etc. of the stream (same as `audioProperties`)
 */
export default function audioInput(audioProperties) {
  assert(audioProperties.bits == 16, "Only 16 bit known");
  let audioInputStream = new portAudio.AudioIO({
    inOptions: {
      channelCount: audioProperties.channels,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: audioProperties.rate,
      // Use -1 to select the default device
      deviceId: gDeviceID,
      closeOnError: true,
    }
  });
  audioInputStream.audio = audioProperties;
  audioInputStream.start();
  return audioInputStream;
}
