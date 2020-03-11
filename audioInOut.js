/**
 * Reads microphone input from the local soundcard,
 * and plays result over local speaker.
 */

//import Sox from 'sox-stream';
//import { Duplex } from 'stream';
import portAudio from 'naudiodon';
import MemoryStream from 'memory-stream';
import { sampleRate as inputSampleRate } from './speechToText.js';
import { sampleRate as outputSampleRate } from './textToSpeech.js';
import { getConfig } from './util/config.js';
import { wait } from './util/util.js';

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

function playbackAudio(waveStream) {
  let ao = new portAudio.AudioIO({
    outOptions: {
      channelCount: 1,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: outputSampleRate(),
      deviceId: config.outputDevice,
      closeOnError: true,
    }
  });
  waveStream.pipe(ao);
  return new Promise((resolve, reject) => {
    waveStream.on('finish', resolve);
  });
}

export async function audioInput() {
  let ai = new portAudio.AudioIO({
    inOptions: {
      channelCount: 1,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: inputSampleRate(),
      // Use -1 to select the default device
      deviceId: config.inputDevice,
      closeOnError: true,
    }
  });
  console.info('Listening to your command.');
  ai.start();
  let audioStream = new MemoryStream();
  ai.pipe(audioStream);
  return new Promise(async (resolve, reject) => {
    /* Not called
    audioStream.on('finish', () => {
      resolve(audioStream.toBuffer());
    }); */
    await wait(config.captureSeconds);
    ai.unpipe();
    resolve(audioStream.toBuffer());
  });
}
