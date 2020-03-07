/**
 * Transforms an audio stream with speech into a text string.
 * Uses DeepSpeech.
 */

import Ds from 'deepspeech';

var model;

export async function load() {
  let args = commandlineArgs();
  console.info('Loading model from file %s', args['model']);
  const startTime = new Date();
  model = new Ds.Model(args['model'], args['beam_width']);
  if (args['lm'] && args['trie']) {
    console.info('Loading language model from files %s and %s', args['lm'], args['trie']);
    //const startTime = process.hrtime();
    model.enableDecoderWithLM(args['lm'], args['trie'], args['lm_alpha'], args['lm_beta']);
    //console.info('Loaded language model in %ds.', (new Date() - startTime) / 1000);
  }
  console.info('Loaded model in %ds.', (new Date() - startTime) / 1000);
}

export function unload() {
  Ds.FreeModel(model);
}

export function sampleRate() {
  return model.sampleRate();
}

function commandlineArgs() {
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

export function speechToText(audioBuffer) {
  console.info('Running speech recognition');
  let startTime = new Date();

  let text = model.stt(audioBuffer);

  let audioLength = (audioBuffer.length / 2) * (1 / model.sampleRate());
  console.info('Inference took %ds for %ds audio file.', (new Date() - startTime) / 1000, audioLength.toPrecision(4));
  console.log('Speech recognition result: ' + text);
  return text;
}
