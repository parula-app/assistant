/**
 * Transforms an audio stream with speech into a text string.
 * Uses DeepSpeech.
 */

import Ds from 'deepspeech';
import { getConfig } from './util/config.js';

var model;

export async function load() {
  let config = getConfig().deepSpeech;
  if (config.modelDir) {
    if (!config.modelDir.endsWith("/")) {
      config.modelDir += "/";
    }
    config.model = config.model || config.modelDir + "output_graph.pbmm";
    config.lm = config.lm || config.modelDir + "lm.binary";
    config.trie = config.trie || config.modelDir + "trie";
  }
  console.info('Loading model from file %s', config.model);
  const startTime = new Date();
  model = new Ds.Model(config.model, config.beamWidth);
  if (config.lm && config.trie) {
    console.info('Loading language model from files %s and %s', config.lm, config.trie);
    //const startTime = process.hrtime();
    model.enableDecoderWithLM(config.lm, config.trie, config.lmAlpha, config.lmBeta);
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

/**
 * Converts audio into text
 */
export function speechToText(audioBuffer) {
  console.info('Running speech recognition');
  let startTime = new Date();

  // TODO blocking
  let text = model.stt(audioBuffer);

  let audioLength = (audioBuffer.length / 2) * (1 / model.sampleRate());
  console.info('Inference took %ds for %ds audio file.', (new Date() - startTime) / 1000, audioLength.toPrecision(4));
  console.log('Speech recognition result: ' + text);
  return text;
}

/**
 * Converts audio into text, using a confined vocabulary.
 *
 * @param languageModel {LanguageModel} path to lm.binary file
 */
export function speechToTextWithLanguageModel(audioBuffer, languageModel) {
  model.enableDecoderWithLM(languageModel, config.trie, config.lmAlpha, config.lmBeta);
  return speechToText(audioBuffer);
  // TODO switch back to default language model?
}

/**
 * Allows you to restrict the recognized words,
 * giving better recognition rates on a limited vocabulary.
 *
 * @param listOfSentences {Array of string}  A complete (!) list of
 *    all allowed sentences that are valid when this model is active.
 * @returns {LanguageModel}  LM
 *    Pass this to `speechToTextWithLanguageModel()` and
 *    `DataType.languageModel`.
 */
export function trainSpeechToTextOnVocabulary(listOfSentences) {
}
