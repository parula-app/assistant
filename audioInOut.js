import portAudio from 'naudiodon';
import MemoryStream from 'memory-stream';
//import Sox from 'sox-stream';
//import { Duplex } from 'stream';
import { wait } from './util.js';
import { sampleRate as inputSampleRate } from './speechToText.js';
import { sampleRate as outputSampleRate } from './textToSpeech.js';

var args;

export async function load() {
  args = commandlineArgs();
  listDevices();
}

function commandlineArgs() {
  var parser = new argparse.ArgumentParser({addHelp: true, description: 'Pia'});
  parser.addArgument(['--audio_input_device'], {help: 'ID of the microphone audio device. You see a list of devices when omitting this parameter.', type: 'int'});
  parser.addArgument(['--audio_output_device'], {help: 'ID of the speaker audio device.', defaultValue: -1, type: 'int'});
  parser.addArgument(['--capture_seconds'], {help: 'Record N seconds of audio', defaultValue: 4, type: 'int'});
  return parser.parseArgs();
}

function listDevices() {
  if (!args['audio_input_device']) {
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
      deviceId: args['audio_output_device'],
      closeOnError: true,
    }
  });
  waveStream.pipe(ao);
  return new Promise((resolve, reject) => {
    waveStream.on('finish', resolve);
  });
}

export async function audioInput() {
  console.info('Listening to your command.');
  let ai = new portAudio.AudioIO({
    inOptions: {
      channelCount: 1,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: inputSampleRate(),
      // Use -1 to select the default device
      deviceId: args['audio_input_device'],
      closeOnError: true,
    }
  });
  let audioStream = new MemoryStream();
  ai.pipe(audioStream);
  ai.start();
  await wait(args['capture_seconds']);
  ai.unpipe();
  return new Promise((resolve, reject) => {
    audioStream.on('finish', () => {
      resolve(audioStream.toBuffer());
    });
  });
}
