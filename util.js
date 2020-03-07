import argparse from 'argparse';
import fs from 'fs';

export async function wait(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve();
      } catch (ex) {
        reject(ex);
      }
    }, seconds * 1000);
  });
}

var configData;

export function configFile() {
  if (configData) {
    return configData;
  }
  const load = filepath => JSON.parse(fs.readFileSync(filepath, 'utf8'));
  configData = load('./config.json');
  return configData;
}

export function commandlineArgs() {
  var parser = new argparse.ArgumentParser({addHelp: true, description: 'Pia'});
  parser.addArgument(['--model'], {required: true, help: 'DeepSpeech Model output_graph.pbmm'});
  parser.addArgument(['--lm'], {help: 'Language model binary file, created with deepspeech/data/lm/generate_lm', nargs: '?'});
  parser.addArgument(['--trie'], {help: 'Language model trie file, created with deepspeech/native_client/generate_trie', nargs: '?'});
  parser.addArgument(['--valid_input'], {help: 'File with all possible inputs, one per line. The recognition result text will be one line from this file.', nargs: '?'});
  parser.addArgument(['--audio_input_device'], {help: 'ID of the microphone audio device. You see a list of devices when omitting this parameter.', type: 'int'});
  parser.addArgument(['--audio_output_device'], {help: 'ID of the speaker audio device.', defaultValue: -1, type: 'int'});
  parser.addArgument(['--capture_seconds'], {help: 'Record N seconds of audio', defaultValue: 4, type: 'int'});
  parser.addArgument(['--beam_width'], {help: 'DeepSpeech: Beam width for the CTC decoder', defaultValue: 500, type: 'int'});
  parser.addArgument(['--lm_alpha'], {help: 'DeepSpeech: Language model weight (lm_alpha)', defaultValue: 0.75, type: 'float'});
  parser.addArgument(['--lm_beta'], {help: 'DeepSpeech: Word insertion bonus (lm_beta)', defaultValue: 1.85, type: 'float'});
  return parser.parseArgs();
}
